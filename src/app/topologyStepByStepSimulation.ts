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

/**
 * Appends the console / VTY / enable password configuration commands to the
 * guided CLI script. Passwords are configured through the console so the demo
 * actually shows how to secure the device; the console session stays open even
 * after console login is enabled (auth is only checked on connect), so the
 * walkthrough never stalls at a password prompt.
 */
export function appendSecurityCommands(devCmds: string[], devState?: SwitchState): void {
  const sec = devState?.security;
  if (!sec) return;

  if (sec.enableSecret) {
    devCmds.push(`enable secret ${sec.enableSecret}`);
  } else if (sec.enablePassword) {
    devCmds.push(`enable password ${sec.enablePassword}`);
  }

  if (sec.servicePasswordEncryption) {
    devCmds.push('service password-encryption');
  }

  if (sec.consoleLine?.password) {
    devCmds.push('line console 0');
    devCmds.push(`password ${sec.consoleLine.password}`);
    if (sec.consoleLine.login) {
      devCmds.push('login');
    }
    devCmds.push('exit');
  }

  if (sec.vtyLines?.password) {
    devCmds.push('line vty 0 4');
    devCmds.push(`password ${sec.vtyLines.password}`);
    if (sec.vtyLines.login) {
      devCmds.push('login');
    }
    devCmds.push('exit');
  }
}

/**
 * Returns the CLI commands used to verify that console / VTY / enable
 * passwords were applied. Only emitted when the device actually carries
 * password settings, so plain scenarios stay short.
 */
export function getSecurityVerificationCommands(devState?: SwitchState): string[] {
  const sec = devState?.security;
  if (!sec) return [];

  const hasPasswords = !!(sec.enableSecret || sec.enablePassword || sec.consoleLine?.password || sec.vtyLines?.password);
  return hasPasswords ? ['show running-config'] : [];
}

/**
 * Appends global Spanning-Tree configuration (mode, per-VLAN priority and
 * global priority) that the generator stored on the device state.
 */
export function appendSpanningTreeCommands(devCmds: string[], devState?: SwitchState): void {
  if (devState?.spanningTreeMode) {
    devCmds.push(`spanning-tree mode ${devState.spanningTreeMode}`);
  }

  const vlanConfigs = devState?.spanningTreeVlans;
  if (vlanConfigs) {
    Object.entries(vlanConfigs).forEach(([vlanId, cfg]) => {
      if (cfg?.enabled === false) return;
      if (cfg?.priority) {
        devCmds.push(`spanning-tree vlan ${vlanId} priority ${cfg.priority}`);
      } else if (cfg?.enabled) {
        devCmds.push(`spanning-tree vlan ${vlanId}`);
      }
    });
  }
}

/**
 * Returns the per-port feature commands (access mode, trunk, Port-Security and
 * EtherChannel membership) for a single switch port. Kept separate so both the
 * switch CLI builder and the step calculator reuse the exact same logic.
 */
export function getSwitchPortFeatureCommands(port: SwitchState['ports'][string]): string[] {
  const cmds: string[] = [];

  // EtherChannel membership (interface-level channel-group command)
  if (port.channelGroup !== undefined && port.channelMode) {
    cmds.push(`channel-group ${port.channelGroup} mode ${port.channelMode}`);
  }

  // Port-Security
  if (port.portSecurity?.enabled) {
    cmds.push('switchport port-security');
    if (port.portSecurity.maxAddresses) {
      cmds.push(`switchport port-security maximum ${port.portSecurity.maxAddresses}`);
    }
    if (port.portSecurity.violationAction) {
      cmds.push(`switchport port-security violation ${port.portSecurity.violationAction}`);
    }
    if (port.portSecurity.sticky) {
      cmds.push('switchport port-security mac-address sticky');
    }
  }

  // ACL bindings
  if (port.accessGroupIn) cmds.push(`ip access-group ${port.accessGroupIn} in`);
  if (port.accessGroupOut) cmds.push(`ip access-group ${port.accessGroupOut} out`);

  return cmds;
}

/**
 * Appends global ACL definitions (numbered and named) stored on the state.
 */
export function appendAclCommands(devCmds: string[], devState?: SwitchState): void {
  const acls = devState?.accessLists;
  if (!acls || Object.keys(acls).length === 0) return;

  Object.entries(acls).forEach(([aclId, rules]) => {
    const isNamed = isNaN(Number(aclId));
    if (isNamed) {
      devCmds.push(`ip access-list extended ${aclId}`);
      rules.forEach((rule) => {
        const seqMatch = rule.match(/^(\d+)\s+(.+)$/);
        devCmds.push(seqMatch ? ` ${seqMatch[2]}` : ` ${rule}`);
      });
      devCmds.push('exit');
    } else {
      rules.forEach((rule) => {
        const seqMatch = rule.match(/^(\d+)\s+(.+)$/);
        devCmds.push(seqMatch ? `access-list ${aclId} ${seqMatch[2]}` : `access-list ${aclId} ${rule}`);
      });
    }
  });
}

