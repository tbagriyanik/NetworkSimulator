import { logger } from '@/lib/logger';
import { useCallback } from 'react';
import { saveWindowPositions, restoreWindowPositions, clearWindowPositionsBackup } from '@/lib/storage/windowPositionManager';

/**
 * Hook to handle network refresh while preserving window positions
 * 
 * Usage:
 * const { refreshNetworkWithPositions } = useNetworkRefreshWithPositions(onRefreshNetwork);
 * 
 * Then call: refreshNetworkWithPositions()
 */
export function useNetworkRefreshWithPositions(onRefreshNetwork: () => void | Promise<void>) {
    const refreshNetworkWithPositions = useCallback(async () => {
        try {
            // Step 1: Save current window positions before refresh
            saveWindowPositions();

            // Step 2: Perform network refresh
            await Promise.resolve(onRefreshNetwork());

            // Step 3: Restore window positions after refresh
            // Use setTimeout to ensure DOM is ready
            setTimeout(() => {
                restoreWindowPositions();
                clearWindowPositionsBackup();
            }, 100);
        } catch (error) {
            logger.error('Error during network refresh with position preservation:', error);
            // Still try to restore positions even if refresh failed
            try {
                restoreWindowPositions();
                clearWindowPositionsBackup();
            } catch (restoreError) {
                logger.error('Failed to restore positions after error:', restoreError);
            }
        }
    }, [onRefreshNetwork]);

    return { refreshNetworkWithPositions };
}
