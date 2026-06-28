import { useCallback } from 'react';
import { CanvasDevice, CanvasNote, CanvasConnection, DeviceType } from '../components/network/networkTopology.types';
import { generateRandomLinkLocalIpv4, generateRandomLinkLocalIpv6 } from '@/lib/network/linkLocal';
import { getDeviceWidth, getDeviceHeight } from '../components/network/networkTopology.helpers';
import { generateSwitchPorts, generateL3SwitchPorts, generateRouterPorts, generateWLCPorts } from '../components/network/networkTopology.portGenerators';

const generateMacAddress = (seed?: number): string => {
  const chars = '0123456789ABCDEF';
  let hex = '';
  for (let i = 0; i < 12; i++) {
    const idx = seed !== undefined
      ? (seed + i) % 16
      : Math.floor(Math.random() * 16);
    hex += chars[idx];
  }
  return `${hex.slice(0, 4)}.${hex.slice(4, 8)}.${hex.slice(8, 12)}`;
};

export interface UseCanvasActionsProps {
  devices: CanvasDevice[];
  setDevices: React.Dispatch<React.SetStateAction<CanvasDevice[]>>;
  connections: CanvasConnection[];
  setConnections: React.Dispatch<React.SetStateAction<CanvasConnection[]>>;
  notes: CanvasNote[];
  setNotes: React.Dispatch<React.SetStateAction<CanvasNote[]>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deviceStates: Map<string, any> | undefined | null;
  saveToHistory: () => void;
  isExamActive: boolean;
  isExamEditorOpen: boolean;
  pan: { x: number; y: number };
  zoom: number;
  canvasDimensions: { width: number; height: number };
  deviceCounterRef: React.MutableRefObject<Record<string, number>>;
  noteCounterRef: React.MutableRefObject<number>;
  latestNotesRef: React.MutableRefObject<CanvasNote[]>;
  setSelectedDeviceIds: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectedNoteIds: React.Dispatch<React.SetStateAction<string[]>>;
  onDeviceSelect: (type: DeviceType, id: string, switchModel?: string, name?: string, isNew?: boolean, device?: CanvasDevice) => void;
  onDeviceDelete?: (deviceId: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setConnectionStart: React.Dispatch<React.SetStateAction<any>>;
  setIsDrawingConnection: React.Dispatch<React.SetStateAction<boolean>>;
  language: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
}

export function useCanvasActions({
  devices,
  setDevices,
  setConnections,
  setNotes,
  deviceStates,
  saveToHistory,
  isExamActive,
  isExamEditorOpen,
  pan,
  zoom,
  canvasDimensions,
  deviceCounterRef,
  noteCounterRef,
  latestNotesRef,
  setSelectedDeviceIds,
  setSelectedNoteIds,
  onDeviceSelect,
  onDeviceDelete,
  setConnectionStart,
  setIsDrawingConnection,
  language,
  t,
}: UseCanvasActionsProps) {

  const generateUniqueLinkLocalIp = useCallback((reservedIps: string[] = []) => {
    const usedIps = new Set([
      ...devices.map((d) => d.ip).filter(Boolean),
      ...reservedIps.filter(Boolean),
    ]);
    return generateRandomLinkLocalIpv4(usedIps);
  }, [devices]);

  const generateUniqueLinkLocalIpv6 = useCallback((reservedIps: string[] = []) => {
    const usedIps = new Set([
      ...devices.map((d) => d.ipv6).filter(Boolean) as string[],
      ...reservedIps.filter(Boolean),
    ]);
    return generateRandomLinkLocalIpv6(usedIps);
  }, [devices]);

  const generateUniqueHostname = useCallback((baseName: string, reservedNames: string[] = []) => {
    const normalize = (value: string) => value.trim().toLowerCase();
    const usedNames = new Set<string>();

    devices.forEach((d) => usedNames.add(normalize(d.name)));
    if (deviceStates) {
      deviceStates.forEach((state) => {
        if (state?.hostname) {
          usedNames.add(normalize(state.hostname));
        }
      });
    }
    reservedNames.forEach((name) => usedNames.add(normalize(name)));

    if (!usedNames.has(normalize(baseName))) return baseName;

    let suffix = 2;
    let candidate = `${baseName}-${suffix}`;
    while (usedNames.has(normalize(candidate))) {
      suffix++;
      candidate = `${baseName}-${suffix}`;
    }
    return candidate;
  }, [devices, deviceStates]);

  const addDevice = useCallback((type: 'pc' | 'iot' | 'switch' | 'router' | 'firewall' | 'wlc', layer?: 'L2' | 'L3') => {
    if (isExamActive && !isExamEditorOpen) return;
    saveToHistory();
    deviceCounterRef.current[type]++;

    let spawnX = 100 + Math.random() * 30;
    let spawnY = 80 + Math.random() * 30;

    if (canvasDimensions.width > 0 && canvasDimensions.height > 0) {
      const estimatedDeviceWidth = getDeviceWidth(type);
      const estimatedDeviceHeight = getDeviceHeight(type, type === 'pc' || type === 'iot' ? 2 : 24);

      spawnX = (canvasDimensions.width / 2 - pan.x) / zoom - estimatedDeviceWidth / 2;
      spawnY = (canvasDimensions.height / 2 - pan.y) / zoom - estimatedDeviceHeight / 2;
    }

    const switchLayer = layer || 'L2';
    const switchModel = switchLayer === 'L3' ? 'WS-C3650-24PS' : 'WS-C2960-24TT-L';
    const resolvedType = type === 'switch'
      ? (switchLayer === 'L3' ? 'switchL3' : 'switchL2')
      : type;

    const baseName =
      type === 'switch' && switchLayer === 'L3'
        ? `Switch-${deviceCounterRef.current[type]}`
        : `${type.toUpperCase()}-${deviceCounterRef.current[type]}`;

    const initialLinkLocalIp = (type === 'pc' || type === 'iot') ? generateUniqueLinkLocalIp() : '';
    const initialLinkLocalIpv6 = (type === 'pc' || type === 'iot') ? generateUniqueLinkLocalIpv6() : '';
    
    const newDevice: CanvasDevice = {
      id: `${type}-${deviceCounterRef.current[type]}`,
      type: resolvedType,
      name: generateUniqueHostname(baseName),
      macAddress: generateMacAddress(),
      ip: initialLinkLocalIp,
      ipv6: initialLinkLocalIpv6,
      subnet: (type === 'pc' || type === 'iot') ? '255.255.0.0' : undefined,
      gateway: (type === 'pc' || type === 'iot') ? '0.0.0.0' : undefined,
      dns: (type === 'pc' || type === 'iot') ? '0.0.0.0' : undefined,
      ipConfigMode: type === 'iot' ? 'dhcp' : undefined,
      x: spawnX,
      y: spawnY,
      status: 'online',
      switchModel: type === 'switch' ? switchModel : type === 'wlc' ? 'AIR-CT2504-K9' as const : undefined,
      ports:
        type === 'pc' || type === 'iot'
          ? [
            { id: 'eth0', label: 'Eth0', status: 'disconnected' as const },
            ...(type === 'pc' ? [{ id: 'com1', label: 'COM1', status: 'disconnected' as const }] : []),
          ]
          : type === 'switch'
            ? switchLayer === 'L3' ? generateL3SwitchPorts() : generateSwitchPorts()
            : type === 'firewall'
              ? [
                { id: 'gi0/0', label: 'Gi0/0', status: 'disconnected' as const },
                { id: 'gi0/1', label: 'Gi0/1', status: 'disconnected' as const },
              ]
              : type === 'wlc'
                ? generateWLCPorts()
                : generateRouterPorts(),
      iot: type === 'iot'
        ? { sensorType: 'temperature', collaborationEnabled: false, dataStore: '' }
        : undefined,
      wifi: type === 'iot'
        ? { enabled: true, ssid: '', security: 'open', password: '', channel: '2.4GHz', mode: 'client' }
        : (type === 'router' || type === 'wlc' || (type === 'switch' && switchLayer === 'L3'))
          ? { enabled: false, ssid: 'Network-AP', security: 'open', password: '', channel: '2.4GHz', mode: 'ap' }
          : undefined,
    };
    
    setDevices((prev) => [...prev, newDevice]);
    setSelectedDeviceIds([newDevice.id]);
    onDeviceSelect(resolvedType, newDevice.id, newDevice.switchModel, newDevice.name, true, newDevice);

  }, [devices.length, saveToHistory, generateUniqueHostname, generateUniqueLinkLocalIp, generateUniqueLinkLocalIpv6, onDeviceSelect, canvasDimensions, pan, zoom, isExamActive, isExamEditorOpen, deviceCounterRef, setDevices, setSelectedDeviceIds]);

  const deleteDevice = useCallback((deviceId: string) => {
    if (isExamActive) return;
    saveToHistory();
    setDevices((prev) => prev.filter((d) => d.id !== deviceId));
    setConnections((prev) =>
      prev.filter((c) => c.sourceDeviceId !== deviceId && c.targetDeviceId !== deviceId)
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setConnectionStart((prev: any) => {
      if (prev?.deviceId === deviceId) {
        setIsDrawingConnection(false);
        return null;
      }
      return prev;
    });
    if (onDeviceDelete) {
      onDeviceDelete(deviceId);
    }
  }, [saveToHistory, onDeviceDelete, isExamActive, setDevices, setConnections, setConnectionStart, setIsDrawingConnection]);

  const getNextNoteId = useCallback(() => {
    const existingIds = new Set(latestNotesRef.current.map((n) => n.id));
    let next = noteCounterRef.current + 1;
    while (existingIds.has(`note-${next}`)) {
      next++;
    }
    noteCounterRef.current = next;
    return `note-${next}`;
  }, [latestNotesRef, noteCounterRef]);

  const addNote = useCallback(() => {
    saveToHistory();
    const newNote: CanvasNote = {
      id: getNextNoteId(),
      x: 200 + Math.random() * 100,
      y: 200 + Math.random() * 100,
      width: 200,
      height: 150,
      text: t.newNote,
      color: 'var(--color-warning-200)',
      font: 'Arial',
      fontSize: 12,
      opacity: 1,
    };
    setNotes((prev) => [...prev, newNote]);
    setSelectedNoteIds([newNote.id]);
  }, [saveToHistory, language, getNextNoteId, setNotes, setSelectedNoteIds, t]);

  const deleteNote = useCallback((noteId: string) => {
    saveToHistory();
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    setSelectedNoteIds((prev) => prev.filter((id) => id !== noteId));
  }, [saveToHistory, setNotes, setSelectedNoteIds]);

  const duplicateNote = useCallback((noteId: string) => {
    const note = latestNotesRef.current.find((n) => n.id === noteId);
    if (!note) return;
    saveToHistory();
    const duplicatedNote: CanvasNote = {
      ...note,
      id: getNextNoteId(),
      x: note.x + 20,
      y: note.y + 20,
    };
    setNotes((prev) => [...prev, duplicatedNote]);
    setSelectedNoteIds([duplicatedNote.id]);
    setSelectedDeviceIds([]);
  }, [saveToHistory, getNextNoteId, latestNotesRef, setNotes, setSelectedNoteIds, setSelectedDeviceIds]);

  return {
    generateUniqueLinkLocalIp,
    generateUniqueLinkLocalIpv6,
    generateUniqueHostname,
    addDevice,
    deleteDevice,
    getNextNoteId,
    addNote,
    deleteNote,
    duplicateNote
  };
}
