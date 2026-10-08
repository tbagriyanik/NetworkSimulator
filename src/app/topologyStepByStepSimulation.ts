import type { CanvasDevice, CanvasConnection } from '@/components/network/NetworkTopology/types/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import { useMultiWindowStore } from '@/hooks/useMultiWindowStore';

export interface StepByStepSimulationParams {
  data: {
    devices: CanvasDevice[];
    connections: CanvasConnection[];
    deviceStates: Map<string, SwitchState>;
    projectName?: string;
  };
  setDevices: (devices: CanvasDevice[]) => void;
  setConnections: (connections: CanvasConnection[]) => void;
  setDeviceStates: (states: Map<string, SwitchState>) => void;
  isTr: boolean;
}

export function getDefaultFactoryName(devType: CanvasDevice['type'], indexOfType: number) {
  switch (devType) {
    case 'router':
      return `Router${indexOfType}`;
    case 'switchL2':
    case 'switchL3':
      return `Switch${indexOfType}`;
    case 'pc':
      return `PC${indexOfType}`;
    case 'mobile':
      return `Mobile${indexOfType}`;
    case 'printer':
      return `Printer${indexOfType}`;
    case 'iot':
      return `IoT${indexOfType}`;
    case 'wlc':
      return `WLC${indexOfType}`;
    case 'firewall':
      return `Firewall${indexOfType}`;
    case 'hub':
      return `Hub${indexOfType}`;
    default:
      return `Device${indexOfType}`;
  }
}

export function getSwitchCliCommands(switchDev: CanvasDevice, devState?: SwitchState): string[] {
  const devCmds: string[] = ['enable', 'configure terminal'];
  const targetHostname = devState?.hostname || switchDev.name;
  if (targetHostname) {
    devCmds.push(`hostname ${targetHostname}`);
  }

  // Security & Password Configurations (Applied safely within configure terminal)
  if (devState?.security) {
    if (devState.security.enableSecret) {
      devCmds.push(`enable secret ${devState.security.enableSecret}`);
    } else if (devState.security.enablePassword) {
      devCmds.push(`enable password ${devState.security.enablePassword}`);
    }

    if (devState.security.servicePasswordEncryption) {
      devCmds.push('service password-encryption');
    }

    if (devState.security.consoleLine?.password) {
      devCmds.push('line console 0');
      devCmds.push(`password ${devState.security.consoleLine.password}`);
      devCmds.push('login');
      devCmds.push('exit');
    }

    if (devState.security.vtyLines?.password) {
      devCmds.push('line vty 0 4');
      devCmds.push(`password ${devState.security.vtyLines.password}`);
      devCmds.push('login');
      devCmds.push('exit');
    }
  }

  if (devState?.vlans) {
    Object.values(devState.vlans).forEach((vlan) => {
      if (vlan.id > 1) {
        devCmds.push(`vlan ${vlan.id}`);
        if (vlan.name && vlan.name !== `VLAN${vlan.id}`) {
          devCmds.push(`name ${vlan.name}`);
        }
        devCmds.push('exit');
      }
    });
  }

  if (devState?.ports) {
    Object.values(devState.ports).forEach((p) => {
      if (p.mode === 'trunk') {
        devCmds.push(`interface ${p.id}`);
        devCmds.push('switchport mode trunk');
        devCmds.push('exit');
      } else if (p.mode === 'access' && typeof p.accessVlan === 'number' && p.accessVlan > 1) {
        devCmds.push(`interface ${p.id}`);
        devCmds.push('switchport mode access');
        devCmds.push(`switchport access vlan ${p.accessVlan}`);
        devCmds.push('exit');
      } else if (p.ipAddress && p.subnetMask) {
        devCmds.push(`interface ${p.id}`);
        devCmds.push('no switchport');
        devCmds.push(`ip address ${p.ipAddress} ${p.subnetMask}`);
        devCmds.push('no shutdown');
        devCmds.push('exit');
      }
    });
  }

  if (switchDev.type === 'switchL3' || (devState as unknown as { ipRouting?: boolean })?.ipRouting) {
    devCmds.push('ip routing');
  }

  devCmds.push('end');
  return devCmds;
}

export function getRouterCliCommands(routerDev: CanvasDevice, devState?: SwitchState): string[] {
  const devCmds: string[] = ['enable', 'configure terminal'];
  const targetHostname = devState?.hostname || routerDev.name;
  if (targetHostname) {
    devCmds.push(`hostname ${targetHostname}`);
  }

  // Security & Password Configurations (Applied safely within configure terminal)
  if (devState?.security) {
    if (devState.security.enableSecret) {
      devCmds.push(`enable secret ${devState.security.enableSecret}`);
    } else if (devState.security.enablePassword) {
      devCmds.push(`enable password ${devState.security.enablePassword}`);
    }

    if (devState.security.servicePasswordEncryption) {
      devCmds.push('service password-encryption');
    }

    if (devState.security.consoleLine?.password) {
      devCmds.push('line console 0');
      devCmds.push(`password ${devState.security.consoleLine.password}`);
      devCmds.push('login');
      devCmds.push('exit');
    }

    if (devState.security.vtyLines?.password) {
      devCmds.push('line vty 0 4');
      devCmds.push(`password ${devState.security.vtyLines.password}`);
      devCmds.push('login');
      devCmds.push('exit');
    }
  }

  const configuredPorts = devState?.ports
    ? Object.values(devState.ports).filter((p) => p.ipAddress && p.subnetMask)
    : [];

  configuredPorts.forEach((p) => {
    devCmds.push(`interface ${p.id}`);
    if (p.id.includes('.')) {
      const subVlan = p.id.split('.')[1];
      devCmds.push(`encapsulation dot1Q ${subVlan}`);
    }
    devCmds.push(`ip address ${p.ipAddress} ${p.subnetMask}`);
    devCmds.push('no shutdown');
    devCmds.push('exit');
  });

  const dhcpPool = (devState as unknown as { dhcpPools?: Array<{ name: string; network: string; mask: string; defaultRouter?: string }> })?.dhcpPools || [];
  dhcpPool.forEach((pool) => {
    devCmds.push(`ip dhcp pool ${pool.name}`);
    devCmds.push(`network ${pool.network} ${pool.mask}`);
    if (pool.defaultRouter) {
      devCmds.push(`default-router ${pool.defaultRouter}`);
    }
    devCmds.push('exit');
  });

  const dynamicRoutes = (devState as unknown as { dynamicRoutes?: Array<{ destination: string; subnetMask: string; area?: number }> })?.dynamicRoutes || [];
  const staticRoutes = (devState as unknown as { staticRoutes?: Array<{ destination: string; subnetMask: string; nextHop: string }> })?.staticRoutes || [];
  const bgpCfg = (devState as unknown as { bgpConfig?: { localAs: number; neighbors: string[] } })?.bgpConfig;
  const ripCfg = (devState as unknown as { ripConfig?: { version?: number; networks: string[] } })?.ripConfig;
  const ospfId = (devState as unknown as { ospfProcessId?: string })?.ospfProcessId;

  if (ospfId || dynamicRoutes.length > 0) {
    devCmds.push(`router ospf ${ospfId || '1'}`);
    dynamicRoutes.forEach((r) => {
      devCmds.push(`network ${r.destination} ${r.subnetMask} area ${r.area ?? 0}`);
    });
    devCmds.push('exit');
  } else if (ripCfg && ripCfg.networks && ripCfg.networks.length > 0) {
    devCmds.push('router rip');
    devCmds.push(`version ${ripCfg.version || 2}`);
    ripCfg.networks.forEach((net) => {
      devCmds.push(`network ${net}`);
    });
    devCmds.push('exit');
  } else if (bgpCfg && bgpCfg.localAs) {
    devCmds.push(`router bgp ${bgpCfg.localAs}`);
    (bgpCfg.neighbors || []).forEach((nbr) => {
      devCmds.push(`neighbor ${nbr} remote-as ${bgpCfg.localAs}`);
    });
    devCmds.push('exit');
  } else if (staticRoutes.length > 0) {
    staticRoutes.forEach((sr) => {
      devCmds.push(`ip route ${sr.destination} ${sr.subnetMask} ${sr.nextHop}`);
    });
  }

  devCmds.push('end');
  return devCmds;
}

