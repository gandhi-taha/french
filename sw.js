// Offline support for Manuel de français. Progress lives in this browser's localStorage, never here.
const VERSION = 'theme-20261109';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
const AUDIO = ["audio/common.58518ad078.mp3","audio/exams.50f19b6319.mp3","audio/phrases.d7dcca1acf.mp3","audio/numbers.698f384433.mp3","audio/pairs.4c4b9c8998.mp3","audio/u0.d77c8b3287.mp3","audio/u1.43fea4f3c8.mp3","audio/u2.a10e8369e0.mp3","audio/u3.dad2aa29ba.mp3","audio/u4.3f8a8ed467.mp3","audio/u5.021371792e.mp3","audio/u6.a7992c0b04.mp3"];
const SHELL_CACHE = 'shell-' + VERSION, AUDIO_CACHE = 'audio', FONT_CACHE = 'fonts';
self.addEventListener('install', e => { e.waitUntil(caches.open(SHELL_CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (![SHELL_CACHE, AUDIO_CACHE, FONT_CACHE].includes(k)) await caches.delete(k);
    const ac = await caches.open(AUDIO_CACHE);
    for (const r of await ac.keys()) if (!AUDIO.some(a => r.url.endsWith(a))) await ac.delete(r); // old recordings
    await self.clients.claim();
  })());
  // all recordings, in the background, so every lesson also works offline (best effort; anything missed is cached when played)
  caches.open(AUDIO_CACHE).then(c => Promise.all(AUDIO.map(a => c.match(a).then(m => m || c.add(a).catch(() => {})))));
});
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.origin === location.origin && u.pathname.includes('/audio/')) {
    e.respondWith(caches.open(AUDIO_CACHE).then(c => c.match(req, { ignoreSearch: true }).then(m => m || fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; }))));
    return;
  }
  if (u.origin === location.origin) {
    e.respondWith(fetch(req).then(r => { if (r.ok) { const copy = r.clone(); caches.open(SHELL_CACHE).then(c => c.put(req, copy)); } return r; })
      .catch(() => caches.match(req, { ignoreSearch: true }).then(m => m || caches.match('index.html'))));
    return;
  }
  if (/^fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)) {
    e.respondWith(caches.open(FONT_CACHE).then(c => c.match(req).then(m => { const net = fetch(req).then(r => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }).catch(() => m); return m || net; })));
  }
  // everything else (podcast streams, YouTube) goes straight to the network
});
