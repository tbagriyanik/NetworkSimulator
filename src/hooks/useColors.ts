/**
 * useColors Hook
 * Provides access to color palette and utilities based on current theme
 */

import { useTheme } from '@/contexts/ThemeContext';
import { COLOR_PALETTE } from '@/constants/ui-ux';
import {
    lighten,
    darken,
    getContrastRatio,
    meetsWCAGAA,
    meetsWCAGAAA,
    getContrastingTextColor,
    blendColors,
    adjustSaturation,
    rotateHue,
    generateColorPalette,
    getColorBrightness,
} from '@/utils/colorUtils';

/**
 * Hook for accessing colors and color utilities
 * Automatically adjusts colors based on current theme
 */
export function useColors() {
    const { effectiveTheme } = useTheme();

    // Get the appropriate color palette based on theme
    const getColor = (colorPath: string): string => {
        const parts = colorPath.split('.');
        let color: any = COLOR_PALETTE;

        for (const part of parts) {
            color = color[part];
            if (!color) return '#000000';
        }

        return color;
    };

    // Get device type color
    const getDeviceColor = (deviceType: string): string => {
        const colorMap: Record<string, string> = {
            pc: COLOR_PALETTE.primary.blue,
            router: COLOR_PALETTE.primary.green,
            switch: COLOR_PALETTE.primary.orange,
            iot: COLOR_PALETTE.primary.purple,
            firewall: COLOR_PALETTE.primary.red,
            loadbalancer: COLOR_PALETTE.primary.blue,
        };

        return colorMap[deviceType] || COLOR_PALETTE.primary.blue;
    };

    // Get device status color
    const getStatusColor = (status: 'online' | 'offline'): string => {
        return status === 'online' ? COLOR_PALETTE.primary.green : COLOR_PALETTE.primary.red;
    };

    // Get connection type color
    const getConnectionColor = (connectionType: string): string => {
        const colorMap: Record<string, string> = {
            ethernet: COLOR_PALETTE.primary.blue,
            wireless: COLOR_PALETTE.primary.purple,
            serial: COLOR_PALETTE.primary.orange,
        };

        return colorMap[connectionType] || COLOR_PALETTE.primary.blue;
    };

    // Get semantic color
    const getSemanticColor = (semantic: 'success' | 'error' | 'warning' | 'info'): string => {
        const colorMap: Record<string, string> = {
            success: COLOR_PALETTE.primary.green,
            error: COLOR_PALETTE.primary.red,
            warning: COLOR_PALETTE.primary.orange,
            info: COLOR_PALETTE.primary.blue,
        };

        return colorMap[semantic] || COLOR_PALETTE.primary.blue;
    };

    // Get text color for a background
    const getTextColorForBackground = (bgColor: string): string => {
        return getContrastingTextColor(bgColor);
    };

    // Check if colors meet accessibility standards
    const checkContrast = (
        color1: string,
        color2: string,
        level: 'AA' | 'AAA' = 'AA',
        isLargeText: boolean = false
    ): boolean => {
        if (level === 'AA') {
            return meetsWCAGAA(color1, color2, isLargeText);
        } else {
            return meetsWCAGAAA(color1, color2, isLargeText);
        }
    };

    // Get contrast ratio between two colors
    const getContrast = (color1: string, color2: string): number => {
        return getContrastRatio(color1, color2);
    };

    // Color manipulation utilities
    const colorUtils = {
        lighten,
        darken,
        blend: blendColors,
        adjustSaturation,
        rotateHue,
        generatePalette: generateColorPalette,
        getBrightness: getColorBrightness,
    };

    return {
        // Color palette access
        palette: COLOR_PALETTE,
        theme: effectiveTheme,

        // Color getters
        getColor,
        getDeviceColor,
        getStatusColor,
        getConnectionColor,
        getSemanticColor,
        getTextColorForBackground,

        // Accessibility
        checkContrast,
        getContrast,

        // Utilities
        ...colorUtils,
    };
}