/**
 * Appends NAT configuration (dynamic overload rules and static translations).
 */
export function appendNatCommands(devCmds: string[], devState?: SwitchState): void {
  const staticRules = Array.isArray(devState?.natStaticTranslations) ? devState!.natStaticTranslations : [];
  staticRules.forEach((t) => {
    if (t.localIp && t.globalIp) {
      devCmds.push(`ip nat inside source static ${t.localIp} ${t.globalIp}`);
    }
  });

  const dynamicRules = Array.isArray(devState?.natDynamicRules) ? devState!.natDynamicRules : [];
  dynamicRules.forEach((r) => {
    if (!r.aclId) return;
    const overload = r.overload === false ? '' : ' overload';
    if (r.poolName) {
      devCmds.push(`ip nat inside source list ${r.aclId} pool ${r.poolName}${overload}`);
    } else if (r.interface) {
      devCmds.push(`ip nat inside source list ${r.aclId} interface ${r.interface}${overload}`);
    }
  });
}

/**
 * Returns true when the device carries any NAT configuration, so the step
 * calculator can decide whether the interface-level `ip nat inside/outside`
 * commands will be emitted.
 */
export function hasNatConfig(devState?: SwitchState): boolean {
  const staticCount = Array.isArray(devState?.natStaticTranslations) ? devState!.natStaticTranslations.length : 0;
  const dynamicCount = Array.isArray(devState?.natDynamicRules) ? devState!.natDynamicRules.length : 0;
  return staticCount > 0 || dynamicCount > 0;
}

/**
 * Appends the interface-level `ip nat inside` / `ip nat outside` markers based
 * on each port's natSide flag.
 */
export function appendNatInterfaceCommands(cmds: string[], port: SwitchState['ports'][string]): void {
  if (port.natSide === 'inside') cmds.push('ip nat inside');
  else if (port.natSide === 'outside') cmds.push('ip nat outside');
}

export function getSwitchCliCommands(switchDev: CanvasDevice, devState?: SwitchState): string[] {
  const devCmds: string[] = [];

  appendSecurityCommands(devCmds, devState);
  appendSpanningTreeCommands(devCmds, devState);
  appendAclCommands(devCmds, devState);
  appendNatCommands(devCmds, devState);

  if (devState?.vlans) {
    Object.values(devState.vlans).forEach((vlan) => {
      // Exclude default VLAN 1 and reserved VLANs (1002, 1003, 1004, 1005)
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
      const isSvi = p.id.toLowerCase().startsWith('vlan');

      if (isSvi) {
        // Switched Virtual Interface (interface vlan X): needs ip routing and a
        // plain ip address. "no switchport" is meaningless for an SVI and is
        // therefore never emitted here.
        if (p.ipAddress && p.subnetMask) {
          devCmds.push(`interface vlan ${p.id.replace(/[^0-9]/g, '')}`);
          devCmds.push(`ip address ${p.ipAddress} ${p.subnetMask}`);
          devCmds.push('no shutdown');
          devCmds.push('exit');
        }
        return;
      }

      const featureCmds = getSwitchPortFeatureCommands(p);
      const isTrunk = p.mode === 'trunk';
      const isAccessWithVlan =
        p.mode === 'access' &&
        typeof p.accessVlan === 'number' &&
        p.accessVlan > 1 &&
        (p.accessVlan < 1002 || p.accessVlan > 1005);
      const isRoutedPort = !!p.ipAddress && !!p.subnetMask && p.mode !== 'access' && p.mode !== 'trunk';

      // Nothing to configure on this port.
      if (!isTrunk && !isAccessWithVlan && !isRoutedPort && featureCmds.length === 0) {
        return;
      }

      devCmds.push(`interface ${p.id}`);
      if (isTrunk) {
        devCmds.push('switchport mode trunk');
      } else if (isAccessWithVlan) {
        devCmds.push('switchport mode access');
        devCmds.push(`switchport access vlan ${p.accessVlan}`);
      } else if (isRoutedPort) {
        // Physical routed port: only these need "no switchport" before the IP.
        devCmds.push('no switchport');
        devCmds.push(`ip address ${p.ipAddress} ${p.subnetMask}`);
        devCmds.push('no shutdown');
      }
      featureCmds.forEach((cmd) => devCmds.push(cmd));
      devCmds.push('exit');
    });
  }

  // EtherChannel logical interface (interface port-channel N) trunking
  const channelGroups = new Set<number>();
  Object.values(devState?.ports || {}).forEach((p) => {
    if (p.channelGroup !== undefined) channelGroups.add(p.channelGroup);
  });
  channelGroups.forEach((group) => {
    const member = Object.values(devState!.ports).find((p) => p.channelGroup === group);
    devCmds.push(`interface port-channel ${group}`);
    if (member?.mode === 'trunk') {
      devCmds.push('switchport mode trunk');
    }
    devCmds.push('exit');
  });

  if (switchDev.type === 'switchL3' || (devState as unknown as { ipRouting?: boolean })?.ipRouting) {
    devCmds.push('ip routing');
  }

  return devCmds;
}

