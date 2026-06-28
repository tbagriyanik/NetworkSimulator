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

  if (device.type === 'switchL2' || device.type === 'switchL3') {
    // Generate interface configs
    device.ports.forEach(port => {
      let vlan = 1;
      const isShutdown = port.shutdown || false;
      if (state && state.ports && state.ports[port.id]) {
        vlan = state.ports[port.id].accessVlan || 1;
      } else if (device.vlan) {
        vlan = device.vlan;
      }

      if (vlan !== 1 || isShutdown) {
        config += `interface ${port.id.replace('FastEthernet', 'Fa').replace('GigabitEthernet', 'Gi')}\n`;
        if (vlan !== 1) {
          config += ` switchport mode access\n`;
          config += ` switchport access vlan ${vlan}\n`;
        }
        if (isShutdown) {
          config += ` shutdown\n`;
        }
        config += `!\n`;
      }
    });

    if (state && state.vlanIfaces && state.vlanIfaces[1]) {
      const vlan1 = state.vlanIfaces[1];
      if (vlan1.ipAddress) {
        config += `interface Vlan1\n ip address ${vlan1.ipAddress} ${vlan1.subnetMask}\n no shutdown\n!\n`;
      }
    }
  } else if (device.type === 'router') {
    device.ports.forEach(port => {
      let isShutdown = port.shutdown !== undefined ? port.shutdown : false;
      let ip = '';
      let mask = '';

      if (state && state.ports && state.ports[port.id]) {
        ip = state.ports[port.id].ipAddress || '';
        mask = state.ports[port.id].subnetMask || '';
        isShutdown = state.ports[port.id].shutdown !== false; // In router, usually shutdown by default unless configured
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
        config += `!\n`;
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
  
  devices.forEach(device => {
    if (device.type === 'switchL2' || device.type === 'router' || device.type === 'switchL3' || device.type === 'pc') {
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
