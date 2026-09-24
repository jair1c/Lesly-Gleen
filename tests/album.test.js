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
  assert.match(enhancements, /album\?from=invitation/);
  assert.match(enhancements, /photobooth\|album\|page-5/);
});

test('direct album visits hide invitation return controls', () => {
  const html = fs.readFileSync(path.join(root, 'album.html'), 'utf8');
  const css = fs.readFileSync(path.join(root, '_assets/css/album.css'), 'utf8');
  assert.match(html, /dataset\.albumEntry/);
  assert.match(html, /params\.get\('from'\) === 'invitation'/);
  assert.match(css, /data-album-entry="direct"/);
});

test('every Canva entry page cache-busts the shared enhancement script', () => {
  const pages = [
    'Home.html',
    'index.html',
    'Save The Date.html',
    'save-the-date.html',
    'Details.html',
    'Photobooth.html',
    'Our Love Story.html',
    'our-love-story.html',
    'You Are Invited!.html'
  ];
  for (const page of pages) {
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    assert.match(html, /demo3-enhancements\.js\?v=20260924e/, page);
  }
});

test('browser icons use the branded GL monogram at their declared sizes', () => {
  const icons = [
    ['0e0be3f439c80cb354719e8ea9791e11.png', 32],
    ['3705a34a97665b009ca3a3077ab2a561.png', 192],
    ['8196c648de2744b24fed5142c7d616f6.png', 180]
  ];
  for (const [file, size] of icons) {
    const png = fs.readFileSync(path.join(root, '_assets/images', file));
    assert.equal(png.toString('ascii', 1, 4), 'PNG', file);
    assert.equal(png.readUInt32BE(16), size, `${file} width`);
    assert.equal(png.readUInt32BE(20), size, `${file} height`);
  }
});

test('local and Vercel routes expose the clean album URL', () => {
  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
  const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
  assert.match(server, /'\/album': '\/album\.html'/);
  assert.equal(vercel.cleanUrls, true);
  assert.ok(vercel.redirects.some((rule) => rule.source === '/album-preview' && rule.destination === '/album'));
});
