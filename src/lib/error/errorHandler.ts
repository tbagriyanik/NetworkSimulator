/**
 * Error Handling System
 * Student-friendly error handling with context preservation and recovery suggestions
 *
 * **Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5**
 */

import type { ErrorContext } from '@/types/ui-ux';

export type { ErrorContext };

// ============================================================================
// Error Categories and Types
// ============================================================================

export type ErrorCategory = 'configuration' | 'connection' | 'file' | 'simulation' | 'validation' | 'system';

export interface ErrorOptions {
    category: ErrorCategory;
    code: string;
    message: string;
    context?: Record<string, unknown>;
    suggestions?: string[];
    learnMoreUrl?: string;
    recoverable?: boolean;
    originalError?: Error;
}

// ============================================================================
// Error Factory Functions
// ============================================================================

/**
 * Create a student-friendly error with context and suggestions
 */
export function createError(options: ErrorOptions): ErrorContext {
    return {
        category: options.category,
        code: options.code,
        message: options.message,
        timestamp: new Date(),
        context: options.context || {},
        suggestions: options.suggestions || getDefaultSuggestions(options.category),
        learnMoreUrl: options.learnMoreUrl || getDefaultLearnMoreUrl(options.category, options.code),
        recoverable: options.recoverable ?? true,
    };
}

/**
 * Create configuration error
 */
export function createConfigurationError(
    code: string,
    message: string,
    context?: Record<string, unknown>,
    suggestions?: string[]
): ErrorContext {
    return createError({
        category: 'configuration',
        code: `CONFIG_${code}`,
        message,
        context,
        suggestions: suggestions || [
            'Double-check your IP address format (e.g., 192.168.1.1)',
            'Verify the subnet mask is correct (e.g., 255.255.255.0)',
            'Ensure the gateway is in the same network as the device',
        ],
        learnMoreUrl: '/help/configuration-errors',
    });
}

/**
 * Create connection error
 */
export function createConnectionError(
    code: string,
    message: string,
    context?: Record<string, unknown>,
    suggestions?: string[]
): ErrorContext {
    return createError({
        category: 'connection',
        code: `CONN_${code}`,
        message,
        context,
        suggestions: suggestions || [
            'Check if both devices are powered on',
            'Verify the connection type is compatible',
            'Ensure the ports are not already in use',
            'Check if devices are within range (for wireless)',
        ],
        learnMoreUrl: '/help/connection-errors',
    });
}

/**
 * Create file operation error
 */
export function createFileError(
    code: string,
    message: string,
    context?: Record<string, unknown>,
    suggestions?: string[]
): ErrorContext {
    return createError({
        category: 'file',
        code: `FILE_${code}`,
        message,
        context,
        suggestions: suggestions || [
            'Check if the file exists and is accessible',
            'Ensure you have permission to read/write the file',
            'Verify the file format is correct (JSON)',
            'Try saving to a different location',
        ],
        learnMoreUrl: '/help/file-errors',
    });
}

/**
 * Create simulation error
 */
export function createSimulationError(
    code: string,
    message: string,
    context?: Record<string, unknown>,
    suggestions?: string[]
): ErrorContext {
    return createError({
        category: 'simulation',
        code: `SIM_${code}`,
        message,
        context,
        suggestions: suggestions || [
            'Check if the network configuration is valid',
            'Verify all required devices are connected',
            'Ensure devices have valid IP addresses',
            'Try resetting the simulation',
        ],
        learnMoreUrl: '/help/simulation-errors',
    });
}

/**
 * Create validation error
 */
export function createValidationError(
    code: string,
    message: string,
    field?: string,
    value?: string,
    suggestions?: string[]
): ErrorContext {
    return createError({
        category: 'validation',
        code: `VAL_${code}`,
        message,
        context: { field, value },
        suggestions: suggestions || [
            `Check the format of the ${field || 'field'}`,
            'Refer to the help guide for correct format examples',
            'Use the preset configurations as a starting point',
        ],
        learnMoreUrl: '/help/validation-errors',
    });
}

