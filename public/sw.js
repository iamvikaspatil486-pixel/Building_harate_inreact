// 🚀 PRODUCTION-GRADE STATIC SERVICE WORKER FOR STUDENTS HARATE
const CACHE_NAME = "harate-cache-v2";

// Files to cache immediately for fast offline bootstrap loading states
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/manifest.json",
  "/logo192.png",
  "/logo512.png"
];

// 1. Install Event: Cache core shell assets immediately
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Pre-caching structural app shell assets successfully.");
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  // Force the waiting service worker to become the active service worker immediately
  self.skipWaiting();
});

// 2. Activate Event: Wipe out old obsolete caches when pushing app structural updates
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log("Clearing old obsolete service worker cache memory:", cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  // Force active tabs to immediately drop old workers and utilize this fresh code layer
  self.clients.claim();
});

// 3. Fetch Event: Intercept network fetch pipelines to keep PWA install requirements passing
self.addEventListener("fetch", (event) => {
  // We let your live Supabase sockets and real-time streams handle database data dynamically,
  // but we intercept regular asset requests to keep browser install rules fully satisfied.
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});

