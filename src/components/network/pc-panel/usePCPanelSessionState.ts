import { useEffect, useState } from 'react';
import { getDefaultPcFiles } from './pcPanelFiles';
import type { FtpSession, PcFile, PythonSession, PCActiveTab } from './PCPanel.types';
import type { PythonFormState } from './pcPythonFormTypes';
import { subscribeToDeviceForm } from './pcPythonFormModule';
import { secureStorage } from '@/lib/storage/secureStorage';

export function usePCPanelSessionState(
  deviceId: string,
  pcHistories: Map<string, string[]> | undefined,
  activeTab: PCActiveTab,
  setCurrentPath: (path: string) => void,
) {
  const [ftpSession, setFtpSession] = useState<FtpSession | null>(null);
  const [pythonSession, setPythonSession] = useState<PythonSession | null>(null);
  const [activePythonForm, setActivePythonForm] = useState<PythonFormState | null>(null);
  const [isFtpFilePickerOpen, setIsFtpFilePickerOpen] = useState(false);
  const [pcLocalFiles, setPcLocalFiles] = useState<PcFile[]>(() => {
    try { const stored = secureStorage.getItem(`pc_files_${deviceId}`); if (stored) return JSON.parse(stored); } catch { /* storage unavailable */ }
    const defaults = getDefaultPcFiles(deviceId);
    try { secureStorage.setItem(`pc_files_${deviceId}`, JSON.stringify(defaults)); } catch { /* storage unavailable */ }
    return defaults;
  });
  const [desktopHistory, setDesktopHistory] = useState<string[]>(() => {
    try { const stored = secureStorage.getItem(`pc_history_${deviceId}`); if (stored) return JSON.parse(stored); } catch { /* storage unavailable */ }
    return pcHistories?.get(deviceId) || [];
  });
  const [desktopHistoryIndex, setDesktopHistoryIndex] = useState(-1);
  const [consoleHistory, setConsoleHistory] = useState<string[]>([]);
  const [consoleHistoryIndex, setConsoleHistoryIndex] = useState(-1);

  useEffect(() => {
    try {
      const stored = secureStorage.getItem(`pc_files_${deviceId}`);
      const files = stored ? JSON.parse(stored) : getDefaultPcFiles(deviceId);
      if (!stored) secureStorage.setItem(`pc_files_${deviceId}`, JSON.stringify(files));
      setPcLocalFiles(files);
    } catch { /* storage unavailable */ }
    try { secureStorage.setItem(`pc_cwd_${deviceId}`, 'C:\\'); } catch { /* storage unavailable */ }
    setCurrentPath('C:\\');
    setDesktopHistoryIndex(-1); setConsoleHistoryIndex(-1);
  }, [deviceId, setCurrentPath]);

  useEffect(() => {
    if (desktopHistory.length > 0) { try { secureStorage.setItem(`pc_history_${deviceId}`, JSON.stringify(desktopHistory)); } catch { /* storage unavailable */ } }
  }, [deviceId, desktopHistory]);

  useEffect(() => {
    const unsubscribe = subscribeToDeviceForm(deviceId, (form) => {
      setActivePythonForm(form);
    });
    return unsubscribe;
  }, [deviceId]);

  useEffect(() => {
    if (activeTab === 'desktop') setDesktopHistoryIndex(-1);
    if (activeTab === 'terminal') setConsoleHistoryIndex(-1);
  }, [activeTab]);

  return {
    ftpSession,
    setFtpSession,
    pythonSession,
    setPythonSession,
    activePythonForm,
    setActivePythonForm,
    isFtpFilePickerOpen,
    setIsFtpFilePickerOpen,
    pcLocalFiles,
    setPcLocalFiles,
    desktopHistory,
    setDesktopHistory,
    desktopHistoryIndex,
    setDesktopHistoryIndex,
    consoleHistory,
    setConsoleHistory,
    consoleHistoryIndex,
    setConsoleHistoryIndex,
  };
}
