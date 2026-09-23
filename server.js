const http = require('http');
const fs = require('fs');
const path = require('path');
const PORT = Number(process.env.PORT || 3000);
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.m4a': 'audio/mp4',
  '.mp3': 'audio/mpeg',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.json': 'application/json; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8'
};

const demoDir = __dirname;

// Carga variables locales sin incorporar secretos al repositorio.
const localEnvPath = path.join(demoDir, '.env.local');
if (fs.existsSync(localEnvPath)) {
  fs.readFileSync(localEnvPath, 'utf8').split(/\r?\n/).forEach(line => {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].trim();
  });
}

const server = http.createServer((req, res) => {
  let decoded = decodeURI(req.url.split('?')[0]);

  if (decoded === '/api/admin' || decoded === '/api/invitation') {
    const handler = require(decoded === '/api/admin' ? './api/admin' : './api/invitation');
    Promise.resolve(handler(req, res)).catch(error => {
      console.error('API local:', error);
      if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      if (!res.writableEnded) res.end(JSON.stringify({ error: 'Error interno.' }));
    });
    return;
  }

  // Endpoint API para recibir y guardar confirmaciones RSVP
  if (decoded === '/api/rsvp' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        data.fechaRegistro = new Date().toISOString();

        // 1. Guardar en confirmaciones_rsvp.json
        const jsonPath = path.join(demoDir, 'confirmaciones_rsvp.json');
        let records = [];
        if (fs.existsSync(jsonPath)) {
          try { records = JSON.parse(fs.readFileSync(jsonPath, 'utf8')); } catch(e){}
        }
        records.push(data);
        fs.writeFileSync(jsonPath, JSON.stringify(records, null, 2), 'utf8');

        // 2. Guardar en confirmaciones_rsvp.csv (para abrir directamente en Microsoft Excel)
        const csvPath = path.join(demoDir, 'confirmaciones_rsvp.csv');
        const csvHeader = 'Fecha,Nombre,Asistencia,Acompañantes,Mensaje\n';
        if (!fs.existsSync(csvPath)) {
          fs.writeFileSync(csvPath, '\uFEFF' + csvHeader, 'utf8');
        }
        const row = [
          `"${new Date().toLocaleString()}"`,
          `"${(data.nombre || '').replace(/"/g, '""')}"`,
          `"${(data.asistencia || '').replace(/"/g, '""')}"`,
          `"${(data.acompanantes || '').replace(/"/g, '""')}"`,
          `"${(data.mensaje || '').replace(/"/g, '""')}"`
        ].join(',') + '\n';
        fs.appendFileSync(csvPath, row, 'utf8');

        console.log(`\n===========================================`);
        console.log(`>>> [NUEVA CONFIRMACIÓN RSVP RECIBIDA]`);
        console.log(`    Nombre:       ${data.nombre}`);
        console.log(`    ¿Asistirá?:   ${data.asistencia}`);
        console.log(`    Acompañantes: ${data.acompanantes}`);
        if (data.mensaje) {
          console.log(`    Mensaje:      "${data.mensaje}"`);
        }
        console.log(`===========================================\n`);

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: true, message: 'Confirmación guardada con éxito' }));
      } catch (err) {
        console.error('Error guardando confirmación RSVP:', err);
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  if (decoded === '/' || decoded === '') {
    res.writeHead(302, { 'Location': '/ivory-photo-booth-wedding-website/' });
    res.end();
    return;
  }

  // Si tiene barra al final de un archivo .html (ej. /Home.html/), redirigir
  if (decoded.match(/\.html\/+$/i)) {
    res.writeHead(301, { 'Location': decoded.replace(/\/+$/, '') });
    res.end();
    return;
  }

  // Si el navegador pide /Home.html/_assets/... o /Details.html/Details_files/..., corregir la ruta
  decoded = decoded.replace(/^\/[^/]+\.html\//i, '/');
  decoded = decoded.replace(/^\/ivory-photo-booth-wedding-website\/_assets\//i, '/_assets/');

  // Si la petición es para el widget de reservación (RSVP)
  if (decoded.includes('_website-element-widget')) {
    decoded = '/_website-element-widget.html';
  }

  const canonicalBase = '/ivory-photo-booth-wedding-website';
  const canonicalPages = {
    '/admin': '/admin.html',
    [`${canonicalBase}/`]: '/Home.html',
    [canonicalBase]: '/Home.html',
    [`${canonicalBase}/save-the-date`]: '/Save The Date.html',
    [`${canonicalBase}/details`]: '/Details.html',
    [`${canonicalBase}/our-love-story`]: '/Our Love Story.html',
    [`${canonicalBase}/photobooth`]: '/Photobooth.html',
    [`${canonicalBase}/page-5`]: '/index.html',
  };
  const legacyRedirects = {
    '/Home.html': `${canonicalBase}/`,
    '/You Are Invited!.html': `${canonicalBase}/#page-1`,
    '/Save The Date.html': `${canonicalBase}/save-the-date`,
    '/Details.html': `${canonicalBase}/details`,
    '/Our Love Story.html': `${canonicalBase}/our-love-story`,
    '/Photobooth.html': `${canonicalBase}/photobooth`,
    '/RSVP.html': `${canonicalBase}/#page-5`,
    '/save-the-date': `${canonicalBase}/save-the-date`,
    '/details': `${canonicalBase}/details`,
    '/story': `${canonicalBase}/our-love-story`,
    '/our-love-story': `${canonicalBase}/our-love-story`,
    '/photobooth': `${canonicalBase}/photobooth`,
    '/RSVP': `${canonicalBase}/page-5`,
    '/rsvp': `${canonicalBase}/#page-5`,
  };
  if (legacyRedirects[decoded]) {
    res.writeHead(302, { 'Location': legacyRedirects[decoded] });
    res.end();
    return;
  }
  if (canonicalPages[decoded]) decoded = canonicalPages[decoded];

  // Alias para carpetas con nombres en español
  if (decoded.startsWith('/Nuestra Historia de Amor_files/')) {
    decoded = decoded.replace('/Nuestra Historia de Amor_files/', '/Our Love Story_files/');
  }

  let filePath = path.join(demoDir, decoded);
  if (!fs.existsSync(filePath)) {
    // Intentar buscar en RSVP_files o carpetas alternativas
    const altPathRSVP = path.join(demoDir, 'RSVP_files', path.basename(decoded));
    if (fs.existsSync(altPathRSVP)) {
      filePath = altPathRSVP;
    }
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const stat = fs.statSync(filePath);
    const total = stat.size;

    // Soporte para HTTP 206 Partial Content (streaming de video MP4 y audio M4A)
    if ((ext === '.mp4' || ext === '.m4a') && req.headers.range) {
      const range = req.headers.range;
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : total - 1;
      const chunksize = (end - start) + 1;

      const file = fs.createReadStream(filePath, { start, end });
      file.on('error', (err) => { console.warn('Stream file error:', err.message); });
      res.on('error', (err) => { file.destroy(); });
      
      res.writeHead(206, {
        'Content-Range': 'bytes ' + start + '-' + end + '/' + total,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': mimeTypes[ext] || 'video/mp4'
      });
      file.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': total,
        'Content-Type': mimeTypes[ext] || 'application/octet-stream'
      });
      const file = fs.createReadStream(filePath);
      file.on('error', (err) => { console.warn('File read error:', err.message); });
      res.on('error', (err) => { file.destroy(); });
      file.pipe(res);
    }
  } else {
    const ext = path.extname(decoded).toLowerCase();
    if (ext === '.css' || decoded.endsWith('.ltr.css')) {
      res.writeHead(200, { 'Content-Type': 'text/css; charset=utf-8' });
      res.end('/* offline chunk placeholder */');
      return;
    }
    if (ext === '.js') {
      const base = path.basename(decoded);
      let chunkMap = {};
      try { chunkMap = JSON.parse(fs.readFileSync(path.join(demoDir, 'webpack_chunks.json'), 'utf8')); } catch(e){}
      const chunkId = chunkMap[base];
      res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' });
      if (chunkId !== undefined) {
        res.end(`(globalThis.webpackChunk_canva_web=globalThis.webpackChunk_canva_web||[]).push([[${chunkId}],{}]);`);
      } else {
        res.end('/* offline js chunk placeholder */');
      }
      return;
    }
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 No encontrado: ' + req.url);
  }
});

process.on('uncaughtException', (err) => {
  console.warn('Protección activa (uncaughtException):', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.warn('Protección activa (unhandledRejection):', reason);
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}/ivory-photo-booth-wedding-website/`;
  console.log(`\n======================================================`);
  console.log(`  Web de Bodas (demo3) lista y funcionando offline`);
  console.log(`  URL: ${url}`);
  console.log(`  Streaming MP4 (HTTP 206) activo`);
  console.log(`  RSVP configurado para abrir WhatsApp`);
  console.log(`  Presiona Ctrl + C para detener.`);
  console.log(`======================================================\n`);
});
