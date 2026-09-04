# Rahul & Tanvi — wedding website

A genuinely private information site for our wedding in Kolkata,
21–22 November 2026, built to run on GitHub Pages.

**Password: `RahulTanvi2026`** (case- and space-insensitive)

---

## Why the content is encrypted

GitHub Pages has no access control. On a free account Pages requires a
**public** repo, and Pages sites are publicly reachable regardless of plan.
So a password gate made of HTML/CSS/JS would be theatre — anyone could read
`index.html` in the repo and see every venue and date.

This site therefore **encrypts the content instead of hiding it**:

- `content.enc` — AES-256-GCM ciphertext of the markup and event details
- `media.enc` — AES-256-GCM ciphertext of the photographs
- The key is derived from the password with PBKDF2-HMAC-SHA256, 310,000
  iterations, over a random 16-byte salt.

There is **no password hash stored anywhere**. A wrong password produces a
wrong key, which fails GCM's authentication tag, so the browser cannot
produce the plaintext at all. Reading the page source tells an attacker
nothing, because the source does not contain the content.

Verified: no occurrence of *Tanvi*, *Kolkata*, *Akshardham*, *Joka*,
*Westside*, *Mehendi*, *Haldi*, *Sangeet* or *November* survives in any
published file, and `media.enc` contains no JPEG header bytes.

### What this does and doesn't protect against

It genuinely protects against: someone finding the URL, someone reading the
repo, search engines, and link-forwarding to people who don't have the
password.

It does **not** protect against: a guest who has the password sharing it, or
sharing what they saw. One password covers everyone, so you cannot revoke a
single guest — you change the password and rebuild. That is the normal
trade-off for a shared-password site.

The password is the whole of the security. `RahulTanvi2026` is fine against
casual snooping; 310k PBKDF2 iterations make bulk guessing slow. If you want
it genuinely strong, use three or four unrelated words.

---

## Editing the content

Everything editable lives in `src/`, which is **gitignored and never
published**:

| File | What's in it |
|---|---|
| `src/config.json` | Event names, dates, venues, dress codes, RSVP settings |
| `src/content.html` | All the prose — welcome note, travel cards, FAQ |
| `src/images/` | The two original photographs |

After any edit, rebuild and commit:

```bash
cd "C:/Users/rksc1/Dropbox/wedding-website" && python build.py && git add -A && git commit -m "Update details" && git push
```

`build.py` prompts for the password. It must be the same one each time, or
guests' saved sessions break.

> **`src/` is the only copy of the plaintext.** The `.enc` files cannot be
> edited back into source. It lives in Dropbox, so it's backed up — but don't
> delete it.

### Filling in Mehendi / Haldi / Sangeet

Those three are `"status": "tba"`, which renders a dashed card with a
"Details to come" pill instead of a venue. When a venue is booked, edit that
entry in `src/config.json`:

```json
{
  "name": "Mehendi",
  "status": "confirmed",
  "dateLabel": "Thursday, 19 November 2026",
  "time": "4:00 pm onwards",
  "venue": "The venue name",
  "address": "Street, Kolkata, West Bengal",
  "mapQuery": "The venue name Kolkata",
  "dress": "Bright, festive Indian wear",
  "blurb": "…"
}
```

The card, the Google Maps link, and that event's RSVP checkbox all update
from this one edit. Then `python build.py` and push.

---

## Connecting the RSVP form

The form is built and styled but **not yet connected** — it currently tells
guests to email you instead. Pick one backend and set it in
`src/config.json`.

### Google Forms — recommended

Free, unlimited responses, answers land in a Google Sheet, and it can email
you on each submission. Best fit for a wedding.

1. Build a Google Form with the questions you want.
2. **Send → `<>` (embed)** and copy the `src="..."` URL.
3. In `src/config.json`:
   ```json
   "rsvp": { "mode": "google", "googleFormEmbedUrl": "https://docs.google.com/forms/d/e/…/viewform?embedded=true" }
   ```

The custom form is replaced by your Google Form. The form URL stays inside
the encrypted payload.

### Formspree — keeps the custom-styled form

Prettier, since it uses the site's own form design. **But the free tier is
50 submissions per month**, which a wedding can exceed.

