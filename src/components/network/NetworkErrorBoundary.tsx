'use client';

import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class NetworkErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('NetworkErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="network-error-title"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]"
        >
          <div className="w-full max-w-md rounded-xl border border-destructive/30 bg-background p-6 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <h3 id="network-error-title" className="font-semibold text-base text-foreground">
                {this.props.fallbackTitle || 'Bileşen Yüklenirken Bir Hata Oluştu'}
              </h3>
              <p className="break-words text-xs text-muted-foreground">
                {this.state.error?.message || 'Beklenmeyen bir görselleştirme hatası meydana geldi.'}
              </p>
            </div>
            <div className="mt-5 flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleReset}
                className="flex items-center gap-2 text-xs"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Yeniden Dene
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
