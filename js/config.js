/* ==========================================================================
   config.js — the event details. This is the only file you need to edit
   for routine updates; index.html holds the prose.
   ========================================================================== */

window.WEDDING_CONFIG = {

  couple: { one: 'Rahul', two: 'Tanvi' },

  /* --- Events -----------------------------------------------------------
     Add "time" when you have it, e.g. time: '4:00 pm onwards'. Leave it as
     an empty string and the line simply doesn't appear.

     Set status: 'tba' for anything not yet fixed — that renders a dashed
     card with a "details to come" pill instead of a venue.
     -------------------------------------------------------------------- */
  events: [
    {
      name: 'Mehendi',
      status: 'confirmed',
      dateLabel: 'Friday, 20 November 2026',
      time: '',
      venue: 'The Park',
      address: 'Park Street, Kolkata',
      mapQuery: 'The Park Hotel Park Street Kolkata'
    },
    {
      name: 'Haldi',
      status: 'confirmed',
      dateLabel: 'Friday, 20 November 2026',
      time: '',
      venue: 'The Park',
      address: 'Park Street, Kolkata',
      mapQuery: 'The Park Hotel Park Street Kolkata'
    },
    {
      name: 'Gaur',
      status: 'confirmed',
      dateLabel: 'Friday, 20 November 2026',
      time: '',
      venue: 'The Park',
      address: 'Park Street, Kolkata',
      mapQuery: 'The Park Hotel Park Street Kolkata'
    },
    {
      name: 'The Wedding',
      status: 'confirmed',
      dateLabel: 'Saturday, 21 November 2026',
      time: '',
      venue: 'Swaminarayan Akshardham Temple',
      address: 'Joka, Kolkata',
      mapQuery: 'Swaminarayan Akshardham Temple Joka Kolkata',
      featured: true
    },
    {
      name: 'Reception',
      status: 'confirmed',
      dateLabel: 'Sunday, 22 November 2026',
      time: '',
      venue: 'Westside Pavilion',
      address: 'Nicco Park, Kolkata',
      mapQuery: 'Westside Pavilion Nicco Park Kolkata',
      featured: true
    }
  ],

  /* --- RSVP -------------------------------------------------------------
     Not connected yet. Until an endpoint is set the form tells guests to
     email instead, rather than silently failing.

     'google'    — paste a Google Form embed URL into googleFormEmbedUrl.
                   Free, unlimited responses, answers land in a Sheet.
     'formspree' — paste your endpoint below. Keeps this styled form, but
                   the free tier caps at 50 submissions a month.
     -------------------------------------------------------------------- */
  rsvp: {
    mode: 'formspree',
    formspreeEndpoint: 'https://formspree.io/f/YOUR_FORM_ID',
    googleFormEmbedUrl: '',
    deadline: ''
  },

  contactEmail: 'rahulschauhan@uchicago.edu'
};
