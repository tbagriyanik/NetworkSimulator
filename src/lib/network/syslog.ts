import { SwitchState } from './types';

export interface SyslogMessage {
  id: string;
  timestamp: number;
  sourceIp: string;
  sourceName: string;
  facility: string;  // e.g., 'SYS', 'LINK', 'LINEPROTO', 'OSPF'
  severity: number;  // 0-7
  severityName: string; // 'emergency' to 'debugging'
  mnemonic: string;  // e.g., 'CONFIG_I', 'UPDOWN'
  message: string;
}

export const SYSLOG_SEVERITIES: Record<number, string> = {
  0: 'emergency',
  1: 'alert',
  2: 'critical',
  3: 'error',
  4: 'warning',
  5: 'notification',
  6: 'informational',
  7: 'debugging'
};

export const SYSLOG_SEVERITY_LEVELS: Record<string, number> = {
  'emergencies': 0,
  'emergency': 0,
  'alerts': 1,
  'alert': 1,
  'critical': 2,
  'errors': 3,
  'error': 3,
  'warnings': 4,
  'warning': 4,
  'notifications': 5,
  'notification': 5,
  'informational': 6,
  'debugging': 7
};

export function generateSyslogMessage(
  sourceDevice: SwitchState,
  facility: string,
  severity: number,
  mnemonic: string,
  message: string
): SyslogMessage {
  return {
    id: Math.random().toString(36).substring(2, 11),
    timestamp: Date.now(),
    sourceIp: sourceDevice.ip || '0.0.0.0',
    sourceName: sourceDevice.hostname,
    facility,
    severity,
    severityName: SYSLOG_SEVERITIES[severity] || 'unknown',
    mnemonic,
    message
  };
}

export function shouldLogMessage(severity: number, trapLevelStr: string | undefined): boolean {
  if (!trapLevelStr) {
    // Default trap level is often informational (6)
    return severity <= 6;
  }
  
  const trapLevelStrLower = trapLevelStr.toLowerCase();
  
  // If trapLevel is provided as a number string
  if (!isNaN(Number(trapLevelStrLower))) {
    const level = Number(trapLevelStrLower);
    return severity <= level;
  }
  
  // If provided as string name
  const level = SYSLOG_SEVERITY_LEVELS[trapLevelStrLower];
  if (level !== undefined) {
    return severity <= level;
  }
  
  return severity <= 6; // Default fallback
}
