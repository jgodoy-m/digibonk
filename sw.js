// DigiBonk como app: service worker mínimo para que el juego se instale y cargue sin conexión.
// - Página y textos (index.html, sitio.json, i18n): primero la red, para que cada versión nueva llegue al momento;
//   sin conexión se usa la última copia guardada.
// - Resto de archivos del propio sitio (sprites, modelos, sonidos, Three.js): se sirven de la copia guardada y se
//   actualizan por detrás. Se guardan a medida que el juego los pide, así que lo que ya se ha jugado funciona offline.
// - Nada de otros dominios (nube, ranking, Ko-fi): pasa directo a la red y nunca se guarda.
// - Al cambiar VERSION se borran las copias viejas.
const VERSION = 'digibonk-v2';
const CORE = [
  './', 'index.html', 'manifest.webmanifest', 'sitio.json',
  'i18n/i18n.js', 'fonts/fonts.css', 'vendor/three.module.min.js',
  'ui/icono_192.png', 'ui/icono_512.png', 'ui/icono_180.png', 'ui/icono_32.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => Promise.all(CORE.map(u => c.add(new Request(u, {cache: 'reload'})).catch(() => {})))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

const FRESH = /(\/|\.html|sitio\.json|manifest\.webmanifest|\/i18n\/[^/]+\.js)$/;

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.headers.has('range')) return;            // vídeos de la guía: el navegador pide trozos, mejor directo
  const fresh = req.mode === 'navigate' || FRESH.test(url.pathname);
  e.respondWith(fresh ? networkFirst(req) : cacheFirst(req, e));
});

async function networkFirst(req){
  const cache = await caches.open(VERSION);
  try {
    const res = await fetch(req, {cache: 'no-cache'});
    if (res.ok) cache.put(req.mode === 'navigate' ? 'index.html' : req, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(req.mode === 'navigate' ? 'index.html' : req, {ignoreSearch: true});
    if (hit) return hit;
    throw err;
  }
}

async function cacheFirst(req, e){
  const cache = await caches.open(VERSION);
  const hit = await cache.match(req);
  const update = fetch(req).then(res => { if (res.ok && res.type === 'basic') cache.put(req, res.clone()); return res; });
  if (hit){ e.waitUntil(update.catch(() => {})); return hit; }
  return update;
}
