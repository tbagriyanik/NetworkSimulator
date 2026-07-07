'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function NotFound() {
  const [lang, setLang] = useState<'tr' | 'en'>('tr');
  const pathname = usePathname();

  const t = {
    tr: {
      title: '404 - Sayfa Bulunamadı',
      subtitle: 'Aradığınız sayfa mevcut değil veya taşınmış olabilir.',
      returnHome: 'Ana Sayfaya Dön',
      pathLabel: 'Aranan Yol:',
    },
    en: {
      title: '404 - Page Not Found',
      subtitle: 'The page you are looking for does not exist or has been moved.',
      returnHome: 'Return to Homepage',
      pathLabel: 'Requested Path:',
    },
  };
  const tx = t[lang];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex flex-col items-center justify-center p-4">
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
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-blue-500/10 border border-blue-400/30 mb-6 backdrop-blur-sm">
          <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-4xl font-bold text-white mb-3">{tx.title}</h1>
        <p className="text-white/60 text-lg">{tx.subtitle}</p>
      </div>

      <div className="w-full max-w-md">
        <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-8 shadow-2xl flex flex-col items-center text-center">
          <div className="mb-8 w-full p-4 bg-black/20 rounded-xl border border-white/5">
            <p className="text-white/40 text-sm mb-1">{tx.pathLabel}</p>
            <p className="text-white/80 font-mono text-sm break-all">{pathname}</p>
          </div>
          
          <Link 
            href="/"
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-blue-500/25"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            {tx.returnHome}
          </Link>
        </div>
      </div>
    </div>
  );
}
