import type { CommandContext } from '../commandTypes';
import type { SwitchState, CommandResult } from '../../types';
import { getSwitchDisplayProfile } from '../showHelpers';

export function cmdShowHistory(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  const history = state.commandHistory || [];
  let output = '\n';
  history.slice(-20).forEach((cmd: string) => { output += `  ${cmd}\n`; });
  return { success: true, output };
}

export function cmdShowUsers(_state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  let output = '\n    Line       User       Host(s)              Idle       Location\n';
  output += '*   0 con 0                idle                 00:00:00\n';
  return { success: true, output };
}

export function cmdShowEnvironment(_state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  let output = '\nClass item         Value                   Status\n';
  output += '------------------------------------------------------\n';
  output += 'Power Supply 1     AC (OK)                 Normal\n';
  output += 'Power Supply 2     AC (OK)                 Normal\n';
  output += 'Fan 1              System Fan 1 (OK)       Normal\n';
  output += 'Fan 2              System Fan 2 (OK)       Normal\n';
  output += 'Temperature 1      Chassis Temp (34 C)     Normal\n';
  output += 'Temperature 2      CPU Temp (42 C)         Normal\n';
  output += 'Voltage 1          +12V Rail (12.02 V)    Normal\n';
  output += 'Voltage 2          +5V Rail (5.01 V)      Normal\n';
  output += 'Voltage 3          +3.3V Rail (3.30 V)    Normal\n';
  return { success: true, output };
}

export function cmdShowInventory(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  const profile = getSwitchDisplayProfile(state);
  return { success: true, output: `\nNAME: "1", DESCR: "${profile.switchModel}"\nPID: ${profile.switchModel}  , VID: V01, SN: ${state.version?.serialNumber || 'FOC0000X000'}\n` };
}

export function cmdShowErrdisableRecovery(_state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  return { success: true, output: '\nErrDisable Reason            Timer Status\n-----------------            --------------\nbpduguard                    Disabled\npsecure-violation            Disabled\nport-security                Disabled\n\nTimer interval: 300 seconds\n' };
}

export function cmdShowStormControl(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  const match = input.match(/show\s+storm-control\s+(?:interface\s+)?(\S+)?/i);
  const interfaceName = match?.[1];

  if (interfaceName) {
    const port = (state.ports || {})[interfaceName.toLowerCase()];
    if (!port) {
      return { success: false, error: `% Interface ${interfaceName} not found` };
    }

    let output = `\nStorm Control for interface ${interfaceName}\n`;
    const sc = port.stormControl;

    if (!sc || (!sc.broadcast?.enabled && !sc.multicast?.enabled && !sc.unicast?.enabled)) {
      output += '  Storm control is not enabled on this interface\n';
    } else {
      if (sc.broadcast?.enabled) {
        output += `  Broadcast:\n`;
        output += `    Status: enabled\n`;
        output += `    Threshold: ${sc.broadcast.threshold || 'unlimited'}\n`;
        output += `    Action: ${sc.broadcast.action || 'shutdown'}\n`;
      }
      if (sc.multicast?.enabled) {
        output += `  Multicast:\n`;
        output += `    Status: enabled\n`;
        output += `    Threshold: ${sc.multicast.threshold || 'unlimited'}\n`;
        output += `    Action: ${sc.multicast.action || 'shutdown'}\n`;
      }
      if (sc.unicast?.enabled) {
        output += `  Unicast:\n`;
        output += `    Status: enabled\n`;
        output += `    Threshold: ${sc.unicast.threshold || 'unlimited'}\n`;
        output += `    Action: ${sc.unicast.action || 'shutdown'}\n`;
      }
    }
    output += '!\n';
    return { success: true, output };
  }

  // Global storm control list
  let output = '\nInterface   Broadcast      Multicast       Unicast\n';
  output += '---------   ----------     ----------     ----------\n';
  Object.keys(state.ports || {}).forEach(portName => {
    const port = (state.ports || {})[portName];
    const sc = port.stormControl;
    const bc = sc?.broadcast?.enabled ? 'enabled' : 'disabled';
    const mc = sc?.multicast?.enabled ? 'enabled' : 'disabled';
    const uc = sc?.unicast?.enabled ? 'enabled' : 'disabled';
    output += `${portName.padEnd(10)}${bc.padEnd(16)}${mc.padEnd(16)}${uc}\n`;
  });
  output += '!\n';
  return { success: true, output };
}

