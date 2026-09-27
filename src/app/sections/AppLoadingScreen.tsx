import Image from 'next/image';
import { isDesktopApp } from '@/lib/utils/desktopDetection';

interface AppLoadingScreenProps {
  isAppLoading: boolean;
  t: { initializingSystem?: string; [key: string]: string | undefined };
}

export function AppLoadingScreen({ isAppLoading, t }: AppLoadingScreenProps) {
  if (!isAppLoading) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-secondary-950 select-none">
      <div className="flex flex-col items-center">
        <div className="mb-6 p-2">
          <Image
            src="/app.png"
            alt="Logo"
            width={64}
            height={64}
            className="w-16 h-16 object-contain"
            unoptimized
            priority
          />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-white mb-2 text-center">
          NETWORK SIMULATOR
        </h1>

        <div className="flex flex-col items-center gap-2 mt-2">
          <span className="text-xs font-medium tracking-widest text-slate-400">
            {t.initializingSystem || 'Yükleniyor...'}
          </span>
          {isDesktopApp() && (
            <span className="text-[11px] font-mono font-medium text-amber-400/90 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
              Ctrl Shift R to start
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

