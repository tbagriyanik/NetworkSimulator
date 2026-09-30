import type { Port } from './types';

export interface StpGuardViolationResult {
  action: 'NONE' | 'ERRDISABLE' | 'BLOCK_ROOT' | 'BLOCK_LOOP';
  reason?: string;
}

export interface IncomingBpdu {
  rootBridgeId: string;
  rootPathCost: number;
  isSuperior: boolean;
}

/**
 * STP PortFast, BPDU Guard, BPDU Filter, Root Guard ve Loop Guard Motoru
 */
export function evaluateStpGuards(
  port: Port,
  incomingBpdu?: IncomingBpdu
): StpGuardViolationResult {
  if (port.shutdown) {
    return { action: 'NONE' };
  }

  // 1. BPDU Filter: BPDU paketlerini tamamen yutar veya göndermez/almaz
  if (port.bpduFilter) {
    return { action: 'NONE', reason: 'BPDU Filter enabled: Ignoring BPDU' };
  }

  // 2. BPDU Guard: PortFast etkin portta BPDU alındığında portu errdisable moduna alır
  if ((port.portfast || port.bpduGuard) && incomingBpdu) {
    return {
      action: 'ERRDISABLE',
      reason: `BPDU Guard violation on Port ${port.id}: Received BPDU on PortFast enabled port.`
    };
  }

  // 3. Root Guard: Üstün (superior) BPDU alındığında root bridge rolünün çalınmasını önler
  if (port.rootGuard && incomingBpdu && incomingBpdu.isSuperior) {
    return {
      action: 'BLOCK_ROOT',
      reason: `Root Guard violation on Port ${port.id}: Superior BPDU received, blocking interface (Root-Inconsistent).`
    };
  }

  // 4. Loop Guard: BPDU kaybı durumunda bloklanan portun yanlışlıkla forwarding durumuna geçmesini önler
  if (port.loopGuard && incomingBpdu === undefined) {
    return {
      action: 'BLOCK_LOOP',
      reason: `Loop Guard violation on Port ${port.id}: No BPDU received, blocking interface (Loop-Inconsistent).`
    };
  }

  return { action: 'NONE' };
}
