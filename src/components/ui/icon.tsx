/**
 * Icon Component System
 * Provides a unified interface for icons throughout the application
 * Uses lucide-react as the icon library
 */

import { logger } from '@/lib/logger';
import React from 'react';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Icon size constants (in pixels)
 */
export const ICON_SIZES = {
    xs: 16,
    sm: 20,
    md: 24,
    lg: 32,
    xl: 40,
    '2xl': 48,
} as const;

export type IconSize = keyof typeof ICON_SIZES;

/**
 * Device icon names
 */
export const DEVICE_ICONS = {
    pc: 'Monitor',
    router: 'Router',
    switch: 'Network',
    iot: 'Smartphone',
    wireless: 'Wifi',
    firewall: 'Shield',
    loadbalancer: 'Zap',
    server: 'Server',
    database: 'Database',
    cloud: 'Cloud',
} as const;

export type DeviceIconName = keyof typeof DEVICE_ICONS;

/**
 * Action icon names
 */
export const ACTION_ICONS = {
    add: 'Plus',
    delete: 'Trash2',
    edit: 'Pencil',
    settings: 'Settings',
    help: 'HelpCircle',
    ping: 'Radio',
    connect: 'Link2',
    disconnect: 'Unlink',
    save: 'Save',
    load: 'Upload',
    export: 'Download',
    import: 'UploadCloud',
    search: 'Search',
    filter: 'Filter',
    sort: 'ArrowUpDown',
    refresh: 'RefreshCw',
    close: 'X',
    menu: 'Menu',
    chevronUp: 'ChevronUp',
    chevronDown: 'ChevronDown',
    chevronLeft: 'ChevronLeft',
    chevronRight: 'ChevronRight',
    arrowUp: 'ArrowUp',
    arrowDown: 'ArrowDown',
    arrowLeft: 'ArrowLeft',
    arrowRight: 'ArrowRight',
    check: 'Check',
    alert: 'AlertCircle',
    info: 'Info',
    warning: 'AlertTriangle',
    error: 'AlertOctagon',
    success: 'CheckCircle',
    loading: 'Loader',
    eye: 'Eye',
    eyeOff: 'EyeOff',
    copy: 'Copy',
    paste: 'Clipboard',
    undo: 'RotateCcw',
    redo: 'RotateCw',
    zoomIn: 'ZoomIn',
    zoomOut: 'ZoomOut',
    maximize: 'Maximize2',
    minimize: 'Minimize2',
    fullscreen: 'Maximize',
    exitFullscreen: 'Minimize',
    play: 'Play',
    pause: 'Pause',
    stop: 'Square',
    fastForward: 'SkipForward',
    rewind: 'SkipBack',
    volume: 'Volume2',
    volumeMute: 'VolumeX',
    bell: 'Bell',
    star: 'Star',
    heart: 'Heart',
    thumbsUp: 'ThumbsUp',
    thumbsDown: 'ThumbsDown',
    share: 'Share2',
    lock: 'Lock',
    unlock: 'Unlock',
    key: 'Key',
    user: 'User',
    users: 'Users',
    home: 'Home',
    folder: 'Folder',
    file: 'File',
    fileText: 'FileText',
    calendar: 'Calendar',
    clock: 'Clock',
    mail: 'Mail',
    phone: 'Phone',
    globe: 'Globe',
    map: 'Map',
    navigation: 'Navigation',
    target: 'Target',
    activity: 'Activity',
    trending: 'TrendingUp',
    barChart: 'BarChart3',
    pieChart: 'PieChart',
    lineChart: 'LineChart',
    code: 'Code',
    terminal: 'Terminal',
    git: 'GitBranch',
    github: 'Github',
    gitlab: 'GitlabIcon',
    package: 'Package',
    layers: 'Layers',
    grid: 'Grid',
    list: 'List',
    layout: 'Layout',
    sidebar: 'Sidebar',
    sun: 'Sun',
    moon: 'Moon',
    cloud: 'Cloud',
    cloudRain: 'CloudRain',
    wind: 'Wind',
    droplet: 'Droplet',
    thermometer: 'Thermometer',
    battery: 'Battery',
    power: 'Power',
    plug: 'Plug',
    cpu: 'Cpu',
    hardDrive: 'HardDrive',
    memory: 'Zap',
    wifi: 'Wifi',
    wifiOff: 'WifiOff',
    bluetooth: 'Bluetooth',
    signal: 'Signal',
    signalOff: 'SignalOff',
    cast: 'Cast',
    airplay: 'Airplay',
    cast2: 'Cast',
    tv: 'Tv',
    monitor: 'Monitor',
    tablet: 'Tablet',
    smartphone: 'Smartphone',
    watch: 'Watch',
    headphones: 'Headphones',
    camera: 'Camera',
    video: 'Video',
    music: 'Music',
    radio: 'Radio',
    mic: 'Mic',
    micOff: 'MicOff',
    speaker: 'Speaker',
    speakerOff: 'SpeakerOff',
    gamepad2: 'Gamepad2',
    joystick: 'Joystick',
    dices: 'Dices',
    dice: 'Dice1',
    trophy: 'Trophy',
    award: 'Award',
    medal: 'Medal',
    badge: 'Badge',
    ribbon: 'Ribbon',
    gift: 'Gift',
    box: 'Box',
    inbox: 'Inbox',
    send: 'Send',
    reply: 'Reply',
    replyAll: 'ReplyAll',
    forward: 'Forward',
    trash: 'Trash2',
    trashOff: 'TrashOff',
    archive: 'Archive',
    inbox2: 'Inbox',
    inbox3: 'Inbox',
    inbox4: 'Inbox',
    inbox5: 'Inbox',
    inbox6: 'Inbox',
    inbox7: 'Inbox',
    inbox8: 'Inbox',
    inbox9: 'Inbox',
    inbox10: 'Inbox',
} as const;

