import { useCallback } from 'react';
import { CanvasDevice, CanvasNote, CanvasConnection, DeviceType } from '../components/network/networkTopology.types';
import { generateRandomLinkLocalIpv4, generateRandomLinkLocalIpv6 } from '@/lib/network/linkLocal';
import { getDeviceWidth, getDeviceHeight } from '../components/network/networkTopology.helpers';
import { generateSwitchPorts, generateL3SwitchPorts, generateRouterPorts, generateWLCPorts, generateFirewallPorts, generateHubPorts } from '../components/network/networkTopology.portGenerators';
import { generateUniqueMacAddress } from '@/lib/utils';
import type { SwitchState } from '@/lib/network/types';

function getTopologyGroup(type: DeviceType): string {
  if (type === 'pc' || type === 'iot') return 'PC';
  if (type === 'switchL2') return 'Switch L2';
  if (type === 'switchL3') return 'Switch L3';
  if (type === 'router') return 'Router';
  if (type === 'firewall') return 'Firewall';
  if (type === 'wlc') return 'WLC';
  return 'OTHER';
}

function getConnectedPortsForDevice(deviceId: string, connections: CanvasConnection[] = []): string[] {
  const ports: string[] = [];
  connections.forEach(conn => {
    if (conn.sourceDeviceId === deviceId && conn.sourcePort) {
      const portName = conn.sourcePort.charAt(0).toUpperCase() + conn.sourcePort.slice(1);
      if (!ports.includes(portName)) ports.push(portName);
    }
    if (conn.targetDeviceId === deviceId && conn.targetPort) {
      const portName = conn.targetPort.charAt(0).toUpperCase() + conn.targetPort.slice(1);
      if (!ports.includes(portName)) ports.push(portName);
    }
  });
  return ports;
}

function getActiveServicesForDevice(device: CanvasDevice, state?: SwitchState): string[] {
  const serviceList: string[] = [];
  
  // Physical Layer 1 Hubs and WAN Cloud bridges do not host application server services
  if (device.type === 'hub' || device.type === 'cloud') {
    return serviceList;
  }

  const services = device.services || state?.services;

  if (services?.http?.enabled) {
    // HTTP service is hosted on PCs, WLCs, IoTs, Printers, Firewalls, Routers
    const isWebCapableDevice = 
      device.type === 'pc' || 
      device.type === 'wlc' || 
      device.type === 'iot' || 
      device.type === 'printer' || 
      device.type === 'router' || 
      device.type === 'firewall';

    if (isWebCapableDevice) {
      const httpObj = services.http as { enabled: boolean; mode?: string };
      const mode = httpObj.mode || 'simple';
      serviceList.push(`HTTP (Mod: ${mode})`);
    }
  }
  if (services?.dns?.enabled) {
    const recordCount = services.dns.records?.length || 0;
    serviceList.push(`DNS Server (${recordCount} Kayıt)`);
  }
  if (services?.dhcp?.enabled) {
    const poolCount = services.dhcp.pools?.length || 0;
    serviceList.push(`DHCP Server (${poolCount} Havuz)`);
  }
  if (services?.ftp?.enabled) {
    serviceList.push('FTP Server');
  }
  if (services?.mail?.enabled) {
    serviceList.push('Mail Server');
  }
  if (services?.ntp?.enabled) {
    serviceList.push('NTP Server');
  }

  return serviceList;
}

