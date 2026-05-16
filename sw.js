/* CNC Calculator — Service Worker
   v7 — bulletproof offline + diagnostic message endpoint */

var VERSION = 'v10';
var CACHE = 'cnc-calc-' + VERSION;

var CRITICAL = [
  './',
  './index.html',
  './manifest.json'
];

var OPTIONAL = [
  './icon.svg',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './offline.html',
  './fonts/ibm-plex-mono-400.woff2',
  './fonts/ibm-plex-mono-500.woff2',
  './fonts/ibm-plex-mono-600.woff2',
  './fonts/ibm-plex-sans-300.woff2',
  './fonts/ibm-plex-sans-400.woff2',
  './fonts/ibm-plex-sans-500.woff2'
];

self.addEventListener('install', function(e) {
  e.waitUntil((async function() {
    var c = await caches.open(CACHE);
    /* CRITICAL must all succeed; one failure aborts install so we don't
       end up with a broken offline experience. We force network bypass via
       a cache-busting query so we don't pick up a stale entry from another SW. */
    var bust = '?_swbust=' + Date.now();
    var critPromises = CRITICAL.map(function(url) {
      return fetch(url + bust, { cache: 'reload' }).then(function(r) {
        if (!r.ok) throw new Error('CRITICAL fetch failed: ' + url + ' (' + r.status + ')');
        return c.put(url, r);
      });
    });
    await Promise.all(critPromises);

    /* OPTIONAL: best-effort, individual failures are tolerated */
    await Promise.all(OPTIONAL.map(function(url) {
      return fetch(url + bust, { cache: 'reload' })
        .then(function(r) { if (r.ok) return c.put(url, r); })
        .catch(function() { /* asset missing — skip */ });
    }));
  })());

  /* Auto-skipWaiting if there is no controller yet (first-ever install).
     For UPDATES, the page's toast handles this on user opt-in. */
  if (!self.registration.active) self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil((async function() {
    var keys = await caches.keys();
    await Promise.all(keys.filter(function(k) {
      return k !== CACHE && k.indexOf('cnc-calc-') === 0;
    }).map(function(k) { return caches.delete(k); }));
    await self.clients.claim();
  })());
});

self.addEventListener('message', function(e) {
  if (!e.data) return;
  if (e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (e.data.type === 'GET_STATUS') {
    /* Reply via the message port with a snapshot of cache state.
       Used by the in-page diagnostic. */
    (async function() {
      var c = await caches.open(CACHE);
      var keys = await c.keys();
      var assets = keys.map(function(k) { return new URL(k.url).pathname; }).sort();
      e.source.postMessage({
        type: 'STATUS',
        version: VERSION,
        cacheName: CACHE,
        assetCount: assets.length,
        assets: assets
      });
    })();
  }
});

self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  /* Cache-first for everything; update in background; offline fallback for navigations. */
  e.respondWith((async function() {
    var c = await caches.open(CACHE);
    var cached = await c.match(e.request, { ignoreSearch: true });

    var networkFetch = fetch(e.request).then(function(r) {
      if (r && r.status === 200 && r.type === 'basic') {
        c.put(e.request, r.clone());
      }
      return r;
    }).catch(function() { return null; });

    if (cached) {
      /* Don't await network — return stale-while-revalidate */
      return cached;
    }
    var fresh = await networkFetch;
    if (fresh) return fresh;

    /* Offline + no cache: navigation → app shell or offline.html */
    if (e.request.mode === 'navigate') {
      var shell = await c.match('./index.html') || await c.match('./');
      if (shell) return shell;
      var off = await c.match('./offline.html');
      if (off) return off;
    }
    return new Response('', { status: 504, statusText: 'Offline' });
  })());
});
