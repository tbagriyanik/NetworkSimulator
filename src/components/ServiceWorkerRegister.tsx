'use client';

import { useEffect } from 'react';
import { logger } from '@/lib/logger';

function collectPageResources(): string[] {
  const urls = new Set<string>();

  // Scripts
  document.querySelectorAll('script[src]').forEach((el) => {
    const src = (el as HTMLScriptElement).src;
    if (src) urls.add(src);
  });

  // Stylesheets
  document.querySelectorAll('link[rel=stylesheet]').forEach((el) => {
    const href = (el as HTMLLinkElement).href;
    if (href) urls.add(href);
  });

  // Preload links (scripts, styles, fonts, images)
  document.querySelectorAll('link[rel=preload]').forEach((el) => {
    const href = (el as HTMLLinkElement).href;
    if (href) urls.add(href);
  });

  // Modulepreload
  document.querySelectorAll('link[rel=modulepreload]').forEach((el) => {
    const href = (el as HTMLLinkElement).href;
    if (href) urls.add(href);
  });

  return Array.from(urls);
}

function sendResourcesToSW(registration: ServiceWorkerRegistration) {
  if (!navigator.serviceWorker.controller) return;
  const urls = collectPageResources();
  if (urls.length > 0) {
    navigator.serviceWorker.controller.postMessage({
      type: 'cache-urls',
      urls,
    });
    logger.info(`Service Worker: Sent ${urls.length} URLs for caching`);
  }
}

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator) || typeof window === 'undefined') return;

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        logger.info('Service Worker registered successfully:', registration.scope);

        // If the SW is already active, cache page resources immediately
        if (registration.active) {
          sendResourcesToSW(registration);
        }

        // When a new SW takes control, cache resources
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          logger.info('Service Worker: New controller activated, caching resources');
          sendResourcesToSW(registration);
        });

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
      } catch (error) {
        logger.error('Service Worker registration failed:', error);
      }
    };

    register();
  }, []);

  return null;
}
