'use client';

import { useEffect } from 'react';
import { AppErrorFallback } from '@/components/ui/AppErrorFallback';
import { logger } from '@/lib/logger';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error('Kritik Sistem Hatası:', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="m-0 p-0 antialiased">
        <AppErrorFallback
          error={error}
          reset={reset}
          titleOverride="Kritik Sistem Hatası"
          subtitleOverride="Uygulamanın temel yapısında bir hata oluştu."
        />
      </body>
    </html>
  );
}

