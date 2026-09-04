#!/usr/bin/env python3
"""
build.py — turn the plaintext sources in src/ into the two encrypted files
that get published to GitHub Pages.

    python build.py                        # prompts for the password
    WEDDING_PASSWORD=... python build.py    # non-interactive

Output
------
content.enc   JSON envelope. Config + markup only, so it is small (~20 KB)
              and the page can unlock almost instantly.
media.enc     Raw binary: 12-byte IV followed by AES-GCM ciphertext of the
              photographs. Fetched and decrypted straight after the page
              renders, so guests aren't staring at a gate while half a
              megabyte of JPEG arrives.

Both are encrypted with the same key, derived from your password via
PBKDF2-HMAC-SHA256. Everything published is ciphertext — no names, dates,
venues or photographs appear anywhere in the repo.

There is no password hash stored. A wrong password produces a wrong key,
which fails AES-GCM's authentication tag, so the browser cannot produce the
plaintext at all. That is what makes this a real gate rather than CSS that
hides things.

IMPORTANT: src/ is gitignored. It is the only copy of the editable content
and it lives in Dropbox. The .enc files cannot be edited back into source,
so do not delete src/.
"""

import base64
import getpass
import io
import json
import os
import re
import struct
import sys

from PIL import Image
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "src")
OUT_CONTENT = os.path.join(HERE, "content.enc")
OUT_MEDIA = os.path.join(HERE, "media.enc")

# Must match js/gate.js exactly.
PBKDF2_ITERATIONS = 310_000
SALT_BYTES = 16
IV_BYTES = 12
KEY_BYTES = 32

# Each photo is referenced in content.html by data-img="<name>". Sizes are
# chosen for how the image is actually displayed, not for the source file.
IMAGES = {
    # Full-viewport hero backdrop, sitting under a heavy dark gradient, so
    # a little softness is invisible. Source is 960px wide; don't upscale.
    "engagement": {"file": "engagement.jpeg", "max_w": 960, "quality": 72},
    # Rendered in a two-column grid at roughly 490 CSS px, so 1000px covers
    # a 2x display.
    "selfie": {"file": "selfie.jpeg", "max_w": 1000, "quality": 74},
}


def normalise(password: str) -> str:
    """Trim and lower-case, so guests aren't defeated by phone autocapitals.

    js/gate.js applies the identical transformation before deriving the key.
    """
    return password.strip().lower()


def strip_comments(html: str) -> str:
    """Drop HTML comments before shipping.

    They're editor notes, not guest-facing content. Removing them also means
    a comment that happens to mention a data-img name can't confuse anything.
    """
    return re.sub(r"<!--.*?-->", "", html, flags=re.DOTALL)


def encode_image(spec: dict) -> tuple:
    path = os.path.join(SRC, "images", spec["file"])
    im = Image.open(path).convert("RGB")
    if im.width > spec["max_w"]:
        h = round(im.height * spec["max_w"] / im.width)
        im = im.resize((spec["max_w"], h), Image.LANCZOS)

    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=spec["quality"], optimize=True, progressive=True)
    return buf.getvalue(), im.size


def pack_media(images: dict) -> bytes:
    """Length-prefixed container: [4-byte header len][JSON header][bytes...].

    Keeping the images as raw bytes avoids base64, which would otherwise
    inflate them by a third before encryption and again on the wire.
    """
    header = {"images": []}
    blobs = []
    for name, (raw, size) in images.items():
        header["images"].append({
            "name": name, "type": "image/jpeg",
            "len": len(raw), "w": size[0], "h": size[1],
        })
        blobs.append(raw)

    head = json.dumps(header, separators=(",", ":")).encode("utf-8")
    return struct.pack(">I", len(head)) + head + b"".join(blobs)


def main() -> int:
    for required in (os.path.join(SRC, "config.json"),
                     os.path.join(SRC, "content.html")):
        if not os.path.exists(required):
            print(f"error: missing {required}", file=sys.stderr)
            return 1

    with open(os.path.join(SRC, "config.json"), encoding="utf-8") as fh:
        config = json.load(fh)
    with open(os.path.join(SRC, "content.html"), encoding="utf-8") as fh:
        html = strip_comments(fh.read())

    # --- sanity-check that every image is actually referenced ------------
    referenced = set(re.findall(r'data-img="([a-z0-9_-]+)"', html))
    for name in IMAGES:
        n = len(re.findall(r'data-img="%s"' % re.escape(name), html))
        if n == 0:
            print(f"  ! {name}: no data-img=\"{name}\" in content.html")
    unknown = referenced - set(IMAGES)
    if unknown:
        print(f"error: content.html references unknown images: {sorted(unknown)}",
              file=sys.stderr)
        return 1

    # --- password --------------------------------------------------------
    pw = os.environ.get("WEDDING_PASSWORD")
    if not pw:
        pw = getpass.getpass("Password guests will type: ")
        if pw != getpass.getpass("Again: "):
            print("error: passwords did not match", file=sys.stderr)
            return 1
    if not normalise(pw):
        print("error: password is empty", file=sys.stderr)
        return 1

    # --- key -------------------------------------------------------------
    salt = os.urandom(SALT_BYTES)
    key = PBKDF2HMAC(algorithm=hashes.SHA256(), length=KEY_BYTES,
                     salt=salt, iterations=PBKDF2_ITERATIONS).derive(
                         normalise(pw).encode("utf-8"))
    aes = AESGCM(key)

    # --- content.enc (small, blocks the unlock) --------------------------
    content_plain = json.dumps({"config": config, "html": html},
                               separators=(",", ":"),
                               ensure_ascii=False).encode("utf-8")
    content_iv = os.urandom(IV_BYTES)
    content_ct = aes.encrypt(content_iv, content_plain, None)

    with open(OUT_CONTENT, "w", encoding="utf-8") as fh:
        json.dump({
            "v": 2,
            "kdf": "PBKDF2-SHA256",
            "iter": PBKDF2_ITERATIONS,
            "cipher": "AES-256-GCM",
            "salt": base64.b64encode(salt).decode("ascii"),
            "iv": base64.b64encode(content_iv).decode("ascii"),
            "ct": base64.b64encode(content_ct).decode("ascii"),
        }, fh, separators=(",", ":"))

    # --- media.enc (large, streams in behind the page) -------------------
    print("images:")
    encoded = {}
    for name, spec in IMAGES.items():
        raw, size = encode_image(spec)
        encoded[name] = (raw, size)
        print(f"  {name:12s} {size[0]}x{size[1]:<5} {len(raw)/1024:7.1f} KB")

    media_plain = pack_media(encoded)
    media_iv = os.urandom(IV_BYTES)
    media_ct = aes.encrypt(media_iv, media_plain, None)

    with open(OUT_MEDIA, "wb") as fh:
        fh.write(media_iv + media_ct)

    print(f"\ncontent.enc : {os.path.getsize(OUT_CONTENT)/1024:8.1f} KB  "
          f"(unlocks the page)")
    print(f"media.enc   : {os.path.getsize(OUT_MEDIA)/1024:8.1f} KB  "
          f"(photographs, loaded after)")
    print(f"events      : {len(config.get('events', []))}")
    print("\nCommit content.enc and media.enc. Never commit src/.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
