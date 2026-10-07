/**
 * PWA Service Worker Registration Utility
 */
export function registerPwaServiceWorker(): void {
  const isProd = Boolean(typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.PROD);
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator && isProd) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          registration.addEventListener('updatefound', () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.addEventListener('statechange', () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New content available; broadcast to UI toast
                  window.dispatchEvent(new CustomEvent('techeeer:sw-updated'));
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('[PWA SW] Registration failed:', error);
        });
    });
  }
}
