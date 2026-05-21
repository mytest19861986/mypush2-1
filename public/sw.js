const CACHE_NAME = 'hami-kart-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// نصب و کش کردن فایل‌های استاتیک
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// فعال‌سازی و پاک کردن کش‌های قدیمی
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// رهگیری درخواست‌ها - Network First با fallback به کش
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // نادیده گرفتن درخواست‌های non-GET
  if (request.method !== 'GET') return;
  
  // نادیده گرفتن درخواست‌های API
  if (request.url.includes('/api/')) return;
  
  // نادیده گرفتن درخواست‌های chrome-extension
  if (request.url.startsWith('chrome-extension://')) return;
  
  event.respondWith(
    fetch(request)
      .then((response) => {
        // کش کردن پاسخ موفق
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // برگشت به کش در صورت قطعی اینترنت
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          // صفحه آفلاین برای ناوبری
          if (request.mode === 'navigate') {
            return caches.match('/');
          }
          return new Response('آفلاین هستید', { status: 503 });
        });
      })
  );
});