export function cmdShowUdld(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  const match = input.match(/show\s+udld\s+(?:interface\s+)?(\S+)?/i);
  const interfaceName = match?.[1];

  let output = '\nGlobal UDLD information\n';
  output += '  Message interval: 15 seconds\n';
  output += '  Time out interval: 5 seconds\n';
  output += '  Mode: normal\n\n';

  if (interfaceName) {
    const port = (state.ports || {})[interfaceName.toLowerCase()];
    if (!port) {
      return { success: false, error: `% Interface ${interfaceName} not found` };
    }

    output += `UDLD Status for interface ${interfaceName}\n`;
    const udld = port.udld;
    output += `  Admin: ${udld?.enabled ? 'enabled' : 'disabled'}\n`;
    output += `  Mode: ${udld?.mode || 'normal'}\n`;
    output += `  Bidirectional Status: ${udld?.bidirectionalStatus || 'unknown'}\n`;
    output += `  Last Probe Time: ${udld?.lastProbeTime ? new Date(udld.lastProbeTime).toLocaleString() : 'never'}\n`;
  } else {
    output += 'Interface        Admin  State\n';
    output += '--------         -----  -----\n';
    Object.keys(state.ports || {}).forEach(portName => {
      const port = (state.ports || {})[portName];
      if (port && port.udld) {
        const admin = port.udld.enabled ? 'enable' : 'disable';
        const state = port.udld.bidirectionalStatus || 'unknown';
        output += `${portName.padEnd(16)}${admin.padEnd(7)}${state}\n`;
      }
    });
  }

  output += '!\n';
  return { success: true, output };
}

export function cmdShowMonitor(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!state.spanSessions || Object.keys(state.spanSessions).length === 0) {
    return { success: true, output: '\n% No SPAN sessions configured\n' };
  }

  let output = '\n';
  for (const sess of Object.values(state.spanSessions)) {
    output += `Session ${sess.id}\n`;
    output += `---------\n`;
    output += `Type                   : ${sess.type || 'local'}\n`;
    output += `Source Ports           : ${sess.sourceInterfaces.length > 0 ? sess.sourceInterfaces.join(', ') : 'None'}\n`;
    if (sess.destinationInterface) {
      output += `Destination Port       : ${sess.destinationInterface}\n`;
    }
    if (sess.remoteVlan) {
      output += `Remote VLAN            : ${sess.remoteVlan}\n`;
    }
    output += `Status                 : ${sess.enabled ? 'Active' : 'Disabled'}\n\n`;
  }

  return { success: true, output };
}

export function cmdShowDebug(_state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  return { success: true, output: '\nAll possible debugging has been turned off\n' };
}

export function cmdShowProcesses(_state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  return { success: true, output: '\nCPU utilization for five seconds: 1%/0%; one minute: 1%; five minutes: 1%\n' };
}

export function cmdShowMemory(_state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  return { success: true, output: '\n                Head    Total(b)     Used(b)     Free(b)   Lowest(b)  Largest(b)\nProcessor  65536000    65536000     8192000    57344000    57344000    57344000\n' };
}

export function cmdShowSdmPrefer(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  const template = state.sdmTemplate || 'default';
  let output = `\nThe current template is "${template}" template.\n`;
  if (template === 'lanbase-routing' || template === 'routing') {
    output += ` The selected template optimizes the resources in\n the switch to support this level of features for\n 16384 IPv4 ACL entries, 2048 QoS labels, 16384 IPv4 Multicast entries.\n`;
  } else if (template === 'lanbase') {
    output += ` The selected template optimizes the resources in\n the switch to support this level of features for\n 8192 IPv4 ACL entries, 2048 QoS labels, 2048 IPv4 Multicast entries.\n`;
  } else if (template === 'desktop') {
    output += ` The selected template optimizes the resources in\n the switch to support this level of features for\n 4096 IPv4 ACL entries, 512 QoS labels, 256 IPv4 Multicast entries.\n`;
  } else {
    output += ` The selected template optimizes the resources in\n the switch to support this level of features for\n 8 routed interfaces and 1024 VLANs.\n`;
  }
  return { success: true, output };
}

export function cmdShowSystemMtu(_state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  return { success: true, output: '\nSystem MTU size is 1500 bytes\nSystem Jumbo MTU size is 1500 bytes\nRouting MTU size is 1500 bytes\n' };
}

export function cmdShowSessions(_state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  return { success: true, output: '\n% No active sessions.\n' };
}

export function cmdShowSnmp(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  const chassis = state.version?.serialNumber || 'XXXXXXXXXXXX';
  const contact = state.snmpContact || 'unconfigured';
  const location = state.snmpLocation || 'unconfigured';
  const communities = Object.entries(state.snmpCommunities || {});

  let output = `Chassis: ${chassis}\n`;
  output += `Contact: ${contact}\n`;
  output += `Location: ${location}\n`;
  output += `0 SNMP packets input\n`;
  output += `    0 Bad SNMP version errors\n`;
  output += `    0 Unknown community name\n`;
  output += `    0 Illegal operation for community name supplied\n`;
  output += `    0 Encoding errors\n`;
  output += `    0 Number of requested variables\n`;
  output += `    0 Number of altered variables\n`;
  output += `    0 Get-request PDUs\n`;
  output += `    0 Get-next PDUs\n`;
  output += `    0 Set-request PDUs\n`;
  output += `0 SNMP packets output\n`;
  output += `    0 Too big errors (Maximum packet size 1500)\n`;
  output += `    0 No such name errors\n`;
  output += `    0 Bad values errors\n`;
  output += `    0 General errors\n`;
  output += `    0 Response PDUs\n`;
  output += `    0 Trap PDUs\n`;
  output += `SNMP logging: ${state.loggingEnabled ? 'enabled' : 'disabled'}\n`;

  if (communities.length > 0) {
    output += `SNMP communities:\n`;
    communities.forEach(([name, mode]) => {
      output += `    ${name} ${mode}\n`;
    });
  } else {
    output += `SNMP communities:\n    <none configured>\n`;
  }

  return { success: true, output };
}

