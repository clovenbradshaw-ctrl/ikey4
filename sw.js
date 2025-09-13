const CACHE_NAME = 'ikey-cache-v1';
const ASSETS = [
  '/',
  'index.html',
  'card.html',
  'home.html',
  'scripts/qrcode.min.js',
  'scripts/lz-string.min.js',
  'scripts/html2canvas.min.js',
  'scripts/translate.js'
];
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(resp => resp || fetch(event.request))
  );
});
