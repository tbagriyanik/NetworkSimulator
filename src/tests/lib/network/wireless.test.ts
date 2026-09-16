import { describe, expect, it } from 'vitest';
import {
  getDeviceWifiConfig,
  getWirelessSignalStrength,
  getWirelessDistance,
  buildImplicitWirelessConnections,
  normalizeMac,
  wifiMacFilterMatches,
  getDeviceMacAddress,
  normalizeChannel,
  getChannelBand,
  formatChannelDisplay,
  wifiChannelMatches,
} from '@/lib/network/wireless';
import type { CanvasDevice } from '@/components/network/NetworkTopology/types/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import { parseCommand, validateCommand } from '@/lib/network/parser';
import { createInitialState } from '@/lib/network/initialState';
import { interfaceHandlers } from '@/lib/network/core/interfaceCommands';

describe('Wireless WEP Security Support', () => {
  const routerWithWep: CanvasDevice = {
    id: 'router-1',
    type: 'router',
    name: 'R1-WEP',
    ip: '192.168.1.1',
    status: 'online',
    x: 100,
    y: 100,
    ports: [
      {
        id: 'wlan0',
        label: 'WLAN0',
        status: 'connected',
        shutdown: false,
        wifi: {
          ssid: 'SecretWepNet',
          security: 'wep',
          password: 'mywepkey123',
          channel: '2.4GHz',
          mode: 'ap',
        },
      },
    ],
  };

  const clientPcMatchingWep: CanvasDevice = {
    id: 'pc-1',
    type: 'pc',
    name: 'PC-1',
    ip: '192.168.1.50',
    status: 'online',
    x: 150,
    y: 150,
    ports: [
      {
        id: 'wlan0',
        label: 'WLAN0',
        status: 'connected',
        shutdown: false,
      },
    ],
    wifi: {
      enabled: true,
      ssid: 'SecretWepNet',
      security: 'wep',
      password: 'mywepkey123',
      channel: '2.4GHz',
      mode: 'client',
    },
  };

  const clientPcWrongPasswordWep: CanvasDevice = {
    id: 'pc-2',
    type: 'pc',
    name: 'PC-2',
    ip: '192.168.1.51',
    status: 'online',
    x: 150,
    y: 150,
    ports: [
      {
        id: 'wlan0',
        label: 'WLAN0',
        status: 'connected',
        shutdown: false,
      },
    ],
    wifi: {
      enabled: true,
      ssid: 'SecretWepNet',
      security: 'wep',
      password: 'wrongwepkey',
      channel: '2.4GHz',
      mode: 'client',
    },
  };

  const clientPcWrongSecurity: CanvasDevice = {
    id: 'pc-3',
    type: 'pc',
    name: 'PC-3',
    ip: '192.168.1.52',
    status: 'online',
    x: 150,
    y: 150,
    ports: [
      {
        id: 'wlan0',
        label: 'WLAN0',
        status: 'connected',
        shutdown: false,
      },
    ],
    wifi: {
      enabled: true,
      ssid: 'SecretWepNet',
      security: 'wpa2',
      password: 'mywepkey123',
      channel: '2.4GHz',
      mode: 'client',
    },
  };

  it('correctly reads WEP wifi config from device and wlan port', () => {
    const config = getDeviceWifiConfig(routerWithWep);
    expect(config).toBeDefined();
    expect(config?.security).toBe('wep');
    expect(config?.ssid).toBe('SecretWepNet');
    expect(config?.password).toBe('mywepkey123');
  });

  it('calculates wireless signal strength for WEP clients within range', () => {
    const strength = getWirelessSignalStrength(clientPcMatchingWep, [routerWithWep, clientPcMatchingWep]);
    expect(strength).toBeGreaterThan(0);
  });

  it('calculates wireless distance accurately', () => {
    const distance = getWirelessDistance(clientPcMatchingWep, [routerWithWep, clientPcMatchingWep]);
    expect(distance).toBeCloseTo(Math.sqrt(50 * 50 + 50 * 50), 1);
  });

  it('establishes implicit wireless connection when WEP security and password match', () => {
    const connections = buildImplicitWirelessConnections([routerWithWep, clientPcMatchingWep]);
    expect(connections.length).toBe(1);
    expect(connections[0].sourceDeviceId).toBe('pc-1');
    expect(connections[0].targetDeviceId).toBe('router-1');
    expect(connections[0].cableType).toBe('wireless');
  });

  it('does NOT establish connection when WEP password is incorrect', () => {
    const connections = buildImplicitWirelessConnections([routerWithWep, clientPcWrongPasswordWep]);
    expect(connections.length).toBe(0);
  });

  it('does NOT establish connection when security type mismatches (e.g. WPA2 client with WEP AP)', () => {
    const connections = buildImplicitWirelessConnections([routerWithWep, clientPcWrongSecurity]);
    expect(connections.length).toBe(0);
  });

  it('supports encryption wep CLI command on WLAN interface', () => {
    const state: SwitchState = {
      ...createInitialState(),
      deviceType: 'router',
      currentMode: 'interface',
      currentInterface: 'wlan0',
      ports: {
        wlan0: {
          id: 'wlan0',
          name: 'WLAN',
          status: 'notconnect',
          vlan: 1,
          mode: 'routed',
          duplex: 'auto',
          speed: 'auto',
          shutdown: false,
          type: 'fastethernet',
          wifi: {
            ssid: 'TestSSID',
            security: 'open',
            channel: '2.4GHz',
            mode: 'ap',
          },
        },
      },
    };

    const parsed = parseCommand('encryption wep', 'interface', state);
    expect(parsed).not.toBeNull();
    if (!parsed) return;

    const validation = validateCommand(parsed, 'interface', state);
    expect(validation.valid).toBe(true);

    const result = interfaceHandlers.encryption(state, 'encryption wep', { language: 'en', deviceStates: new Map() });
    expect(result.success).toBe(true);
    expect(result.newState?.ports?.['wlan0']?.wifi?.security).toBe('wep');
  });

  it('supports security wep key set-key CLI command', () => {
    const state: SwitchState = {
      ...createInitialState(),
      currentMode: 'config',
      ports: {
        wlan0: {
          id: 'wlan0',
          name: 'WLAN',
          status: 'notconnect',
          vlan: 1,
          mode: 'routed',
          duplex: 'auto',
          speed: 'auto',
          shutdown: false,
          type: 'fastethernet',
        },
      },
    };

    const parsed = parseCommand('security wep key set-key ascii 0 secretkey123', 'config', state);
    expect(parsed).not.toBeNull();

    const result = interfaceHandlers['security wep key set-key'](
      state,
      'security wep key set-key ascii 0 secretkey123',
      { language: 'en', deviceStates: new Map() }
    );
    expect(result.success).toBe(true);
    expect(result.newState?.ports?.['wlan0']?.wifi?.security).toBe('wep');
    expect(result.newState?.ports?.['wlan0']?.wifi?.password).toBe('secretkey123');
  });
});