export function getRouterCliCommands(_routerDev: CanvasDevice, devState?: SwitchState): string[] {
  const devCmds: string[] = [];

  appendSecurityCommands(devCmds, devState);
  appendAclCommands(devCmds, devState);
  appendNatCommands(devCmds, devState);

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
    appendNatInterfaceCommands(devCmds, p);
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

  return devCmds;
}

/**
 * Firewall CLI script: routed interface IPs plus the firewall rule table.
 * Rules are emitted in the standard IOS extended ACL form so the executor
 * accepts them, keeping the guided demo consistent with the generated topology.
 */
export function getFirewallCliCommands(devState?: SwitchState): string[] {
  const devCmds: string[] = [];

  appendSecurityCommands(devCmds, devState);

  const configuredPorts = devState?.ports
    ? Object.values(devState.ports).filter((p) => p.ipAddress && p.subnetMask)
    : [];
  configuredPorts.forEach((p) => {
    devCmds.push(`interface ${p.id}`);
    devCmds.push(`ip address ${p.ipAddress} ${p.subnetMask}`);
    devCmds.push('no shutdown');
    devCmds.push('exit');
  });

  const rules = Array.isArray(devState?.firewallRules) ? devState!.firewallRules : [];
  rules.forEach((rule) => {
    if (rule.enabled === false) return;
    const action = rule.action === 'allow' ? 'permit' : 'deny';
    const protocol = (!rule.protocol || rule.protocol === 'any') ? 'ip' : rule.protocol;
    const source = !rule.sourceIp || rule.sourceIp === '*' ? 'any' : rule.sourceIp;
    const target = !rule.targetIp || rule.targetIp === '*' ? 'any' : rule.targetIp;
    const hasPort = rule.port !== '*' && rule.port !== 'any' && protocol !== 'icmp' && protocol !== 'ip';
    const portSuffix = hasPort ? ` eq ${rule.port}` : '';
    devCmds.push(`access-list OUTSIDE-IN extended ${action} ${protocol} ${source} ${target}${portSuffix}`);
  });

  return devCmds;
}

/**
 * Returns the verification command list for a firewall (inspects the applied
 * rules), so the calculator and the simulation agree on the step count.
 */
