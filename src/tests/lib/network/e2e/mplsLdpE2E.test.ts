import { describe, it, expect } from 'vitest';
import {
  getOrCreateMplsConfig,
  enableMplsOnInterface,
  generateLfib,
  generateLib,
  forwardMplsPacket,
  getLfibTable,
  getLibTable,
  getLdpNeighborTable,
  getLdpDiscoveryInfo,
} from '@/lib/network/mplsLdpEngine';
import type { SwitchState } from '@/lib/network/types';

describe('MPLS / LDP E2E Pipeline (CLI -> State -> LFIB -> Forwarding -> Show)', () => {
  it('enables MPLS on interface, builds LFIB and swaps/pops labels during packet forwarding', () => {
    // 1. Ingress Router / Core LSR State
    const lsrState = {
      hostname: 'Core-LSR-1',
      routerId: '1.1.1.1',
      ports: {
        'GigabitEthernet0/0': { id: 'GigabitEthernet0/0', ipAddress: '10.0.0.1', subnetMask: '255.255.255.0', shutdown: false, status: 'connected' },
        'GigabitEthernet0/1': { id: 'GigabitEthernet0/1', ipAddress: '10.0.1.1', subnetMask: '255.255.255.0', shutdown: false, status: 'connected' },
      },
      dynamicRoutes: [
        { destination: '192.168.100.0/24', nextHop: '10.0.1.2', interface: 'GigabitEthernet0/1' },
      ],
    } as unknown as SwitchState;

    // 2. CLI -> State: Enable MPLS & LDP on interfaces
    enableMplsOnInterface(lsrState, 'GigabitEthernet0/0');
    enableMplsOnInterface(lsrState, 'GigabitEthernet0/1');

    const config = getOrCreateMplsConfig(lsrState);
    expect(config.enabled).toBe(true);
    expect(config.ldpEnabled).toBe(true);
    expect(config.discoveryInterfaces).toContain('GigabitEthernet0/0');
    expect(config.discoveryInterfaces).toContain('GigabitEthernet0/1');

    // 3. Generate LFIB & LIB
    generateLfib(lsrState);
    generateLib(lsrState);

    expect(config.lfib.length).toBeGreaterThanOrEqual(2);
    const entry100 = config.lfib.find((e) => e.prefix === '192.168.100.0/24');
    expect(entry100).toBeDefined();
    expect(entry100?.inLabel).toBeGreaterThanOrEqual(16);
    expect(entry100?.outInterface).toBe('GigabitEthernet0/1');

    // 4. Packet Forwarding: Ingress MPLS packet label lookup and forwarding
    const inLabel = entry100!.inLabel;
    const fwdResult = forwardMplsPacket(lsrState, {
      label: inLabel,
      destinationPrefix: '192.168.100.0/24',
      payload: 'PAYLOAD_DATA',
    });

    expect(fwdResult.action).toBe('pop');
    expect(fwdResult.outInterface).toBe('GigabitEthernet0/1');
    expect(fwdResult.nextHop).toBe('10.0.1.2');

    // 5. Show Command Outputs Verification
    const showTable = getLfibTable(lsrState);
    expect(showTable).toContain('InLabel');
    expect(showTable).toContain('OutLabel');
    expect(showTable).toContain(inLabel.toString());
    expect(showTable).toContain('192.168.100.0/24');

    const showLib = getLibTable(lsrState);
    expect(showLib).toContain('10.0.0.1/255.255.255.0');

    const showDiscovery = getLdpDiscoveryInfo(lsrState);
    expect(showDiscovery).toContain('GigabitEthernet0/0');
    expect(showDiscovery).toContain('GigabitEthernet0/1');
  });

  it('handles Penultimate Hop Popping (PHP) label untagging and unknown label drops', () => {
    const egressLsrState = {
      hostname: 'Egress-LER',
      routerId: '2.2.2.2',
      ports: {
        'GigabitEthernet0/0': { id: 'GigabitEthernet0/0', ipAddress: '10.0.1.2', subnetMask: '255.255.255.0', shutdown: false, status: 'connected' },
        'GigabitEthernet0/1': { id: 'GigabitEthernet0/1', ipAddress: '192.168.100.1', subnetMask: '255.255.255.0', shutdown: false, status: 'connected' },
      },
    } as unknown as SwitchState;

    enableMplsOnInterface(egressLsrState, 'GigabitEthernet0/0');
    const config = getOrCreateMplsConfig(egressLsrState);

    // Connected route gets Pop / Implicit-Null in LFIB
    config.lfib.push({
      inLabel: 16,
      outLabel: 'Pop',
      prefix: '192.168.100.0/24',
      outInterface: 'GigabitEthernet0/1',
      nextHop: '192.168.100.10',
    });

    // Forwarding with inLabel 16 should trigger pop
    const popRes = forwardMplsPacket(egressLsrState, {
      label: 16,
      destinationPrefix: '192.168.100.0/24',
      payload: 'ETHERNET_IP_PAYLOAD',
    });
    expect(popRes.action).toBe('pop');
    expect(popRes.outInterface).toBe('GigabitEthernet0/1');

    // Unknown label packet should be dropped
    const dropRes = forwardMplsPacket(egressLsrState, {
      label: 99999,
      destinationPrefix: '172.16.1.1',
    });
    expect(dropRes.action).toBe('drop');
  });

  it('verifies show mpls ldp neighbor table format with active peers', () => {
    const state = {} as SwitchState;
    const config = getOrCreateMplsConfig(state);
    config.neighbors['10.0.0.2'] = {
      peerLdpId: '2.2.2.2:0',
      peerIp: '10.0.0.2',
      tcpState: 'Operational',
      uptimeSeconds: 3600,
      addresses: ['10.0.0.2', '192.168.20.1'],
      discoverySource: 'GigabitEthernet0/0',
      holdTime: 180,
      labelsReceived: 12,
      labelsAdvertised: 8,
    };

    const output = getLdpNeighborTable(state);
    expect(output).toContain('Peer LDP Id');
    expect(output).toContain('10.0.0.2');
    expect(output).toContain('Operational');
  });
});
