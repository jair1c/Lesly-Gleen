const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = __dirname;
const BASE_URL = 'https://demo.laceandfound.com/ivory-photo-booth-wedding-website';
const ASSET_TARGET = path.join(ROOT, '_assets');

const pages = [
  { slug: '', file: 'Home.html', aliases: ['You Are Invited!.html'] },
  { slug: 'save-the-date', file: 'Save The Date.html' },
  { slug: 'details', file: 'Details.html' },
  { slug: 'our-love-story', file: 'Our Love Story.html' },
  { slug: 'photobooth', file: 'Photobooth.html' },
];

const assetFolders = [
  'Save The Date_files',
  'Details_files',
  'Our Love Story_files',
  'Photobooth_files',
  'You Are Invited!_files',
  'RSVP_files',
];

const translations = new Map([
  ['Rachel & Carter', 'Gleen & Lesly'],
  ['Rachel & Carter\n', 'Gleen & Lesly\n'],
  ['RACHEL & CARTER', 'GLEEN & LESLY'],
  ['You Are Invited!', '¡Estás invitado!'],
  ['we’re getting married!\n', '¡nos casamos!\n'],
  ['Tap to begin\n', 'Toca para empezar\n'],
  ['Photobooth', 'Fotomatón'],
  ['OPEN INVITATION\n', 'ABRIR INVITACIÓN\n'],
  ['Save The Date', 'Reserva la fecha'],
  ['Go back\n', 'Volver\n'],
  ['TAP TO PLAY\n', 'TOCA PARA OÍR\n'],
  ['T A P T O P L A Y', 'T O C A Y O Y E'],
  ['Play', 'Reproducir'],
  ['Pause', 'Pausar'],
  ['Toggle mute', 'Activar o desactivar sonido'],
  ['CLICK HERE\n', 'HAZ CLIC AQUÍ\n'],
  ['Kindly\n', 'Por favor\n'],
  ['Rsvp\n', 'Confirma\n'],
  ['Love Story\n', 'Historia\nde amor\n'],
  ['Sincerely\n', 'Con cariño\n'],
  ['CLICK HERE FOR\n', 'HAZ CLIC PARA\n'],
  ['Details\n', 'Detalles\n'],
  ['4:30PM AT\n', '3:00 PM\n'],
  ['June\n', 'Noviembre\n'],
  ['18\n', '28\n'],
  ['Solara Canyon Retreat\n', 'Club Campestre Los Cantaritos\n'],
  ['SOLARA CANYON RETREAT\n', 'CLUB CAMPESTRE LOS CANTARITOS\n'],
  ['Invited\n', 'Invitado\n'],
  ['You’re\n', 'Estás\n'],
  ['to celebrate\n', 'para celebrar\n'],
  ['our love\n', 'nuestro amor\n'],
  ['Details', 'Detalles'],
  ['Wedding Details\n', 'Detalles de la boda\n'],
  ['Date & Location\n', 'Fecha\ny lugar\n'],
  ['Date\n', 'Fecha\n'],
  ['June 18, 2027\n', '28 de noviembre de 2026\n'],
  ['JUNE 18, 2027', '28 DE NOVIEMBRE DE 2026'],
  ['Ceremony\n', 'Ceremonia\n'],
  ['Reception\n', 'Consagración y recepción\n'],
  ['5:00 PM', '3:00 PM'],
  ['6:00PM', '4:00 PM'],
  ['Canyon Rose Estate', 'Club Campestre “Los Cantaritos”'],
  ['Canyon Rose Estate\n', 'Club Campestre “Los Cantaritos”\n'],
  ['Santa Ynez, California', 'Cola del Alacrán S/N · Sullana'],
  ['Santa Ynez, California\n', 'Cola del Alacrán S/N · Sullana\n'],
  ['Arrival\n', 'Llegada\n'],
  ['Cocktails\n', 'Cócteles\n'],
  ['Portraits\n', 'Fotos\n'],
  ['Party\n', 'Fiesta\n'],
  ['Dinner\n', 'Cena\n'],
  ['Farewell\n', 'Despedida\n'],
  ['Cake\n', 'Pastel\n'],
  ['The Celebration\n', 'La\ncelebración\n'],
  ['Getting\n', 'Cómo\n'],
  ['There\n', 'llegar\n'],
  ['Parking\n', 'Estacionamiento\n'],
  ['On-site parking will be available for all guests. Upon arrival, subtle signage and attendants will guide you to the designated parking areas for a seamless and welcoming experience.\n', 'Habrá estacionamiento para todos los invitados. Al llegar, la señalización y el personal te guiarán hasta las áreas asignadas.\n'],
  ['Transportation\n', 'Transporte\n'],
  ['Ride-share services such as Uber and Lyft are available throughout the Santa Ynez Valley, though availability may be limited later in the evening.\n', 'Referencia: frente al Club Campestre “Pájaro Loco Sport”. Recomendamos coordinar el transporte con anticipación.\n'],
  ['For comfort and ease, we kindly recommend arranging transportation in advance to ensure a smooth arrival and departure.\n', 'Recomendamos coordinar el transporte con anticipación para asegurar una llegada y salida cómodas.\n'],
  ['visit website\n', 'referencia\n'],
  ['Where to Stay\n', 'Referencias\nde llegada\n'],
  ['Other Details', 'Otros detalles'],
  ['Santa Ynez Valley is home to charming wine-country inns, thoughtfully designed hotels, and serene countryside retreats.\n', 'La celebración será en el Club Campestre “Los Cantaritos”, en Sullana.\n'],
  [' Guests are welcome to book accommodations directly.\n', ' El ingreso es por la calle Cola del Alacrán S/N.\n'],
  ['We recommend staying nearby for convenient access to Canyon Rose Estate and a relaxed, scenic weekend experience.\n', 'Usa como referencia el frente del Club Campestre “Pájaro Loco Sport”.\n'],
  [' Approximately 10 minutes by car\n', ' Referencia: “Pájaro Loco Sport”\n'],
  ['The Landsby', 'Frente al Club Campestre'],
  ['Hotel Corque', 'Ingreso por Cola del Alacrán'],
  ['Solvang, California', 'Sullana, Piura'],
  ['A Gentle Note\n', 'Referencia importante\n'],
  ['Santa Ynez Valley is a popular destination, especially during the summer season. We recommend reserving accommodations early to ensure availability.\n', 'Te recomendamos guardar la dirección y coordinar tu traslado con anticipación para llegar sin contratiempos.\n'],
  ['We can’t wait to celebrate with you in wine country.\n', 'Los esperamos para celebrar juntos este día tan especial.\n'],
  ['Other\n', 'Otros\n'],
  ['Attire\n', 'Vestimenta\n'],
  ['An evening inspired by timeless Ralph Lauren elegance.\n', 'Una noche inspirada en la elegancia atemporal de Ralph Lauren.\n'],
  ['Guests are invited to dress in classic silhouettes and rich, understated tones, polished yet effortless, refined enough to celebrate, comfortable enough to linger.\n', 'Sugerimos siluetas clásicas y tonos sobrios: elegantes para celebrar y cómodos para disfrutar toda la noche.\n'],
  ['Children\n', 'Niños\n'],
  ['To allow everyone to relax and fully enjoy the evening, our celebration will be adults-only.\n', 'Para disfrutar plenamente de la noche, nuestra celebración será solo para adultos.\n'],
  [' Thank you for understanding and for joining us for an unhurried night beneath the stars.\n', ' Gracias por comprender y acompañarnos en una noche tranquila bajo las estrellas.\n'],
  ['Gifts\n', 'Regalos\n'],
  ['Your presence is what matters most to us. For those who wish to share a gift, a wishing well will be available during the celebration.\n', 'Su presencia es nuestro mejor regalo. Si desean obsequiarnos algo, habrá un cofre de buenos deseos durante la celebración.\n'],
  ['Our Love Story', 'Nuestra historia de amor'],
  ['Our Love Story\n', 'Nuestra historia de amor\n'],
  ['From Hello to I Do\n', 'Del\nhola al sí,\nacepto\n'],
  ['What began as a simple moment\n', 'Todo comenzó en un instante\n'],
  ['soon became something neither of us expected.\n', 'y se volvió algo inesperado.\n'],
  ['We met during a season of life that felt busy and uncertain, yet somehow everything slowed the moment our paths crossed. Conversations stretched longer than planned, laughter came easily, and what felt ordinary at first quietly grew into something lasting.\n', 'Nos conocimos en una etapa incierta, pero todo se detuvo cuando nuestros caminos se cruzaron. Las conversaciones se alargaban, la risa surgía con facilidad y lo cotidiano se transformó en algo duradero.\n'],
  ['Over time, our story unfolded through shared weekends, long drives, and the kind of moments that don’t ask to be documented — they simply stay with you. We learned to grow together, to choose one another, and to build a life rooted in trust, warmth, and joy.\n', 'Nuestra historia creció entre fines de semana, largos viajes y momentos que permanecen. Aprendimos a crecer juntos, a elegirnos y a construir una vida con confianza, calidez y alegría.\n'],
  ['When the question was finally asked, the answer had already been written.\n', 'Cuando finalmente llegó la pregunta, la respuesta ya estaba escrita.\n'],
  ['Now, we look forward to celebrating this next chapter surrounded by the people we love most, grateful for every step that led us here, and excited for all that lies ahead.\n', 'Hoy celebramos este nuevo capítulo rodeados de quienes más amamos, agradecidos por el camino recorrido y emocionados por todo lo que vendrá.\n'],
  ['RSVP', 'Confirmación'],
  ['We’d love for you to be part of our celebration!\n', '¡Nos encantaría\ncelebrar contigo!\n'],
  ['sep 09, 2027\n', '28 nov, 2026\n'],
  ['RSVP kindly requested by\n', 'Confirmar asistencia antes del\n'],
  ['March 18, 2027\n', '22 de octubre de 2026\n'],
  ['If you have any questions about the day or your RSVP,\n', 'Si tienes alguna pregunta sobre el día o tu confirmación,\n'],
  ['please feel free to reach out to Elizabeth & George at (646) 000-0000.\n', 'no dudes en comunicarte directamente con Gleen y Lesly.\n'],
]);

