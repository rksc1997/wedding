# A password-protected wedding website

A static site on GitHub Pages, gated by a password. The details are shipped
as ciphertext and decrypted in the browser.

**This README is public. Nothing identifying belongs in it** — no names,
dates, venues, contact details, or the password. Those live either in the
encrypted payload or in the gitignored `src/` folder. Please keep it that way
when editing.

---

## Why the content is encrypted rather than hidden

GitHub Pages has no access control. On a free account Pages requires a
**public** repo, and Pages sites are publicly reachable on any plan. A
password gate made of HTML and JavaScript would therefore be pure theatre —
anyone could read `index.html` in this repo and see everything it was meant
to hide.

So the content is **encrypted**, not merely concealed:

| File | Contents |
|---|---|
| `content.enc` | AES-256-GCM ciphertext of the markup and event details (~17 KB) |
| `index.html` | A bare gate. No names, dates, venues or contacts. |

The key is derived from the password with PBKDF2-HMAC-SHA256, 310,000
iterations, over a random 16-byte salt.

There is **no password hash stored anywhere**. A wrong password produces a
wrong key, which fails GCM's authentication tag, so the browser cannot
produce the plaintext at all. Reading the page source tells you nothing,
because the source does not contain the content.

**The photograph is deliberately not encrypted.** `images/engagement.jpeg` is
a normal public file. A picture of the couple gives away far less than venues
and dates, and leaving it out keeps the payload at ~17 KB so the page unlocks
in about a second. If you would rather it were private too, say so — it can
be moved inside the payload.

### What this does and doesn't protect against

It genuinely protects against: someone finding the URL, someone reading this
repo, search engines, and forwarded links reaching people without the
password.

It does **not** protect against: a guest who has the password sharing it, or
sharing what they saw. One password covers everyone, so a single guest can't
be revoked — you change the password and rebuild.

---

## The password

It lives in **`src/PASSWORD.txt`**, which `.gitignore` excludes, so it stays
on your machine and in Dropbox and is never published.

> **Never put the real password in this README, a commit message, an issue,
> or a code comment.** All of those are public. This has already gone wrong
> once in this project's history, which is why every doc and comment uses a
> deliberately fake placeholder, `alpha-bravo-charlie`, instead of the real
> one.

Guests get a lot of latitude when typing it. The password is lower-cased and
every character that isn't a letter or digit is stripped before the key is
derived, so for a passphrase like `alpha-bravo-charlie` all of these work:

```
alpha-bravo-charlie    Alpha Bravo Charlie    alphabravocharlie
ALPHA_BRAVO_CHARLIE      alpha - bravo - charlie
```

That removes the likeliest reason a guest can't get in — guessing the
separator — at no meaningful cost, since the words carry the entropy.

The transformation is defined identically in `build.py` and `js/gate.js`. If
you change one you must change the other, or nothing will decrypt.

### Rotating it

```bash
cd "C:/Users/rksc1/Dropbox/wedding-website" && python build.py && git add -A && git commit -m "Rotate password" && git push
```

`build.py` prompts for the new password. That regenerates the payload with a
fresh salt and IV, so anyone holding the old password is locked out at once
and guests with a cached session are asked to re-enter. Update
`src/PASSWORD.txt` and your invitations to match.

Rotating is also the right response if a password is ever exposed: it makes
the old one worthless, which is far more reliable than trying to scrub git
history, since unreachable commits can linger on the server.

---

## Editing the content

Everything editable lives in `src/`, which is **gitignored and never
published**:

| Path | What's in it |
|---|---|
| `src/config.json` | Event names, dates, venues, RSVP settings, page title |
| `src/content.html` | All the markup and prose — hero, travel cards, FAQ, RSVP |
| `src/PASSWORD.txt` | The current password |

After any edit, **rebuild** and push:

```bash
cd "C:/Users/rksc1/Dropbox/wedding-website" && python build.py && git add -A && git commit -m "Update details" && git push
```

Forgetting `python build.py` is the one easy mistake: your edit lands in
`src/`, which isn't published, so the live site won't change.

> **`src/` is the only copy of the plaintext and the password.** `content.enc`
> cannot be turned back into source. It's in Dropbox, so it's backed up — but
> don't delete it.

