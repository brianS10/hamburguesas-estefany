const CACHE_NAME = 'hamburguesas-estefany-v2';

// Archivos que se cachean al instalar (para que funcione offline)
const STATIC_ASSETS = [
  '/',
  '/productos',
  '/reportes',
  '/categorias',
  '/logo_estefany.jpg',
  '/manifest.json',
];

// Instalar: cachear archivos estáticos
self.addEventListener('install', (event) => {
  console.log('📦 Service Worker instalándose...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Cacheando archivos para offline...');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activar: limpiar caches viejos
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker activado');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('🗑️ Eliminando cache viejo:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: estrategia Network First, fallback a Cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requests que no son GET
  if (request.method !== 'GET') return;

  // Ignorar extensiones de Chrome y otros
  if (url.protocol === 'chrome-extension:') return;

  // Para Supabase (API): Network only, pero cachear respuesta
  if (url.hostname.includes('supabase')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clonar y guardar en cache
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Si falla, buscar en cache
          return caches.match(request);
        })
    );
    return;
  }

  // Para todo lo demás: Network First, Cache Fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Si la respuesta es válida, guardar en cache
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Sin internet: buscar en cache
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Si es navegación y no está en cache, mostrar página principal
          if (request.mode === 'navigate') {
            return caches.match('/');
          }
          return new Response('Offline', { status: 503 });
        });
      })
  );
});
