const CACHE_NAME = "dla-access-enterprise-v1";

const PRECACHE_ASSETS = [
  "/",
  "/dashboard",
  "/mobile-preview",
  "/manifest.json",
  "/icons/icon-192.svg",
  "/icons/icon-512.svg"
];

// Install Event - Pre-cache App Shell
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn("ServiceWorker precache warning:", err);
      });
    })
  );
});

// Activate Event - Clean old caches & claim clients
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Dynamic caching strategy
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests for standard caching (POST requests handled by IndexedDB offline queue)
  if (request.method !== "GET") {
    return;
  }

  // API Requests: Network-First strategy with Cache Fallback
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            return new Response(
              JSON.stringify({ error: "Sin conexión a Internet. Operando en Modo Offline PWA." }),
              { status: 503, headers: { "Content-Type": "application/json" } }
            );
          });
        })
    );
    return;
  }

  // Static Assets & Pages: Cache-First strategy with Network Fallback
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Refresh cache in background
        fetch(request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(request).then((networkResponse) => {
        if (networkResponse.status === 200 && request.url.startsWith("http")) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
        }
        return networkResponse;
      }).catch(() => {
        if (request.headers.get("accept")?.includes("text/html")) {
          return caches.match("/dashboard") || caches.match("/");
        }
      });
    })
  );
});

// Background Sync Event
self.addEventListener("sync", (event) => {
  if (event.tag === "dla-sync-queue") {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: "TRIGGER_OFFLINE_SYNC" });
        });
      })
    );
  }
});