export function calculateSimulationSteps(data: {
  devices: CanvasDevice[];
  connections: CanvasConnection[];
  deviceStates?: Map<string, SwitchState>;
}): number {
  const devices = data.devices || [];
  const connections = data.connections || [];
  const deviceStates = data.deviceStates || new Map();

  const switchDevices = devices.filter((d) => d.type === 'switchL2' || d.type === 'switchL3');
  const routerDevices = devices.filter((d) => d.type === 'router');
  const pcDevices = devices.filter((d) => d.type === 'pc');
  const wlcDevices = devices.filter((d) => d.type === 'wlc');
  const wifiDevices = devices.filter((d) => d.type === 'mobile' || (d.type !== 'pc' && !!d.wifi));
  const printerDevices = devices.filter((d) => d.type === 'printer');
  const iotDevices = devices.filter((d) => d.type === 'iot');

  let totalSteps = devices.length + connections.length;
  switchDevices.forEach((d) => {
    const cmds = getSwitchCliCommands(d, deviceStates.get(d.id));
    totalSteps += 3 + cmds.length;
  });
  routerDevices.forEach((d) => {
    const cmds = getRouterCliCommands(d, deviceStates.get(d.id));
    totalSteps += 3 + cmds.length;
  });
  totalSteps += wlcDevices.length * 3;
  pcDevices.forEach((pc) => {
    totalSteps += 4;
    if (pc.gateway) totalSteps += 1;
    if (pc.dns) totalSteps += 1;
    if (pc.wifi) totalSteps += 1;
  });
  totalSteps += wifiDevices.length * 3;
  totalSteps += printerDevices.length * 3;
  totalSteps += iotDevices.length * 3;
  if (pcDevices.length >= 2 || (pcDevices.length >= 1 && routerDevices.length >= 1)) {
    totalSteps += 4;
  }
  return totalSteps;
}