function compactRsvpModel(html) {
  const marker = "window['bootstrap'] = JSON.parse(";
  const start = html.indexOf(marker);
  if (start < 0) return html;
  const valueStart = start + marker.length;
  const valueEnd = html.indexOf("); window['flags']", valueStart);
  if (valueEnd < 0) return html;
  const bootstrap = JSON.parse(vm.runInNewContext(html.slice(valueStart, valueEnd)));
  const page = bootstrap?.page?.A?.A?.[5];
  const section = page?.t?.[0];
  const elements = section?.E;
  if (!Array.isArray(elements)) return html;
  const frame = elements.find((item) => typeof item?.a === 'string' && item.a.includes('_website-element-widget'));
  if (!frame || typeof frame.C !== 'number') return html;
  const originalHeight = frame.C;
  const targetHeight = 570;
  const shift = originalHeight - targetHeight;
  if (shift <= 0) return html;
  frame.C = targetHeight;
  frame.c = targetHeight;
  elements.forEach((item) => {
    if (item !== frame && typeof item?.A === 'number' && item.A > frame.A) item.A -= shift;
  });
  if (section.C && typeof section.C.B === 'number') section.C.B -= shift;
  const updateEmbeds = (value) => {
    if (!value || typeof value !== 'object') return;
    if (typeof value.A === 'string' && value.A.includes('_website-element-widget')) {
      if (typeof value.G === 'number') value.G = targetHeight;
      if (typeof value.E === 'string') {
        value.E = value.E
          .replace(/height=\\?"1792\\?"/g, 'height=\\"570\\"')
          .replace(/height=\\?"1791(?:\.\d+)?\\?"/g, 'height=\\"570\\"');
      }
    }
    Object.values(value).forEach(updateEmbeds);
  };
  updateEmbeds(bootstrap);
  const serialized = JSON.stringify(JSON.stringify(bootstrap));
  return html.slice(0, valueStart) + serialized + html.slice(valueEnd);
}

