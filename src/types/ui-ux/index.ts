/**
 * UI/UX Type Definitions for Network Simulator
 * Defines all TypeScript interfaces for the student-focused UI/UX improvements
 */

/**
 * Device type enumeration
 */
export type DeviceType = 'pc' | 'router' | 'switch' | 'iot' | 'firewall' | 'loadbalancer';

/**
 * Device status enumeration
 */
export type DeviceStatus = 'online' | 'offline';

/**
 * Connection type enumeration
 */
export type ConnectionType = 'ethernet' | 'wireless' | 'serial';

/**
 * Connection status enumeration
 */
export type ConnectionStatus = 'active' | 'inactive';

/**
 * Learning mode enumeration
 */
export type LearningMode = 'beginner' | 'intermediate' | 'advanced';

/**
 * Achievement category enumeration
 */
export type AchievementCategory =
    | 'network-basics'
    | 'advanced-concepts'
    | 'speed-challenges'
    | 'creative-builds'
    | 'troubleshooting';

/**
 * Device configuration interface
 * Represents the complete configuration of a network device
 */
export interface DeviceConfig {
    // Identification
    id: string;
    type: DeviceType;
    name: string;

    // Position on canvas
    position: {
        x: number;
        y: number;
    };

    // Device status
    status: DeviceStatus;

    // Network configuration
    network: {
        ipv4?: string;
        ipv6?: string;
        subnet?: string;
        gateway?: string;
        dns?: string[];
        dhcp?: {
            enabled: boolean;
            server?: boolean;
            startIP?: string;
            endIP?: string;
            leaseTime?: number; // in hours
        };
    };

    // Device-specific configuration
    macAddress?: string;
    ports?: Port[];

    // UI state
    isSelected: boolean;
    isHighlighted: boolean;
}

/**
 * Port interface for device ports
 */
export interface Port {
    id: string;
    name: string;
    type: 'ethernet' | 'wireless' | 'serial';
    status: 'available' | 'connected';
    connectedTo?: string; // Connection ID
}

/**
 * Connection interface
 * Represents a connection between two devices
 */
export interface Connection {
    id: string;
    sourceDeviceId: string;
    sourcePortId?: string;
    targetDeviceId: string;
    targetPortId?: string;
    type: ConnectionType;
    status: ConnectionStatus;
    createdAt: Date;
}

/**
 * Network state interface
 * Represents the complete state of a network
 */
export interface NetworkState {
    // Network data
    devices: DeviceConfig[];
    connections: Connection[];

    // Metadata
    metadata: {
        name: string;
        description?: string;
        createdAt: Date;
        lastModified: Date;
        mode: LearningMode;
    };
}

/**
 * Achievement interface
 * Represents a single achievement/badge
 */
export interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: AchievementCategory;

    // Requirement to unlock
    requirement: {
        type: 'task-completion' | 'xp-threshold' | 'streak' | 'challenge';
        value: number;
    };

    // Reward for unlocking
    reward: {
        xp: number;
        badge?: string;
    };

    // Unlock status
    unlockedAt?: Date;
    isUnlocked: boolean;
}

/**
 * Student progress interface
 * Tracks a student's progress and achievements
 */
export interface StudentProgress {
    studentId: string;
    level: number; // 1-10
    totalXP: number;
    achievements: Achievement[];
    tasksCompleted: number;
    streakDays: number;
    lastActivityDate: Date;
    createdAt: Date;
}

/**
 * Responsive breakpoint interface
 */
export interface ResponsiveBreakpoint {
    mobile: number; // < 768px
    tablet: number; // 768px - 1024px
    desktop: number; // > 1024px
}

/**
 * Color palette interface
 */
export interface ColorPalette {
    primary: {
        blue: string;
        green: string;
        orange: string;
        red: string;
        purple: string;
    };
    secondary: {
        lightBlue: string;
        lightGreen: string;
        lightOrange: string;
        lightRed: string;
        lightPurple: string;
    };
    neutral: {
        darkGray: string;
        mediumGray: string;
        lightGray: string;
        white: string;
        black: string;
    };
    highContrast?: {
        text: string;
        background: string;
        border: string;
    };
}

/**
 * Typography scale interface
 */
export interface TypographyScale {
    h1: {
        size: number;
        weight: number;
        lineHeight: number;
    };
    h2: {
        size: number;
        weight: number;
        lineHeight: number;
    };
    h3: {
        size: number;
        weight: number;
        lineHeight: number;
    };
    body: {
        size: number;
        weight: number;
        lineHeight: number;
    };
    small: {
        size: number;
        weight: number;
        lineHeight: number;
    };
    tiny: {
        size: number;
        weight: number;
        lineHeight: number;
    };
}

/**
 * UI/UX configuration interface
 * Combines all design system elements
 */
export interface UIUXConfig {
    colors: ColorPalette;
    typography: TypographyScale;
    breakpoints: ResponsiveBreakpoint;
    spacing: {
        xs: number;
        sm: number;
        md: number;
        lg: number;
        xl: number;
    };
}

/**
 * Guided mode step interface
 */
export interface GuidedModeStep {
    id: string;
    stepNumber: number;
    totalSteps: number;
    title: string;
    description: string;
    targetElement?: string; // CSS selector for highlighting
    hints: {
        level1: string; // General guidance
        level2: string; // More specific
        level3: string; // Near solution
    };
}

/**
 * Tooltip content interface
 */
export interface TooltipContent {
    title?: string;
    description: string;
    examples?: string[];
    learnMore?: string; // URL or link
}

/**
 * Error context interface
 */
export interface ErrorContext {
    code: string;
    message: string;
    category: 'configuration' | 'connection' | 'file' | 'simulation' | 'validation' | 'system';
    suggestions: string[];
    learnMoreUrl?: string;
    timestamp: Date;
    context?: Record<string, unknown>;
    recoverable?: boolean;
}
