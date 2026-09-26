import { cliModeError } from '../cliErrors';
import type { CommandContext } from '../commandTypes';
import type { SwitchState, CommandResult, Port } from '../../types';
import { isInInterfaceMode, applyToSelectedPorts } from './helpers';
import { getOrCreateSpanSession, setSpanSourceInterface, setSpanDestinationInterface, setSpanRemoteVlan } from '../../portMirroring';

/**
 * No CDP Enable - Disable CDP on interface
 */
export function cmdNoCdpEnable(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: '% No interface selected' };
  }

  const newPorts = applyToSelectedPorts(state, (port: Port) => ({
    ...port,
    cdpEnabled: false
  }));

  return { success: true, newState: { ports: newPorts } };
}

/**
 * No UDLD - Remove UDLD
 */
export function cmdNoUdld(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: '% No interface selected' };
  }

  const newPorts = applyToSelectedPorts(state, (port: Port) => ({
    ...port,
    udldEnabled: false
  }));

  return { success: true, newState: { ports: newPorts } };
}

/**
 * No Keepalive
 */
export function cmdNoKeepalive(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: '% No interface selected' };
  }

  const newPorts = applyToSelectedPorts(state, (port: Port) => ({
    ...port,
    keepalive: false
  }));

  return { success: true, newState: { ports: newPorts } };
}

/**
 * No Spanning-Tree - Disable spanning-tree on interface
 */
export function cmdNoSpanningTree(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: '% No interface selected' };
  }

  const newPorts = applyToSelectedPorts(state, (port: Port) => ({
    ...port,
    spanningTreeEnabled: false
  }));

  return { success: true, newState: { ports: newPorts } };
}

/**
 * Debug - Enable debug
 */
export function cmdDebug(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'privileged') {
    return { success: false, error: cliModeError() };
  }

  const match = input.match(/^debug\s+(.+)$/i);
  if (!match) {
    return { success: false, error: '% Incomplete command. Must specify debug type (e.g., debug ip packet)' };
  }

  return { success: true, output: `Debug ${match[1]} enabled` };
}

/**
 * No Debug - Disable debug
 */
export function cmdNoDebug(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'privileged' && state.currentMode !== 'config') {
    return { success: false, error: cliModeError() };
  }

  const match = input.match(/^no\s+debug(?:\s+(.+))?$/i);
  if (!match) {
    return { success: false, error: '% Invalid debug command' };
  }

  const debugType = match[1];
  if (debugType) {
    return { success: true, output: `Debug ${debugType} disabled` };
  } else {
    return { success: true, output: 'All debug output disabled' };
  }
}

/**
 * Monitor Session - Configure port monitoring
 */
export function cmdMonitorSession(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: cliModeError() };
  }

  const match = input.match(/^monitor\s+session\s+(\d+)\s+(source|destination)\s+(interface\s+(\S+)|remote\s+vlan\s+(\d+))/i);
  if (!match) {
    return { success: false, error: '% Usage: monitor session <id> {source | destination} {interface <if> | remote vlan <vlan>}' };
  }

  const sessionId = parseInt(match[1], 10);
  const type = match[2].toLowerCase() as 'source' | 'destination';
  const interfaceId = match[4];
  const remoteVlanStr = match[5];

  getOrCreateSpanSession(state, sessionId);

  if (interfaceId) {
    if (type === 'source') {
      setSpanSourceInterface(state, sessionId, interfaceId);
    } else {
      setSpanDestinationInterface(state, sessionId, interfaceId);
    }
    return { success: true, output: `Monitor session ${sessionId} ${type} interface ${interfaceId} configured`, newState: { spanSessions: state.spanSessions } };
  } else if (remoteVlanStr) {
    const vlanId = parseInt(remoteVlanStr, 10);
    setSpanRemoteVlan(state, sessionId, vlanId, type === 'destination');
    return { success: true, output: `RSPAN Monitor session ${sessionId} ${type} remote vlan ${vlanId} configured`, newState: { spanSessions: state.spanSessions } };
  }

  return { success: true, output: `Monitor session ${sessionId} configured` };
}

