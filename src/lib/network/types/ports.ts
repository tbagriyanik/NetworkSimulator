export type PortLEDColor = 'green' | 'gray' | 'orange' | 'off' | 'white' | 'red';

export interface PortSecurityConfig {
  enabled: boolean;
  maxMacs: number;
  violationAction: 'protect' | 'restrict' | 'shutdown';
  macAddresses: string[];
  sticky: boolean;
  stickyMacs: string[];
}

export interface CableInfo {
  connected: boolean;
  cableType?: 'straight' | 'crossover' | 'fiber' | 'console' | 'serial' | 'wireless';
  targetDevice?: 'pc' | 'switch' | 'router' | 'server' | 'switchL2' | 'switchL3' | 'hub' | 'iot' | 'mobile' | 'printer' | 'cloud' | 'firewall' | 'wlc';
  targetPort?: string;
  sourceDevice?: 'pc' | 'switch' | 'router' | 'server' | 'switchL2' | 'switchL3' | 'hub' | 'iot' | 'mobile' | 'printer' | 'cloud' | 'firewall' | 'wlc';
  sourcePort?: string;
}