1. Create a form at [formspree.io](https://formspree.io) and copy the endpoint.
2. In `src/config.json`:
   ```json
   "rsvp": { "mode": "formspree", "formspreeEndpoint": "https://formspree.io/f/abcdxyz" }
   ```

Netlify Forms is not an option here — it only works on Netlify.

---

## Publishing to GitHub Pages

The repo is already initialised and committed locally. To publish:

**1. Create an empty repo on GitHub.** Name it whatever you like; the URL
becomes `https://<username>.github.io/<repo>/`. The site uses only relative
paths, so a sub-path works fine.

**2. Push.** Replace the URL with yours:

```bash
cd "C:/Users/rksc1/Dropbox/wedding-website" && git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git && git branch -M main && git push -u origin main
```

**3. Enable Pages.** In the repo: **Settings → Pages → Source: Deploy from a
branch → Branch: `main` / `(root)` → Save.** It goes live in a minute or two.

**4. Check it.** Open the URL, confirm the gate appears, and confirm the
password works.

### A note on repo visibility

On a free GitHub account, Pages needs a **public** repo. That's acceptable
here precisely because everything sensitive is ciphertext — but it does mean
the ciphertext is world-readable and archivable. If you have GitHub Pro, a
private repo also works and is marginally tidier.

### The `src/` safeguard

Committing `src/` even once would put the plaintext in public git history
permanently, where deleting it later doesn't help. Two things prevent that:

- `.gitignore` excludes `src/`
- a `pre-commit` hook in `.git/hooks/` **hard-blocks** any commit containing
  `src/`, including one forced in with `git add -f`

The hook lives in `.git/`, so it does not travel with a clone. If you ever
re-clone this repo, copy it across.

`.gitattributes` marks `*.enc` as binary. Without it Git could decide
`media.enc` is text and apply CRLF conversion, silently corrupting the
ciphertext so it no longer decrypts.

---

## Previewing locally

```bash
python -m http.server 8779 --directory "C:/Users/rksc1/Dropbox/wedding-website"
```

Then <http://localhost:8779>. You must use a server, not double-click
`index.html` — WebCrypto only works in a secure context (HTTPS or
localhost), and the gate says so plainly if you try.

---

## Changing the password

Just rebuild with the new one:

```bash
cd "C:/Users/rksc1/Dropbox/wedding-website" && python build.py && git add -A && git commit -m "Rotate password" && git push
```

New salt, new IVs, new ciphertext. Anyone with the old password is locked
out immediately, and guests with a cached session are asked to re-enter it.
Update the password on your e-invites to match.

---

## Files

```
index.html          public shell: the gate, and nothing else
content.enc         encrypted config + markup      (~25 KB)
media.enc           encrypted photographs          (~440 KB)
css/styles.css      all styling; palette at the top
js/gate.js          password -> PBKDF2 -> AES-GCM -> inject
js/app.js           countdown, event cards, FAQ, nav, RSVP
build.py            src/ -> content.enc + media.enc
robots.txt          asks crawlers to stay out
.nojekyll           serve the folder verbatim, no Jekyll
.gitattributes      *.enc is binary — do not touch line endings
.gitignore          excludes src/
src/                PLAINTEXT — never published
```

## How it behaves

- **Two-stage load.** Only 25 KB has to decrypt before the page appears, so
  the gate opens in well under a second. The 440 KB of photographs decrypts
  behind the rendered page and fades in. Measured: unlock at ~770 ms
  including all 310k PBKDF2 iterations.
- **Photographs never touch the network in the clear.** They're decrypted to
  Blob URLs in the browser.
- **The key, not the password, is cached** — in `sessionStorage`, so a
  reload is instant but closing the tab forgets it.
- **Fail-open rendering.** The fade-in animation only applies once JS has
  added a `js` class, with a 2.5s fallback, so a script problem can't leave a
  guest on a blank page. If `media.enc` fails to load, the text still reads
  fine and the image placeholders simply reveal.
- **Colours** are taken from the photographs — marigold, gerbera pink,
  sherwani indigo, cream.
- Responsive, keyboard-navigable, respects `prefers-reduced-motion`, and the
  details print cleanly.
