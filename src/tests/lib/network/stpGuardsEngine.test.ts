import { describe, it, expect } from 'vitest';
import { evaluateStpGuards } from '../../../lib/network/stpGuardsEngine';
import type { Port } from '../../../lib/network/types';

describe('stpGuardsEngine', () => {
  it('triggers errdisable when BPDU is received on BPDU Guard enabled port', () => {
    const port: Port = {
      id: 'Fa0/1',
      name: 'FastEthernet0/1',
      type: 'fastethernet',
      status: 'connected',
      vlan: 1,
      mode: 'access',
      duplex: 'auto',
      speed: 'auto',
      shutdown: false,
      portfast: true,
      bpduGuard: true
    };

    const res = evaluateStpGuards(port, { rootBridgeId: '0001', rootPathCost: 0, isSuperior: true });
    expect(res.action).toBe('ERRDISABLE');
    expect(res.reason).toContain('BPDU Guard violation');
  });

  it('triggers BLOCK_ROOT when superior BPDU is received on Root Guard enabled port', () => {
    const port: Port = {
      id: 'Fa0/2',
      name: 'FastEthernet0/2',
      type: 'fastethernet',
      status: 'connected',
      vlan: 1,
      mode: 'access',
      duplex: 'auto',
      speed: 'auto',
      shutdown: false,
      rootGuard: true
    };

    const res = evaluateStpGuards(port, { rootBridgeId: '0000.0000.0001', rootPathCost: 0, isSuperior: true });
    expect(res.action).toBe('BLOCK_ROOT');
    expect(res.reason).toContain('Root Guard violation');
  });

  it('ignores BPDU when BPDU Filter is enabled', () => {
    const port: Port = {
      id: 'Fa0/3',
      name: 'FastEthernet0/3',
      type: 'fastethernet',
      status: 'connected',
      vlan: 1,
      mode: 'access',
      duplex: 'auto',
      speed: 'auto',
      shutdown: false,
      bpduFilter: true
    };

    const res = evaluateStpGuards(port, { rootBridgeId: '0001', rootPathCost: 0, isSuperior: true });
    expect(res.action).toBe('NONE');
  });

  it('triggers BLOCK_LOOP when BPDU loss is detected on Loop Guard enabled port', () => {
    const port: Port = {
      id: 'Fa0/4',
      name: 'FastEthernet0/4',
      type: 'fastethernet',
      status: 'connected',
      vlan: 1,
      mode: 'access',
      duplex: 'auto',
      speed: 'auto',
      shutdown: false,
      loopGuard: true
    };

    const res = evaluateStpGuards(port, undefined);
    expect(res.action).toBe('BLOCK_LOOP');
    expect(res.reason).toContain('Loop Guard violation');
    expect(res.reason).toContain('No BPDU received');
  });

  it('does not trigger BLOCK_LOOP when BPDU is received on Loop Guard enabled port', () => {
    const port: Port = {
      id: 'Fa0/5',
      name: 'FastEthernet0/5',
      type: 'fastethernet',
      status: 'connected',
      vlan: 1,
      mode: 'access',
      duplex: 'auto',
      speed: 'auto',
      shutdown: false,
      loopGuard: true
    };

    const res = evaluateStpGuards(port, { rootBridgeId: '0001', rootPathCost: 0, isSuperior: false });
    expect(res.action).toBe('NONE');
  });
});
