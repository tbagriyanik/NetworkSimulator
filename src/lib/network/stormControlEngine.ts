export interface StormControlConfig {
  broadcastLevelPercent?: number; // 0 - 100%
  multicastLevelPercent?: number;
  action: 'DROP' | 'SHUTDOWN';
}

export interface StormEvaluationResult {
  stormDetected: boolean;
  droppedPackets: number;
  actionTaken: 'NONE' | 'DROPPED' | 'SHUTDOWN';
  simulatedCpuUsagePercent: number;
  reason?: string;
}

/**
 * L2 Broadcast/Multicast Storm Control & Fırtına Algılama Motoru
 */
export function evaluateStormControl(
  currentPps: number,
  maxCapacityPps: number,
  config?: StormControlConfig
): StormEvaluationResult {
  const currentRatioPercent = Math.min(100, (currentPps / Math.max(1, maxCapacityPps)) * 100);
  const thresholdPercent = config?.broadcastLevelPercent ?? 80;

  let simulatedCpu = Math.min(100, Math.round((currentPps / Math.max(1, maxCapacityPps)) * 90));

  if (currentRatioPercent <= thresholdPercent) {
    return {
      stormDetected: false,
      droppedPackets: 0,
      actionTaken: 'NONE',
      simulatedCpuUsagePercent: simulatedCpu
    };
  }

  // Fırtına eşiği aşıldı
  const allowedPps = (thresholdPercent / 100) * maxCapacityPps;
  const excessPps = Math.max(0, currentPps - allowedPps);

  if (config?.action === 'SHUTDOWN') {
    return {
      stormDetected: true,
      droppedPackets: currentPps,
      actionTaken: 'SHUTDOWN',
      simulatedCpuUsagePercent: 100,
      reason: `Broadcast storm exceeded threshold (${currentRatioPercent.toFixed(1)}% > ${thresholdPercent}%). Port errdisabled.`
    };
  }

  // Varsayılan aksiyon: DROP (Fazla trafiği düşür, CPU tavan yapmasını engelle)
  simulatedCpu = Math.min(60, simulatedCpu); // Storm control aktif olduğu için CPU korundu

  return {
    stormDetected: true,
    droppedPackets: Math.round(excessPps),
    actionTaken: 'DROPPED',
    simulatedCpuUsagePercent: simulatedCpu,
    reason: `Broadcast storm detected: Throttled ${Math.round(excessPps)} pps exceeding ${thresholdPercent}% limit.`
  };
}
