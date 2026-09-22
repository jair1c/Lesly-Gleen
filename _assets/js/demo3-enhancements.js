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
    var cells = ['<span class="empty">0</span>'];
    for (var day = 1; day <= 30; day += 1) {
      var visibleDay = day === 18 ? '1&#8203;8' : day;
      cells.push('<span class="' + (day === 28 ? 'wedding-day' : '') + '">' + visibleDay + '</span>');
    }
    var element = document.createElement('section');
    element.className = 'demo3-calendar-overlay';
    element.setAttribute('aria-label', 'Calendario de noviembre de 2026; boda el día 28');
    element.innerHTML =
      '<div class="demo3-calendar-title">Noviembre 2026</div>' +
      '<div class="demo3-calendar-week">' + weekdays.map(function (d) { return '<span>' + d + '</span>'; }).join('') + '</div>' +
      '<div class="demo3-calendar-grid">' + cells.join('') + '</div>' +
      '<div class="demo3-calendar-foot">28 de noviembre · 3:00 PM<br>Los Cantaritos · Sullana</div>';
    return element;
  }

  function installCalendar() {
    if (!/\/save-the-date\/?$/.test(location.pathname) || document.querySelector('.demo3-calendar-overlay')) return;
    var wanted = ['18', '28', 'Junio', 'Noviembre', '4:30 PM EN', '3:00 PM', 'Solara Canyon Retreat', 'Club Campestre Los Cantaritos'];
    var candidates = Array.prototype.filter.call(document.querySelectorAll('p'), function (element) {
      return wanted.indexOf(normalize(element.innerText)) >= 0;
    });
    var date = candidates.find(function (el) { return ['Junio', 'Noviembre'].indexOf(normalize(el.innerText)) >= 0; });
    if (!date) return;
    var block = date.closest('.DF_utQ') || date.parentElement;
    var rect = block.getBoundingClientRect();
    var related = candidates.filter(function (element) {
      var r = element.getBoundingClientRect();
      return Math.abs((r.left + r.width / 2) - (rect.left + rect.width / 2)) < Math.max(120, rect.width);
    });
    var rects = related.map(function (element) { return element.getBoundingClientRect(); });
    var left = Math.min.apply(Math, rects.map(function (r) { return r.left; }));
    var top = Math.min.apply(Math, rects.map(function (r) { return r.top; }));
    var right = Math.max.apply(Math, rects.map(function (r) { return r.right; }));
    var bottom = Math.max.apply(Math, rects.map(function (r) { return r.bottom; }));
    related.forEach(function (element) { element.style.opacity = '0'; });
    var calendar = buildCalendar();
    document.body.appendChild(calendar);
    calendar.style.left = (left + window.scrollX - 5) + 'px';
    calendar.style.top = (top + window.scrollY - 7) + 'px';
    calendar.style.width = Math.max(120, right - left + 10) + 'px';
    calendar.style.height = Math.max(170, bottom - top + 16) + 'px';
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
