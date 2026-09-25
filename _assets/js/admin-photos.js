(function () {
  'use strict';
  var API = '/api/admin-photos';
  var SESSION_KEY = 'lg_admin_session';
  var photos = [];
  var filter = 'pending';
  var grid = document.getElementById('adminPhotoGrid');
  var panel = document.getElementById('photoModeration');
  var lastToken = '';

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char];
    });
  }

  function token() { return sessionStorage.getItem(SESSION_KEY) || ''; }
  function request(options) {
    var access = token();
    return fetch(API, {
      method: options && options.method || 'GET',
      headers: {'Content-Type':'application/json', Authorization:'Bearer ' + access},
      body: options && options.body ? JSON.stringify(options.body) : undefined
    }).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (data) {
        if (!response.ok) throw new Error(data.error || 'No se pudo completar la operación.');
        return data;
      });
    });
  }

  function statusLabel(status) {
    return status === 'approved' ? 'Aprobada' : status === 'rejected' ? 'Rechazada' : 'Pendiente';
  }

  function render() {
    document.getElementById('pendingPhotoCount').textContent = photos.filter(function (photo) { return photo.status === 'pending'; }).length;
    var visible = photos.filter(function (photo) { return photo.status === filter; });
    if (!visible.length) {
      grid.innerHTML = '<div class="empty">No hay fotografías ' + (filter === 'pending' ? 'pendientes de revisión.' : filter === 'approved' ? 'aprobadas todavía.' : 'rechazadas.') + '</div>';
      return;
    }
    grid.innerHTML = visible.map(function (photo) {
      var media = photo.url ? '<img src="' + esc(photo.url) + '" alt="Fotografía enviada por ' + esc(photo.guestName) + '" loading="lazy">' : '<div class="photo-rejected-placeholder">El archivo fue retirado del almacenamiento.</div>';
      var actions = photo.status === 'pending'
        ? '<button class="btn small" data-photo-action="approve" data-id="' + photo.id + '">Aprobar</button><button class="btn danger small" data-photo-action="reject" data-id="' + photo.id + '">Rechazar</button>'
        : photo.status === 'approved'
          ? '<button class="btn danger small" data-photo-action="reject" data-id="' + photo.id + '">Retirar de la galería</button><button class="btn danger small photo-delete" data-photo-action="delete" data-id="' + photo.id + '">Eliminar registro</button>'
          : '<button class="btn danger small photo-delete" data-photo-action="delete" data-id="' + photo.id + '">Eliminar registro</button>';
      return '<article class="admin-photo"><div class="admin-photo-media">' + media + '<span class="badge ' + (photo.status === 'approved' ? 'attending' : photo.status === 'rejected' ? 'declined' : '') + '">' + statusLabel(photo.status) + '</span></div><div class="admin-photo-body"><h3>' + esc(photo.guestName) + '</h3><div class="admin-photo-meta">' + Math.round(photo.size / 1024) + ' KB · ' + photo.width + ' × ' + photo.height + ' px<br>' + new Date(photo.createdAt).toLocaleString('es-PE') + '</div>' + (photo.status === 'pending' ? '<input maxlength="180" data-caption="' + photo.id + '" placeholder="Descripción opcional">' : photo.caption ? '<p>“' + esc(photo.caption) + '”</p>' : '') + '<div class="admin-photo-actions">' + actions + '</div></div></article>';
    }).join('');
  }

  function load(showLoading) {
    if (!token()) return Promise.resolve();
    if (showLoading) grid.innerHTML = '<div class="photos-loading">Cargando fotografías…</div>';
    return request().then(function (data) { photos = data.photos || []; render(); }).catch(function (error) { grid.innerHTML = '<div class="empty">' + esc(error.message) + '</div>'; });
  }

  document.querySelector('.photo-tabs').addEventListener('click', function (event) {
    var button = event.target.closest('[data-photo-filter]');
    if (!button) return;
    filter = button.dataset.photoFilter;
    document.querySelectorAll('[data-photo-filter]').forEach(function (item) { item.classList.toggle('is-active', item === button); });
    render();
  });

  grid.addEventListener('click', function (event) {
    var button = event.target.closest('[data-photo-action]');
    if (!button) return;
    var action = button.dataset.photoAction;
    var id = button.dataset.id;
    var photo = photos.find(function (item) { return item.id === id; });
    if (!photo) return;
    if ((action === 'reject' || action === 'delete') && !confirm(action === 'delete' ? '¿Eliminar definitivamente este registro?' : '¿Retirar esta fotografía?')) return;
    button.disabled = true;
    var captionInput = grid.querySelector('[data-caption="' + id + '"]');
    var options = action === 'delete'
      ? {method:'DELETE',body:{id:id}}
      : {method:'PATCH',body:{id:id,action:action,caption:captionInput ? captionInput.value.trim() : ''}};
    request(options).then(function () { return load(false); }).catch(function (error) { alert(error.message); button.disabled = false; });
  });

  var observer = new MutationObserver(function () {
    var current = token();
    if (!panel.closest('#appView').classList.contains('hidden') && current && current !== lastToken) { lastToken = current; load(true); }
  });
  observer.observe(document.getElementById('appView'), {attributes:true,attributeFilter:['class']});
  if (token()) { lastToken = token(); load(true); }
  window.setInterval(function () { if (token() && !document.hidden) load(false); }, 20000);
})();