/**
 * No Monitor Session - Remove port monitoring
 */
export function cmdNoMonitorSession(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: cliModeError() };
  }

  const match = input.match(/^no\s+monitor\s+session\s+(\d+)$/i);
  if (!match) {
    return { success: false, error: '% Usage: no monitor session <1-8>' };
  }

  const sessionId = parseInt(match[1], 10);
  if (state.spanSessions) {
    delete state.spanSessions[sessionId];
  }

  return { success: true, output: `Monitor session ${sessionId} removed`, newState: { spanSessions: state.spanSessions } };
}

/**
 * Access-List - Configure ACL
 */
export function cmdAccessList(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: cliModeError() };
  }

  const match = input.match(/^access-list\s+(\d+)\s+(?:(\d+)\s+)?(permit|deny)\s+(.+)$/i);
  if (!match) {
    return { success: false, error: '% Invalid access-list command' };
  }

  const aclId = match[1];
  const seqNum = match[2] ? parseInt(match[2], 10) : undefined;
  const action = match[3];
  const ruleBody = match[4].trim();
  if (/\*/.test(ruleBody)) {
    return { success: false, error: "% Invalid input detected at '^' marker." };
  }
  const protocolMatch = ruleBody.match(/^(ip|tcp|udp|icmp)\b/i);
  if (protocolMatch) {
    const protocol = protocolMatch[1].toLowerCase();
    if (protocol === 'icmp' && /\beq\s+\d+\b/i.test(ruleBody)) {
      return { success: false, error: "% Invalid input detected at '^' marker." };
    }
  }

  const accessLists = { ...state.accessLists };
  const existingRules = accessLists[aclId] || [];

  let effectiveSeq: number;
  if (seqNum) {
    effectiveSeq = seqNum;
  } else {
    const maxSeq = existingRules.reduce((max: number, r: string) => {
      const s = parseInt(r, 10);
      return !isNaN(s) && s > max ? s : max;
    }, 0);
    effectiveSeq = maxSeq === 0 ? 10 : maxSeq + 10;
  }

  const newRule = `${effectiveSeq} ${action} ${ruleBody}`;
  const newRules = [...existingRules];

  const insertIndex = newRules.findIndex((r: string) => {
    const s = parseInt(r, 10);
    return !isNaN(s) && s > effectiveSeq;
  });
  if (insertIndex >= 0) {
    newRules.splice(insertIndex, 0, newRule);
  } else {
    newRules.push(newRule);
  }

  accessLists[aclId] = newRules;

  return {
    success: true,
    output: `Access-list ${aclId} rule added (sequence ${effectiveSeq})`,
    newState: { accessLists }
  };
}

/**
 * No Access-List - Remove ACL or single rule by sequence number
 */
export function cmdNoAccessList(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: cliModeError() };
  }

  const match = input.match(/^no\s+access-list\s+(\d+)(?:\s+(\d+))?$/i);
  if (!match) {
    return { success: false, error: '% Invalid access-list command' };
  }

  const aclId = match[1];
  const seqToRemove = match[2];

  const accessLists = { ...state.accessLists };

  if (seqToRemove) {
    if (!accessLists[aclId]) {
      return { success: false, error: `% Access-list ${aclId} not found` };
    }
    const ruleExists = accessLists[aclId].some((r: string) => r.startsWith(seqToRemove + ' '));
    if (!ruleExists) {
      return { success: false, error: `% Rule with sequence ${seqToRemove} not found in access-list ${aclId}` };
    }
    accessLists[aclId] = accessLists[aclId].filter((r: string) => !r.startsWith(seqToRemove + ' '));
    if (accessLists[aclId].length === 0) {
      delete accessLists[aclId];
    }
    return {
      success: true,
      output: `Access-list ${aclId} rule ${seqToRemove} removed`,
      newState: { accessLists }
    };
  } else {
    delete accessLists[aclId];
    return {
      success: true,
      output: `Access-list ${aclId} removed`,
      newState: { accessLists }
    };
  }
}

/**
 * CDP Enable
 */
