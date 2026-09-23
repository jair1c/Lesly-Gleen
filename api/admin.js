const crypto = require('crypto');
const {
  authRequest,
  cleanText,
  getBody,
  requireAdmin,
  sendJson,
  supabaseRequest
} = require('./_lib/supabase');

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
}

function publicInvitation(row) {
  return {
    id: row.id,
    token: row.access_token,
    names: row.guest_name,
    seats: row.seats,
    exp: row.expires_at,
    active: row.active,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    rsvp: Array.isArray(row.rsvps) ? (row.rsvps[0] || null) : (row.rsvps || null)
  };
}

module.exports = async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      const body = await getBody(req);
      if (body.action === 'login') {
        const email = cleanText(body.email, 254).toLowerCase();
        const password = String(body.password || '');
        if (!email || !password) return sendJson(res, 400, { error: 'Ingresa correo y contraseña.' });
        const session = await authRequest('token?grant_type=password', {
          method: 'POST',
          body: JSON.stringify({ email, password })
        });
        const fakeReq = { headers: { authorization: `Bearer ${session.access_token}` } };
        const user = await requireAdmin(fakeReq);
        return sendJson(res, 200, {
          accessToken: session.access_token,
          expiresIn: session.expires_in,
          email: user.email
        });
      }

      const user = await requireAdmin(req);
      const names = cleanText(body.names, 180);
      const seats = Number(body.seats);
      const exp = String(body.exp || '');
      if (!names) return sendJson(res, 400, { error: 'Escribe el nombre del invitado o familia.' });
      if (!Number.isInteger(seats) || seats < 1 || seats > 20) return sendJson(res, 400, { error: 'Los cupos deben estar entre 1 y 20.' });
      if (!validDate(exp)) return sendJson(res, 400, { error: 'Selecciona una fecha de vencimiento válida.' });

      const token = crypto.randomBytes(24).toString('base64url');
      const created = await supabaseRequest('invitations', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          access_token: token,
          guest_name: names,
          seats,
          expires_at: exp,
          created_by: user.id
        })
      });
      return sendJson(res, 201, { invitation: publicInvitation(created[0]) });
    }

    const user = await requireAdmin(req);
    void user;

    if (req.method === 'GET') {
      const rows = await supabaseRequest('invitations?select=id,access_token,guest_name,seats,expires_at,active,status,created_at,updated_at,rsvps(id,attendance,attendee_count,attendee_names,message,whatsapp_opened,responded_at,updated_at)&order=created_at.desc');
      return sendJson(res, 200, { invitations: rows.map(publicInvitation) });
    }

    if (req.method === 'PATCH') {
      const body = await getBody(req);
      const id = String(body.id || '');
      if (!/^[0-9a-f-]{36}$/i.test(id)) return sendJson(res, 400, { error: 'Invitación inválida.' });
      const update = {};
      if (body.names !== undefined) {
        update.guest_name = cleanText(body.names, 180);
        if (!update.guest_name) return sendJson(res, 400, { error: 'El nombre no puede quedar vacío.' });
      }
      if (body.seats !== undefined) {
        const seats = Number(body.seats);
        if (!Number.isInteger(seats) || seats < 1 || seats > 20) return sendJson(res, 400, { error: 'Los cupos deben estar entre 1 y 20.' });
        update.seats = seats;
      }
      if (body.exp !== undefined) {
        if (!validDate(body.exp)) return sendJson(res, 400, { error: 'Fecha inválida.' });
        update.expires_at = body.exp;
      }
      if (body.active !== undefined) update.active = Boolean(body.active);
      update.updated_at = new Date().toISOString();
      const rows = await supabaseRequest(`invitations?id=eq.${encodeURIComponent(id)}&select=id,access_token,guest_name,seats,expires_at,active,status,created_at,updated_at,rsvps(id,attendance,attendee_count,attendee_names,message,whatsapp_opened,responded_at,updated_at)`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(update)
      });
      if (!rows.length) return sendJson(res, 404, { error: 'No se encontró la invitación.' });
      return sendJson(res, 200, { invitation: publicInvitation(rows[0]) });
    }

    if (req.method === 'DELETE') {
      const body = await getBody(req);
      const id = String(body.id || '');
      if (!/^[0-9a-f-]{36}$/i.test(id)) return sendJson(res, 400, { error: 'Invitación inválida.' });
      await supabaseRequest(`invitations?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Prefer: 'return=minimal' }
      });
      return sendJson(res, 200, { ok: true });
    }

    res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
    return sendJson(res, 405, { error: 'Método no permitido.' });
  } catch (error) {
    console.error('Admin API:', error);
    return sendJson(res, error.status || 500, { error: error.message || 'No se pudo completar la operación.' });
  }
};
