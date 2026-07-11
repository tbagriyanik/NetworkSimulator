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

  const addSummaryNote = useCallback(() => {
    saveToHistory();
    const isTr = language === 'tr';
    const projectName = typeof window !== 'undefined' ? localStorage.getItem('lastProjectName') || 'Untitled' : 'Untitled';
    let summaryText = isTr ? `📋 TOPOLOJİ ÖZETİ: ${projectName}\n` : `📋 TOPOLOGY SUMMARY: ${projectName}\n`;
    summaryText += '========================\n';

    if (devices.length === 0) {
      summaryText += isTr ? 'Cihaz bulunamadı.' : 'No devices found.';
    } else {
      const groupedDevices = devices.reduce((acc, d) => {
        const t = d.type === 'switchL2' ? 'Switch L2' : d.type === 'switchL3' ? 'Switch L3' : d.type.toUpperCase();
        if (!acc[t]) acc[t] = [];
        acc[t].push(d);
        return acc;
      }, {} as Record<string, CanvasDevice[]>);

      Object.entries(groupedDevices).forEach(([type, devs]) => {
        summaryText += `[ ${type} ]\n`;
        devs.forEach(d => {
          summaryText += `• ${d.name}:\n`;
          if (d.ip && d.ip !== '0.0.0.0') {
            summaryText += `  IP: ${d.ip}${d.subnet ? '/' + d.subnet : ''}\n`;
          }
          if (d.gateway && d.gateway !== '0.0.0.0') {
            summaryText += `  GW: ${d.gateway}\n`;
          }
          if (d.macAddress) {
            summaryText += `  MAC: ${d.macAddress}\n`;
          }
          
          const connectedPorts = d.ports?.filter(p => p.status === 'connected');
          if (connectedPorts && connectedPorts.length > 0) {
            summaryText += isTr ? `  Bağlı Portlar:\n` : `  Connected Ports:\n`;
            connectedPorts.forEach(p => {
              const parts = [];
              if (p.ipAddress) parts.push(`IP: ${p.ipAddress}`);
              if (p.vlan && p.vlan !== 1) parts.push(`VLAN: ${p.vlan}`);
              if (p.mode && p.mode !== 'access' && p.mode !== 'dynamic-auto') parts.push(`Mod: ${p.mode}`);
              if (p.shutdown) parts.push(`Kapalı`);
              const details = parts.length > 0 ? ` (${parts.join(', ')})` : '';
              summaryText += `    - ${p.label}${details}\n`;
            });
          }
          
          if (d.wifi?.enabled) {
            summaryText += `  WiFi: ${d.wifi.ssid} (${d.wifi.mode})\n`;
          }
          if (d.services?.dhcp?.enabled) {
            summaryText += `  DHCP: ${isTr ? 'Açık' : 'Enabled'}\n`;
          }
          if (d.type === 'pc') {
            if (d.ipConfigMode === 'dhcp') {
              summaryText += isTr ? `  IP Modu: DHCP\n` : `  IP Mode: DHCP\n`;
            }
            if (d.dns) {
              summaryText += `  DNS: ${d.dns}\n`;
            }
            if (d.ipv6) {
              summaryText += `  IPv6: ${d.ipv6}${d.ipv6Prefix ? '/' + d.ipv6Prefix : ''}\n`;
            }
            if (d.services) {
              const activeServices = [];
              if (d.services.http?.enabled) activeServices.push(`HTTP (${isTr ? 'Mod' : 'Mode'}: ${d.services.http.mode || 'simple'})`);
              if (d.services.ftp?.enabled) activeServices.push(`FTP (${isTr ? 'Anonim' : 'Anonymous'}: ${d.services.ftp.anonymousAccess ? (isTr ? 'Evet' : 'Yes') : (isTr ? 'Hayır' : 'No')})`);
              if (d.services.dns?.enabled) activeServices.push(`DNS Server (${d.services.dns.records?.length || 0} ${isTr ? 'Kayıt' : 'Records'})`);
              if (d.services.mail?.enabled) activeServices.push(`Mail (${isTr ? 'Alan Adı' : 'Domain'}: ${d.services.mail.domain || '-'})`);
              if (d.services.ntp?.enabled) activeServices.push(`NTP (${d.services.ntp.timezone || 'UTC'})`);
              
              if (activeServices.length > 0) {
                summaryText += isTr ? `  Etkin Servisler:\n` : `  Active Services:\n`;
                activeServices.forEach(s => {
                  summaryText += `    - ${s}\n`;
                });
              }
            }
          }

          if (d.type === 'iot' && d.iot) {
            summaryText += isTr ? `  IoT Tipi: ${d.iot.kind || 'Sensör'}\n` : `  IoT Kind: ${d.iot.kind || 'Sensor'}\n`;
            summaryText += isTr ? `  Sensör: ${d.iot.sensorType}\n` : `  Sensor: ${d.iot.sensorType}\n`;
            if (d.iot.rules && d.iot.rules.length > 0) {
              const activeRules = d.iot.rules.filter(r => r.enabled);
              if (activeRules.length > 0) {
                summaryText += isTr ? `  IoT Kuralları:\n` : `  IoT Rules:\n`;
                activeRules.forEach(r => {
                  summaryText += `    - IF ${r.condition} THEN ${r.action}\n`;
                });
              }
            }
          }

          if (d.firewallRules && d.firewallRules.some(r => r.enabled)) {
            const activeRules = d.firewallRules.filter(r => r.enabled);
            summaryText += `  Firewall: ${activeRules.length} ${isTr ? 'Kural Etkin' : 'Rules Active'}\n`;
            activeRules.forEach(r => {
              summaryText += `    - ${r.action.toUpperCase()} ${r.protocol.toUpperCase()} ${r.sourceIp} -> ${r.targetIp}:${r.port}\n`;
            });
          }

          if (['switchL2', 'switchL3', 'router'].includes(d.type)) {
            let cli = '';
            if (d.ip && d.ip !== '0.0.0.0') {
              cli += `    interface vlan 1\n    ip address ${d.ip} ${d.subnet || '255.255.255.0'}\n    no shutdown\n    exit\n`;
            }
            if (d.gateway && d.gateway !== '0.0.0.0') {
              cli += `    ip default-gateway ${d.gateway}\n`;
            }
            if (connectedPorts && connectedPorts.length > 0) {
              connectedPorts.forEach(p => {
                const hasPortSecurity = p.portSecurity?.enabled || (p.staticMacs && p.staticMacs.length > 0) || p.portSecurity?.sticky || p.portSecurity?.maxAddresses || p.portSecurity?.violationAction;
                const needsCli = p.ipAddress || (p.vlan && p.vlan !== 1) || (p.mode && p.mode !== 'dynamic-auto') || p.shutdown || hasPortSecurity;
                if (needsCli) {
                  cli += `    interface ${p.label.replace('Fa', 'FastEthernet').replace('Gi', 'GigabitEthernet')}\n`;
                  if (p.shutdown) {
                    cli += `    shutdown\n`;
                  } else {
                    if (p.ipAddress) {
                      cli += `    ip address ${p.ipAddress} ${p.subnetMask || '255.255.255.0'}\n`;
                    }
                    if (p.mode && p.mode !== 'dynamic-auto') {
                      cli += `    switchport mode ${p.mode.replace('-', ' ')}\n`;
                    }
                    if (p.vlan && p.vlan !== 1 && p.mode !== 'trunk') {
                      cli += `    switchport access vlan ${p.vlan}\n`;
                    }
                    if (hasPortSecurity) {
                      if (p.portSecurity?.enabled) cli += `    switchport port-security\n`;
                      if (p.portSecurity?.maxAddresses) cli += `    switchport port-security maximum ${p.portSecurity.maxAddresses}\n`;
                      if (p.portSecurity?.violationAction) cli += `    switchport port-security violation ${p.portSecurity.violationAction}\n`;
                      if (p.portSecurity?.sticky) cli += `    switchport port-security mac-address sticky\n`;
                      if (p.staticMacs && p.staticMacs.length > 0) {
                        p.staticMacs.forEach(mac => {
                          cli += `    switchport port-security mac-address ${mac}\n`;
                        });
                      }
                    }
                    cli += `    no shutdown\n`;
                  }
                  cli += `    exit\n`;
                }
              });
            }
            if (d.services?.dhcp?.enabled && d.services.dhcp.pools && d.services.dhcp.pools.length > 0) {
              const pool = d.services.dhcp.pools[0];
              cli += `    service dhcp\n    ip dhcp pool ${pool.poolName}\n    network ${pool.startIp} ${pool.subnetMask}\n    default-router ${pool.defaultGateway}\n    dns-server ${pool.dnsServer}\n`;
            }

            const dState = deviceStates?.get(d.id);
            if (dState && dState.security) {
              const sec = dState.security;
              if (sec.enableSecret) cli += `    enable secret ${sec.enableSecret}\n`;
              else if (sec.enablePassword) cli += `    enable password ${sec.enablePassword}\n`;
              
              if (sec.servicePasswordEncryption) cli += `    service password-encryption\n`;
              
              if (sec.consoleLine && (sec.consoleLine.password || sec.consoleLine.login || sec.consoleLine.loginLocal)) {
                cli += `    line con 0\n`;
                if (sec.consoleLine.password) cli += `    password ${sec.consoleLine.password}\n`;
                if (sec.consoleLine.loginLocal) cli += `    login local\n`;
                else if (sec.consoleLine.login) cli += `    login\n`;
                cli += `    exit\n`;
              }
              
              if (sec.vtyLines && (sec.vtyLines.password || sec.vtyLines.login || sec.vtyLines.loginLocal)) {
                cli += `    line vty 0 4\n`;
                if (sec.vtyLines.password) cli += `    password ${sec.vtyLines.password}\n`;
                if (sec.vtyLines.loginLocal) cli += `    login local\n`;
                else if (sec.vtyLines.login) cli += `    login\n`;
                cli += `    exit\n`;
              }
            }

            if (dState) {
              if (dState.bannerMOTD) cli += `    banner motd #${dState.bannerMOTD}#\n`;
              if (dState.domainName) cli += `    ip domain-name ${dState.domainName}\n`;
              if (dState.cdpEnabled === false) cli += `    no cdp run\n`;
              if (dState.spanningTreeMode && dState.spanningTreeMode !== 'pvst') cli += `    spanning-tree mode ${dState.spanningTreeMode}\n`;
              if (dState.vtpMode && dState.vtpMode !== 'server') cli += `    vtp mode ${dState.vtpMode}\n`;
              if (dState.vtpDomain) cli += `    vtp domain ${dState.vtpDomain}\n`;
              if (dState.vtpPassword) cli += `    vtp password ${dState.vtpPassword}\n`;
              if (dState.ipRouting) cli += `    ip routing\n`;
              if (dState.ipv6Enabled) cli += `    ipv6 unicast-routing\n`;
              if (dState.staticRoutes && dState.staticRoutes.length > 0) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                dState.staticRoutes.forEach((r: any) => {
                  cli += `    ip route ${r.destination || r.network || ''} ${r.subnetMask || r.mask || ''} ${r.nextHop || r.interface || ''}\n`;
                });
              }
              if (dState.routingProtocol && dState.routingProtocol !== 'none') {
                const routerConfig = dState.routingProtocol === 'ospf' ? (dState.ospfProcessId || '1') : '';
                cli += `    router ${dState.routingProtocol}${routerConfig ? ' ' + routerConfig : ''}\n`;
                if (dState.routerId) cli += `    router-id ${dState.routerId}\n`;
                
                if (dState.dynamicRoutes && dState.dynamicRoutes.length > 0) {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  dState.dynamicRoutes.forEach((r: any) => {
                    const net = r.destination || r.network || '';
                    const mask = r.subnetMask || r.mask || '';
                    if (dState.routingProtocol === 'ospf') {
                      cli += `    network ${net} ${mask} area ${r.area || 0}\n`;
                    } else if (dState.routingProtocol === 'bgp') {
                      cli += `    network ${net} mask ${mask}\n`;
                    } else if (dState.routingProtocol === 'eigrp') {
                      cli += `    network ${net} ${mask}\n`;
                    } else {
                      cli += `    network ${net}\n`;
                    }
                  });
                }
                
                cli += `    exit\n`;
              }
            }

            if (cli) {
              summaryText += isTr ? `\n  [CLI Komutları]:\n` : `\n  [CLI Commands]:\n`;
              summaryText += `    enable\n    configure terminal\n    hostname ${d.name}\n${cli}`;
            }
          }

          summaryText += '\n';
        });
        summaryText += '------------------------\n';
      });
    }

    const newNote: CanvasNote = {
      id: getNextNoteId(),
      x: 150 + Math.random() * 50,
      y: 150 + Math.random() * 50,
      width: 450,
      height: Math.min(400, Math.max(200, 50 + devices.length * 100)),
      text: summaryText.trim(),
      color: 'var(--color-success-200)',
      font: 'Courier New',
      fontSize: 12,
      opacity: 1,
    };
    setNotes((prev) => [...prev, newNote]);
    setSelectedNoteIds([newNote.id]);
  }, [saveToHistory, language, getNextNoteId, devices, setNotes, setSelectedNoteIds]);

  return {
    generateUniqueLinkLocalIp,
    generateUniqueLinkLocalIpv6,
    generateUniqueHostname,
    addDevice,
    deleteDevice,
    getNextNoteId,
    addNote,
    addSummaryNote,
    deleteNote,
    duplicateNote
  };
}