function localizeHtml(html) {
  html = compactRsvpModel(html);
  html = html.replace(/wss:\/\/www\.canva\.com\/_stream/g, '');
  const runtimeTranslations = Object.fromEntries(
    [...translations].map(([source, target]) => [
      source.trim().replace(/\s+/g, ' '),
      target.trim(),
    ]),
  );
  const runtimeScript = `<script id="demo3-spanish-translation">
(function () {
  var translations = ${JSON.stringify(runtimeTranslations)};
  var compactTranslations = {};
  Object.keys(translations).forEach(function (key) {
    compactTranslations[key.replace(/\\s+/g, '')] = translations[key];
  });
  var replacementPairs = Object.keys(translations)
    .sort(function (left, right) { return right.length - left.length; })
    .map(function (key) { return [key, translations[key].replace(/\\n/g, ' ')]; });
  var titleTranslations = ${JSON.stringify(Object.fromEntries(translations))};
  var queued = false;
  var observedRoots = [];
  var observer;
  var protectedTextNodes = new WeakSet();

  function normalize(value) {
    return String(value || '').trim().replace(/\\s+/g, ' ');
  }

  function lookup(value) {
    var normalized = normalize(value);
    return translations[normalized] || compactTranslations[normalized.replace(/\\s+/g, '')];
  }

  function getTextBounds(element) {
    if (!element) return null;
    var walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    var rects = [];
    var node;
    while ((node = walker.nextNode())) {
      if (!normalize(node.nodeValue)) continue;
      var range = document.createRange();
      range.selectNodeContents(node);
      Array.prototype.forEach.call(range.getClientRects(), function (rect) {
        if (rect.width > 0 && rect.height > 0) rects.push(rect);
      });
    }
    if (!rects.length) return null;
    var left = Math.min.apply(Math, rects.map(function (rect) { return rect.left; }));
    var right = Math.max.apply(Math, rects.map(function (rect) { return rect.right; }));
    return { left: left, right: right, width: right - left };
  }

  function fitToOriginalWidth(element, originalBounds) {
    if (!originalBounds || !originalBounds.width || element.dataset.demo3Fitted === 'true') return;
    var translatedBounds = getTextBounds(element);
    if (!translatedBounds || translatedBounds.width <= originalBounds.width + 0.5) return;
    var ratio = Math.max(0.62, Math.min(1, originalBounds.width / translatedBounds.width));
    element.style.transformOrigin = 'center center';
    element.style.scale = ratio.toFixed(4) + ' 1';
    element.dataset.demo3Fitted = 'true';
  }

  function setElementText(element, translated) {
    var originalBounds = getTextBounds(element);
    var walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    var nodes = [];
    var node;
    while ((node = walker.nextNode())) {
      var tag = node.parentElement && node.parentElement.tagName;
      if (tag !== 'SCRIPT' && tag !== 'STYLE' && tag !== 'NOSCRIPT' && normalize(node.nodeValue)) nodes.push(node);
    }
    if (!nodes.length) return;
    var explicitLines = translated.split('\\n');
    if (explicitLines.length > 1) {
      var firstNode = nodes[0];
      var lineParent = firstNode.parentNode;
      firstNode.nodeValue = explicitLines[0];
      var insertionPoint = firstNode.nextSibling;
      explicitLines.slice(1).forEach(function (line) {
        var breakElement = document.createElement('br');
        lineParent.insertBefore(breakElement, insertionPoint);
        lineParent.insertBefore(document.createTextNode(line), insertionPoint);
      });
      nodes.slice(1).forEach(function (textNode) { textNode.nodeValue = ''; });
      protectedTextNodes.add(firstNode);
      fitToOriginalWidth(element, originalBounds);
      return;
    }
    if (nodes.length === 1) {
      nodes[0].nodeValue = translated.replace(/\\n/g, ' ');
      protectedTextNodes.add(nodes[0]);
      fitToOriginalWidth(element, originalBounds);
      return;
    }
    var pieces = [];
    var words = translated.replace(/\\n/g, ' ').trim().split(/\\s+/);
    var originalLengths = nodes.map(function (item) { return normalize(item.nodeValue).length || 1; });
    var totalOriginal = originalLengths.reduce(function (sum, value) { return sum + value; }, 0);
    var cursor = 0;
    originalLengths.forEach(function (length, index) {
      if (index === originalLengths.length - 1) {
        pieces.push(words.slice(cursor).join(' '));
        return;
      }
      var desired = Math.max(1, Math.round(words.join(' ').length * length / totalOriginal));
      var selected = [];
      var selectedLength = 0;
      while (cursor < words.length - (originalLengths.length - index - 1)) {
        var word = words[cursor];
        if (selected.length && selectedLength + 1 + word.length > desired) break;
        selected.push(word);
        selectedLength += (selected.length > 1 ? 1 : 0) + word.length;
        cursor += 1;
      }
      if (!selected.length && cursor < words.length) selected.push(words[cursor++]);
      pieces.push(selected.join(' '));
    });
    nodes.forEach(function (textNode, index) {
      var original = textNode.nodeValue;
      var leading = original.match(/^\\s*/)[0];
      var trailing = original.match(/\\s*$/)[0];
      if (!trailing && index < nodes.length - 1 && pieces[index]) trailing = ' ';
      textNode.nodeValue = leading + (pieces[index] || '') + trailing;
      protectedTextNodes.add(textNode);
    });
    fitToOriginalWidth(element, originalBounds);
  }

  function translateTextNodes(root) {
    if (!root) return;
    var elements = Array.prototype.slice.call(
      root.querySelectorAll('a, span, p, h1, h2, h3, h4, h5, h6, button, div')
    );
    elements.sort(function (left, right) {
      function depth(element) {
        var value = 0;
        while (element && element !== root) {
          value += 1;
          element = element.parentElement;
        }
        return value;
      }
      return depth(left) - depth(right);
    });
    elements.forEach(function (element) {
      var translated = lookup(element.innerText) || lookup(element.textContent);
      if (!translated) return;
      setElementText(element, translated);
    });
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var nodes = [];
    var node;
    while ((node = walker.nextNode())) nodes.push(node);
    nodes.forEach(function (textNode) {
      if (protectedTextNodes.has(textNode)) return;
      var parentTag = textNode.parentElement && textNode.parentElement.tagName;
      if (parentTag === 'SCRIPT' || parentTag === 'STYLE' || parentTag === 'NOSCRIPT') return;
      var key = normalize(textNode.nodeValue);
      var translated = lookup(key);
      var original = textNode.nodeValue;
      if (!translated) {
        if (key.length < 30) return;
        var originalBounds = getTextBounds(textNode.parentElement);
        var replaced = original;
        replacementPairs.forEach(function (pair) {
          if (replaced.indexOf(pair[0]) !== -1) replaced = replaced.split(pair[0]).join(pair[1]);
        });
        if (replaced !== original) {
          textNode.nodeValue = replaced;
          fitToOriginalWidth(textNode.parentElement, originalBounds);
        }
        return;
      }
      var leading = original.match(/^\\s*/)[0];
      var trailing = original.match(/\\s*$/)[0];
      textNode.nodeValue = leading + translated + trailing;
    });
    document.querySelectorAll('[aria-label], [title]').forEach(function (element) {
      ['aria-label', 'title'].forEach(function (attribute) {
        var current = element.getAttribute(attribute);
        var translated = lookup(current);
        if (translated) element.setAttribute(attribute, translated);
      });
    });
    var translatedTitle = titleTranslations[document.title];
    if (translatedTitle) document.title = translatedTitle;
  }

  function translateTree(root) {
    translateTextNodes(root);
    root.querySelectorAll('*').forEach(function (element) {
      if (!element.shadowRoot) return;
      if (!observedRoots.includes(element.shadowRoot)) {
        observedRoots.push(element.shadowRoot);
        observer.observe(element.shadowRoot, {
          childList: true,
          characterData: true,
          subtree: true
        });
      }
      translateTree(element.shadowRoot);
    });
  }

  function apply() {
    queued = false;
    translateTree(document.body);
  }

  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(apply);
  }

  function start() {
    observer = new MutationObserver(schedule);
    observedRoots.push(document.body);
    observer.observe(document.body, {
      childList: true,
      characterData: true,
      subtree: true
    });
    apply();
    [100, 350, 800, 1600, 3000].forEach(function (delay) {
      setTimeout(apply, delay);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
</script>`;
  const title = html.match(/<title>(.*?)<\/title>/)?.[1];
  const translatedTitle = translations.get(title) ?? title;
  const enhancements = '<link rel="stylesheet" href="_assets/css/demo3-enhancements.css">' +
    '<script defer src="_assets/js/demo3-enhancements.js"></script>';
  return html
    .replace(/<html([^>]*?)lang="[^"]+"/, '<html$1lang="es"')
    .replace(/<title>.*?<\/title>/, `<title>${translatedTitle}</title>`)
    .replace(/<meta property="og:image" content="[^"]+" \/>/, '<meta property="og:image" content="_assets/images/697d29e752fd513b81539281315a9910.jpg" />')
    .replace('</head>', `${enhancements}</head>`)
    .replace('</body>', `${runtimeScript}</body>`);
}

