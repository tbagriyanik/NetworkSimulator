import { useCallback } from 'react';
import { safeStringify } from '@/lib/network/serialization';
import { CanvasDevice, CanvasConnection, CanvasNote, DeviceType } from '@/components/network/networkTopology.types';
import { SwitchState, CableInfo } from '@/lib/network/types';
import { TerminalOutput } from '@/components/network/Terminal';
import { PCOutputLine } from '@/types/pageTypes';
import type { ExamProject } from '@/lib/network/examMode';
import type { HistoryEntry } from '@/hooks/useHistory';

interface UseProjectExportProps {
  deviceStates: Map<string, SwitchState>;
  deviceOutputs: Map<string, TerminalOutput[]>;
  pcOutputs: Map<string, PCOutputLine[]>;
  pcHistories: Map<string, string[]>;
  topologyDevices: CanvasDevice[];
  topologyConnections: CanvasConnection[];
  topologyNotes: CanvasNote[];
  cableInfo: CableInfo;
  activeDeviceId: string;
  activeDeviceType: DeviceType;
  historyItems: HistoryEntry[];
  historyIndex: number;
  activeExam: ExamProject | null;
  language: string;
  projectName: string;
  setProjectName: (name: string) => void;
  setHasUnsavedChanges: (val: boolean) => void;
  setLastSaveTime: (time: string) => void;
  toast: (props: object) => { id: string };
  addProjectRecord: (name: string) => void;
  t: Record<string, string>;
}