describe('Wireless Broadcast Channel Support', () => {
  it('normalizes channels correctly', () => {
    expect(normalizeChannel(undefined)).toBe('2.4GHz');
    expect(normalizeChannel('auto')).toBe('auto');
    expect(normalizeChannel('AUTO')).toBe('auto');
    expect(normalizeChannel('Otomatik')).toBe('auto');
    expect(normalizeChannel('6')).toBe('6');
    expect(normalizeChannel(6)).toBe('6');
    expect(normalizeChannel('channel 6')).toBe('6');
    expect(normalizeChannel('kanal 11')).toBe('11');
    expect(normalizeChannel('36')).toBe('36');
    expect(normalizeChannel('5GHz')).toBe('5GHz');
  });

  it('determines channel frequency band correctly', () => {
    expect(getChannelBand('1')).toBe('2.4GHz');
    expect(getChannelBand('6')).toBe('2.4GHz');
    expect(getChannelBand('11')).toBe('2.4GHz');
    expect(getChannelBand('2.4GHz')).toBe('2.4GHz');
    expect(getChannelBand('36')).toBe('5GHz');
    expect(getChannelBand('40')).toBe('5GHz');
    expect(getChannelBand('149')).toBe('5GHz');
    expect(getChannelBand('165')).toBe('5GHz');
    expect(getChannelBand('5GHz')).toBe('5GHz');
    expect(getChannelBand('auto')).toBe('auto');
  });

  it('formats channel display nicely in Turkish and English', () => {
    expect(formatChannelDisplay('auto', 'tr')).toBe('Otomatik');
    expect(formatChannelDisplay('auto', 'en')).toBe('Auto');
    expect(formatChannelDisplay('6', 'tr')).toContain('Kanal 6');
    expect(formatChannelDisplay('6', 'tr')).toContain('2.437 GHz');
    expect(formatChannelDisplay('6', 'en')).toContain('Channel 6');
    expect(formatChannelDisplay('36', 'tr')).toContain('Kanal 36');
    expect(formatChannelDisplay('36', 'tr')).toContain('5.180 GHz');
    expect(formatChannelDisplay('2.4GHz', 'tr')).toBe('2.4 GHz');
    expect(formatChannelDisplay('5GHz', 'en')).toBe('5 GHz');
  });

  it('correctly matches AP and Client wireless channels', () => {
    // Auto matches anything
    expect(wifiChannelMatches({ channel: '6', enabled: true, ssid: '', security: 'open', mode: 'ap' }, { channel: 'auto', enabled: true, ssid: '', security: 'open', mode: 'client' })).toBe(true);
    expect(wifiChannelMatches({ channel: 'auto', enabled: true, ssid: '', security: 'open', mode: 'ap' }, { channel: '6', enabled: true, ssid: '', security: 'open', mode: 'client' })).toBe(true);
    expect(wifiChannelMatches({ channel: '36', enabled: true, ssid: '', security: 'open', mode: 'ap' }, { channel: 'auto', enabled: true, ssid: '', security: 'open', mode: 'client' })).toBe(true);

    // Exact channel match
    expect(wifiChannelMatches({ channel: '6', enabled: true, ssid: '', security: 'open', mode: 'ap' }, { channel: '6', enabled: true, ssid: '', security: 'open', mode: 'client' })).toBe(true);
    expect(wifiChannelMatches({ channel: '36', enabled: true, ssid: '', security: 'open', mode: 'ap' }, { channel: '36', enabled: true, ssid: '', security: 'open', mode: 'client' })).toBe(true);

    // Generic band matches specific channel in that band
    expect(wifiChannelMatches({ channel: '6', enabled: true, ssid: '', security: 'open', mode: 'ap' }, { channel: '2.4GHz', enabled: true, ssid: '', security: 'open', mode: 'client' })).toBe(true);
    expect(wifiChannelMatches({ channel: '2.4GHz', enabled: true, ssid: '', security: 'open', mode: 'ap' }, { channel: '6', enabled: true, ssid: '', security: 'open', mode: 'client' })).toBe(true);
    expect(wifiChannelMatches({ channel: '36', enabled: true, ssid: '', security: 'open', mode: 'ap' }, { channel: '5GHz', enabled: true, ssid: '', security: 'open', mode: 'client' })).toBe(true);
    expect(wifiChannelMatches({ channel: '5GHz', enabled: true, ssid: '', security: 'open', mode: 'ap' }, { channel: '36', enabled: true, ssid: '', security: 'open', mode: 'client' })).toBe(true);

    // Specific channel mismatch
    expect(wifiChannelMatches({ channel: '6', enabled: true, ssid: '', security: 'open', mode: 'ap' }, { channel: '11', enabled: true, ssid: '', security: 'open', mode: 'client' })).toBe(false);
    expect(wifiChannelMatches({ channel: '1', enabled: true, ssid: '', security: 'open', mode: 'ap' }, { channel: '6', enabled: true, ssid: '', security: 'open', mode: 'client' })).toBe(false);
    expect(wifiChannelMatches({ channel: '36', enabled: true, ssid: '', security: 'open', mode: 'ap' }, { channel: '40', enabled: true, ssid: '', security: 'open', mode: 'client' })).toBe(false);

    // Cross-band mismatch
    expect(wifiChannelMatches({ channel: '6', enabled: true, ssid: '', security: 'open', mode: 'ap' }, { channel: '5GHz', enabled: true, ssid: '', security: 'open', mode: 'client' })).toBe(false);
    expect(wifiChannelMatches({ channel: '36', enabled: true, ssid: '', security: 'open', mode: 'ap' }, { channel: '2.4GHz', enabled: true, ssid: '', security: 'open', mode: 'client' })).toBe(false);
    expect(wifiChannelMatches({ channel: '6', enabled: true, ssid: '', security: 'open', mode: 'ap' }, { channel: '36', enabled: true, ssid: '', security: 'open', mode: 'client' })).toBe(false);
  });

  it('enforces channel matching in buildImplicitWirelessConnections', () => {
    const apRouterCh6: CanvasDevice = {
      id: 'router-ap',
      type: 'router',
      name: 'AP-Ch6',
      ip: '192.168.1.1',
      status: 'online',
      x: 100,
      y: 100,
      ports: [
        {
          id: 'wlan0',
          label: 'WLAN0',
          status: 'connected',
          shutdown: false,
          wifi: {
            ssid: 'OfficeNet',
            security: 'open',
            channel: '6',
            mode: 'ap',
          },
        },
      ],
    };

    const pcMatchingCh6: CanvasDevice = {
      id: 'pc-ch6',
      type: 'pc',
      name: 'PC-Ch6',
      ip: '192.168.1.10',
      status: 'online',
      x: 120,
      y: 120,
      ports: [{ id: 'wlan0', label: 'WLAN0', status: 'connected', shutdown: false }],
      wifi: {
        enabled: true,
        ssid: 'OfficeNet',
        security: 'open',
        channel: '6',
        mode: 'client',
      },
    };

    const pcAutoChannel: CanvasDevice = {
      id: 'pc-auto',
      type: 'pc',
      name: 'PC-Auto',
      ip: '192.168.1.11',
      status: 'online',
      x: 120,
      y: 120,
      ports: [{ id: 'wlan0', label: 'WLAN0', status: 'connected', shutdown: false }],
      wifi: {
        enabled: true,
        ssid: 'OfficeNet',
        security: 'open',
        channel: 'auto',
        mode: 'client',
      },
    };

    const pcMismatchCh11: CanvasDevice = {
      id: 'pc-ch11',
      type: 'pc',
      name: 'PC-Ch11',
      ip: '192.168.1.12',
      status: 'online',
      x: 120,
      y: 120,
      ports: [{ id: 'wlan0', label: 'WLAN0', status: 'connected', shutdown: false }],
      wifi: {
        enabled: true,
        ssid: 'OfficeNet',
        security: 'open',
        channel: '11',
        mode: 'client',
      },
    };

    const pcMismatch5Ghz: CanvasDevice = {
      id: 'pc-5ghz',
      type: 'pc',
      name: 'PC-5Ghz',
      ip: '192.168.1.13',
      status: 'online',
      x: 120,
      y: 120,
      ports: [{ id: 'wlan0', label: 'WLAN0', status: 'connected', shutdown: false }],
      wifi: {
        enabled: true,
        ssid: 'OfficeNet',
        security: 'open',
        channel: '36',
        mode: 'client',
      },
    };

    // Ch6 PC connects to Ch6 AP
    const conns1 = buildImplicitWirelessConnections([apRouterCh6, pcMatchingCh6]);
    expect(conns1.length).toBe(1);
    expect(conns1[0].sourceDeviceId).toBe('pc-ch6');

    // Auto PC connects to Ch6 AP
    const conns2 = buildImplicitWirelessConnections([apRouterCh6, pcAutoChannel]);
    expect(conns2.length).toBe(1);
    expect(conns2[0].sourceDeviceId).toBe('pc-auto');

    // Ch11 PC does NOT connect to Ch6 AP
    const conns3 = buildImplicitWirelessConnections([apRouterCh6, pcMismatchCh11]);
    expect(conns3.length).toBe(0);

    // 5GHz Ch36 PC does NOT connect to 2.4GHz Ch6 AP
    const conns4 = buildImplicitWirelessConnections([apRouterCh6, pcMismatch5Ghz]);
    expect(conns4.length).toBe(0);
  });
});

