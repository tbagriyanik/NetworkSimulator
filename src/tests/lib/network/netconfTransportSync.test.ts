import { describe, expect, it } from 'vitest';
import type { SwitchState } from '@/lib/network/types';
import { processNetconfFrame } from '@/lib/network/netconfTransport';
import { extractNetconfConfig, applyNetconfEditConfig } from '@/lib/network/netconfStateSync';

describe('NETCONF Config & Operational State Synchronization', () => {
  const mockState: SwitchState = {
    hostname: 'Router-Core',
    domainName: 'example.com',
    ipRouting: true,
    ports: {
      'Gi0/0': { id: 'Gi0/0', name: 'Gi0/0', ipAddress: '192.168.1.1', subnetMask: '255.255.255.0', shutdown: false, status: 'connected' },
      'Gi0/1': { id: 'Gi0/1', name: 'Gi0/1', ipAddress: '10.0.0.1', subnetMask: '255.255.255.0', shutdown: true, status: 'disabled' },
    },
    vlans: {
      '10': { id: 10, name: 'VLAN_10', status: 'active', ports: ['Gi0/0'] },
    },
    staticRoutes: [
      { destination: '0.0.0.0', subnetMask: '0.0.0.0', nextHop: '192.168.1.254', type: 'static' },
    ],
    ntpServers: ['1.1.1.1'],
  } as unknown as SwitchState;

  it('extracts running configuration tree matching device state', () => {
    const config = extractNetconfConfig(mockState);
    expect(config.hostname).toBe('Router-Core');
    expect(config.domainName).toBe('example.com');
    expect((config.interfaces as Record<string, Record<string, unknown>>)['Gi0/0'].ipAddress).toBe('192.168.1.1');
    expect((config.vlans as Record<string, Record<string, unknown>>)['10'].name).toBe('VLAN_10');
  });

  it('applies NETCONF edit-config directly to target SwitchState parameters', () => {
    const { nextState, modifiedFields } = applyNetconfEditConfig(mockState, {
      'hostname': 'Router-Edge',
      'interface/Gi0/0/ip': '172.16.0.1',
      'interface/Gi0/0/mask': '255.255.0.0',
      'vlan/20/name': 'VOIP_VLAN',
    });

    expect(nextState.hostname).toBe('Router-Edge');
    expect(nextState.ports['Gi0/0'].ipAddress).toBe('172.16.0.1');
    expect(nextState.ports['Gi0/0'].subnetMask).toBe('255.255.0.0');
    expect(nextState.vlans['20']?.name).toBe('VOIP_VLAN');
    expect(modifiedFields).toContain('hostname');
  });

  it('processes NETCONF session frames and synchronizes get-config / edit-config', () => {
    const src = '10.0.0.100';

    // 1. Capability exchange handshake (hello)
    const helloRes = processNetconfFrame(mockState, src, { messageId: '1', operation: 'hello' });
    expect(helloRes.response.operation).toBe('hello');

    // 2. NETCONF get-config retrieval
    const getConfigRes = processNetconfFrame(helloRes.state, src, { messageId: '2', operation: 'get-config', path: 'hostname' });
    expect(getConfigRes.response.data?.hostname).toBe('Router-Core');

    // 3. NETCONF edit-config execution
    const editRes = processNetconfFrame(getConfigRes.state, src, {
      messageId: '3',
      operation: 'edit-config',
      data: { hostname: 'Router-SDN' },
    });
    expect(editRes.state.hostname).toBe('Router-SDN');

    // 4. NETCONF commit to persistent config
    const commitRes = processNetconfFrame(editRes.state, src, { messageId: '4', operation: 'commit' });
    expect(commitRes.state.savedConfig).toContain('Router-SDN');
  });
});
