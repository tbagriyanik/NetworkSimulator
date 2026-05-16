'use client';

import { useEffect } from 'react';
import { logger } from '@/lib/logger';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator && typeof window !== 'undefined') {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          logger.info('Service Worker registered successfully:', registration.scope);

          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  logger.info('New service worker available, refreshing...');
                  window.location.reload();
                }
              });
            }
          });
        })
        .catch((error) => {
          logger.error('Service Worker registration failed:', error);
        });
    }
  }, []);

  return null;
}
