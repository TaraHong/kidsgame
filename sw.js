// 꼬마 슈팅 놀이터 offline cache. Bump VERSION whenever you change the game files.
const VERSION = 'kidsgame-v2';
const FILES = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-512-maskable.png', './icons/apple-touch-icon.png'];
const FONT_CSS = 'https://fonts.googleapis.com/css2?family=Jua&display=swap';
const isFont = u => u.startsWith('https://fonts.googleapis.com/') || u.startsWith('https://fonts.gstatic.com/');

// Best effort: store the Jua web font so the game keeps its look offline. Never blocks install.
async function cacheFont() {
  try {
    const c = await caches.open(VERSION);
    const res = await fetch(FONT_CSS);
    if (!res.ok) return;
    const css = await res.clone().text();
    await c.put(FONT_CSS, res);
    const urls = [...new Set((css.match(/url\((https:[^)]+)\)/g) || []).map(m => m.slice(4, -1)))];
    await Promise.allSettled(urls.map(u => fetch(u).then(r => r.ok && c.put(u, r))));
  } catch (e) {}
}
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => { cacheFont(); return self.skipWaiting(); }));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = e.request.url, same = new URL(url).origin === location.origin;
  if (!same && !isFont(url)) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: same }).then(hit => hit || fetch(e.request).then(res => {
      if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); }
      return res;
    }).catch(() => same ? caches.match('./index.html') : new Response('', { status: 504 })))
  );
});
