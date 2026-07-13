'use client';

import { useEffect } from 'react';
import { logger } from '@/lib/logger';
import { AppErrorFallback } from '@/components/ui/AppErrorFallback';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error('Uygulama Hatası:', error);
  }, [error]);

  return <AppErrorFallback error={error} reset={reset} />;
}

