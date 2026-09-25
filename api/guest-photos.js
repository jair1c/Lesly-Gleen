const crypto = require('crypto');
const { cleanText, getBody, sendJson, storageRequest, supabaseRequest } = require('./_lib/supabase');

const BUCKET = 'wedding-uploads';
const MAX_FILE_SIZE = 6 * 1024 * 1024;
const MAX_BATCH = 10;
const MAX_PER_INVITATION = 30;
const UPLOAD_START = '2026-11-28T00:00:00-05:00';
const UPLOAD_END = '2026-12-28T23:59:59-05:00';
const MIME_EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
};

function validToken(token) {
  return /^[A-Za-z0-9_-]{20,128}$/.test(String(token || ''));
}

function uploadWindow(now = Date.now()) {
  const startsAt = new Date(UPLOAD_START).getTime();
  const endsAt = new Date(UPLOAD_END).getTime();
  return {
    startsAt: UPLOAD_START,
    endsAt: UPLOAD_END,
    isOpen: now >= startsAt && now <= endsAt
  };
}

async function findInvitation(token) {
  if (!validToken(token)) return null;
  const rows = await supabaseRequest(`invitations?access_token=eq.${encodeURIComponent(token)}&select=id,guest_name,active&limit=1`);
  return rows[0] || null;
}

function detectImageType(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))) return 'image/png';
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  return '';
}

function normalizeFile(file) {
  const type = String(file && file.type || '').toLowerCase();
  const size = Number(file && file.size);
  const width = Number(file && file.width);
  const height = Number(file && file.height);
  if (!MIME_EXTENSIONS[type]) throw Object.assign(new Error('Solo se permiten fotografías JPG, PNG o WebP.'), { status: 400 });
  if (!Number.isInteger(size) || size < 1 || size > MAX_FILE_SIZE) throw Object.assign(new Error('Cada fotografía debe pesar como máximo 6 MB.'), { status: 400 });
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 640 || height < 640 || width > 12000 || height > 12000) {
    throw Object.assign(new Error('Cada fotografía debe medir al menos 640 × 640 píxeles.'), { status: 400 });
  }
  return {
    name: cleanText(file.name, 180) || 'fotografia',
    type,
    size,
    width,
    height,
    extension: MIME_EXTENSIONS[type]
  };
}

async function signedGalleryRows() {
  const rows = await supabaseRequest('guest_photos?status=eq.approved&select=id,storage_path,width,height,caption,created_at&order=approved_at.desc.nullslast,created_at.desc&limit=200');
  if (!rows.length) return [];
  const signed = await storageRequest(`object/sign/${BUCKET}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expiresIn: 3600, paths: rows.map(row => row.storage_path) })
  });
  return rows.map((row, index) => ({
    id: row.id,
    url: signed[index] && signed[index].signedURL
      ? `${process.env.SUPABASE_URL.replace(/\/$/, '')}/storage/v1${signed[index].signedURL}`
      : '',
    width: row.width,
    height: row.height,
    caption: row.caption || '',
    createdAt: row.created_at
  })).filter(photo => photo.url);
}

function uploadPermission(invitation) {
  const window = uploadWindow();
  if (!invitation) return { allowed: false, code: 'personalized_link_required', message: 'Abre esta página desde tu invitación personalizada para subir fotografías.' };
  if (!invitation.active) return { allowed: false, code: 'invitation_disabled', message: 'Esta invitación fue desactivada.' };
  if (Date.now() < new Date(window.startsAt).getTime()) return { allowed: false, code: 'not_started', message: 'Podrás subir tus recuerdos desde el 28 de noviembre.' };
  if (Date.now() > new Date(window.endsAt).getTime()) return { allowed: false, code: 'ended', message: 'El período para compartir fotografías ha finalizado.' };
  return { allowed: true, code: 'open', message: 'Selecciona hasta 10 fotografías por envío.' };
}

async function deleteStorage(paths) {
  if (!paths.length) return;
  await storageRequest(`object/${BUCKET}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefixes: paths })
  });
}

