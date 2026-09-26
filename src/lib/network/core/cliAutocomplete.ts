import { CommandMode, SwitchState } from '../types';
import { commandPatterns, resolveAliases, expandKeywordPrefixes } from '../parser';
import { commandHelp } from '../executorCommandHelp';

export interface AutocompleteResult {
  completed: string;
  suggestions: string[];
  isUnique: boolean;
  commonPrefix: string;
}

const COMMON_INTERFACE_NAMES = [
  'FastEthernet0/1',
  'FastEthernet0/2',
  'FastEthernet0/3',
  'FastEthernet0/4',
  'GigabitEthernet0/0',
  'GigabitEthernet0/1',
  'GigabitEthernet0/2',
  'Vlan1',
  'Vlan10',
  'Vlan20',
  'Port-channel1',
  'Loopback0'
];

/**
 * Computes longest common prefix among a list of strings
 */
function getLongestCommonPrefix(strings: string[]): string {
  if (strings.length === 0) return '';
  if (strings.length === 1) return strings[0];

  let prefix = strings[0];
  for (let i = 1; i < strings.length; i++) {
    while (!strings[i].toLowerCase().startsWith(prefix.toLowerCase())) {
      prefix = prefix.substring(0, prefix.length - 1);
      if (prefix === '') return '';
    }
  }
  return prefix;
}

/**
 * Autocomplete / Tab completion engine for CLI commands
 */
export function getTabCompletion(
  input: string,
  mode: CommandMode,
  state?: Partial<SwitchState>
): AutocompleteResult {
  if (!input) {
    const topKeywords = getModeTopKeywords(mode);
    return {
      completed: '',
      suggestions: topKeywords,
      isUnique: false,
      commonPrefix: ''
    };
  }

  const hasTrailingSpace = /\s$/.test(input);
  const trimmed = input.trim();
  const rawTokens = trimmed.split(/\s+/);

  // Delegate 'do <subcommand>' in non-exec modes
  if (rawTokens[0].toLowerCase() === 'do' && mode !== 'user' && mode !== 'privileged') {
    if (rawTokens.length === 1 && !hasTrailingSpace) {
      return {
        completed: 'do',
        suggestions: ['do'],
        isUnique: true,
        commonPrefix: 'do'
      };
    }
    const subInput = hasTrailingSpace
      ? input.substring(input.indexOf('do') + 2).trimStart() + ' '
      : input.substring(input.indexOf('do') + 2).trimStart();
    const subResult = getTabCompletion(subInput, 'privileged', state);
    return {
      completed: 'do ' + subResult.completed,
      suggestions: subResult.suggestions,
      isUnique: subResult.isUnique,
      commonPrefix: 'do ' + subResult.commonPrefix
    };
  }

  // First expand known aliases / keyword prefixes for previous tokens
  const expanded = expandKeywordPrefixes(resolveAliases(input, state, mode), mode);
  const tokens = expanded.split(/\s+/);

  if (hasTrailingSpace) {
    // We are looking for the NEXT token after current tokens
    const contextPrefix = tokens.join(' ');
    const candidates = getNextTokenCandidates(contextPrefix, mode, state);
    
    if (candidates.length === 1) {
      const fullCompleted = `${contextPrefix} ${candidates[0]}`;
      return {
        completed: fullCompleted,
        suggestions: candidates,
        isUnique: true,
        commonPrefix: fullCompleted
      };
    }

    const lcp = getLongestCommonPrefix(candidates);
    const completed = lcp ? `${contextPrefix} ${lcp}` : `${contextPrefix} `;
    return {
      completed,
      suggestions: candidates,
      isUnique: false,
      commonPrefix: lcp ? `${contextPrefix} ${lcp}` : contextPrefix
    };
  } else {
    // Completing the LAST token
    const lastToken = tokens[tokens.length - 1].toLowerCase();
    const leadingTokens = tokens.slice(0, -1);
    const leadingPrefix = leadingTokens.length > 0 ? leadingTokens.join(' ') + ' ' : '';

    const candidates = getMatchingCandidates(leadingTokens, lastToken, mode, state);

    if (candidates.length === 0) {
      return {
        completed: input,
        suggestions: [],
        isUnique: false,
        commonPrefix: input
      };
    }

    if (candidates.length === 1) {
      const fullCompleted = leadingPrefix + candidates[0];
      return {
        completed: fullCompleted,
        suggestions: candidates,
        isUnique: true,
        commonPrefix: fullCompleted
      };
    }

    const lcp = getLongestCommonPrefix(candidates);
    const completed = leadingPrefix + lcp;
    return {
      completed,
      suggestions: candidates,
      isUnique: false,
      commonPrefix: completed
    };
  }
}

