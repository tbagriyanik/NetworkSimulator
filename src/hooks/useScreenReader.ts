/**
 * Screen Reader Support Hook
 * Provides accessibility features for screen readers
 *
 * **Validates: Requirements 7.2, 7.5**
 */

'use client';

import { useCallback, useRef, useEffect, useState } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface AriaLabelProps {
    'aria-label'?: string;
    'aria-labelledby'?: string;
    'aria-describedby'?: string;
}

export interface AriaLiveProps {
    'aria-live'?: 'polite' | 'assertive' | 'off';
    'aria-atomic'?: boolean;
    'aria-relevant'?: 'additions' | 'removals' | 'text' | 'all';
}

export interface ScreenReaderAnnouncement {
    message: string;
    priority?: 'polite' | 'assertive';
    id?: string;
}

export interface DeviceAriaProps {
    deviceName: string;
    deviceType: string;
    status: string;
    ipAddress?: string;
    connectionCount: number;
    isSelected: boolean;
}

export interface ConnectionAriaProps {
    sourceName: string;
    targetName: string;
    connectionType: string;
    status: string;
}

// ============================================================================
// Hook: Screen Reader Announcements
// ============================================================================

export function useScreenReaderAnnouncer() {
    const announcementId = useRef(0);

    const announce = useCallback((
        message: string,
        priority: 'polite' | 'assertive' = 'polite'
    ): string => {
        const id = `sr-announcement-${++announcementId.current}`;

        // Create announcement event
        const event = new CustomEvent('sr-announce', {
            detail: {
                id,
                message,
                priority,
                timestamp: Date.now(),
            },
        });

        window.dispatchEvent(event);

        return id;
    }, []);

    const announceDeviceAdded = useCallback((deviceName: string, deviceType: string) => {
        return announce(`${deviceType} named ${deviceName} has been added to the network.`, 'polite');
    }, [announce]);

    const announceDeviceRemoved = useCallback((deviceName: string) => {
        return announce(`${deviceName} has been removed from the network.`, 'polite');
    }, [announce]);

    const announceConnectionCreated = useCallback((
        sourceName: string,
        targetName: string,
        connectionType: string
    ) => {
        return announce(
            `New ${connectionType} connection created between ${sourceName} and ${targetName}.`,
            'polite'
        );
    }, [announce]);

    const announceConnectionRemoved = useCallback((sourceName: string, targetName: string) => {
        return announce(`Connection between ${sourceName} and ${targetName} has been removed.`, 'polite');
    }, [announce]);

    const announcePingResult = useCallback((
        sourceName: string,
        targetName: string,
        success: boolean,
        responseTime?: number
    ) => {
        if (success) {
            return announce(
                `Ping from ${sourceName} to ${targetName} successful. Response time ${responseTime?.toFixed(1)} milliseconds.`,
                'polite'
            );
        } else {
            return announce(
                `Ping from ${sourceName} to ${targetName} failed.`,
                'assertive'
            );
        }
    }, [announce]);

    const announceConfigurationSaved = useCallback((deviceName: string) => {
        return announce(`Configuration for ${deviceName} has been saved.`, 'polite');
    }, [announce]);

    const announceError = useCallback((errorMessage: string) => {
        return announce(`Error: ${errorMessage}`, 'assertive');
    }, [announce]);

    const announceAchievementUnlocked = useCallback((achievementName: string) => {
        return announce(
            `Achievement unlocked! ${achievementName}. Congratulations!`,
            'assertive'
        );
    }, [announce]);

    const announceLevelUp = useCallback((level: number) => {
        return announce(
            `Level up! You are now level ${level}. Great progress!`,
            'assertive'
        );
    }, [announce]);

    return {
        announce,
        announceDeviceAdded,
        announceDeviceRemoved,
        announceConnectionCreated,
        announceConnectionRemoved,
        announcePingResult,
        announceConfigurationSaved,
        announceError,
        announceAchievementUnlocked,
        announceLevelUp,
    };
}

// ============================================================================
// ARIA Label Generators
// ============================================================================

export function generateDeviceAriaLabel(props: DeviceAriaProps): string {
    const parts = [
        props.deviceName,
        props.deviceType,
        props.status === 'online' ? 'online' : 'offline',
    ];

    if (props.ipAddress) {
        parts.push(`IP address ${props.ipAddress}`);
    }

    parts.push(`${props.connectionCount} connection${props.connectionCount > 1 ? 's' : ''}`);

    if (props.isSelected) {
        parts.push('selected');
    }

    return parts.join(', ');
}

export function generateConnectionAriaLabel(props: ConnectionAriaProps): string {
    return `Connection from ${props.sourceName} to ${props.targetName}, type ${props.connectionType}, status ${props.status}`;
}

export function generateButtonAriaLabel(
    action: string,
    target?: string,
    shortcut?: string
): string {
    let label = action;

    if (target) {
        label += ` ${target}`;
    }

    if (shortcut) {
        label += `, keyboard shortcut ${shortcut}`;
    }

    return label;
}

export function generateFormFieldAriaLabel(
    label: string,
    required?: boolean,
    error?: string,
    hint?: string
): AriaLabelProps {
    const props: AriaLabelProps = {
        'aria-label': label,
    };

    if (required) {
        props['aria-label'] += ', required';
    }

    if (error) {
        props['aria-describedby'] = 'error-message';
    } else if (hint) {
        props['aria-describedby'] = 'hint-message';
    }

    return props;
}

