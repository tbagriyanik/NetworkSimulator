/**
 * Icon Utilities
 * Helper functions for icon management and styling
 */

import { ICON_SIZES, DEVICE_ICONS, ACTION_ICONS, STATUS_ICONS } from '@/components/ui/icon';

/**
 * Get icon size in pixels
 */
export function getIconSize(size: keyof typeof ICON_SIZES | number): number {
    if (typeof size === 'number') {
        return size;
    }
    return ICON_SIZES[size];
}

/**
 * Get device icon name by device type
 */
export function getDeviceIconName(deviceType: string): string {
    return (DEVICE_ICONS as any)[deviceType] || 'HelpCircle';
}

/**
 * Get action icon name by action type
 */
export function getActionIconName(action: string): string {
    return (ACTION_ICONS as any)[action] || 'HelpCircle';
}

/**
 * Get status icon name by status type
 */
export function getStatusIconName(status: string): string {
    return (STATUS_ICONS as any)[status] || 'HelpCircle';
}

/**
 * Get icon color by device type
 */
export function getDeviceIconColor(deviceType: string): string {
    const colorMap: Record<string, string> = {
        pc: '#0066FF',
        router: '#00CC66',
        switch: '#FF9900',
        iot: '#9933FF',
        firewall: '#FF3333',
        loadbalancer: '#0066FF',
        server: '#0066FF',
        database: '#FF9900',
        cloud: '#0066FF',
    };
    return colorMap[deviceType] || '#666666';
}

/**
 * Get icon color by status
 */
export function getStatusIconColor(status: string): string {
    const colorMap: Record<string, string> = {
        online: '#00CC66',
        offline: '#FF3333',
        idle: '#FF9900',
        busy: '#FF3333',
        away: '#FF9900',
        dnd: '#FF3333',
        connected: '#00CC66',
        disconnected: '#FF3333',
        active: '#00CC66',
        inactive: '#666666',
        success: '#00CC66',
        error: '#FF3333',
        warning: '#FF9900',
        info: '#0066FF',
        pending: '#FF9900',
        loading: '#0066FF',
        syncing: '#0066FF',
        synced: '#00CC66',
        failed: '#FF3333',
        retry: '#FF9900',
    };
    return colorMap[status] || '#666666';
}

/**
 * Get icon CSS class by size
 */
export function getIconSizeClass(size: keyof typeof ICON_SIZES): string {
    const classMap: Record<keyof typeof ICON_SIZES, string> = {
        xs: 'w-4 h-4',
        sm: 'w-5 h-5',
        md: 'w-6 h-6',
        lg: 'w-8 h-8',
        xl: 'w-10 h-10',
        '2xl': 'w-12 h-12',
    };
    return classMap[size];
}

/**
 * Get icon CSS classes for styling
 */
export function getIconClasses(
    size: keyof typeof ICON_SIZES = 'md',
    color?: string,
    className?: string
): string {
    const sizeClass = getIconSizeClass(size);
    const colorClass = color ? `text-[${color}]` : '';
    return [sizeClass, colorClass, className].filter(Boolean).join(' ');
}

/**
 * Check if icon exists in lucide-react
 */
export function isValidIconName(name: string): boolean {
    // This is a simple check - in production, you might want to maintain a list
    // of all available lucide-react icons
    if (!name || name.length === 0) return false;
    return /^[A-Z][a-zA-Z0-9]*$/.test(name);
}

/**
 * Get all device icon names
 */
export function getAllDeviceIcons(): string[] {
    return Object.keys(DEVICE_ICONS);
}

/**
 * Get all action icon names
 */
export function getAllActionIcons(): string[] {
    return Object.keys(ACTION_ICONS);
}

/**
 * Get all status icon names
 */
export function getAllStatusIcons(): string[] {
    return Object.keys(STATUS_ICONS);
}

/**
 * Get icon by category and name
 */
export function getIconByCategory(
    category: 'device' | 'action' | 'status',
    name: string
): string | null {
    const maps = {
        device: DEVICE_ICONS,
        action: ACTION_ICONS,
        status: STATUS_ICONS,
    };

    const map = maps[category] as any;
    return map[name] || null;
}

/**
 * Create icon CSS for inline styling
 */
export function createIconCSS(
    size: keyof typeof ICON_SIZES = 'md',
    color?: string
): React.CSSProperties {
    const pixelSize = ICON_SIZES[size];
    return {
        width: `${pixelSize}px`,
        height: `${pixelSize}px`,
        display: 'inline-block',
        color: color,
    };
}

/**
 * Get icon accessibility label
 */
export function getIconAccessibilityLabel(
    category: 'device' | 'action' | 'status',
    name: string
): string {
    const labels: Record<string, Record<string, string>> = {
        device: {
            pc: 'Personal Computer',
            router: 'Network Router',
            switch: 'Network Switch',
            iot: 'IoT Device',
            wireless: 'Wireless Router',
            firewall: 'Firewall',
            loadbalancer: 'Load Balancer',
            server: 'Server',
            database: 'Database',
            cloud: 'Cloud Service',
        },
        action: {
            add: 'Add',
            delete: 'Delete',
            edit: 'Edit',
            settings: 'Settings',
            help: 'Help',
            ping: 'Ping',
            connect: 'Connect',
            disconnect: 'Disconnect',
            save: 'Save',
            load: 'Load',
            export: 'Export',
            import: 'Import',
            search: 'Search',
            filter: 'Filter',
            sort: 'Sort',
            refresh: 'Refresh',
            close: 'Close',
            menu: 'Menu',
        },
        status: {
            online: 'Online',
            offline: 'Offline',
            idle: 'Idle',
            busy: 'Busy',
            away: 'Away',
            dnd: 'Do Not Disturb',
            connected: 'Connected',
            disconnected: 'Disconnected',
            active: 'Active',
            inactive: 'Inactive',
            success: 'Success',
            error: 'Error',
            warning: 'Warning',
            info: 'Information',
            pending: 'Pending',
            loading: 'Loading',
            syncing: 'Syncing',
            synced: 'Synced',
            failed: 'Failed',
            retry: 'Retry',
        },
    };

    return labels[category]?.[name] || name;
}