function backup(file) {
  const source = path.join(ROOT, file);
  const target = path.join(ROOT, `${file}.before-reference`);
  if (fs.existsSync(source) && !fs.existsSync(target)) {
    fs.copyFileSync(source, target);
  }
}

async function downloadRuntimeAssets() {
  const chunkMap = JSON.parse(fs.readFileSync(path.join(ROOT, 'webpack_chunks.json'), 'utf8'));
  const pending = [...new Set([
    '070b85cbbc656977.ltr.css',
    'static_font_4.ltr.css',
    '365b7323fd54402e.runtime.js',
    'e6d9690df7022fb8.s4le6a.vendor.js',
    'e2de450d177cab3c.vendor.js',
    '04e09d3bb8904474.strings.js',
    'a33182bfbf725b8c.en-GB.js',
    '5a0161e06ae42686.js',
    ...Object.keys(chunkMap),
    '72762cf3cb9db8e7.strings.js',
    '71001ca68bea3728.strings.js',
    'fd2db5bced526286.strings.js',
  ])];
  let downloaded = 0;

  for (let index = 0; index < pending.length; index += 12) {
    const batch = pending.slice(index, index + 12);
    await Promise.all(batch.map(async (file) => {
      const response = await fetch(`${BASE_URL}/_assets/${file}`);
      if (!response.ok) return;
      const bytes = Buffer.from(await response.arrayBuffer());
      fs.writeFileSync(path.join(ASSET_TARGET, file), bytes);
      downloaded += 1;
    }));
  }

  return downloaded;
}