export function runStepByStepSimulation({
  data,
  setDevices,
  setConnections,
  setDeviceStates,
  isTr,
}: StepByStepSimulationParams) {
  // Start from empty screen
  setDevices([]);
  setConnections([]);
  setDeviceStates(new Map());

  // Open Timeline History Panel so the user sees steps recorded live
  window.dispatchEvent(new CustomEvent('set-timeline-minimized', { detail: { minimized: false } }));

  const devices = [...data.devices];
  const connections = [...data.connections];
  const deviceStates = data.deviceStates;

  let simulatedDevices: CanvasDevice[] = [];
  let simulatedStates = new Map<string, SwitchState>();
  let delay = 300;

  const timeouts: NodeJS.Timeout[] = [];
  const registerTimeout = (fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timeouts.push(id);
    return id;
  };

  const moveCursor = (x: number, y: number, actionLabel?: string, clicking = false, typingText?: string) => {
    window.dispatchEvent(
      new CustomEvent('virtual-cursor-move', {
        detail: { visible: true, x, y, actionLabel, clicking, typingText },
      })
    );
  };

  const hideCursor = () => {
    window.dispatchEvent(new CustomEvent('virtual-cursor-hide'));
  };

  const stopSimulation = () => {
    timeouts.forEach((t) => clearTimeout(t));
    hideCursor();
    window.dispatchEvent(
      new CustomEvent('simulation-progress', {
        detail: { active: false, current: 0, total: 0, message: isTr ? 'İptal Edildi' : 'Cancelled' },
      })
    );
  };

  const onStopReq = () => {
    stopSimulation();
    window.removeEventListener('simulation-stop', onStopReq);
  };
  window.addEventListener('simulation-stop', onStopReq);

  const getElementCoords = (selector: string, fallbackX: number, fallbackY: number) => {
    if (typeof document !== 'undefined') {
      const parts = selector.split(',').map((s) => s.trim());
      for (const part of parts) {
        const el = document.querySelector(part);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
          }
        }
      }
    }
    return { x: fallbackX, y: fallbackY };
  };

  const switchDevices = devices.filter((d) => d.type === 'switchL2' || d.type === 'switchL3');
  const routerDevices = devices.filter((d) => d.type === 'router');
  const pcDevices = devices.filter((d) => d.type === 'pc');
  const wlcDevices = devices.filter((d) => d.type === 'wlc');
  const wifiDevices = devices.filter((d) => d.type === 'mobile' || (d.type !== 'pc' && !!d.wifi));
  const printerDevices = devices.filter((d) => d.type === 'printer');
  const iotDevices = devices.filter((d) => d.type === 'iot');

  const totalSteps = calculateSimulationSteps({ devices, connections, deviceStates });

  let currentStep = 0;
  const updateProgress = (step: number, msg: string) => {
    window.dispatchEvent(
      new CustomEvent('simulation-progress', {
        detail: { active: true, current: step, total: totalSteps, message: msg },
      })
    );
  };

  // ==========================================
  // PHASE 1: PLACE ALL DEVICES (Initial Blank State)
  // ==========================================
  devices.forEach((dev) => {
    const currentDevices = devices.slice(0, devices.indexOf(dev) + 1);
    const devTypeKey = dev.type === ('switch' as unknown as string) ? 'switchL2' : dev.type;
    const devSelector = `[data-toolbar-device="${devTypeKey}"], [data-toolbar-device="pc"]`;
    const devTypeCount = currentDevices.filter((item) => item.type === dev.type).length - 1;
    const initialFactoryName = getDefaultFactoryName(dev.type, Math.max(0, devTypeCount));

    // Step 1a: Move cursor to toolbar icon
    registerTimeout(() => {
      currentStep++;
      updateProgress(currentStep, isTr ? `${initialFactoryName} seçiliyor` : `Selecting ${initialFactoryName}`);
      const targetBtn = getElementCoords(devSelector, 220, 75);
      moveCursor(targetBtn.x, targetBtn.y, isTr ? `${dev.type.toUpperCase()} Seçiliyor` : `Selecting ${dev.type.toUpperCase()}`, false);
    }, delay);
    delay += 400;

    // Step 1b: Click toolbar button
    registerTimeout(() => {
      const targetBtn = getElementCoords(devSelector, 220, 75);
      moveCursor(targetBtn.x, targetBtn.y, isTr ? `${dev.type.toUpperCase()} Seçildi` : `Selected ${dev.type.toUpperCase()}`, true);
    }, delay);
    delay += 350;

    // Step 1c: Move cursor to canvas target position
    registerTimeout(() => {
      const screenX = Math.min(window.innerWidth - 100, Math.max(120, dev.x + 80));
      const screenY = Math.min(window.innerHeight - 150, Math.max(150, dev.y + 120));
      moveCursor(screenX, screenY, isTr ? `${initialFactoryName} Tuvale Yerleştiriliyor` : `Placing ${initialFactoryName} on Canvas`, false);
    }, delay);
    delay += 400;

    // Step 1d: Click and place blank device
    registerTimeout(() => {
      const screenX = Math.min(window.innerWidth - 100, Math.max(120, dev.x + 80));
      const screenY = Math.min(window.innerHeight - 150, Math.max(150, dev.y + 120));
      moveCursor(screenX, screenY, isTr ? `${initialFactoryName} Eklendi ✓` : `${initialFactoryName} Added ✓`, true);

      const sanitizedDevices = currentDevices.map((d, idx) => {
        if (idx === currentDevices.length - 1) {
          if (d.type === 'pc') {
            const pcIndex = currentDevices.filter((item) => item.type === 'pc').length;
            const initialApipaIp = `169.254.1.${10 + pcIndex}`;
            return {
              ...d,
              name: initialFactoryName,
              ip: initialApipaIp,
              subnet: '255.255.0.0',
              gateway: '',
              dns: '',
              ipConfigMode: 'static' as const,
              wifi: d.wifi ? { ...d.wifi, enabled: false, ssid: '', password: '', mode: d.wifi.mode || 'client' } : undefined,
            };
          }
          if (d.type === 'mobile') {
            const mobileIndex = currentDevices.filter((item) => item.type === 'mobile').length;
            const initialApipaIp = `169.254.1.${20 + mobileIndex}`;
            return {
              ...d,
              name: initialFactoryName,
              ip: initialApipaIp,
              subnet: '255.255.0.0',
              wifi: d.wifi ? { ...d.wifi, enabled: false, ssid: '', password: '', mode: d.wifi.mode || 'client' } : undefined,
            };
          }
          if (d.type === 'printer' || d.type === 'iot') {
            return { ...d, name: initialFactoryName, ip: '', subnet: '255.255.255.0', gateway: '', dns: '' };
          }
          if (d.type === 'wlc') {
            return {
              ...d,
              name: initialFactoryName,
              ip: '',
              subnet: '255.255.255.0',
              gateway: '',
              wifi: d.wifi ? { ...d.wifi, enabled: false, ssid: '', password: '', mode: d.wifi.mode || 'ap' } : undefined,
            };
          }
          return { ...d, name: initialFactoryName, ip: '' };
        }
        return d;
      });
      simulatedDevices = sanitizedDevices;
      setDevices(sanitizedDevices);

      const currentStates = new Map<string, SwitchState>();
      currentDevices.forEach((d) => {
        const state = deviceStates.get(d.id);
        if (state) {
          const cleanPorts: Record<string, typeof state.ports[string]> = {};
          Object.entries(state.ports || {}).forEach(([pId, p]) => {
            cleanPorts[pId] = {
              ...p,
              ipAddress: undefined,
              subnetMask: undefined,
              mode: 'access',
              accessVlan: 1,
            };
          });
          currentStates.set(d.id, {
            ...state,
            hostname: initialFactoryName,
            vlans: { 1: { id: 1, name: 'default', status: 'active', ports: [] } },
            ports: cleanPorts,
          });
        }
      });
      simulatedStates = currentStates;
      setDeviceStates(currentStates);

      window.dispatchEvent(
        new CustomEvent('commit-action-event', {
          detail: { action: isTr ? `${initialFactoryName} topolojiye eklendi` : `Added ${initialFactoryName} to topology` },
        })
      );
    }, delay);
    delay += 750;
  });

  // ==========================================
  // PHASE 2: CONNECT ALL CABLES
  // ==========================================
  let lastSelectedCableType: string | null = null;
  connections.forEach((conn) => {
    const currentConnections = connections.slice(0, connections.indexOf(conn) + 1);
    const srcDev = devices.find((d) => d.id === conn.sourceDeviceId);
    const tgtDev = devices.find((d) => d.id === conn.targetDeviceId);
    const cableTypeVal =
      conn.cableType === 'crossover' || (conn.cableType as string) === 'cross' ? 'crossover' : conn.cableType || 'straight';
    const cableLabel = cableTypeVal === 'crossover' ? 'CROSSOVER' : cableTypeVal.toUpperCase();
    const cableSelector = `[data-toolbar-cable="${cableTypeVal}"], [data-toolbar-cable="straight"]`;
    const isSameCableType = lastSelectedCableType === cableTypeVal;

    if (!isSameCableType) {
      lastSelectedCableType = cableTypeVal;
      registerTimeout(() => {
        currentStep++;
        updateProgress(
          currentStep,
          isTr
            ? `Kablo (${cableLabel}): ${srcDev?.name || ''} ➔ ${tgtDev?.name || ''}`
            : `Cable (${cableLabel}): ${srcDev?.name || ''} ➔ ${tgtDev?.name || ''}`
        );
        const cableBtnCoords = getElementCoords(cableSelector, 330, 75);
        moveCursor(cableBtnCoords.x, cableBtnCoords.y, isTr ? `${cableLabel} Kablo Seçiliyor` : `Selecting ${cableLabel} Cable`, false);
      }, delay);
      delay += 400;

      registerTimeout(() => {
        const cableBtnCoords = getElementCoords(cableSelector, 330, 75);
        moveCursor(cableBtnCoords.x, cableBtnCoords.y, isTr ? `${cableLabel} Kablo Seçildi` : `Selected ${cableLabel} Cable`, true);
      }, delay);
      delay += 350;
    } else {
      registerTimeout(() => {
        currentStep++;
        updateProgress(
          currentStep,
          isTr
            ? `Kablo (${cableLabel}): ${srcDev?.name || ''} ➔ ${tgtDev?.name || ''}`
            : `Cable (${cableLabel}): ${srcDev?.name || ''} ➔ ${tgtDev?.name || ''}`
        );
      }, delay);
    }

    // Source Port
    registerTimeout(() => {
      const portName = conn.sourcePort || 'Port';
      const srcPortSelector = `[data-device-id="${srcDev?.id}"][data-port-id="${conn.sourcePort}"], [data-device-id="${srcDev?.id}"] [data-port-id="${conn.sourcePort}"], [data-device-id="${srcDev?.id}"]`;
      const srcCoords = getElementCoords(srcPortSelector, srcDev ? srcDev.x + 80 : 200, srcDev ? srcDev.y + 120 : 200);
      moveCursor(srcCoords.x, srcCoords.y, isTr ? `${srcDev?.name || ''} [${portName}] Bağlanıyor` : `Connecting to ${srcDev?.name || ''} [${portName}]`, false);
    }, delay);
    delay += 400;

    registerTimeout(() => {
      const portName = conn.sourcePort || 'Port';
      const srcPortSelector = `[data-device-id="${srcDev?.id}"][data-port-id="${conn.sourcePort}"], [data-device-id="${srcDev?.id}"] [data-port-id="${conn.sourcePort}"], [data-device-id="${srcDev?.id}"]`;
      const srcCoords = getElementCoords(srcPortSelector, srcDev ? srcDev.x + 80 : 200, srcDev ? srcDev.y + 120 : 200);
      moveCursor(srcCoords.x, srcCoords.y, isTr ? `${srcDev?.name || ''} [${portName}] Tıklandı ✓` : `${srcDev?.name || ''} [${portName}] Clicked ✓`, true);
    }, delay);
    delay += 400;

    // Target Port
    registerTimeout(() => {
      const portName = conn.targetPort || 'Port';
      const tgtPortSelector = `[data-device-id="${tgtDev?.id}"][data-port-id="${conn.targetPort}"], [data-device-id="${tgtDev?.id}"] [data-port-id="${conn.targetPort}"], [data-device-id="${tgtDev?.id}"]`;
      const tgtCoords = getElementCoords(tgtPortSelector, tgtDev ? tgtDev.x + 80 : 350, tgtDev ? tgtDev.y + 120 : 250);
      moveCursor(tgtCoords.x, tgtCoords.y, isTr ? `${tgtDev?.name || ''} [${portName}] Bağlanıyor` : `Connecting to ${tgtDev?.name || ''} [${portName}]`, false);
    }, delay);
    delay += 400;

    registerTimeout(() => {
      const portName = conn.targetPort || 'Port';
      const tgtPortSelector = `[data-device-id="${tgtDev?.id}"][data-port-id="${conn.targetPort}"], [data-device-id="${tgtDev?.id}"] [data-port-id="${conn.targetPort}"], [data-device-id="${tgtDev?.id}"]`;
      const tgtCoords = getElementCoords(tgtPortSelector, tgtDev ? tgtDev.x + 80 : 350, tgtDev ? tgtDev.y + 120 : 250);
      moveCursor(tgtCoords.x, tgtCoords.y, isTr ? `${tgtDev?.name || ''} [${portName}] Bağlandı ✓` : `${tgtDev?.name || ''} [${portName}] Connected ✓`, true);
      setConnections(currentConnections);

      window.dispatchEvent(
        new CustomEvent('commit-action-event', {
          detail: {
            action: isTr
              ? `${srcDev?.name || ''} (${conn.sourcePort}) ➔ ${tgtDev?.name || ''} (${conn.targetPort}) [${cableLabel}] bağlandı`
              : `Connected ${srcDev?.name || ''} (${conn.sourcePort}) ➔ ${tgtDev?.name || ''} (${conn.targetPort}) [${cableLabel}]`,
          },
        })
      );
    }, delay);
    delay += 750;
  });

  // ==========================================
  // PHASE 3: SWITCH CONFIGURATION (VLANs, Trunks, Access, SVI)
  // ==========================================
  switchDevices.forEach((switchDev) => {
    const devState = deviceStates?.get(switchDev.id);
    const switchCmds = getSwitchCliCommands(switchDev, devState);

    registerTimeout(() => {
      currentStep++;
      updateProgress(currentStep, isTr ? `${switchDev.name} CLI Konsolu Açılıyor (VLAN & Port Yapılandırması)` : `Opening ${switchDev.name} CLI Console (VLAN & Port Config)`);
      moveCursor(switchDev.x + 80, switchDev.y + 120, isTr ? `${switchDev.name} Konsol Aç` : `Open ${switchDev.name} Console`, true);
      useMultiWindowStore.getState().openDeviceWindow(switchDev.id, switchDev.type, 'console');
    }, delay);
    delay += 900;

    switchCmds.forEach((cliCmd) => {
      registerTimeout(() => {
        currentStep++;
        updateProgress(currentStep, `${switchDev.name} CLI: ${cliCmd}`);
        const cliCoords = getElementCoords('input[placeholder*="enable"], input[type="text"], [data-modal-content="true"] input', window.innerWidth / 2, window.innerHeight / 2 + 120);
        moveCursor(cliCoords.x, cliCoords.y, `${switchDev.name} CLI: ${cliCmd}`, false);
        window.dispatchEvent(
          new CustomEvent('terminal-auto-type', {
            detail: { deviceId: switchDev.id, command: cliCmd },
          })
        );
      }, delay);
      delay += Math.max(700, cliCmd.length * 60 + 200);

      registerTimeout(() => {
        const cliCoords = getElementCoords('input[placeholder*="enable"], input[type="text"], [data-modal-content="true"] input', window.innerWidth / 2, window.innerHeight / 2 + 120);
        moveCursor(cliCoords.x + 35, cliCoords.y, `Enter ↵ (${cliCmd})`, true, cliCmd);
        window.dispatchEvent(
          new CustomEvent('commit-action-event', {
            detail: { action: `${switchDev.name} CLI: ${cliCmd}` },
          })
        );
      }, delay);
      delay += 600;
    });

    registerTimeout(() => {
      currentStep++;
      const resultMsg = isTr
        ? `${switchDev.name} Switch ve VLAN Ayarları Başarıyla Yapılandırıldı`
        : `${switchDev.name} Switch and VLAN Configured Successfully`;
      updateProgress(currentStep, resultMsg);
      moveCursor(window.innerWidth / 2, window.innerHeight / 2 + 50, isTr ? `Switch Yapılandırması Tamam!` : `Switch Config Completed!`, false);

      if (devState) {
        const updated = new Map(simulatedStates);
        updated.set(switchDev.id, devState);
        simulatedStates = updated;
        setDeviceStates(updated);
      }
      const updatedDevs = simulatedDevices.map((d) => (d.id === switchDev.id ? { ...d, name: switchDev.name } : d));
      simulatedDevices = updatedDevs;
      setDevices(updatedDevs);

      window.dispatchEvent(new CustomEvent('commit-action-event', { detail: { action: resultMsg } }));
    }, delay);
    delay += 1500;

    registerTimeout(() => {
      const closeBtn = getElementCoords(`[data-window-close="${switchDev.id}"]`, window.innerWidth / 2 + 220, window.innerHeight / 2 - 200);
      moveCursor(closeBtn.x, closeBtn.y, isTr ? `${switchDev.name} Kapat ✕` : `Close ${switchDev.name} ✕`, true);
      useMultiWindowStore.getState().closeDeviceWindow(switchDev.id);
    }, delay);
    delay += 500;
  });

  // ==========================================
  // PHASE 4: ROUTER CONFIGURATION (Interfaces, Routing Protocols, DHCP)
  // ==========================================
  routerDevices.forEach((routerDev) => {
    const devState = deviceStates?.get(routerDev.id);
    const routerCmds = getRouterCliCommands(routerDev, devState);

    registerTimeout(() => {
      currentStep++;
      updateProgress(currentStep, isTr ? `${routerDev.name} CLI Konsolu Açılıyor (IP & Yönlendirme)` : `Opening ${routerDev.name} CLI Console (IP & Routing)`);
      moveCursor(routerDev.x + 80, routerDev.y + 120, isTr ? `${routerDev.name} Konsol Aç` : `Open ${routerDev.name} Console`, true);
      useMultiWindowStore.getState().openDeviceWindow(routerDev.id, routerDev.type, 'console');
    }, delay);
    delay += 900;

    routerCmds.forEach((cliCmd) => {
      registerTimeout(() => {
        currentStep++;
        updateProgress(currentStep, `${routerDev.name} CLI: ${cliCmd}`);
        const cliCoords = getElementCoords('input[placeholder*="enable"], input[type="text"], [data-modal-content="true"] input', window.innerWidth / 2, window.innerHeight / 2 + 120);
        moveCursor(cliCoords.x, cliCoords.y, `${routerDev.name} CLI: ${cliCmd}`, false);
        window.dispatchEvent(
          new CustomEvent('terminal-auto-type', {
            detail: { deviceId: routerDev.id, command: cliCmd },
          })
        );
      }, delay);
      delay += Math.max(700, cliCmd.length * 60 + 200);

      registerTimeout(() => {
        const cliCoords = getElementCoords('input[placeholder*="enable"], input[type="text"], [data-modal-content="true"] input', window.innerWidth / 2, window.innerHeight / 2 + 120);
        moveCursor(cliCoords.x + 35, cliCoords.y, `Enter ↵ (${cliCmd})`, true, cliCmd);
        window.dispatchEvent(
          new CustomEvent('commit-action-event', {
            detail: { action: `${routerDev.name} CLI: ${cliCmd}` },
          })
        );
      }, delay);
      delay += 600;
    });

    registerTimeout(() => {
      currentStep++;
      const resultMsg = isTr
        ? `${routerDev.name} Router Arayüzleri ve Protokolleri Yapılandırıldı`
        : `${routerDev.name} Router Interfaces & Protocols Configured`;
      updateProgress(currentStep, resultMsg);
      moveCursor(window.innerWidth / 2, window.innerHeight / 2 + 50, isTr ? `Router Yapılandırması Tamam!` : `Router Config Completed!`, false);

      if (devState) {
        const updated = new Map(simulatedStates);
        updated.set(routerDev.id, devState);
        simulatedStates = updated;
        setDeviceStates(updated);
      }
      const updatedDevs = simulatedDevices.map((d) => (d.id === routerDev.id ? { ...d, name: routerDev.name } : d));
      simulatedDevices = updatedDevs;
      setDevices(updatedDevs);

      window.dispatchEvent(new CustomEvent('commit-action-event', { detail: { action: resultMsg } }));
    }, delay);
    delay += 1500;

    registerTimeout(() => {
      const closeBtn = getElementCoords(`[data-window-close="${routerDev.id}"]`, window.innerWidth / 2 + 220, window.innerHeight / 2 - 200);
      moveCursor(closeBtn.x, closeBtn.y, isTr ? `${routerDev.name} Kapat ✕` : `Close ${routerDev.name} ✕`, true);
      useMultiWindowStore.getState().closeDeviceWindow(routerDev.id);
    }, delay);
    delay += 500;
  });

  // ==========================================
  // PHASE 5: WLC / ACCESS POINT CONFIGURATION
  // ==========================================
  wlcDevices.forEach((wlcDev) => {
    const wlcIp = wlcDev.ip || '192.168.1.250';
    const wlanSsid = wlcDev.wifi?.ssid || 'Enterprise-Corp';

    registerTimeout(() => {
      currentStep++;
      updateProgress(currentStep, isTr ? `${wlcDev.name} WLC Yönetim Paneli Açılıyor` : `Opening ${wlcDev.name} WLC Management Panel`);
      moveCursor(wlcDev.x + 80, wlcDev.y + 120, isTr ? `${wlcDev.name} Yönetim Aç` : `Open ${wlcDev.name} Management`, true);
      useMultiWindowStore.getState().openDeviceWindow(wlcDev.id, wlcDev.type, 'wireless');
    }, delay);
    delay += 900;

    registerTimeout(() => {
      currentStep++;
      updateProgress(currentStep, isTr ? `${wlcDev.name} WLAN '${wlanSsid}' ve Yönetim IP'si (${wlcIp}) Yapılandırılıyor` : `${wlcDev.name} Configuring WLAN '${wlanSsid}' & IP (${wlcIp})`);
      moveCursor(window.innerWidth / 2, window.innerHeight / 2 - 10, `WLAN: ${wlanSsid} (WPA2-Enterprise)`, false);

      const updated = simulatedDevices.map((d) =>
        d.id === wlcDev.id
          ? {
              ...d,
              name: wlcDev.name,
              ip: wlcIp,
              wifi: d.wifi ? { ...d.wifi, enabled: true, ssid: wlanSsid } : { enabled: true, ssid: wlanSsid, mode: 'ap' as const },
            }
          : d
      );
      simulatedDevices = updated;
      setDevices(updated);

      window.dispatchEvent(
        new CustomEvent('commit-action-event', {
          detail: {
            action: isTr
              ? `${wlcDev.name} WLC: WLAN '${wlanSsid}' & CAPWAP Aktif (IP: ${wlcIp})`
              : `${wlcDev.name} WLC: WLAN '${wlanSsid}' & CAPWAP Active (IP: ${wlcIp})`,
          },
        })
      );
    }, delay);
    delay += 1200;

    registerTimeout(() => {
      const closeBtn = getElementCoords(`[data-window-close="${wlcDev.id}"]`, window.innerWidth / 2 + 200, window.innerHeight / 2 - 200);
      moveCursor(closeBtn.x, closeBtn.y, isTr ? `${wlcDev.name} Kapat ✕` : `Close ${wlcDev.name} ✕`, true);
      useMultiWindowStore.getState().closeDeviceWindow(wlcDev.id);
    }, delay);
    delay += 500;
  });

  // ==========================================
  // PHASE 6: PC & ENDPOINT CONFIGURATION (ALL PCs)
  // ==========================================
  pcDevices.forEach((pc) => {
    const targetName = pc.name;
    const targetIp = pc.ip || '192.168.1.10';
    const targetSubnet = pc.subnet || '255.255.255.0';
    const targetGateway = pc.gateway || '';
    const targetDns = pc.dns || '';

    // Step 6a: Open PC Settings Window
    registerTimeout(() => {
      currentStep++;
      updateProgress(currentStep, isTr ? `${targetName} Ayar Paneli Açılıyor` : `Opening ${targetName} Settings`);
      moveCursor(pc.x + 80, pc.y + 120, isTr ? `${targetName} Ayarları Aç` : `Open ${targetName} Settings`, true);
      useMultiWindowStore.getState().openDeviceWindow(pc.id, 'pc', 'settings');
    }, delay);
    delay += 900;

    // Step 6b: Rename Device if changed
    registerTimeout(() => {
      currentStep++;
      updateProgress(currentStep, isTr ? `${targetName} Cihaz İsmi Güncelleniyor` : `Updating device name: ${targetName}`);
      const nameCoords = getElementCoords('input[placeholder*="PC"], input[name="name"], [data-testid="device-name-input"]', window.innerWidth / 2 - 80, window.innerHeight / 2 - 100);
      moveCursor(nameCoords.x, nameCoords.y, isTr ? `İsim: ${targetName}` : `Name: ${targetName}`, false, targetName);

      const updated = simulatedDevices.map((d) => (d.id === pc.id ? { ...d, name: targetName } : d));
      simulatedDevices = updated;
      setDevices(updated);

      window.dispatchEvent(
        new CustomEvent('commit-action-event', {
          detail: { action: isTr ? `${targetName} olarak adlandırıldı` : `Renamed to ${targetName}` },
        })
      );
    }, delay);
    delay += 1000;

    // Step 6c: Set IP Address
    registerTimeout(() => {
      currentStep++;
      updateProgress(currentStep, `${targetName} IP: ${targetIp}`);
      const ipCoords = getElementCoords('input[placeholder*="192.168.1.100"], input[placeholder*="192."], input[name="ip"]', window.innerWidth / 2 - 100, window.innerHeight / 2 - 40);
      moveCursor(ipCoords.x, ipCoords.y, `${targetName} IP: ${targetIp}`, false, targetIp);

      const updated = simulatedDevices.map((d) => (d.id === pc.id ? { ...d, name: targetName, ip: targetIp } : d));
      simulatedDevices = updated;
      setDevices(updated);

      const ipEl = (document.querySelector('input[placeholder*="192.168.1.100"]') ||
        document.querySelector('input[placeholder*="192."]') ||
        document.querySelector('input[name="ip"]')) as HTMLInputElement | null;
      if (ipEl) {
        ipEl.focus();
        ipEl.value = targetIp;
        ipEl.dispatchEvent(new Event('input', { bubbles: true }));
        ipEl.dispatchEvent(new Event('change', { bubbles: true }));
      }

      window.dispatchEvent(
        new CustomEvent('commit-action-event', {
          detail: { action: isTr ? `${targetName} IP: ${targetIp} ayarlandı` : `Set ${targetName} IP: ${targetIp}` },
        })
      );
    }, delay);
    delay += 1100;

    // Step 6d: Set Subnet Mask
    registerTimeout(() => {
      currentStep++;
      updateProgress(currentStep, `${targetName} Alt Ağ Maskesi: ${targetSubnet}`);
      const subnetCoords = getElementCoords('input[placeholder*="255.255.255.0"], input[placeholder*="255."], input[name="subnet"]', window.innerWidth / 2 + 100, window.innerHeight / 2 - 40);
      moveCursor(subnetCoords.x, subnetCoords.y, `${targetName} Mask: ${targetSubnet}`, false, targetSubnet);

      const updated = simulatedDevices.map((d) => (d.id === pc.id ? { ...d, name: targetName, ip: targetIp, subnet: targetSubnet } : d));
      simulatedDevices = updated;
      setDevices(updated);

      const subnetEl = (document.querySelector('input[placeholder*="255.255.255.0"]') ||
        document.querySelector('input[placeholder*="255."]') ||
        document.querySelector('input[name="subnet"]')) as HTMLInputElement | null;
      if (subnetEl) {
        subnetEl.focus();
        subnetEl.value = targetSubnet;
        subnetEl.dispatchEvent(new Event('input', { bubbles: true }));
        subnetEl.dispatchEvent(new Event('change', { bubbles: true }));
      }

      window.dispatchEvent(
        new CustomEvent('commit-action-event', {
          detail: { action: isTr ? `${targetName} Maske: ${targetSubnet} ayarlandı` : `Set ${targetName} Mask: ${targetSubnet}` },
        })
      );
    }, delay);
    delay += 1100;

    // Step 6e: Default Gateway (if defined)
    if (targetGateway) {
      registerTimeout(() => {
        currentStep++;
        updateProgress(currentStep, `${targetName} Varsayılan Ağ Geçidi: ${targetGateway}`);
        const gwCoords = getElementCoords('input[placeholder*="Gateway"], input[name="gateway"]', window.innerWidth / 2 - 100, window.innerHeight / 2 + 20);
        moveCursor(gwCoords.x, gwCoords.y, `Gateway: ${targetGateway}`, false, targetGateway);

        const updated = simulatedDevices.map((d) => (d.id === pc.id ? { ...d, gateway: targetGateway } : d));
        simulatedDevices = updated;
        setDevices(updated);

        window.dispatchEvent(
          new CustomEvent('commit-action-event', {
            detail: { action: isTr ? `${targetName} Ağ Geçidi: ${targetGateway} ayarlandı` : `Set ${targetName} Gateway: ${targetGateway}` },
          })
        );
      }, delay);
      delay += 1000;
    }

    // Step 6f: DNS Server (if defined)
    if (targetDns) {
      registerTimeout(() => {
        currentStep++;
        updateProgress(currentStep, `${targetName} DNS Sunucusu: ${targetDns}`);
        const dnsCoords = getElementCoords('input[placeholder*="DNS"], input[name="dns"]', window.innerWidth / 2 + 100, window.innerHeight / 2 + 20);
        moveCursor(dnsCoords.x, dnsCoords.y, `DNS: ${targetDns}`, false, targetDns);

        const updated = simulatedDevices.map((d) => (d.id === pc.id ? { ...d, dns: targetDns } : d));
        simulatedDevices = updated;
        setDevices(updated);

        window.dispatchEvent(
          new CustomEvent('commit-action-event', {
            detail: { action: isTr ? `${targetName} DNS: ${targetDns} ayarlandı` : `Set ${targetName} DNS: ${targetDns}` },
          })
        );
      }, delay);
      delay += 1000;
    }

    // Step 6g: Wi-Fi Setup if enabled
    if (pc.wifi) {
      const ssid = pc.wifi.ssid || 'NetSim-WiFi';
      const pass = pc.wifi.password || 'password123';
      registerTimeout(() => {
        currentStep++;
        updateProgress(currentStep, `${targetName} Wi-Fi Bağlantısı: '${ssid}'`);
        moveCursor(window.innerWidth / 2, window.innerHeight / 2 + 60, `Wi-Fi: ${ssid}`, false);

        const updated = simulatedDevices.map((d) =>
          d.id === pc.id ? { ...d, wifi: { ...pc.wifi, enabled: true, ssid, password: pass, mode: pc.wifi?.mode || 'client' } } : d
        );
        simulatedDevices = updated;
        setDevices(updated);

        window.dispatchEvent(
          new CustomEvent('commit-action-event', {
            detail: { action: isTr ? `${targetName} Wi-Fi Bağlandı: '${ssid}'` : `${targetName} Connected Wi-Fi: '${ssid}'` },
          })
        );
      }, delay);
      delay += 1000;
    }

    // Close PC Settings Window
    registerTimeout(() => {
      const closeBtn = getElementCoords(`[data-window-close="${pc.id}"]`, window.innerWidth / 2 + 220, window.innerHeight / 2 - 180);
      moveCursor(closeBtn.x, closeBtn.y, isTr ? `${targetName} Kapat ✕` : `Close ${targetName} ✕`, true);
      useMultiWindowStore.getState().closeDeviceWindow(pc.id);
    }, delay);
    delay += 500;
  });

  // ==========================================
  // PHASE 7: MOBILE / WIRELESS CLIENT CONFIGURATION
  // ==========================================
  wifiDevices.forEach((wifiDev) => {
    const ssid = wifiDev.wifi?.ssid || 'NetSim-WiFi';
    const pass = wifiDev.wifi?.password || 'password123';

    registerTimeout(() => {
      currentStep++;
      updateProgress(currentStep, isTr ? `${wifiDev.name} Wi-Fi Ayarları Açılıyor` : `Opening ${wifiDev.name} Wi-Fi Settings`);
      moveCursor(wifiDev.x + 80, wifiDev.y + 120, isTr ? `${wifiDev.name} Wi-Fi Aç` : `Open ${wifiDev.name} Wi-Fi`, true);
      useMultiWindowStore.getState().openDeviceWindow(wifiDev.id, wifiDev.type, 'wireless');
    }, delay);
    delay += 900;

    registerTimeout(() => {
      currentStep++;
      updateProgress(currentStep, isTr ? `${wifiDev.name} Wi-Fi: '${ssid}' Ağına Bağlanıyor` : `${wifiDev.name} Connecting to Wi-Fi '${ssid}'`);
      const ssidCoords = getElementCoords('input[placeholder*="SSID"], input[name="ssid"], [data-modal-content="true"] input', window.innerWidth / 2, window.innerHeight / 2 - 20);
      moveCursor(ssidCoords.x, ssidCoords.y, `SSID: ${ssid}`, false, ssid);

      const updated = simulatedDevices.map((d) =>
        d.id === wifiDev.id
          ? {
              ...d,
              name: wifiDev.name,
              wifi: d.wifi ? { ...d.wifi, enabled: true, ssid, password: pass, mode: d.wifi.mode || 'client' } : { enabled: true, ssid, password: pass, mode: 'client' as const },
            }
          : d
      );
      simulatedDevices = updated;
      setDevices(updated);

      window.dispatchEvent(
        new CustomEvent('commit-action-event', {
          detail: { action: isTr ? `${wifiDev.name} Wi-Fi Bağlandı: SSID '${ssid}'` : `Connected ${wifiDev.name} to Wi-Fi: '${ssid}'` },
        })
      );
    }, delay);
    delay += 1100;

    registerTimeout(() => {
      const closeBtn = getElementCoords(`[data-window-close="${wifiDev.id}"]`, window.innerWidth / 2 + 200, window.innerHeight / 2 - 200);
      moveCursor(closeBtn.x, closeBtn.y, isTr ? `${wifiDev.name} Kapat ✕` : `Close ${wifiDev.name} ✕`, true);
      useMultiWindowStore.getState().closeDeviceWindow(wifiDev.id);
    }, delay);
    delay += 500;
  });

  // ==========================================
  // PHASE 8: PRINTER & IOT CONFIGURATION
  // ==========================================
  printerDevices.forEach((printerDev) => {
    const printerIp = printerDev.ip || '192.168.1.20';

    registerTimeout(() => {
      currentStep++;
      updateProgress(currentStep, isTr ? `${printerDev.name} Yazıcı Ayarları Açılıyor` : `Opening ${printerDev.name} Printer Settings`);
      moveCursor(printerDev.x + 80, printerDev.y + 120, isTr ? `${printerDev.name} Aç` : `Open ${printerDev.name}`, true);
      useMultiWindowStore.getState().openDeviceWindow(printerDev.id, 'printer', 'console');
    }, delay);
    delay += 900;

    registerTimeout(() => {
      currentStep++;
      updateProgress(currentStep, isTr ? `${printerDev.name} Ağ Yazıcısı Aktif (IP: ${printerIp})` : `${printerDev.name} Network Printer Ready (IP: ${printerIp})`);
      moveCursor(window.innerWidth / 2, window.innerHeight / 2 - 10, `IP: ${printerIp}`, false);

      const updated = simulatedDevices.map((d) => (d.id === printerDev.id ? { ...d, name: printerDev.name, ip: printerIp } : d));
      simulatedDevices = updated;
      setDevices(updated);

      window.dispatchEvent(
        new CustomEvent('commit-action-event', {
          detail: { action: isTr ? `${printerDev.name} Ağ Yazıcısı Yapılandırıldı (IP: ${printerIp})` : `Configured ${printerDev.name} (IP: ${printerIp})` },
        })
      );
    }, delay);
    delay += 1000;

    registerTimeout(() => {
      const closeBtn = getElementCoords(`[data-window-close="${printerDev.id}"]`, window.innerWidth / 2 + 200, window.innerHeight / 2 - 200);
      moveCursor(closeBtn.x, closeBtn.y, isTr ? `${printerDev.name} Kapat ✕` : `Close ${printerDev.name} ✕`, true);
      useMultiWindowStore.getState().closeDeviceWindow(printerDev.id);
    }, delay);
    delay += 500;
  });

  iotDevices.forEach((iotDev) => {
    const iotIp = iotDev.ip || '192.168.1.30';
    const kind = iotDev.iot?.kind || 'sensor';
    const sensorType = iotDev.iot?.sensorType || 'temperature';
    const iotLabel = kind === 'sensor' ? `${sensorType.toUpperCase()} Sensörü` : `${kind.toUpperCase()} Aktüatörü`;

    registerTimeout(() => {
      currentStep++;
      updateProgress(currentStep, isTr ? `${iotDev.name} (${iotLabel}) Ayarları Açılıyor` : `Opening ${iotDev.name} (${iotLabel}) Settings`);
      moveCursor(iotDev.x + 80, iotDev.y + 120, isTr ? `${iotDev.name} Aç` : `Open ${iotDev.name}`, true);
      useMultiWindowStore.getState().openDeviceWindow(iotDev.id, 'iot', 'console');
    }, delay);
    delay += 900;

    registerTimeout(() => {
      currentStep++;
      updateProgress(currentStep, isTr ? `${iotDev.name} (${iotLabel}) Aktif (IP: ${iotIp})` : `${iotDev.name} (${iotLabel}) Active (IP: ${iotIp})`);
      moveCursor(window.innerWidth / 2, window.innerHeight / 2 - 10, `IP: ${iotIp}`, false);

      const updated = simulatedDevices.map((d) => (d.id === iotDev.id ? { ...d, name: iotDev.name, ip: iotIp } : d));
      simulatedDevices = updated;
      setDevices(updated);

      window.dispatchEvent(
        new CustomEvent('commit-action-event', {
          detail: { action: isTr ? `${iotDev.name} [${iotLabel}] Yapılandırıldı (IP: ${iotIp})` : `Configured ${iotDev.name} [${iotLabel}] (IP: ${iotIp})` },
        })
      );
    }, delay);
    delay += 1000;

    registerTimeout(() => {
      const closeBtn = getElementCoords(`[data-window-close="${iotDev.id}"]`, window.innerWidth / 2 + 200, window.innerHeight / 2 - 200);
      moveCursor(closeBtn.x, closeBtn.y, isTr ? `${iotDev.name} Kapat ✕` : `Close ${iotDev.name} ✕`, true);
      useMultiWindowStore.getState().closeDeviceWindow(iotDev.id);
    }, delay);
    delay += 500;
  });

  // ==========================================
  // PHASE 9: FINAL NETWORK VERIFICATION & PING TEST (ALL DEVICES CONFIGURED!)
  // ==========================================
  let pingSrcDev: CanvasDevice | undefined;
  let pingTargetIp: string | undefined;

  if (pcDevices.length >= 2) {
    pingSrcDev = pcDevices[0];
    pingTargetIp = pcDevices[1].ip || '192.168.1.11';
  } else if (pcDevices.length >= 1 && routerDevices.length >= 1) {
    pingSrcDev = pcDevices[0];
    const rState = deviceStates.get(routerDevices[0].id);
    const rPort = rState?.ports ? Object.values(rState.ports).find((p) => p.ipAddress) : undefined;
    pingTargetIp = rPort?.ipAddress || pcDevices[0].gateway || '192.168.1.1';
  } else if (pcDevices.length >= 1 && printerDevices.length >= 1) {
    pingSrcDev = pcDevices[0];
    pingTargetIp = printerDevices[0].ip || '192.168.1.20';
  }

  if (pingSrcDev && pingTargetIp) {
    const src = pingSrcDev;
    const targetIp = pingTargetIp;
    const pingCmd = `ping ${targetIp}`;

    registerTimeout(() => {
      currentStep++;
      updateProgress(
        currentStep,
        isTr
          ? `Tüm Cihazlar Yapılandırıldı! Test Doğrulaması: ${src.name} CMD Terminali Açılıyor`
          : `All Devices Configured! Verification Test: Opening ${src.name} CMD Terminal`
      );
      moveCursor(src.x + 80, src.y + 120, isTr ? `${src.name} CMD Aç (Ping Testi)` : `Open ${src.name} CMD (Ping Test)`, true);
      useMultiWindowStore.getState().openDeviceWindow(src.id, 'pc', 'desktop');
    }, delay);
    delay += 1000;

    registerTimeout(() => {
      currentStep++;
      updateProgress(currentStep, isTr ? `Uçtan Uca Ağ Doğrulaması: ${pingCmd}` : `End-to-End Verification: ${pingCmd}`);
      const termCoords = getElementCoords('input[placeholder*="ping"], .custom-scrollbar input, [data-modal-content="true"] input', window.innerWidth / 2, window.innerHeight / 2 + 100);
      moveCursor(termCoords.x, termCoords.y, `Komut: ${pingCmd}`, false);
      window.dispatchEvent(
        new CustomEvent('pc-auto-type', {
          detail: { deviceId: src.id, command: pingCmd },
        })
      );
    }, delay);
    delay += Math.max(1000, pingCmd.length * 70 + 300);

    registerTimeout(() => {
      const termCoords = getElementCoords('input[placeholder*="ping"], .custom-scrollbar input, [data-modal-content="true"] input', window.innerWidth / 2, window.innerHeight / 2 + 100);
      moveCursor(termCoords.x + 35, termCoords.y, `Enter ↵ (${pingCmd})`, true, pingCmd);
      window.dispatchEvent(
        new CustomEvent('commit-action-event', {
          detail: { action: `${src.name} CMD: ${pingCmd}` },
        })
      );
    }, delay);
    delay += 800;

    registerTimeout(() => {
      currentStep++;
      updateProgress(
        currentStep,
        isTr
          ? `Ağ İletişimi Başarılı! Paketler İletildi (Reply from ${targetIp}) ✓`
          : `Network Communication Verified! Packets Delivered (Reply from ${targetIp}) ✓`
      );
      moveCursor(
        window.innerWidth / 2,
        window.innerHeight / 2 + 30,
        isTr ? `İletişim Başarılı! (Reply from ${targetIp}: bytes=32 time=1ms TTL=128)` : `Communication Succeeded! (Reply from ${targetIp}: bytes=32 time=1ms TTL=128)`,
        false
      );
      window.dispatchEvent(
        new CustomEvent('commit-action-event', {
          detail: { action: isTr ? `${src.name} ➔ ${targetIp} Ping Başarılı (4/4 Paket İletildi)` : `Ping ${src.name} ➔ ${targetIp} Succeeded (4/4 Packets Delivered)` },
        })
      );
    }, delay);
    delay += 2500;

    registerTimeout(() => {
      const closeBtn = getElementCoords(`[data-window-close="${src.id}"]`, window.innerWidth / 2 + 220, window.innerHeight / 2 - 200);
      moveCursor(closeBtn.x, closeBtn.y, isTr ? `${src.name} CMD Kapat ✕` : `Close ${src.name} CMD ✕`, true);
      useMultiWindowStore.getState().closeDeviceWindow(src.id);
    }, delay);
    delay += 500;
  }

  // ==========================================
  // PHASE 10: COMPLETE SIMULATION & CLEANUP
  // ==========================================
  const projName = data.projectName || (isTr ? 'Topoloji' : 'Topology');
  registerTimeout(() => {
    hideCursor();
    setDevices(data.devices);
    setConnections(data.connections);
    setDeviceStates(deviceStates);
    window.dispatchEvent(
      new CustomEvent('simulation-progress', {
        detail: {
          active: false,
          current: totalSteps,
          total: totalSteps,
          message: isTr ? `${projName} Başarıyla Tamamlandı! 🎉` : `${projName} Successfully Completed! 🎉`,
        },
      })
    );
    window.removeEventListener('simulation-stop', onStopReq);
    window.dispatchEvent(new CustomEvent('add-summary-note'));
  }, delay + 500);
}