export function cmdCdpEnable(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) {
    return { success: false, error: cliModeError() };
  }

  if (state.cdpEnabled === false) {
    return { success: false, error: '% CDP is not enabled globally. Use "cdp run" first.' };
  }

  const updatePort = (port: Port) => ({ ...port, cdpEnabled: true });

  if (state.selectedInterfaces?.length) {
    return { success: true, newState: { ports: applyToSelectedPorts(state, updatePort) } };
  }

  if (!state.currentInterface) return { success: false, error: '% No interface selected' };

  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: 'CDP enabled on interface', newState: { ports: newPorts } };
}

export function cmdLldpTransmit(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  const updatePort = (port: Port) => ({ ...port, lldpTransmit: true });
  if (state.selectedInterfaces?.length) return { success: true, newState: { ports: applyToSelectedPorts(state, updatePort) } };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, newState: { ports: newPorts } };
}

export function cmdNoLldpTransmit(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  const updatePort = (port: Port) => ({ ...port, lldpTransmit: false });
  if (state.selectedInterfaces?.length) return { success: true, newState: { ports: applyToSelectedPorts(state, updatePort) } };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, newState: { ports: newPorts } };
}

export function cmdLldpReceive(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  const updatePort = (port: Port) => ({ ...port, lldpReceive: true });
  if (state.selectedInterfaces?.length) return { success: true, newState: { ports: applyToSelectedPorts(state, updatePort) } };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, newState: { ports: newPorts } };
}

export function cmdNoLldpReceive(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  const updatePort = (port: Port) => ({ ...port, lldpReceive: false });
  if (state.selectedInterfaces?.length) return { success: true, newState: { ports: applyToSelectedPorts(state, updatePort) } };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, newState: { ports: newPorts } };
}

/**
 * Storm Control
 */
export function cmdStormControl(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  const match = input.match(/^storm-control\s+(broadcast|multicast|unicast)\s+level\s+([\d.]+)(?:\s+([\d.]+))?$/i);
  if (!match) return { success: false, error: '% Invalid storm-control command. Use: storm-control {broadcast|multicast|unicast} level <rising> [falling]' };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  const currentPort = newPorts[state.currentInterface] || ({} as Port);
  const typeKey = match[1].toLowerCase() as 'broadcast' | 'multicast' | 'unicast';
  const threshold = parseFloat(match[2]);
  newPorts[state.currentInterface] = {
    ...currentPort,
    stormControl: {
      ...currentPort.stormControl,
      [typeKey]: {
        enabled: true,
        threshold: isNaN(threshold) ? undefined : threshold,
      },
    },
  } as Port;
  return { success: true, output: `Storm-control ${match[1]} level ${match[2]} configured`, newState: { ports: newPorts } };
}

/**
 * Storm-Control Action
 */
export function cmdStormControlAction(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  const match = input.match(/^storm-control\s+action\s+(shutdown|trap)$/i);
  if (!match) return { success: false, error: '% Invalid storm-control action command' };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = { ...(newPorts[state.currentInterface] || {} as Port), stormControlAction: match[1] } as Port;
  return { success: true, output: `Storm-control action ${match[1]} configured`, newState: { ports: newPorts } };
}

/**
 * MLS QoS Trust
 */
export function cmdMlsQosTrust(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  const match = input.match(/^mls\s+qos\s+trust\s+(cos|dscp|ip-precedence)$/i);
  if (!match) return { success: false, error: '% Invalid mls qos trust command' };
  const trustVal = match[1] as 'cos' | 'dscp' | 'ip-precedence';
  const updatePort = (port: Port) => ({ ...port, qosTrust: trustVal });
  if (state.selectedInterfaces?.length) return { success: true, newState: { ports: applyToSelectedPorts(state, updatePort) } };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: `QoS trust ${match[1]} configured`, newState: { ports: newPorts } };
}

/**
 * MLS QoS CoS
 */
