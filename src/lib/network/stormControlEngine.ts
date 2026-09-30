export interface StormControlConfig {
  broadcastLevelPercent?: number; // 0 - 100%
  multicastLevelPercent?: number; // 0 - 100%
  unicastLevelPercent?: number; // 0 - 100%
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
  config?: StormControlConfig,
  trafficType: 'broadcast' | 'multicast' | 'unicast' = 'broadcast'
): StormEvaluationResult {
  const currentRatioPercent = Math.min(100, (currentPps / Math.max(1, maxCapacityPps)) * 100);

  // Select appropriate threshold based on traffic type
  let thresholdPercent: number;
  switch (trafficType) {
    case 'multicast':
      thresholdPercent = config?.multicastLevelPercent ?? config?.broadcastLevelPercent ?? 80;
      break;
    case 'unicast':
      thresholdPercent = config?.unicastLevelPercent ?? config?.broadcastLevelPercent ?? 80;
      break;
    case 'broadcast':
    default:
      thresholdPercent = config?.broadcastLevelPercent ?? 80;
      break;
  }

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
      reason: `${trafficType.charAt(0).toUpperCase() + trafficType.slice(1)} storm exceeded threshold (${currentRatioPercent.toFixed(1)}% > ${thresholdPercent}%). Port errdisabled.`
    };
  }

  // Varsayılan aksiyon: DROP (Fazla trafiği düşür, CPU tavan yapmasını engelle)
  simulatedCpu = Math.min(60, simulatedCpu); // Storm control aktif olduğu için CPU korundu

  return {
    stormDetected: true,
    droppedPackets: Math.round(excessPps),
    actionTaken: 'DROPPED',
    simulatedCpuUsagePercent: simulatedCpu,
    reason: `${trafficType.charAt(0).toUpperCase() + trafficType.slice(1)} storm detected: Throttled ${Math.round(excessPps)} pps exceeding ${thresholdPercent}% limit.`
  };
}
