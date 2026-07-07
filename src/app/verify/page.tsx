'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface CertificateRecord {
  verifyCode: string;
  studentName: string;
  projectTitle: string;
  score: number;
  totalScore: number;
  date: string;
  language: 'tr' | 'en';
  issuedAt: number;
}

function VerifyContent() {
  const searchParams = useSearchParams();
  const [inputCode, setInputCode] = useState(searchParams.get('code') || '');
  const [status, setStatus] = useState<'idle' | 'loading' | 'found' | 'notfound' | 'error'>('idle');
  const [record, setRecord] = useState<CertificateRecord | null>(null);
  const [lang, setLang] = useState<'tr' | 'en'>('tr');

  const t = {
    tr: {
      title: 'Sertifika Doğrulama',
      subtitle: 'Öğrenci sertifikasının geçerliliğini doğrulayın',
      placeholder: 'Doğrulama kodunu girin (örn: AB3KPQ7R2N)',
      verify: 'Doğrula',
      loading: 'Kontrol ediliyor...',
      found: 'Sertifika Geçerli',
      notfound: 'Sertifika Bulunamadı',
      error: 'Bir hata oluştu, lütfen tekrar deneyin.',
      student: 'Öğrenci',
      module: 'Modül',
      score: 'Puan',
      date: 'Tarih',
      issuedAt: 'Düzenlenme Tarihi',
      poweredBy: 'Network Simulator',
      invalid: 'Bu kod geçersiz veya sertifika bulunamadı.',
      codeLabel: 'Doğrulama Kodu',
    },
    en: {
      title: 'Certificate Verification',
      subtitle: 'Verify the authenticity of a student certificate',
      placeholder: 'Enter verification code (e.g. AB3KPQ7R2N)',
      verify: 'Verify',
      loading: 'Checking...',
      found: 'Certificate Valid',
      notfound: 'Certificate Not Found',
      error: 'An error occurred, please try again.',
      student: 'Student',
      module: 'Module',
      score: 'Score',
      date: 'Date',
      issuedAt: 'Issued At',
      poweredBy: 'Network Simulator',
      invalid: 'This code is invalid or no certificate was found.',
      codeLabel: 'Verification Code',
    },
  };
  const tx = t[lang];

  const verify = async (verifyCode: string) => {
    const trimmed = verifyCode.trim().toUpperCase();
    if (!trimmed) return;
    setStatus('loading');
    setRecord(null);
    try {
      const res = await fetch(`/api/certificate/${encodeURIComponent(trimmed)}`);
      if (res.status === 404) {
        setStatus('notfound');
        return;
      }
      if (!res.ok) {
        setStatus('error');
        return;
      }
      const json = await res.json();
      if (json.success && json.data) {
        setRecord(json.data);
        setStatus('found');
      } else {
        setStatus('notfound');
      }
    } catch {
      setStatus('error');
    }
  };

  // Auto-verify if code is in URL
  useEffect(() => {
    const urlCode = searchParams.get('code');
    if (!urlCode) return;
    const timer = setTimeout(() => verify(urlCode), 0);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verify(inputCode);
  };

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex flex-col items-center justify-start pt-16 px-4">
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

      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500/20 border border-blue-400/30 mb-4 backdrop-blur-sm">
          <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">{tx.title}</h1>
        <p className="text-white/50 text-sm">{tx.subtitle}</p>
      </div>

      {/* Verify Form */}
      <div className="w-full max-w-md">
        <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-6 shadow-2xl">
          <label className="block text-white/70 text-sm font-medium mb-2">{tx.codeLabel}</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              placeholder={tx.placeholder}
              maxLength={20}
              className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 font-mono text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/50 transition-all"
            />
            <button
              type="submit"
              disabled={status === 'loading' || !inputCode.trim()}
              className="px-5 py-3 bg-blue-500 hover:bg-blue-400 disabled:bg-blue-500/40 text-white font-semibold rounded-xl transition-all text-sm whitespace-nowrap"
            >
              {status === 'loading' ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : tx.verify}
            </button>
          </div>
        </form>

        {/* Result */}
        {status === 'found' && record && (
          <div className="mt-6 bg-emerald-500/10 border border-emerald-400/30 backdrop-blur-xl rounded-2xl p-6 shadow-2xl animate-fade-in">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">✅</span>
              <h2 className="text-emerald-300 font-bold text-lg">{tx.found}</h2>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-white/50">{tx.student}</span>
                <span className="text-white font-semibold">{record.studentName}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-white/50">{tx.module}</span>
                <span className="text-white font-semibold text-right max-w-[60%]">{record.projectTitle}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-white/50">{tx.score}</span>
                <span className="text-white font-semibold">
                  {record.score} / {record.totalScore}
                  <span className="ml-2 text-emerald-400">
                    ({Math.round((record.score / record.totalScore) * 100)}%)
                  </span>
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-white/50">{tx.date}</span>
                <span className="text-white font-semibold">{record.date}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-white/50">{tx.issuedAt}</span>
                <span className="text-white/70 text-xs">{formatDate(record.issuedAt)}</span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-2">
              <span className="text-white/30 text-xs font-mono">{tx.codeLabel}:</span>
              <span className="text-white/50 text-xs font-mono">{record.verifyCode}</span>
            </div>
          </div>
        )}

        {status === 'notfound' && (
          <div className="mt-6 bg-red-500/10 border border-red-400/30 backdrop-blur-xl rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-2">
              <span className="text-2xl">❌</span>
              <div>
                <h2 className="text-red-300 font-bold">{tx.notfound}</h2>
                <p className="text-white/40 text-sm mt-1">{tx.invalid}</p>
              </div>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="mt-6 bg-yellow-500/10 border border-yellow-400/30 backdrop-blur-xl rounded-2xl p-6 shadow-2xl">
            <p className="text-yellow-300">{tx.error}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <p className="mt-auto pt-12 pb-6 text-white/20 text-xs">{tx.poweredBy}</p>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyContent />
    </Suspense>
  );
}