export function cmdMlsQosCos(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  const match = input.match(/^mls\s+qos\s+cos\s+(\d)$/i);
  if (!match) return { success: false, error: '% Invalid mls qos cos command' };
  const updatePort = (port: Port) => ({ ...port, qosCos: parseInt(match[1]) });
  if (state.selectedInterfaces?.length) return { success: true, newState: { ports: applyToSelectedPorts(state, updatePort) } };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: `QoS CoS ${match[1]} configured`, newState: { ports: newPorts } };
}

export function cmdQosSetDscp(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: cliModeError() };
  const match = input.match(/^set\s+dscp\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Invalid DSCP value' };
  const port = state.ports[state.currentInterface];
  return { success: true, output: `DSCP marked ${match[1]}`, newState: { ports: { ...state.ports, [state.currentInterface]: { ...port, qosDscp: match[1], qos: { ...port?.qos, enabled: true } } } } };
}

export function cmdIpDhcpSnoopingLimitRate(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  const isNo = input.trim().toLowerCase().startsWith('no ');
  const match = input.match(/^(?:no\s+)?ip\s+dhcp\s+snooping\s+limit\s+rate(?:\s+(\d+))?$/i);
  const rate = isNo ? undefined : (match && match[1] ? parseInt(match[1], 10) : 15);
  const updatePort = (port: Port) => ({ ...port, dhcpSnoopingLimitRate: rate });
  if (state.selectedInterfaces?.length) return { success: true, newState: { ports: applyToSelectedPorts(state, updatePort) } };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, newState: { ports: newPorts } };
}

export function cmdBandwidth(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  const match = input.match(/^bandwidth\s+(\d+)$/i);
  if (!match) return { success: false, error: '% Invalid bandwidth command' };
  const updatePort = (port: Port) => ({ ...port, bandwidth: parseInt(match[1]) });
  if (state.selectedInterfaces?.length) return { success: true, newState: { ports: applyToSelectedPorts(state, updatePort) } };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: `Bandwidth set to ${match[1]} kbps`, newState: { ports: newPorts } };
}

export function cmdDelay(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  const match = input.match(/^delay\s+(\d+)$/i);
  if (!match) return { success: false, error: '% Invalid delay command' };
  const delayValue = parseInt(match[1]);
  const updatePort = (port: Port) => ({ ...port, delay: delayValue });
  if (state.selectedInterfaces?.length) return { success: true, newState: { ports: applyToSelectedPorts(state, updatePort) } };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: `Delay set to ${delayValue} microseconds`, newState: { ports: newPorts } };
}

export function cmdMtu(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  const match = input.match(/^mtu\s+(\d+)$/i);
  if (!match) return { success: false, error: '% Invalid MTU command' };
  const mtuValue = parseInt(match[1]);
  if (mtuValue < 68 || mtuValue > 65535) {
    return { success: false, error: '% MTU must be between 68 and 65535' };
  }
  const updatePort = (port: Port) => ({ ...port, mtu: mtuValue });
  if (state.selectedInterfaces?.length) return { success: true, newState: { ports: applyToSelectedPorts(state, updatePort) } };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: `MTU set to ${mtuValue} bytes`, newState: { ports: newPorts } };
}

export function cmdNoMtu(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  // default interface MTU is 1500 bytes; 'no mtu' restores it.
  const updatePort = (port: Port) => ({ ...port, mtu: 1500 });
  if (state.selectedInterfaces?.length) return { success: true, newState: { ports: applyToSelectedPorts(state, updatePort) } };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: 'MTU restored to default 1500 bytes', newState: { ports: newPorts } };
}

export function cmdKeepalive(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  const match = input.match(/^keepalive(?:\s+(\d+))?$/i);
  const interval = match?.[1] ? parseInt(match[1]) : 10;
  const updatePort = (port: Port) => ({ ...port, keepalive: interval });
  if (state.selectedInterfaces?.length) return { success: true, newState: { ports: applyToSelectedPorts(state, updatePort) } };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: `Keepalive set to ${interval} seconds`, newState: { ports: newPorts } };
}

