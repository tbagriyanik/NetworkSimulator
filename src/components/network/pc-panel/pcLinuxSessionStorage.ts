import { safeGetStorageKeys, safeRemoveItem } from '@/lib/storage/safeStorage';

export function clearPcLinuxSessions() {
    if (typeof window === 'undefined') return;

    const keys = safeGetStorageKeys();
    keys.forEach(key => {
        if (key.startsWith('pc_linux_output_') || key.startsWith('pc_linux_history_')) {
            safeRemoveItem(key);
        }
    });

    window.dispatchEvent(new CustomEvent('new-project-reset'));
}