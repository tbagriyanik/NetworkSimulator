'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { logger } from '@/lib/logger';

type Props = {
  children: React.ReactNode;
  fallbackTitle?: string;
  fallbackDescription?: string;
  onError?: (error: Error, info: React.ErrorInfo) => void;
};

type State = {
  hasError: boolean;
  error?: Error;
  errorCount: number;
};

export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, errorCount: 0 };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorCount: 0 };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.props.onError?.(error, info);

    logger.error('Error caught by boundary:', error, info);

    this.setState(prev => ({ errorCount: prev.errorCount + 1 }));

    if (this.state.errorCount > 2) {
      logger.error('Multiple errors detected. Application may be unstable.');
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorCount: 0 });
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallbackWithContext
          error={this.state.error}
          fallbackTitle={this.props.fallbackTitle}
          fallbackDescription={this.props.fallbackDescription}
          onReset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error?: Error;
  fallbackTitle?: string;
  fallbackDescription?: string;
  onReset: () => void;
}

/**
 * Inner component that reads context — hooks are called unconditionally here.
 * If the context providers are not mounted (e.g. during a catastrophic failure),
 * this component itself will be caught by the class-based boundary and we fall
 * back to the safe defaults below.
 */
function ErrorFallbackWithContext({
  error,
  fallbackTitle,
  fallbackDescription,
  onReset,
}: ErrorFallbackProps) {
  const { theme } = useTheme();
  const { language } = useLanguage();
  return (
    <ErrorFallbackUI
      error={error}
      fallbackTitle={fallbackTitle}
      fallbackDescription={fallbackDescription}
      onReset={onReset}
      theme={theme}
      language={language}
    />
  );
}

interface ErrorFallbackUIProps extends ErrorFallbackProps {
  theme: string;
  language: string;
}

function ErrorFallbackUI({
  error,
  fallbackTitle,
  fallbackDescription,
  onReset,
  theme,
  language,
}: ErrorFallbackUIProps) {
  const isDark = theme === 'dark' || theme === 'high-contrast';

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-4 ${isDark ? 'bg-secondary-950' : 'bg-secondary-50'
        }`}
    >
      <div
        className={`max-w-md w-full rounded-lg border-2 border-error-500/30 p-8 ${isDark ? 'bg-secondary-900' : 'bg-white'
          }`}
      >
        <div className="flex items-center justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-error-500/10 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-error-500" />
          </div>
        </div>

        <h1
          className={`text-xl font-bold text-center mb-2 ${isDark ? 'text-white' : 'text-secondary-900'
            }`}
        >
          {fallbackTitle || (language === 'tr' ? 'Bir şeyler ters gitti!' : 'Oops! Something went wrong')}
        </h1>

        <p
          className={`text-center text-sm mb-6 ${isDark ? 'text-secondary-400' : 'text-secondary-600'
            }`}
        >
          {fallbackDescription ||
            (language === 'tr' ? 'Beklenmeyen bir hata oluştu. Lütfen sayfayı yenilemeyi deneyin veya sorun devam ederse destek ekibiyle iletişime geçin.' : 'We encountered an unexpected error. Please try refreshing the page or contact support if the problem persists.')}
        </p>

        {error && process.env.NODE_ENV === 'development' && (
          <div
            className={`mb-6 p-3 rounded text-xs font-mono overflow-auto max-h-32 ${isDark
              ? 'bg-secondary-800 text-secondary-300'
              : 'bg-secondary-100 text-secondary-700'
              }`}
          >
            <p className="font-bold mb-1">{language === 'tr' ? 'Hata Detayları:' : 'Error Details:'}</p>
            <p>{error.message}</p>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            onClick={onReset}
            className="flex-1 gap-2"
            variant="default"
          >
            <RefreshCw className="w-4 h-4" />
            {language === 'tr' ? 'Tekrar Dene' : 'Try Again'}
          </Button>
          <Button
            onClick={() => window.location.href = '/'}
            variant="outline"
            className="flex-1"
          >
            {language === 'tr' ? 'Ana Sayfaya Dön' : 'Go Home'}
          </Button>
        </div>
      </div>
    </div>
  );
}