function getModeTopKeywords(mode: CommandMode): string[] {
  const helpObj = commandHelp[mode] || commandHelp.user || {};
  if (Array.isArray(helpObj[''])) {
    return helpObj[''];
  }
  const keywords = new Set<string>();
  Object.keys(commandPatterns).forEach(patternKey => {
    const pat = commandPatterns[patternKey];
    if (pat.modes.includes(mode)) {
      keywords.add(patternKey.split(/\s+/)[0]);
    }
  });
  return Array.from(keywords).sort();
}

function getNextTokenCandidates(
  contextPrefix: string,
  mode: CommandMode,
  state?: Partial<SwitchState>
): string[] {
  const lowerContext = contextPrefix.toLowerCase().trim();
  const tokens = lowerContext.split(/\s+/);
  const candidates = new Set<string>();

  // Check interface matching
  if (['interface', 'int'].includes(tokens[tokens.length - 1])) {
    const availablePorts = state?.ports ? Object.keys(state.ports) : COMMON_INTERFACE_NAMES;
    return availablePorts.sort();
  }

  // Check commandHelp tree
  const helpObj = commandHelp[mode] || commandHelp.user || {};
  if (helpObj[lowerContext]) {
    return [...helpObj[lowerContext]].sort();
  }

  // Pattern matching
  Object.keys(commandPatterns).forEach(patternKey => {
    const pat = commandPatterns[patternKey];
    if (pat.modes.includes(mode)) {
      const patLower = patternKey.toLowerCase();
      if (patLower.startsWith(lowerContext + ' ')) {
        const rest = patLower.substring(lowerContext.length).trim();
        const nextToken = rest.split(/\s+/)[0];
        if (nextToken && !nextToken.startsWith('<')) {
          candidates.add(nextToken);
        }
      }
    }
  });

  return Array.from(candidates).sort();
}

function getMatchingCandidates(
  leadingTokens: string[],
  lastToken: string,
  mode: CommandMode,
  state?: Partial<SwitchState>
): string[] {
  const candidates = new Set<string>();

  if (leadingTokens.length === 0) {
    // Top level command completion
    const topKeywords = getModeTopKeywords(mode);
    topKeywords.forEach(kw => {
      if (kw.toLowerCase().startsWith(lastToken)) {
        candidates.add(kw);
      }
    });
  } else {
    const contextPrefix = leadingTokens.join(' ').toLowerCase();
    const prevToken = leadingTokens[leadingTokens.length - 1].toLowerCase();

    if (['interface', 'int'].includes(prevToken)) {
      const availablePorts = state?.ports ? Object.keys(state.ports) : COMMON_INTERFACE_NAMES;
      availablePorts.forEach(p => {
        if (p.toLowerCase().startsWith(lastToken)) {
          candidates.add(p);
        }
      });
    } else {
      const nextCandidates = getNextTokenCandidates(contextPrefix, mode, state);
      nextCandidates.forEach(cand => {
        if (cand.toLowerCase().startsWith(lastToken)) {
          candidates.add(cand);
        }
      });
    }
  }

  return Array.from(candidates).sort();
}
