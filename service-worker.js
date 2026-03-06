// ═══════════════════════════════════════════════════
//  Student Toolkit — Service Worker
//  Enables offline use + "install as app" on Android
// ═══════════════════════════════════════════════════

const CACHE_NAME   = 'studenttoolkit-v1';
const OFFLINE_PAGE = '/offline.html';

// Files to cache immediately on install
const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo-light.png',
  '/logo-dark.png',
  '/logo-icon.png',
  '/tools/attendance.html',
  '/tools/cgpa.html',
  '/tools/ai-resume-checker.html',
  '/tools/letter-writer.html',
  '/offline.html'
];

// ── INSTALL: cache all core files ─────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Pre-caching core files');
      return cache.addAll(PRECACHE);
    }).then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: delete old caches ───────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH: serve from cache, fall back to network ─
self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Skip cross-origin requests (fonts, CDN icons etc.)
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;  // serve from cache

      // Fetch from network and cache the response
      return fetch(event.request)
        .then(response => {
          // Only cache valid responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Offline fallback for HTML pages
          if (event.request.headers.get('Accept').includes('text/html')) {
            return caches.match(OFFLINE_PAGE);
          }
        });
    })
  );
});
