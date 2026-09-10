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
        <div className="flex flex-col items-center justify-center p-6 bg-background/95 border border-destructive/30 rounded-lg text-center space-y-4 shadow-lg my-2">
          <div className="p-3 bg-destructive/10 rounded-full text-destructive">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-base text-foreground">
              {this.props.fallbackTitle || 'Bileşen Yüklenirken Bir Hata Oluştu'}
            </h3>
            <p className="text-xs text-muted-foreground max-w-md break-words">
              {this.state.error?.message || 'Beklenmeyen bir görselleştirme hatası meydana geldi.'}
            </p>
          </div>
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
      );
    }

    return this.props.children;
  }
}
