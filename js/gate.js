/* ==========================================================================
   gate.js — password -> key -> decrypt -> inject.

   The published repo contains only ciphertext (content.enc). There is no
   password hash to compare against: the password derives the key, and a
   wrong key fails AES-GCM's authentication tag, so decryption simply
   throws. Reading this file tells you nothing, because the content isn't
   here.

   Parameters must match build.py exactly.
   ========================================================================== */

(function () {
  'use strict';

  var PBKDF2_ITERATIONS = 310000;
  var CONTENT_URL = 'content.enc';
  var STORE_KEY = 'rt.key';          /* sessionStorage: derived key, as hex */

  var gate      = document.getElementById('gate');
  var gateCard  = document.getElementById('gate-card');
  var gateForm  = document.getElementById('gate-form');
  var gateInput = document.getElementById('gate-input');
  var gateError = document.getElementById('gate-error');
  var gateBtn   = document.getElementById('gate-submit');
  var siteEl    = document.getElementById('site');

  /* ---------------------------------------------------------------- utils */

  function b64ToBytes(b64) {
    var bin = atob(b64);
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  function bytesToHex(bytes) {
    return Array.prototype.map.call(new Uint8Array(bytes), function (b) {
      return ('0' + b.toString(16)).slice(-2);
    }).join('');
  }

  function hexToBytes(hex) {
    var out = new Uint8Array(hex.length / 2);
    for (var i = 0; i < out.length; i++) {
      out[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return out;
  }

  function say(msg) {
    gateError.textContent = msg;
    gateError.classList.add('is-shown');
  }

  function busy(on, label) {
    gateBtn.disabled = on;
    gateBtn.textContent = on ? (label || 'Unlocking…') : 'Enter';
  }

  function isNetworkError(err) {
    return err && /HTTP \d|Failed to fetch|NetworkError|Load failed/i
      .test(String(err.message || err));
  }

  /* --------------------------------------------------------------- crypto */

  /* Lower-case and drop everything that isn't a letter or digit, so for an
     example passphrase "alpha-bravo-charlie", all of "Alpha Bravo Charlie",
     "alphabravocharlie" and "ALPHA_BRAVO_CHARLIE" derive the same key.
     Phone autocapitalisation and guesses at the separator stop mattering.

     build.py normalises identically. Change one and you must change the
     other, or nothing will decrypt. */
  function normalise(pw) {
    return String(pw == null ? '' : pw).toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  function deriveKey(password, saltBytes, iterations) {
    return crypto.subtle
      .importKey('raw', new TextEncoder().encode(password),
                 { name: 'PBKDF2' }, false, ['deriveKey'])
      .then(function (baseKey) {
        return crypto.subtle.deriveKey(
          { name: 'PBKDF2', salt: saltBytes, iterations: iterations, hash: 'SHA-256' },
          baseKey,
          { name: 'AES-GCM', length: 256 },
          true,                    /* extractable, so it can be cached */
          ['decrypt']
        );
      });
  }

  function decrypt(key, ivBytes, ctBytes) {
    return crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivBytes }, key, ctBytes);
  }

  /* -------------------------------------------------------------- payload */

  var envelopePromise = null;

  function loadEnvelope() {
    if (!envelopePromise) {
      envelopePromise = fetch(CONTENT_URL).then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      });
    }
    return envelopePromise;
  }

  /* --------------------------------------------------------------- unlock */

  function render(plainBuf) {
    var doc = JSON.parse(new TextDecoder().decode(plainBuf));

    siteEl.innerHTML = doc.html;

    /* The real title comes from the encrypted config. Hardcoding it here
       would publish the names, date and city in a public file. */
    if (doc.config && doc.config.pageTitle) {
      document.title = doc.config.pageTitle;
    }

    /* app.js owns everything from here: event cards, nav, FAQ, RSVP. */
    window.SITE.init(doc.config);

    gate.classList.add('is-open');
    document.body.classList.remove('is-locked');
    gate.setAttribute('aria-hidden', 'true');
    window.setTimeout(function () { gate.style.display = 'none'; }, 750);
  }

  function attempt(rawPassword) {
    gateError.classList.remove('is-shown');
    busy(true);

    return loadEnvelope()
      .then(function (env) {
        return deriveKey(normalise(rawPassword),
                         b64ToBytes(env.salt),
                         env.iter || PBKDF2_ITERATIONS)
          .then(function (key) {
            return decrypt(key, b64ToBytes(env.iv), b64ToBytes(env.ct))
              .then(function (plain) {
                /* Cache the derived key — not the password — and only for
                   this tab, so a reload doesn't redo 310k iterations. */
                return crypto.subtle.exportKey('raw', key).then(function (raw) {
                  try {
                    sessionStorage.setItem(STORE_KEY, bytesToHex(raw));
                  } catch (e) { /* private mode */ }
                  render(plain);
                });
              });
          });
      })
      .catch(function (err) {
        busy(false);
        if (isNetworkError(err)) {
          say('Couldn’t load the page data. Please refresh and try again.');
        } else {
          /* Almost always a GCM tag failure, i.e. the wrong password. */
          say('That password isn’t right. Do check your invitation.');
          gateCard.classList.remove('is-wrong');
          void gateCard.offsetWidth;                /* restart the shake */
          gateCard.classList.add('is-wrong');
          gateInput.select();
        }
      });
  }

  /* Silent re-unlock on reload, using the key cached for this tab. */
  function tryCachedKey() {
    var hex;
    try { hex = sessionStorage.getItem(STORE_KEY); } catch (e) { hex = null; }
    if (!hex) { focusInput(); return; }

    busy(true, 'Loading…');
    loadEnvelope()
      .then(function (env) {
        return crypto.subtle
          .importKey('raw', hexToBytes(hex), { name: 'AES-GCM' }, true, ['decrypt'])
          .then(function (key) {
            return decrypt(key, b64ToBytes(env.iv), b64ToBytes(env.ct))
              .then(render);
          });
      })
      .catch(function () {
        /* Stale key — content re-encrypted, or the password changed. */
        try { sessionStorage.removeItem(STORE_KEY); } catch (e) {}
        busy(false);
        focusInput();
      });
  }

  function focusInput() {
    window.setTimeout(function () {
      if (!gateBtn.disabled) gateInput.focus();
    }, 400);
  }

  /* ------------------------------------------------------------------ init */

  function init() {
    /* WebCrypto needs a secure context. GitHub Pages is HTTPS and localhost
       counts, but opening index.html straight off the disk does not. */
    if (!window.isSecureContext || !window.crypto || !crypto.subtle) {
      say('This page needs to be served over https:// or localhost. ' +
          'Opening the file directly can’t decrypt the content.');
      gateBtn.disabled = true;
      return;
    }

    gateForm.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (!normalise(gateInput.value)) return;
      attempt(gateInput.value);
    });

    tryCachedKey();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
