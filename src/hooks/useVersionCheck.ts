'use client';

import { useEffect, useRef } from 'react';
import { toast } from '@/hooks/use-toast';
import packageJson from '../../package.json';

const CURRENT_VERSION = packageJson.version;
const CHECK_INTERVAL_MS = 10 * 60 * 1000; // Check every 10 minutes

/**
 * Compare two semver strings (e.g., "6.6.0" vs "6.7.0")
 * Returns 1 if v2 > v1, -1 if v1 > v2, 0 if equal.
 */
function compareVersions(v1: string, v2: string): number {
  const p1 = v1.split('.').map(n => parseInt(n, 10) || 0);
  const p2 = v2.split('.').map(n => parseInt(n, 10) || 0);
  const maxLen = Math.max(p1.length, p2.length);

  for (let i = 0; i < maxLen; i++) {
    const num1 = p1[i] || 0;
    const num2 = p2[i] || 0;
    if (num2 > num1) return 1;
    if (num1 > num2) return -1;
  }
  return 0;
}

export function useVersionCheck(language: string = 'tr') {
  const notifiedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    async function checkVersion() {
      try {
        const res = await fetch('/api/version', { cache: 'no-store' });
        if (!res.ok || !isMounted) return;
        const data = await res.json();
        
        if (isMounted && data.latestVersion && compareVersions(CURRENT_VERSION, data.latestVersion) > 0) {
          if (!notifiedRef.current) {
            notifiedRef.current = true;
            const isTr = language === 'tr';
            toast({
              title: isTr ? '⚡ Yeni Sürüm Mevcut!' : '⚡ New Version Available!',
              description: isTr 
                ? `Network Simulator v${data.latestVersion} yayınlandı (Mevcut sürüm: v${CURRENT_VERSION}). Yeniliklerden yararlanmak için sayfayı yenileyin.` 
                : `Network Simulator v${data.latestVersion} is out (Current: v${CURRENT_VERSION}). Refresh page to update.`,
              variant: 'default',
              duration: 12000,
            });
          }
        }
      } catch {
        // Silent catch if offline or api unavailable
      }
    }

    // Initial check after 3 seconds
    const initialTimer = setTimeout(checkVersion, 3000);
    // Recurring check
    const intervalTimer = setInterval(checkVersion, CHECK_INTERVAL_MS);

    return () => {
      isMounted = false;
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
    };
  }, [language]);
}
