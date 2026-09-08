#!/usr/bin/env python3
"""
build.py — encrypt the plaintext sources in src/ into content.enc, which is
what gets published to GitHub Pages.

    python build.py                        # prompts for the password
    WEDDING_PASSWORD=... python build.py    # non-interactive

Run this after every edit to src/, then commit and push.

How it works
------------
src/config.json (the event details) and src/content.html (the markup) are
serialised to one JSON document and encrypted with AES-256-GCM under a key
derived from the password via PBKDF2-HMAC-SHA256, 310,000 iterations, over a
fresh random salt.

There is no password hash stored anywhere. A wrong password produces a wrong
key, which fails GCM's authentication tag, so the browser cannot produce the
plaintext at all. That is what makes this a real gate rather than CSS hiding
readable content: the published repo genuinely does not contain the details.

The photograph is NOT encrypted — images/engagement.jpeg is a normal public
file. A picture of the couple gives away far less than venues and dates, and
leaving it out keeps this payload small (~20 KB) so the page unlocks fast.

IMPORTANT: src/ is gitignored. It is the only copy of the plaintext and the
password, and it lives in Dropbox. content.enc cannot be edited back into
source, so do not delete src/.
"""

import base64
import getpass
import json
import os
import re
import sys

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "src")
OUT = os.path.join(HERE, "content.enc")

# Must match js/gate.js exactly.
PBKDF2_ITERATIONS = 310_000
SALT_BYTES = 16
IV_BYTES = 12
KEY_BYTES = 32


def normalise(password: str) -> str:
    """Lower-case and drop everything that isn't a letter or digit.

    A guest sent a hyphenated passphrase will type it with spaces, without
    separators, or with capitals, and all of those should work. For an
    example passphrase "alpha-bravo-charlie", each of "Alpha Bravo Charlie",
    "alphabravocharlie" and "ALPHA_BRAVO_CHARLIE" derives the same key.

    Stripping separators costs no meaningful entropy — the words carry it —
    and removes the likeliest reason a guest can't get in.

    js/gate.js applies the identical transformation. Change one and you must
    change the other, or nothing will decrypt.
    """
    return re.sub(r"[^a-z0-9]", "", password.lower())


def strip_comments(html: str) -> str:
    """Drop HTML comments before shipping — they're editor notes."""
    return re.sub(r"<!--.*?-->", "", html, flags=re.DOTALL)


def main() -> int:
    config_path = os.path.join(SRC, "config.json")
    content_path = os.path.join(SRC, "content.html")

    for required in (config_path, content_path):
        if not os.path.exists(required):
            print(f"error: missing {required}", file=sys.stderr)
            return 1

    with open(config_path, encoding="utf-8") as fh:
        config = json.load(fh)
    with open(content_path, encoding="utf-8") as fh:
        html = strip_comments(fh.read())

    # --- password --------------------------------------------------------
    pw = os.environ.get("WEDDING_PASSWORD")
    if not pw:
        pw = getpass.getpass("Password guests will type: ")
        if pw != getpass.getpass("Again: "):
            print("error: passwords did not match", file=sys.stderr)
            return 1
    if not normalise(pw):
        print("error: password is empty once normalised", file=sys.stderr)
        return 1

    # --- encrypt ---------------------------------------------------------
    salt = os.urandom(SALT_BYTES)
    iv = os.urandom(IV_BYTES)

    key = PBKDF2HMAC(algorithm=hashes.SHA256(), length=KEY_BYTES,
                     salt=salt, iterations=PBKDF2_ITERATIONS).derive(
                         normalise(pw).encode("utf-8"))

    payload = json.dumps({"config": config, "html": html},
                         separators=(",", ":"),
                         ensure_ascii=False).encode("utf-8")

    # AESGCM.encrypt returns ciphertext||tag, exactly what WebCrypto's
    # decrypt() expects. No manual tag handling needed.
    ct = AESGCM(key).encrypt(iv, payload, None)

    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump({
            "v": 3,
            "kdf": "PBKDF2-SHA256",
            "iter": PBKDF2_ITERATIONS,
            "cipher": "AES-256-GCM",
            "salt": base64.b64encode(salt).decode("ascii"),
            "iv": base64.b64encode(iv).decode("ascii"),
            "ct": base64.b64encode(ct).decode("ascii"),
        }, fh, separators=(",", ":"))

    print(f"events      : {len(config.get('events', []))}")
    print(f"plaintext   : {len(payload) / 1024:7.1f} KB")
    print(f"content.enc : {os.path.getsize(OUT) / 1024:7.1f} KB")
    print("\nwrote content.enc — commit and push it. Never commit src/.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
