/**
 * PWA Service Worker Registration Utility
 */
export function registerPwaServiceWorker(): void {
  const isProd = Boolean(typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.PROD);
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator && isProd) {
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { updateViaCache: 'none' })
        .then((registration) => {
          // Immediately check for updates on registration
          registration.update().catch(() => {});

          // Check for updates when user returns to the tab/app
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
              registration.update().catch(() => {});
            }
          });

          // Check periodically every 10 minutes
          setInterval(() => {
            registration.update().catch(() => {});
          }, 10 * 60 * 1000);

          registration.addEventListener('updatefound', () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.addEventListener('statechange', () => {
                if (installingWorker.state === 'installed') {
                  if (navigator.serviceWorker.controller) {
                    // New service worker version is installed; force skipWaiting to activate immediately
                    installingWorker.postMessage({ type: 'SKIP_WAITING' });
                    window.dispatchEvent(new CustomEvent('techeeer:sw-updated'));
                  }
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