export function cmdIpProxyArp(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  const updatePort = (port: Port) => ({ ...port, proxyArp: true });
  if (state.selectedInterfaces?.length) return { success: true, newState: { ports: applyToSelectedPorts(state, updatePort) } };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: 'Proxy ARP enabled', newState: { ports: newPorts } };
}

export function cmdIpVerifySource(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  const hasPortSecurity = input.includes('port-security');
  const updatePort = (port: Port) => ({
    ...port,
    ipVerifySource: true,
    ipVerifySourcePortSecurity: hasPortSecurity || port.ipVerifySourcePortSecurity
  });
  if (state.selectedInterfaces?.length) return { success: true, newState: { ports: applyToSelectedPorts(state, updatePort) } };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: 'IP verify source configured', newState: { ports: newPorts } };
}

export function cmdUdldEnable(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  const updatePort = (port: Port) => ({ ...port, udld: { enabled: true, ...(port.udld ? { mode: port.udld.mode } : {}) } });
  if (state.selectedInterfaces?.length) return { success: true, newState: { ports: applyToSelectedPorts(state, updatePort) } };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: 'UDLD enabled', newState: { ports: newPorts } };
}

export function cmdChannelProtocol(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  const match = input.match(/^channel-protocol\s+(lacp|pagp)$/i);
  if (!match) return { success: false, error: '% Invalid channel-protocol command' };
  const protocol = match[1].toLowerCase() as 'lacp' | 'pagp';
  const updatePort = (port: Port) => ({ ...port, channelProtocol: protocol });
  const ports = state.selectedInterfaces?.length
    ? applyToSelectedPorts(state, updatePort)
    : state.currentInterface
      ? { ...state.ports, [state.currentInterface]: updatePort(state.ports[state.currentInterface] || {} as Port) }
      : null;
  if (!ports) return { success: false, error: '% No interface selected' };
  return { success: true, output: `Channel protocol set to ${protocol.toUpperCase()}`, newState: { ports } };
}

export function cmdDirectedBroadcast(state: SwitchState, _input: string, enabled: boolean): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  const updatePort = (port: Port) => ({ ...port, directedBroadcast: enabled });
  const ports = state.selectedInterfaces?.length
    ? applyToSelectedPorts(state, updatePort)
    : state.currentInterface
      ? { ...state.ports, [state.currentInterface]: updatePort(state.ports[state.currentInterface] || {} as Port) }
      : null;
  if (!ports) return { success: false, error: '% No interface selected' };
  return { success: true, output: `IP directed-broadcast ${enabled ? 'enabled' : 'disabled'}`, newState: { ports } };
}

export function cmdCarrierDelay(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  const match = input.match(/^carrier-delay\s+(\d+)$/i);
  if (!match) return { success: false, error: '% Invalid carrier-delay command' };
  const delay = Number(match[1]);
  const updatePort = (port: Port) => ({ ...port, carrierDelay: delay });
  const ports = state.selectedInterfaces?.length ? applyToSelectedPorts(state, updatePort) : state.currentInterface ? { ...state.ports, [state.currentInterface]: updatePort(state.ports[state.currentInterface] || {} as Port) } : null;
  if (!ports) return { success: false, error: '% No interface selected' };
  return { success: true, newState: { ports } };
}

export function cmdLoadInterval(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  const match = input.match(/^load-interval\s+(\d+)$/i);
  if (!match) return { success: false, error: '% Invalid load-interval command' };
  const interval = Number(match[1]);
  if (interval < 30 || interval > 600) return { success: false, error: '% Load interval must be between 30 and 600 seconds' };
  const updatePort = (port: Port) => ({ ...port, loadInterval: interval });
  const ports = state.selectedInterfaces?.length ? applyToSelectedPorts(state, updatePort) : state.currentInterface ? { ...state.ports, [state.currentInterface]: updatePort(state.ports[state.currentInterface] || {} as Port) } : null;
  if (!ports) return { success: false, error: '% No interface selected' };
  return { success: true, newState: { ports } };
}

