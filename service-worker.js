// ═══════════════════════════════════════════════════
//  Student Toolkit — Service Worker v3
//  Strategy: Network-first for HTML, cache-first for assets
//  Auto-update: forces reload when new version detected
// ═══════════════════════════════════════════════════

const CACHE_VERSION = 'studenttoolkit-v3';
const OFFLINE_PAGE  = '/offline.html';

// Core files to pre-cache on install
const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
  '/logo-light.png',
  '/logo-dark.png',
  '/logo-icon.png',
  '/tools/attendance.html',
  '/tools/cgpa.html',
  '/tools/ai-resume-checker.html',
  '/tools/letter-writer.html',
  '/tools/career-path-finder.html',
];

// HTML pages — always network-first (never serve stale HTML)
const HTML_PAGES = [
  '/',
  '/index.html',
  '/tools/attendance.html',
  '/tools/cgpa.html',
  '/tools/ai-resume-checker.html',
  '/tools/letter-writer.html',
  '/tools/career-path-finder.html',
  '/colleges/',
  '/blog/index.html',
];

// ── INSTALL: cache core files, skip waiting immediately ───────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => {
        console.log('[SW v3] Installed. Skipping wait.');
        return self.skipWaiting(); // activate immediately — don't wait for tabs to close
      })
  );
});

// ── ACTIVATE: delete ALL old caches, claim all clients ────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_VERSION)
          .map(key => {
            console.log('[SW v3] Deleting stale cache:', key);
            return caches.delete(key);
          })
      ))
      .then(() => {
        console.log('[SW v3] Activated. Claiming all clients.');
        return self.clients.claim(); // take control of all open tabs immediately
      })
  );
});

// ── FETCH: network-first for HTML, cache-first for assets ─────────────
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip cross-origin (fonts, APIs etc.)
  if (url.origin !== location.origin) return;

  const isHTML = event.request.headers.get('Accept')?.includes('text/html')
              || url.pathname.endsWith('.html')
              || url.pathname === '/';

  if (isHTML) {
    // NETWORK FIRST for all HTML — always try to get the freshest version
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            // Update the cache with the fresh response
            const clone = response.clone();
            caches.open(CACHE_VERSION).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          // Network failed — serve from cache as fallback
          return caches.match(event.request)
            .then(cached => cached || caches.match(OFFLINE_PAGE));
        })
    );
  } else {
    // CACHE FIRST for static assets (images, fonts) — they rarely change
    event.respondWith(
      caches.match(event.request)
        .then(cached => {
          if (cached) return cached;
          return fetch(event.request)
            .then(response => {
              if (response && response.status === 200 && response.type === 'basic') {
                const clone = response.clone();
                caches.open(CACHE_VERSION).then(cache => cache.put(event.request, clone));
              }
              return response;
            })
            .catch(() => null);
        })
    );
  }
});

// ── MESSAGE: allow pages to force skipWaiting ─────────────────────────
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