// ============================================================================
// Default Suggestions and Help URLs
// ============================================================================

function getDefaultSuggestions(category: ErrorCategory): string[] {
    const defaults: Record<ErrorCategory, string[]> = {
        configuration: [
            'Review the configuration guide',
            'Check for typos in your settings',
            'Compare with example configurations',
        ],
        connection: [
            'Verify both devices are online',
            'Check connection compatibility',
            'Try a different connection type',
        ],
        file: [
            'Check file permissions',
            'Verify file format',
            'Try a different file name',
        ],
        simulation: [
            'Reset and try again',
            'Check network topology',
            'Verify device configurations',
        ],
        validation: [
            'Check input format',
            'Use suggested values',
            'Refer to documentation',
        ],
        system: [
            'Refresh the page',
            'Try again later',
            'Contact support if issue persists',
        ],
    };

    return defaults[category] || defaults.system;
}

function getDefaultLearnMoreUrl(category: ErrorCategory, code: string): string {
    const baseUrls: Record<ErrorCategory, string> = {
        configuration: '/help/configuration',
        connection: '/help/connections',
        file: '/help/files',
        simulation: '/help/simulation',
        validation: '/help/validation',
        system: '/help/general',
    };

    return `${baseUrls[category]}?code=${code}`;
}

// ============================================================================
// Error Parsing
// ============================================================================

/**
 * Parse technical error into student-friendly error
 */
export function parseError(error: unknown, context?: Record<string, unknown>): ErrorContext {
    if (error instanceof Error) {
        // Check for known error patterns
        const message = error.message.toLowerCase();

        // Network/Connection errors
        if (message.includes('network') || message.includes('connection') || message.includes('offline')) {
            return createConnectionError(
                'NETWORK',
                'Unable to connect. Please check your network connection.',
                context
            );
        }

        // File errors
        if (message.includes('file') || message.includes('read') || message.includes('write') || message.includes('not found')) {
            return createFileError(
                'OPERATION',
                'There was a problem with the file operation.',
                context
            );
        }

        // JSON parsing errors
        if (message.includes('json') || message.includes('parse')) {
            return createFileError(
                'PARSE',
                'The file format is invalid. Please check that it is valid JSON.',
                context,
                [
                    'Check for missing brackets or quotes',
                    'Validate your JSON using an online tool',
                    'Refer to the example configurations',
                ]
            );
        }

        // Timeout errors
        if (message.includes('timeout') || message.includes('timed out')) {
            return createSimulationError(
                'TIMEOUT',
                'The operation timed out. The network may be too complex or a device is not responding.',
                context
            );
        }

        // Default system error
        return createError({
            category: 'system',
            code: 'SYS_UNKNOWN',
            message: 'An unexpected error occurred. Please try again.',
            context,
            originalError: error,
        });
    }

    // Unknown error type
    return createError({
        category: 'system',
        code: 'SYS_UNKNOWN',
        message: 'An unexpected error occurred. Please try again.',
        context,
    });
}

// ============================================================================
// Error Storage and Retrieval
// ============================================================================

const ERROR_STORAGE_KEY = 'netsim_errors';

export function storeError(error: ErrorContext): void {
    try {
        const existing = getStoredErrors();
        const updated = [error, ...existing].slice(0, 50); // Keep last 50 errors
        localStorage.setItem(ERROR_STORAGE_KEY, JSON.stringify(updated));
    } catch {
        // Ignore storage errors
    }
}

export function getStoredErrors(): ErrorContext[] {
    try {
        const stored = localStorage.getItem(ERROR_STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            return parsed.map((e: any) => ({
                ...e,
                timestamp: new Date(e.timestamp),
            }));
        }
    } catch {
        // Ignore parsing errors
    }
    return [];
}

