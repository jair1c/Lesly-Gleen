const test = require('node:test');
const assert = require('node:assert/strict');
const invitationHandler = require('../api/invitation');

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SECRET_KEY = 'sb_secret_test';
process.env.WHATSAPP_NUMBER = '51999888777';

function responseQueue(items) {
  global.fetch = async () => {
    const item = items.shift();
    return new Response((item.status || 200) === 204 ? null : (item.body === undefined ? '' : JSON.stringify(item.body)), {
      status: item.status || 200,
      headers: { 'Content-Type': 'application/json' }
    });
  };
}

function mockResponse() {
  return {
    statusCode: 200,
    headers: {},
    setHeader(key, value) { this.headers[key] = value; },
    end(value) { this.value = value; }
  };
}

test('reads one personalized invitation', async () => {
  responseQueue([{ body: [{ id:'1', guest_name:'Familia Luna', seats:3, expires_at:'2026-10-23', active:true, status:'pending', rsvps:[] }] }]);
  const req = { method:'GET', url:'/api/invitation?token=abcdefghijklmnopqrstuvwxyz', headers:{} };
  const res = mockResponse();
  await invitationHandler(req, res);
  const data = JSON.parse(res.value);
  assert.equal(res.statusCode, 200);
  assert.equal(data.invitation.names, 'Familia Luna');
  assert.equal(data.invitation.seats, 3);
});

test('rejects confirmations above the reserved seats', async () => {
  responseQueue([{ body: [{ id:'1', guest_name:'Familia Luna', seats:2, expires_at:'2026-10-23', active:true, status:'pending', rsvps:[] }] }]);
  const req = { method:'POST', url:'/api/invitation', headers:{}, body:{ token:'abcdefghijklmnopqrstuvwxyz', attendance:true, attendeeCount:3, attendeeNames:['A','B','C'] } };
  const res = mockResponse();
  await invitationHandler(req, res);
  assert.equal(res.statusCode, 400);
  assert.match(JSON.parse(res.value).error, /entre 1 y 2/);
});

test('saves a valid RSVP before returning the WhatsApp URL', async () => {
  responseQueue([
    { body: [{ id:'1', guest_name:'Carlos Ramírez', seats:2, expires_at:'2026-10-23', active:true, status:'pending', rsvps:[] }] },
    { status:204 },
    { status:204 }
  ]);
  const req = { method:'POST', url:'/api/invitation', headers:{}, body:{ token:'abcdefghijklmnopqrstuvwxyz', attendance:true, attendeeCount:2, attendeeNames:['Carlos Ramírez','Ana Ramírez'], message:'Ahí estaremos' } };
  const res = mockResponse();
  await invitationHandler(req, res);
  const data = JSON.parse(res.value);
  assert.equal(res.statusCode, 200);
  assert.equal(data.ok, true);
  assert.match(data.whatsappUrl, /^https:\/\/api\.whatsapp\.com\/send\?/);
});
