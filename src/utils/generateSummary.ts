import { CanvasDevice, CanvasConnection } from '../components/network/networkTopology.types';

export interface ProjectScores {
  code: number;
  ux: number;
  ui: number;
  security: number;
  ccna: number;
  performance: number;
}

export interface DeviceConfig {
  id: string;
  name: string;
  type: string;
  commands: string;
}

export interface ProjectSummary {
  configs: DeviceConfig[];
  scores: ProjectScores;
  totalDevices: number;
  totalConnections: number;
}

// Generate CCNA style configs for devices
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generateDeviceConfig = (device: CanvasDevice, deviceStates?: Map<string, any>): string => {
  let config = `!\n! Configuration for ${device.name}\n!\nenable\nconfigure terminal\nhostname ${device.name}\n!\n`;
  const state = deviceStates?.get(device.id);

  if (state && state.security) {
    if (state.domainName) {
      config += `ip domain-name ${state.domainName}\n`;
      config += `crypto key generate rsa modulus 1024\n`;
    }
    if (state.sshVersion) {
      config += `ip ssh version ${state.sshVersion}\n`;
    }
    if (state.security.users && state.security.users.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      state.security.users.forEach((u: any) => {
        config += `username ${u.username} privilege ${u.privilege || 15} secret ${u.password}\n`;
      });
    }
    if (state.security.enableSecret) {
      config += `enable secret ${state.security.enableSecret}\n`;
    } else if (state.security.enablePassword) {
      config += `enable password ${state.security.enablePassword}\n`;
    }
    if (state.security.servicePasswordEncryption) {
      config += `service password-encryption\n`;
    }

    if (state.security.consoleLine) {
      const cl = state.security.consoleLine;
      if (cl.password || cl.loginLocal || cl.login) {
        config += `line con 0\n`;
        if (cl.password) {
          config += ` password ${cl.password}\n`;
        }
        if (cl.loginLocal) {
          config += ` login local\n`;
        } else if (cl.login) {
          config += ` login\n`;
        }
        if (cl.loggingSynchronous) {
          config += ` logging synchronous\n`;
        }
        config += `exit\n!\n`;
      }
    }

    if (state.security.vtyLines) {
      const vty = state.security.vtyLines;
      if (vty.password || vty.loginLocal || vty.login || (vty.transportInput && vty.transportInput.length > 0)) {
        config += `line vty 0 4\n`;
        if (vty.password) {
          config += ` password ${vty.password}\n`;
        }
        if (vty.loginLocal) {
          config += ` login local\n`;
        } else if (vty.login) {
          config += ` login\n`;
        }
        if (vty.transportInput && vty.transportInput.length > 0) {
          config += ` transport input ${vty.transportInput.join(' ')}\n`;
        }
        config += `exit\n!\n`;
      }
    }
  }

  if (device.type === 'switchL2' || device.type === 'switchL3') {
    // Generate VLAN declarations first
    if (state && state.vlans) {
      Object.entries(state.vlans).forEach(([id, vlanVal]) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const vlan = vlanVal as any;
        const vlanId = Number(id);
        if (vlanId !== 1 && (vlanId < 1002 || vlanId > 1005)) {
          config += `vlan ${vlanId}\n`;
          if (vlan.name) {
            config += ` name ${vlan.name}\n`;
          }
          config += `exit\n!\n`;
        }
      });
    }

    // Generate SVIs (VLAN interfaces)
    if (state && state.vlans) {
      Object.entries(state.vlans).forEach(([id, vlanVal]) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const vlan = vlanVal as any;
        if (vlan.ipAddress) {
          config += `interface vlan ${id}\n`;
          config += ` ip address ${vlan.ipAddress} ${vlan.subnetMask || '255.255.255.0'}\n`;
          config += ` no shutdown\n`;
          config += `exit\n!\n`;
        }
      });
    }

    // Generate interface configs for physical ports
    device.ports.forEach(port => {
      if (port.id === 'console') return;
      const ifaceName = port.id.replace('FastEthernet', 'Fa').replace('GigabitEthernet', 'Gi');
      
      let mode = 'access';
      let accessVlan = 1;
      let nativeVlan = 1;
      let allowedVlans = '';
      let isShutdown = port.shutdown || false;
      let isConnected = false;
      let explicitlyAccess = false;

      if (state && state.ports && state.ports[port.id]) {
        const sp = state.ports[port.id];
        mode = sp.mode || 'access';
        accessVlan = sp.accessVlan ? Number(sp.accessVlan) : (sp.vlan || 1);
        nativeVlan = sp.nativeVlan || 1;
        allowedVlans = sp.allowedVlans || '';
        isShutdown = sp.shutdown !== undefined ? sp.shutdown : isShutdown;
        isConnected = sp.status === 'connected';
        explicitlyAccess = sp.mode === 'access';
      } else if (device.vlan) {
        accessVlan = device.vlan;
      }

      // A port is considered configured if:
      // 1. It is explicitly shutdown.
      // 2. It is configured as a trunk.
      // 3. It belongs to a non-default VLAN (accessVlan !== 1).
      // 4. It has custom trunk settings (native vlan !== 1 or custom allowed vlans).
      // 5. It is connected AND explicitly configured in access mode.
      const hasCustomConfig = isShutdown || 
                             mode === 'trunk' || 
                             accessVlan !== 1 || 
                             (mode === 'trunk' && (nativeVlan !== 1 || (allowedVlans !== '' && allowedVlans !== 'all'))) ||
                             (isConnected && explicitlyAccess);

      if (hasCustomConfig) {
        config += `interface ${ifaceName}\n`;
        if (mode === 'trunk') {
          config += ` switchport mode trunk\n`;
          if (nativeVlan !== 1) {
            config += ` switchport trunk native vlan ${nativeVlan}\n`;
          }
          if (allowedVlans && allowedVlans !== 'all') {
            const allowedStr = Array.isArray(allowedVlans) ? allowedVlans.join(',') : allowedVlans;
            config += ` switchport trunk allowed vlan ${allowedStr}\n`;
          }
        } else {
          config += ` switchport mode access\n`;
          if (accessVlan !== 1) {
            config += ` switchport access vlan ${accessVlan}\n`;
          }
        }
        if (isShutdown) {
          config += ` shutdown\n`;
        }
        config += `exit\n!\n`;
      }
    });
  } else if (device.type === 'router' || device.type === 'firewall' || device.type === 'wlc') {
    device.ports.forEach(port => {
      let isShutdown = port.shutdown !== undefined ? port.shutdown : false;
      let ip = '';
      let mask = '';

      if (state && state.ports && state.ports[port.id]) {
        ip = state.ports[port.id].ipAddress || '';
        mask = state.ports[port.id].subnetMask || '';
        isShutdown = state.ports[port.id].shutdown !== false; // In router/FW/WLC, usually shutdown by default unless configured
      } else if (port.ipAddress) {
        ip = port.ipAddress;
        mask = port.subnetMask || '255.255.255.0';
      }

      if (ip || !isShutdown) {
        config += `interface ${port.id.replace('FastEthernet', 'Fa').replace('GigabitEthernet', 'Gi')}\n`;
        if (ip) {
          config += ` ip address ${ip} ${mask}\n`;
        }
        if (!isShutdown) {
          config += ` no shutdown\n`;
        }
        config += `exit\n!\n`;
      }
    });
  } else if (device.type === 'pc' || device.type === 'iot') {
    if (device.ip) {
      config = `IP: ${device.ip}\nSubnet: ${device.subnet || '255.255.255.0'}\nGateway: ${device.gateway || 'N/A'}\nDNS: ${device.dns || 'N/A'}\n`;
    } else {
      config = `IP Mode: DHCP\n`;
    }
    return config;
  }

  config += `end\nwrite memory\n`;
  return config;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const calculateScores = (devices: CanvasDevice[], connections: CanvasConnection[], deviceStates?: Map<string, any>): ProjectScores => {
  // Simple heuristic scoring algorithm based on topology complexity and completeness
  let codeScore = 50;
  let uxScore = 60;
  const uiScore = Math.min(100, 70 + (devices.length > 5 ? 10 : 0) + (connections.length > 5 ? 10 : 0));
  let securityScore = 40;
  let ccnaScore = 50;
  const performanceScore = 100 - (devices.length * 0.5);

  let hasVlans = false;
  let hasIpConfig = false;
  let hasRouting = false;

  devices.forEach(device => {
    const state = deviceStates?.get(device.id);
    if ((device.type === 'switchL2' || device.type === 'switchL3') && (device.vlan || (state && Object.keys(state.vlans || {}).length > 1))) {
      hasVlans = true;
    }
    if (device.type === 'router' && state && Object.keys(state.routes || {}).length > 0) {
      hasRouting = true;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (device.ip || (state && state.ports && Object.values(state.ports).some((p: any) => p.ipAddress))) {
      hasIpConfig = true;
    }
    // Security check (enable secret, password)
    if (state && (state.enablePassword || state.enableSecret)) {
      securityScore += 20;
    }
  });

  if (hasVlans) ccnaScore += 20;
  if (hasRouting) ccnaScore += 20;
  if (hasIpConfig) codeScore += 30;

  // UX based on overlap (simple bounding box check could be done, here we just randomize a bit based on node count)
  uxScore = Math.min(100, uxScore + (devices.length * 2));
  
  return {
    code: Math.min(100, codeScore),
    ux: Math.min(100, uxScore),
    ui: Math.min(100, uiScore),
    security: Math.min(100, securityScore),
    ccna: Math.min(100, ccnaScore),
    performance: Math.max(10, Math.min(100, performanceScore))
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const generateProjectSummary = (devices: CanvasDevice[], connections: CanvasConnection[], deviceStates?: Map<string, any>): ProjectSummary => {
  const configs: DeviceConfig[] = [];
  
  const typeOrder = ['pc', 'switchL2', 'switchL3', 'router', 'firewall', 'iot', 'wlc'];

  // Sort devices based on typeOrder
  const sortedDevices = [...devices].sort((a, b) => {
    const idxA = typeOrder.indexOf(a.type);
    const idxB = typeOrder.indexOf(b.type);
    const valA = idxA === -1 ? 99 : idxA;
    const valB = idxB === -1 ? 99 : idxB;
    return valA - valB;
  });

  sortedDevices.forEach(device => {
    if (typeOrder.includes(device.type)) {
      configs.push({
        id: device.id,
        name: device.name,
        type: device.type,
        commands: generateDeviceConfig(device, deviceStates)
      });
    }
  });

  const scores = calculateScores(devices, connections, deviceStates);

  return {
    configs,
    scores,
    totalDevices: devices.length,
    totalConnections: connections.length
  };
};
