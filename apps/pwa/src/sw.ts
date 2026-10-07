/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

// 1. Immediate activation upon install
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// 2. Clean up outdated caches and precache manifest bundle
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST || []);

// 3. SPA Navigation fallback: Route all navigation requests offline to /index.html
const handler = createHandlerBoundToURL('/index.html');
const navigationRoute = new NavigationRoute(handler, {
  denylist: [/^\/_/, /\/[^/?]+\.[^/]+$/],
});
registerRoute(navigationRoute);

// 4. Cache fonts with CacheFirst strategy (1 year)
registerRoute(
  ({ request, url }) => request.destination === 'font' || url.pathname.includes('/fonts/'),
  new CacheFirst({
    cacheName: 'techeeer-fonts',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 365 * 24 * 60 * 60,
      }),
    ],
  })
);

// 5. Cache SQLite WASM binary with CacheFirst strategy (1 year)
registerRoute(
  ({ request, url }) => url.pathname.endsWith('.wasm') || request.url.includes('sqlite3.wasm'),
  new CacheFirst({
    cacheName: 'techeeer-wasm',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 5,
        maxAgeSeconds: 365 * 24 * 60 * 60,
      }),
    ],
  })
);

// 6. Cache static images and icons
registerRoute(
  ({ request, url }) => request.destination === 'image' || url.pathname.includes('/icons/'),
  new CacheFirst({
    cacheName: 'techeeer-images',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60,
      }),
    ],
  })
);
