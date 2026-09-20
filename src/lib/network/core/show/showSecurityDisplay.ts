import type { CommandContext } from '../commandTypes';
import type { SwitchState, CommandResult } from '../../types';
import { lineAllowsProtocol } from '../lineCommands';

export function cmdShowAccessLists(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  const hasClassicAcls = !!state.accessLists && Object.keys(state.accessLists).length > 0;
  const firewallRules = Array.isArray(state.firewallRules) ? state.firewallRules : [];
  const hasFirewallAcls = firewallRules.length > 0;

  // Filter by ACL name if specified
  const filterAcl = input.match(/^show\s+access-lists?\s+(\S+)$/i)?.[1];

  if (!hasClassicAcls && !hasFirewallAcls) {
    return { success: true, output: '\n% No access lists configured\n' };
  }

  let output = '\n';

  if (hasClassicAcls) {
    Object.entries(state.accessLists || {}).forEach(([aclId, rules]: [string, string[]]) => {
      if (filterAcl && aclId !== filterAcl) return;

      const isNamed = isNaN(Number(aclId));
      const aclType = isNamed ? (state.namedAclTypes?.[aclId] || 'standard') : (parseInt(aclId) >= 100 ? 'extended' : 'standard');
      output += `${aclType === 'extended' ? 'Extended' : 'Standard'} IP access list ${aclId}\n`;
      rules.forEach((rule: string, ruleIndex: number) => {
        // Parse rule format: "seq permit|deny <conditions>"
        const seqMatch = rule.match(/^(\d+)\s+(.+)$/);
        let seq: string;
        let ruleText: string;
        if (seqMatch) {
          seq = seqMatch[1];
          ruleText = seqMatch[2];
        } else {
          seq = String((ruleIndex + 1) * 10);
          ruleText = rule;
        }
        const matches = state.aclMatchCounters?.[aclId]?.[ruleIndex] || 0;
        output += `    ${seq.padEnd(5)} ${ruleText} (${matches} ${matches === 1 ? 'match' : 'matches'})\n`;
      });
    });
  }

  if (hasFirewallAcls) {
    if (!filterAcl || filterAcl === 'OUTSIDE-IN') {
      output += 'access-list OUTSIDE-IN\n';
      firewallRules.forEach((rule: { enabled?: boolean; protocol?: string; action: string; sourceIp: string; targetIp: string; port: string | number }, index: number) => {
        const inactive = rule.enabled === false ? 'inactive ' : '';
        const protocol = rule.protocol === 'any' ? 'ip' : (rule.protocol || 'ip');
        output += `    line ${index + 1} extended ${inactive}${rule.action} ${protocol} ${rule.sourceIp} ${rule.targetIp} eq ${rule.port}\n`;
      });
    }
  }

  return { success: true, output };
}

export function cmdShowMacAcl(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  const acls = state.macAcls || {};
  const names = Object.keys(acls);
  if (names.length === 0) {
    return { success: true, output: '\n% No MAC access lists configured.\n' };
  }

  let output = '';
  names.forEach(name => {
    output += `\nMAC access-list extended ${name}\n`;
    const rules = acls[name] || [];
    if (rules.length === 0) {
      output += '    (empty)\n';
    } else {
      rules.forEach((rule, idx) => {
        output += `    ${(idx + 1) * 10} ${typeof rule === 'string' ? rule : JSON.stringify(rule)}\n`;
      });
    }
  });

  return { success: true, output };
}

export function cmdShowAuth(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  const sessions = state.dot1xSessions || {};
  const entries = Object.values(sessions);

  if (entries.length === 0) {
    return { success: true, output: '\nNo active authentication sessions.\n' };
  }

  let output = '\nInterface  Identifier           Method  Domain  Status          Session ID\n';
  output += '--------------------------------------------------------------------------\n';
  entries.forEach(s => {
    const port = s.port.padEnd(10);
    const id = (s.identity || 'N/A').padEnd(20);
    const method = 'dot1x'.padEnd(7);
    const domain = 'DATA'.padEnd(7);
    const status = (s.state || 'Authz Success').padEnd(15);
    const sessId = `0A0000010000000${s.port.replace(/\D/g, '') || '1'}`;
    output += `${port} ${id} ${method} ${domain} ${status} ${sessId}\n`;
  });

  return { success: true, output };
}

export function cmdShowSsh(
  state: SwitchState,
  _input: string,
  _ctx: CommandContext
): CommandResult {
  const version = state.sshVersion || 2;
  const transportInput = state.security?.vtyLines?.transportInput || [];
  const sshEnabled = version > 0 && lineAllowsProtocol(transportInput, 'ssh');
  const timeout = state.sshTimeout || 60;
  const retries = state.sshAuthenticationRetries || 3;
  const domainName = state.domainName || 'not set';

  let output = '\nSSH Server Status\n';
  output += '-----------------\n';
  output += `SSH Version: ${version}\n`;
  output += `SSH Status: ${sshEnabled ? 'enabled' : 'disabled'}\n`;
  output += `Authentication Retries: ${retries}\n`;
  output += `Timeout: ${timeout} seconds\n`;
  output += `Domain Name: ${domainName}\n`;
  output += `VTY Transport Input: ${transportInput.length > 0 ? transportInput.join(' ') : 'none'}\n`;

  const activeSessions = Array.isArray(state.sshSessions) ? state.sshSessions : [];
  const normalizedSessions = activeSessions;

  output += `\nActive SSH Sessions: ${normalizedSessions.length}\n`;
  if (normalizedSessions.length > 0) {
    output += 'Session   User       Source\n';
    output += '--------  ---------  ----------------\n';
    normalizedSessions.forEach((session: { user?: string; source?: string }, index: number) => {
      output += `${String(index + 1).padEnd(8)}  ${(session.user || 'unknown').padEnd(9)}  ${session.source || 'unknown'}\n`;
    });
  }

  output += '!\n';
  return { success: true, output };
}
