// Service Worker for Network Simulator Offline Functionality
const CACHE_VERSION = 'v2';
const STATIC_CACHE = `netsim-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `netsim-dynamic-${CACHE_VERSION}`;
const RUNTIME_CACHE = `netsim-runtime-${CACHE_VERSION}`;

// Assets to cache for offline functionality
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon192.svg',
  '/icon512.svg',
  '/favicon.svg',
];

// Cache strategies
const CACHE_STRATEGIES = {
  // Cache first, fall back to network
  CACHE_FIRST: 'cache-first',
  // Network first, fall back to cache
  NETWORK_FIRST: 'network-first',
  // Stale while revalidate
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  // Network only
  NETWORK_ONLY: 'network-only',
  // Cache only
  CACHE_ONLY: 'cache-only',
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete old caches
            if (cacheName !== STATIC_CACHE &&
              cacheName !== DYNAMIC_CACHE &&
              cacheName !== RUNTIME_CACHE &&
              !cacheName.includes(CACHE_VERSION)) {
              console.log('Service Worker: Clearing old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip API requests - let them fail gracefully
  if (event.request.url.includes('/api/')) {
    return;
  }

  // Determine cache strategy based on request type
  const strategy = getCacheStrategy(event.request);

  switch (strategy) {
    case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
      event.respondWith(staleWhileRevalidate(event.request));
      break;
    case CACHE_STRATEGIES.NETWORK_FIRST:
      event.respondWith(networkFirst(event.request));
      break;
    case CACHE_STRATEGIES.CACHE_FIRST:
      event.respondWith(cacheFirst(event.request));
      break;
    case CACHE_STRATEGIES.NETWORK_ONLY:
      event.respondWith(fetch(event.request));
      break;
    default:
      event.respondWith(networkFirst(event.request));
  }
});

// Determine cache strategy for a request
function getCacheStrategy(request) {
  const url = new URL(request.url);

  // Static assets - cache first
  if (request.destination === 'image' ||
    request.destination === 'font' ||
    request.url.match(/\.(css|js|svg|png|jpg|jpeg|gif|ico|woff|woff2)$/i)) {
    return CACHE_STRATEGIES.CACHE_FIRST;
  }

  // HTML documents - network first with stale while revalidate
  if (request.destination === 'document') {
    return CACHE_STRATEGIES.STALE_WHILE_REVALIDATE;
  }

  // Scripts and styles - stale while revalidate
  if (request.destination === 'script' || request.destination === 'style') {
    return CACHE_STRATEGIES.STALE_WHILE_REVALIDATE;
  }

  // Default - network first
  return CACHE_STRATEGIES.NETWORK_FIRST;
}

// Cache first strategy
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('Cache first failed:', error);
    throw error;
  }
}

// Network first strategy
async function networkFirst(request) {
  const cache = await caches.open(DYNAMIC_CACHE);

  try {
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse && networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('Network failed, trying cache:', request.url);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // If both fail and it's a document, return offline page
    if (request.destination === 'document') {
      const offlineResponse = await caches.match('/');
      if (offlineResponse) {
        return offlineResponse;
      }
    }

    throw error;
  }
}

// Stale while revalidate strategy
async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cachedResponse = await cache.match(request);

  // Fetch in background
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse && networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch((error) => {
    console.error('Background fetch failed:', error);
  });

  // Return cached version immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }

  // Otherwise wait for network
  return fetchPromise;
}

// Handle background sync for when connection is restored
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

// Sync data with server when connection is restored
async function syncData() {
  try {
    console.log('Service Worker: Syncing data...');
    // Implement sync logic based on your needs
    return true;
  } catch (error) {
    console.error('Service Worker: Sync failed', error);
    return false;
  }
}

// Handle push notifications (optional)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();

    const options = {
      body: data.body,
      icon: '/icon-192x192.svg',
      badge: '/icon-192x192.svg',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: data.primaryKey
      }
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

console.log('Service Worker: Loaded');
