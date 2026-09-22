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
      cells.push('<span class="' + (day === 28 ? 'wedding-day' : '') + '">' + day + '</span>');
    }
    var element = document.createElement('div');
    element.className = 'demo3-calendar-transplant';
    element.setAttribute('role', 'img');
    element.setAttribute('aria-label', 'Calendario de noviembre de 2026; boda el sábado 28 a las 3 de la tarde');
    element.innerHTML =
      '<img class="demo3-calendar-paper" src="' + BASE + '_assets/media/a9df9c0ccfaca50aa0e135ca91290a33.png" alt="">' +
      '<div class="demo3-calendar-title">Noviembre 2026</div>' +
      '<div class="demo3-calendar-dates">' +
        '<div class="demo3-calendar-week">' + weekdays.map(function (d) { return '<span>' + d + '</span>'; }).join('') + '</div>' +
        '<div class="demo3-calendar-grid">' + cells.join('') + '</div>' +
      '</div>' +
      '<div class="demo3-calendar-foot">3:00 PM<br>LOS CANTARITOS · SULLANA</div>';
    return element;
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
    if (!host || host.classList.contains('demo3-calendar-host')) return;
    host.classList.add('demo3-calendar-host');
    host.appendChild(buildCalendar());
  }

  function createMusic() {
    if (document.querySelector('.demo3-music')) return null;
    var audio = document.createElement('audio');
    audio.src = BASE + '_assets/music/music.mp3';
    audio.loop = true;
    audio.preload = 'metadata';
    var button = document.createElement('button');
    button.className = 'demo3-music';
    button.type = 'button';
    button.setAttribute('aria-label', 'Reproducir música');
    button.textContent = '♫';
    button.addEventListener('click', function () {
      if (audio.paused) {
        audio.play().then(function () {
          button.classList.add('is-playing');
          button.setAttribute('aria-label', 'Pausar música');
          button.textContent = 'Ⅱ';
        }).catch(function () {});
      } else {
        audio.pause();
        button.classList.remove('is-playing');
        button.setAttribute('aria-label', 'Reproducir música');
        button.textContent = '♫';
      }
    });
    document.body.appendChild(audio);
    document.body.appendChild(button);
    return { audio: audio, button: button };
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
      overlay.remove();
      if (music) music.button.click();
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
    if (!location.pathname.endsWith(BASE) && location.pathname !== BASE.slice(0, -1)) return;
    if (document.querySelector('.demo3-closing')) return;
    var closing = document.createElement('main');
    closing.className = 'demo3-closing';
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
          '<div class="demo3-kicker">Nos vemos en</div>' +
          '<h2>La cuenta regresiva</h2>' +
          '<div class="demo3-countdown-grid" aria-live="polite">' +
            '<div class="demo3-countdown-item"><span class="demo3-countdown-value" data-unit="days">00</span><span class="demo3-countdown-label">Días</span></div>' +
            '<div class="demo3-countdown-item"><span class="demo3-countdown-value" data-unit="hours">00</span><span class="demo3-countdown-label">Horas</span></div>' +
            '<div class="demo3-countdown-item"><span class="demo3-countdown-value" data-unit="minutes">00</span><span class="demo3-countdown-label">Minutos</span></div>' +
            '<div class="demo3-countdown-item"><span class="demo3-countdown-value" data-unit="seconds">00</span><span class="demo3-countdown-label">Segundos</span></div>' +
          '</div>' +
          '<p class="demo3-date-line">28 de noviembre de 2026 · 3:00 PM<br>Club Campestre Los Cantaritos · Sullana</p>' +
        '</div>' +
      '</section>';
    document.body.appendChild(closing);
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

  function updateCountdown() {
    var root = document.querySelector('.demo3-countdown-grid');
    if (!root) return;
    var remaining = Math.max(0, WEDDING_AT - Date.now());
    var values = {
      days: Math.floor(remaining / 86400000),
      hours: Math.floor(remaining / 3600000) % 24,
      minutes: Math.floor(remaining / 60000) % 60,
      seconds: Math.floor(remaining / 1000) % 60
    };
    Object.keys(values).forEach(function (unit) {
      var node = root.querySelector('[data-unit="' + unit + '"]');
      if (node) node.textContent = String(values[unit]).padStart(2, '0');
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
    if (invitation) showWelcome(invitation, music);
    installClosingSections();
    sanitizeDetailsLinks();
    installInitials();
    updateCountdown();
    setInterval(updateCountdown, 1000);
    [350, 900, 1800, 3000].forEach(function (delay) {
      setTimeout(installCalendar, delay);
      setTimeout(sanitizeDetailsLinks, delay);
      setTimeout(installInitials, delay);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
