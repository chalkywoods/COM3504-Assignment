var CACHE_NAME = 'canvas-cache-v1';
var urlsToCache = [
  '/',
  '/javascripts/canvas.js',
  '/javascripts/index.js',
  '/stylesheets/style.css'
];

// installation of service worker
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) {
        console.log('[ServiceWorker] Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// activation of service worker, removing old cache
self.addEventListener('activate', function (e) {
  console.log('[ServiceWorker] Activate');
  e.waitUntil(
    caches.keys().then(function (keyList) {
      return Promise.all(keyList.map(function (key) {
        if (key !== CACHE_NAME) {
          console.log('[ServiceWorker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', function (event) {
  var requestURL = new URL(event.request.url)

  // Handle POST requests
  if (event.request.method == 'POST') {
    return;
  }

  // Handle GET requests
  event.respondWith(
    caches.match(event.request)
      .then(function (response) {
        // cache hit - return response
        if (response) {
          return response;
        }

        // fallback to network
        return fetch(event.request).then(
          function (response) {
            // check if the reposnse is valid
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // clone the response
            var responseToCache = response.clone();

            // store the response
            caches.open(CACHE_NAME)
              .then(function (cache) {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
  );
});