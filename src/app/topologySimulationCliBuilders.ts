import type { CanvasDevice } from '@/components/network/NetworkTopology/types/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';

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
 * guided CLI script.
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
 * passwords were applied.
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
 * EtherChannel membership) for a single switch port.
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
        const cliRule = (seqMatch ? seqMatch[2] : rule).trim();
        devCmds.push(cliRule);
      });
      devCmds.push('exit');
    } else {
      rules.forEach((rule) => {
        const seqMatch = rule.match(/^(\d+)\s+(.+)$/);
        const cliRule = (seqMatch ? seqMatch[2] : rule).trim();
        devCmds.push(`access-list ${aclId} ${cliRule}`);
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
 * Returns true when the device carries any NAT configuration.
 */
export function hasNatConfig(devState?: SwitchState): boolean {
  const staticCount = Array.isArray(devState?.natStaticTranslations) ? devState!.natStaticTranslations.length : 0;
  const dynamicCount = Array.isArray(devState?.natDynamicRules) ? devState!.natDynamicRules.length : 0;
  return staticCount > 0 || dynamicCount > 0;
}

/**
 * Appends the interface-level `ip nat inside` / `ip nat outside` markers.
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
        devCmds.push('no switchport');
        devCmds.push(`ip address ${p.ipAddress} ${p.subnetMask}`);
        devCmds.push('no shutdown');
      }
      featureCmds.forEach((cmd) => devCmds.push(cmd));
      devCmds.push('exit');
    });
  }

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

export function removeDuplicateModeEntryCommands(commands: string[]): string[] {
  return commands.filter((command) => {
    const normalized = command.trim().toLowerCase();
    return normalized !== 'enable' &&
      normalized !== 'configure terminal' &&
      normalized !== 'conf t';
  });
}

export function getFirewallVerificationCommands(devState?: SwitchState): string[] {
  const rules = Array.isArray(devState?.firewallRules) ? devState!.firewallRules : [];
  return rules.length > 0 ? ['show access-lists'] : [];
}

