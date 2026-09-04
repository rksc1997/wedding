# Rahul & Tanvi — wedding website

A private, password-gated information site for our wedding in Kolkata,
21–22 November 2026.

Plain HTML, CSS and JavaScript. No build step, no dependencies, no framework.
Open `index.html` and it works.

---

## The password

**Current password: `RahulTanvi2026`**

It is compared as a SHA-256 hash, so the password itself never appears in the
source. Input is trimmed and lower-cased first, so `rahultanvi2026`,
`RAHULTANVI2026` and `  RahulTanvi2026 ` all work — guests won't be locked out
by autocapitalisation on a phone.

Once a guest gets in, the unlock is remembered in `localStorage`, so they only
type it once per device.

### Changing it

Open the site, press F12 for the console, and run:

```js
crypto.subtle.digest('SHA-256', new TextEncoder().encode('yournewpassword'))
  .then(b => console.log([...new Uint8Array(b)]
    .map(x => x.toString(16).padStart(2, '0')).join('')))
```

Paste the result into `passwordHash` in `js/config.js`. Use a lower-case
password so the trim-and-lower-case behaviour matches.

### What this gate is and isn't

It keeps the site out of search engines and away from casual visitors. It is
**not** real security: the page content is in the HTML, so someone determined
enough to read the page source could get past it. That is the accepted
trade-off of a free static site, and it is normal for wedding websites.

If you ever want a genuine gate, the upgrade path is to put the site behind
Netlify's site-wide password (a paid feature, ~$19/mo) or Vercel Pro's
password protection. No code changes needed — the file layout already suits it.

---

## Editing the content

**Almost everything you'll want to change is in `js/config.js`.** Names, the
password hash, the countdown date, all five events, and the RSVP settings.
You shouldn't need to touch the HTML for routine updates.

### Filling in Mehendi / Haldi / Sangeet

Those three are currently marked `status: 'tba'`, which makes the card show a
dashed border and a "Details to come" pill instead of a venue. When a venue is
booked, edit that event in `js/config.js`:

```js
{
  name: 'Mehendi',
  status: 'confirmed',                      // was 'tba'
  dateLabel: 'Thursday, 19 November 2026',
  time: '4:00 pm onwards',
  venue: 'The venue name',
  address: 'Street, Kolkata, West Bengal',
  mapQuery: 'The venue name Kolkata',       // powers the "Open in Maps" link
  dress: 'Bright, festive Indian wear',
  blurb: '…'
}
```

The card, the Google Maps link, and the RSVP checkbox for that event all update
from this one edit.

Longer prose — the welcome message, travel cards, FAQ answers — lives in
`index.html` under clearly commented sections.

---

## Receiving RSVPs

The form supports three backends. Pick one with `rsvp.mode` in `js/config.js`.

### `'netlify'` (default, free)

Deploy to Netlify and it just works — Netlify detects the form at deploy time.
Responses appear under **Site → Forms**, and you can set email notifications
there. Nothing to configure.

### `'formspree'` (free, works on any host)

Create a form at [formspree.io](https://formspree.io), then set:

```js
rsvp: { mode: 'formspree', formspreeEndpoint: 'https://formspree.io/f/abcdxyz' }
```

### `'google'` (a Google Form instead)

Set `mode: 'google'` and paste your form's embed URL into
`googleFormEmbedUrl`. The custom form is replaced by your Google Form in an
iframe, and responses land in a Google Sheet.

**Note:** the form cannot submit from a `file://` preview — there is nothing to
POST to. It detects this and says so rather than failing silently. Deploy, or
serve locally, to test it end to end.

---

## Previewing locally

```bash
python -m http.server 8778 --directory "C:/Users/rksc1/Dropbox/wedding-website"
```

Then open <http://localhost:8778>. Use a local server rather than
double-clicking `index.html` — the browser's `crypto.subtle` API is only
available in a secure context, and while there is a pure-JS SHA-256 fallback
for `file://`, the RSVP form still won't submit.

---

## Deploying

Any static host works. The whole folder is the site.

**Netlify** (easiest, and the RSVP default assumes it) — go to
[app.netlify.com/drop](https://app.netlify.com/drop) and drag the
`wedding-website` folder onto the page. You get a URL immediately. Then rename
the site to something tidy under Site settings, and point a custom domain at it
if you buy one.

**Cloudflare Pages / Vercel / GitHub Pages** all work the same way. If you use
GitHub Pages, make the repository **private** — otherwise the source, and with
it the site content, is public.

`netlify.toml` is included and sets `X-Robots-Tag: noindex` plus sensible cache
headers. `robots.txt` and a `noindex` meta tag also ask search engines to stay
away. Harmless on other hosts.

---

## Files

```
index.html          all page content and structure
css/styles.css      all styling; palette variables at the top
js/config.js        ← edit this for details, password, RSVP
js/main.js          gate, countdown, event rendering, FAQ, RSVP
images/
  engagement.jpeg   hero background
  selfie.jpeg       gate background + welcome section
netlify.toml        deploy + security headers
robots.txt          keeps search engines out
.claude/launch.json lets Claude Code preview the site from this folder
```

## Notes on how it's built

- **Colours** are taken from the photographs — marigold, gerbera pink,
  sherwani indigo, cream. They're CSS variables at the top of `styles.css`.
- **The reveal animation is fail-open.** The fade-in only applies when an
  inline script has added a `js` class to `<html>`, and there's a 2.5s
  fallback that reveals everything if the observer never fires. A JavaScript
  problem can never leave a guest looking at a blank page.
- **Accessible and responsive**: keyboard-navigable, labelled form fields,
  `aria-expanded` on the accordion and menu, and it respects
  `prefers-reduced-motion`.
- **Printable**: the events and travel details print cleanly, so anyone who
  wants a paper copy can hit Ctrl-P.
