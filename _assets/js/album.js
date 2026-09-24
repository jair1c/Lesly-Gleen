(function () {
  'use strict';

  var photos = [
    { src: '/_assets/media/album/photo-01.jpg', thumb: '/_assets/media/album/thumb-01.jpg', alt: 'Gleen y Lesly caminando de la mano', chapter: 'Capítulo I', caption: 'Caminando hacia lo que viene', note: 'El comienzo de una nueva historia', orientation: 'portrait' },
    { src: '/_assets/media/album/photo-02.jpg', thumb: '/_assets/media/album/thumb-02.jpg', alt: 'Gleen y Lesly entre flores', chapter: 'Capítulo II', caption: 'Donde florece nuestro amor', note: 'Una tarde para recordar siempre', orientation: 'landscape' },
    { src: '/_assets/media/album/photo-03.jpg', thumb: '/_assets/media/album/thumb-03.jpg', alt: 'Gleen y Lesly abrazados', chapter: 'Capítulo III', caption: 'Nuestro lugar favorito', note: 'Siempre será juntos', orientation: 'portrait' },
    { src: '/_assets/media/album/photo-04.jpg', thumb: '/_assets/media/album/thumb-04.jpg', alt: 'Anillos de boda sobre lino marfil', chapter: 'Los detalles', caption: 'Una promesa para toda la vida', note: 'Imagen referencial de muestra', orientation: 'portrait', sample: true },
    { src: '/_assets/media/album/photo-05.jpg', thumb: '/_assets/media/album/thumb-05.jpg', alt: 'Ramo de novia', chapter: 'Los detalles', caption: 'Flores para un día inolvidable', note: 'Imagen referencial de muestra', orientation: 'portrait', sample: true },
    { src: '/_assets/media/album/photo-06.jpg', thumb: '/_assets/media/album/thumb-06.jpg', alt: 'Mesa preparada para una recepción de boda', chapter: 'La celebración', caption: 'La mesa está lista', note: 'Imagen referencial de muestra', orientation: 'landscape', sample: true },
    { src: '/_assets/media/album/photo-07.jpg', thumb: '/_assets/media/album/thumb-07.jpg', alt: 'Pareja bailando al atardecer', chapter: 'La celebración', caption: 'Que nunca falte una canción', note: 'Imagen referencial de muestra', orientation: 'landscape', sample: true }
  ];

  var card = document.getElementById('albumCard');
  var photo = document.getElementById('albumPhoto');
  var chapter = document.getElementById('albumChapter');
  var caption = document.getElementById('albumCaption');
  var note = document.getElementById('albumNote');
  var sampleLabel = document.getElementById('sampleLabel');
  var currentLabel = document.getElementById('albumCurrent');
  var totalLabel = document.getElementById('albumTotal');
  var progressBar = document.getElementById('albumProgressBar');
  var thumbs = document.getElementById('albumThumbs');
  var lightbox = document.getElementById('albumLightbox');
  var lightboxPhoto = document.getElementById('lightboxPhoto');
  var lightboxCaption = document.getElementById('lightboxCaption');
  var activeIndex = 0;
  var touchStartX = null;
  var lastFocus = null;

  totalLabel.textContent = String(photos.length).padStart(2, '0');

  photos.forEach(function (item, index) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'album-thumb';
    button.style.setProperty('--thumb-rotation', (index % 2 ? '.7deg' : '-.7deg'));
    button.setAttribute('role', 'listitem');
    button.setAttribute('aria-label', 'Mostrar: ' + item.caption);
    button.innerHTML = '<img src="' + item.thumb + '" alt="" loading="lazy"><span>' + item.caption + '</span>';
    button.addEventListener('click', function () { selectPhoto(index, index > activeIndex ? 1 : -1); });
    thumbs.appendChild(button);
  });

  function updatePhoto() {
    var item = photos[activeIndex];
    photo.src = item.src;
    photo.alt = item.alt;
    chapter.textContent = item.chapter;
    caption.textContent = item.caption;
    note.textContent = item.note;
    sampleLabel.hidden = !item.sample;
    currentLabel.textContent = String(activeIndex + 1).padStart(2, '0');
    progressBar.style.width = (((activeIndex + 1) / photos.length) * 100) + '%';
    card.classList.toggle('is-portrait', item.orientation === 'portrait');
    Array.prototype.forEach.call(thumbs.children, function (thumb, index) {
      var isActive = index === activeIndex;
      thumb.classList.toggle('is-active', isActive);
      thumb.setAttribute('aria-current', isActive ? 'true' : 'false');
      if (isActive) {
        var targetLeft = thumb.offsetLeft - ((thumbs.clientWidth - thumb.offsetWidth) / 2);
        thumbs.scrollTo({
          left: Math.max(0, targetLeft),
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
        });
      }
    });
    if (lightbox.classList.contains('is-open')) updateLightbox();
  }

  function selectPhoto(index, direction) {
    var nextIndex = (index + photos.length) % photos.length;
    if (nextIndex === activeIndex) return;
    card.style.setProperty('--slide-x', (direction || 1) * 18 + 'px');
    card.classList.add('is-changing');
    window.setTimeout(function () {
      activeIndex = nextIndex;
      updatePhoto();
      requestAnimationFrame(function () { card.classList.remove('is-changing'); });
    }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 150);
  }

  function updateLightbox() {
    var item = photos[activeIndex];
    lightboxPhoto.src = item.src;
    lightboxPhoto.alt = item.alt;
    lightboxCaption.textContent = item.caption + (item.sample ? ' · Imagen de muestra' : '');
  }

  function openLightbox() {
    lastFocus = document.activeElement;
    updateLightbox();
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    lightbox.querySelector('.lightbox-close').focus();
  }

  function closeLightbox() {
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }

  function invitationUrl() {
    var token = new URLSearchParams(location.search).get('invite');
    try { if (!token) token = sessionStorage.getItem('demo3InviteToken') || ''; } catch (error) {}
    return '/save-the-date' + (token ? '?invite=' + encodeURIComponent(token) : '') + '#recuerdos';
  }

  document.getElementById('albumPrev').addEventListener('click', function () { selectPhoto(activeIndex - 1, -1); });
  document.getElementById('albumNext').addEventListener('click', function () { selectPhoto(activeIndex + 1, 1); });
  document.getElementById('albumExpand').addEventListener('click', openLightbox);
  lightbox.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
  lightbox.querySelector('.lightbox-arrow--prev').addEventListener('click', function () { activeIndex = (activeIndex - 1 + photos.length) % photos.length; updatePhoto(); });
  lightbox.querySelector('.lightbox-arrow--next').addEventListener('click', function () { activeIndex = (activeIndex + 1) % photos.length; updatePhoto(); });
  lightbox.addEventListener('click', function (event) { if (event.target === lightbox) closeLightbox(); });
  card.addEventListener('pointerdown', function (event) { touchStartX = event.clientX; });
  card.addEventListener('pointerup', function (event) {
    if (touchStartX === null) return;
    var distance = event.clientX - touchStartX;
    touchStartX = null;
    if (Math.abs(distance) < 45) return;
    selectPhoto(activeIndex + (distance < 0 ? 1 : -1), distance < 0 ? 1 : -1);
  });
  card.addEventListener('pointercancel', function () { touchStartX = null; });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && lightbox.classList.contains('is-open')) closeLightbox();
    if (event.key === 'ArrowLeft') selectPhoto(activeIndex - 1, -1);
    if (event.key === 'ArrowRight') selectPhoto(activeIndex + 1, 1);
  });

  var returnUrl = invitationUrl();
  document.getElementById('backTop').href = returnUrl;
  document.getElementById('backBottom').href = returnUrl;
  updatePhoto();
})();
