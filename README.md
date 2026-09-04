# A private, encrypted wedding site

A password-gated information site for our guests, built to run on GitHub
Pages as a static site with no build step for visitors and no dependencies.

**This README is public. Nothing identifying belongs in it** — no names,
dates, venues, guest details, or the password. Those all live either in the
encrypted payloads or in the gitignored `src/` folder. Please keep it that
way when editing.

---

## Why the content is encrypted

GitHub Pages has no access control. On a free account Pages requires a
**public** repo, and Pages sites are publicly reachable on any plan. So a
password gate made of HTML/CSS/JS would be theatre — anyone could read
`index.html` in this repo and see everything it was meant to hide.

This site therefore **encrypts the content instead of hiding it**:

| File | Contents |
|---|---|
| `content.enc` | AES-256-GCM ciphertext of the markup and event details (~25 KB) |
| `media.enc` | AES-256-GCM ciphertext of the photographs (~440 KB, raw binary) |

The key is derived from the password with PBKDF2-HMAC-SHA256, 310,000
iterations, over a random 16-byte salt.

There is **no password hash stored anywhere**. A wrong password produces a
wrong key, which fails GCM's authentication tag, so the browser cannot
produce the plaintext at all. Reading the page source tells you nothing,
because the source does not contain the content. `index.html` is a bare gate;
the page title is just two initials.

### What this does and doesn't protect against

It genuinely protects against: someone finding the URL, someone reading this
repo, search engines, and forwarded links reaching people without the
password.

It does **not** protect against: a guest who has the password sharing it, or
sharing what they saw. One password covers everyone, so a single guest can't
be revoked — you change the password and rebuild.

The password is the whole of the security. Never put it in this README, in a
commit message, in an issue, or in a code comment. 310k PBKDF2 iterations
make bulk guessing slow, but a short or guessable password is still the weak
link; three or four unrelated words is ideal.

---

## The password

It lives in **`src/PASSWORD.txt`**, which `.gitignore` excludes, so it stays
on your machine and in Dropbox and is never published.

Guests get a lot of latitude when typing it. The password is lower-cased and
all non-alphanumeric characters are stripped before the key is derived, so
for an example passphrase `alpha-bravo-charlie`, every one of these works:

```
alpha-bravo-charlie    Alpha Bravo Charlie    alphabravocharlie
ALPHA_BRAVO_CHARLIE      alpha - bravo - charlie
```

That removes the most likely reason a guest can't get in — guessing the
separator — at no meaningful cost, since the words carry the entropy.

The transformation is defined identically in `build.py` and `js/gate.js`. If
you change one you must change the other, or nothing will decrypt.

### Rotating it

```bash
cd "C:/Users/rksc1/Dropbox/wedding-website" && python build.py && git add -A && git commit -m "Rotate password" && git push
```

`build.py` prompts for the new password. That regenerates both payloads with
a fresh salt and IVs, so anyone holding the old password is locked out
immediately and cached guest sessions are asked to re-enter it. Update
`src/PASSWORD.txt` and your e-invites to match.

Rotating is also the correct response if a password is ever exposed: it makes
the old one worthless, which is more reliable than trying to scrub git
history, since unreachable commits can linger on the server.

---

## Editing the content

Everything editable lives in `src/`, which is **gitignored and never
published**:

| Path | What's in it |
|---|---|
| `src/config.json` | Event names, dates, venues, dress codes, RSVP settings |
| `src/content.html` | All the prose — welcome note, travel cards, FAQ |
| `src/images/` | The original photographs |
| `src/PASSWORD.txt` | The current password |

After any edit, rebuild and push:

```bash
cd "C:/Users/rksc1/Dropbox/wedding-website" && python build.py && git add -A && git commit -m "Update details" && git push
```

> **`src/` is the only copy of the plaintext.** The `.enc` files cannot be
> turned back into source. It's in Dropbox, so it's backed up — but don't
> delete it.

### Events still awaiting a venue

Any event with `"status": "tba"` renders as a dashed card with a "details to
come" pill instead of a venue. When one is booked, fill in that entry in
`src/config.json`:

