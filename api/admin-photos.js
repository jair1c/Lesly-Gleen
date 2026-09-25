const { cleanText, getBody, requireAdmin, sendJson, storageRequest, supabaseRequest } = require('./_lib/supabase');

const BUCKET = 'wedding-uploads';

function validId(value) {
  return /^[0-9a-f-]{36}$/i.test(String(value || ''));
}

async function signedRows(rows) {
  const visible = rows.filter(row => row.status !== 'rejected');
  if (visible.length) {
    const signed = await storageRequest(`object/sign/${BUCKET}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expiresIn: 1800, paths: visible.map(row => row.storage_path) })
    });
    visible.forEach((row, index) => {
      row.url = signed[index] && signed[index].signedURL
        ? `${process.env.SUPABASE_URL.replace(/\/$/, '')}/storage/v1${signed[index].signedURL}`
        : '';
    });
  }
  return rows.map(row => ({
    id: row.id,
    invitationId: row.invitation_id,
    guestName: row.invitations && row.invitations.guest_name || 'Invitado',
    url: row.url || '',
    originalName: row.original_name,
    width: row.width,
    height: row.height,
    size: row.size_bytes,
    caption: row.caption || '',
    status: row.status,
    createdAt: row.created_at,
    uploadedAt: row.uploaded_at,
    approvedAt: row.approved_at
  }));
}

async function removeObject(path) {
  await storageRequest(`object/${BUCKET}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefixes: [path] })
  });
}

module.exports = async function handler(req, res) {
  try {
    const user = await requireAdmin(req);
    if (req.method === 'GET') {
      const rows = await supabaseRequest('guest_photos?status=neq.uploading&select=id,invitation_id,storage_path,original_name,width,height,size_bytes,caption,status,created_at,uploaded_at,approved_at,invitations(guest_name)&order=created_at.desc&limit=300');
      return sendJson(res, 200, { photos: await signedRows(rows) });
    }

    if (req.method === 'PATCH') {
      const body = await getBody(req);
      const id = String(body.id || '');
      if (!validId(id)) return sendJson(res, 400, { error: 'Fotografía inválida.' });
      const rows = await supabaseRequest(`guest_photos?id=eq.${encodeURIComponent(id)}&select=id,storage_path,status&limit=1`);
      const photo = rows[0];
      if (!photo) return sendJson(res, 404, { error: 'No encontramos la fotografía.' });
      if (body.action === 'approve') {
        const caption = cleanText(body.caption, 180);
        await supabaseRequest(`guest_photos?id=eq.${encodeURIComponent(id)}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({
            status: 'approved',
            caption: caption || null,
            approved_at: new Date().toISOString(),
            approved_by: user.id,
            updated_at: new Date().toISOString()
          })
        });
        return sendJson(res, 200, { ok: true });
      }
      if (body.action === 'reject') {
        await removeObject(photo.storage_path).catch(() => {});
        await supabaseRequest(`guest_photos?id=eq.${encodeURIComponent(id)}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ status: 'rejected', approved_at: null, approved_by: user.id, updated_at: new Date().toISOString() })
        });
        return sendJson(res, 200, { ok: true });
      }
      return sendJson(res, 400, { error: 'Acción no válida.' });
    }

    if (req.method === 'DELETE') {
      const body = await getBody(req);
      const id = String(body.id || '');
      if (!validId(id)) return sendJson(res, 400, { error: 'Fotografía inválida.' });
      const rows = await supabaseRequest(`guest_photos?id=eq.${encodeURIComponent(id)}&select=id,storage_path&limit=1`);
      const photo = rows[0];
      if (!photo) return sendJson(res, 404, { error: 'No encontramos la fotografía.' });
      await removeObject(photo.storage_path).catch(() => {});
      await supabaseRequest(`guest_photos?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
      return sendJson(res, 200, { ok: true });
    }

    res.setHeader('Allow', 'GET, PATCH, DELETE');
    return sendJson(res, 405, { error: 'Método no permitido.' });
  } catch (error) {
    console.error('Admin photos API:', error);
    return sendJson(res, error.status || 500, { error: error.message || 'No se pudo completar la operación.' });
  }
};
