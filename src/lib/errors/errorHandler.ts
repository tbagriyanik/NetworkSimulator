import { logger } from '@/lib/logger';

export interface ErrorInfo {
    code: string;
    message: string;
    userMessage: string;
    severity: 'info' | 'warning' | 'error' | 'critical';
    recoverable: boolean;
    recoverySteps?: string[];
    timestamp: number;
    context?: Record<string, unknown>;
}

export interface RecoveryFeedback {
    title: string;
    description: string;
    recoveryHint?: string;
    severity: ErrorInfo['severity'];
    recoverable: boolean;
}

export class ApplicationError extends Error {
    code: string;
    userMessage: string;
    severity: 'info' | 'warning' | 'error' | 'critical';
    recoverable: boolean;
    recoverySteps?: string[];
    context?: Record<string, unknown>;

    constructor(
        code: string,
        message: string,
        userMessage: string,
        options?: {
            severity?: 'info' | 'warning' | 'error' | 'critical';
            recoverable?: boolean;
            recoverySteps?: string[];
            context?: Record<string, unknown>;
        }
    ) {
        super(message);
        this.code = code;
        this.userMessage = userMessage;
        this.severity = options?.severity ?? 'error';
        this.recoverable = options?.recoverable ?? false;
        this.recoverySteps = options?.recoverySteps;
        this.context = options?.context;
        this.name = 'ApplicationError';
    }

    toErrorInfo(): ErrorInfo {
        return {
            code: this.code,
            message: this.message,
            userMessage: this.userMessage,
            severity: this.severity,
            recoverable: this.recoverable,
            recoverySteps: this.recoverySteps,
            timestamp: Date.now(),
            context: this.context,
        };
    }
}

export class ErrorHandler {
    private errors: ErrorInfo[] = [];
    private maxErrors = 100;
    private listeners: Set<(error: ErrorInfo) => void> = new Set();

    logError(error: Error | ApplicationError, context?: Record<string, unknown>) {
        let errorInfo: ErrorInfo;

        if (error instanceof ApplicationError) {
            errorInfo = error.toErrorInfo();
            if (context) {
                errorInfo.context = { ...errorInfo.context, ...context };
            }
        } else {
            errorInfo = {
                code: 'UNKNOWN_ERROR',
                message: error.message,
                userMessage: 'An unexpected error occurred. Please try again.',
                severity: 'error',
                recoverable: false,
                timestamp: Date.now(),
                context,
            };
        }

        // Add to error log
        this.errors.push(errorInfo);
        if (this.errors.length > this.maxErrors) {
            this.errors.shift();
        }

        // Log to console in development
        if (process.env.NODE_ENV === 'development') {
            logger.error(`[${errorInfo.code}]`, errorInfo.message, errorInfo.context);
        }

        // Notify listeners
        this.notifyListeners(errorInfo);

        return errorInfo;
    }

    getErrors(): ErrorInfo[] {
        return [...this.errors];
    }

    getErrorsByCode(code: string): ErrorInfo[] {
        return this.errors.filter((e) => e.code === code);
    }

    getErrorsBySeverity(severity: ErrorInfo['severity']): ErrorInfo[] {
        return this.errors.filter((e) => e.severity === severity);
    }

    clearErrors() {
        this.errors = [];
    }

