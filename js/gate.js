/* ==========================================================================
   gate.js — password -> key -> decrypt -> inject.

   The published repo contains only ciphertext. There is no password hash to
   compare against: the password derives the key, and a wrong key fails
   AES-GCM's authentication tag, so decryption simply throws. Nothing here
   can be bypassed by reading the source, because the source doesn't contain
   the content.

   Two payloads, one key:
     content.enc  ~20 KB JSON  — config + markup. Unlocks the page.
     media.enc    ~430 KB raw  — photographs. Fetched after the page renders,
                                 so nobody waits at the gate for JPEGs.

   Parameters must match build.py exactly.
   ========================================================================== */

(function () {
  'use strict';

  var PBKDF2_ITERATIONS = 310000;
  var CONTENT_URL = 'content.enc';
  var MEDIA_URL = 'media.enc';
  var IV_BYTES = 12;
  var STORE_KEY = 'rt2026.key';        /* sessionStorage: derived key, hex */

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

  /* Lower-case and drop everything that isn't a letter or digit, so
     "marigold-tram-lantern", "Marigold Tram Lantern" and
     "marigoldtramlantern" all derive the same key. Phone autocapitalisation
     and guesses at the separator stop mattering.

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

  /* -------------------------------------------------------- the payloads */

  var contentPromise = null;

  function loadContentEnvelope() {
    if (!contentPromise) {
      contentPromise = fetch(CONTENT_URL).then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      });
    }
    return contentPromise;
  }

  /* ---------------------------------------------------------------- media
     media.enc is [12-byte IV][ciphertext]. The plaintext inside is
     [4-byte header length][JSON header][image bytes...] — raw bytes rather
     than data URIs, so nothing is base64-inflated. */

  function attachMedia(key) {
    return fetch(MEDIA_URL)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.arrayBuffer();
      })
      .then(function (buf) {
        var all = new Uint8Array(buf);
        return decrypt(key, all.subarray(0, IV_BYTES), all.subarray(IV_BYTES));
      })
      .then(function (plain) {
        var bytes = new Uint8Array(plain);
        var headLen = new DataView(plain).getUint32(0);
        var header = JSON.parse(
          new TextDecoder().decode(bytes.subarray(4, 4 + headLen)));

        var offset = 4 + headLen;
        header.images.forEach(function (img) {
          var slice = bytes.subarray(offset, offset + img.len);
          offset += img.len;

          var url = URL.createObjectURL(
            new Blob([slice], { type: img.type || 'image/jpeg' }));

          Array.prototype.forEach.call(
            document.querySelectorAll('[data-img="' + img.name + '"]'),
            function (el) {
              if (el.tagName === 'IMG') {
                el.addEventListener('load', function () {
                  el.classList.add('is-loaded');
                }, { once: true });
                el.src = url;
              } else {
                el.style.backgroundImage = 'url("' + url + '")';
                el.classList.add('is-loaded');
              }
            }
          );
        });
      })
      .catch(function () {
        /* The page is fully readable without photographs, so a media
           failure is not worth interrupting anyone over. Just reveal the
           placeholders so nothing sits invisible. */
        Array.prototype.forEach.call(
          document.querySelectorAll('[data-img]'),
          function (el) { el.classList.add('is-loaded'); }
        );
      });
  }

  /* ---------------------------------------------------------------- unlock */

  function render(plainBuf, key) {
    var doc = JSON.parse(new TextDecoder().decode(plainBuf));

    siteEl.innerHTML = doc.html;
    document.title = 'Rahul & Tanvi — 21 November 2026, Kolkata';

    /* app.js owns everything from here: countdown, event cards, FAQ,
       reveal-on-scroll, nav and the RSVP form. */
    window.SITE.init(doc.config);

    gate.classList.add('is-open');
    document.body.classList.remove('is-locked');
    gate.setAttribute('aria-hidden', 'true');
    window.setTimeout(function () { gate.style.display = 'none'; }, 750);

    attachMedia(key);
  }

  function attempt(rawPassword) {
    gateError.classList.remove('is-shown');
    busy(true);

    return loadContentEnvelope()
      .then(function (env) {
        return deriveKey(normalise(rawPassword),
                         b64ToBytes(env.salt),
                         env.iter || PBKDF2_ITERATIONS)
          .then(function (key) {
            return decrypt(key, b64ToBytes(env.iv), b64ToBytes(env.ct))
              .then(function (plain) {
                /* Cache the derived key — not the password — and only for
                   this tab, so a reload doesn't re-run 310k iterations. */
                return crypto.subtle.exportKey('raw', key).then(function (raw) {
                  try {
                    sessionStorage.setItem(STORE_KEY, bytesToHex(raw));
                  } catch (e) { /* private mode */ }
                  render(plain, key);
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
    try { hex = sessionStorage.getItem(STORE_KEY); } catch (e) { return; }
    if (!hex) { focusInput(); return; }

    busy(true, 'Loading…');
    loadContentEnvelope()
      .then(function (env) {
        return crypto.subtle
          .importKey('raw', hexToBytes(hex), { name: 'AES-GCM' }, true, ['decrypt'])
          .then(function (key) {
            return decrypt(key, b64ToBytes(env.iv), b64ToBytes(env.ct))
              .then(function (plain) { render(plain, key); });
          });
      })
      .catch(function () {
        /* Stale key — content was re-encrypted, or the password changed. */
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
