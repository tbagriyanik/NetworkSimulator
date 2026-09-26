import { SwitchState, CommandResult } from '../types';
import { executeCommand } from '../executor';
import { simulatePacketFlow } from '../forwarding/packetPipeline';
import { CanvasDevice, CanvasConnection } from '@/components/network/NetworkTopology/types/networkTopology.types';

export interface BehavioralTestCase {
  id: string;
  name: string;
  category: 'cli_mode' | 'no_command' | 'routing' | 'switching' | 'acl' | 'nat' | 'stp' | 'hsrp';
  initialState: SwitchState;
  setupCommands?: string[];
  testCommands: string[];
  expectedStateCheck?: (state: SwitchState) => boolean | { pass: boolean; reason?: string };
  expectedShowOutputs?: Array<{ command: string; contains: string[] }>;
  expectedPacketFlow?: {
    sourceDeviceId: string;
    targetDeviceId: string;
    srcIp: string;
    dstIp: string;
    protocol?: 'ICMP' | 'TCP' | 'UDP';
    shouldPass: boolean;
    expectedDropReason?: string;
    devices?: CanvasDevice[];
    connections?: CanvasConnection[];
  };
}

export interface TestCaseResult {
  testId: string;
  testName: string;
  passed: boolean;
  failures: string[];
}

export interface SuiteRegressionResult {
  passed: boolean;
  total: number;
  passedCount: number;
  failedCount: number;
  testResults: TestCaseResult[];
}

/**
 * Behavioral Regression Engine for Network Simulation
 */
export class BehavioralRegressionEngine {
  public static runTest(
    test: BehavioralTestCase,
    options?: {
      devices?: CanvasDevice[];
      connections?: CanvasConnection[];
      deviceId?: string;
    }
  ): TestCaseResult {
    let currentState: SwitchState = JSON.parse(JSON.stringify(test.initialState)) as SwitchState;
    const deviceId = options?.deviceId || 'd1';
    const deviceStatesMap = new Map<string, SwitchState>([[deviceId, currentState]]);
    const devices = options?.devices || [];
    const connections = options?.connections || [];
    const failures: string[] = [];

    // Run setup commands if any
    for (const cmd of test.setupCommands || []) {
      const res = executeCommand(currentState, cmd, 'en', devices, connections, deviceStatesMap, deviceId);
      if (res.newState) {
        currentState = { ...currentState, ...res.newState };
        deviceStatesMap.set(deviceId, currentState);
      }
    }

    // Run test commands
    for (const cmd of test.testCommands) {
      const res = executeCommand(currentState, cmd, 'en', devices, connections, deviceStatesMap, deviceId);
      if (res.newState) {
        currentState = { ...currentState, ...res.newState };
        deviceStatesMap.set(deviceId, currentState);
      }
    }

    // 1. Verify expected State
    if (test.expectedStateCheck) {
      const stateRes = test.expectedStateCheck(currentState);
      if (typeof stateRes === 'boolean') {
        if (!stateRes) failures.push('State assertion failed.');
      } else if (!stateRes.pass) {
        failures.push(stateRes.reason || 'State assertion failed.');
      }
    }

    // 2. Verify show outputs
    if (test.expectedShowOutputs) {
      for (const showReq of test.expectedShowOutputs) {
        const res: CommandResult = executeCommand(
          currentState,
          showReq.command,
          'en',
          devices,
          connections,
          deviceStatesMap,
          deviceId
        );
        const output = res.output || '';
        for (const str of showReq.contains) {
          if (!output.includes(str)) {
            failures.push(`Show command '${showReq.command}' output missing expected substring '${str}'. Output:\n${output}`);
          }
        }
      }
    }

    // 3. Verify Packet Flow
    if (test.expectedPacketFlow) {
      const pReq = test.expectedPacketFlow;
      const frame = {
        id: `reg-pkt-${test.id}`,
        srcIp: pReq.srcIp,
        dstIp: pReq.dstIp,
        srcMac: '00:11:22:33:44:55',
        dstMac: 'FF:FF:FF:FF:FF:FF',
        protocol: pReq.protocol || 'ICMP' as const,
        length: 64,
        ttl: 64,
        vlanId: 1,
        timestamp: Date.now(),
        etherType: '0x0800',
        info: ''
      };

      const pDevices = pReq.devices && pReq.devices.length > 0 ? pReq.devices : devices;
      const pConns = pReq.connections && pReq.connections.length > 0 ? pReq.connections : connections;

      const trace = simulatePacketFlow(
        pReq.sourceDeviceId,
        pReq.targetDeviceId,
        frame,
        pDevices,
        pConns,
        deviceStatesMap
      );

      if (trace.success !== pReq.shouldPass) {
        failures.push(`Packet flow expected success=${pReq.shouldPass}, but got ${trace.success}. Drop reason: ${trace.dropReason}`);
      }
      if (pReq.expectedDropReason && trace.dropReason !== pReq.expectedDropReason) {
        failures.push(`Packet flow expected drop reason '${pReq.expectedDropReason}', but got '${trace.dropReason}'`);
      }
    }

    return {
      testId: test.id,
      testName: test.name,
      passed: failures.length === 0,
      failures
    };
  }

  public static runSuite(
    suite: BehavioralTestCase[],
    options?: {
      devices?: CanvasDevice[];
      connections?: CanvasConnection[];
      deviceId?: string;
    }
  ): SuiteRegressionResult {
    const testResults: TestCaseResult[] = [];
    let passedCount = 0;
    let failedCount = 0;

    for (const test of suite) {
      const result = BehavioralRegressionEngine.runTest(test, options);
      testResults.push(result);
      if (result.passed) {
        passedCount++;
      } else {
        failedCount++;
      }
    }

    return {
      passed: failedCount === 0,
      total: suite.length,
      passedCount,
      failedCount,
      testResults
    };
  }
}
