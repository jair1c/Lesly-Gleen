const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

test('album uses only local styles, scripts, fonts and photographs', () => {
  const html = fs.readFileSync(path.join(root, 'album.html'), 'utf8');
  const css = fs.readFileSync(path.join(root, '_assets/css/album.css'), 'utf8');
  assert.doesNotMatch(html, /https?:\/\//i);
  assert.doesNotMatch(css, /https?:\/\//i);
  assert.match(html, /_assets\/css\/album\.css/);
  assert.match(html, /_assets\/js\/album\.js/);
  for (let index = 1; index <= 7; index += 1) {
    const number = String(index).padStart(2, '0');
    assert.ok(fs.existsSync(path.join(root, `_assets/media/album/photo-${number}.jpg`)));
    assert.ok(fs.existsSync(path.join(root, `_assets/media/album/thumb-${number}.jpg`)));
  }
});

test('invitation includes the album button and preserves album links', () => {
  const enhancements = fs.readFileSync(path.join(root, '_assets/js/demo3-enhancements.js'), 'utf8');
  assert.match(enhancements, /Ver álbum de fotos/);
  assert.match(enhancements, /photobooth\|album\|page-5/);
});

test('local and Vercel routes expose the clean album URL', () => {
  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
  const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
  assert.match(server, /'\/album': '\/album\.html'/);
  assert.equal(vercel.cleanUrls, true);
  assert.ok(vercel.redirects.some((rule) => rule.source === '/album-preview' && rule.destination === '/album'));
});
