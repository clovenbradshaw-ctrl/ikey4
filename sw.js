const CACHE_NAME = 'ikey-cache-v2';
const ASSETS = [
  '/',
  'index.html',
  'card.html',
  'home.html',
  'manifest.json',
  'scripts/qrcode.min.js',
  'scripts/lz-string.min.js',
  'scripts/resources.js',
  'scripts/translate.js',
  'scripts/app.js'
];
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
});
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(resp => resp || fetch(event.request))
  );
});
