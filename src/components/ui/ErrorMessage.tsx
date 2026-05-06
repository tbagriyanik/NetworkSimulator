'use client';

import React, { useState } from 'react';
import type { ErrorContext } from '@/types/ui-ux';
import { Card, CardContent } from './card';
import { Button } from './button';
import { Icon } from './icon';

export interface ErrorMessageProps {
    error: ErrorContext;
    onDismiss?: () => void;
    onLearnMore?: () => void;
    className?: string;
}

/**
 * Error Message Component
 * Displays student-friendly error messages with suggestions and recovery options
 */
export function ErrorMessage({
    error,
    onDismiss,
    onLearnMore,
    className = '',
}: ErrorMessageProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const getCategoryIcon = (category: string): string => {
        switch (category) {
            case 'configuration':
                return 'settings';
            case 'connection':
                return 'link-2';
            case 'file':
                return 'file';
            case 'simulation':
                return 'play-circle';
            default:
                return 'alert-circle';
        }
    };

    const getCategoryColor = (category: string): string => {
        switch (category) {
            case 'configuration':
                return 'bg-orange-50 border-orange-200';
            case 'connection':
                return 'bg-red-50 border-red-200';
            case 'file':
                return 'bg-yellow-50 border-yellow-200';
            case 'simulation':
                return 'bg-purple-50 border-purple-200';
            default:
                return 'bg-red-50 border-red-200';
        }
    };

    const getTextColor = (category: string): string => {
        switch (category) {
            case 'configuration':
                return 'text-orange-800';
            case 'connection':
                return 'text-red-800';
            case 'file':
                return 'text-yellow-800';
            case 'simulation':
                return 'text-purple-800';
            default:
                return 'text-red-800';
        }
    };

    return (
        <Card className={`border-2 ${getCategoryColor(error.category)} ${className}`}>
            <CardContent className="p-4">
                <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start gap-3">
                        <Icon
                            name={getCategoryIcon(error.category)}
                            size={20}
                            className={getTextColor(error.category)}
                        />
                        <div className="flex-1">
                            <div className={`font-semibold ${getTextColor(error.category)}`}>
                                {error.category.charAt(0).toUpperCase() + error.category.slice(1)} Error
                            </div>
                            <div className={`text-sm ${getTextColor(error.category)}`}>
                                {error.message}
                            </div>
                        </div>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={onDismiss}
                            className="h-6 w-6 p-0"
                            aria-label="Dismiss error"
                        >
                            <Icon name="x" size={16} />
                        </Button>
                    </div>

                    {/* Suggestions */}
                    {error.suggestions.length > 0 && (
                        <div className="space-y-2">
                            <div className={`text-xs font-semibold ${getTextColor(error.category)}`}>
                                Suggestions:
                            </div>
                            <ul className={`text-xs ${getTextColor(error.category)} space-y-1 list-disc list-inside`}>
                                {error.suggestions.map((suggestion, index) => (
                                    <li key={index}>{suggestion}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Error Code and Timestamp */}
                    <div
                        className={`text-xs ${getTextColor(error.category)} opacity-75 cursor-pointer hover:opacity-100 transition-opacity`}
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        <div className="flex items-center gap-1">
                            <Icon name={isExpanded ? 'chevron-down' : 'chevron-right'} size={12} />
                            <span>Error Code: {error.code}</span>
                        </div>
                        {isExpanded && (
                            <div className="mt-1 text-xs opacity-75">
                                Time: {error.timestamp.toLocaleTimeString()}
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                        {error.learnMoreUrl && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={onLearnMore}
                                className="flex-1 text-xs"
                            >
                                <Icon name="help-circle" size={14} className="mr-1" />
                                Learn More
                            </Button>
                        )}
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={onDismiss}
                            className="flex-1 text-xs"
                        >
                            Dismiss
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

/**
 * Error Container Component
 * Manages multiple error messages
 */
export interface ErrorContainerProps {
    errors: ErrorContext[];
    onDismissError?: (errorCode: string) => void;
    onLearnMore?: (url: string) => void;
    className?: string;
}

export function ErrorContainer({
    errors,
    onDismissError,
    onLearnMore,
    className = '',
}: ErrorContainerProps) {
    if (errors.length === 0) {
        return null;
    }

    return (
        <div className={`space-y-2 ${className}`}>
            {errors.map((error) => (
                <ErrorMessage
                    key={error.code}
                    error={error}
                    onDismiss={() => onDismissError?.(error.code)}
                    onLearnMore={() => error.learnMoreUrl && onLearnMore?.(error.learnMoreUrl)}
                />
            ))}
        </div>
    );
}