function getCliCommandsForDevice(device: CanvasDevice, state?: SwitchState): string[] {
  if (!state) return [];
  const cliCapableTypes: DeviceType[] = ['router', 'switchL2', 'switchL3', 'firewall', 'wlc'];
  if (!cliCapableTypes.includes(device.type)) return [];

  const commands: string[] = [];

  if (state.hostname) {
    commands.push('enable');
    commands.push('configure terminal');
    commands.push(`hostname ${state.hostname}`);
  }

  if (state.bannerMOTD) {
    if (!commands.includes('configure terminal')) {
      commands.push('enable');
      commands.push('configure terminal');
    }
    commands.push(`banner motd #${state.bannerMOTD}#`);
  }

  if (state.vlans) {
    Object.values(state.vlans).forEach(vlan => {
      if (vlan.id !== 1 && vlan.id < 1002) {
        if (!commands.includes('configure terminal')) {
          commands.push('enable');
          commands.push('configure terminal');
        }
        commands.push(`vlan ${vlan.id}`);
        commands.push(`  name ${vlan.name || `VLAN${vlan.id}`}`);
      }
    });
  }

  if (state.ports) {
    Object.values(state.ports).forEach(port => {
      const portName = port.id || port.name;
      if (port.mode === 'trunk' && !port.shutdown) {
        if (!commands.includes('configure terminal')) {
          commands.push('enable');
          commands.push('configure terminal');
        }
        commands.push(`interface ${portName}`);
        commands.push('  switchport mode trunk');
      } else if (port.mode === 'access' && port.accessVlan && Number(port.accessVlan) !== 1 && !port.shutdown) {
        if (!commands.includes('configure terminal')) {
          commands.push('enable');
          commands.push('configure terminal');
        }
        commands.push(`interface ${portName}`);
        commands.push('  switchport mode access');
        commands.push(`  switchport access vlan ${port.accessVlan}`);
      } else if (port.ipAddress && !port.shutdown) {
        if (!commands.includes('configure terminal')) {
          commands.push('enable');
          commands.push('configure terminal');
        }
        commands.push(`interface ${portName}`);
        commands.push(`  ip address ${port.ipAddress} ${port.subnetMask || '255.255.255.0'}`);
        commands.push('  no shutdown');
      }
    });
  }

  if (state.ipRouting && device.type !== 'firewall') {
    if (!commands.includes('configure terminal')) {
      commands.push('enable');
      commands.push('configure terminal');
    }
    commands.push('ip routing');
  }

  if (state.dhcpPools) {
    Object.entries(state.dhcpPools).forEach(([poolName, pool]) => {
      if (!commands.includes('configure terminal')) {
        commands.push('enable');
        commands.push('configure terminal');
      }
      commands.push(`ip dhcp pool ${poolName}`);
      if (pool.network && pool.subnetMask) commands.push(`  network ${pool.network} ${pool.subnetMask}`);
      if (pool.defaultRouter) commands.push(`  default-router ${pool.defaultRouter}`);
      if (pool.dnsServer) commands.push(`  dns-server ${pool.dnsServer}`);
    });
  }

  return commands;
}

export interface UseCanvasActionsProps {
  devices: CanvasDevice[];
  setDevices: React.Dispatch<React.SetStateAction<CanvasDevice[]>>;
  connections: CanvasConnection[];
  setConnections: React.Dispatch<React.SetStateAction<CanvasConnection[]>>;
  notes: CanvasNote[];
  setNotes: React.Dispatch<React.SetStateAction<CanvasNote[]>>;

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

  setConnectionStart: React.Dispatch<React.SetStateAction<any>>;
  setIsDrawingConnection: React.Dispatch<React.SetStateAction<boolean>>;
  language: string;

  t: any;
}

