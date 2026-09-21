import { SwitchState } from './types';

export interface SnmpOidEntry {
  oid: string;
  name: string;
  type: 'STRING' | 'INTEGER' | 'TIMETICKS' | 'COUNTER32' | 'GAUGE32' | 'IPADDRESS';
  value: string | number;
}

export interface SnmpTrapEntry {
  timestamp: number;
  sourceIp: string;
  sourceName: string;
  trapType: string;
  oid: string;
  message: string;
}

export interface SnmpUser {
  username: string;
  authProtocol?: 'MD5' | 'SHA';
  authPassword?: string;
  privProtocol?: 'DES' | 'AES';
  privPassword?: string;
  securityLevel: 'noAuthNoPriv' | 'authNoPriv' | 'authPriv';
}

export interface SnmpPacket {
  version: '1' | '2c' | '3';
  pdu: 'GET' | 'GETNEXT' | 'WALK' | 'SET';
  community?: string;
  user?: string;
  authKey?: string;
  privKey?: string;
  securityLevel?: 'noAuthNoPriv' | 'authNoPriv' | 'authPriv';
  requestId: number;
  oids: string[];
  setValue?: string | number;
}

export interface SnmpResponsePacket {
  requestId: number;
  error: 'none' | 'authorizationError' | 'noSuchName' | 'authError' | 'privError';
  varBinds: SnmpOidEntry[];
}

/** Processes an SNMP packet against the live device state (v1, v2c, v3). */
export function processSnmpPacket(deviceId: string, packet: SnmpPacket, deviceStates: Map<string, SwitchState>): SnmpResponsePacket {
  const state = deviceStates.get(deviceId);
  if (!state) {
    return { requestId: packet.requestId, error: 'authorizationError', varBinds: [] };
  }

  // Handle SNMPv3
  if (packet.version === '3') {
    const snmpv3Users = (state as SwitchState & { snmpv3Users?: Record<string, SnmpUser> }).snmpv3Users;
    const user = packet.user ? snmpv3Users?.[packet.user] : undefined;

    if (!user) {
      return { requestId: packet.requestId, error: 'authError', varBinds: [] };
    }

    if (user.securityLevel === 'authNoPriv' || user.securityLevel === 'authPriv') {
      if (!packet.authKey || (user.authPassword && packet.authKey !== user.authPassword)) {
        return { requestId: packet.requestId, error: 'authError', varBinds: [] };
      }
    }

    if (user.securityLevel === 'authPriv') {
      if (!packet.privKey || (user.privPassword && packet.privKey !== user.privPassword)) {
        return { requestId: packet.requestId, error: 'privError', varBinds: [] };
      }
    }

    const varBinds = packet.pdu === 'GET'
      ? packet.oids.map(oid => snmpGet(deviceId, oid, '', deviceStates, true)).filter((entry): entry is SnmpOidEntry => !!entry)
      : packet.pdu === 'GETNEXT'
        ? packet.oids.map(oid => snmpGetNext(deviceId, oid, '', deviceStates, true)).filter((entry): entry is SnmpOidEntry => !!entry)
        : packet.oids.flatMap(oid => snmpWalk(deviceId, oid, '', deviceStates, true));

    return { requestId: packet.requestId, error: varBinds.length > 0 ? 'none' : 'noSuchName', varBinds };
  }

  // Handle SNMPv1 / SNMPv2c
  const community = packet.community || '';
  if (!state.snmpCommunities?.[community]) {
    return { requestId: packet.requestId, error: 'authorizationError', varBinds: [] };
  }
  const varBinds = packet.pdu === 'GET'
    ? packet.oids.map(oid => snmpGet(deviceId, oid, community, deviceStates)).filter((entry): entry is SnmpOidEntry => !!entry)
    : packet.pdu === 'GETNEXT'
      ? packet.oids.map(oid => snmpGetNext(deviceId, oid, community, deviceStates)).filter((entry): entry is SnmpOidEntry => !!entry)
      : packet.oids.flatMap(oid => snmpWalk(deviceId, oid, community, deviceStates));
  return { requestId: packet.requestId, error: varBinds.length > 0 ? 'none' : 'noSuchName', varBinds };
}

