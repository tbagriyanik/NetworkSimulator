import type { SwitchState } from './types';
import { generateSyslogMessage, type SyslogMessage } from './syslog';
import type { SnmpTrapEntry } from './snmp';

export interface MonitoringEventResult {
  updatedState: SwitchState;
  generatedSyslogs: SyslogMessage[];
  generatedTraps: SnmpTrapEntry[];
}

/**
 * Automatically detects device state changes between prevState and nextState,
 * and emits corresponding Syslog messages and SNMP traps correlated to state transitions.
 */
export function monitorDeviceStateChanges(
  prevState: SwitchState,
  nextState: SwitchState,
  nowMs: number = Date.now()
): MonitoringEventResult {
  let updated = { ...nextState };
  const generatedSyslogs: SyslogMessage[] = [];
  const generatedTraps: SnmpTrapEntry[] = [];

  const syslogLogs: (string | SyslogMessage)[] = [...((updated as SwitchState & { syslogLogs?: (string | SyslogMessage)[] }).syslogLogs || [])];
  const eventLogs = [...((updated as SwitchState & { eventLogs?: unknown[] }).eventLogs || [])];
  const snmpTraps = [...((updated as SwitchState & { snmpTraps?: SnmpTrapEntry[] }).snmpTraps || [])];

  // 1. Interface / Link Status Changes
  const prevPorts = prevState.ports || {};
  const nextPorts = nextState.ports || {};

  for (const [portId, nextPort] of Object.entries(nextPorts)) {
    const prevPort = prevPorts[portId];
    if (!prevPort) continue;

    const prevDown = prevPort.shutdown || prevPort.status === 'disabled' || prevPort.status === 'blocked';
    const nextDown = nextPort.shutdown || nextPort.status === 'disabled' || nextPort.status === 'blocked';

    if (!prevDown && nextDown) {
      // Interface Link DOWN Event
      const sysMsg = generateSyslogMessage(
        updated,
        'LINK',
        3,
        'UPDOWN',
        `Interface ${nextPort.name || portId}, changed state to down`
      );
      generatedSyslogs.push(sysMsg);
      syslogLogs.push(sysMsg);
      eventLogs.push(`%LINK-3-UPDOWN: Interface ${nextPort.name || portId}, changed state to down`);

      const trap: SnmpTrapEntry = {
        timestamp: nowMs,
        sourceIp: updated.ip || '0.0.0.0',
        sourceName: updated.hostname,
        trapType: 'linkDown',
        oid: '.1.3.6.1.6.3.1.1.5.3',
        message: `Interface ${portId} changed operational status to DOWN`,
      };
      generatedTraps.push(trap);
      snmpTraps.push(trap);
    } else if (prevDown && !nextDown) {
      // Interface Link UP Event
      const sysMsg = generateSyslogMessage(
        updated,
        'LINK',
        5,
        'UPDOWN',
        `Interface ${nextPort.name || portId}, changed state to up`
      );
      generatedSyslogs.push(sysMsg);
      syslogLogs.push(sysMsg);
      eventLogs.push(`%LINK-5-UPDOWN: Interface ${nextPort.name || portId}, changed state to up`);

      const trap: SnmpTrapEntry = {
        timestamp: nowMs,
        sourceIp: updated.ip || '0.0.0.0',
        sourceName: updated.hostname,
        trapType: 'linkUp',
        oid: '.1.3.6.1.6.3.1.1.5.4',
        message: `Interface ${portId} changed operational status to UP`,
      };
      generatedTraps.push(trap);
      snmpTraps.push(trap);
    }
  }

  // 2. Configuration Changes
  const prevConfigLen = prevState.runningConfig?.length || 0;
  const nextConfigLen = nextState.runningConfig?.length || 0;

  if (prevState.hostname !== nextState.hostname || nextConfigLen !== prevConfigLen) {
    const sysMsg = generateSyslogMessage(
      updated,
      'SYS',
      5,
      'CONFIG_I',
      `Configured from console or NETCONF by administrator`
    );
    generatedSyslogs.push(sysMsg);
    syslogLogs.push(sysMsg);

    const trap: SnmpTrapEntry = {
      timestamp: nowMs,
      sourceIp: updated.ip || '0.0.0.0',
      sourceName: updated.hostname,
      trapType: 'configChange',
      oid: '.1.3.6.1.4.1.9.9.43.2.0.1',
      message: `Running configuration updated on ${updated.hostname}`,
    };
    generatedTraps.push(trap);
    snmpTraps.push(trap);
  }

  // 3. Routing Protocol Neighbor Transitions (OSPF)
  const prevOspf = prevState.ospfNeighbors || [];
  const nextOspf = nextState.ospfNeighbors || [];

  if (prevOspf.length !== nextOspf.length) {
    const diffNbr = nextOspf.length > prevOspf.length
      ? nextOspf.find(n => !prevOspf.includes(n))
      : prevOspf.find(n => !nextOspf.includes(n));

    if (diffNbr) {
      const isUp = nextOspf.includes(diffNbr);
      const sysMsg = generateSyslogMessage(
        updated,
        'OSPF',
        5,
        'ADJCHG',
        `Process 1, Nbr ${diffNbr} on interface from ${isUp ? 'LOADING' : 'FULL'} to ${isUp ? 'FULL' : 'DOWN'}`
      );
      generatedSyslogs.push(sysMsg);
      syslogLogs.push(sysMsg);

      const trap: SnmpTrapEntry = {
        timestamp: nowMs,
        sourceIp: updated.ip || '0.0.0.0',
        sourceName: updated.hostname,
        trapType: 'ospfNbrStateChange',
        oid: '.1.3.6.1.2.1.14.16.2.2',
        message: `OSPF neighbor ${diffNbr} state changed to ${isUp ? 'FULL' : 'DOWN'}`,
      };
      generatedTraps.push(trap);
      snmpTraps.push(trap);
    }
  }

  updated = {
    ...updated,
    syslogLogs,
    eventLogs,
    snmpTraps,
  } as SwitchState;

  return {
    updatedState: updated,
    generatedSyslogs,
    generatedTraps,
  };
}
