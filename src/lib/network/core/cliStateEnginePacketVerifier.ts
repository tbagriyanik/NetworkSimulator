import { SwitchState, CommandResult } from '../types';
import { createInitialState } from '../initialState';
import { executeCommand } from '../executor';
import { simulatePacketFlow, PacketSimulationResult } from '../forwarding/packetPipeline';
import { NetworkPacketFrame } from '../forwarding/packetFrame';
import { CanvasDevice, CanvasConnection } from '@/components/network/NetworkTopology/types/networkTopology.types';

export interface ChainVerificationStep {
  name: string;
  cliCommand?: string;
  cliCommands?: string[];
  expectedMode?: string;
  stateInvariants?: (state: SwitchState) => boolean | { pass: boolean; reason?: string };
  engineInvariants?: (state: SwitchState, deviceStates?: Map<string, SwitchState>) => boolean | { pass: boolean; reason?: string };
  packetTest?: {
    frame: Partial<NetworkPacketFrame>;
    sourceDeviceId: string;
    targetDeviceId: string;
    devices: CanvasDevice[];
    connections: CanvasConnection[];
    expectedSuccess: boolean;
    expectedDropReason?: string;
  };
}

export interface VerificationStepResult {
  stepName: string;
  cliSuccess: boolean;
  cliOutputs: string[];
  stateVerification: { pass: boolean; reason?: string };
  engineVerification: { pass: boolean; reason?: string };
  packetVerification?: {
    pass: boolean;
    actualSuccess?: boolean;
    actualDropReason?: string;
    trace?: PacketSimulationResult;
    reason?: string;
  };
  overallPass: boolean;
}

export interface VerificationChainResult {
  passed: boolean;
  finalState: SwitchState;
  stepResults: VerificationStepResult[];
  failedStepIndex?: number;
}

/**
 * Validates the full CLI → State → Engine → Packet chain.
 */
export function verifyCliStateEnginePacketChain(
  initialState: SwitchState,
  steps: ChainVerificationStep[],
  options?: {
    devices?: CanvasDevice[];
    connections?: CanvasConnection[];
    deviceStatesMap?: Map<string, SwitchState>;
    deviceId?: string;
  }
): VerificationChainResult {
  let currentState: SwitchState = { ...initialState };
  const deviceId = options?.deviceId || 'd1';
  const deviceStatesMap = options?.deviceStatesMap || new Map<string, SwitchState>([[deviceId, currentState]]);
  const devices = options?.devices || [];
  const connections = options?.connections || [];

  const stepResults: VerificationStepResult[] = [];
  let overallPassed = true;
  let failedIndex: number | undefined = undefined;

  for (let idx = 0; idx < steps.length; idx++) {
    const step = steps[idx];
    const commandsToRun: string[] = step.cliCommands || (step.cliCommand ? [step.cliCommand] : []);
    const outputs: string[] = [];
    let cliOk = true;

    for (const cmd of commandsToRun) {
      const res: CommandResult = executeCommand(
        currentState,
        cmd,
        'en',
        devices,
        connections,
        deviceStatesMap,
        deviceId
      );
      outputs.push(res.output || '');
      if (res.newState) {
        currentState = { ...currentState, ...res.newState };
        deviceStatesMap.set(deviceId, currentState);
      }
      if (!res.success || (res.output && res.output.includes('% Invalid') && !cmd.includes('invalid'))) {
        cliOk = false;
      }
    }

    // 1. Mode check
    if (step.expectedMode && currentState.currentMode !== step.expectedMode) {
      cliOk = false;
    }

    // 2. State Invariants Check
    let stateResult: { pass: boolean; reason?: string } = { pass: true };
    if (step.stateInvariants) {
      const stateCheck = step.stateInvariants(currentState);
      if (typeof stateCheck === 'boolean') {
        stateResult = { pass: stateCheck, reason: stateCheck ? undefined : 'State invariant failed' };
      } else {
        stateResult = stateCheck;
      }
    }

    // 3. Engine Invariants Check
    let engineResult: { pass: boolean; reason?: string } = { pass: true };
    if (step.engineInvariants) {
      const engineCheck = step.engineInvariants(currentState, deviceStatesMap);
      if (typeof engineCheck === 'boolean') {
        engineResult = { pass: engineCheck, reason: engineCheck ? undefined : 'Engine invariant failed' };
      } else {
        engineResult = engineCheck;
      }
    }

    // 4. Packet Flow Test
    let packetResult: VerificationStepResult['packetVerification'] = undefined;
    if (step.packetTest) {
      const pTest = step.packetTest;
      const fullFrame: NetworkPacketFrame = {
        ...pTest.frame,
        id: `pkt-verif-${idx}`,
        srcIp: pTest.frame.srcIp || '192.168.1.10',
        dstIp: pTest.frame.dstIp || '192.168.1.20',
        srcMac: pTest.frame.srcMac || '00:11:22:33:44:55',
        dstMac: pTest.frame.dstMac || 'FF:FF:FF:FF:FF:FF',
        protocol: pTest.frame.protocol || 'ICMP',
        length: pTest.frame.length || 64,
        ttl: pTest.frame.ttl || 64,
        vlanId: pTest.frame.vlanId || 1,
        timestamp: pTest.frame.timestamp ?? Date.now(),
        etherType: pTest.frame.etherType ?? '0x0800',
        info: pTest.frame.info ?? ''
      };

      const pDevices = pTest.devices.length > 0 ? pTest.devices : devices;
      const pConns = pTest.connections.length > 0 ? pTest.connections : connections;

      if (!deviceStatesMap.has(pTest.sourceDeviceId)) {
        const srcSt = createInitialState('00:11:22:33:44:10', 'NS-L2-24TT-L');
        srcSt.deviceType = 'pc';
        deviceStatesMap.set(pTest.sourceDeviceId, srcSt);
      }
      if (!deviceStatesMap.has(pTest.targetDeviceId)) {
        const tgtSt = createInitialState('00:11:22:33:44:20', 'NS-L2-24TT-L');
        tgtSt.deviceType = 'pc';
        deviceStatesMap.set(pTest.targetDeviceId, tgtSt);
      }

      const trace = simulatePacketFlow(
        pTest.sourceDeviceId,
        pTest.targetDeviceId,
        fullFrame,
        pDevices,
        pConns,
        deviceStatesMap
      );

      const passSuccess = trace.success === pTest.expectedSuccess;
      const passDrop = !pTest.expectedDropReason || trace.dropReason === pTest.expectedDropReason;
      const passPacket = passSuccess && passDrop;

      packetResult = {
        pass: passPacket,
        actualSuccess: trace.success,
        actualDropReason: trace.dropReason,
        trace,
        reason: passPacket ? undefined : `Packet test mismatch. Expected success=${pTest.expectedSuccess}, got ${trace.success}. Expected drop=${pTest.expectedDropReason}, got ${trace.dropReason}`
      };
    }

    const stepPassed = cliOk && stateResult.pass && engineResult.pass && (packetResult ? packetResult.pass : true);

    stepResults.push({
      stepName: step.name,
      cliSuccess: cliOk,
      cliOutputs: outputs,
      stateVerification: stateResult,
      engineVerification: engineResult,
      packetVerification: packetResult,
      overallPass: stepPassed
    });

    if (!stepPassed && overallPassed) {
      overallPassed = false;
      failedIndex = idx;
    }
  }

  return {
    passed: overallPassed,
    finalState: currentState,
    stepResults,
    failedStepIndex: failedIndex
  };
}
