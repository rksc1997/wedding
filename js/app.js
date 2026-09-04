/* ==========================================================================
   app.js — everything that happens after the content is decrypted.

   Exposes window.SITE.init(config). gate.js calls it once, immediately after
   injecting the markup into #site.
   ========================================================================== */

window.SITE = (function () {
  'use strict';

  var CFG = {};

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ====================================================== countdown ===== */

  var countdownTimer = null;

  function renderCountdown() {
    var el = document.getElementById('countdown');
    if (!el || !CFG.weddingDate) return;

    var target = new Date(CFG.weddingDate).getTime();
    if (isNaN(target)) { el.innerHTML = ''; return; }

    var diff = target - Date.now();
    if (diff <= 0) {
      el.innerHTML = '<p class="countdown-done">Today is the day.</p>';
      if (countdownTimer) window.clearInterval(countdownTimer);
      return;
    }

    var s = Math.floor(diff / 1000);
    var units = [
      { label: 'Days',    value: Math.floor(s / 86400) },
      { label: 'Hours',   value: Math.floor(s % 86400 / 3600) },
      { label: 'Minutes', value: Math.floor(s % 3600 / 60) },
      { label: 'Seconds', value: s % 60 }
    ];

    el.innerHTML = units.map(function (u) {
      return '<div class="countdown-unit"><b>' + u.value +
             '</b><span>' + u.label + '</span></div>';
    }).join('');
  }

  function startCountdown() {
    renderCountdown();
    if (!countdownTimer) countdownTimer = window.setInterval(renderCountdown, 1000);
  }

  /* ========================================================= events ===== */

  var ICON = {
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-4.6-7-10a7 7 0 0 1 14 0c0 5.4-7 10-7 10Z"/><circle cx="12" cy="11" r="2.5"/></svg>',
    shirt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3 4 5.5 5.5 10 8 9v11h8V9l2.5 1L20 5.5 16 3a4 4 0 0 1-8 0Z"/></svg>',
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
          (ev.time ? '<p class="event-time">' + esc(ev.time) + '</p>' : '') +
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
      }

      if (ev.dress) {
        rows += '<p class="event-detail">' + ICON.shirt +
                '<span>' + esc(ev.dress) + '</span></p>';
      }

      if (!isTba && ev.mapQuery) {
        rows += '<a class="event-map" target="_blank" rel="noopener noreferrer" href="' +
                'https://www.google.com/maps/search/?api=1&query=' +
                encodeURIComponent(ev.mapQuery) + '">Open in Maps ' + ICON.ext + '</a>';
      }

      var what =
        '<div class="event-what">' +
          (ev.blurb ? '<p class="event-blurb">' + esc(ev.blurb) + '</p>' : '') +
          rows +
        '</div>';

      return '<article class="' + cls + '">' + when + what + '</article>';
    }).join('');
  }

  function renderRsvpEvents() {
    var host = document.getElementById('rsvp-events');
    if (!host || !CFG.events) return;

    host.innerHTML = CFG.events.map(function (ev) {
      var sub = ev.status === 'tba'
        ? 'Date and venue to be confirmed'
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

    var deadlineEl = document.getElementById('rsvp-deadline');
    if (deadlineEl && rsvp.deadline) deadlineEl.textContent = rsvp.deadline;

    if (!form) return;

    /* Google Form mode: replace the custom form with the embed. */
    if (rsvp.mode === 'google' && rsvp.googleFormEmbedUrl) {
      var wrapper = document.getElementById('rsvp-google');
      var frame   = document.getElementById('rsvp-google-frame');
      form.hidden = true;
      wrapper.hidden = false;
      frame.src = rsvp.googleFormEmbedUrl;
      return;
    }

    function say(msg, kind) {
      status.textContent = msg;
      status.className = 'form-status' + (kind ? ' is-' + kind : '');
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

  /* ======================================================== text bits === */

  function applyText() {
    var tag = (CFG.couple && CFG.couple.hashtag) || '';
    if (tag) {
      ['footer-hashtag', 'faq-hashtag'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.textContent = tag;
      });
    }
  }

  /* =========================================================== public === */

  return {
    init: function (config) {
      CFG = config || {};
      applyText();
      renderEvents();
      renderRsvpEvents();
      initNav();
      initFaq();
      initRsvp();
      initReveal();
      startCountdown();
    }
  };
})();
