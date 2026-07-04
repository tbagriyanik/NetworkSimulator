import { describe, it, expect, beforeEach } from 'vitest';
import { SwitchState } from '../../../lib/network/types';
import { calculateOSPFRoutes } from '../../../lib/network/ospf';

describe('OSPF Realistic Algorithm', () => {
  let deviceStates: Map<string, SwitchState>;

  beforeEach(() => {
    deviceStates = new Map();
  });

  it('should calculate intra-area OSPF routes using Dijkstra', () => {
    // Topology: R1 --- R2 --- R3 (All Area 0)
    const r1: any = {
      id: 'r1',
      routingProtocol: 'ospf',
      ospfAreas: [0],
      ports: {
        'gi0/0': { id: 'gi0/0', ipAddress: '10.0.0.1', subnetMask: '255.255.255.252', type: 'gigabitethernet' }
      }
    };
    const r2: any = {
      id: 'r2',
      routingProtocol: 'ospf',
      ospfAreas: [0],
      ports: {
        'gi0/0': { id: 'gi0/0', ipAddress: '10.0.0.2', subnetMask: '255.255.255.252', type: 'gigabitethernet' },
        'gi0/1': { id: 'gi0/1', ipAddress: '10.0.0.5', subnetMask: '255.255.255.252', type: 'gigabitethernet' }
      }
    };
    const r3: any = {
      id: 'r3',
      routingProtocol: 'ospf',
      ospfAreas: [0],
      ports: {
        'gi0/1': { id: 'gi0/1', ipAddress: '10.0.0.6', subnetMask: '255.255.255.252', type: 'gigabitethernet' },
        'gi0/2': { id: 'gi0/2', ipAddress: '192.168.1.1', subnetMask: '255.255.255.0', type: 'gigabitethernet' }
      }
    };

    deviceStates.set('r1', r1);
    deviceStates.set('r2', r2);
    deviceStates.set('r3', r3);

    const routes = calculateOSPFRoutes('r1', deviceStates);

    // R1 should learn about 10.0.0.4/30 and 192.168.1.0/24
    const r3Net = routes.find(r => r.destination === '192.168.1.0');
    expect(r3Net).toBeDefined();
    expect(r3Net?.metric).toBeGreaterThan(0);
    expect(r3Net?.area).toBe(0);
  });

  it('should handle multi-area OSPF with Type 3 LSAs', () => {
    // R1 (Area 0) --- R2 (ABR Area 0 & 1) --- R3 (Area 1)
    const r1: any = {
      id: 'r1',
      routingProtocol: 'ospf',
      ospfAreas: [0],
      ports: {
        'gi0/0': { id: 'gi0/0', ipAddress: '10.0.0.1', subnetMask: '255.255.255.252', type: 'gigabitethernet' }
      }
    };
    const r2: any = {
      id: 'r2',
      routingProtocol: 'ospf',
      ospfAreas: [0, 1],
      isAbr: true,
      ports: {
        'gi0/0': { id: 'gi0/0', ipAddress: '10.0.0.2', subnetMask: '255.255.255.252', type: 'gigabitethernet' },
        'gi0/1': { id: 'gi0/1', ipAddress: '10.0.1.1', subnetMask: '255.255.255.252', type: 'gigabitethernet' }
      }
    };
    const r3: any = {
      id: 'r3',
      routingProtocol: 'ospf',
      ospfAreas: [1],
      ports: {
        'gi0/1': { id: 'gi0/1', ipAddress: '10.0.1.2', subnetMask: '255.255.255.252', type: 'gigabitethernet' },
        'gi0/2': { id: 'gi0/2', ipAddress: '192.168.2.1', subnetMask: '255.255.255.0', type: 'gigabitethernet' }
      }
    };

    deviceStates.set('r1', r1);
    deviceStates.set('r2', r2);
    deviceStates.set('r3', r3);

    const r1Routes = calculateOSPFRoutes('r1', deviceStates);
    const interAreaRoute = r1Routes.find(r => r.destination === '192.168.2.0');

    expect(interAreaRoute).toBeDefined();
    // Inter-area routes are calculated from Summary LSAs
    expect(interAreaRoute?.area).toBe(0);
  });
});
