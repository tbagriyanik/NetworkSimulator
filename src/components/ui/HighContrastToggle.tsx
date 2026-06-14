/**
 * High Contrast Mode Toggle Component
 * Allows users to enable/disable high-contrast mode for accessibility
 */

'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';
import { useEffect, useState } from 'react';

interface HighContrastToggleProps {
    /**
     * Optional CSS class for styling
     */
    className?: string;

    /**
     * Optional label text
     */
    label?: string;

    /**
     * Optional callback when contrast mode changes
     */
    onChange?: (isHighContrast: boolean) => void;

    /**
     * Whether to show label text
     */
    showLabel?: boolean;

    /**
     * Size of the button
     */
    size?: 'sm' | 'md' | 'lg';
}

/**
 * High Contrast Toggle Component
 * Provides a button to toggle high-contrast mode for accessibility
 */
export function HighContrastToggle({
    className = '',
    label = 'High Contrast',
    onChange,
    showLabel = true,
    size = 'md',
}: HighContrastToggleProps) {
    const { theme, setTheme } = useTheme();
    const [isHighContrast, setIsHighContrast] = useState(false);

    // Initialize high contrast state
    useEffect(() => {
        const isHC = theme === 'high-contrast';
        setTimeout(() => setIsHighContrast(isHC), 0);
    }, [theme]);

    const handleToggle = () => {
        const newTheme = theme === 'high-contrast' ? 'dark' : 'high-contrast';
        setTheme(newTheme);
        setIsHighContrast(newTheme === 'high-contrast');
        onChange?.(newTheme === 'high-contrast');
    };

    const sizeClasses = {
        sm: 'h-8 w-8 text-sm',
        md: 'h-10 w-10 text-base',
        lg: 'h-12 w-12 text-lg',
    };

    const iconSize = {
        sm: 16,
        md: 20,
        lg: 24,
    };

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <Button
                onClick={handleToggle}
                variant="outline"
                size="icon"
                className={`${sizeClasses[size]} transition-colors duration-200`}
                aria-label={`${isHighContrast ? 'Disable' : 'Enable'} high contrast mode`}
                aria-pressed={isHighContrast}
                title={`${isHighContrast ? 'Disable' : 'Enable'} high contrast mode`}
            >
                {isHighContrast ? (
                    <Eye size={iconSize[size]} className="text-primary" />
                ) : (
                    <EyeOff size={iconSize[size]} className="text-muted-foreground" />
                )}
            </Button>

            {showLabel && (
                <span
                    className={`text-sm font-medium transition-colors duration-200 ${isHighContrast ? 'text-primary font-semibold' : 'text-muted-foreground'
                        }`}
                >
                    {label}
                </span>
            )}
        </div>
    );
}

export default HighContrastToggle;