export function cmdArpInspectionLimit(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  const match = input.match(/^ip\s+arp\s+inspection\s+limit\s+(\d+)$/i);
  if (!match || Number(match[1]) < 1) return { success: false, error: '% Invalid ARP inspection rate' };
  const updatePort = (port: Port) => ({ ...port, arpInspectionLimitRate: Number(match[1]) });
  const ports = state.selectedInterfaces?.length ? applyToSelectedPorts(state, updatePort) : state.currentInterface ? { ...state.ports, [state.currentInterface]: updatePort(state.ports[state.currentInterface] || {} as Port) } : null;
  if (!ports) return { success: false, error: '% No interface selected' };
  return { success: true, output: `ARP inspection limit set to ${match[1]} pps`, newState: { ports } };
}

export function cmdPriorityQueueOut(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !/^priority-queue\s+out$/i.test(input)) return { success: false, error: '% Invalid priority-queue command' };
  const updatePort = (port: Port) => ({ ...port, qos: { ...port.qos, enabled: true, priorityQueue: { ...port.qos?.priorityQueue, enabled: true } } });
  const ports = state.selectedInterfaces?.length ? applyToSelectedPorts(state, updatePort) : state.currentInterface ? { ...state.ports, [state.currentInterface]: updatePort(state.ports[state.currentInterface] || {} as Port) } : null;
  if (!ports) return { success: false, error: '% No interface selected' };
  return { success: true, output: 'Priority output queue enabled', newState: { ports } };
}

export function cmdQueueSet(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  const match = input.match(/^queue-set\s+(\d+)$/i);
  if (!match) return { success: false, error: '% Invalid queue-set command' };
  const updatePort = (port: Port) => ({ ...port, qos: { ...port.qos, enabled: true, egressQueue: Number(match[1]) } });
  const ports = state.selectedInterfaces?.length ? applyToSelectedPorts(state, updatePort) : state.currentInterface ? { ...state.ports, [state.currentInterface]: updatePort(state.ports[state.currentInterface] || {} as Port) } : null;
  if (!ports) return { success: false, error: '% No interface selected' };
  return { success: true, output: `Queue set ${match[1]} configured`, newState: { ports } };
}

export function cmdTxQueue(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  const match = input.match(/^tx-queue\s+(\d+)$/i);
  if (!match) return { success: false, error: '% Invalid tx-queue command' };
  const updatePort = (port: Port) => ({ ...port, qos: { ...port.qos, enabled: true, ingressQueue: Number(match[1]) } });
  const ports = state.selectedInterfaces?.length ? applyToSelectedPorts(state, updatePort) : state.currentInterface ? { ...state.ports, [state.currentInterface]: updatePort(state.ports[state.currentInterface] || {} as Port) } : null;
  if (!ports) return { success: false, error: '% No interface selected' };
  return { success: true, output: `Transmit queue ${match[1]} configured`, newState: { ports } };
}

export function cmdPowerInline(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  const match = input.match(/^power\s+inline$/i);
  if (!match) return { success: false, error: '% Invalid power inline command' };
  const updatePort = (port: Port) => ({ ...port, powerInline: { ...port.powerInline, enabled: true } });
  const ports = state.selectedInterfaces?.length ? applyToSelectedPorts(state, updatePort) : state.currentInterface ? { ...state.ports, [state.currentInterface]: updatePort(state.ports[state.currentInterface] || {} as Port) } : null;
  if (!ports) return { success: false, error: '% No interface selected' };
  return { success: true, output: 'Power inline enabled', newState: { ports } };
}

export function cmdPowerInlineConsumption(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  const match = input.match(/^power\s+inline\s+consumption\s+(\d+)$/i);
  if (!match) return { success: false, error: '% Invalid power inline consumption command' };
  const consumption = Number(match[1]);
  const updatePort = (port: Port) => ({ ...port, powerInline: { enabled: true, consumption } });
  const ports = state.selectedInterfaces?.length ? applyToSelectedPorts(state, updatePort) : state.currentInterface ? { ...state.ports, [state.currentInterface]: updatePort(state.ports[state.currentInterface] || {} as Port) } : null;
  if (!ports) return { success: false, error: '% No interface selected' };
  return { success: true, newState: { ports } };
}