export type ActionIconName = keyof typeof ACTION_ICONS;

/**
 * Status icon names
 */
export const STATUS_ICONS = {
    online: 'CheckCircle',
    offline: 'AlertCircle',
    idle: 'Clock',
    busy: 'AlertTriangle',
    away: 'Moon',
    dnd: 'Ban',
    connected: 'Link2',
    disconnected: 'Unlink',
    active: 'Activity',
    inactive: 'Pause',
    success: 'CheckCircle',
    error: 'AlertOctagon',
    warning: 'AlertTriangle',
    info: 'Info',
    pending: 'Loader',
    loading: 'Loader',
    syncing: 'RefreshCw',
    synced: 'Check',
    failed: 'X',
    retry: 'RotateCcw',
} as const;

export type StatusIconName = keyof typeof STATUS_ICONS;

/**
 * Icon component props
 */
interface IconProps extends Omit<React.SVGAttributes<SVGElement>, 'fill'> {
    name: string;
    size?: IconSize | number;
    className?: string;
    strokeWidth?: number;
    fill?: boolean;
    color?: string;
}

/**
 * Generic Icon Component
 * Renders any lucide-react icon by name
 */
export const Icon = React.forwardRef<SVGSVGElement, IconProps>(
    (
        {
            name,
            size = 'md',
            className,
            strokeWidth = 2,
            fill = false,
            color,
            ...props
        },
        ref
    ) => {
        // Get the icon component from lucide-react
        const IconComponent = (LucideIcons as any)[name];

        if (!IconComponent) {
            logger.warn(`Icon "${name}" not found in lucide-react`);
            return null;
        }

        // Calculate pixel size
        const pixelSize =
            typeof size === 'number' ? size : ICON_SIZES[size as IconSize];

        return (
            <IconComponent
                ref={ref}
                size={pixelSize}
                strokeWidth={strokeWidth}
                className={cn(
                    'inline-block',
                    fill && 'fill-current',
                    className
                )}
                style={{
                    color: color,
                }}
                {...props}
            />
        );
    }
);
Icon.displayName = 'Icon';

/**
 * Device Icon Component
 * Renders device-specific icons
 */
interface DeviceIconProps extends Omit<IconProps, 'name'> {
    deviceType: DeviceIconName;
}