```json
{
  "name": "Event name",
  "status": "confirmed",
  "dateLabel": "Weekday, D Month YYYY",
  "time": "0:00 pm onwards",
  "venue": "Venue name",
  "address": "Street, City, Region",
  "mapQuery": "Venue name City",
  "dress": "Dress code",
  "blurb": "A sentence or two."
}
```

The card, its Google Maps link, and its RSVP checkbox all update from that
one edit. Then rebuild and push.

Photographs are referenced in `src/content.html` by `data-img="name"` only.
`build.py` compresses the matching file from `src/images/`, packs it into
`media.enc`, and `js/gate.js` attaches it at runtime as a Blob URL — so no
image file is ever published.

---

## Connecting the RSVP form

The form is built and styled but **not yet connected** — it currently tells
guests to email instead. Pick a backend and set it in `src/config.json`.

**Google Forms — recommended.** Free, unlimited responses, answers land in a
Sheet, and it can email on each submission. Build the form, use
**Send → `<>` (embed)**, copy the `src="..."` URL, then:

```json
"rsvp": { "mode": "google", "googleFormEmbedUrl": "https://docs.google.com/forms/d/e/…/viewform?embedded=true" }
```

The custom form is replaced by yours, and its URL stays inside the encrypted
payload.

**Formspree — keeps the site's own styled form.** Prettier, but the free tier
caps at 50 submissions per month, which a wedding can exceed.

```json
"rsvp": { "mode": "formspree", "formspreeEndpoint": "https://formspree.io/f/YOUR_ID" }
```

Netlify Forms is not an option here — it only works on Netlify.

---

## Deploying

Already pushed. To enable the site: **Settings → Pages → Source: Deploy from
a branch → Branch: `main` / `(root)` → Save.** It goes live in a minute or
two at `https://<username>.github.io/<repo>/`.

The site uses only relative paths, so serving from a sub-path works fine.

### Guardrails

Committing `src/` even once would put the plaintext in public git history
permanently, where a later deletion doesn't help. Two things prevent it:

- `.gitignore` excludes `src/`
- a `pre-commit` hook in `.git/hooks/` **hard-blocks** any commit touching
  `src/`, including one forced in with `git add -f`

The hook lives in `.git/`, so it does not survive a fresh clone — copy it
across if you ever re-clone.

`.gitattributes` marks `*.enc` as binary. Without it, Git could decide
`media.enc` is text and apply CRLF conversion, silently corrupting the
ciphertext so it no longer decrypts.

`robots.txt` and a `noindex` meta tag ask crawlers to stay away; `.nojekyll`
makes Pages serve the folder verbatim.

---

## Previewing locally

```bash
python -m http.server 8781 --directory "C:/Users/rksc1/Dropbox/wedding-website"
```

Then <http://localhost:8781>. You must use a server rather than
double-clicking `index.html` — WebCrypto only works in a secure context
(HTTPS or localhost), and the gate says so plainly if you try.

---

## Files

```
index.html          public shell: the gate, and nothing else
content.enc         encrypted config + markup
media.enc           encrypted photographs
css/styles.css      all styling; palette variables at the top
js/gate.js          password -> PBKDF2 -> AES-GCM -> inject
js/app.js           countdown, event cards, FAQ, nav, RSVP
build.py            src/ -> content.enc + media.enc
robots.txt          asks crawlers to stay out
.nojekyll           serve verbatim, no Jekyll
.gitattributes      *.enc is binary — never convert line endings
.gitignore          excludes src/
src/                PLAINTEXT + password — never published
```

## How it behaves

- **Two-stage load.** Only ~25 KB has to decrypt before the page appears, so
  the gate opens in well under a second; the ~440 KB of photographs decrypts
  behind the rendered page and fades in. Measured ~730 ms to unlock,
  including all 310k PBKDF2 iterations.
- **Photographs never cross the network in the clear** — decrypted to Blob
  URLs in the browser.
- **The derived key is cached, not the password** — in `sessionStorage`, so a
  reload is instant but closing the tab forgets it.
- **Fail-open rendering.** The fade-in only applies once JS adds a `js` class,
  with a 2.5s fallback, so a script problem can't leave a guest on a blank
  page. If `media.enc` fails, the text still reads fine.
- Responsive, keyboard-navigable, respects `prefers-reduced-motion`, and the
  details print cleanly.