describe('Wireless MAC Address Filtering Support', () => {
  it('normalizes MAC addresses with different delimiters and formats', () => {
    expect(normalizeMac('00:11:22:33:44:55')).toBe('00:11:22:33:44:55');
    expect(normalizeMac('00-11-22-33-44-55')).toBe('00:11:22:33:44:55');
    expect(normalizeMac('0011.2233.4455')).toBe('00:11:22:33:44:55');
    expect(normalizeMac('001122334455')).toBe('00:11:22:33:44:55');
    expect(normalizeMac('AA:BB:CC:DD:EE:FF')).toBe('aa:bb:cc:dd:ee:ff');
    expect(normalizeMac('')).toBe('');
    expect(normalizeMac(undefined)).toBe('');
  });

  it('retrieves MAC address from device, ports, or device state', () => {
    const devDirectMac: CanvasDevice = {
      id: 'dev-1',
      type: 'pc',
      name: 'PC-1',
      ip: '192.168.1.21',
      macAddress: '00:50:79:66:68:01',
      status: 'online',
      x: 0,
      y: 0,
      ports: [],
    };
    expect(getDeviceMacAddress(devDirectMac)).toBe('00:50:79:66:68:01');

    const devPortMac: CanvasDevice = {
      id: 'dev-2',
      type: 'pc',
      name: 'PC-2',
      ip: '192.168.1.22',
      status: 'online',
      x: 0,
      y: 0,
      ports: [{ id: 'wlan0', label: 'WLAN0', status: 'connected', shutdown: false, macAddress: '00:50:79:66:68:02' }],
    };
    expect(getDeviceMacAddress(devPortMac)).toBe('00:50:79:66:68:02');
  });

  it('evaluates wifiMacFilterMatches in allow and deny modes', () => {
    const clientAllowed: CanvasDevice = {
      id: 'pc-allowed',
      type: 'pc',
      name: 'Allowed PC',
      ip: '192.168.1.23',
      macAddress: '00:11:22:33:44:55',
      status: 'online',
      x: 0,
      y: 0,
      ports: [],
    };

    const clientBlocked: CanvasDevice = {
      id: 'pc-blocked',
      type: 'pc',
      name: 'Blocked PC',
      ip: '192.168.1.24',
      macAddress: '00:AA:BB:CC:DD:EE',
      status: 'online',
      x: 0,
      y: 0,
      ports: [],
    };

    // Filter disabled -> both pass
    const apDisabled = {
      enabled: true,
      ssid: 'TestNet',
      security: 'open' as const,
      channel: '2.4GHz',
      mode: 'ap' as const,
      macFilterEnabled: false,
      macFilterList: ['00:11:22:33:44:55'],
    };
    expect(wifiMacFilterMatches(apDisabled, clientAllowed)).toBe(true);
    expect(wifiMacFilterMatches(apDisabled, clientBlocked)).toBe(true);

    // Whitelist (Allow mode) -> only listed MAC passes
    const apAllowMode = {
      enabled: true,
      ssid: 'TestNet',
      security: 'open' as const,
      channel: '2.4GHz',
      mode: 'ap' as const,
      macFilterEnabled: true,
      macFilterMode: 'allow' as const,
      macFilterList: ['00-11-22-33-44-55'], // different format
    };
    expect(wifiMacFilterMatches(apAllowMode, clientAllowed)).toBe(true);
    expect(wifiMacFilterMatches(apAllowMode, clientBlocked)).toBe(false);

    // Blacklist (Deny mode) -> listed MAC is blocked, others pass
    const apDenyMode = {
      enabled: true,
      ssid: 'TestNet',
      security: 'open' as const,
      channel: '2.4GHz',
      mode: 'ap' as const,
      macFilterEnabled: true,
      macFilterMode: 'deny' as const,
      macFilterList: ['0011.2233.4455'], 
    };
    expect(wifiMacFilterMatches(apDenyMode, clientAllowed)).toBe(false);
    expect(wifiMacFilterMatches(apDenyMode, clientBlocked)).toBe(true);
  });

  it('builds implicit connections respecting AP MAC address filtering', () => {
    const apRouter: CanvasDevice = {
      id: 'ap-mac',
      type: 'router',
      name: 'AP-Router',
      ip: '192.168.1.1',
      status: 'online',
      x: 100,
      y: 100,
      ports: [
        {
          id: 'wlan0',
          label: 'WLAN0',
          status: 'connected',
          shutdown: false,
          wifi: {
            ssid: 'FilteredNet',
            security: 'open',
            channel: '2.4GHz',
            mode: 'ap',
            macFilterEnabled: true,
            macFilterMode: 'allow',
            macFilterList: ['00:11:22:33:44:01'],
          },
        },
      ],
    };

    const pc1Allowed: CanvasDevice = {
      id: 'pc-1',
      type: 'pc',
      name: 'PC-1',
      macAddress: '00:11:22:33:44:01',
      ip: '192.168.1.10',
      status: 'online',
      x: 120,
      y: 120,
      ports: [{ id: 'wlan0', label: 'WLAN0', status: 'connected', shutdown: false }],
      wifi: {
        enabled: true,
        ssid: 'FilteredNet',
        security: 'open',
        channel: '2.4GHz',
        mode: 'client',
      },
    };

    const pc2Denied: CanvasDevice = {
      id: 'pc-2',
      type: 'pc',
      name: 'PC-2',
      macAddress: '00:11:22:33:44:02',
      ip: '192.168.1.11',
      status: 'online',
      x: 120,
      y: 120,
      ports: [{ id: 'wlan0', label: 'WLAN0', status: 'connected', shutdown: false }],
      wifi: {
        enabled: true,
        ssid: 'FilteredNet',
        security: 'open',
        channel: '2.4GHz',
        mode: 'client',
      },
    };

    // Only PC-1 connects under Allow mode
    const connsAllow = buildImplicitWirelessConnections([apRouter, pc1Allowed, pc2Denied]);
    expect(connsAllow.length).toBe(1);
    expect(connsAllow[0].sourceDeviceId).toBe('pc-1');
    expect(getWirelessSignalStrength(pc1Allowed, [apRouter])).toBeGreaterThan(0);
    expect(getWirelessSignalStrength(pc2Denied, [apRouter])).toBe(0);

    // Switch AP to Deny mode for PC-1
    const apPort = apRouter.ports[0];
    const apRouterDeny: CanvasDevice = {
      ...apRouter,
      ports: [
        {
          ...apPort,
          wifi: apPort.wifi && {
            ...apPort.wifi,
            macFilterMode: 'deny',
            macFilterList: ['00:11:22:33:44:01'],
          },
        },
      ],
    };

    // PC-2 connects, PC-1 is denied
    const connsDeny = buildImplicitWirelessConnections([apRouterDeny, pc1Allowed, pc2Denied]);
    expect(connsDeny.length).toBe(1);
    expect(connsDeny[0].sourceDeviceId).toBe('pc-2');
    expect(getWirelessSignalStrength(pc1Allowed, [apRouterDeny])).toBe(0);
    expect(getWirelessSignalStrength(pc2Denied, [apRouterDeny])).toBeGreaterThan(0);
  });
});