export const DeviceIcon = React.forwardRef<SVGSVGElement, DeviceIconProps>(
    ({ deviceType, size = 'md', ...props }, ref) => {
        const iconName = DEVICE_ICONS[deviceType];
        return (
            <Icon
                ref={ref}
                name={iconName}
                size={size}
                {...props}
            />
        );
    }
);
DeviceIcon.displayName = 'DeviceIcon';

/**
 * Action Icon Component
 * Renders action-specific icons
 */
interface ActionIconProps extends Omit<IconProps, 'name'> {
    action: ActionIconName;
}

export const ActionIcon = React.forwardRef<SVGSVGElement, ActionIconProps>(
    ({ action, size = 'md', ...props }, ref) => {
        const iconName = ACTION_ICONS[action];
        return (
            <Icon
                ref={ref}
                name={iconName}
                size={size}
                {...props}
            />
        );
    }
);
ActionIcon.displayName = 'ActionIcon';

/**
 * Status Icon Component
 * Renders status-specific icons
 */
interface StatusIconProps extends Omit<IconProps, 'name'> {
    status: StatusIconName;
}

export const StatusIcon = React.forwardRef<SVGSVGElement, StatusIconProps>(
    ({ status, size = 'md', ...props }, ref) => {
        const iconName = STATUS_ICONS[status];
        return (
            <Icon
                ref={ref}
                name={iconName}
                size={size}
                {...props}
            />
        );
    }
);
StatusIcon.displayName = 'StatusIcon';

/**
 * Icon Button Component
 * Button with icon and optional label
 */
interface IconButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    icon: string;
    label?: string;
    size?: IconSize;
    variant?: 'default' | 'ghost' | 'outline' | 'destructive';
}

export const IconButton = React.forwardRef<
    HTMLButtonElement,
    IconButtonProps
>(
    (
        {
            icon,
            label,
            size = 'md',
            variant = 'default',
            className,
            ...props
        },
        ref
    ) => {
        const variantClasses = {
            default: 'bg-blue-600 text-white hover:bg-blue-700',
            ghost: 'hover:bg-gray-100 text-gray-700',
            outline: 'border border-gray-300 hover:bg-gray-50',
            destructive: 'bg-red-600 text-white hover:bg-red-700',
        };

        return (
            <button
                ref={ref}
                className={cn(
                    'inline-flex items-center justify-center gap-2',
                    'px-3 py-2 rounded-md',
                    'transition-colors duration-200',
                    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    variantClasses[variant],
                    className
                )}
                {...props}
            >
                <Icon name={icon} size={size} />
                {label && <span>{label}</span>}
            </button>
        );
    }
);
IconButton.displayName = 'IconButton';

/**
 * Icon Badge Component
 * Icon with a badge (number or dot)
 */
interface IconBadgeProps extends IconProps {
    badge?: string | number;
    badgeColor?: string;
}

export const IconBadge = React.forwardRef<SVGSVGElement, IconBadgeProps>(
    ({ badge, badgeColor = 'bg-red-500', ...props }, ref) => {
        return (
            <div className="relative inline-block">
                <Icon ref={ref} {...props} />
                {badge !== undefined && (
                    <div
                        className={cn(
                            'absolute -top-2 -right-2',
                            'w-5 h-5 rounded-full',
                            'flex items-center justify-center',
                            'text-xs font-bold text-white',
                            badgeColor
                        )}
                    >
                        {badge}
                    </div>
                )}
            </div>
        );
    }
);
IconBadge.displayName = 'IconBadge';

/**
 * Icon Grid Component
 * Displays a grid of icons
 */
interface IconGridProps {
    icons: string[];
    size?: IconSize;
    columns?: number;
    gap?: number;
}

export const IconGrid: React.FC<IconGridProps> = ({
    icons,
    size = 'md',
    columns = 4,
    gap = 4,
}) => {
    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${columns}, 1fr)`,
                gap: `${gap}px`,
            }}
        >
            {icons.map((iconName) => (
                <div
                    key={iconName}
                    className="flex items-center justify-center p-2 rounded hover:bg-gray-100"
                >
                    <Icon name={iconName} size={size} />
                </div>
            ))}
        </div>
    );
};
IconGrid.displayName = 'IconGrid';
