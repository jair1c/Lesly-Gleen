(function () {
  'use strict';

  var BASE = '/ivory-photo-booth-wedding-website/';
  var WEDDING_AT = new Date('2026-11-28T15:00:00-05:00').getTime();
  var DEFAULT_EXPIRY = '2026-10-23';

  function normalize(value) {
    return String(value || '').trim().replace(/\s+/g, ' ');
  }

  function decodeInvitation() {
    var token = new URLSearchParams(location.search).get('i');
    if (!token) return null;
    try {
      var base64 = token.replace(/-/g, '+').replace(/_/g, '/');
      base64 += '='.repeat((4 - base64.length % 4) % 4);
      var bytes = Uint8Array.from(atob(base64), function (char) { return char.charCodeAt(0); });
      return JSON.parse(new TextDecoder().decode(bytes));
    } catch (error) {
      console.warn('El enlace de invitación no es válido.');
      return null;
    }
  }

  function isExpired(invitation) {
    var expiry = invitation && invitation.exp ? invitation.exp : DEFAULT_EXPIRY;
    return Date.now() >= new Date(expiry + 'T00:00:00-05:00').getTime();
  }

  function buildCalendar() {
    var weekdays = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
    var cells = [];
    for (var day = 1; day <= 30; day += 1) {
      cells.push('<span class="' + (day === 28 ? 'wedding-day' : '') + '" data-day="' + day + '" aria-label="' + day + '"></span>');
    }
    var element = document.createElement('div');
    element.className = 'demo3-calendar-transplant';
    element.setAttribute('role', 'img');
    element.setAttribute('aria-label', 'Calendario de noviembre de 2026; boda el sábado 28 a las 3 de la tarde');
    element.innerHTML =
      '<div class="demo3-calendar-card">' +
        '<img class="demo3-calendar-paper" src="' + BASE + '_assets/media/a9df9c0ccfaca50aa0e135ca91290a33.png" alt="">' +
        '<div class="demo3-calendar-title">Noviembre 2026</div>' +
        '<div class="demo3-calendar-dates">' +
          '<div class="demo3-calendar-week">' + weekdays.map(function (d) { return '<span>' + d + '</span>'; }).join('') + '</div>' +
          '<div class="demo3-calendar-grid">' + cells.join('') + '</div>' +
        '</div>' +
        '<div class="demo3-calendar-foot">3:00 PM<br>LOS CANTARITOS · SULLANA</div>' +
      '</div>';
    return element;
  }

  function refreshCalendarDates(root) {
    var days = root && root.querySelectorAll('.demo3-calendar-grid > span');
    if (!days || days.length !== 30) return;
    Array.prototype.forEach.call(days, function (cell, index) {
      var day = index + 1;
      if (cell.textContent) cell.textContent = '';
      if (cell.dataset.day !== String(day)) cell.dataset.day = String(day);
      if (cell.getAttribute('aria-label') !== String(day)) cell.setAttribute('aria-label', String(day));
      if (cell.classList.contains('wedding-day') !== (day === 28)) {
        cell.classList.toggle('wedding-day', day === 28);
      }
    });
  }

  function installCalendar() {
    if (!/\/save-the-date\/?$/.test(location.pathname)) return;
    ['LB7CNQHXl1FJF0PT', 'LBqp7QvHpHDNSdcb'].forEach(function (id) {
      var originalText = document.getElementById(id);
      if (originalText) {
        originalText.style.opacity = '0';
        originalText.setAttribute('aria-hidden', 'true');
      }
    });
    var host = document.getElementById('LB0s12mPKlql8H1Y');
    if (!host) {
      var mirror = document.querySelector('img[src*="0005071ebe19c0c478c33ee6bea365a0.png"]');
      host = mirror && mirror.closest('.DF_utQ');
    }
    if (!host) return;
    if (!host.classList.contains('demo3-calendar-host')) {
      host.classList.add('demo3-calendar-host');
      host.appendChild(buildCalendar());
    }
    refreshCalendarDates(host);
  }

  function wireVinylControls(audio) {
    var disc = document.getElementById('LBfmmjqdw01g8QSC');
    var toggle = document.querySelector('.demo3-vinyl-toggle');
    if (disc && !toggle) {
      toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'demo3-vinyl-toggle';
      toggle.dataset.demo3MusicBound = 'true';
      document.body.appendChild(toggle);
    } else if (toggle && toggle.parentElement !== document.body) {
      document.body.appendChild(toggle);
    }

    function positionToggle() {
      var currentDisc = document.getElementById('LBfmmjqdw01g8QSC');
      var currentToggle = document.querySelector('.demo3-vinyl-toggle');
      if (!currentDisc || !currentToggle) return;
      var rect = currentDisc.getBoundingClientRect();
      currentToggle.style.left = (window.scrollX + rect.left + (rect.width - currentToggle.offsetWidth) / 2) + 'px';
      currentToggle.style.top = (window.scrollY + rect.top + (rect.height - currentToggle.offsetHeight) / 2) + 'px';
    }

    positionToggle();
    if (!window.demo3VinylPositionBound) {
      window.demo3VinylPositionBound = true;
      window.addEventListener('resize', function () { window.requestAnimationFrame(positionToggle); });
      window.addEventListener('orientationchange', function () { window.requestAnimationFrame(positionToggle); });
    }

    if (!window.demo3MusicToggleBound) {
      window.demo3MusicToggleBound = true;
      document.addEventListener('click', function (event) {
        var button = event.target && event.target.closest && event.target.closest('.demo3-vinyl-toggle');
        if (!button) return;
        event.preventDefault();
        event.stopPropagation();
        if (audio.paused) audio.play().catch(function () {});
        else audio.pause();
      }, true);
    }

    function syncToggle() {
      var current = document.querySelector('.demo3-vinyl-toggle');
      if (!current) return;
      current.textContent = audio.paused ? '\u25b6' : '\u2161';
      current.setAttribute('aria-label', audio.paused ? 'Reproducir música' : 'Pausar música');
      current.setAttribute('title', audio.paused ? 'Reproducir música' : 'Pausar música');
    }

    if (!audio.dataset.demo3ToggleSyncBound) {
      audio.dataset.demo3ToggleSyncBound = 'true';
      audio.addEventListener('play', syncToggle);
      audio.addEventListener('pause', syncToggle);
    }
    syncToggle();

    var vinyl = document.querySelector('video');
    if (vinyl && !vinyl.dataset.demo3MusicBound) {
      vinyl.dataset.demo3MusicBound = 'true';
      vinyl.loop = true;
      /* El clip decorativo puede pausarse solo; el toque del usuario gobierna
         la canción de forma independiente y estable. */
      vinyl.addEventListener('click', function () {
        if (audio.paused) audio.play().catch(function () {});
        else audio.pause();
      }, true);
    }
    Array.prototype.forEach.call(document.querySelectorAll('button'), function (button) {
      var label = normalize(button.getAttribute('aria-label') || button.innerText).toLowerCase();
      if (button.dataset.demo3MusicBound || (label !== 'reproducir' && label !== 'pausar')) return;
      button.dataset.demo3MusicBound = 'true';
      button.addEventListener('click', function () {
        if (label === 'pausar') audio.pause();
        else audio.play().catch(function () {});
      }, true);
    });
  }

  function createMusic() {
    var existing = document.querySelector('audio[data-demo3-music]');
    if (existing) return { audio: existing };
    var audio = document.createElement('audio');
    audio.dataset.demo3Music = 'true';
    audio.dataset.state = 'paused';
    audio.src = BASE + '_assets/music/music.mp3';
    audio.loop = true;
    audio.autoplay = true;
    audio.setAttribute('autoplay', '');
    audio.preload = 'metadata';
    audio.addEventListener('play', function () { audio.dataset.state = 'playing'; });
    audio.addEventListener('pause', function () { audio.dataset.state = 'paused'; });
    audio.addEventListener('error', function () { audio.dataset.state = 'error'; });
    document.body.appendChild(audio);
    wireVinylControls(audio);
    return { audio: audio };
  }

  function enableMusicAutoplay(audio) {
    function markBlocked() {
      audio.dataset.autoplay = 'blocked';
    }

    function markPlaying() {
      audio.dataset.autoplay = 'playing';
    }

    function tryPlay() {
      var result = audio.play();
      if (result && typeof result.then === 'function') {
        result.then(markPlaying).catch(markBlocked);
      }
    }

    /* Se intenta al cargar. En navegadores que bloquean audio sin interacción,
       el primer toque fuera del control del vinilo lo habilita inmediatamente. */
    tryPlay();
    if (!window.demo3AutoplayUnlockBound) {
      window.demo3AutoplayUnlockBound = true;
      document.addEventListener('pointerdown', function unlockMusic(event) {
        if (event.target && event.target.closest && event.target.closest('.demo3-vinyl-toggle')) return;
        if (!audio.paused) {
          document.removeEventListener('pointerdown', unlockMusic, true);
          return;
        }
        var result = audio.play();
        if (result && typeof result.then === 'function') {
          result.then(function () {
            markPlaying();
            document.removeEventListener('pointerdown', unlockMusic, true);
          }).catch(markBlocked);
        }
      }, true);
    }
  }

  function showWelcome(invitation, music) {
    var overlay = document.createElement('div');
    overlay.className = 'demo3-welcome';
    var names = normalize(invitation.names || invitation.nombre || 'Invitado especial');
    var seats = Math.max(1, Number(invitation.seats || invitation.cupos || 1));
    overlay.innerHTML =
      '<article class="demo3-welcome-card">' +
      '<img class="demo3-welcome-logo" src="' + BASE + '_assets/branding/lg-monogram.png" alt="Monograma LG">' +
      '<div class="demo3-kicker">Lesly &amp; Gleen</div>' +
      '<h1>' + names.replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }) + '</h1>' +
      '<p>Nos encantará celebrar este día contigo.</p>' +
      '<p><strong>Hemos reservado ' + seats + ' ' + (seats === 1 ? 'cupo' : 'cupos') + ' para esta invitación.</strong></p>' +
      '<button class="demo3-enter" type="button">Ver invitación</button>' +
      '</article>';
    overlay.querySelector('button').addEventListener('click', function () {
      music.audio.play().catch(function () {});
      overlay.remove();
    });
    document.body.appendChild(overlay);
  }

  function showExpired() {
    document.documentElement.style.overflow = 'hidden';
    var overlay = document.createElement('div');
    overlay.className = 'demo3-expired';
    overlay.innerHTML =
      '<article class="demo3-expired-card">' +
      '<img class="demo3-expired-logo" src="' + BASE + '_assets/branding/lg-monogram.png" alt="Monograma LG">' +
      '<div class="demo3-kicker">Lesly &amp; Gleen</div>' +
      '<h1>Invitación caducada</h1>' +
      '<p>Esta invitación ha caducado. Para cualquier consulta, comunícate directamente con los novios.</p>' +
      '</article>';
    document.body.appendChild(overlay);
  }

  function installClosingSections() {
    if (!/\/save-the-date\/?$/.test(location.pathname)) return;
    var page = document.getElementById('LBdV4l0jXPBtJ72l');
    page = page && page.closest('._mXnjA');
    var oldFooter = document.getElementById('LBqj2Vncc9rQH5Vk');
    var oldAngels = document.getElementById('LBkNsdKGhKKhhHky');
    var anchor = oldFooter || oldAngels;
    if (!page || !anchor) return;
    var canvas = page.closest('section.rGeu6w');
    if (!canvas) return;
    canvas.style.position = 'relative';
    var closing = canvas.querySelector('.demo3-inpage-closing');
    if (!closing) {
      closing = document.createElement('div');
      closing.className = 'demo3-inpage-closing';
    closing.innerHTML =
      '<section class="demo3-social">' +
        '<div class="demo3-closing-inner">' +
          '<img class="demo3-social-logo" src="' + BASE + '_assets/branding/lg-monogram.png" alt="Monograma de Lesly y Gleen">' +
          '<div class="demo3-kicker">Comparte este recuerdo</div>' +
          '<h2>Etiqueta a los novios</h2>' +
          '<p class="demo3-closing-copy">Durante nuestra boda comparte tus fotografías y videos con nosotros en redes sociales.</p>' +
          '<div class="demo3-tags"><span>#GleenyLes</span><span>#GlenslyLand</span></div>' +
        '</div>' +
      '</section>' +
      '<section class="demo3-countdown">' +
        '<div class="demo3-closing-inner">' +
          '<h2>Nos vemos en:</h2>' +
          '<div class="demo3-countdown-grid" aria-live="polite">' +
            '<div class="demo3-countdown-item"><span class="demo3-countdown-value" data-unit="days">00</span><span class="demo3-countdown-label">Días</span></div>' +
            '<div class="demo3-countdown-item"><span class="demo3-countdown-value" data-unit="hours">00</span><span class="demo3-countdown-label">Horas</span></div>' +
            '<div class="demo3-countdown-item"><span class="demo3-countdown-value" data-unit="seconds">0000</span><span class="demo3-countdown-label">Segundos</span></div>' +
          '</div>' +
          '<figure class="demo3-countdown-polaroid">' +
            '<img src="' + BASE + '_assets/media/f8cd8d3d222799fd4ecec8c56a48535d.png" alt="Lesly y Gleen">' +
            '<figcaption>Lesly &amp; Gleen</figcaption>' +
          '</figure>' +
          '<p class="demo3-date-line">28 de noviembre de 2026 · 3:00 PM<br>Club Campestre Los Cantaritos · Sullana</p>' +
        '</div>' +
      '</section>' +
      '<section class="demo3-farewell">' +
        '<img class="demo3-angels" src="' + BASE + '_assets/media/ac55e3d49fc01691837c45349775e860.png" alt="Angelitos decorativos">' +
        '<div class="demo3-kicker">Con cariño</div>' +
        '<h2>Lesly &amp; Gleen</h2>' +
        '<a class="demo3-back" href="' + BASE + '#page-1">Volver</a>' +
      '</section>';
      canvas.appendChild(closing);
    }

    var canvasRect = canvas.getBoundingClientRect();
    var footerRect = anchor.getBoundingClientRect();
    var fallbackGap = oldFooter ? 0 : 70 * (page.getBoundingClientRect().width / 1265);
    var start = Math.max(0, footerRect.top - canvasRect.top - fallbackGap);
    closing.style.top = start + 'px';
    closing.style.left = '0px';
    var newHeight = Math.ceil(start + closing.getBoundingClientRect().height);
    var node = page;
    while (node) {
      node.style.height = newHeight + 'px';
      if (node.matches && node.matches('section.rGeu6w')) {
        if (node.parentElement) node.parentElement.style.height = newHeight + 'px';
        break;
      }
      node = node.parentElement;
    }
    updateCountdown();
  }

  function guardClosingSections() {
    if (window.demo3ClosingObserver || !window.MutationObserver) return;
    var root = document.getElementById('root');
    if (!root) return;
    var pending = false;
    window.demo3ClosingObserver = new MutationObserver(function () {
      if (pending || document.querySelector('.demo3-inpage-closing')) return;
      pending = true;
      setTimeout(function () {
        pending = false;
        installClosingSections();
      }, 50);
    });
    window.demo3ClosingObserver.observe(root, { childList: true, subtree: true });
  }

  function sanitizeDetailsLinks() {
    if (!/\/details\/?$/.test(location.pathname)) return;
    Array.prototype.forEach.call(document.querySelectorAll('a[href]'), function (link) {
      if (!/thelandsby|corquehotel/i.test(link.href)) return;
      link.removeAttribute('href');
      link.setAttribute('aria-disabled', 'true');
      link.style.pointerEvents = 'none';
      link.style.opacity = '.65';
    });
  }

  function installInitials() {
    Array.prototype.forEach.call(document.querySelectorAll('p'), function (paragraph) {
      var value = normalize(paragraph.innerText);
      if (value === 'R') paragraph.textContent = 'L';
      if (value === 'C' || value === 'c') paragraph.textContent = 'G';
    });
  }

  function alignInvitationLabels() {
    if (!/\/save-the-date\/?$/.test(location.pathname)) return;
    var tag = document.getElementById('LB3ZbHR6Rs28Q8qW');
    if (tag) {
      var lines = tag.querySelectorAll('p');
      if (lines.length >= 3) {
        ['Lesly', '&', 'Gleen'].forEach(function (text, index) {
          if (lines[index].textContent !== text) lines[index].textContent = text;
        });
      }
    }

    var history = document.querySelector('#LBc0yrsJdc0DfDnt a');
    if (history && history.textContent !== 'Historia de amor') {
      history.textContent = 'Historia de amor';
    }

    /* La curva original pegaba visualmente "TOCA" con "Y". */
    var curvedLetters = document.querySelectorAll('#LBxTB0nlgxyZSDXC .jfNO9A');
    if (curvedLetters.length >= 5) {
      curvedLetters[3].style.left = 'calc(50% - 27px)';
      curvedLetters[4].style.left = 'calc(50% - 5px)';
    }
  }

  function guardInvitationComposition(audio) {
    if (window.demo3CompositionObserver || !window.MutationObserver) return;
    var root = document.getElementById('root');
    if (!root) return;
    var pending = false;
    window.demo3CompositionObserver = new MutationObserver(function () {
      if (pending) return;
      pending = true;
      setTimeout(function () {
        pending = false;
        installCalendar();
        installInitials();
        alignInvitationLabels();
        wireVinylControls(audio);
      }, 40);
    });
    window.demo3CompositionObserver.observe(root, { childList: true, subtree: true, characterData: true });
  }

  function updateCountdown() {
    var root = document.querySelector('.demo3-countdown-grid');
    if (!root) return;
    var remaining = Math.max(0, WEDDING_AT - Date.now());
    var values = {
      days: Math.floor(remaining / 86400000),
      hours: Math.floor(remaining / 3600000) % 24,
      seconds: Math.floor(remaining / 1000) % 3600
    };
    Object.keys(values).forEach(function (unit) {
      var node = root.querySelector('[data-unit="' + unit + '"]');
      if (node) node.textContent = String(values[unit]).padStart(unit === 'seconds' ? 4 : 2, '0');
    });
  }

  function start() {
    var invitation = decodeInvitation();
    window.demo3Invitation = invitation;
    if (invitation && isExpired(invitation)) {
      showExpired();
      return;
    }
    var music = createMusic();
    enableMusicAutoplay(music.audio);
    if (invitation) showWelcome(invitation, music);
    guardClosingSections();
    guardInvitationComposition(music.audio);
    installClosingSections();
    sanitizeDetailsLinks();
    installInitials();
    alignInvitationLabels();
    updateCountdown();
    setInterval(updateCountdown, 1000);
    [350, 900, 1800, 3000, 6000].forEach(function (delay) {
      setTimeout(installCalendar, delay);
      setTimeout(function () { wireVinylControls(music.audio); }, delay);
      setTimeout(installClosingSections, delay);
      setTimeout(sanitizeDetailsLinks, delay);
      setTimeout(installInitials, delay);
      setTimeout(alignInvitationLabels, delay);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
