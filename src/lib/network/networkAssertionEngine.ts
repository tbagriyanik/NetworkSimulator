import { CanvasDevice, CanvasConnection } from '@/components/network/NetworkTopology/types/networkTopology.types';
import { SwitchState } from '@/lib/network/types';
import { checkDeviceConnectivity } from './connectivity/pingDiagnostics';

export type NetworkAssertionType =
  | 'PING_SUCCESS'
  | 'PING_FAIL'
  | 'PORT_REACHABLE'
  | 'PORT_BLOCKED'
  | 'VLAN_ISOLATED';

export interface NetworkAssertionRule {
  id: string;
  type: NetworkAssertionType;
  sourceDeviceId: string;
  targetDeviceId: string;
  port?: number;
  descriptionTr: string;
  descriptionEn: string;
}

export interface AssertionResult {
  ruleId: string;
  passed: boolean;
  messageTr: string;
  messageEn: string;
  details?: string;
}

export function evaluateNetworkAssertion(
  rule: NetworkAssertionRule,
  devices: CanvasDevice[],
  connections: CanvasConnection[],
  deviceStates?: Map<string, SwitchState>
): AssertionResult {
  const srcDev = devices.find(d => d.id === rule.sourceDeviceId || d.name === rule.sourceDeviceId);
  const tgtDev = devices.find(d => d.id === rule.targetDeviceId || d.name === rule.targetDeviceId);

  if (!srcDev || !tgtDev) {
    return {
      ruleId: rule.id,
      passed: false,
      messageTr: `Cihaz bulunamadı: ${rule.sourceDeviceId} -> ${rule.targetDeviceId}`,
      messageEn: `Device not found: ${rule.sourceDeviceId} -> ${rule.targetDeviceId}`,
    };
  }

  const connResult = checkDeviceConnectivity(
    srcDev.id,
    tgtDev.id,
    devices,
    connections,
    deviceStates,
    {
      protocol: rule.port ? 'tcp' : 'icmp',
      port: rule.port ? String(rule.port) : undefined,
    }
  );

  switch (rule.type) {
    case 'PING_SUCCESS': {
      const passed = connResult.success;
      return {
        ruleId: rule.id,
        passed,
        messageTr: passed
          ? `${srcDev.name} -> ${tgtDev.name} ping erişimi başarılı.`
          : `${srcDev.name} -> ${tgtDev.name} ping başarısız (${connResult.error || 'Erişilemiyor'}).`,
        messageEn: passed
          ? `${srcDev.name} -> ${tgtDev.name} ping reachability passed.`
          : `${srcDev.name} -> ${tgtDev.name} ping failed (${connResult.error || 'Unreachable'}).`,
        details: connResult.error,
      };
    }
    case 'PING_FAIL':
    case 'VLAN_ISOLATED': {
      const passed = !connResult.success;
      return {
        ruleId: rule.id,
        passed,
        messageTr: passed
          ? `${srcDev.name} -> ${tgtDev.name} izolasyonu doğrulandı (Erişim engelli).`
          : `${srcDev.name} -> ${tgtDev.name} izolasyonu başarısız (Beklenmeyen erişim var).`,
        messageEn: passed
          ? `${srcDev.name} -> ${tgtDev.name} isolation verified (Traffic blocked).`
          : `${srcDev.name} -> ${tgtDev.name} isolation failed (Unexpected access allowed).`,
        details: connResult.error,
      };
    }
    case 'PORT_REACHABLE': {
      const passed = connResult.success;
      return {
        ruleId: rule.id,
        passed,
        messageTr: passed
          ? `${srcDev.name} -> ${tgtDev.name}:${rule.port || 80} port erişimi başarılı.`
          : `${srcDev.name} -> ${tgtDev.name}:${rule.port || 80} portuna erişilemedi (${connResult.error || 'Port kapalı / engelli'}).`,
        messageEn: passed
          ? `${srcDev.name} -> ${tgtDev.name}:${rule.port || 80} port access passed.`
          : `${srcDev.name} -> ${tgtDev.name}:${rule.port || 80} port access failed (${connResult.error || 'Port closed / blocked'}).`,
        details: connResult.error,
      };
    }
    case 'PORT_BLOCKED': {
      const passed = !connResult.success;
      return {
        ruleId: rule.id,
        passed,
        messageTr: passed
          ? `${srcDev.name} -> ${tgtDev.name}:${rule.port || 80} port engellemesi doğrulandı.`
          : `${srcDev.name} -> ${tgtDev.name}:${rule.port || 80} portu engellenemedi (Erişim açık).`,
        messageEn: passed
          ? `${srcDev.name} -> ${tgtDev.name}:${rule.port || 80} port blocking verified.`
          : `${srcDev.name} -> ${tgtDev.name}:${rule.port || 80} port blocking failed (Access open).`,
        details: connResult.error,
      };
    }
  }
}

export function runAllNetworkAssertions(
  rules: NetworkAssertionRule[],
  devices: CanvasDevice[],
  connections: CanvasConnection[],
  deviceStates?: Map<string, SwitchState>
): AssertionResult[] {
  return rules.map(rule => evaluateNetworkAssertion(rule, devices, connections, deviceStates));
}