export function clearStoredErrors(): void {
    try {
        localStorage.removeItem(ERROR_STORAGE_KEY);
    } catch {
        // Ignore storage errors
    }
}

// ============================================================================
// Error Statistics
// ============================================================================

export interface ErrorStats {
    total: number;
    byCategory: Record<ErrorCategory, number>;
    mostCommon: string | null;
    recent: ErrorContext[];
}

export function getErrorStats(): ErrorStats {
    const errors = getStoredErrors();

    const byCategory: Record<ErrorCategory, number> = {
        configuration: 0,
        connection: 0,
        file: 0,
        simulation: 0,
        validation: 0,
        system: 0,
    };

    const codeCounts = new Map<string, number>();

    errors.forEach((error) => {
        byCategory[error.category] = (byCategory[error.category] || 0) + 1;
        codeCounts.set(error.code, (codeCounts.get(error.code) || 0) + 1);
    });

    // Find most common error code
    let mostCommon: string | null = null;
    let maxCount = 0;
    codeCounts.forEach((count, code) => {
        if (count > maxCount) {
            maxCount = count;
            mostCommon = code;
        }
    });

    return {
        total: errors.length,
        byCategory,
        mostCommon,
        recent: errors.slice(0, 10),
    };
}

// ============================================================================
// Error Recovery
// ============================================================================

export interface RecoveryAction {
    id: string;
    label: string;
    action: () => void | Promise<void>;
}

export function getRecoveryActions(error: ErrorContext): RecoveryAction[] {
    const actions: RecoveryAction[] = [];

    switch (error.category) {
        case 'configuration':
            actions.push({
                id: 'reset-config',
                label: 'Reset to Defaults',
                action: () => {
                    // Implementation would reset configuration
                    console.log('Resetting configuration to defaults...');
                },
            });
            break;

        case 'connection':
            actions.push({
                id: 'test-connection',
                label: 'Test Connection',
                action: () => {
                    // Implementation would test connection
                    console.log('Testing connection...');
                },
            });
            break;

        case 'file':
            actions.push({
                id: 'retry-save',
                label: 'Retry Save',
                action: () => {
                    // Implementation would retry save
                    console.log('Retrying save operation...');
                },
            });
            break;

        case 'simulation':
            actions.push({
                id: 'reset-simulation',
                label: 'Reset Simulation',
                action: () => {
                    // Implementation would reset simulation
                    console.log('Resetting simulation...');
                },
            });
            actions.push({
                id: 'validate-network',
                label: 'Validate Network',
                action: () => {
                    // Implementation would validate network
                    console.log('Validating network...');
                },
            });
            break;
    }

    return actions;
}

// ============================================================================
// Error Reporting
// ============================================================================

export function formatErrorForReporting(error: ErrorContext): string {
    const lines = [
        `Error: ${error.code}`,
        `Category: ${error.category}`,
        `Message: ${error.message}`,
        `Time: ${error.timestamp.toISOString()}`,
        `Context: ${JSON.stringify(error.context, null, 2)}`,
        `Suggestions: ${error.suggestions.join(', ')}`,
    ];

    return lines.join('\n');
}

export function exportErrorReport(): string {
    const errors = getStoredErrors();
    const stats = getErrorStats();

    const report = [
        '=== Network Simulator Error Report ===',
        '',
        `Generated: ${new Date().toISOString()}`,
        `Total Errors: ${stats.total}`,
        '',
        '=== Errors by Category ===',
        ...Object.entries(stats.byCategory).map(([cat, count]) => `  ${cat}: ${count}`),
        '',
        '=== Recent Errors ===',
        ...errors.slice(0, 20).map((e, i) => [
            `\n[${i + 1}] ${e.code}`,
            `  Category: ${e.category}`,
            `  Message: ${e.message}`,
            `  Time: ${e.timestamp.toISOString()}`,
        ].join('\n')),
    ];

    return report.join('\n');
}