async function main() {
  for (const folder of assetFolders) {
    const sourceFolder = path.join(ROOT, folder);
    if (!fs.existsSync(sourceFolder)) continue;
    const files = fs.readdirSync(sourceFolder, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name);
    for (const file of files) {
      fs.copyFileSync(path.join(sourceFolder, file), path.join(ASSET_TARGET, file));
    }
  }

  for (const page of pages) {
    const url = page.slug ? `${BASE_URL}/${page.slug}` : BASE_URL;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`${url} respondió ${response.status}`);
    }

    const html = localizeHtml(await response.text());
    backup(page.file);
    fs.writeFileSync(path.join(ROOT, page.file), html, 'utf8');
    for (const alias of page.aliases || []) {
      backup(alias);
      fs.writeFileSync(path.join(ROOT, alias), html, 'utf8');
    }
  }

  const staticAliases = {
    'Home.html': 'index.html',
    'Save The Date.html': 'save-the-date.html',
    'Details.html': 'details.html',
    'Our Love Story.html': 'our-love-story.html',
    'Photobooth.html': 'photobooth.html',
  };
  Object.entries(staticAliases).forEach(([source, target]) => {
    fs.copyFileSync(path.join(ROOT, source), path.join(ROOT, target));
  });
  fs.copyFileSync(
    path.join(ROOT, '_website-element-widget.html'),
    path.join(ASSET_TARGET, '_website-element-widget.html'),
  );

  const downloaded = await downloadRuntimeAssets();

  console.log(`Las pantallas de demo3 quedaron sincronizadas con la referencia (${downloaded} recursos dinámicos añadidos).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
