const v = "1";

if('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(function (registration) {
          console.log("Service Worker registration successful: ", registration)
          // Track updates to the Service Worker.
          if (!navigator.serviceWorker.controller) {
              // The window client isn't currently controlled so it's a new service
              // worker that will activate immediately
              return;
          }
          registration.update();

          onNewServiceWorker(registration, function() {
              showRefreshUI(registration);
          });
      }, (err) => {
              console.log("Registration failed", err)
          })

      var refreshing;
      // When the user asks to refresh the UI, we'll need to reload the window
      navigator.serviceWorker.addEventListener('controllerchange', function(event) {
          if (refreshing) return; // prevent infinite refresh loop when you use "Update on Reload"
          refreshing = true;
          console.log('Controller loaded');
          window.location.reload();
      });
  })
};

self.addEventListener('install', e => e.waitUntil(
  caches.open(v).then(cache => cache.addAll([
    '/',
    '/index.html',
    '/manifest.json',
    '/images/logo.png',
    '/sw.js'
  ]))
));

self.addEventListener('fetch', e => {
  console.log('fetch', e.request);
  e.respondWith(
    caches.match(e.request).then(cachedResponse =>
      cachedResponse || fetch(e.request)
    )
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => {
    return Promise.all(keys.map(key => {
      if (key != v) return caches.delete(key);
    }));
  }));
});

self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') {
    skipWaiting();
  }
});

function showRefreshUI(registration) {
  if (!registration.waiting) {
      // Just to ensure registration.waiting is available before
      // calling postMessage()
      return;
  }

  registration.waiting.postMessage('skipWaiting');
};

function onNewServiceWorker(registration, callback) {
  if (registration.waiting) {
      // SW is waiting to activate. Can occur if multiple clients open and
      // one of the clients is refreshed.
      return callback();
  }

  function listenInstalledStateChange() {
      registration.installing.addEventListener('statechange', function(event) {
          if (event.target.state === 'installed') {
              // A new service worker is available, inform the user
              callback();
          }
      });
  };

  if (registration.installing) {
      return listenInstalledStateChange();
  }

  // We are currently controlled so a new SW may be found...
  // Add a listener in case a new SW is found,
  registration.addEventListener('updatefound', listenInstalledStateChange);
}