    subscribe(listener: (error: ErrorInfo) => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    toRecoveryFeedback(errorInfo: ErrorInfo): RecoveryFeedback {
        const recoveryHint = errorInfo.recoverySteps?.length
            ? `Recovery steps: ${errorInfo.recoverySteps.join(' | ')}`
            : undefined;

        return {
            title: errorInfo.code,
            description: errorInfo.userMessage,
            recoveryHint,
            severity: errorInfo.severity,
            recoverable: errorInfo.recoverable,
        };
    }

    private notifyListeners(error: ErrorInfo) {
        this.listeners.forEach((listener) => listener(error));
    }
}

export const errorHandler = new ErrorHandler();

export function formatErrorForUser(error: Error | ApplicationError, fallbackMessage?: string) {
    if (error instanceof ApplicationError) {
        return error.toErrorInfo();
    }

    return {
        code: 'UNKNOWN_ERROR',
        message: error.message,
        userMessage: fallbackMessage ?? 'An unexpected error occurred. Please try again.',
        severity: 'error' as const,
        recoverable: false,
        timestamp: Date.now(),
        context: undefined,
    };
}

// Common error definitions
export const COMMON_ERRORS = {
    NETWORK_ERROR: (context?: Record<string, unknown>) =>
        new ApplicationError(
            'NETWORK_ERROR',
            'Network request failed',
            'Unable to connect to the server. Please check your internet connection.',
            {
                severity: 'error',
                recoverable: true,
                recoverySteps: ['Check your internet connection', 'Try again'],
                context,
            }
        ),

    VALIDATION_ERROR: (field: string, context?: Record<string, unknown>) =>
        new ApplicationError(
            'VALIDATION_ERROR',
            `Validation failed for field: ${field}`,
            `Invalid value for ${field}. Please check your input.`,
            {
                severity: 'warning',
                recoverable: true,
                context: { field, ...context },
            }
        ),

    PERMISSION_ERROR: (context?: Record<string, unknown>) =>
        new ApplicationError(
            'PERMISSION_ERROR',
            'Permission denied',
            'You do not have permission to perform this action.',
            {
                severity: 'error',
                recoverable: false,
                context,
            }
        ),

    NOT_FOUND_ERROR: (resource: string, context?: Record<string, unknown>) =>
        new ApplicationError(
            'NOT_FOUND_ERROR',
            `Resource not found: ${resource}`,
            `The requested ${resource} could not be found.`,
            {
                severity: 'warning',
                recoverable: true,
                context: { resource, ...context },
            }
        ),

    STATE_CORRUPTION_ERROR: (context?: Record<string, unknown>) =>
        new ApplicationError(
            'STATE_CORRUPTION_ERROR',
            'Application state is corrupted',
            'The application state appears to be corrupted. Attempting to recover...',
            {
                severity: 'critical',
                recoverable: true,
                recoverySteps: ['Reload the application', 'Clear browser cache', 'Contact support'],
                context,
            }
        ),
};

// Domain-specific error codes for Network Simulator
export const CLI_ERRORS = {
    COMMAND_NOT_FOUND: (command: string, context?: Record<string, unknown>) =>
        new ApplicationError(
            'CLI_COMMAND_NOT_FOUND',
            `Command not found: ${command}`,
            `The command "${command}" was not recognized. Type '?' for available commands.`,
            {
                severity: 'warning',
                recoverable: true,
                recoverySteps: ['Check the command spelling', "Type '?' to see available commands"],
                context: { command, ...context },
            }
        ),

    INVALID_MODE: (command: string, currentMode: string, context?: Record<string, unknown>) =>
        new ApplicationError(
            'CLI_INVALID_MODE',
            `Invalid command for mode: ${currentMode}`,
            `The command "${command}" cannot be used in ${currentMode} mode.`,
            {
                severity: 'warning',
                recoverable: true,
                recoverySteps: ['Switch to the appropriate mode', 'Check command availability for current mode'],
                context: { command, currentMode, ...context },
            }
        ),

    INCOMPLETE_COMMAND: (context?: Record<string, unknown>) =>
        new ApplicationError(
            'CLI_INCOMPLETE_COMMAND',
            'Incomplete command',
            'The command is incomplete. Please provide all required parameters.',
            {
                severity: 'warning',
                recoverable: true,
                recoverySteps: ['Check command syntax', 'Provide missing parameters'],
                context,
            }
        ),

    AUTHENTICATION_FAILED: (context?: Record<string, unknown>) =>
        new ApplicationError(
            'CLI_AUTH_FAILED',
            'Authentication failed',
            'Invalid password or username. Please check your credentials.',
            {
                severity: 'error',
                recoverable: true,
                recoverySteps: ['Check your password', 'Verify username is correct', 'Contact administrator if locked out'],
                context,
            }
        ),
};

export const DEVICE_ERRORS = {
    DEVICE_OFFLINE: (deviceName: string, context?: Record<string, unknown>) =>
        new ApplicationError(
            'DEVICE_OFFLINE',
            `Device is offline: ${deviceName}`,
            `The device "${deviceName}" is powered off. Please turn it on first.`,
            {
                severity: 'warning',
                recoverable: true,
                recoverySteps: ['Power on the device', 'Wait for boot sequence to complete'],
                context: { deviceName, ...context },
            }
        ),

    DEVICE_NOT_FOUND: (deviceId: string, context?: Record<string, unknown>) =>
        new ApplicationError(
            'DEVICE_NOT_FOUND',
            `Device not found: ${deviceId}`,
            'The requested device could not be found in the topology.',
            {
                severity: 'error',
                recoverable: false,
                context: { deviceId, ...context },
            }
        ),

    PORT_UNAVAILABLE: (portName: string, context?: Record<string, unknown>) =>
        new ApplicationError(
            'PORT_UNAVAILABLE',
            `Port is unavailable: ${portName}`,
            `The port "${portName}" is already in use or does not exist.`,
            {
                severity: 'warning',
                recoverable: true,
                recoverySteps: ['Check port status', 'Disconnect existing connection', 'Use a different port'],
                context: { portName, ...context },
            }
        ),

    CONNECTION_FAILED: (source: string, target: string, context?: Record<string, unknown>) =>
        new ApplicationError(
            'CONNECTION_FAILED',
            `Connection failed: ${source} -> ${target}`,
            'Unable to establish connection between devices. Please check cable type and port availability.',
            {
                severity: 'warning',
                recoverable: true,
                recoverySteps: ['Verify cable type is correct', 'Check both ports are available', 'Ensure devices are powered on'],
                context: { source, target, ...context },
            }
        ),
};

export const STORAGE_ERRORS = {
    SAVE_FAILED: (context?: Record<string, unknown>) =>
        new ApplicationError(
            'STORAGE_SAVE_FAILED',
            'Failed to save data',
            'Unable to save your project. Please try again.',
            {
                severity: 'error',
                recoverable: true,
                recoverySteps: ['Check available storage space', 'Try exporting as file instead', 'Reload and try again'],
                context,
            }
        ),

    LOAD_FAILED: (context?: Record<string, unknown>) =>
        new ApplicationError(
            'STORAGE_LOAD_FAILED',
            'Failed to load data',
            'Unable to load the project file. The file may be corrupted.',
            {
                severity: 'error',
                recoverable: false,
                context,
            }
        ),

    LOCAL_STORAGE_UNAVAILABLE: (context?: Record<string, unknown>) =>
        new ApplicationError(
            'STORAGE_UNAVAILABLE',
            'Local storage is unavailable',
            'Your browser storage is not accessible. Settings cannot be saved.',
            {
                severity: 'warning',
                recoverable: true,
                recoverySteps: ['Check browser permissions', 'Disable private/incognito mode', 'Clear browser data'],
                context,
            }
        ),
};

export const DHCP_ERRORS = {
    LEASE_FAILED: (context?: Record<string, unknown>) =>
        new ApplicationError(
            'DHCP_LEASE_FAILED',
            'DHCP lease acquisition failed',
            'Unable to obtain an IP address from the DHCP server.',
            {
                severity: 'warning',
                recoverable: true,
                recoverySteps: ['Check DHCP server is running', 'Verify network connectivity', 'Try static IP configuration'],
                context,
            }
        ),

    POOL_EXHAUSTED: (context?: Record<string, unknown>) =>
        new ApplicationError(
            'DHCP_POOL_EXHAUSTED',
            'DHCP pool exhausted',
            'No available IP addresses in the DHCP pool.',
            {
                severity: 'warning',
                recoverable: true,
                recoverySteps: ['Increase pool size', 'Release unused leases', 'Check for duplicate IPs'],
                context,
            }
        ),
};

export const CLIPBOARD_ERRORS = {
    COPY_FAILED: (context?: Record<string, unknown>) =>
        new ApplicationError(
            'CLIPBOARD_COPY_FAILED',
            'Failed to copy to clipboard',
            'Unable to copy content to clipboard. Your browser may have blocked the operation.',
            {
                severity: 'warning',
                recoverable: true,
                recoverySteps: ['Check browser permissions', 'Use keyboard shortcut (Ctrl+C)', 'Try manual selection and copy'],
                context,
            }
        ),

    PASTE_FAILED: (context?: Record<string, unknown>) =>
        new ApplicationError(
            'CLIPBOARD_PASTE_FAILED',
            'Failed to paste from clipboard',
            'Unable to read clipboard content. Please check permissions.',
            {
                severity: 'warning',
                recoverable: true,
                recoverySteps: ['Check browser permissions', 'Use keyboard shortcut (Ctrl+V)', 'Try manual paste'],
                context,
            }
        ),
};
