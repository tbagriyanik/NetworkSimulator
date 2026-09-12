import { describe, it, expect } from 'vitest';
import { checkIngressSanity } from '@/lib/network/forwarding/commonForwardingEngine';
import type { CanvasDevice } from '@/components/network/networkTopology.types';
import type { SwitchState, Port } from '@/lib/network/types';
import type { NetworkPacketFrame } from '@/lib/network/forwarding/packetFrame';

describe('MAC Access-List (mac access-group) Ingress Engine Filtering', () => {
  const mockDevice: CanvasDevice = {
    id: 'sw1',
    name: 'Switch1',
    type: 'switchL2',
    ip: '192.168.1.2',
    status: 'online',
    x: 0,
    y: 0,
    ports: []
  };

  it('permits traffic when source and destination match permit rule', () => {
    const state = {
      hostname: 'Switch1',
      deviceType: 'switch',
      currentMode: 'privileged',
      macAcls: {
        'L2_ACL': ['permit host 0011.2233.4455 any']
      },
      ports: {
        'fa0/1': {
          id: 'fa0/1',
          name: 'FastEthernet0/1',
          status: 'connected',
          shutdown: false,
          type: 'fastethernet',
          macAccessGroupIn: 'L2_ACL'
        } as Port
      }
    } as unknown as SwitchState;

    const frame: NetworkPacketFrame = {
      id: 'frame-1',
      protocol: 'IPV4',
      etherType: '0x0800',
      timestamp: Date.now(),
      ingressDeviceId: 'sw1',
      srcMac: '0011.2233.4455',
      dstMac: 'ffff.ffff.ffff',
      length: 64,
      info: 'Broadcast frame'
    };

    const result = checkIngressSanity(frame, mockDevice, state, state.ports['fa0/1']);
    expect(result.allowed).toBe(true);
    expect(result.reason).toContain('Permitted by MAC ACL');
  });

  it('drops traffic when source matches deny rule', () => {
    const state = {
      hostname: 'Switch1',
      deviceType: 'switch',
      currentMode: 'privileged',
      macAcls: {
        'BLOCK_HOST': [
          'deny host 00aa.bbcc.ddee any',
          'permit any any'
        ]
      },
      ports: {
        'fa0/1': {
          id: 'fa0/1',
          name: 'FastEthernet0/1',
          status: 'connected',
          shutdown: false,
          type: 'fastethernet',
          macAccessGroupIn: 'BLOCK_HOST'
        } as Port
      }
    } as unknown as SwitchState;

    const frame: NetworkPacketFrame = {
      id: 'frame-2',
      protocol: 'IPV4',
      etherType: '0x0800',
      timestamp: Date.now(),
      ingressDeviceId: 'sw1',
      srcMac: '00aa.bbcc.ddee',
      dstMac: '0011.2233.4455',
      length: 64,
      info: 'Blocked host frame'
    };

    const result = checkIngressSanity(frame, mockDevice, state, state.ports['fa0/1']);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Dropped by MAC ACL BLOCK_HOST');
  });

  it('implicitly drops frame when no permit rule matches', () => {
    const state = {
      hostname: 'Switch1',
      deviceType: 'switch',
      currentMode: 'privileged',
      macAcls: {
        'ALLOW_ONLY_SPECIFIC': ['permit host 1111.2222.3333 any']
      },
      ports: {
        'fa0/1': {
          id: 'fa0/1',
          name: 'FastEthernet0/1',
          status: 'connected',
          shutdown: false,
          type: 'fastethernet',
          macAccessGroupIn: 'ALLOW_ONLY_SPECIFIC'
        } as Port
      }
    } as unknown as SwitchState;

    const frame: NetworkPacketFrame = {
      id: 'frame-3',
      protocol: 'IPV4',
      etherType: '0x0800',
      timestamp: Date.now(),
      ingressDeviceId: 'sw1',
      srcMac: '9999.8888.7777',
      dstMac: '0011.2233.4455',
      length: 64,
      info: 'Unknown frame'
    };

    const result = checkIngressSanity(frame, mockDevice, state, state.ports['fa0/1']);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Implicitly dropped by MAC ACL');
  });
});
