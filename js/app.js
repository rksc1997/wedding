/* ==========================================================================
   app.js — renders the event cards and RSVP checkboxes from js/config.js,
   and wires up the nav, FAQ and RSVP form.
   ========================================================================== */

(function () {
  'use strict';

  var CFG = window.WEDDING_CONFIG || {};

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ========================================================= events ===== */

  var ICON = {
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-4.6-7-10a7 7 0 0 1 14 0c0 5.4-7 10-7 10Z"/><circle cx="12" cy="11" r="2.5"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>',
    ext: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M9 7h8v8"/></svg>'
  };

  function renderEvents() {
    var host = document.getElementById('timeline');
    if (!host || !CFG.events) return;

    host.innerHTML = CFG.events.map(function (ev) {
      var isTba = ev.status === 'tba';

      var cls = 'event reveal' +
                (isTba ? ' event--tba' : '') +
                (ev.featured ? ' event--featured' : '');

      var when =
        '<div class="event-when">' +
          '<h3 class="event-name">' + esc(ev.name) + '</h3>' +
          '<p class="event-date">' + esc(ev.dateLabel) + '</p>' +
        '</div>';

      var rows = '';

      if (isTba) {
        rows += '<p class="event-detail"><span class="pill pill--tba">Details to come</span></p>';
      } else {
        if (ev.venue) {
          rows += '<p class="event-detail">' + ICON.pin +
                  '<span><b>' + esc(ev.venue) + '</b>' +
                  (ev.address ? '<br>' + esc(ev.address) : '') +
                  '</span></p>';
        }
        if (ev.time) {
          rows += '<p class="event-detail">' + ICON.clock +
                  '<span>' + esc(ev.time) + '</span></p>';
        }
        if (ev.mapQuery) {
          rows += '<a class="event-map" target="_blank" rel="noopener noreferrer" href="' +
                  'https://www.google.com/maps/search/?api=1&query=' +
                  encodeURIComponent(ev.mapQuery) + '">Open in Maps ' + ICON.ext + '</a>';
        }
      }

      return '<article class="' + cls + '">' + when +
             '<div class="event-what">' + rows + '</div></article>';
    }).join('');
  }

  function renderRsvpEvents() {
    var host = document.getElementById('rsvp-events');
    if (!host || !CFG.events) return;

    host.innerHTML = CFG.events.map(function (ev) {
      var sub = ev.status === 'tba'
        ? 'Details to come'
        : ev.dateLabel + (ev.venue ? ' · ' + ev.venue : '');
      return '<label class="check">' +
               '<input type="checkbox" name="events" value="' + esc(ev.name) + '">' +
               '<span>' + esc(ev.name) + '<small>' + esc(sub) + '</small></span>' +
             '</label>';
    }).join('');
  }

  /* ============================================================ nav ===== */

  function initNav() {
    var nav = document.getElementById('nav');
    var toggle = document.getElementById('nav-toggle');
    if (!nav) return;

    function onScroll() { nav.classList.toggle('is-stuck', window.scrollY > 80); }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    if (toggle) {
      toggle.addEventListener('click', function () {
        var open = nav.classList.toggle('is-menu-open');
        toggle.setAttribute('aria-expanded', String(open));
      });
    }

    Array.prototype.forEach.call(
      document.querySelectorAll('#nav-links a'),
      function (a) {
        a.addEventListener('click', function () {
          nav.classList.remove('is-menu-open');
          if (toggle) toggle.setAttribute('aria-expanded', 'false');
        });
      }
    );
  }

  /* ============================================================ faq ===== */

  function initFaq() {
    Array.prototype.forEach.call(
      document.querySelectorAll('.faq-q'),
      function (btn) {
        btn.addEventListener('click', function () {
          var item = btn.parentElement;
          var panel = item.querySelector('.faq-a');
          var open = item.classList.toggle('is-open');
          btn.setAttribute('aria-expanded', String(open));
          panel.style.maxHeight = open ? panel.scrollHeight + 'px' : '0px';
        });
      }
    );
  }

  /* ========================================================= reveal ===== */

  function initReveal() {
    var items = document.querySelectorAll('.reveal');

    function showAll() {
      Array.prototype.forEach.call(items, function (el) {
        el.classList.add('is-visible');
      });
    }

    if (!('IntersectionObserver' in window)) { showAll(); return; }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0, rootMargin: '0px 0px -10% 0px' });

    Array.prototype.forEach.call(items, function (el) { io.observe(el); });

    /* If the observer never fires, don't leave the page at opacity 0. */
    window.setTimeout(function () {
      if (!document.querySelector('.reveal.is-visible')) showAll();
    }, 2500);
  }

  /* =========================================================== rsvp ===== */

  function initRsvp() {
    var form   = document.getElementById('rsvp-form');
    var status = document.getElementById('rsvp-status');
    var submit = document.getElementById('rsvp-submit');
    var thanks = document.getElementById('rsvp-thanks');
    var rsvp   = CFG.rsvp || {};
    var email  = CFG.contactEmail || '';

    /* Only show the deadline sentence once there is a deadline. */
    if (rsvp.deadline) {
      var line = document.getElementById('rsvp-deadline-line');
      document.getElementById('rsvp-deadline').textContent = rsvp.deadline;
      if (line) line.hidden = false;
    }

    if (!form) return;

    function say(msg, kind) {
      status.textContent = msg;
      status.className = 'form-status' + (kind ? ' is-' + kind : '');
    }

    /* --- Google Form mode -------------------------------------------------
       Replace this site's form with the embedded Google Form. Guests fill in
       Google's form; responses go straight to the linked spreadsheet.
       tools/create-rsvp-form.gs builds a matching form and prints the URL. */
    if (rsvp.mode === 'google') {
      if (rsvp.googleFormEmbedUrl) {
        var wrapper = document.getElementById('rsvp-google');
        var frame   = document.getElementById('rsvp-google-frame');
        form.hidden = true;
        wrapper.hidden = false;
        /* Google needs ?embedded=true to drop its own page chrome. Add it if
           the pasted URL is missing it, rather than rendering a fat iframe. */
        var url = rsvp.googleFormEmbedUrl;
        if (url.indexOf('embedded=true') === -1) {
          url += (url.indexOf('?') === -1 ? '?' : '&') + 'embedded=true';
        }
        frame.src = url;
        return;
      }
      /* mode is 'google' but no URL yet — say so honestly instead of
         silently falling through to a different backend. */
      form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        say('The RSVP form isn’t connected yet. Please email ' + email +
            ' and we’ll add you.', 'error');
      });
      return;
    }

    var endpoint = rsvp.formspreeEndpoint || '';
    var configured = endpoint && endpoint.indexOf('YOUR_FORM_ID') === -1;

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }

      if (!configured) {
        say('The RSVP form isn’t connected yet. Please email ' + email +
            ' and we’ll add you.', 'error');
        return;
      }

      submit.disabled = true;
      say('Sending…');

      var data = new FormData(form);
      var payload = {};
      data.forEach(function (value, key) {
        if (key === 'bot-field') return;
        /* The event checkboxes share one name; collect them into a list. */
        if (payload[key] !== undefined) {
          payload[key] = [].concat(payload[key], value);
        } else {
          payload[key] = value;
        }
      });

      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          form.hidden = true;
          thanks.classList.add('is-shown');
          thanks.scrollIntoView({ behavior: 'smooth', block: 'center' });
        })
        .catch(function () {
          submit.disabled = false;
          say('Something went wrong sending that. Please email ' + email +
              ' and we’ll add you by hand.', 'error');
        });
    });
  }

  /* =========================================================== init ===== */

  function init() {
    renderEvents();
    renderRsvpEvents();
    initNav();
    initFaq();
    initRsvp();
    initReveal();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
