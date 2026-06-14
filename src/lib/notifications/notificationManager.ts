/**
 * Notification Manager
 * Centralized notification system with support for different types and priorities
 */

import { toast } from '@/hooks/use-toast';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'critical';

export interface NotificationOptions {
    title: string;
    description?: string;
    duration?: number;
    action?: {
        label: string;
        onClick: () => void;
    };
    recoverySteps?: string[];
}

export interface ErrorNotificationOptions extends NotificationOptions {
    code?: string;
    recoverable?: boolean;
    retryAction?: () => void;
}

class NotificationManager {
    private notificationQueue: Array<{
        type: NotificationType;
        options: NotificationOptions;
        priority: NotificationPriority;
    }> = [];

    private isProcessing = false;

    /**
     * Show success notification
     */
    success(options: NotificationOptions) {
        this.notify('success', options, 'normal');
    }

    /**
     * Show error notification with recovery options
     */
    error(options: ErrorNotificationOptions) {
        const description = this.buildErrorDescription(options);
        this.notify('error', { ...options, description }, 'high');
    }

    /**
     * Show warning notification
     */
    warning(options: NotificationOptions) {
        this.notify('warning', options, 'normal');
    }

    /**
     * Show info notification
     */
    info(options: NotificationOptions) {
        this.notify('info', options, 'low');
    }

    /**
     * Show critical error that requires user action
     */
    critical(options: ErrorNotificationOptions) {
        const description = this.buildErrorDescription(options);
        this.notify('error', { ...options, description }, 'critical');
    }

    /**
     * Show loading notification
     */
    loading(title: string, description?: string) {
        return toast({
            title,
            description,
            duration: Infinity, // Don't auto-dismiss
        });
    }

    /**
     * Show confirmation dialog
     */
    async confirm(
        title: string,
        description?: string,
        _confirmText = 'Confirm',
        _cancelText = 'Cancel'
    ): Promise<boolean> {
        return new Promise(resolve => {
            toast({
                title,
                description,
            });
            // Note: This is a simplified version. A proper implementation would use a dialog component
            // For now, we'll resolve to false after a timeout
            setTimeout(() => resolve(false), 5000);
        });
    }

    /**
     * Clear all notifications
     */
    clearAll() {
        this.notificationQueue = [];
    }

    /**
     * Private methods
     */

    private notify(
        type: NotificationType,
        options: NotificationOptions,
        priority: NotificationPriority
    ) {
        this.notificationQueue.push({ type, options, priority });
        this.processQueue();
    }

    private processQueue() {
        if (this.isProcessing || this.notificationQueue.length === 0) {
            return;
        }

        this.isProcessing = true;

        // Sort by priority
        this.notificationQueue.sort((a, b) => {
            const priorityOrder = { critical: 4, high: 3, normal: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });

        const notification = this.notificationQueue.shift();
        if (notification) {
            this.displayNotification(notification.type, notification.options);
        }

        this.isProcessing = false;
    }

    private displayNotification(type: NotificationType, options: NotificationOptions) {
        const variant = type === 'error' ? 'destructive' : type === 'warning' ? 'default' : undefined;

        toast({
            title: options.title,
            description: options.description,
            variant,
            duration: options.duration ?? (type === 'error' ? 5000 : 3000),
        });
    }

    private buildErrorDescription(options: ErrorNotificationOptions): string {
        let description = options.description || '';

        if (options.code) {
            description = `[${options.code}] ${description}`;
        }

        if (options.recoverySteps && options.recoverySteps.length > 0) {
            description += `\n\nRecovery steps:\n${options.recoverySteps.map((step, i) => `${i + 1}. ${step}`).join('\n')}`;
        }

        if (options.recoverable) {
            description += '\n\nThis error can be recovered. Please try again.';
        }

        return description;
    }
}

// Export singleton instance
export const notificationManager = new NotificationManager();

// Export for use in components
export function useNotifications() {
    return {
        success: (options: NotificationOptions) => notificationManager.success(options),
        error: (options: ErrorNotificationOptions) => notificationManager.error(options),
        warning: (options: NotificationOptions) => notificationManager.warning(options),
        info: (options: NotificationOptions) => notificationManager.info(options),
        critical: (options: ErrorNotificationOptions) => notificationManager.critical(options),
        loading: (title: string, description?: string) => notificationManager.loading(title, description),
        confirm: (title: string, description?: string, confirmText?: string, cancelText?: string) =>
            notificationManager.confirm(title, description, confirmText, cancelText),
        clearAll: () => notificationManager.clearAll(),
    };
}
