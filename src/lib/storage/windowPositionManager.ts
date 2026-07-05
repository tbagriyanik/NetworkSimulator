import { logger } from '@/lib/logger';

// Window Position Manager
// Preserves and restores modal/dialog window positions during network refresh

interface WindowPosition {
    x: number;
    y: number;
}

interface WindowSize {
    width: number;
    height: number;
}

interface WindowLayout {
    position: WindowPosition;
    size: WindowSize;
}

export interface AllWindowLayouts {
    tasks?: WindowLayout;
    cli?: WindowLayout;
    pc?: WindowLayout;
    [key: string]: WindowLayout | undefined;
}

const WINDOW_POSITIONS_KEY = 'netsim_window_positions_backup';

/**
 * Save all current window positions and sizes to localStorage
 * Call this before network refresh
 */
export function saveWindowPositions(): void {
    try {
        if (typeof window === 'undefined') return;

        const layouts: AllWindowLayouts = {};

        // Save modal positions from useModalDragResize
        const modalKeys = ['tasks-modal-position', 'cli-modal-position', 'pc-modal-position'];
        const sizeKeys = ['tasks-modal-size', 'cli-modal-size', 'pc-modal-size'];
        const modalNames = ['tasks', 'cli', 'pc'] as const;

        modalNames.forEach((name, index) => {
            const posData = localStorage.getItem(modalKeys[index]);
            const sizeData = localStorage.getItem(sizeKeys[index]);

            if (posData && sizeData) {
                try {
                    layouts[name] = {
                        position: JSON.parse(posData),
                        size: JSON.parse(sizeData),
                    };
                } catch (e) {
                    logger.warn(`Failed to parse ${name} window layout:`, e);
                }
            }
        });

        // Save draggable dialog positions
        const allKeys = Object.keys(localStorage);
        allKeys.forEach((key) => {
            if (key.startsWith('draggable_position_')) {
                const dialogId = key.replace('draggable_position_', '');
                try {
                    const posData = localStorage.getItem(key);
                    if (posData) {
                        layouts[`draggable_${dialogId}`] = {
                            position: JSON.parse(posData),
                            size: { width: 0, height: 0 }, // Draggable dialogs don't track size
                        };
                    }
                } catch (e) {
                    logger.warn(`Failed to parse draggable dialog ${dialogId} position:`, e);
                }
            }
        });

        // Store backup
        localStorage.setItem(WINDOW_POSITIONS_KEY, JSON.stringify(layouts));
    } catch (error) {
        logger.error('Failed to save window positions:', error);
    }
}

/**
 * Restore all window positions and sizes from backup
 * Call this after network refresh
 */
export function restoreWindowPositions(): void {
    try {
        if (typeof window === 'undefined') return;

        const backup = localStorage.getItem(WINDOW_POSITIONS_KEY);
        if (!backup) return;

        const layouts: AllWindowLayouts = JSON.parse(backup);

        // Restore modal positions
        const modalNames = ['tasks', 'cli', 'pc'] as const;
        const modalKeys = ['tasks-modal-position', 'cli-modal-position', 'pc-modal-position'];
        const sizeKeys = ['tasks-modal-size', 'cli-modal-size', 'pc-modal-size'];

        modalNames.forEach((name, index) => {
            const layout = layouts[name];
            if (layout) {
                try {
                    localStorage.setItem(modalKeys[index], JSON.stringify(layout.position));
                    localStorage.setItem(sizeKeys[index], JSON.stringify(layout.size));
                } catch (e) {
                    logger.warn(`Failed to restore ${name} window layout:`, e);
                }
            }
        });

        // Restore draggable dialog positions
        Object.entries(layouts).forEach(([key, layout]) => {
            if (key.startsWith('draggable_') && layout) {
                const dialogId = key.replace('draggable_', '');
                try {
                    localStorage.setItem(`draggable_position_${dialogId}`, JSON.stringify(layout.position));
                } catch (e) {
                    logger.warn(`Failed to restore draggable dialog ${dialogId} position:`, e);
                }
            }
        });
    } catch (error) {
        logger.error('Failed to restore window positions:', error);
    }
}

/**
 * Clear the window positions backup
 */
export function clearWindowPositionsBackup(): void {
    try {
        if (typeof window === 'undefined') return;
        localStorage.removeItem(WINDOW_POSITIONS_KEY);
    } catch (error) {
        logger.error('Failed to clear window positions backup:', error);
    }
}

/**
 * Get the current backup of window positions
 */
export function getWindowPositionsBackup(): AllWindowLayouts | null {
    try {
        if (typeof window === 'undefined') return null;
        const backup = localStorage.getItem(WINDOW_POSITIONS_KEY);
        return backup ? JSON.parse(backup) : null;
    } catch (error) {
        logger.error('Failed to get window positions backup:', error);
        return null;
    }
}
