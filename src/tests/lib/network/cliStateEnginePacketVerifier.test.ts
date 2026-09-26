import { describe, it, expect } from 'vitest';
import { verifyCliStateEnginePacketChain, ChainVerificationStep } from '@/lib/network/core/cliStateEnginePacketVerifier';
import { createInitialState } from '@/lib/network/initialState';
import { CanvasDevice, CanvasConnection } from '@/components/network/NetworkTopology/types/networkTopology.types';
import { SwitchState } from '@/lib/network/types';

describe('cliStateEnginePacketVerifier Direct Unit Tests', () => {
  const switchBase = createInitialState('00:11:22:33:44:01', 'NS-L2-24TT-L');

  it('1. Verifies sequential CLI mode transitions and state invariants', () => {
    const steps: ChainVerificationStep[] = [
      {
        name: 'Enter privileged EXEC mode',
        cliCommand: 'enable',
        expectedMode: 'privileged',
        stateInvariants: (state: SwitchState) => ({
          pass: state.currentMode === 'privileged',
          reason: 'Current mode should be privileged'
        })
      },
      {
        name: 'Enter global configuration mode',
        cliCommand: 'configure terminal',
        expectedMode: 'config',
        stateInvariants: (state: SwitchState) => ({
          pass: state.currentMode === 'config',
          reason: 'Current mode should be config'
        })
      },
      {
        name: 'Set hostname and create VLAN 20',
        cliCommands: ['hostname CoreSwitch', 'vlan 20', 'name Accounting'],
        expectedMode: 'vlan',
        stateInvariants: (state: SwitchState) => {
          const hasHost = state.hostname === 'CoreSwitch';
          const hasVlan = state.vlans?.['20']?.name === 'Accounting';
          return {
            pass: hasHost && hasVlan,
            reason: `Hostname and VLAN check failed (host=${state.hostname})`
          };
        }
      },
      {
        name: 'Return to privileged mode',
        cliCommand: 'end',
        expectedMode: 'privileged',
        stateInvariants: (state: SwitchState) => state.currentMode === 'privileged'
      }
    ];

    const result = verifyCliStateEnginePacketChain(switchBase, steps, {
      deviceId: 'sw1'
    });

    expect(result.passed).toBe(true);
    expect(result.stepResults.length).toBe(4);
    expect(result.finalState.hostname).toBe('CoreSwitch');
    expect(result.finalState.vlans?.['20']?.name).toBe('Accounting');
  });

  it('2. Verifies interface configuration, state change and invariants', () => {
    const steps: ChainVerificationStep[] = [
      {
        name: 'Enter interface mode and configure access vlan',
        cliCommands: [
          'enable',
          'configure terminal',
          'interface Gi0/1',
          'switchport mode access',
          'switchport access vlan 50',
          'no shutdown'
        ],
        stateInvariants: (state: SwitchState) => {
          const port = state.ports?.['gi0/1'] || state.ports?.['Gi0/1'] || state.ports?.['GigabitEthernet0/1'];
          const isAccess = port?.mode === 'access';
          const isVlan50 = Number(port?.vlan) === 50;
          const isNotShutdown = port?.shutdown === false;
          return {
            pass: isAccess && isVlan50 && isNotShutdown,
            reason: `Port Gi0/1 check failed: mode=${port?.mode}, vlan=${port?.vlan}, shutdown=${port?.shutdown}`
          };
        }
      }
    ];

    const result = verifyCliStateEnginePacketChain(switchBase, steps, {
      deviceId: 'sw1'
    });

    expect(result.passed).toBe(true);
    expect(result.stepResults[0].stateVerification.pass).toBe(true);
  });

  it('3. Verifies packet forwarding simulation check in step verification', () => {
    const dev1: CanvasDevice = {
      id: 'pc1',
      name: 'PC1',
      type: 'pc',
      x: 0,
      y: 0,
      ip: '192.168.1.10',
      subnet: '255.255.255.0',
      status: 'online',
      ports: [{ id: 'eth0', name: 'eth0', label: 'eth0', status: 'connected', ipAddress: '192.168.1.10', subnetMask: '255.255.255.0' }]
    };
    const dev2: CanvasDevice = {
      id: 'pc2',
      name: 'PC2',
      type: 'pc',
      x: 200,
      y: 0,
      ip: '192.168.1.20',
      subnet: '255.255.255.0',
      status: 'online',
      ports: [{ id: 'eth0', name: 'eth0', label: 'eth0', status: 'connected', ipAddress: '192.168.1.20', subnetMask: '255.255.255.0' }]
    };

    const conn: CanvasConnection = {
      id: 'c1',
      sourceDeviceId: 'pc1',
      targetDeviceId: 'pc2',
      sourcePort: 'eth0',
      targetPort: 'eth0',
      cableType: 'crossover',
      active: true
    };

    const steps: ChainVerificationStep[] = [
      {
        name: 'Verify end-to-end packet delivery between directly connected PCs',
        packetTest: {
          frame: {
            id: 'pkt-test-1',
            protocol: 'ICMP',
            srcMac: '00:11:22:33:44:10',
            dstMac: '00:11:22:33:44:20',
            etherType: '0x0800',
            srcIp: '192.168.1.10',
            dstIp: '192.168.1.20',
            ttl: 64,
            timestamp: Date.now()
          },
          sourceDeviceId: 'pc1',
          targetDeviceId: 'pc2',
          devices: [dev1, dev2],
          connections: [conn],
          expectedSuccess: true
        }
      }
    ];

    const result = verifyCliStateEnginePacketChain(switchBase, steps, {
      devices: [dev1, dev2],
      connections: [conn]
    });

    expect(result.passed).toBe(true);
    expect(result.stepResults[0].packetVerification?.pass).toBe(true);
  });

  it('4. Detects invariant failures correctly and stops/reports failed index', () => {
    const steps: ChainVerificationStep[] = [
      {
        name: 'Step that intentionally fails state invariant',
        cliCommand: 'enable',
        stateInvariants: () => ({
          pass: false,
          reason: 'Expected invariant failure for testing error reporting'
        })
      }
    ];

    const result = verifyCliStateEnginePacketChain(switchBase, steps);

    expect(result.passed).toBe(false);
    expect(result.failedStepIndex).toBe(0);
    expect(result.stepResults[0].stateVerification.pass).toBe(false);
    expect(result.stepResults[0].stateVerification.reason).toContain('Expected invariant failure');
  });
});
