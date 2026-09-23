const { cleanText, getBody, sendJson, supabaseRequest } = require('./_lib/supabase');

function validToken(token) {
  return /^[A-Za-z0-9_-]{20,128}$/.test(token);
}

function isExpired(date) {
  return Date.now() >= new Date(`${date}T00:00:00-05:00`).getTime();
}

async function findInvitation(token) {
  const rows = await supabaseRequest(`invitations?access_token=eq.${encodeURIComponent(token)}&select=id,guest_name,seats,expires_at,active,status,rsvps(attendance,attendee_count,attendee_names,message,responded_at,updated_at)&limit=1`);
  return rows[0] || null;
}

function publicInvitation(row) {
  const rsvp = Array.isArray(row.rsvps) ? (row.rsvps[0] || null) : (row.rsvps || null);
  return {
    names: row.guest_name,
    seats: row.seats,
    exp: row.expires_at,
    status: row.status,
    active: row.active,
    expired: isExpired(row.expires_at),
    rsvp: rsvp ? {
      attendance: rsvp.attendance,
      attendeeCount: rsvp.attendee_count,
      attendeeNames: rsvp.attendee_names || [],
      message: rsvp.message || '',
      respondedAt: rsvp.responded_at
    } : null
  };
}

function whatsappMessage(invitation, attendance, attendeeCount, attendeeNames, message) {
  const lines = [
    '¡Hola! Confirmo mi asistencia para la boda de Gleen y Lesly:',
    '',
    `*Invitación para:* ${invitation.guest_name}`,
    `*Asistencia:* ${attendance ? 'Sí, asistiré 💍' : 'No podré asistir 🤍'}`,
    `*Cupos reservados:* ${invitation.seats}`
  ];
  if (attendance) {
    lines.push(`*Personas confirmadas:* ${attendeeCount}`);
    lines.push('*Asistentes:*');
    attendeeNames.forEach(name => lines.push(`- ${name}`));
  }
  if (message) lines.push(`*Mensaje:* ${message}`);
  return lines.join('\n');
}

module.exports = async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const requestUrl = new URL(req.url, 'https://local.invalid');
      const token = String(requestUrl.searchParams.get('token') || '');
      if (!validToken(token)) return sendJson(res, 400, { error: 'El enlace de invitación no es válido.' });
      const invitation = await findInvitation(token);
      if (!invitation) return sendJson(res, 404, { error: 'No encontramos esta invitación.' });
      return sendJson(res, 200, { invitation: publicInvitation(invitation) });
    }

    if (req.method === 'POST') {
      const body = await getBody(req);
      const token = String(body.token || '');
      if (!validToken(token)) return sendJson(res, 400, { error: 'El enlace de invitación no es válido.' });
      const invitation = await findInvitation(token);
      if (!invitation) return sendJson(res, 404, { error: 'No encontramos esta invitación.' });
      if (!invitation.active) return sendJson(res, 403, { error: 'Esta invitación fue desactivada.' });
      if (isExpired(invitation.expires_at)) return sendJson(res, 410, { error: 'El plazo para confirmar esta invitación ha finalizado.' });

      const attendance = body.attendance === true || body.attendance === 'si';
      const attendeeCount = attendance ? Number(body.attendeeCount) : 0;
      const attendeeNames = attendance && Array.isArray(body.attendeeNames)
        ? body.attendeeNames.map(name => cleanText(name, 120)).filter(Boolean)
        : [];
      const message = cleanText(body.message, 500);
      if (attendance && (!Number.isInteger(attendeeCount) || attendeeCount < 1 || attendeeCount > invitation.seats)) {
        return sendJson(res, 400, { error: `Puedes confirmar entre 1 y ${invitation.seats} personas.` });
      }
      if (attendance && attendeeNames.length !== attendeeCount) {
        return sendJson(res, 400, { error: 'Completa el nombre de todas las personas que asistirán.' });
      }

      const now = new Date().toISOString();
      await supabaseRequest('rsvps?on_conflict=invitation_id', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({
          invitation_id: invitation.id,
          attendance,
          attendee_count: attendeeCount,
          attendee_names: attendeeNames,
          message: message || null,
          whatsapp_opened: true,
          responded_at: now,
          updated_at: now
        })
      });
      await supabaseRequest(`invitations?id=eq.${encodeURIComponent(invitation.id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ status: attendance ? 'attending' : 'declined', updated_at: now })
      });

      const phone = String(process.env.WHATSAPP_NUMBER || '').replace(/\D/g, '');
      const text = whatsappMessage(invitation, attendance, attendeeCount, attendeeNames, message);
      return sendJson(res, 200, {
        ok: true,
        whatsappUrl: phone
          ? `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`
          : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`
      });
    }

    res.setHeader('Allow', 'GET, POST');
    return sendJson(res, 405, { error: 'Método no permitido.' });
  } catch (error) {
    console.error('Invitation API:', error);
    return sendJson(res, error.status || 500, { error: error.message || 'No se pudo completar la operación.' });
  }
};