module.exports = async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const requestUrl = new URL(req.url, 'https://local.invalid');
      const token = String(requestUrl.searchParams.get('token') || '');
      const invitation = await findInvitation(token);
      return sendJson(res, 200, {
        gallery: await signedGalleryRows(),
        invitation: invitation ? { names: invitation.guest_name, active: invitation.active } : null,
        upload: {
          ...uploadPermission(invitation),
          startsAt: UPLOAD_START,
          endsAt: UPLOAD_END,
          maxBatch: MAX_BATCH,
          maxFileSize: MAX_FILE_SIZE
        }
      });
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST');
      return sendJson(res, 405, { error: 'Método no permitido.' });
    }

    const body = await getBody(req);
    const token = String(body.token || '');
    const invitation = await findInvitation(token);
    const permission = uploadPermission(invitation);
    if (!permission.allowed && process.env.NODE_ENV !== 'test') return sendJson(res, 403, { error: permission.message, code: permission.code });
    if (!invitation || !invitation.active) return sendJson(res, 403, { error: permission.message, code: permission.code });

    if (body.action === 'prepare') {
      if (!Array.isArray(body.files) || body.files.length < 1 || body.files.length > MAX_BATCH) {
        return sendJson(res, 400, { error: `Selecciona entre 1 y ${MAX_BATCH} fotografías.` });
      }
      const files = body.files.map(normalizeFile);
      const existing = await supabaseRequest(`guest_photos?invitation_id=eq.${encodeURIComponent(invitation.id)}&status=in.(uploading,pending,approved)&select=id`);
      if (existing.length + files.length > MAX_PER_INVITATION) {
        return sendJson(res, 400, { error: `Esta invitación puede compartir hasta ${MAX_PER_INVITATION} fotografías.` });
      }

      const created = await supabaseRequest('guest_photos', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(files.map(file => ({
          invitation_id: invitation.id,
          storage_path: `${invitation.id}/${crypto.randomUUID()}.${file.extension}`,
          original_name: file.name,
          mime_type: file.type,
          size_bytes: file.size,
          width: file.width,
          height: file.height,
          status: 'uploading'
        })))
      });

      const uploads = [];
      for (const row of created) {
        const data = await storageRequest(`object/upload/sign/${BUCKET}/${row.storage_path}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}'
        });
        uploads.push({
          id: row.id,
          path: row.storage_path,
          signedUrl: `${process.env.SUPABASE_URL.replace(/\/$/, '')}/storage/v1${data.url}`
        });
      }
      return sendJson(res, 201, { uploads, publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || '' });
    }

    if (body.action === 'finalize') {
      const ids = Array.isArray(body.photoIds) ? body.photoIds.filter(id => /^[0-9a-f-]{36}$/i.test(String(id))) : [];
      if (!ids.length || ids.length > MAX_BATCH) return sendJson(res, 400, { error: 'No encontramos fotografías para finalizar.' });
      const encodedIds = ids.map(String).join(',');
      const rows = await supabaseRequest(`guest_photos?id=in.(${encodeURIComponent(encodedIds)})&invitation_id=eq.${encodeURIComponent(invitation.id)}&status=eq.uploading&select=id,storage_path,mime_type,size_bytes`);
      if (rows.length !== ids.length) return sendJson(res, 400, { error: 'Una o más fotografías no corresponden a esta invitación.' });

      const accepted = [];
      for (const row of rows) {
        try {
          const response = await storageRequest(`object/${BUCKET}/${row.storage_path}`, { method: 'GET', raw: true });
          const buffer = Buffer.from(await response.arrayBuffer());
          const detectedType = detectImageType(buffer);
          if (!detectedType || detectedType !== row.mime_type || buffer.length < 1 || buffer.length > MAX_FILE_SIZE) throw new Error('El archivo no es una fotografía válida.');
          const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
          await supabaseRequest(`guest_photos?id=eq.${encodeURIComponent(row.id)}`, {
            method: 'PATCH',
            headers: { Prefer: 'return=minimal' },
            body: JSON.stringify({ status: 'pending', size_bytes: buffer.length, sha256, uploaded_at: new Date().toISOString() })
          });
          accepted.push(row.id);
        } catch (error) {
          await deleteStorage([row.storage_path]).catch(() => {});
          await supabaseRequest(`guest_photos?id=eq.${encodeURIComponent(row.id)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } }).catch(() => {});
          if (error.status === 409 || /duplicate|unique/i.test(error.message)) continue;
          throw error;
        }
      }
      if (!accepted.length) return sendJson(res, 409, { error: 'Estas fotografías ya habían sido compartidas o no eran válidas.' });
      return sendJson(res, 200, { ok: true, accepted: accepted.length, message: 'Tus recuerdos fueron enviados y aparecerán después de ser aprobados.' });
    }

    return sendJson(res, 400, { error: 'Acción no válida.' });
  } catch (error) {
    console.error('Guest photos API:', error);
    return sendJson(res, error.status || 500, { error: error.message || 'No se pudo completar la operación.' });
  }
};

module.exports._test = { detectImageType, normalizeFile, uploadWindow };
