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
      // Exclude default VLAN 1 and reserved Cisco VLANs (1002, 1003, 1004, 1005)
      if (vlan.id > 1 && (vlan.id < 1002 || vlan.id > 1005)) {
        devCmds.push(`vlan ${vlan.id}`);
        if (vlan.name && vlan.name !== `VLAN${vlan.id}` && !vlan.name.toLowerCase().includes('default')) {
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
      } else if (
        p.mode === 'access' &&
        typeof p.accessVlan === 'number' &&
        p.accessVlan > 1 &&
        (p.accessVlan < 1002 || p.accessVlan > 1005)
      ) {
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

  // DHCP Pools (can be Record<string, ...> or Array<...>)
  const rawDhcpPools = (devState as unknown as { dhcpPools?: unknown })?.dhcpPools;
  if (rawDhcpPools) {
    if (Array.isArray(rawDhcpPools)) {
      rawDhcpPools.forEach((pool: { name?: string; network?: string; subnetMask?: string; mask?: string; defaultRouter?: string; dnsServer?: string }) => {
        if (pool?.name && pool?.network) {
          devCmds.push(`ip dhcp pool ${pool.name}`);
          devCmds.push(`network ${pool.network} ${pool.subnetMask || pool.mask || '255.255.255.0'}`);
          if (pool.defaultRouter) devCmds.push(`default-router ${pool.defaultRouter}`);
          if (pool.dnsServer) devCmds.push(`dns-server ${pool.dnsServer}`);
          devCmds.push('exit');
        }
      });
    } else if (typeof rawDhcpPools === 'object') {
      Object.entries(rawDhcpPools as Record<string, { network?: string; subnetMask?: string; mask?: string; defaultRouter?: string; dnsServer?: string }>).forEach(([name, pool]) => {
        if (pool?.network) {
          devCmds.push(`ip dhcp pool ${name}`);
          devCmds.push(`network ${pool.network} ${pool.subnetMask || pool.mask || '255.255.255.0'}`);
          if (pool.defaultRouter) devCmds.push(`default-router ${pool.defaultRouter}`);
          if (pool.dnsServer) devCmds.push(`dns-server ${pool.dnsServer}`);
          devCmds.push('exit');
        }
      });
    }
  }

  const rawDynamicRoutes = (devState as unknown as { dynamicRoutes?: unknown })?.dynamicRoutes;
  const dynamicRoutes = Array.isArray(rawDynamicRoutes)
    ? (rawDynamicRoutes as Array<{ destination?: string; subnetMask?: string; area?: number }>)
    : [];

  const rawStaticRoutes = (devState as unknown as { staticRoutes?: unknown })?.staticRoutes;
  const staticRoutes = Array.isArray(rawStaticRoutes)
    ? (rawStaticRoutes as Array<{ destination?: string; subnetMask?: string; nextHop?: string }>)
    : [];

  const bgpCfg = (devState as unknown as { bgpConfig?: { localAs?: number; neighbors?: string[] } })?.bgpConfig;
  const ripCfg = (devState as unknown as { ripConfig?: { version?: number; networks?: string[] } })?.ripConfig;
  const ospfId = (devState as unknown as { ospfProcessId?: string })?.ospfProcessId;

  if (ospfId || dynamicRoutes.length > 0) {
    devCmds.push(`router ospf ${ospfId || '1'}`);
    dynamicRoutes.forEach((r) => {
      if (r.destination && r.subnetMask) {
        devCmds.push(`network ${r.destination} ${r.subnetMask} area ${r.area ?? 0}`);
      }
    });
    devCmds.push('exit');
  } else if (ripCfg && Array.isArray(ripCfg.networks) && ripCfg.networks.length > 0) {
    devCmds.push('router rip');
    devCmds.push(`version ${ripCfg.version || 2}`);
    ripCfg.networks.forEach((net) => {
      devCmds.push(`network ${net}`);
    });
    devCmds.push('exit');
  } else if (bgpCfg && bgpCfg.localAs) {
    devCmds.push(`router bgp ${bgpCfg.localAs}`);
    const neighbors = Array.isArray(bgpCfg.neighbors) ? bgpCfg.neighbors : [];
    neighbors.forEach((nbr) => {
      devCmds.push(`neighbor ${nbr} remote-as ${bgpCfg.localAs}`);
    });
    devCmds.push('exit');
  } else if (staticRoutes.length > 0) {
    staticRoutes.forEach((sr) => {
      if (sr.destination && sr.subnetMask && sr.nextHop) {
        devCmds.push(`ip route ${sr.destination} ${sr.subnetMask} ${sr.nextHop}`);
      }
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

let activeSimulationStopper: (() => void) | null = null;

export function runStepByStepSimulation({
  data,
  setDevices,
  setConnections,
  setDeviceStates,
  isTr,
}: StepByStepSimulationParams) {
  if (activeSimulationStopper) {
    activeSimulationStopper();
    activeSimulationStopper = null;
  }

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

  interface StepQueueItem {
    run: () => void;
    durationMs: number;
  }

  const stepQueue: StepQueueItem[] = [];
  const addStep = (fn: () => void, durationMs = 400) => {
    stepQueue.push({ run: fn, durationMs });
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

  let isPaused = false;
  let isStopped = false;
  let currentStep = 0;
  let currentStepIdx = 0;
  let currentMessage = '';
  let currentTimer: NodeJS.Timeout | null = null;
  let pauseWaiter: (() => void) | null = null;
  let delayResolver: (() => void) | null = null;
  let delayStartTimestamp = 0;
  let remainingDelayMs = 0;

  const totalSteps = calculateSimulationSteps({ devices, connections, deviceStates });

  const updateProgress = (step: number, msg: string, paused = false) => {
    currentMessage = msg;
    window.dispatchEvent(
      new CustomEvent('simulation-progress', {
        detail: { active: true, paused, current: step, total: totalSteps, message: msg },
      })
    );
  };

  const waitOrPause = (durationMs: number): Promise<void> => {
    if (isStopped) return Promise.resolve();

    return new Promise<void>((resolve) => {
      delayResolver = resolve;
      remainingDelayMs = durationMs;

      const finishDelay = () => {
        currentTimer = null;
        delayResolver = null;
        resolve();
      };

      const startTimer = () => {
        if (isStopped) {
          finishDelay();
          return;
        }
        if (isPaused) {
          pauseWaiter = () => {
            pauseWaiter = null;
            startTimer();
          };
          return;
        }

        if (remainingDelayMs <= 0) {
          finishDelay();
          return;
        }

        delayStartTimestamp = Date.now();
        currentTimer = setTimeout(finishDelay, remainingDelayMs);
      };

      if (isPaused) {
        pauseWaiter = () => {
          pauseWaiter = null;
          startTimer();
        };
      } else {
        startTimer();
      }
    });
  };

  const pauseSimulation = () => {
    if (isStopped || isPaused) return;
    isPaused = true;
    if (currentTimer) {
      clearTimeout(currentTimer);
      currentTimer = null;
      const elapsed = Date.now() - delayStartTimestamp;
      remainingDelayMs = Math.max(0, remainingDelayMs - elapsed);
    }
    updateProgress(currentStep, currentMessage || (isTr ? 'Duraklatıldı' : 'Paused'), true);
  };

  const resumeSimulation = () => {
    if (isStopped || !isPaused) return;
    isPaused = false;
    updateProgress(currentStep, currentMessage || (isTr ? 'Devam Ediyor' : 'Resuming'), false);
    if (pauseWaiter) {
      const waiter = pauseWaiter;
      pauseWaiter = null;
      waiter();
    }
  };

  const togglePause = () => {
    if (isPaused) {
      resumeSimulation();
    } else {
      pauseSimulation();
    }
  };

  const stopSimulation = () => {
    if (isStopped) return;
    isStopped = true;
    isPaused = false;
    if (currentTimer) {
      clearTimeout(currentTimer);
      currentTimer = null;
    }
    if (pauseWaiter) {
      pauseWaiter = null;
    }
    if (delayResolver) {
      const res = delayResolver;
      delayResolver = null;
      res();
    }
    hideCursor();
    cleanupListeners();
    if (activeSimulationStopper === stopSimulation) {
      activeSimulationStopper = null;
    }
    window.dispatchEvent(
      new CustomEvent('simulation-progress', {
        detail: { active: false, paused: false, current: 0, total: 0, message: isTr ? 'İptal Edildi' : 'Cancelled' },
      })
    );
  };

  const onStopReq = () => stopSimulation();
  const onPauseReq = () => pauseSimulation();
  const onResumeReq = () => resumeSimulation();
  const onToggleReq = () => togglePause();

  const onCommandError = (e: Event) => {
    const detail = (e as CustomEvent<{ deviceId?: string; command?: string; error?: string }>).detail;
    if (isStopped) return;
    pauseSimulation();
    const cleanErr = detail?.error ? ` (${detail.error.trim().split('\n')[0]})` : '';
    const alertMsg = isTr
      ? `Hata: "${detail?.command || 'CLI'}" komutu başarısız oldu${cleanErr}. Otomatik ilerleme duraklatıldı.`
      : `Error: "${detail?.command || 'CLI'}" command failed${cleanErr}. Auto-progression paused.`;
    updateProgress(currentStep, alertMsg, true);
  };

  const cleanupListeners = () => {
    window.removeEventListener('simulation-stop', onStopReq);
    window.removeEventListener('simulation-pause', onPauseReq);
    window.removeEventListener('simulation-resume', onResumeReq);
    window.removeEventListener('simulation-toggle-pause', onToggleReq);
    window.removeEventListener('terminal-command-error', onCommandError);
  };

  window.addEventListener('simulation-stop', onStopReq);
  window.addEventListener('simulation-pause', onPauseReq);
  window.addEventListener('simulation-resume', onResumeReq);
  window.addEventListener('simulation-toggle-pause', onToggleReq);
  window.addEventListener('terminal-command-error', onCommandError);
  activeSimulationStopper = stopSimulation;

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
    addStep(() => {
      currentStep++;
      updateProgress(currentStep, isTr ? `${initialFactoryName} seçiliyor` : `Selecting ${initialFactoryName}`);
      const targetBtn = getElementCoords(devSelector, 220, 75);
      moveCursor(targetBtn.x, targetBtn.y, isTr ? `${dev.type.toUpperCase()} Seçiliyor` : `Selecting ${dev.type.toUpperCase()}`, false);
    }, 400);

    // Step 1b: Click toolbar button
    addStep(() => {
      const targetBtn = getElementCoords(devSelector, 220, 75);
      moveCursor(targetBtn.x, targetBtn.y, isTr ? `${dev.type.toUpperCase()} Seçildi` : `Selected ${dev.type.toUpperCase()}`, true);
    }, 350);

    // Step 1c: Move cursor to canvas target position
    addStep(() => {
      const screenX = Math.min(window.innerWidth - 100, Math.max(120, dev.x + 80));
      const screenY = Math.min(window.innerHeight - 150, Math.max(150, dev.y + 120));
      moveCursor(screenX, screenY, isTr ? `${initialFactoryName} Tuvale Yerleştiriliyor` : `Placing ${initialFactoryName} on Canvas`, false);
    }, 400);

    // Step 1d: Click and place blank device
    addStep(() => {
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
    }, 750);
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
      addStep(() => {
        currentStep++;
        updateProgress(
          currentStep,
          isTr
            ? `Kablo (${cableLabel}): ${srcDev?.name || ''} ➔ ${tgtDev?.name || ''}`
            : `Cable (${cableLabel}): ${srcDev?.name || ''} ➔ ${tgtDev?.name || ''}`
        );
        const cableBtnCoords = getElementCoords(cableSelector, 330, 75);
        moveCursor(cableBtnCoords.x, cableBtnCoords.y, isTr ? `${cableLabel} Kablo Seçiliyor` : `Selecting ${cableLabel} Cable`, false);
      }, 400);

      addStep(() => {
        const cableBtnCoords = getElementCoords(cableSelector, 330, 75);
        moveCursor(cableBtnCoords.x, cableBtnCoords.y, isTr ? `${cableLabel} Kablo Seçildi` : `Selected ${cableLabel} Cable`, true);
      }, 350);
    } else {
      addStep(() => {
        currentStep++;
        updateProgress(
          currentStep,
          isTr
            ? `Kablo (${cableLabel}): ${srcDev?.name || ''} ➔ ${tgtDev?.name || ''}`
            : `Cable (${cableLabel}): ${srcDev?.name || ''} ➔ ${tgtDev?.name || ''}`
        );
      }, 350);
    }

    // Source Port
    addStep(() => {
      const portName = conn.sourcePort || 'Port';
      const srcPortSelector = `[data-device-id="${srcDev?.id}"][data-port-id="${conn.sourcePort}"], [data-device-id="${srcDev?.id}"] [data-port-id="${conn.sourcePort}"], [data-device-id="${srcDev?.id}"]`;
      const srcCoords = getElementCoords(srcPortSelector, srcDev ? srcDev.x + 80 : 200, srcDev ? srcDev.y + 120 : 200);
      moveCursor(srcCoords.x, srcCoords.y, isTr ? `${srcDev?.name || ''} [${portName}] Bağlanıyor` : `Connecting to ${srcDev?.name || ''} [${portName}]`, false);
    }, 400);

    addStep(() => {
      const portName = conn.sourcePort || 'Port';
      const srcPortSelector = `[data-device-id="${srcDev?.id}"][data-port-id="${conn.sourcePort}"], [data-device-id="${srcDev?.id}"] [data-port-id="${conn.sourcePort}"], [data-device-id="${srcDev?.id}"]`;
      const srcCoords = getElementCoords(srcPortSelector, srcDev ? srcDev.x + 80 : 200, srcDev ? srcDev.y + 120 : 200);
      moveCursor(srcCoords.x, srcCoords.y, isTr ? `${srcDev?.name || ''} [${portName}] Tıklandı ✓` : `${srcDev?.name || ''} [${portName}] Clicked ✓`, true);
    }, 400);

    // Target Port
    addStep(() => {
      const portName = conn.targetPort || 'Port';
      const tgtPortSelector = `[data-device-id="${tgtDev?.id}"][data-port-id="${conn.targetPort}"], [data-device-id="${tgtDev?.id}"] [data-port-id="${conn.targetPort}"], [data-device-id="${tgtDev?.id}"]`;
      const tgtCoords = getElementCoords(tgtPortSelector, tgtDev ? tgtDev.x + 80 : 350, tgtDev ? tgtDev.y + 120 : 250);
      moveCursor(tgtCoords.x, tgtCoords.y, isTr ? `${tgtDev?.name || ''} [${portName}] Bağlanıyor` : `Connecting to ${tgtDev?.name || ''} [${portName}]`, false);
    }, 400);

    addStep(() => {
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
    }, 750);
  });

  // ==========================================
  // PHASE 3: SWITCH CONFIGURATION (VLANs, Trunks, Access, SVI)
  // ==========================================
  switchDevices.forEach((switchDev) => {
    const devState = deviceStates?.get(switchDev.id);
    const switchCmds = getSwitchCliCommands(switchDev, devState);

    addStep(() => {
      currentStep++;
      updateProgress(currentStep, isTr ? `${switchDev.name} CLI Konsolu Açılıyor (VLAN & Port Yapılandırması)` : `Opening ${switchDev.name} CLI Console (VLAN & Port Config)`);
      moveCursor(switchDev.x + 80, switchDev.y + 120, isTr ? `${switchDev.name} Konsol Aç` : `Open ${switchDev.name} Console`, true);
      useMultiWindowStore.getState().openDeviceWindow(switchDev.id, switchDev.type, 'console');
    }, 900);

    switchCmds.forEach((cliCmd) => {
      addStep(() => {
        currentStep++;
        updateProgress(currentStep, `${switchDev.name} CLI: ${cliCmd}`);
        const cliCoords = getElementCoords('input[placeholder*="enable"], input[type="text"], [data-modal-content="true"] input', window.innerWidth / 2, window.innerHeight / 2 + 120);
        moveCursor(cliCoords.x, cliCoords.y, `${switchDev.name} CLI: ${cliCmd}`, false);
        window.dispatchEvent(
          new CustomEvent('terminal-auto-type', {
            detail: { deviceId: switchDev.id, command: cliCmd },
          })
        );
      }, Math.max(700, cliCmd.length * 60 + 200));

      addStep(() => {
        const cliCoords = getElementCoords('input[placeholder*="enable"], input[type="text"], [data-modal-content="true"] input', window.innerWidth / 2, window.innerHeight / 2 + 120);
        moveCursor(cliCoords.x + 35, cliCoords.y, `Enter ↵ (${cliCmd})`, true, cliCmd);
        window.dispatchEvent(
          new CustomEvent('commit-action-event', {
            detail: { action: `${switchDev.name} CLI: ${cliCmd}` },
          })
        );
      }, 600);
    });

    addStep(() => {
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
    }, 1500);

    addStep(() => {
      const closeBtn = getElementCoords(`[data-window-close="${switchDev.id}"]`, window.innerWidth / 2 + 220, window.innerHeight / 2 - 200);
      moveCursor(closeBtn.x, closeBtn.y, isTr ? `${switchDev.name} Kapat ✕` : `Close ${switchDev.name} ✕`, true);
      useMultiWindowStore.getState().closeDeviceWindow(switchDev.id);
    }, 500);
  });

  // ==========================================
  // PHASE 4: ROUTER CONFIGURATION (Interfaces, Routing Protocols, DHCP)
  // ==========================================
  routerDevices.forEach((routerDev) => {
    const devState = deviceStates?.get(routerDev.id);
    const routerCmds = getRouterCliCommands(routerDev, devState);

    addStep(() => {
      currentStep++;
      updateProgress(currentStep, isTr ? `${routerDev.name} CLI Konsolu Açılıyor (IP & Yönlendirme)` : `Opening ${routerDev.name} CLI Console (IP & Routing)`);
      moveCursor(routerDev.x + 80, routerDev.y + 120, isTr ? `${routerDev.name} Konsol Aç` : `Open ${routerDev.name} Console`, true);
      useMultiWindowStore.getState().openDeviceWindow(routerDev.id, routerDev.type, 'console');
    }, 900);

    routerCmds.forEach((cliCmd) => {
      addStep(() => {
        currentStep++;
        updateProgress(currentStep, `${routerDev.name} CLI: ${cliCmd}`);
        const cliCoords = getElementCoords('input[placeholder*="enable"], input[type="text"], [data-modal-content="true"] input', window.innerWidth / 2, window.innerHeight / 2 + 120);
        moveCursor(cliCoords.x, cliCoords.y, `${routerDev.name} CLI: ${cliCmd}`, false);
        window.dispatchEvent(
          new CustomEvent('terminal-auto-type', {
            detail: { deviceId: routerDev.id, command: cliCmd },
          })
        );
      }, Math.max(700, cliCmd.length * 60 + 200));

      addStep(() => {
        const cliCoords = getElementCoords('input[placeholder*="enable"], input[type="text"], [data-modal-content="true"] input', window.innerWidth / 2, window.innerHeight / 2 + 120);
        moveCursor(cliCoords.x + 35, cliCoords.y, `Enter ↵ (${cliCmd})`, true, cliCmd);
        window.dispatchEvent(
          new CustomEvent('commit-action-event', {
            detail: { action: `${routerDev.name} CLI: ${cliCmd}` },
          })
        );
      }, 600);
    });

    addStep(() => {
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
    }, 1500);

    addStep(() => {
      const closeBtn = getElementCoords(`[data-window-close="${routerDev.id}"]`, window.innerWidth / 2 + 220, window.innerHeight / 2 - 200);
      moveCursor(closeBtn.x, closeBtn.y, isTr ? `${routerDev.name} Kapat ✕` : `Close ${routerDev.name} ✕`, true);
      useMultiWindowStore.getState().closeDeviceWindow(routerDev.id);
    }, 500);
  });

  // ==========================================
  // PHASE 5: WLC / ACCESS POINT CONFIGURATION
  // ==========================================
  wlcDevices.forEach((wlcDev) => {
    const wlcIp = wlcDev.ip || '192.168.1.250';
    const wlanSsid = wlcDev.wifi?.ssid || 'Enterprise-Corp';

    addStep(() => {
      currentStep++;
      updateProgress(currentStep, isTr ? `${wlcDev.name} WLC Yönetim Paneli Açılıyor` : `Opening ${wlcDev.name} WLC Management Panel`);
      moveCursor(wlcDev.x + 80, wlcDev.y + 120, isTr ? `${wlcDev.name} Yönetim Aç` : `Open ${wlcDev.name} Management`, true);
      useMultiWindowStore.getState().openDeviceWindow(wlcDev.id, wlcDev.type, 'wireless');
    }, 900);

    addStep(() => {
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
    }, 1200);

    addStep(() => {
      const closeBtn = getElementCoords(`[data-window-close="${wlcDev.id}"]`, window.innerWidth / 2 + 200, window.innerHeight / 2 - 200);
      moveCursor(closeBtn.x, closeBtn.y, isTr ? `${wlcDev.name} Kapat ✕` : `Close ${wlcDev.name} ✕`, true);
      useMultiWindowStore.getState().closeDeviceWindow(wlcDev.id);
    }, 500);
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
    addStep(() => {
      currentStep++;
      updateProgress(currentStep, isTr ? `${targetName} Ayar Paneli Açılıyor` : `Opening ${targetName} Settings`);
      moveCursor(pc.x + 80, pc.y + 120, isTr ? `${targetName} Ayarları Aç` : `Open ${targetName} Settings`, true);
      useMultiWindowStore.getState().openDeviceWindow(pc.id, 'pc', 'settings');
    }, 900);

    // Step 6b: Rename Device if changed
    addStep(() => {
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
    }, 1000);

    // Step 6c: Set IP Address
    addStep(() => {
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
    }, 1100);

    // Step 6d: Set Subnet Mask
    addStep(() => {
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
    }, 1100);

    // Step 6e: Default Gateway (if defined)
    if (targetGateway) {
      addStep(() => {
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
      }, 1000);
    }

    // Step 6f: DNS Server (if defined)
    if (targetDns) {
      addStep(() => {
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
      }, 1000);
    }

    // Step 6g: Wi-Fi Setup if enabled
    if (pc.wifi) {
      const ssid = pc.wifi.ssid || 'NetSim-WiFi';
      const pass = pc.wifi.password || 'password123';
      addStep(() => {
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
      }, 1000);
    }

    // Close PC Settings Window
    addStep(() => {
      const closeBtn = getElementCoords(`[data-window-close="${pc.id}"]`, window.innerWidth / 2 + 220, window.innerHeight / 2 - 180);
      moveCursor(closeBtn.x, closeBtn.y, isTr ? `${targetName} Kapat ✕` : `Close ${targetName} ✕`, true);
      useMultiWindowStore.getState().closeDeviceWindow(pc.id);
    }, 500);
  });

  // ==========================================
  // PHASE 7: MOBILE / WIRELESS CLIENT CONFIGURATION
  // ==========================================
  wifiDevices.forEach((wifiDev) => {
    const ssid = wifiDev.wifi?.ssid || 'NetSim-WiFi';
    const pass = wifiDev.wifi?.password || 'password123';

    addStep(() => {
      currentStep++;
      updateProgress(currentStep, isTr ? `${wifiDev.name} Wi-Fi Ayarları Açılıyor` : `Opening ${wifiDev.name} Wi-Fi Settings`);
      moveCursor(wifiDev.x + 80, wifiDev.y + 120, isTr ? `${wifiDev.name} Wi-Fi Aç` : `Open ${wifiDev.name} Wi-Fi`, true);
      useMultiWindowStore.getState().openDeviceWindow(wifiDev.id, wifiDev.type, 'wireless');
    }, 900);

    addStep(() => {
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
    }, 1100);

    addStep(() => {
      const closeBtn = getElementCoords(`[data-window-close="${wifiDev.id}"]`, window.innerWidth / 2 + 200, window.innerHeight / 2 - 200);
      moveCursor(closeBtn.x, closeBtn.y, isTr ? `${wifiDev.name} Kapat ✕` : `Close ${wifiDev.name} ✕`, true);
      useMultiWindowStore.getState().closeDeviceWindow(wifiDev.id);
    }, 500);
  });

  // ==========================================
  // PHASE 8: PRINTER & IOT CONFIGURATION
  // ==========================================
  printerDevices.forEach((printerDev) => {
    const printerIp = printerDev.ip || '192.168.1.20';

    addStep(() => {
      currentStep++;
      updateProgress(currentStep, isTr ? `${printerDev.name} Yazıcı Ayarları Açılıyor` : `Opening ${printerDev.name} Printer Settings`);
      moveCursor(printerDev.x + 80, printerDev.y + 120, isTr ? `${printerDev.name} Aç` : `Open ${printerDev.name}`, true);
      useMultiWindowStore.getState().openDeviceWindow(printerDev.id, 'printer', 'console');
    }, 900);

    addStep(() => {
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
    }, 1000);

    addStep(() => {
      const closeBtn = getElementCoords(`[data-window-close="${printerDev.id}"]`, window.innerWidth / 2 + 200, window.innerHeight / 2 - 200);
      moveCursor(closeBtn.x, closeBtn.y, isTr ? `${printerDev.name} Kapat ✕` : `Close ${printerDev.name} ✕`, true);
      useMultiWindowStore.getState().closeDeviceWindow(printerDev.id);
    }, 500);
  });

  iotDevices.forEach((iotDev) => {
    const iotIp = iotDev.ip || '192.168.1.30';
    const kind = iotDev.iot?.kind || 'sensor';
    const sensorType = iotDev.iot?.sensorType || 'temperature';
    const iotLabel = kind === 'sensor' ? `${sensorType.toUpperCase()} Sensörü` : `${kind.toUpperCase()} Aktüatörü`;

    addStep(() => {
      currentStep++;
      updateProgress(currentStep, isTr ? `${iotDev.name} (${iotLabel}) Ayarları Açılıyor` : `Opening ${iotDev.name} (${iotLabel}) Settings`);
      moveCursor(iotDev.x + 80, iotDev.y + 120, isTr ? `${iotDev.name} Aç` : `Open ${iotDev.name}`, true);
      useMultiWindowStore.getState().openDeviceWindow(iotDev.id, 'iot', 'console');
    }, 900);

    addStep(() => {
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
    }, 1000);

    addStep(() => {
      const closeBtn = getElementCoords(`[data-window-close="${iotDev.id}"]`, window.innerWidth / 2 + 200, window.innerHeight / 2 - 200);
      moveCursor(closeBtn.x, closeBtn.y, isTr ? `${iotDev.name} Kapat ✕` : `Close ${iotDev.name} ✕`, true);
      useMultiWindowStore.getState().closeDeviceWindow(iotDev.id);
    }, 500);
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

    addStep(() => {
      currentStep++;
      updateProgress(
        currentStep,
        isTr
          ? `Tüm Cihazlar Yapılandırıldı! Test Doğrulaması: ${src.name} CMD Terminali Açılıyor`
          : `All Devices Configured! Verification Test: Opening ${src.name} CMD Terminal`
      );
      moveCursor(src.x + 80, src.y + 120, isTr ? `${src.name} CMD Aç (Ping Testi)` : `Open ${src.name} CMD (Ping Test)`, true);
      useMultiWindowStore.getState().openDeviceWindow(src.id, 'pc', 'desktop');
    }, 1000);

    addStep(() => {
      currentStep++;
      updateProgress(currentStep, isTr ? `Uçtan Uca Ağ Doğrulaması: ${pingCmd}` : `End-to-End Verification: ${pingCmd}`);
      const termCoords = getElementCoords('input[placeholder*="ping"], .custom-scrollbar input, [data-modal-content="true"] input', window.innerWidth / 2, window.innerHeight / 2 + 100);
      moveCursor(termCoords.x, termCoords.y, isTr ? `Komut: ${pingCmd}` : `Command: ${pingCmd}`, false);
      window.dispatchEvent(
        new CustomEvent('pc-auto-type', {
          detail: { deviceId: src.id, command: pingCmd },
        })
      );
    }, Math.max(1000, pingCmd.length * 70 + 300));

    addStep(() => {
      const termCoords = getElementCoords('input[placeholder*="ping"], .custom-scrollbar input, [data-modal-content="true"] input', window.innerWidth / 2, window.innerHeight / 2 + 100);
      moveCursor(termCoords.x + 35, termCoords.y, `Enter ↵ (${pingCmd})`, true, pingCmd);
      window.dispatchEvent(
        new CustomEvent('commit-action-event', {
          detail: { action: `${src.name} CMD: ${pingCmd}` },
        })
      );
    }, 800);

    addStep(() => {
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
    }, 2500);

    addStep(() => {
      const closeBtn = getElementCoords(`[data-window-close="${src.id}"]`, window.innerWidth / 2 + 220, window.innerHeight / 2 - 200);
      moveCursor(closeBtn.x, closeBtn.y, isTr ? `${src.name} CMD Kapat ✕` : `Close ${src.name} CMD ✕`, true);
      useMultiWindowStore.getState().closeDeviceWindow(src.id);
    }, 500);
  }

  // ==========================================
  // PHASE 10: COMPLETE SIMULATION & CLEANUP
  // ==========================================
  const projName = data.projectName || (isTr ? 'Topoloji' : 'Topology');
  addStep(() => {
    hideCursor();
    setDevices(data.devices);
    setConnections(data.connections);
    setDeviceStates(deviceStates);
    cleanupListeners();
    window.dispatchEvent(
      new CustomEvent('simulation-progress', {
        detail: {
          active: false,
          paused: false,
          current: totalSteps,
          total: totalSteps,
          message: isTr ? `${projName} Başarıyla Tamamlandı! 🎉` : `${projName} Successfully Completed! 🎉`,
        },
      })
    );
    window.dispatchEvent(new CustomEvent('add-summary-note'));
  }, 500);

  // Execute queue runner loop
  const runQueue = async () => {
    await waitOrPause(300);

    while (currentStepIdx < stepQueue.length && !isStopped) {
      if (isPaused) {
        await new Promise<void>((res) => {
          pauseWaiter = res;
        });
        if (isStopped) break;
      }

      const item = stepQueue[currentStepIdx];
      try {
        item.run();
      } catch (err) {
        console.error('Simulation step error:', err);
        pauseSimulation();
        updateProgress(
          currentStep,
          isTr ? 'Adım çalıştırma hatası! Otomatik ilerleme duraklatıldı.' : 'Step execution error! Auto-progression paused.',
          true
        );
      }
      currentStepIdx++;

      if (currentStepIdx < stepQueue.length && !isStopped) {
        await waitOrPause(item.durationMs);
      }
    }

    if (!isStopped) {
      cleanupListeners();
      if (activeSimulationStopper === stopSimulation) {
        activeSimulationStopper = null;
      }
    }
  };

  runQueue();
}
