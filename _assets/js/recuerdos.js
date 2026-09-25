(function () {
  'use strict';
  var API = '/api/guest-photos';
  var params = new URLSearchParams(location.search);
  var token = params.get('invite') || '';
  var selected = [];
  var lastGallerySignature = '';
  var input = document.getElementById('photoInput');
  var chooseButton = document.getElementById('choosePhotos');
  var submitButton = document.getElementById('submitPhotos');
  var previewArea = document.getElementById('previewArea');
  var previewGrid = document.getElementById('previewGrid');
  var previewCount = document.getElementById('previewCount');
  var uploadMessage = document.getElementById('uploadMessage');
  var uploadStatus = document.getElementById('uploadStatus');
  var gallery = document.getElementById('guestGallery');
  var lightbox = document.getElementById('guestLightbox');

  if (token) {
    var back = document.getElementById('backToInvite');
    back.hidden = false;
    back.href = '/save-the-date?invite=' + encodeURIComponent(token) + '#recuerdos';
  }

  function setStatus(message, type) {
    uploadStatus.textContent = message || '';
    uploadStatus.className = 'upload-status' + (type ? ' is-' + type : '');
  }

  function api(options) {
    return fetch(API + (options && options.query || ''), {
      method: options && options.method || 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: options && options.body ? JSON.stringify(options.body) : undefined
    }).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (data) {
        if (!response.ok) throw new Error(data.error || 'No se pudo completar la operación.');
        return data;
      });
    });
  }

  function renderGallery(photos) {
    var signature = photos.map(function (photo) { return photo.id; }).join('|');
    if (signature === lastGallerySignature) return;
    lastGallerySignature = signature;
    if (!photos.length) {
      gallery.innerHTML = '<div class="gallery-empty"><span>♡</span><strong>Muy pronto comenzará esta colección</strong><p>Los primeros recuerdos aparecerán aquí durante la celebración.</p></div>';
      return;
    }
    gallery.innerHTML = photos.map(function (photo, index) {
      var caption = escapeHtml(photo.caption || 'Un recuerdo compartido');
      return '<button class="guest-photo" type="button" data-index="' + index + '"><img src="' + escapeHtml(photo.url) + '" alt="' + caption + '" loading="lazy"><span>' + caption + '</span></button>';
    }).join('');
    gallery._photos = photos;
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, function (char) {
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char];
    });
  }

  function loadContext(silent) {
    return api({ query: '?token=' + encodeURIComponent(token) }).then(function (data) {
      renderGallery(data.gallery || []);
      if (!silent) {
        uploadMessage.textContent = data.upload.message;
        chooseButton.disabled = !data.upload.allowed;
        chooseButton.textContent = data.upload.allowed ? 'Seleccionar fotografías' : (data.upload.code === 'not_started' ? 'Disponible desde el 28 de noviembre' : 'Carga no disponible');
        if (data.invitation) uploadMessage.textContent = data.invitation.names + ', ' + data.upload.message.charAt(0).toLowerCase() + data.upload.message.slice(1);
      }
    }).catch(function (error) {
      if (!silent) {
        uploadMessage.textContent = 'La galería está disponible, pero no pudimos validar la carga en este momento.';
        chooseButton.disabled = true;
        setStatus(error.message, 'error');
      }
    });
  }

  function imageFromFile(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var image = new Image();
      image.onload = function () { resolve({ image: image, url: url, width: image.naturalWidth, height: image.naturalHeight }); };
      image.onerror = function () { URL.revokeObjectURL(url); reject(new Error('No pudimos leer ' + file.name + '.')); };
      image.src = url;
    });
  }

  function prepareFile(file) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return Promise.reject(new Error(file.name + ' no es una fotografía JPG, PNG o WebP.'));
    if (file.size > 6 * 1024 * 1024) return Promise.reject(new Error(file.name + ' supera el límite de 6 MB.'));
    return imageFromFile(file).then(function (loaded) {
      if (loaded.width < 640 || loaded.height < 640) {
        URL.revokeObjectURL(loaded.url);
        throw new Error(file.name + ' es demasiado pequeña. Usa una imagen de al menos 640 × 640 px.');
      }
      var scale = Math.min(1, 2400 / Math.max(loaded.width, loaded.height));
      var width = Math.round(loaded.width * scale);
      var height = Math.round(loaded.height * scale);
      var canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      var context = canvas.getContext('2d', { alpha: false });
      context.fillStyle = '#fff';
      context.fillRect(0, 0, width, height);
      context.drawImage(loaded.image, 0, 0, width, height);
      return new Promise(function (resolve, reject) {
        canvas.toBlob(function (blob) {
          if (!blob) return reject(new Error('No pudimos preparar ' + file.name + '.'));
          resolve({ name: file.name.replace(/\.[^.]+$/, '') + '.jpg', type: 'image/jpeg', blob: blob, width: width, height: height, preview: loaded.url });
        }, 'image/jpeg', .86);
      });
    });
  }

  function renderPreviews() {
    previewArea.hidden = !selected.length;
    previewCount.textContent = selected.length + (selected.length === 1 ? ' foto' : ' fotos');
    previewGrid.innerHTML = selected.map(function (item, index) {
      return '<div class="preview-item"><img src="' + item.preview + '" alt="Vista previa de ' + escapeHtml(item.name) + '"><button class="preview-remove" type="button" data-remove="' + index + '" aria-label="Quitar ' + escapeHtml(item.name) + '">×</button></div>';
    }).join('');
  }

  function clearSelection() {
    selected.forEach(function (item) { URL.revokeObjectURL(item.preview); });
    selected = [];
    input.value = '';
    renderPreviews();
  }

  chooseButton.addEventListener('click', function () { input.click(); });
  input.addEventListener('change', function () {
    var files = Array.prototype.slice.call(input.files || [], 0, 10);
    setStatus('Preparando vistas previas…');
    Promise.all(files.map(prepareFile)).then(function (items) {
      clearSelection();
      selected = items;
      renderPreviews();
      setStatus('Revisa las imágenes y confirma cuando estés listo.');
    }).catch(function (error) { clearSelection(); setStatus(error.message, 'error'); });
  });
  previewGrid.addEventListener('click', function (event) {
    var button = event.target.closest('[data-remove]');
    if (!button) return;
    var index = Number(button.dataset.remove);
    URL.revokeObjectURL(selected[index].preview);
    selected.splice(index, 1);
    renderPreviews();
  });
  document.getElementById('clearPhotos').addEventListener('click', clearSelection);

  submitButton.addEventListener('click', function () {
    if (!selected.length) return;
    chooseButton.disabled = true;
    submitButton.disabled = true;
    setStatus('Preparando el envío seguro…');
    api({ method: 'POST', body: {
      action: 'prepare', token: token,
      files: selected.map(function (item) { return { name:item.name, type:item.type, size:item.blob.size, width:item.width, height:item.height }; })
    }}).then(function (data) {
      var publicKey = data.publishableKey || '';
      return Promise.all(data.uploads.map(function (upload, index) {
        var form = new FormData();
        form.append('cacheControl', '3600');
        form.append('', selected[index].blob);
        var headers = publicKey ? { apikey: publicKey } : {};
        if (/^eyJ/.test(publicKey)) headers.Authorization = 'Bearer ' + publicKey;
        return fetch(upload.signedUrl, { method: 'PUT', headers: headers, body: form }).then(function (response) {
          if (!response.ok) return response.json().catch(function () { return {}; }).then(function (details) { throw new Error(details.message || 'Una fotografía no pudo subirse.'); });
          return upload.id;
        });
      }));
    }).then(function (ids) {
      setStatus('Comprobando las fotografías…');
      return api({ method: 'POST', body: { action: 'finalize', token: token, photoIds: ids } });
    }).then(function (data) {
      clearSelection();
      setStatus(data.message, 'success');
    }).catch(function (error) {
      setStatus(error.message, 'error');
    }).finally(function () {
      chooseButton.disabled = false;
      submitButton.disabled = false;
      loadContext(true);
    });
  });

  gallery.addEventListener('click', function (event) {
    var button = event.target.closest('[data-index]');
    if (!button || !gallery._photos) return;
    var photo = gallery._photos[Number(button.dataset.index)];
    document.getElementById('lightboxImage').src = photo.url;
    document.getElementById('lightboxImage').alt = photo.caption || 'Recuerdo compartido';
    document.getElementById('lightboxCaption').textContent = photo.caption || 'Un recuerdo compartido';
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    lightbox.querySelector('.lightbox-close').focus();
  });
  function closeLightbox() { lightbox.classList.remove('is-open'); lightbox.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; }
  lightbox.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', function (event) { if (event.target === lightbox) closeLightbox(); });
  document.addEventListener('keydown', function (event) { if (event.key === 'Escape') closeLightbox(); });

  loadContext(false);
  window.setInterval(function () { if (!document.hidden) loadContext(true); }, 20000);
})();
