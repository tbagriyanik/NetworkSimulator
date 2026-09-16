import Image from 'next/image';

interface AppLoadingScreenProps {
  isAppLoading: boolean;
  t: any;
}

export function AppLoadingScreen({ isAppLoading, t }: AppLoadingScreenProps) {
  if (!isAppLoading) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-secondary-950">
      <div className="flex flex-col items-center animate-scale-in">
        <div className="relative mb-8">
          <div className="p-2 animate-glitch">
            <Image src="/app.png" alt="Logo" width={64} height={64} className="w-16 h-16 object-contain" priority />
          </div>
          <div className="absolute inset-0 p-4 rounded-2xl bg-error-500/30 animate-glitch-skew mix-blend-screen" />
          <div className="absolute inset-0 p-4 rounded-2xl bg-primary-500/30 animate-glitch mix-blend-screen" style={{ animationDelay: '0.1s' }} />
        </div>

        <h1 className="text-3xl font-black tracking-tighter text-white glitch-text mb-2 text-center" data-text="NETWORK SIMULATOR">
          NETWORK SIMULATOR
        </h1>

        <div className="flex items-center gap-2 mt-4">
          <span className="text-xs font-bold tracking-widest text-accent-500">
            {t.initializingSystem}
          </span>
        </div>
      </div>
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_4px,3px_100%]" />
    </div>
  );
}
