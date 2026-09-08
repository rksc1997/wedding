# Rahul & Tanvi — wedding website

A plain static site for our wedding in Kolkata, 20–22 November 2026, hosted
on GitHub Pages.

No build step, no dependencies, no framework. Edit a file, commit, push.

**Live at:** `https://rksc1997.github.io/wedding/`

---

## The site is public

There is no password. Anyone with the link can read every venue, date and
detail, and the photograph is a normal published file.

`robots.txt` and a `noindex` meta tag ask search engines to stay away, but
that is a request, not a guarantee — and it does nothing about anyone who is
sent the URL. If you later want it genuinely private, say so and it can be
put back behind a real gate.

---

## Editing

**`js/config.js`** — the event details. This is the file you'll touch most.
Each event takes a name, date label, optional time, venue, address, and a
`mapQuery` that powers its "Open in Maps" link.

```js
{
  name: 'Mehendi',
  status: 'confirmed',            // 'tba' shows a dashed "details to come" card
  dateLabel: 'Friday, 20 November 2026',
  time: '',                       // leave empty and the line doesn't appear
  venue: 'The Park',
  address: 'Park Street, Kolkata',
  mapQuery: 'The Park Hotel Park Street Kolkata'
}
```

Editing an event updates its card **and** its RSVP checkbox — they're
generated from the same array.

**`index.html`** — all the prose: the hero, the Travel & Stay cards, the FAQ
answers, and the footer. Each section is marked with a comment.

**`css/styles.css`** — styling. The colour palette is in `:root` at the top.

**`images/engagement.jpeg`** — the hero photograph.

After editing:

```bash
cd "C:/Users/rksc1/Dropbox/wedding-website" && git add -A && git commit -m "Update details" && git push
```

Changes are live within a minute or so.

---

## Still to fill in

- **Event times** — every event currently shows a date but no time.
- **What to wear** — that FAQ answer says "Details to follow."
- **RSVP deadline** — `rsvp.deadline` in `js/config.js` is empty, so the
  "kindly respond by" line is hidden until you set it.
- **The RSVP form isn't connected** (see below).

## Connecting the RSVP form

Right now the form validates but tells guests to email instead of silently
failing. Pick a backend and set it in `js/config.js`.

**Google Forms — recommended.** Free, unlimited responses, answers land in a
Sheet, and it can email you on each submission. Build the form, use
**Send → `<>` (embed)**, copy the `src="..."` URL, then:

```js
rsvp: { mode: 'google', googleFormEmbedUrl: 'https://docs.google.com/forms/d/e/…/viewform?embedded=true' }
```

Your form replaces the built-in one.

**Formspree — keeps this site's styled form.** Prettier, but the free tier
caps at 50 submissions per month, which a wedding can exceed.

```js
rsvp: { mode: 'formspree', formspreeEndpoint: 'https://formspree.io/f/YOUR_ID' }
```

Netlify Forms won't work here — it only works on Netlify.

---

## Previewing locally

```bash
python -m http.server 8783 --directory "C:/Users/rksc1/Dropbox/wedding-website"
```

Then <http://localhost:8783>. If you don't see your changes, the browser is
caching — hard-reload with Ctrl-Shift-R.

---

## Deploying

Already set up. GitHub Pages serves `main` from the repo root; check
**Settings → Pages** if it ever needs re-enabling. `.nojekyll` makes Pages
serve the folder verbatim instead of running Jekyll.

The site uses only relative paths, so serving from a sub-path works.

---

## Files

```
index.html          the whole page
css/styles.css      styling; palette in :root at the top
js/config.js        event details  <- edit this
js/app.js           renders events, nav, FAQ, RSVP
images/
  engagement.jpeg   hero photograph
robots.txt          asks crawlers to stay out
.nojekyll           serve verbatim, no Jekyll
```

## Notes

- **Events are data, not markup.** The cards and the RSVP checkboxes both
  come from the array in `config.js`, so they can't drift apart.
- **Fail-open rendering.** The fade-in animation only applies once JS adds a
  `js` class to `<html>`, with a 2.5s fallback, so a script problem can't
  leave a guest looking at a blank page.
- Responsive, keyboard-navigable, respects `prefers-reduced-motion`, and the
  event and travel details print cleanly.
