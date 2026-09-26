'use client';

import React, { useState, useEffect, useRef } from 'react';
import { CornerDownLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ResizablePortalWindow } from './ResizablePortalWindow';
import type { PythonSession } from './PCPanel.types';

interface PythonInputModalProps {
  session: PythonSession | null;
  isDark?: boolean;
  isMobile?: boolean;
  language?: string;
  onSubmit: (input: string) => void;
  onCancel: () => void;
}

export function PythonInputModal({
  session,
  isDark = true,
  isMobile = false,
  language = 'tr',
  onSubmit,
  onCancel,
}: PythonInputModalProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (session) {
      setValue('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [session]);

  if (!session) return null;

  const handleSubmit = () => {
    onSubmit(value);
    setValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <ResizablePortalWindow
      isOpen={!!session}
      title="Python Input"
      isDark={isDark}
      isMobile={isMobile}
      defaultWidth={380}
      defaultHeight={180}
      minWidth={300}
      minHeight={140}
      onClose={onCancel}
    >
      <div className={`flex flex-col h-full ${isDark ? 'bg-secondary-900 text-secondary-100' : 'bg-white text-secondary-900'}`}>
        <div className="px-4 py-3 border-b border-secondary-700/50">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black tracking-widest text-warning-400 uppercase">
              {language === 'tr' ? 'Python Giriş' : 'Python Input'}
            </span>
          </div>
        </div>

        <div className="flex-1 px-4 py-3 flex flex-col gap-3">
          <div className={`font-geist-mono text-sm ${isDark ? 'text-secondary-300' : 'text-secondary-600'}`}>
            {session.currentPrompt || '>>> '}
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className={`flex-1 px-3 py-2 rounded-lg border font-geist-mono text-sm outline-none focus:ring-1 transition-all ${
                isDark
                  ? 'bg-secondary-800 border-secondary-600 text-secondary-100 focus:ring-primary/50 placeholder:text-secondary-500'
                  : 'bg-secondary-50 border-secondary-300 text-secondary-900 focus:ring-primary/50 placeholder:text-secondary-400'
              }`}
              placeholder={language === 'tr' ? 'Değer girin...' : 'Enter value...'}
              autoFocus
            />
            <Button
              type="button"
              size="sm"
              onClick={handleSubmit}
              aria-label={language === 'tr' ? 'Gönder' : 'Submit'}
              title={language === 'tr' ? 'Gönder' : 'Submit'}
              className="shrink-0 rounded-lg px-3 h-9 bg-primary text-white hover:bg-primary/90"
            >
              <CornerDownLeft className="w-4 h-4" aria-hidden="true" />
            </Button>
          </div>
          <div className="text-[10px] text-secondary-500">
            Enter = {language === 'tr' ? 'gönder' : 'submit'}, Esc = {language === 'tr' ? 'iptal' : 'cancel'}
          </div>
        </div>
      </div>
    </ResizablePortalWindow>
  );
}
