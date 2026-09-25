const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const guestPhotosHandler = require('../api/guest-photos');

const root = path.join(__dirname, '..');
const helpers = guestPhotosHandler._test;

test('validates real image signatures instead of trusting the filename', () => {
  assert.equal(helpers.detectImageType(Buffer.from([0xff, 0xd8, 0xff, 0xdb])), 'image/jpeg');
  assert.equal(helpers.detectImageType(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])), 'image/png');
  assert.equal(helpers.detectImageType(Buffer.from('RIFF1234WEBPmore')), 'image/webp');
  assert.equal(helpers.detectImageType(Buffer.from('<script>alert(1)</script>')), '');
});

test('rejects oversized and undersized guest photographs', () => {
  assert.throws(() => helpers.normalizeFile({name:'large.jpg',type:'image/jpeg',size:6291457,width:1200,height:1200}), /6 MB/);
  assert.throws(() => helpers.normalizeFile({name:'tiny.jpg',type:'image/jpeg',size:1000,width:500,height:900}), /640/);
  assert.equal(helpers.normalizeFile({name:'ok.jpg',type:'image/jpeg',size:1000,width:1200,height:900}).extension, 'jpg');
});

test('guest upload window is independent from the RSVP deadline', () => {
  assert.equal(helpers.uploadWindow(new Date('2026-10-30T12:00:00-05:00').getTime()).isOpen, false);
  assert.equal(helpers.uploadWindow(new Date('2026-11-28T12:00:00-05:00').getTime()).isOpen, true);
  assert.equal(helpers.uploadWindow(new Date('2026-12-29T12:00:00-05:00').getTime()).isOpen, false);
});

test('guest memories page and invitation entry point are wired', () => {
  const html = fs.readFileSync(path.join(root, 'recuerdos.html'), 'utf8');
  const js = fs.readFileSync(path.join(root, '_assets/js/recuerdos.js'), 'utf8');
  const enhancements = fs.readFileSync(path.join(root, '_assets/js/demo3-enhancements.js'), 'utf8');
  const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
  assert.match(html, /Recuerdos de nuestros invitados/);
  assert.match(html, /id="photoInput"/);
  assert.match(js, /action: 'prepare'/);
  assert.match(js, /action: 'finalize'/);
  assert.match(enhancements, /recuerdos\?from=invitation/);
  assert.match(enhancements, /photobooth\|album\|recuerdos\|page-5/);
  assert.ok(vercel.redirects.some(rule => rule.source.endsWith('/recuerdos') && rule.destination === '/recuerdos'));
});

test('database migration keeps guest photos private and moderated', () => {
  const migration = fs.readFileSync(path.join(root, 'supabase/migrations/20260925130821_guest_photo_uploads.sql'), 'utf8');
  assert.match(migration, /alter table public\.guest_photos enable row level security/i);
  assert.match(migration, /revoke all on table public\.guest_photos from anon, authenticated/i);
  assert.match(migration, /'wedding-uploads'[\s\S]+false/i);
  assert.match(migration, /status in \('uploading', 'pending', 'approved', 'rejected'\)/i);
});
