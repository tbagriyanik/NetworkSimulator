import { describe, it, expect } from 'vitest';
import { FaultInjectionEngine } from '@/lib/network/faultInjectionSystem';
import { TroubleshootingSession, TroubleshootingScenario } from '@/lib/network/troubleshootingModeEngine';
import { createInitialState } from '@/lib/network/initialState';
import { CanvasDevice, CanvasConnection } from '@/components/network/NetworkTopology/types/networkTopology.types';

describe('Fault Injection System & Troubleshooting Mode', () => {
  const switchBase = createInitialState('00:aa:bb:cc:dd:01', 'NS-L2-24TT-L');

  it('1. Create and inject shutdown interface fault', () => {
    const fault = FaultInjectionEngine.createFault({
      deviceId: 'sw1',
      faultType: 'shutdownInterface',
      portId: 'fa0/1'
    });

    expect(fault.configKey).toBe('ports.fa0/1.shutdown');
    expect(fault.faultValue).toBe(true);

    const baseWithPort = {
      ...switchBase,
      ports: {
        ...switchBase.ports,
        'fa0/1': {
          id: 'fa0/1',
          name: '',
          status: 'connected' as const,
          vlan: 1,
          mode: 'access' as const,
          duplex: 'auto' as const,
          speed: 'auto' as const,
          shutdown: false,
          type: 'fastethernet' as const
        }
      }
    };

    const injectedState = FaultInjectionEngine.injectFault(baseWithPort, fault);
    expect(injectedState.ports['fa0/1']?.shutdown).toBe(true);

    const isResolvedBefore = FaultInjectionEngine.isResolved(injectedState, fault);
    expect(isResolvedBefore).toBe(false);

    // Fix fault
    const fixedState = {
      ...injectedState,
      ports: {
        ...injectedState.ports,
        'fa0/1': { ...injectedState.ports['fa0/1'], shutdown: false }
      }
    };

    const isResolvedAfter = FaultInjectionEngine.isResolved(fixedState, fault);
    expect(isResolvedAfter).toBe(true);
  });

  it('2. Progressive Hints Generation', () => {
    const fault = FaultInjectionEngine.createFault({
      deviceId: 'r1',
      faultType: 'wrongIpAddress',
      portId: 'Gi0/0',
      faultValue: '10.0.0.99',
      correctValue: '10.0.0.1'
    });

    const h1 = FaultInjectionEngine.getHint(fault, 1, 'tr');
    const h2 = FaultInjectionEngine.getHint(fault, 2, 'tr');
    const h3 = FaultInjectionEngine.getHint(fault, 3, 'tr');

    expect(h1).toBeDefined();
    expect(h2).toBeDefined();
    expect(h3).toContain('Gi0/0');
  });

  it('3. Troubleshooting Session Scenario Evaluation', () => {
    const devices: CanvasDevice[] = [
      { id: 'pc1', name: 'PC1', type: 'pc', x: 0, y: 0, ip: '192.168.1.10', subnet: '255.255.255.0', status: 'online', ports: [] },
      { id: 'pc2', name: 'PC2', type: 'pc', x: 100, y: 0, ip: '192.168.1.20', subnet: '255.255.255.0', status: 'online', ports: [] }
    ];
    const connections: CanvasConnection[] = [
      { id: 'c1', sourceDeviceId: 'pc1', targetDeviceId: 'pc2', sourcePort: 'eth0', targetPort: 'eth0', cableType: 'crossover', active: true }
    ];

    const fault = FaultInjectionEngine.createFault({
      deviceId: 'pc1',
      faultType: 'shutdownInterface',
      portId: 'eth0'
    });

    const pc1State = {
      ...switchBase,
      ports: {
        eth0: {
          id: 'eth0',
          name: '',
          status: 'connected' as const,
          vlan: 1,
          mode: 'routed' as const,
          duplex: 'auto' as const,
          speed: 'auto' as const,
          shutdown: false,
          type: 'fastethernet' as const,
          ipAddress: '192.168.1.10',
          subnetMask: '255.255.255.0'
        }
      }
    };

    const pc2State = {
      ...switchBase,
      ports: {
        eth0: {
          id: 'eth0',
          name: '',
          status: 'connected' as const,
          vlan: 1,
          mode: 'routed' as const,
          duplex: 'auto' as const,
          speed: 'auto' as const,
          shutdown: false,
          type: 'fastethernet' as const,
          ipAddress: '192.168.1.20',
          subnetMask: '255.255.255.0'
        }
      }
    };

    const scenario: TroubleshootingScenario = {
      id: 'scen-01',
      title: { tr: 'PC1-PC2 Erişilebilirlik Sorunu', en: 'PC1-PC2 Reachability Issue' },
      description: { tr: 'PC1 cihazı PC2 ile haberleşemiyor.', en: 'PC1 cannot communicate with PC2.' },
      category: 'switching',
      difficulty: 'easy',
      sourceDeviceId: 'pc1',
      targetDeviceId: 'pc2',
      targetIp: '192.168.1.20',
      devices,
      connections,
      initialDeviceStates: new Map([['pc1', pc1State], ['pc2', pc2State]]),
      faults: [fault]
    };

    const session = new TroubleshootingSession(scenario);

    // Initial evaluation - should not be completed because eth0 on pc1 is shutdown
    const eval1 = session.evaluate();
    expect(eval1.isCompleted).toBe(false);
    expect(eval1.resolvedFaultsCount).toBe(0);

    // Request hint
    const hintRes = session.requestHint(fault.id);
    expect(hintRes.level).toBe(1);

    // Resolve fault in session
    const currentPc1State = session.getDeviceStates().get('pc1')!;
    const fixedPc1State = {
      ...currentPc1State,
      ports: {
        ...currentPc1State.ports,
        eth0: { ...currentPc1State.ports['eth0'], shutdown: false }
      }
    };
    session.updateDeviceState('pc1', fixedPc1State);

    const eval2 = session.evaluate();
    expect(eval2.resolvedFaultsCount).toBe(1);
  });
});
