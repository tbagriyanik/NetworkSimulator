'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { Loader2, Server, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  text?: string;
  variant?: 'default' | 'pulse' | 'bounce';
}

const sizeMap = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
};

export function LoadingSpinner({
  size = 'md',
  className,
  text,
  variant = 'default',
}: LoadingSpinnerProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const spinnerClass = variant === 'pulse' ? 'animate-pulse' : variant === 'bounce' ? 'animate-bounce' : 'animate-spin';

  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <Loader2 className={cn('text-primary', sizeMap[size], spinnerClass)} />
      {text && (
        <span
          className={cn(
            'text-sm',
            isDark ? 'text-slate-400' : 'text-slate-600'
          )}
        >
          {text}
        </span>
      )}
    </div>
  );
}

interface ProgressIndicatorProps {
  current: number;
  total: number;
  label?: string;
  className?: string;
}

export function ProgressIndicator({
  current,
  total,
  label,
  className,
}: ProgressIndicatorProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const percentage = Math.round((current / total) * 100);

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {label && (
        <div className="flex justify-between items-center">
          <span className={cn('text-sm font-medium', isDark ? 'text-slate-300' : 'text-slate-700')}>
            {label}
          </span>
          <span className={cn('text-xs', isDark ? 'text-slate-500' : 'text-slate-500')}>
            {current} / {total}
          </span>
        </div>
      )}
      <div
        className={cn(
          'w-full h-2 rounded-full overflow-hidden',
          isDark ? 'bg-slate-700' : 'bg-slate-200'
        )}
      >
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className={cn('text-xs', isDark ? 'text-slate-500' : 'text-slate-500')}>
        {percentage}%
      </span>
    </div>
  );
}

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'error' | 'success' | 'info';
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  variant = 'default',
}: EmptyStateProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const variantConfig = {
    default: {
      bgColor: isDark ? 'bg-slate-800' : 'bg-slate-100',
      textColor: isDark ? 'text-slate-400' : 'text-slate-500',
      icon: icon || <Server className="w-8 h-8" />,
    },
    error: {
      bgColor: isDark ? 'bg-red-900/20' : 'bg-red-100',
      textColor: isDark ? 'text-red-400' : 'text-red-600',
      icon: icon || <AlertCircle className="w-8 h-8" />,
    },
    success: {
      bgColor: isDark ? 'bg-green-900/20' : 'bg-green-100',
      textColor: isDark ? 'text-green-400' : 'text-green-600',
      icon: icon || <CheckCircle2 className="w-8 h-8" />,
    },
    info: {
      bgColor: isDark ? 'bg-blue-900/20' : 'bg-blue-100',
      textColor: isDark ? 'text-blue-400' : 'text-blue-600',
      icon: icon || <Clock className="w-8 h-8" />,
    },
  };

  const config = variantConfig[variant];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center',
        'animate-fade-in',
        className
      )}
    >
      <div className={cn('w-16 h-16 rounded-full flex items-center justify-center mb-4', config.bgColor, config.textColor)}>
        {config.icon}
      </div>
      <h3
        className={cn(
          'text-lg font-semibold mb-2',
          isDark ? 'text-white' : 'text-slate-900'
        )}
      >
        {title}
      </h3>
      {description && (
        <p className={cn('text-sm mb-6 max-w-sm', isDark ? 'text-slate-400' : 'text-slate-600')}>
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

interface SkeletonProps {
  className?: string;
  count?: number;
}

export function Skeleton({ className, count = 1 }: SkeletonProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'animate-pulse rounded',
            isDark ? 'bg-slate-700' : 'bg-slate-200',
            className
          )}
        />
      ))}
    </>
  );
}

interface StatusIndicatorProps {
  status: 'loading' | 'success' | 'error' | 'warning' | 'idle';
  label?: string;
  className?: string;
}

export function StatusIndicator({
  status,
  label,
  className,
}: StatusIndicatorProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const statusConfig = {
    loading: {
      icon: <Loader2 className="w-4 h-4 animate-spin" />,
      color: isDark ? 'text-blue-400' : 'text-blue-600',
      bgColor: isDark ? 'bg-blue-900/20' : 'bg-blue-100',
    },
    success: {
      icon: <CheckCircle2 className="w-4 h-4" />,
      color: isDark ? 'text-green-400' : 'text-green-600',
      bgColor: isDark ? 'bg-green-900/20' : 'bg-green-100',
    },
    error: {
      icon: <AlertCircle className="w-4 h-4" />,
      color: isDark ? 'text-red-400' : 'text-red-600',
      bgColor: isDark ? 'bg-red-900/20' : 'bg-red-100',
    },
    warning: {
      icon: <AlertCircle className="w-4 h-4" />,
      color: isDark ? 'text-yellow-400' : 'text-yellow-600',
      bgColor: isDark ? 'bg-yellow-900/20' : 'bg-yellow-100',
    },
    idle: {
      icon: <Clock className="w-4 h-4" />,
      color: isDark ? 'text-slate-400' : 'text-slate-600',
      bgColor: isDark ? 'bg-slate-800' : 'bg-slate-100',
    },
  };

  const config = statusConfig[status];

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('p-1.5 rounded-full', config.bgColor, config.color)}>
        {config.icon}
      </div>
      {label && (
        <span className={cn('text-sm font-medium', config.color)}>
          {label}
        </span>
      )}
    </div>
  );
}
