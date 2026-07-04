import { describe, it, expect, beforeEach } from 'vitest';
import { SwitchState } from '../../../lib/network/types';
import { buildEigrpTopologyTable, runEigrpDual } from '../../../lib/network/eigrp-dual';

describe('EIGRP DUAL Algorithm', () => {
  let deviceStates: Map<string, SwitchState>;

  beforeEach(() => {
    deviceStates = new Map();
  });

  it('should select successor and feasible successor based on FC', () => {
    // Topology: R1 connected to R2 and R3. R2 and R3 both have route to 192.168.1.0/24.
    // R1 --- R2 (Successor, FD=20, RD=10)
    // R1 --- R3 (Feasible Successor? depends on RD < FD)

    const r1 = {
      id: 'r1',
      routingProtocol: 'eigrp',
      eigrpAs: '100',
      ports: {
        'gi0/0': { id: 'gi0/0', ipAddress: '10.0.0.1', subnetMask: '255.255.255.252', type: 'gigabitethernet' },
        'gi0/1': { id: 'gi0/1', ipAddress: '10.0.0.5', subnetMask: '255.255.255.252', type: 'gigabitethernet' }
      }
    } as unknown as SwitchState;

    const r2 = {
      id: 'r2',
      routingProtocol: 'eigrp',
      eigrpAs: '100',
      ports: {
        'gi0/0': { id: 'gi0/0', ipAddress: '10.0.0.2', subnetMask: '255.255.255.252', type: 'gigabitethernet' },
        'gi0/2': { id: 'gi0/2', ipAddress: '192.168.1.1', subnetMask: '255.255.255.0', type: 'gigabitethernet' }
      }
    } as unknown as SwitchState;

    const r3 = {
      id: 'r3',
      routingProtocol: 'eigrp',
      eigrpAs: '100',
      ports: {
        'gi0/1': { id: 'gi0/1', ipAddress: '10.0.0.6', subnetMask: '255.255.255.252', type: 'gigabitethernet' },
        'gi0/2': { id: 'gi0/2', ipAddress: '192.168.1.2', subnetMask: '255.255.255.0', type: 'gigabitethernet', shutdown: true } // Same network
      },
      dynamicRoutes: [
        { destination: '192.168.1.0', subnetMask: '255.255.255.0', type: 'dynamic', metric: 5000 } // Advertise with specific RD
      ]
    } as unknown as SwitchState;

    deviceStates.set('r1', r1);
    deviceStates.set('r2', r2);
    deviceStates.set('r3', r3);

    const table = buildEigrpTopologyTable('r1', deviceStates);
    const converged = runEigrpDual(table);

    const entries = converged.filter(e => e.destination === '192.168.1.0');
    expect(entries.length).toBeGreaterThanOrEqual(1);

    const successor = entries.find(e => e.isSuccessor);
    expect(successor).toBeDefined();

    // Check Feasibility Condition (RD < FD)
    const fd = successor ? successor.computedDistance : 0;
    entries.forEach(e => {
      if (!e.isSuccessor) {
        if (e.reportedDistance < fd) {
          expect(e.isFeasibleSuccessor).toBe(true);
        } else {
          expect(e.isFeasibleSuccessor).toBe(false);
        }
      }
    });
  });
});
