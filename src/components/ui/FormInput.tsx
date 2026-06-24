'use client';

import React, { useId } from 'react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    hint?: string;
    required?: boolean;
    icon?: React.ReactNode;
    showValidation?: boolean;
    isValid?: boolean;
    isLoading?: boolean;
}

export const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
    (
        {
            label,
            error,
            hint,
            required,
            icon,
            showValidation,
            isValid,
            isLoading,
            className,
            disabled,
            id: providedId,
            ...props
        },
        ref
    ) => {
        const { theme } = useTheme();
        const generatedId = useId();
        const id = providedId || generatedId;
        const errorId = `${id}-error`;
        const hintId = `${id}-hint`;

        const isDark = theme === 'dark';
        const hasError = !!error;
        const showSuccess = showValidation && isValid && !hasError;

        return (
            <div className="w-full space-y-2">
                {label && (
                    <label
                        htmlFor={id}
                        className={cn(
                            'text-sm font-medium',
                            isDark ? 'text-slate-300' : 'text-slate-700',
                            required && "after:content-['*'] after:ml-1 after:text-red-500"
                        )}
                    >
                        {label}
                    </label>
                )}

                <div className="relative">
                    {icon && (
                        <div
                            className={cn(
                                'absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none',
                                isDark ? 'text-slate-500' : 'text-slate-400'
                            )}
                        >
                            {icon}
                        </div>
                    )}

                    <Input
                        ref={ref}
                        id={id}
                        disabled={disabled || isLoading}
                        aria-invalid={hasError ? 'true' : undefined}
                        aria-describedby={cn(
                            hasError ? errorId : undefined,
                            hint && !hasError ? hintId : undefined
                        )}
                        className={cn(
                            'transition-all',
                            icon && 'pl-10',
                            hasError && 'border-red-500 focus-visible:ring-red-500',
                            showSuccess && 'border-green-500 focus-visible:ring-green-500',
                            isLoading && 'opacity-50 cursor-not-allowed',
                            className
                        )}
                        {...props}
                    />

                    {isLoading && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <div className="animate-spin">
                                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                            </div>
                        </div>
                    )}

                    {!isLoading && showSuccess && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                    )}

                    {!isLoading && hasError && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500">
                            <AlertCircle className="w-5 h-5" />
                        </div>
                    )}
                </div>

                {error && (
                    <p id={errorId} className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                    </p>
                )}

                {hint && !error && (
                    <p id={hintId} className={cn('text-xs', isDark ? 'text-slate-500' : 'text-slate-500')}>
                        {hint}
                    </p>
                )}
            </div>
        );
    }
);

FormInput.displayName = 'FormInput';