export function getDeviceSnmpOids(deviceId: string, deviceStates: Map<string, SwitchState>): SnmpOidEntry[] {
  const state = deviceStates.get(deviceId);
  if (!state) return [];

  const oids: SnmpOidEntry[] = [];

  // sysDescr
  oids.push({
    oid: '.1.3.6.1.2.1.1.1.0',
    name: 'sysDescr',
    type: 'STRING',
    value: `${state.version.modelName} Software, Version ${state.version.nosVersion}`
  });

  // sysUpTime
  const uptimeTicks = state.bootTime ? Math.floor((Date.now() - state.bootTime) / 10) : 0;

  oids.push({
    oid: '.1.3.6.1.2.1.1.3.0',
    name: 'sysUpTime',
    type: 'TIMETICKS',
    value: uptimeTicks
  });

  // sysContact
  oids.push({
    oid: '.1.3.6.1.2.1.1.4.0',
    name: 'sysContact',
    type: 'STRING',
    value: state.snmpContact || ''
  });

  // sysName
  oids.push({
    oid: '.1.3.6.1.2.1.1.5.0',
    name: 'sysName',
    type: 'STRING',
    value: state.hostname
  });

  // sysLocation
  oids.push({
    oid: '.1.3.6.1.2.1.1.6.0',
    name: 'sysLocation',
    type: 'STRING',
    value: state.snmpLocation || ''
  });

  // ifNumber
  const portKeys = Object.keys(state.ports);
  oids.push({
    oid: '.1.3.6.1.2.1.2.1.0',
    name: 'ifNumber',
    type: 'INTEGER',
    value: portKeys.length
  });

  // Interfaces
  portKeys.forEach((portId, index) => {
    const port = state.ports[portId];
    const ifIndex = index + 1;

    // ifIndex
    oids.push({
      oid: `.1.3.6.1.2.1.2.2.1.1.${ifIndex}`,
      name: `ifIndex.${ifIndex}`,
      type: 'INTEGER',
      value: ifIndex
    });

    // ifDescr
    oids.push({
      oid: `.1.3.6.1.2.1.2.2.1.2.${ifIndex}`,
      name: `ifDescr.${ifIndex}`,
      type: 'STRING',
      value: port.id
    });

    // ifOperStatus (1=up, 2=down)
    const statusVal = (port.operStatus === 'up' || port.status === 'connected') ? 1 : 2;
    oids.push({
      oid: `.1.3.6.1.2.1.2.2.1.8.${ifIndex}`,
      name: `ifOperStatus.${ifIndex}`,
      type: 'INTEGER',
      value: statusVal
    });
  });

  return oids;
}

export function snmpGet(deviceId: string, oid: string, community: string, deviceStates: Map<string, SwitchState>, bypassCommunityCheck = false): SnmpOidEntry | null {
  const state = deviceStates.get(deviceId);
  if (!state) return null;

  // Check community
  if (!bypassCommunityCheck && (!state.snmpCommunities || !state.snmpCommunities[community])) {
    return null; // Community not found or not allowed
  }

  const oids = getDeviceSnmpOids(deviceId, deviceStates);
  return oids.find(o => o.oid === oid) || null;
}

export function snmpGetNext(deviceId: string, oid: string, community: string, deviceStates: Map<string, SwitchState>, bypassCommunityCheck = false): SnmpOidEntry | null {
  const state = deviceStates.get(deviceId);
  if (!state) return null;

  if (!bypassCommunityCheck && (!state.snmpCommunities || !state.snmpCommunities[community])) {
    return null;
  }

  const oids = getDeviceSnmpOids(deviceId, deviceStates);
  // Sort OIDs lexicographically (standard SNMP behavior)
  oids.sort((a, b) => {
    const aParts = a.oid.split('.').map(Number).filter(n => !isNaN(n));
    const bParts = b.oid.split('.').map(Number).filter(n => !isNaN(n));
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aVal = aParts[i] || 0;
      const bVal = bParts[i] || 0;
      if (aVal !== bVal) {
        return aVal - bVal;
      }
    }
    return 0;
  });

  for (let i = 0; i < oids.length; i++) {
    // Compare oid, find the first one that is "greater" than requested
    if (compareOids(oids[i].oid, oid) > 0) {
      return oids[i];
    }
  }

  return null;
}

export function snmpWalk(deviceId: string, baseOid: string, community: string, deviceStates: Map<string, SwitchState>, bypassCommunityCheck = false): SnmpOidEntry[] {
  const state = deviceStates.get(deviceId);
  if (!state) return [];

  if (!bypassCommunityCheck && (!state.snmpCommunities || !state.snmpCommunities[community])) {
    return [];
  }

  const oids = getDeviceSnmpOids(deviceId, deviceStates);
  return oids.filter(o => o.oid.startsWith(baseOid) || o.oid === baseOid);
}

function compareOids(oidA: string, oidB: string): number {
  const aParts = oidA.split('.').map(Number).filter(n => !isNaN(n));
  const bParts = oidB.split('.').map(Number).filter(n => !isNaN(n));
  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const aVal = aParts[i] || 0;
    const bVal = bParts[i] || 0;
    if (aVal !== bVal) {
      return aVal - bVal;
    }
  }
  return 0;
}