export function useCanvasActions({
  devices,
  setDevices,
  connections,
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
  setConnectionStart: _setConnectionStart,
  setIsDrawingConnection: _setIsDrawingConnection,
  language,
}: UseCanvasActionsProps) {

  const generateUniqueLinkLocalIp = useCallback((reservedIps: string[] = []) => {
    const usedIps = new Set([
      ...devices.map((d) => d.ip).filter(Boolean),
      ...reservedIps.filter(Boolean),
    ]);
    return generateRandomLinkLocalIpv4(usedIps);
  }, [devices]);

  const generateUniqueLinkLocalIpv6 = useCallback((reservedIps: string[] = []) => {
    const usedIpv6s = new Set([
      ...devices.map((d) => d.ipv6).filter(Boolean) as string[],
      ...reservedIps.filter(Boolean),
    ]);
    return generateRandomLinkLocalIpv6(usedIpv6s);
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

  const getNextNoteId = useCallback(() => {
    const existingIds = new Set(latestNotesRef.current.map((n) => n.id));
    let nextId = noteCounterRef.current + 1;
    while (existingIds.has(`note-${nextId}`)) {
      nextId++;
    }
    noteCounterRef.current = nextId;
    return `note-${nextId}`;
  }, [latestNotesRef, noteCounterRef]);

  const addDevice = useCallback((type: 'pc' | 'iot' | 'switch' | 'router' | 'firewall' | 'wlc' | 'hub' | 'cloud' | 'mobile' | 'printer', layer?: 'L2' | 'L3') => {
    if (isExamActive && !isExamEditorOpen) return;
    saveToHistory();
    if (!deviceCounterRef.current[type]) {
      deviceCounterRef.current[type] = 0;
    }
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
    const switchModel = switchLayer === 'L3' ? 'NS-L3-24PS' : 'NS-L2-24TT-L';
    const resolvedType = type === 'switch'
      ? (switchLayer === 'L3' ? 'switchL3' : 'switchL2')
      : type;

    const baseName =
      type === 'switch' && switchLayer === 'L3'
        ? `Switch-${deviceCounterRef.current[type]}`
        : `${type.toUpperCase()}-${deviceCounterRef.current[type]}`;

    const initialLinkLocalIp = (type === 'pc' || type === 'iot' || type === 'mobile' || type === 'printer') ? generateUniqueLinkLocalIp() : '';
    const initialLinkLocalIpv6 = (type === 'pc' || type === 'iot' || type === 'mobile' || type === 'printer') ? generateUniqueLinkLocalIpv6() : '';
    const allUsedMacs = devices.flatMap(d => [d.macAddress, ...(d.ports || []).map(p => p.macAddress)]).filter(Boolean) as string[];

    const newDevice: CanvasDevice = {
      id: `${type}-${deviceCounterRef.current[type]}`,
      type: resolvedType,
      name: generateUniqueHostname(baseName),
      macAddress: generateUniqueMacAddress(allUsedMacs),
      ip: type === 'wlc' ? '192.168.1.1' : type === 'cloud' ? '203.0.113.1' : initialLinkLocalIp,
      ipv6: initialLinkLocalIpv6,
      subnet: (type === 'pc' || type === 'iot' || type === 'mobile' || type === 'printer') ? '255.255.0.0' : (type === 'wlc' || type === 'cloud') ? '255.255.255.0' : undefined,
      gateway: (type === 'pc' || type === 'iot' || type === 'mobile' || type === 'printer') ? '0.0.0.0' : undefined,
      dns: (type === 'pc' || type === 'iot' || type === 'mobile' || type === 'printer') ? '0.0.0.0' : undefined,
      ipConfigMode: (type === 'iot' || type === 'mobile' || type === 'printer') ? 'dhcp' : undefined,
      x: spawnX,
      y: spawnY,
      status: 'online',
      switchModel: type === 'switch' ? switchModel : type === 'wlc' ? 'NS-WLC-2504' as const : undefined,
      ports:
        type === 'pc' || type === 'iot' || type === 'mobile' || type === 'printer'
          ? [
            ...(type === 'mobile' ? [] : [{ id: 'eth0', label: 'Eth0', status: 'disconnected' as const, macAddress: generateUniqueMacAddress([...allUsedMacs]) }]),
            ...(type === 'pc' ? [{ id: 'console', label: 'Console', status: 'disconnected' as const }] : []),
            ...(type === 'iot' || type === 'mobile' ? [{
              id: 'wlan0',
              label: 'WLAN0',
              status: 'disconnected' as const,
              wifi: { ssid: '', security: 'open' as const, channel: '2.4GHz' as const, mode: 'client' as const },
            }] : [{
              id: 'wlan0',
              label: 'WLAN0',
              status: 'disconnected' as const,
              shutdown: true,
            }]),
          ]
          : type === 'hub'
            ? generateHubPorts()
            : type === 'cloud'
              ? [
                { id: 'eth0', label: 'Eth0 (WAN1)', status: 'disconnected' as const, ipAddress: '203.0.113.1', subnetMask: '255.255.255.0' },
                { id: 'eth1', label: 'Eth1 (WAN2)', status: 'disconnected' as const, ipAddress: '203.0.113.2', subnetMask: '255.255.255.0' },
                { id: 'eth2', label: 'Eth2 (WAN3)', status: 'disconnected' as const, ipAddress: '203.0.113.3', subnetMask: '255.255.255.0' },
                { id: 'eth3', label: 'Eth4 (LAN)', status: 'disconnected' as const },
              ]
              : type === 'switch'
                ? switchLayer === 'L3' ? generateL3SwitchPorts() : generateSwitchPorts()
                : type === 'firewall'
                  ? generateFirewallPorts()
                  : type === 'wlc'
                    ? generateWLCPorts()
                    : generateRouterPorts(),

      services: (type === 'pc' || type === 'iot' || type === 'printer' || type === 'wlc')
        ? {
          http: { enabled: true, mode: 'simple', content: type === 'pc' ? `<h1>Welcome to ${name} Web Server</h1>` : '' },
          ...(type === 'wlc' ? {
            dhcp: {
              enabled: true,
              pools: [
                {
                  poolName: 'WLC-DHCP-POOL',
                  defaultGateway: '192.168.1.1',
                  dnsServer: '8.8.8.8',
                  startIp: '192.168.1.100',
                  subnetMask: '255.255.255.0',
                  maxUsers: 50
                }
              ]
            }
          } : {})
        }
        : undefined,
      iot: type === 'iot'
        ? { sensorType: 'temperature', collaborationEnabled: false, dataStore: '' }
        : undefined,
      wifi: (type === 'iot' || type === 'mobile' || type === 'printer')
        ? { enabled: true, ssid: '', security: 'open', password: '', channel: '2.4GHz', mode: 'client' }
        : type === 'wlc'
          ? { enabled: true, ssid: 'WLC-WiFi', security: 'open', password: '', channel: '2.4GHz', mode: 'ap' }
          : (type === 'router' || (type === 'switch' && switchLayer === 'L3'))
            ? { enabled: false, ssid: 'Network-AP', security: 'open', password: '', channel: '2.4GHz', mode: 'ap' }
            : undefined,
    };

    setDevices((prev) => [...prev, newDevice]);
    setSelectedDeviceIds([newDevice.id]);
    onDeviceSelect(resolvedType, newDevice.id, newDevice.switchModel, newDevice.name, true, newDevice);

  }, [devices, saveToHistory, generateUniqueHostname, generateUniqueLinkLocalIp, generateUniqueLinkLocalIpv6, onDeviceSelect, canvasDimensions, pan, zoom, isExamActive, isExamEditorOpen, deviceCounterRef, setDevices, setSelectedDeviceIds]);

  const deleteDevice = useCallback((deviceId: string) => {
    if (isExamActive) return;
    saveToHistory();
    setDevices((prev) => prev.filter((d) => d.id !== deviceId));
    setConnections((prev) =>
      prev.filter((c) => c.sourceDeviceId !== deviceId && c.targetDeviceId !== deviceId)
    );
    setSelectedDeviceIds((prev) => prev.filter((id) => id !== deviceId));
    if (onDeviceDelete) onDeviceDelete(deviceId);
  }, [isExamActive, saveToHistory, setDevices, setConnections, setSelectedDeviceIds, onDeviceDelete]);

  const addNote = useCallback(() => {
    if (isExamActive && !isExamEditorOpen) return;
    saveToHistory();
    const noteId = getNextNoteId();
    const text = language === 'tr' ? 'Yeni Not' : 'New Note';
    const color = 'var(--color-warning-200)';
    const newNote: CanvasNote = {
      id: noteId,
      text,
      x: 150 + Math.random() * 50,
      y: 150 + Math.random() * 50,
      width: 140,
      height: 100,
      color,
      font: 'sans',
      fontSize: 12,
      opacity: 1,
    };
    setNotes((prev) => [...prev, newNote]);
    setSelectedNoteIds([noteId]);
  }, [isExamActive, isExamEditorOpen, saveToHistory, getNextNoteId, setNotes, setSelectedNoteIds, language]);

  const duplicateNote = useCallback((noteId: string) => {
    if (isExamActive && !isExamEditorOpen) return;
    const noteToDuplicate = latestNotesRef.current.find((n) => n.id === noteId);
    if (!noteToDuplicate) return;
    saveToHistory();
    const duplicatedNote: CanvasNote = {
      ...noteToDuplicate,
      id: getNextNoteId(),
      x: noteToDuplicate.x + 20,
      y: noteToDuplicate.y + 20,
    };
    setNotes((prev) => [...prev, duplicatedNote]);
    setSelectedNoteIds([duplicatedNote.id]);
  }, [isExamActive, isExamEditorOpen, latestNotesRef, saveToHistory, getNextNoteId, setNotes, setSelectedNoteIds]);

  const deleteNote = useCallback((noteId: string) => {
    if (isExamActive && !isExamEditorOpen) return;
    saveToHistory();
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    setSelectedNoteIds((prev) => prev.filter((id) => id !== noteId));
  }, [isExamActive, isExamEditorOpen, saveToHistory, setNotes, setSelectedNoteIds]);

  const updateNoteText = useCallback((noteId: string, text: string) => {
    if (isExamActive && !isExamEditorOpen) return;
    setNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, text } : n)));
  }, [isExamActive, isExamEditorOpen, setNotes]);

  const updateNoteColor = useCallback((noteId: string, color: string) => {
    if (isExamActive && !isExamEditorOpen) return;
    saveToHistory();
    setNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, color } : n)));
  }, [isExamActive, isExamEditorOpen, saveToHistory, setNotes]);

  const updateNoteStyle = useCallback((noteId: string, updates: Partial<CanvasNote>) => {
    if (isExamActive && !isExamEditorOpen) return;
    saveToHistory();
    setNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, ...updates } : n)));
  }, [isExamActive, isExamEditorOpen, saveToHistory, setNotes]);

  const deleteConnection = useCallback((connectionId: string) => {
    if (isExamActive) return;
    saveToHistory();
    setConnections((prev) => prev.filter((c) => c.id !== connectionId));
  }, [isExamActive, saveToHistory, setConnections]);

  const toggleConnectionActive = useCallback((connectionId: string) => {
    if (isExamActive) return;
    saveToHistory();
    setConnections((prev) =>
      prev.map((c) => (c.id === connectionId ? { ...c, active: !c.active } : c))
    );
  }, [isExamActive, saveToHistory, setConnections]);

  const addSummaryNote = useCallback(() => {
    if (isExamActive && !isExamEditorOpen) return;
    saveToHistory();
    const isTr = language === 'tr';

    let topoSubject = '';
    const hasDns = devices.some(d => d.services?.dns?.enabled);
    const hasDhcp = devices.some(d => d.services?.dhcp?.enabled);
    if (hasDns) topoSubject = ': DNS';
    else if (hasDhcp) topoSubject = ': DHCP';

    let summaryText = isTr ? `📋 TOPOLOJİ ÖZETİ${topoSubject}\n` : `📋 TOPOLOGY SUMMARY${topoSubject}\n`;
    summaryText += '========================\n';

    if (devices.length === 0) {
      summaryText += isTr ? 'Cihaz bulunamadı.' : 'No devices found.';
    } else {
      const groups: Record<string, CanvasDevice[]> = {
        '[ PC ]': [],
        '[ Switch L2 ]': [],
        '[ Switch L3 ]': [],
        '[ Router ]': [],
        '[ Firewall ]': [],
        '[ WLC ]': [],
        '[ Other ]': []
      };

      devices.forEach(d => {
        const grp = getTopologyGroup(d.type);
        if (grp === 'PC') groups['[ PC ]'].push(d);
        else if (grp === 'Switch L2') groups['[ Switch L2 ]'].push(d);
        else if (grp === 'Switch L3') groups['[ Switch L3 ]'].push(d);
        else if (grp === 'Router') groups['[ Router ]'].push(d);
        else if (grp === 'Firewall') groups['[ Firewall ]'].push(d);
        else if (grp === 'WLC') groups['[ WLC ]'].push(d);
        else groups['[ Other ]'].push(d);
      });

      Object.entries(groups).forEach(([groupHeader, groupedDevices]) => {
        if (!groupedDevices.length) return;
        summaryText += `\n${groupHeader}\n`;

        groupedDevices.forEach(d => {
          const deviceState = deviceStates?.get(d.id) as SwitchState | undefined;
          const subnetMask = d.subnet || '255.255.255.0';

          let devHeader = `• ${d.name}`;
          const details: string[] = [];

          if (d.ip) details.push(`IP: ${d.ip}/${subnetMask}`);
          if (d.macAddress) details.push(`MAC: ${d.macAddress}`);
          if (d.gateway && d.gateway !== '0.0.0.0') details.push(`GW: ${d.gateway}`);
          if (d.dns && d.dns !== '0.0.0.0') details.push(`DNS: ${d.dns}`);
          if (d.ipv6) details.push(`IPv6: ${d.ipv6}`);

          if (details.length > 0) {
            devHeader += ` (${details.join(' | ')})`;
          }
          summaryText += `${devHeader}\n`;

          const connectedPorts = getConnectedPortsForDevice(d.id, connections);
          if (connectedPorts.length > 0) {
            summaryText += `  ${isTr ? 'Portlar' : 'Ports'}: ${connectedPorts.join(', ')}\n`;
          }

          const activeServices = getActiveServicesForDevice(d, deviceState);
          if (activeServices.length > 0) {
            summaryText += `  ${isTr ? 'Servisler' : 'Services'}: ${activeServices.join(', ')}\n`;
          }

          const cliCmds = getCliCommandsForDevice(d, deviceState);
          if (cliCmds.length > 0) {
            summaryText += `  CLI: ${cliCmds.join('; ')}\n`;
          }
        });
      });
    }

    // Position note on the right empty space of the canvas to avoid overlapping devices
    let targetX = 750;
    let targetY = 50;

    if (devices.length > 0) {
      const maxX = Math.max(...devices.map(d => (d.x || 0)));
      const minY = Math.min(...devices.map(d => (d.y || 0)));
      targetX = Math.max(720, maxX + 180);
      targetY = Math.max(40, minY);
    }

    const newNote: CanvasNote = {
      id: getNextNoteId(),
      x: targetX,
      y: targetY,
      width: 440,
      height: Math.min(380, Math.max(160, 60 + devices.length * 40)),
      text: summaryText.trim(),
      color: 'var(--color-success-200)',
      font: 'Courier New',
      fontSize: 12,
      opacity: 1,
    };
    setNotes((prev) => [...prev, newNote]);
    setSelectedNoteIds([newNote.id]);
  }, [isExamActive, isExamEditorOpen, saveToHistory, language, devices, deviceStates, connections, getNextNoteId, setNotes, setSelectedNoteIds]);

  return {
    addDevice,
    deleteDevice,
    addNote,
    addSummaryNote,
    duplicateNote,
    deleteNote,
    updateNoteText,
    updateNoteColor,
    updateNoteStyle,
    deleteConnection,
    toggleConnectionActive,
    getNextNoteId,
    generateUniqueLinkLocalIp,
    generateUniqueLinkLocalIpv6,
    generateUniqueHostname,
  };
}