export function useProjectExport({
  deviceStates,
  deviceOutputs,
  pcOutputs,
  pcHistories,
  topologyDevices,
  topologyConnections,
  topologyNotes,
  cableInfo,
  activeDeviceId,
  activeDeviceType,
  historyItems,
  historyIndex,
  activeExam,
  language: _language,
  projectName,
  setProjectName,
  setHasUnsavedChanges,
  setLastSaveTime,
  toast,
  addProjectRecord,
  t
}: UseProjectExportProps) {

  const getFullProjectData = useCallback(() => {
    const excludedDeviceIds = new Set(
      topologyDevices.filter(d => d.type === 'pc' || d.type === 'iot').map(d => d.id)
    );
    const iotDeviceIds = new Set(topologyDevices.filter(d => d.type === 'iot').map(d => d.id));
    const adjustedDeviceOutputs = new Map(deviceOutputs);
    const adjustedPcOutputs = new Map(pcOutputs);
    iotDeviceIds.forEach(iotId => {
      const iotOutput = deviceOutputs.get(iotId);
      if (iotOutput) {
        const filteredOutput = iotOutput.filter(o => o.type !== 'password-prompt');
        adjustedPcOutputs.set(iotId, filteredOutput as unknown as PCOutputLine[]);
        adjustedDeviceOutputs.delete(iotId);
      }
    });

    const syncedDeviceStates = new Map(deviceStates);
    
    // Serialize history items to include in export
    const serializedHistoryItems = historyItems.map(item => {
      // Create a plain object representation of the state for serialization
      const serializedState = {
        ...item.state,
        deviceStates: Array.from(item.state.deviceStates.entries()),
        deviceOutputs: Array.from(item.state.deviceOutputs.entries()),
        pcOutputs: Array.from(item.state.pcOutputs.entries()),
        pcHistories: Array.from(item.state.pcHistories.entries()),
      };
      return {
        ...item,
        state: serializedState
      };
    });

    const topologyDeviceIds = new Set(topologyDevices.map(d => d.id));
    topologyDevices.forEach(device => {
      const state = syncedDeviceStates.get(device.id);
      if (state) {
        if (device.macAddress && state.macAddress !== device.macAddress) {
          syncedDeviceStates.set(device.id, { ...state, macAddress: device.macAddress });
        }
        const updatedPorts = { ...state.ports };
        let portsChanged = false;
        device.ports.forEach(topoPort => {
          const statePort = updatedPorts[topoPort.id];
          if (statePort) {
            if (topoPort.macAddress && statePort.macAddress !== topoPort.macAddress) {
              updatedPorts[topoPort.id] = { ...statePort, macAddress: topoPort.macAddress };
              portsChanged = true;
            }
          }
        });
        if (portsChanged) {
          syncedDeviceStates.set(device.id, { ...state, ports: updatedPorts });
        }
      }
    });

    return {
      version: '1.1',
      timestamp: new Date().toISOString(),
      devices: Array.from(syncedDeviceStates.entries())
        .filter(([id]) => !excludedDeviceIds.has(id) && topologyDeviceIds.has(id))
        .map(([id, state]) => ({
          id,
          state: { ...state, commandHistory: state.commandHistory.slice(-50) }
        })),
      deviceOutputs: Array.from(adjustedDeviceOutputs.entries())
        .filter(([id]) => id && id.trim() !== '' && topologyDeviceIds.has(id))
        .map(([id, outputs]) => ({ id, outputs: outputs.slice(-100) })),
      pcOutputs: Array.from(adjustedPcOutputs.entries())
        .filter(([id]) => id && id.trim() !== '' && topologyDeviceIds.has(id))
        .map(([id, outputs]) => ({ id, outputs: outputs.slice(-100) })),
      pcHistories: Array.from(pcHistories.entries())
        .filter(([id]) => id && id.trim() !== '')
        .map(([id, history]) => ({ id, history: history.slice(-50) })),
      topology: {
        devices: topologyDevices.filter(d => d.id && d.id.trim() !== ''),
        connections: topologyConnections,
        notes: topologyNotes
      },
      cableInfo: topologyDevices.length > 0 && topologyConnections.length > 0 ? cableInfo : { connected: false, cableType: 'straight', sourceDevice: 'pc', targetDevice: 'switchL2' },
      activeDeviceId: topologyDevices.find(d => d.id === activeDeviceId)?.id || '',
      activeDeviceType,
      history: {
        items: serializedHistoryItems,
        index: historyIndex
      },
      ...(activeExam ? {
        examData: {
          id: activeExam.id,
          title: activeExam.title,
          tasks: activeExam.tasks,
          durationMinutes: activeExam.durationMinutes,
          difficulty: activeExam.difficulty,
          isCustom: activeExam.isCustom
        }
      } : {})
    };
  }, [activeExam, deviceStates, deviceOutputs, pcOutputs, pcHistories, topologyDevices, topologyConnections, topologyNotes, cableInfo, activeDeviceId, activeDeviceType, historyItems, historyIndex]);

  const handleSaveProjectInternal = useCallback(() => {
    const projectData = getFullProjectData();
    // In handleSaveProjectInternal, the original code did a bit more trimming, but getFullProjectData does the same now.
    
    const blob = new Blob([safeStringify(projectData)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const baseProjectName = projectName
      .replace(/\.json$/i, '')
      .replace(/-\d{4}-\d{2}-\d{2}$/i, '');
    const sanitizedName = baseProjectName.replace(/[^a-zA-Z0-9\s_-]/g, '').trim().replace(/\s+/g, '-').substring(0, 60) || 'network-project';
    const savedFileName = `${sanitizedName}-${new Date().toISOString().slice(0, 10)}.json`;
    a.download = savedFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setProjectName(savedFileName);
    setHasUnsavedChanges(false);
    setLastSaveTime(new Date().toLocaleTimeString());
    toast({
      title: t.projectSaved,
      description: t.jsonDownloaded,
    });
  }, [getFullProjectData, projectName, setProjectName, setHasUnsavedChanges, setLastSaveTime, toast, t]);

  function handleSaveProject() {
    handleSaveProjectInternal();
    addProjectRecord(projectName);
  }

  return {
    getFullProjectData,
    handleSaveProjectInternal,
    handleSaveProject
  };
}
