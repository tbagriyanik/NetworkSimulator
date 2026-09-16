'use client';

import { useCallback, useState } from 'react';
import { CanvasDevice, CanvasNote, ContextMenuState } from '@/components/network/NetworkTopology/types/networkTopology.types';
import { generateUniqueMacAddress } from '@/lib/utils';

interface CanvasClipboardProps {
  devices: CanvasDevice[];
  setDevices: (fn: (prev: CanvasDevice[]) => CanvasDevice[]) => void;
  deleteDevice: (id: string) => void;
  setSelectedDeviceIds: (ids: string[]) => void;
  saveToHistory: () => void;
  deviceCounterRef: React.MutableRefObject<Record<string, number>>;
  generateUniqueHostname: (base: string, reserved: string[]) => string;
  generateUniqueLinkLocalIp: (reserved: string[]) => string;
  generateUniqueLinkLocalIpv6: (reserved: string[]) => string;
  getCounterKey: (type: string) => string;

  setContextMenu: (menu: ContextMenuState | null) => void;
  notesClipboard: CanvasNote[];
  getNextNoteId: () => string;
  setNotes: (fn: (prev: CanvasNote[]) => CanvasNote[]) => void;
  setSelectedNoteIds: (ids: string[]) => void;
}

export function useCanvasClipboard({
  devices,
  setDevices,
  deleteDevice,
  setSelectedDeviceIds,
  saveToHistory,
  deviceCounterRef,
  generateUniqueHostname,
  generateUniqueLinkLocalIp,
  generateUniqueLinkLocalIpv6,
  getCounterKey,
  setContextMenu,
  notesClipboard,
  getNextNoteId,
  setNotes,
  setSelectedNoteIds,
}: CanvasClipboardProps) {
  const [clipboard, setClipboard] = useState<CanvasDevice[]>([]);

  // Copy devices
  const copyDevice = useCallback((ids: string[]) => {
    const selectedDevices = devices.filter(d => ids.includes(d.id));
    if (selectedDevices.length > 0) {
      setClipboard(selectedDevices.map(d => ({ ...d })));
    }
    setContextMenu(null);
  }, [devices, setContextMenu]);

  // Cut devices
  const cutDevice = useCallback((ids: string[]) => {
    const selectedDevices = devices.filter(d => ids.includes(d.id));
    if (selectedDevices.length > 0) {
      setClipboard(selectedDevices.map(d => ({ ...d })));
      ids.forEach(id => deleteDevice(id));
      setSelectedDeviceIds([]);
    }
    setContextMenu(null);
  }, [devices, deleteDevice, setSelectedDeviceIds, setContextMenu]);

  // Paste devices
  const pasteDevice = useCallback(() => {
    if (clipboard.length === 0) return;

    saveToHistory();

    const newDevices: CanvasDevice[] = [];
    const reservedIps: string[] = [];
    const reservedIpv6s: string[] = [];
    const reservedHostnames: string[] = [];
    const reservedMacs: string[] = [];

    // Pre-populate reserved MACs from all currently existing devices and their ports
    devices.forEach(d => {
      if (d.macAddress) reservedMacs.push(d.macAddress);
      d.ports?.forEach(p => {
        if (p.macAddress) reservedMacs.push(p.macAddress);
      });
    });

    clipboard.forEach(device => {
      const type = device.type;
      const counterKey = getCounterKey(type);
      deviceCounterRef.current[counterKey]++;
      const newId = `${type}-${deviceCounterRef.current[counterKey]}`;

      const baseName = `${type.toUpperCase()}-${deviceCounterRef.current[counterKey]}`;
      const hostname = generateUniqueHostname(baseName, reservedHostnames);
      const generatedIp = type === 'pc' || type === 'iot' ? generateUniqueLinkLocalIp(reservedIps) : '';
      const generatedIpv6 = type === 'pc' || type === 'iot' ? generateUniqueLinkLocalIpv6(reservedIpv6s) : '';

      const newDeviceMac = generateUniqueMacAddress(reservedMacs);
      reservedMacs.push(newDeviceMac);

      if (generatedIp) {
        reservedIps.push(generatedIp);
      }
      if (generatedIpv6) {
        reservedIpv6s.push(generatedIpv6);
      }
      reservedHostnames.push(hostname);

      const newPorts = (device.ports || []).map(p => {
        const portMac = generateUniqueMacAddress(reservedMacs);
        reservedMacs.push(portMac);
        return {
          ...p,
          status: 'disconnected' as const,
          macAddress: portMac,
        };
      });

      newDevices.push({
        ...device,
        id: newId,
        name: hostname,
        macAddress: newDeviceMac,
        ip: generatedIp,
        ipv6: generatedIpv6,
        subnet: (type === 'pc' || type === 'iot') ? '255.255.0.0' : device.subnet,
        gateway: (type === 'pc' || type === 'iot') ? '0.0.0.0' : device.gateway,
        dns: (type === 'pc' || type === 'iot') ? '0.0.0.0' : device.dns,
        x: device.x + 30,
        y: device.y + 30,
        ports: newPorts,
      });
    });

    setDevices(prev => [...prev, ...newDevices]);
    setContextMenu(null);
  }, [clipboard, saveToHistory, generateUniqueHostname, generateUniqueLinkLocalIp, generateUniqueLinkLocalIpv6, getCounterKey, setDevices, setContextMenu, deviceCounterRef]);

  // Paste notes
  const pasteNotes = useCallback((x: number, y: number) => {
    if (notesClipboard.length === 0) return;

    saveToHistory();

    const newNotes: CanvasNote[] = notesClipboard.map((note) => ({
      ...note,
      id: getNextNoteId(),
      x: x + 20,
      y: y + 20,
    }));

    setNotes((prev) => [...prev, ...newNotes]);
    setSelectedNoteIds(newNotes.map(n => n.id));
    setContextMenu(null);
  }, [notesClipboard, saveToHistory, getNextNoteId, setNotes, setSelectedNoteIds, setContextMenu]);

  return {
    clipboard,
    copyDevice,
    cutDevice,
    pasteDevice,
    pasteNotes,
  };
}


