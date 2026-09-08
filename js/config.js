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
     Set to Google Forms. ONE THING LEFT: paste the form's embed URL into
     googleFormEmbedUrl below and push. Until then the form politely tells
     guests to email instead, rather than silently failing.

     To create the form, run tools/create-rsvp-form.gs once at
     script.google.com — it builds all nine questions to match this site and
     prints the embed URL. Or make the form by hand and use
     Send -> <> (embed) to get the URL.

     It should look like:
       https://docs.google.com/forms/d/e/1FAIpQL.../viewform?embedded=true

     (?embedded=true is added automatically if you leave it off.)

     Switch mode to 'formspree' instead if you'd rather keep this site's own
     styled form — but its free tier caps at 50 responses a month.
     -------------------------------------------------------------------- */
  rsvp: {
    mode: 'google',
    googleFormEmbedUrl: '',
    formspreeEndpoint: 'https://formspree.io/f/YOUR_FORM_ID',
    deadline: ''
  },

  contactEmail: 'tanvijindal98@gmail.com'
};