export function getFirewallVerificationCommands(devState?: SwitchState): string[] {
  const rules = Array.isArray(devState?.firewallRules) ? devState!.firewallRules : [];
  return rules.length > 0 ? ['show access-lists'] : [];
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
  const firewallDevices = devices.filter((d) => d.type === 'firewall');
  const pcDevices = devices.filter((d) => d.type === 'pc');
  const wlcDevices = devices.filter((d) => d.type === 'wlc');
  const wifiDevices = devices.filter((d) => d.type === 'mobile' || (d.type !== 'pc' && !!d.wifi));
  const printerDevices = devices.filter((d) => d.type === 'printer');
  const iotDevices = devices.filter((d) => d.type === 'iot');

  let totalSteps = devices.length + connections.length;
  switchDevices.forEach((d) => {
    const state = deviceStates.get(d.id);
    const cmds = getSwitchCliCommands(d, state);
    totalSteps += 3 + cmds.length + getSecurityVerificationCommands(state).length * 2;
  });
  routerDevices.forEach((d) => {
    const state = deviceStates.get(d.id);
    const cmds = getRouterCliCommands(d, state);
    totalSteps += 3 + cmds.length + getSecurityVerificationCommands(state).length * 2;
  });
  firewallDevices.forEach((d) => {
    const state = deviceStates.get(d.id);
    const cmds = getFirewallCliCommands(state);
    totalSteps += 3 + cmds.length + getFirewallVerificationCommands(state).length * 2;
  });
  totalSteps += wlcDevices.length * 3;
  pcDevices.forEach((pc) => {
    totalSteps += 3;
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
    } else if (remainingDelayMs > 0 && !currentTimer && delayResolver) {
      delayStartTimestamp = Date.now();
      const currentResolver = delayResolver;
      currentTimer = setTimeout(() => {
        currentTimer = null;
        delayResolver = null;
        currentResolver();
      }, remainingDelayMs);
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
  const firewallDevices = devices.filter((d) => d.type === 'firewall');
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
    const targetDevName = dev.name || getDefaultFactoryName(dev.type, Math.max(0, devTypeCount));

    // Step 1a: Move cursor to toolbar icon
    addStep(() => {
      currentStep++;
      updateProgress(currentStep, isTr ? `${targetDevName} seçiliyor` : `Selecting ${targetDevName}`);
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
      moveCursor(screenX, screenY, isTr ? `${targetDevName} Tuvale Yerleştiriliyor` : `Placing ${targetDevName} on Canvas`, false);
    }, 400);

    // Step 1d: Click and place blank device
    addStep(() => {
      const screenX = Math.min(window.innerWidth - 100, Math.max(120, dev.x + 80));
      const screenY = Math.min(window.innerHeight - 150, Math.max(150, dev.y + 120));
      moveCursor(screenX, screenY, isTr ? `${targetDevName} Eklendi ✓` : `${targetDevName} Added ✓`, true);

      const sanitizedDevices = currentDevices.map((d, idx) => {
        if (idx === currentDevices.length - 1) {
          if (d.type === 'pc') {
            const pcIndex = currentDevices.filter((item) => item.type === 'pc').length;
            const initialApipaIp = `169.254.1.${10 + pcIndex}`;
            return {
              ...d,
              name: targetDevName,
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
              name: targetDevName,
              ip: initialApipaIp,
              subnet: '255.255.0.0',
              wifi: d.wifi ? { ...d.wifi, enabled: false, ssid: '', password: '', mode: d.wifi.mode || 'client' } : undefined,
            };
          }
          if (d.type === 'printer' || d.type === 'iot') {
            return { ...d, name: targetDevName, ip: '', subnet: '255.255.255.0', gateway: '', dns: '' };
          }
          if (d.type === 'wlc') {
            return {
              ...d,
              name: targetDevName,
              ip: '',
              subnet: '255.255.255.0',
              gateway: '',
              wifi: d.wifi ? { ...d.wifi, enabled: false, ssid: '', password: '', mode: d.wifi.mode || 'ap' } : undefined,
            };
          }
          return { ...d, name: targetDevName, ip: '' };
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
          const isL2Switch = d.type === 'switchL2';
          Object.entries(state.ports || {}).forEach(([pId, p]) => {
            cleanPorts[pId] = {
              ...p,
              ipAddress: undefined,
              subnetMask: undefined,
              mode: isL2Switch ? 'access' : 'routed',
              accessVlan: 1,
              // Standart: L2 Switch portları varsayılan olarak AÇIK (shutdown: false),
              // Router, Firewall ve L3 Switch yönlendirici portları varsayılan olarak KAPALI (shutdown: true)
              shutdown: isL2Switch ? false : (pId === 'console' ? false : true),
            };
          });
          // Guided step-by-step demo must add devices without any password
          // configuration. Carrying the scenario's security block over
          // (enable secret / console / vty passwords) makes the device ask for
          // credentials on the very first `enable`, so the walkthrough gets
          // stuck at the password prompt. Reset to a clean, open state here and
          // let users configure passwords manually if they want them.
          const cleanSecurity: SwitchState['security'] = {
            ...state.security,
            enableSecret: undefined,
            enableSecretEncrypted: false,
            enablePassword: undefined,
            servicePasswordEncryption: false,
            users: [],
            consoleLine: { ...state.security.consoleLine, login: false, loginLocal: false, password: undefined },
            vtyLines: { ...state.security.vtyLines, login: false, loginLocal: false, password: undefined },
          };

          currentStates.set(d.id, {
            ...state,
            hostname: d.name || state.hostname || targetDevName,
            security: cleanSecurity,
            vlans: { 1: { id: 1, name: 'default', status: 'active', ports: [] } },
            ports: cleanPorts,
          });
        }
      });
      simulatedStates = currentStates;
      setDeviceStates(currentStates);

      window.dispatchEvent(
        new CustomEvent('commit-action-event', {
          detail: { action: isTr ? `${targetDevName} topolojiye eklendi` : `Added ${targetDevName} to topology` },
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
      const devCoords = getElementCoords(`[data-device-id="${switchDev.id}"]`, switchDev.x + 80, switchDev.y + 120);
      moveCursor(devCoords.x, devCoords.y, isTr ? `${switchDev.name} Konsol Aç` : `Open ${switchDev.name} Console`, true);
      useMultiWindowStore.getState().openDeviceWindow(switchDev.id, switchDev.type, 'console');
    }, 900);

    switchCmds.forEach((cliCmd, cmdIdx) => {
      // The very first command silently enters privileged + config mode
      // (`enable` / `configure terminal`) in the same keystroke stream, so the
      // mode-entry lines never show up as separate, trivial steps.
      const typedCmd = cmdIdx === 0 ? `enable\nconfigure terminal\n${cliCmd}` : cliCmd;
      addStep(() => {
        currentStep++;
        updateProgress(currentStep, `${switchDev.name} CLI: ${cliCmd}`);
        const cliCoords = getElementCoords(`[data-modal-id="${switchDev.id}"] input, [data-modal-id="${switchDev.id}"] textarea, input[placeholder*="enable"], input[type="text"]`, window.innerWidth / 2, window.innerHeight / 2 + 120);
        moveCursor(cliCoords.x, cliCoords.y, `${switchDev.name} CLI: ${cliCmd}`, false);
        window.dispatchEvent(
          new CustomEvent('terminal-auto-type', {
            detail: { deviceId: switchDev.id, command: typedCmd },
          })
        );
      }, Math.max(700, cliCmd.length * 60 + 200));

      addStep(() => {
        const cliCoords = getElementCoords(`[data-modal-id="${switchDev.id}"] input, [data-modal-id="${switchDev.id}"] textarea, input[placeholder*="enable"], input[type="text"]`, window.innerWidth / 2, window.innerHeight / 2 + 120);
        moveCursor(cliCoords.x + 35, cliCoords.y, `Enter ↵ (${cliCmd})`, true, cliCmd);
        window.dispatchEvent(
          new CustomEvent('commit-action-event', {
            detail: { action: `${switchDev.name} CLI: ${cliCmd}` },
          })
        );
      }, 600);
    });

    getSecurityVerificationCommands(devState).forEach((verifyCmd) => {
      addStep(() => {
        currentStep++;
        updateProgress(currentStep, isTr ? `${switchDev.name} Doğrulama: ${verifyCmd}` : `${switchDev.name} Verify: ${verifyCmd}`);
        const cliCoords = getElementCoords(`[data-modal-id="${switchDev.id}"] input, [data-modal-id="${switchDev.id}"] textarea, input[type="text"]`, window.innerWidth / 2, window.innerHeight / 2 + 120);
        moveCursor(cliCoords.x, cliCoords.y, `${switchDev.name} CLI: ${verifyCmd}`, false);
        window.dispatchEvent(
          new CustomEvent('terminal-auto-type', {
            detail: { deviceId: switchDev.id, command: verifyCmd },
          })
        );
      }, Math.max(700, verifyCmd.length * 60 + 200));

      addStep(() => {
        const cliCoords = getElementCoords(`[data-modal-id="${switchDev.id}"] input, [data-modal-id="${switchDev.id}"] textarea, input[type="text"]`, window.innerWidth / 2, window.innerHeight / 2 + 120);
        moveCursor(cliCoords.x + 35, cliCoords.y, `Enter ↵ (${verifyCmd})`, true, verifyCmd);
        window.dispatchEvent(
          new CustomEvent('commit-action-event', {
            detail: {
              action: isTr
                ? `${switchDev.name} parolaları doğrulandı (${verifyCmd})`
                : `${switchDev.name} passwords verified (${verifyCmd})`,
            },
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
      const devCoords = getElementCoords(`[data-device-id="${routerDev.id}"]`, routerDev.x + 80, routerDev.y + 120);
      moveCursor(devCoords.x, devCoords.y, isTr ? `${routerDev.name} Konsol Aç` : `Open ${routerDev.name} Console`, true);
      useMultiWindowStore.getState().openDeviceWindow(routerDev.id, routerDev.type, 'console');
    }, 900);

    routerCmds.forEach((cliCmd, cmdIdx) => {
      // First command silently enters privileged + config mode in one stream.
      const typedCmd = cmdIdx === 0 ? `enable\nconfigure terminal\n${cliCmd}` : cliCmd;
      addStep(() => {
        currentStep++;
        updateProgress(currentStep, `${routerDev.name} CLI: ${cliCmd}`);
        const cliCoords = getElementCoords(`[data-modal-id="${routerDev.id}"] input, [data-modal-id="${routerDev.id}"] textarea, input[placeholder*="enable"], input[type="text"]`, window.innerWidth / 2, window.innerHeight / 2 + 120);
        moveCursor(cliCoords.x, cliCoords.y, `${routerDev.name} CLI: ${cliCmd}`, false);
        window.dispatchEvent(
          new CustomEvent('terminal-auto-type', {
            detail: { deviceId: routerDev.id, command: typedCmd },
          })
        );
      }, Math.max(700, cliCmd.length * 60 + 200));

      addStep(() => {
        const cliCoords = getElementCoords(`[data-modal-id="${routerDev.id}"] input, [data-modal-id="${routerDev.id}"] textarea, input[placeholder*="enable"], input[type="text"]`, window.innerWidth / 2, window.innerHeight / 2 + 120);
        moveCursor(cliCoords.x + 35, cliCoords.y, `Enter ↵ (${cliCmd})`, true, cliCmd);
        window.dispatchEvent(
          new CustomEvent('commit-action-event', {
            detail: { action: `${routerDev.name} CLI: ${cliCmd}` },
          })
        );
      }, 600);
    });

    getSecurityVerificationCommands(devState).forEach((verifyCmd) => {
      addStep(() => {
        currentStep++;
        updateProgress(currentStep, isTr ? `${routerDev.name} Doğrulama: ${verifyCmd}` : `${routerDev.name} Verify: ${verifyCmd}`);
        const cliCoords = getElementCoords(`[data-modal-id="${routerDev.id}"] input, [data-modal-id="${routerDev.id}"] textarea, input[type="text"]`, window.innerWidth / 2, window.innerHeight / 2 + 120);
        moveCursor(cliCoords.x, cliCoords.y, `${routerDev.name} CLI: ${verifyCmd}`, false);
        window.dispatchEvent(
          new CustomEvent('terminal-auto-type', {
            detail: { deviceId: routerDev.id, command: verifyCmd },
          })
        );
      }, Math.max(700, verifyCmd.length * 60 + 200));

      addStep(() => {
        const cliCoords = getElementCoords(`[data-modal-id="${routerDev.id}"] input, [data-modal-id="${routerDev.id}"] textarea, input[type="text"]`, window.innerWidth / 2, window.innerHeight / 2 + 120);
        moveCursor(cliCoords.x + 35, cliCoords.y, `Enter ↵ (${verifyCmd})`, true, verifyCmd);
        window.dispatchEvent(
          new CustomEvent('commit-action-event', {
            detail: {
              action: isTr
                ? `${routerDev.name} parolaları doğrulandı (${verifyCmd})`
                : `${routerDev.name} passwords verified (${verifyCmd})`,
            },
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
  // PHASE 4b: FIREWALL CONFIGURATION (Interfaces & Rule Table)
  // ==========================================
  firewallDevices.forEach((fwDev) => {
    const devState = deviceStates?.get(fwDev.id);
    const fwCmds = getFirewallCliCommands(devState);

    addStep(() => {
      currentStep++;
      updateProgress(currentStep, isTr ? `${fwDev.name} CLI Konsolu Açılıyor (Arayüz & Kural Yapılandırması)` : `Opening ${fwDev.name} CLI Console (Interface & Rule Config)`);
      const devCoords = getElementCoords(`[data-device-id="${fwDev.id}"]`, fwDev.x + 80, fwDev.y + 120);
      moveCursor(devCoords.x, devCoords.y, isTr ? `${fwDev.name} Konsol Aç` : `Open ${fwDev.name} Console`, true);
      useMultiWindowStore.getState().openDeviceWindow(fwDev.id, fwDev.type, 'console');
    }, 900);

    fwCmds.forEach((cliCmd, cmdIdx) => {
      // First command silently enters privileged + config mode in one stream.
      const typedCmd = cmdIdx === 0 ? `enable\nconfigure terminal\n${cliCmd}` : cliCmd;
      addStep(() => {
        currentStep++;
        updateProgress(currentStep, `${fwDev.name} CLI: ${cliCmd}`);
        const cliCoords = getElementCoords(`[data-modal-id="${fwDev.id}"] input, [data-modal-id="${fwDev.id}"] textarea, input[type="text"]`, window.innerWidth / 2, window.innerHeight / 2 + 120);
        moveCursor(cliCoords.x, cliCoords.y, `${fwDev.name} CLI: ${cliCmd}`, false);
        window.dispatchEvent(
          new CustomEvent('terminal-auto-type', {
            detail: { deviceId: fwDev.id, command: typedCmd },
          })
        );
      }, Math.max(700, cliCmd.length * 60 + 200));

      addStep(() => {
        const cliCoords = getElementCoords(`[data-modal-id="${fwDev.id}"] input, [data-modal-id="${fwDev.id}"] textarea, input[type="text"]`, window.innerWidth / 2, window.innerHeight / 2 + 120);
        moveCursor(cliCoords.x + 35, cliCoords.y, `Enter ↵ (${cliCmd})`, true, cliCmd);
        window.dispatchEvent(
          new CustomEvent('commit-action-event', {
            detail: { action: `${fwDev.name} CLI: ${cliCmd}` },
          })
        );
      }, 600);
    });

    getFirewallVerificationCommands(devState).forEach((verifyCmd) => {
      addStep(() => {
        currentStep++;
        updateProgress(currentStep, isTr ? `${fwDev.name} Doğrulama: ${verifyCmd}` : `${fwDev.name} Verify: ${verifyCmd}`);
        const cliCoords = getElementCoords(`[data-modal-id="${fwDev.id}"] input, [data-modal-id="${fwDev.id}"] textarea, input[type="text"]`, window.innerWidth / 2, window.innerHeight / 2 + 120);
        moveCursor(cliCoords.x, cliCoords.y, `${fwDev.name} CLI: ${verifyCmd}`, false);
        window.dispatchEvent(
          new CustomEvent('terminal-auto-type', {
            detail: { deviceId: fwDev.id, command: verifyCmd },
          })
        );
      }, Math.max(700, verifyCmd.length * 60 + 200));

      addStep(() => {
        const cliCoords = getElementCoords(`[data-modal-id="${fwDev.id}"] input, [data-modal-id="${fwDev.id}"] textarea, input[type="text"]`, window.innerWidth / 2, window.innerHeight / 2 + 120);
        moveCursor(cliCoords.x + 35, cliCoords.y, `Enter ↵ (${verifyCmd})`, true, verifyCmd);
        window.dispatchEvent(
          new CustomEvent('commit-action-event', {
            detail: {
              action: isTr
                ? `${fwDev.name} kuralları doğrulandı (${verifyCmd})`
                : `${fwDev.name} rules verified (${verifyCmd})`,
            },
          })
        );
      }, 600);
    });

    addStep(() => {
      currentStep++;
      const resultMsg = isTr
        ? `${fwDev.name} Güvenlik Duvarı Arayüzleri ve Kuralları Yapılandırıldı`
        : `${fwDev.name} Firewall Interfaces & Rules Configured`;
      updateProgress(currentStep, resultMsg);
      moveCursor(window.innerWidth / 2, window.innerHeight / 2 + 50, isTr ? `Firewall Yapılandırması Tamam!` : `Firewall Config Completed!`, false);

      if (devState) {
        const updated = new Map(simulatedStates);
        updated.set(fwDev.id, devState);
        simulatedStates = updated;
        setDeviceStates(updated);
      }
      window.dispatchEvent(new CustomEvent('commit-action-event', { detail: { action: resultMsg } }));
    }, 1500);

    addStep(() => {
      const closeBtn = getElementCoords(`[data-window-close="${fwDev.id}"]`, window.innerWidth / 2 + 220, window.innerHeight / 2 - 200);
      moveCursor(closeBtn.x, closeBtn.y, isTr ? `${fwDev.name} Kapat ✕` : `Close ${fwDev.name} ✕`, true);
      useMultiWindowStore.getState().closeDeviceWindow(fwDev.id);
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
      const devCoords = getElementCoords(`[data-device-id="${wlcDev.id}"]`, wlcDev.x + 80, wlcDev.y + 120);
      moveCursor(devCoords.x, devCoords.y, isTr ? `${wlcDev.name} Yönetim Aç` : `Open ${wlcDev.name} Management`, true);
      useMultiWindowStore.getState().openDeviceWindow(wlcDev.id, wlcDev.type, 'wireless');
    }, 900);

    addStep(() => {
      currentStep++;
      updateProgress(currentStep, isTr ? `${wlcDev.name} WLAN '${wlanSsid}' ve Yönetim IP'si (${wlcIp}) Yapılandırılıyor` : `${wlcDev.name} Configuring WLAN '${wlanSsid}' & IP (${wlcIp})`);
      const winCoords = getElementCoords(`[data-modal-id="${wlcDev.id}"]`, window.innerWidth / 2, window.innerHeight / 2 - 10);
      moveCursor(winCoords.x, winCoords.y, `WLAN: ${wlanSsid} (WPA2-Enterprise)`, false);

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
      const closeBtn = getElementCoords(`[data-window-close="${wlcDev.id}"], [data-modal-id="${wlcDev.id}"] [data-window-close]`, window.innerWidth / 2 + 200, window.innerHeight / 2 - 200);
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
      const devCoords = getElementCoords(`[data-device-id="${pc.id}"]`, pc.x + 80, pc.y + 120);
      moveCursor(devCoords.x, devCoords.y, isTr ? `${targetName} Ayarları Aç` : `Open ${targetName} Settings`, true);
      useMultiWindowStore.getState().openDeviceWindow(pc.id, 'pc', 'settings');
    }, 900);

    // Step 6b: Set IP Address
    addStep(() => {
      currentStep++;
      updateProgress(currentStep, `${targetName} IP: ${targetIp}`);
      const ipCoords = getElementCoords(`[data-modal-id="${pc.id}"] input[placeholder*="192."], [data-modal-id="${pc.id}"] input[name="ip"], [data-modal-id="${pc.id}"] input`, window.innerWidth / 2 - 100, window.innerHeight / 2 - 40);
      moveCursor(ipCoords.x, ipCoords.y, `${targetName} IP: ${targetIp}`, false, targetIp);

      const updated = simulatedDevices.map((d) => (d.id === pc.id ? { ...d, name: targetName, ip: targetIp } : d));
      simulatedDevices = updated;
      setDevices(updated);

      const ipEl = (document.querySelector(`[data-modal-id="${pc.id}"] input[placeholder*="192."]`) ||
        document.querySelector(`[data-modal-id="${pc.id}"] input[name="ip"]`) ||
        document.querySelector('input[placeholder*="192.168.1.100"]')) as HTMLInputElement | null;
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
      const subnetCoords = getElementCoords(`[data-modal-id="${pc.id}"] input[placeholder*="255."], [data-modal-id="${pc.id}"] input[name="subnet"]`, window.innerWidth / 2 + 100, window.innerHeight / 2 - 40);
      moveCursor(subnetCoords.x, subnetCoords.y, `${targetName} Mask: ${targetSubnet}`, false, targetSubnet);

      const updated = simulatedDevices.map((d) => (d.id === pc.id ? { ...d, name: targetName, ip: targetIp, subnet: targetSubnet } : d));
      simulatedDevices = updated;
      setDevices(updated);

      const subnetEl = (document.querySelector(`[data-modal-id="${pc.id}"] input[placeholder*="255."]`) ||
        document.querySelector(`[data-modal-id="${pc.id}"] input[name="subnet"]`) ||
        document.querySelector('input[placeholder*="255.255.255.0"]')) as HTMLInputElement | null;
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
        const gwCoords = getElementCoords(`[data-modal-id="${pc.id}"] input[placeholder*="Gateway"], [data-modal-id="${pc.id}"] input[name="gateway"]`, window.innerWidth / 2 - 100, window.innerHeight / 2 + 20);
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
        const dnsCoords = getElementCoords(`[data-modal-id="${pc.id}"] input[placeholder*="DNS"], [data-modal-id="${pc.id}"] input[name="dns"]`, window.innerWidth / 2 + 100, window.innerHeight / 2 + 20);
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
        const wifiCoords = getElementCoords(`[data-modal-id="${pc.id}"]`, window.innerWidth / 2, window.innerHeight / 2 + 60);
        moveCursor(wifiCoords.x, wifiCoords.y, `Wi-Fi: ${ssid}`, false);

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
      const closeBtn = getElementCoords(`[data-window-close="${pc.id}"], [data-modal-id="${pc.id}"] [data-window-close]`, window.innerWidth / 2 + 220, window.innerHeight / 2 - 180);
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
      const devCoords = getElementCoords(`[data-device-id="${wifiDev.id}"]`, wifiDev.x + 80, wifiDev.y + 120);
      moveCursor(devCoords.x, devCoords.y, isTr ? `${wifiDev.name} Wi-Fi Aç` : `Open ${wifiDev.name} Wi-Fi`, true);
      useMultiWindowStore.getState().openDeviceWindow(wifiDev.id, wifiDev.type, 'wireless');
    }, 900);

    addStep(() => {
      currentStep++;
      updateProgress(currentStep, isTr ? `${wifiDev.name} Wi-Fi: '${ssid}' Ağına Bağlanıyor` : `${wifiDev.name} Connecting to Wi-Fi '${ssid}'`);
      const ssidCoords = getElementCoords(`[data-modal-id="${wifiDev.id}"] input[placeholder*="SSID"], [data-modal-id="${wifiDev.id}"] input[name="ssid"]`, window.innerWidth / 2, window.innerHeight / 2 - 20);
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
      const closeBtn = getElementCoords(`[data-window-close="${wifiDev.id}"], [data-modal-id="${wifiDev.id}"] [data-window-close]`, window.innerWidth / 2 + 200, window.innerHeight / 2 - 200);
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
      const devCoords = getElementCoords(`[data-device-id="${printerDev.id}"]`, printerDev.x + 80, printerDev.y + 120);
      moveCursor(devCoords.x, devCoords.y, isTr ? `${printerDev.name} Aç` : `Open ${printerDev.name}`, true);
      useMultiWindowStore.getState().openDeviceWindow(printerDev.id, 'printer', 'console');
    }, 900);

    addStep(() => {
      currentStep++;
      updateProgress(currentStep, isTr ? `${printerDev.name} Ağ Yazıcısı Aktif (IP: ${printerIp})` : `${printerDev.name} Network Printer Ready (IP: ${printerIp})`);
      const winCoords = getElementCoords(`[data-modal-id="${printerDev.id}"]`, window.innerWidth / 2, window.innerHeight / 2 - 10);
      moveCursor(winCoords.x, winCoords.y, `IP: ${printerIp}`, false);

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
      const closeBtn = getElementCoords(`[data-window-close="${printerDev.id}"], [data-modal-id="${printerDev.id}"] [data-window-close]`, window.innerWidth / 2 + 200, window.innerHeight / 2 - 200);
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
      const devCoords = getElementCoords(`[data-device-id="${iotDev.id}"]`, iotDev.x + 80, iotDev.y + 120);
      moveCursor(devCoords.x, devCoords.y, isTr ? `${iotDev.name} Aç` : `Open ${iotDev.name}`, true);
      useMultiWindowStore.getState().openDeviceWindow(iotDev.id, 'iot', 'console');
    }, 900);

    addStep(() => {
      currentStep++;
      updateProgress(currentStep, isTr ? `${iotDev.name} (${iotLabel}) Aktif (IP: ${iotIp})` : `${iotDev.name} (${iotLabel}) Active (IP: ${iotIp})`);
      const winCoords = getElementCoords(`[data-modal-id="${iotDev.id}"]`, window.innerWidth / 2, window.innerHeight / 2 - 10);
      moveCursor(winCoords.x, winCoords.y, `IP: ${iotIp}`, false);

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
      const closeBtn = getElementCoords(`[data-window-close="${iotDev.id}"], [data-modal-id="${iotDev.id}"] [data-window-close]`, window.innerWidth / 2 + 200, window.innerHeight / 2 - 200);
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
