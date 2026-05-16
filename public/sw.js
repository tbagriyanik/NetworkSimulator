// Service Worker for Network Simulator Offline Functionality
const CACHE_VERSION = 'v4';
const STATIC_CACHE = `netsim-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `netsim-dynamic-${CACHE_VERSION}`;

// Assets to pre-cache during install
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/icon192.svg',
  '/icon512.svg',
  '/favicon.svg',
];

// Install event - pre-cache static assets and activate immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches and claim all clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cacheName) => {
          if (
            cacheName !== STATIC_CACHE &&
            cacheName !== DYNAMIC_CACHE
          ) {
            return caches.delete(cacheName);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

// Determine cache strategy for a request
function getCacheStrategy(request) {
  const url = new URL(request.url);

  // Next.js build chunks use content hashes in filenames — safe to cache-first
  if (url.pathname.startsWith('/_next/')) {
    return 'cache-first';
  }

  // Static assets (images, fonts, media)
  if (
    request.destination === 'image' ||
    request.destination === 'font' ||
    request.url.match(/\.(css|js|svg|png|jpg|jpeg|gif|ico|woff2?)$/i)
  ) {
    return 'cache-first';
  }

  // HTML documents: serve cached instantly, update in background
  if (request.destination === 'document') {
    return 'stale-while-revalidate';
  }

  // Scripts and stylesheets
  if (request.destination === 'script' || request.destination === 'style') {
    return 'stale-while-revalidate';
  }

  // Default: network-first (for API-like requests)
  return 'network-first';
}

// Cache-first: respond from cache, fall back to network
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const network = await fetch(request);
    if (network && network.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, network.clone());
    }
    return network;
  } catch {
    return new Response('Offline', { status: 408 });
  }
}

// Network-first: try network, fall back to cache, then offline page
async function networkFirst(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  try {
    const network = await fetch(request);
    if (network && network.status === 200) {
      cache.put(request, network.clone());
    }
    return network;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    // For document requests, fall back to cached root page
    if (request.destination === 'document') {
      const root = await caches.match('/');
      if (root) return root;
    }
    return new Response('Offline', { status: 408 });
  }
}

// Stale-while-revalidate: serve cached instantly, update in background
async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((network) => {
      if (network && network.status === 200) {
        cache.put(request, network.clone());
      }
      return network;
    })
    .catch(() => {});

  if (cached) return cached;
  return fetchPromise;
}

// Fetch event - route requests to appropriate strategy
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('/api/')) return;

  const strategy = getCacheStrategy(event.request);
  switch (strategy) {
    case 'cache-first':
      event.respondWith(cacheFirst(event.request));
      break;
    case 'stale-while-revalidate':
      event.respondWith(staleWhileRevalidate(event.request));
      break;
    case 'network-first':
      event.respondWith(networkFirst(event.request));
      break;
    default:
      event.respondWith(networkFirst(event.request));
  }
});

// Message handler: cache URLs sent from the page (used after activation)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'cache-urls') {
    const urls = event.data.urls;
    if (Array.isArray(urls) && urls.length > 0) {
      event.waitUntil(
        caches.open(DYNAMIC_CACHE).then((cache) =>
          Promise.allSettled(
            urls.map((url) =>
              fetch(url).then((res) => {
                if (res.status === 200) cache.put(url, res);
              }).catch(() => {})
            )
          )
        )
      );
    }
  }
});
