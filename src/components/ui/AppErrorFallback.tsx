'use client';

import { useState } from 'react';
import Link from 'next/link';

export interface AppErrorFallbackProps {
  error: Error & { digest?: string };
  reset: () => void;
  titleOverride?: string;
  subtitleOverride?: string;
}

export function AppErrorFallback({
  error,
  reset,
  titleOverride,
  subtitleOverride,
}: AppErrorFallbackProps) {
  const [lang, setLang] = useState<'tr' | 'en'>('tr');

  const t = {
    tr: {
      title: titleOverride || '500 - Beklenmeyen Hata',
      subtitle: subtitleOverride || 'Üzgünüz, uygulamada beklenmeyen bir hata meydana geldi.',
      retry: 'Tekrar Dene',
      returnHome: 'Ana Sayfaya Dön',
      errorDetail: 'Hata Mesajı:',
    },
    en: {
      title: titleOverride || '500 - Unexpected Error',
      subtitle: subtitleOverride || 'Sorry, an unexpected error occurred in the application.',
      retry: 'Try Again',
      returnHome: 'Return to Homepage',
      errorDetail: 'Error Message:',
    },
  };
  const tx = t[lang];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex flex-col items-center justify-center p-4 font-sans text-white">
      {/* Language Toggle */}
      <div className="absolute top-4 right-4 flex gap-2">
        <button
          onClick={() => setLang('tr')}
          className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${lang === 'tr' ? 'bg-blue-500 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}
        >
          TR
        </button>
        <button
          onClick={() => setLang('en')}
          className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${lang === 'en' ? 'bg-blue-500 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}
        >
          EN
        </button>
      </div>

      <div className="text-center mb-10 mt-[-10vh]">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/30 mb-6 backdrop-blur-sm">
          <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-4xl font-bold text-white mb-3">{tx.title}</h1>
        <p className="text-white/60 text-lg">{tx.subtitle}</p>
      </div>

      <div className="w-full max-w-md">
        <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-8 shadow-2xl flex flex-col items-center text-center">
          
          <div className="mb-8 w-full p-4 bg-black/20 rounded-xl border border-red-500/20">
            <p className="text-red-400/60 text-sm mb-1">{tx.errorDetail}</p>
            <p className="text-red-300 font-mono text-sm break-all">
              {error?.message || 'Bilinmeyen bir hata oluştu.'}
            </p>
          </div>
          
          <div className="w-full flex flex-col gap-3">
            <button 
              onClick={() => reset()}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-blue-500/25"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {tx.retry}
            </button>
            
            <Link 
              href="/"
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium rounded-xl transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              {tx.returnHome}
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