### Events

Each entry in `src/config.json` drives both its card and its RSVP checkbox,
so the two can't drift apart:

```json
{
  "name": "Event name",
  "status": "confirmed",
  "dateLabel": "Weekday, D Month YYYY",
  "time": "",
  "venue": "Venue name",
  "address": "Area, City",
  "mapQuery": "Venue name City"
}
```

`"status": "tba"` renders a dashed card with a "details to come" pill instead
of a venue. An empty `"time"` simply omits the line.

---

## Still to fill in

- **Event times** — every event shows a date but no time.
- **What to wear** — that FAQ answer says "Details to follow."
- **RSVP deadline** — `rsvp.deadline` is empty, so the "kindly respond by"
  line stays hidden.
- **The RSVP form needs its Google Form URL** (below).

## Connecting the RSVP form

Set to Google Forms (`rsvp.mode: "google"` in `src/config.json`); the embed
URL is still blank.

1. Go to <https://script.google.com>, **New project**, paste in
   `tools/create-rsvp-form.gs`, and **Run** `createRsvpForm`.
2. Copy the **EMBED URL** from the execution log.
3. Put it in `googleFormEmbedUrl` in `src/config.json`, rebuild, push.

`?embedded=true` is appended automatically if you leave it off. Until the URL
is set, the form validates and then tells guests to email instead, rather
than silently swallowing an RSVP.

The script avoids `setCollectEmail()` on purpose: that forces respondents to
sign in to a Google account, which would shut out guests who haven't got one.
Email is an ordinary question instead.

For alerts on each response: open the responses spreadsheet, then
**Tools -> Notification settings**.

---

## Previewing locally

```bash
python -m http.server 8801 --directory "C:/Users/rksc1/Dropbox/wedding-website"
```

Then <http://localhost:8801>. You must use a server rather than
double-clicking `index.html` — WebCrypto only works in a secure context
(HTTPS or localhost), and the gate says so plainly if you try. If changes
don't show, hard-reload with Ctrl-Shift-R.

---

## Deploying

GitHub Pages serves `main` from the repo root; see **Settings -> Pages** if
it ever needs re-enabling. `.nojekyll` makes Pages serve the folder verbatim.
The site uses only relative paths, so a sub-path URL works.

### Guardrails

Committing `src/` even once would put the plaintext and the password in
public git history permanently, where deleting them later doesn't help. Two
things prevent it:

- `.gitignore` excludes `src/`
- a `pre-commit` hook in `.git/hooks/` **hard-blocks** any commit touching
  `src/`, including one forced in with `git add -f`

The hook lives in `.git/`, so it does not survive a fresh clone — copy it
across if you ever re-clone.

`.gitattributes` marks `*.enc` as binary, so Git can't decide `content.enc`
is text and apply CRLF conversion, which would corrupt the ciphertext.

---

## Files

```
index.html          public shell: the gate, and nothing else
content.enc         encrypted config + markup
css/styles.css      styling; palette in :root at the top
js/gate.js          password -> PBKDF2 -> AES-GCM -> inject
js/app.js           renders events, nav, FAQ, RSVP after decryption
build.py            src/ -> content.enc
images/
  engagement.jpeg   hero photograph (public by design)
robots.txt          asks crawlers to stay out
.nojekyll           serve verbatim, no Jekyll
.gitattributes      *.enc is binary — never convert line endings
.gitignore          excludes src/
tools/
  create-rsvp-form.gs   one-off Apps Script that builds the RSVP form
src/                PLAINTEXT + password — never published
```

## Notes

- **Fast unlock.** Only ~17 KB has to decrypt, so the gate opens in roughly a
  second, including all 310,000 PBKDF2 iterations.
- **The derived key is cached, not the password** — in `sessionStorage`, so a
  reload is instant while closing the tab forgets it. A stale key (after a
  rebuild) is detected and cleared, and the guest is simply asked again.
- **Events are data, not markup**, so cards and RSVP checkboxes stay in sync.
- **Fail-open rendering.** The fade-in only applies once JS adds a `js` class,
  with a 2.5s fallback, so a script problem can't leave a guest on a blank
  page.
- Responsive, keyboard-navigable, respects `prefers-reduced-motion`, and the
  details print cleanly.
