import { SwitchState } from './types';
import { ExtendedFaultDefinition, FaultInjectionEngine } from './faultInjectionSystem';
import { CanvasDevice, CanvasConnection } from '@/components/network/NetworkTopology/types/networkTopology.types';
import { runRootCauseAnalysis, NetworkDiagnosticResult } from './connectivity/networkTroubleshooter';
import { simulatePacketFlow, PacketSimulationResult } from './forwarding/packetPipeline';

export interface TroubleshootingScenario {
  id: string;
  title: { tr: string; en: string };
  description: { tr: string; en: string };
  category: 'switching' | 'routing' | 'security' | 'dhcp' | 'nat' | 'mixed';
  difficulty: 'easy' | 'medium' | 'hard';
  sourceDeviceId: string;
  targetDeviceId: string;
  targetIp: string;
  devices: CanvasDevice[];
  connections: CanvasConnection[];
  initialDeviceStates: Map<string, SwitchState>;
  faults: ExtendedFaultDefinition[];
}

export interface ScenarioEvaluation {
  isCompleted: boolean;
  score: number;
  resolvedFaultsCount: number;
  totalFaultsCount: number;
  activeDiagnosticResult: NetworkDiagnosticResult;
  packetTrace: PacketSimulationResult;
  faultStatuses: Array<{
    faultId: string;
    description: { tr: string; en: string };
    isResolved: boolean;
  }>;
}

export class TroubleshootingSession {
  private scenario: TroubleshootingScenario;
  private currentDeviceStates: Map<string, SwitchState>;
  private hintsRequested: Map<string, number> = new Map();

  constructor(scenario: TroubleshootingScenario) {
    this.scenario = scenario;
    this.currentDeviceStates = new Map();

    // Deep clone initial states and inject faults
    scenario.initialDeviceStates.forEach((state, devId) => {
      let modState = JSON.parse(JSON.stringify(state)) as SwitchState;
      const deviceFaults = scenario.faults.filter(f => f.deviceId === devId);
      for (const fault of deviceFaults) {
        modState = FaultInjectionEngine.injectFault(modState, fault);
      }
      this.currentDeviceStates.set(devId, modState);
    });
  }

  public getScenario(): TroubleshootingScenario {
    return this.scenario;
  }

  public getDeviceStates(): Map<string, SwitchState> {
    return this.currentDeviceStates;
  }

  public updateDeviceState(deviceId: string, newState: SwitchState): void {
    this.currentDeviceStates.set(deviceId, newState);
  }

  public requestHint(faultId: string): { hintText: string; level: number } {
    const fault = this.scenario.faults.find(f => f.id === faultId);
    if (!fault) {
      return { hintText: 'Arıza tanımı bulunamadı.', level: 0 };
    }
    const currentLevel = (this.hintsRequested.get(faultId) || 0) + 1;
    const clampedLevel = Math.min(currentLevel, 3) as 1 | 2 | 3;
    this.hintsRequested.set(faultId, clampedLevel);

    const hintText = FaultInjectionEngine.getHint(fault, clampedLevel, 'tr');
    return { hintText, level: clampedLevel };
  }

  public evaluate(): ScenarioEvaluation {
    const faultStatuses = this.scenario.faults.map(fault => {
      const devState = this.currentDeviceStates.get(fault.deviceId);
      const isResolved = devState ? FaultInjectionEngine.isResolved(devState, fault) : false;
      return {
        faultId: fault.id,
        description: fault.description,
        isResolved
      };
    });

    const resolvedCount = faultStatuses.filter(f => f.isResolved).length;
    const totalCount = faultStatuses.length;

    // Run Root Cause Analysis
    const diagResult = runRootCauseAnalysis(
      this.scenario.sourceDeviceId,
      this.scenario.targetDeviceId,
      this.scenario.devices,
      this.scenario.connections,
      this.currentDeviceStates
    );

    // Run actual packet test
    const dummyFrame = {
      id: 'troubleshoot-pkt-eval',
      srcIp: this.scenario.devices.find(d => d.id === this.scenario.sourceDeviceId)?.ip || '192.168.1.10',
      dstIp: this.scenario.targetIp,
      srcMac: '00:11:22:33:44:55',
      dstMac: 'FF:FF:FF:FF:FF:FF',
      protocol: 'ICMP' as const,
      length: 64,
      ttl: 64,
      vlanId: 1,
      timestamp: Date.now(),
      etherType: '0x0800',
      info: ''
    };

    const packetTrace = simulatePacketFlow(
      this.scenario.sourceDeviceId,
      this.scenario.targetDeviceId,
      dummyFrame,
      this.scenario.devices,
      this.scenario.connections,
      this.currentDeviceStates
    );

    const isCompleted = packetTrace.success && resolvedCount === totalCount;

    // Calculate score
    let totalHintsUsed = 0;
    this.hintsRequested.forEach(level => { totalHintsUsed += level; });
    let baseScore = isCompleted ? 100 : Math.round((resolvedCount / Math.max(totalCount, 1)) * 70);
    baseScore = Math.max(0, baseScore - totalHintsUsed * 5);

    return {
      isCompleted,
      score: baseScore,
      resolvedFaultsCount: resolvedCount,
      totalFaultsCount: totalCount,
      activeDiagnosticResult: diagResult,
      packetTrace,
      faultStatuses
    };
  }
}
