import { cliModeError } from './cliErrors';
import type { CommandContext } from './commandTypes';
import type { SwitchState, CommandResult } from '../types';

export function cmdIpAccessList(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: '% Invalid command' };

  const match = input.match(/^ip\s+access-list\s+(standard|extended)\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Invalid ip access-list command' };

  const aclTypeRaw = match[1].toLowerCase();
  const aclType = aclTypeRaw === 'extended' ? 'extended' as const : 'standard' as const;
  const aclName = match[2];
  const accessLists = { ...state.accessLists };
  const namedAclTypes = { ...state.namedAclTypes };
  if (!accessLists[aclName]) {
    accessLists[aclName] = [];
  }
  namedAclTypes[aclName] = aclType;

  if (aclType === 'extended') {
    return {
      success: true,
      output: '',
      newState: {
        currentMode: 'config-ext-nacl',
        currentExtendedAcl: aclName,
        accessLists,
        namedAclTypes
      }
    };
  }

  return {
    success: true,
    output: '',
    newState: {
      currentMode: 'config-std-nacl',
      currentNamedAcl: aclName,
      accessLists,
      namedAclTypes
    }
  };
}

export function cmdIpv6AccessList(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: '% Invalid command' };

  const match = input.match(/^ipv6\s+access-list\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Invalid ipv6 access-list command' };

  const aclName = match[1];
  const ipv6AccessLists = { ...state.ipv6AccessLists };
  if (!ipv6AccessLists[aclName]) {
    ipv6AccessLists[aclName] = [];
  }

  return {
    success: true,
    output: '',
    newState: {
      currentMode: 'config-ipv6-acl',
      currentIpv6Acl: aclName,
      ipv6AccessLists
    }
  };
}

export function cmdIpv6AclPermit(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config-ipv6-acl' || !state.currentIpv6Acl) {
    return { success: false, error: cliModeError() };
  }

  const match = input.match(/^permit\s+(.+)$/i);
  if (!match) return { success: false, error: '% Invalid permit command' };

  const rule = `permit ${match[1]}`;
  const ipv6AccessLists = { ...state.ipv6AccessLists };
  const aclName = state.currentIpv6Acl;
  ipv6AccessLists[aclName] = [...(ipv6AccessLists[aclName] || []), rule];

  return {
    success: true,
    newState: { ipv6AccessLists }
  };
}

export function cmdIpv6AclDeny(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config-ipv6-acl' || !state.currentIpv6Acl) {
    return { success: false, error: cliModeError() };
  }

  const match = input.match(/^deny\s+(.+)$/i);
  if (!match) return { success: false, error: '% Invalid deny command' };

  const rule = `deny ${match[1]}`;
  const ipv6AccessLists = { ...state.ipv6AccessLists };
  const aclName = state.currentIpv6Acl;
  ipv6AccessLists[aclName] = [...(ipv6AccessLists[aclName] || []), rule];

  return {
    success: true,
    newState: { ipv6AccessLists }
  };
}

function addOrReplaceAclRule(existingRules: string[], ruleText: string, seqNum?: number): string[] {
  let rules = [...existingRules];
  if (seqNum !== undefined) {
    const seqStr = String(seqNum);
    const formattedRule = `${seqStr} ${ruleText}`;
    const existingIndex = rules.findIndex(r => r.startsWith(`${seqStr} `));
    if (existingIndex !== -1) {
      rules[existingIndex] = formattedRule;
    } else {
      rules.push(formattedRule);
      rules.sort((a, b) => {
        const seqA = parseInt(a.split(/\s+/)[0], 10);
        const seqB = parseInt(b.split(/\s+/)[0], 10);
        if (isNaN(seqA) || isNaN(seqB)) return 0;
        return seqA - seqB;
      });
    }
  } else {
    rules.push(ruleText);
  }
  return rules;
}

export function cmdNamedAclPermit(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config-std-nacl' || !state.currentNamedAcl) {
    return { success: false, error: cliModeError() };
  }

  const match = input.match(/^(?:(\d+)\s+)?permit\s+(.+)$/i);
  if (!match) return { success: false, error: '% Invalid permit command' };

  const seqNum = match[1] ? parseInt(match[1], 10) : undefined;
  const ruleText = `permit ${match[2]}`;
  const accessLists = { ...state.accessLists };
  const aclName = state.currentNamedAcl;
  accessLists[aclName] = addOrReplaceAclRule(accessLists[aclName] || [], ruleText, seqNum);

  return {
    success: true,
    newState: { accessLists }
  };
}

export function cmdNamedAclDeny(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config-std-nacl' || !state.currentNamedAcl) {
    return { success: false, error: cliModeError() };
  }

  const match = input.match(/^(?:(\d+)\s+)?deny\s+(.+)$/i);
  if (!match) return { success: false, error: '% Invalid deny command' };

  const seqNum = match[1] ? parseInt(match[1], 10) : undefined;
  const ruleText = `deny ${match[2]}`;
  const accessLists = { ...state.accessLists };
  const aclName = state.currentNamedAcl;
  accessLists[aclName] = addOrReplaceAclRule(accessLists[aclName] || [], ruleText, seqNum);

  return {
    success: true,
    newState: { accessLists }
  };
}