export function cmdShowSnmpGroup(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  const groups = state.snmpGroups || [];
  if (groups.length === 0) {
    return { success: true, output: 'No SNMP groups configured' };
  }
  let output = 'GROUP NAME                  VERSION   SECURITY LEVEL\n';
  output += '--------------------------  --------  --------------\n';
  for (const g of groups) {
    output += `${g.name.padEnd(28)}${g.version.padEnd(10)}${(g.secLevel || 'noauth')}\n`;
  }
  return { success: true, output: output.trimEnd() };
}

export function cmdShowSnmpUser(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  const users = state.snmpUsers || [];
  if (users.length === 0) {
    return { success: true, output: 'No SNMP users configured' };
  }
  let output = 'User name: ';
  for (const u of users) {
    output += `${u.username}\n`;
    output += `Engine ID: 800000090300001BD56CD5\n`;
    output += `storage-type: nonvolatile active\n`;
    output += `Group-name: ${u.group}\n`;
    output += `Authentication Protocol: ${u.authProto || 'None'}\n`;
    output += `Privacy Protocol: ${u.privProto || 'None'}\n\n`;
  }
  return { success: true, output: output.trimEnd() };
}

export function cmdShowDiag(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  const ports = state.ports || {};
  const portKeys = Object.keys(ports);

  let output = '\nOverall Diagnostic Result: PASS\n';
  output += 'Test                              Attributes        Result\n';
  output += '--------------------------------- ----------------- ---------\n';
  output += 'TestPortLoopback                  Complete          Passed\n';
  output += 'TestMacAddressForwarding          Complete          Passed\n';
  output += 'TestNvramIntegrity                Complete          Passed\n';

  if (portKeys.length > 0) {
    output += '\nInterface Diagnostic Status:\n';
    output += 'Port       Status       Link State   Errors/Drops\n';
    output += '---------- ------------ ------------ ------------\n';
    portKeys.forEach(pk => {
      const p = ports[pk];
      const statusStr = p.shutdown ? 'Disabled' : 'Enabled';
      const linkStr = p.status === 'connected' ? 'Up' : (p.shutdown ? 'Down' : 'NoCable');
      const errCount = (p.statistics?.inputErrors || 0) + (p.statistics?.crcErrors || 0) + (p.statistics?.drops || 0);
      output += `${pk.padEnd(10)} ${statusStr.padEnd(12)} ${linkStr.padEnd(12)} ${errCount.toString()}\n`;
    });
  }

  return { success: true, output };
}

export function cmdShowPrivilege(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  const level = state.currentMode === 'privileged' ? 15 : 1;
  return { success: true, output: `\nCurrent privilege level is ${level}\n` };
}

export function cmdShowBannerMotd(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  return { success: true, output: state.bannerMOTD ? `\n${state.bannerMOTD}\n` : '\n% Banner not set\n' };
}

export function cmdShowAlias(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  let output = '\nExec aliases:\n';
  const builtIn: Record<string, string> = { 'h': 'show history', 'lo': 'exit' };
  const allAliases = { ...builtIn, ...state.execAliases };
  if (Object.keys(allAliases).length === 0) {
    output += '  (none)\n';
  } else {
    for (const [name, cmd] of Object.entries(allAliases)) {
      output += `  ${name.padEnd(20)} ${cmd}\n`;
    }
  }
  return { success: true, output };
}

export function cmdShowRedundancy(_state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  return { success: true, output: '\nRedundancy mode: NON-REDUNDANT\n' };
}

export function cmdShowArchive(_state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  return { success: true, output: '\nArchive configuration is not enabled.\n' };
}

export function cmdShowLogging(state: SwitchState): CommandResult {
  const loggingStatus = state.loggingEnabled !== false ? 'enabled' : 'disabled';
  const trapLevel = state.syslogTrapLevel || 'informational';
  const host = state.syslogHost ? `Logging to ${state.syslogHost}` : 'Logging to console/buffer';

  const output = `Syslog logging: ${loggingStatus}
Console logging: level debugging, 0 messages logged
Buffer logging: level debugging, 0 messages logged
Trap logging: level ${trapLevel}, 0 message lines logged
${host}
`;
  return { success: true, output };
}
