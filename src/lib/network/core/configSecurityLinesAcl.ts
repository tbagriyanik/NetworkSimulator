import { SwitchState } from '../types';
import { encryptType7Password } from '../crypto';

export function buildSecurityLinesAclConfig(state: SwitchState, lines: string[]): void {
  // line con 0
  lines.push('line con 0');
  if (state.startupConfig?.security?.consoleLine?.password) {
    if (state.startupConfig.security.servicePasswordEncryption) {
      lines.push(` password 7 ${encryptType7Password(state.startupConfig.security.consoleLine.password)}`);
    } else {
      lines.push(` password ${state.startupConfig.security.consoleLine.password}`);
    }
  } else if (state.security?.consoleLine?.password) {
    if (state.security.servicePasswordEncryption) {
      lines.push(` password 7 ${encryptType7Password(state.security.consoleLine.password)}`);
    } else {
      lines.push(` password ${state.security.consoleLine.password}`);
    }
  }
  if (state.security?.consoleLine?.login) {
    lines.push(' login');
  }
  if (state.security?.consoleLine?.execTimeout) {
    lines.push(` exec-timeout ${state.security.consoleLine.execTimeout.minutes} ${state.security.consoleLine.execTimeout.seconds}`);
  }
  lines.push('!');

  // line vty 0 4 (matches showSystemDisplay + the simulator's vty model;
  // a single vtyLines object serves the whole range)
  lines.push('line vty 0 4');
  if (state.startupConfig?.security?.vtyLines?.password) {
    if (state.startupConfig.security.servicePasswordEncryption) {
      lines.push(` password 7 ${encryptType7Password(state.startupConfig.security.vtyLines.password)}`);
    } else {
      lines.push(` password ${state.startupConfig.security.vtyLines.password}`);
    }
  } else if (state.security?.vtyLines?.password) {
    if (state.security.servicePasswordEncryption) {
      lines.push(` password 7 ${encryptType7Password(state.security.vtyLines.password)}`);
    } else {
      lines.push(` password ${state.security.vtyLines.password}`);
    }
  }
  if (state.security?.vtyLines?.login) {
    lines.push(' login');
  }
  if (
    (state.security?.vtyLines?.transportInput?.length || 0) > 0 &&
    state.security?.vtyLines?.transportInput?.[0] !== 'all'
  ) {
    lines.push(` transport input ${state.security!.vtyLines!.transportInput.join(' ')}`);
  }
  if (state.security?.vtyLines?.execTimeout) {
    lines.push(` exec-timeout ${state.security.vtyLines.execTimeout.minutes} ${state.security.vtyLines.execTimeout.seconds}`);
  }
  lines.push('!');

  // Standard and named ACLs
  if (state.accessLists && Object.keys(state.accessLists).length > 0) {
    Object.entries(state.accessLists).forEach(([aclId, rules]) => {
      const isNamed = isNaN(Number(aclId));
      if (isNamed) {
        lines.push(`ip access-list standard ${aclId}`);
        rules.forEach((rule: string) => {
          const seqMatch = rule.match(/^(\d+)\s+(.+)$/);
          if (seqMatch) {
            lines.push(` ${seqMatch[2]}`);
          } else {
            lines.push(` ${rule}`);
          }
        });
        lines.push('exit');
      } else {
        rules.forEach((rule: string) => {
          const seqMatch = rule.match(/^(\d+)\s+(.+)$/);
          if (seqMatch) {
            lines.push(`access-list ${aclId} ${seqMatch[2]}`);
          } else {
            lines.push(`access-list ${aclId} ${rule}`);
          }
        });
      }
    });
    lines.push('!');
  }

  if (state.switchLayer === 'FW' && state.firewallRules && state.firewallRules.length > 0) {
    state.firewallRules.forEach((rule, index) => {
      const statusPrefix = rule.enabled === false ? 'inactive ' : '';
      const action = rule.action === 'allow' ? 'permit' : rule.action;
      const sourceIp = rule.sourceIp === '*' ? 'any' : rule.sourceIp;
      const targetIp = rule.targetIp === '*' ? 'any' : rule.targetIp;
      const protocol = (rule.protocol === 'any' ? 'ip' : (rule.protocol || 'ip')).toLowerCase();
      const hasPort = (rule.port !== '*' && rule.port !== 'any' && protocol !== 'icmp' && protocol !== 'ip' && protocol !== 'any');
      const portSuffix = hasPort ? ` eq ${rule.port}` : '';
      lines.push(
        `access-list OUTSIDE-IN line ${index + 1} extended ${statusPrefix}${action} ${protocol} ${sourceIp} ${targetIp}${portSuffix}`
      );
    });
    lines.push('!');
  }

  // SPAN / RSPAN monitor sessions
  if (state.spanSessions && Object.keys(state.spanSessions).length > 0) {
    Object.values(state.spanSessions).forEach(sess => {
      sess.sourceInterfaces.forEach(src => {
        lines.push(`monitor session ${sess.id} source interface ${src}`);
      });
      if (sess.destinationInterface) {
        lines.push(`monitor session ${sess.id} destination interface ${sess.destinationInterface}`);
      }
      if (sess.remoteVlan) {
        const rspanType = sess.type === 'rspan-destination' ? 'destination' : 'source';
        lines.push(`monitor session ${sess.id} ${rspanType} remote vlan ${sess.remoteVlan}`);
      }
    });
    lines.push('!');
  }

  lines.push('end');
}