// ============================================================================
// Hook: ARIA Live Region
// ============================================================================

export function useAriaLiveRegion(priority: 'polite' | 'assertive' = 'polite') {
    const regionRef = useRef<HTMLDivElement>(null);
    const [message, setMessageState] = useState('');

    const setMessage = useCallback((message: string) => {
        setMessageState(message);

        if (regionRef.current) {
            regionRef.current.textContent = message;
        }
    }, []);

    const clearMessage = useCallback(() => {
        setMessageState('');

        if (regionRef.current) {
            regionRef.current.textContent = '';
        }
    }, []);

    const ariaProps: AriaLiveProps = {
        'aria-live': priority,
        'aria-atomic': true,
        'aria-relevant': 'additions',
    };

    return {
        regionRef,
        message,
        setMessage,
        clearMessage,
        ariaProps,
    };
}

// ============================================================================
// Component: Screen Reader Only (visually hidden but accessible)
// ============================================================================

export function getScreenReaderOnlyProps(): React.HTMLAttributes<HTMLSpanElement> {
    return {
        className: 'sr-only',
        style: {
            position: 'absolute',
            width: '1px',
            height: '1px',
            padding: '0',
            margin: '-1px',
            overflow: 'hidden',
            clip: 'rect(0, 0, 0, 0)',
            whiteSpace: 'nowrap',
            borderWidth: '0',
        },
    };
}

// ============================================================================
// Utility Functions
// ============================================================================

export function validateAriaLabel(label?: string, labelledBy?: string): boolean {
    // Must have either aria-label or aria-labelledby
    return !!(label || labelledBy);
}

export function generateUniqueId(prefix: string = 'aria'): string {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

export function combineAriaDescribedBy(...ids: (string | undefined)[]): string | undefined {
    const validIds = ids.filter(Boolean) as string[];
    return validIds.length > 0 ? validIds.join(' ') : undefined;
}

export function createAriaDescriptionId(baseId: string, type: 'description' | 'error' | 'hint'): string {
    return `${baseId}-${type}`;
}

// ============================================================================
// ARIA Patterns
// ============================================================================

export function createToggleButtonAriaProps(
    isPressed: boolean,
    label: string
): AriaLabelProps & { 'aria-pressed': boolean; role: 'button' } {
    return {
        'aria-label': label,
        'aria-pressed': isPressed,
        role: 'button',
    };
}

export function createExpandableAriaProps(
    isExpanded: boolean,
    label: string,
    controlsId: string
): AriaLabelProps & { 'aria-expanded': boolean; 'aria-controls': string } {
    return {
        'aria-label': label,
        'aria-expanded': isExpanded,
        'aria-controls': controlsId,
    };
}

export function createListboxAriaProps(
    label: string,
    selectedCount: number,
    totalCount: number
): AriaLabelProps & { role: 'listbox'; 'aria-multiselectable'?: boolean } {
    return {
        'aria-label': `${label}, ${selectedCount} of ${totalCount} selected`,
        role: 'listbox',
        'aria-multiselectable': true,
    };
}

export function createTabPanelAriaProps(
    label: string,
    isActive: boolean
): AriaLabelProps & { role: 'tabpanel'; 'aria-hidden'?: boolean } {
    return {
        'aria-label': label,
        role: 'tabpanel',
        'aria-hidden': !isActive,
    };
}

export function createMenuItemAriaProps(
    label: string,
    hasSubmenu?: boolean,
    isChecked?: boolean
): AriaLabelProps & { role: 'menuitem' | 'menuitemcheckbox'; 'aria-haspopup'?: boolean; 'aria-checked'?: boolean } {
    return {
        'aria-label': label,
        role: hasSubmenu || isChecked !== undefined ? 'menuitemcheckbox' : 'menuitem',
        'aria-haspopup': hasSubmenu,
        'aria-checked': isChecked,
    };
}

// ============================================================================
// Screen Reader Status
// ============================================================================

export function useScreenReaderStatus() {
    const [isScreenReaderActive, setIsScreenReaderActive] = useState(false);

    useEffect(() => {
        // Detect if a screen reader is likely active
        // This is a heuristic based on various indicators

        const checkScreenReader = () => {
            const indicators = [
                // Check for reduced motion preference (often enabled with screen readers)
                window.matchMedia('(prefers-reduced-motion: reduce)').matches,
                // Check for high contrast mode
                window.matchMedia('(prefers-contrast: high)').matches,
            ];

            // If 2+ indicators are true, likely a screen reader is active
            const activeIndicators = indicators.filter(Boolean).length;
            setIsScreenReaderActive(activeIndicators >= 1);
        };

        checkScreenReader();

        // Listen for changes
        const motionMedia = window.matchMedia('(prefers-reduced-motion: reduce)');
        const contrastMedia = window.matchMedia('(prefers-contrast: high)');

        motionMedia.addEventListener('change', checkScreenReader);
        contrastMedia.addEventListener('change', checkScreenReader);

        return () => {
            motionMedia.removeEventListener('change', checkScreenReader);
            contrastMedia.removeEventListener('change', checkScreenReader);
        };
    }, []);

    return isScreenReaderActive;
}

// ============================================================================
// Export
// ============================================================================

export default useScreenReaderAnnouncer;