export function cmdNamedAclNoPermit(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config-std-nacl' || !state.currentNamedAcl) {
    return { success: false, error: cliModeError() };
  }

  const seqMatch = input.match(/^no\s+(\d+)$/i);
  const aclName = state.currentNamedAcl;
  const accessLists = { ...state.accessLists };

  if (seqMatch) {
    const seqStr = seqMatch[1];
    accessLists[aclName] = (accessLists[aclName] || []).filter((r: string) => !r.startsWith(`${seqStr} `));
    return { success: true, newState: { accessLists } };
  }

  const match = input.match(/^no\s+permit\s+(.+)$/i);
  if (!match) return { success: false, error: '% Invalid command' };

  const rule = `permit ${match[1]}`;
  accessLists[aclName] = (accessLists[aclName] || []).filter((r: string) => r !== rule && !r.endsWith(` ${rule}`));

  return {
    success: true,
    newState: { accessLists }
  };
}

export function cmdNamedAclNoDeny(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config-std-nacl' || !state.currentNamedAcl) {
    return { success: false, error: cliModeError() };
  }

  const seqMatch = input.match(/^no\s+(\d+)$/i);
  const aclName = state.currentNamedAcl;
  const accessLists = { ...state.accessLists };

  if (seqMatch) {
    const seqStr = seqMatch[1];
    accessLists[aclName] = (accessLists[aclName] || []).filter((r: string) => !r.startsWith(`${seqStr} `));
    return { success: true, newState: { accessLists } };
  }

  const match = input.match(/^no\s+deny\s+(.+)$/i);
  if (!match) return { success: false, error: '% Invalid command' };

  const rule = `deny ${match[1]}`;
  accessLists[aclName] = (accessLists[aclName] || []).filter((r: string) => r !== rule && !r.endsWith(` ${rule}`));

  return {
    success: true,
    newState: { accessLists }
  };
}

export function cmdExtAclPermit(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  const aclName = state.currentExtendedAcl || state.currentNamedAcl || 'EXTENDED-ACL';

  const match = input.match(/^(?:(\d+)\s+)?permit\s+(.+)$/i);
  if (!match) return { success: false, error: '% Invalid permit command' };

  const seqNum = match[1] ? parseInt(match[1], 10) : undefined;
  const ruleText = `permit ${match[2]}`;
  const accessLists = { ...state.accessLists };
  accessLists[aclName] = addOrReplaceAclRule(accessLists[aclName] || [], ruleText, seqNum);

  return {
    success: true,
    newState: {
      accessLists,
      currentExtendedAcl: aclName,
      currentMode: 'config-ext-nacl'
    }
  };
}

export function cmdExtAclDeny(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  const aclName = state.currentExtendedAcl || state.currentNamedAcl || 'EXTENDED-ACL';

  const match = input.match(/^(?:(\d+)\s+)?deny\s+(.+)$/i);
  if (!match) return { success: false, error: '% Invalid deny command' };

  const seqNum = match[1] ? parseInt(match[1], 10) : undefined;
  const ruleText = `deny ${match[2]}`;
  const accessLists = { ...state.accessLists };
  accessLists[aclName] = addOrReplaceAclRule(accessLists[aclName] || [], ruleText, seqNum);

  return {
    success: true,
    newState: {
      accessLists,
      currentExtendedAcl: aclName,
      currentMode: 'config-ext-nacl'
    }
  };
}

export function cmdExtAclNoPermit(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  const aclName = state.currentExtendedAcl || state.currentNamedAcl || 'EXTENDED-ACL';

  const seqMatch = input.match(/^no\s+(\d+)$/i);
  const accessLists = { ...state.accessLists };

  if (seqMatch) {
    const seqStr = seqMatch[1];
    accessLists[aclName] = (accessLists[aclName] || []).filter((r: string) => !r.startsWith(`${seqStr} `));
    return { success: true, newState: { accessLists } };
  }

  const match = input.match(/^no\s+permit\s+(.+)$/i);
  if (!match) return { success: false, error: '% Invalid command' };

  const rule = `permit ${match[1]}`;
  accessLists[aclName] = (accessLists[aclName] || []).filter((r: string) => r !== rule && !r.endsWith(` ${rule}`));

  return { success: true, newState: { accessLists } };
}

export function cmdExtAclNoDeny(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  const aclName = state.currentExtendedAcl || state.currentNamedAcl || 'EXTENDED-ACL';

  const seqMatch = input.match(/^no\s+(\d+)$/i);
  const accessLists = { ...state.accessLists };

  if (seqMatch) {
    const seqStr = seqMatch[1];
    accessLists[aclName] = (accessLists[aclName] || []).filter((r: string) => !r.startsWith(`${seqStr} `));
    return { success: true, newState: { accessLists } };
  }

  const match = input.match(/^no\s+deny\s+(.+)$/i);
  if (!match) return { success: false, error: '% Invalid command' };

  const rule = `deny ${match[1]}`;
  accessLists[aclName] = (accessLists[aclName] || []).filter((r: string) => r !== rule && !r.endsWith(` ${rule}`));

  return { success: true, newState: { accessLists } };
}

export function cmdNoIpAccessList(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: '% Invalid command' };

  const match = input.match(/^no\s+ip\s+access-list\s+(standard|extended)\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Invalid command' };

  const aclName = match[2];
  const accessLists = { ...state.accessLists };
  delete accessLists[aclName];

  return { success: true, output: `IP access-list ${aclName} removed`, newState: { accessLists } };
}