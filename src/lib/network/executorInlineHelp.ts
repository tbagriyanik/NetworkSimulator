import { SwitchState, CommandMode } from './types';
import { commandHelp, commandDescriptions } from './executorCommandHelp';
import { commandPatterns, getLevenshteinDistance, expandKeywordPrefixes, resolveAliases } from './parser';
import { CLI_ERRORS } from './core/cliErrors';
import { getDeviceCapabilities } from './capabilities';
import type { CanvasDevice, DeviceType } from '@/components/network/networkTopology.types';

function getInlineHelp(mode: CommandMode, partialInput: string, prompt: string, state?: SwitchState): string {
  const modeCommands = commandHelp[mode] || commandHelp.user;
  const modeDescriptions = commandDescriptions[mode] || commandDescriptions.user;
  
  // Resolve command aliases and keyword prefixes (e.g. "int f" -> "interface f", "sh ip" -> "show ip")
  const resolvedInput = expandKeywordPrefixes(resolveAliases(partialInput, state), mode);
  const lowerRaw = resolvedInput.toLowerCase();
  const hasSpace = /\s$/.test(partialInput) || partialInput.length === 0;
  const lower = lowerRaw.trim();

  let suggestions: string[] = [];

  // Special handling for "do <subcommand>" — delegate to privileged mode tree
  // e.g. "do ?" → privileged top-level, "do show ?" → privileged show subtree
  const isDoPrefix = lower === 'do' || lower.startsWith('do ');
  if (isDoPrefix && mode !== 'privileged' && mode !== 'user') {
    const privilegedCommands = commandHelp['privileged'] || {};
    // Strip the "do " prefix to get the sub-command portion
    const subInput = lower === 'do' ? '' : lower.slice(3); // e.g. "show", "show ip", ""
    const subHasSpace = /\s$/.test(subInput) || subInput === '' || lower === 'do';
    const subLower = subInput.trim();

    if (subLower === '') {
      // "do ?" → list all privileged top-level commands
      suggestions = [...(privilegedCommands[''] || [])].filter(
        c => !['configure', 'disable', '?', 'help'].includes(c)
      );
    } else {
      // "do show ?" or "do ping ?" etc. → look up in privileged tree
      if (subHasSpace && privilegedCommands[subLower]) {
        suggestions = [...privilegedCommands[subLower]];
      } else {
        // Prefix match in privileged tree
        for (const key of Object.keys(privilegedCommands)) {
          if (key.startsWith(subLower) && key !== subLower) {
            const remaining = key.substring(subLower.length).trim();
            if (remaining) {
              const nextWord = remaining.split(' ')[0];
              if (nextWord && !suggestions.includes(nextWord)) {
                suggestions.push(nextWord);
              }
            }
          }
        }
        // Fallback: commandPatterns in privileged mode
        if (suggestions.length === 0) {
          for (const [name, pattern] of Object.entries(commandPatterns)) {
            if (!pattern.modes.includes('privileged')) continue;
            if (!name.startsWith(subLower + ' ') && name !== subLower) continue;
            const remaining = name.substring(subLower.length).trim();
            if (!remaining) continue;
            const nextWord = remaining.split(' ')[0];
            if (nextWord && !suggestions.includes(nextWord)) {
              suggestions.push(nextWord);
            }
          }
        }
      }
    }
  } else {
    // Standard help lookup
    if (lower === '') {
      // Top-level commands for current mode
      suggestions = [...(modeCommands[''] || [])];
    } else if (hasSpace) {
      // Parameterized command families need a small dynamic branch because
      // the command tree cannot use a literal numeric operation id.
      if (/^ip\s+sla\s+\d+$/i.test(lower)) {
        suggestions = ['icmp-echo', 'jitter'];
      } else if (/^ip\s+sla\s+schedule\s+\d+$/i.test(lower)) {
        suggestions = ['life'];
      }

      // 1. Exact match in commandHelp tree when trailing space is present (e.g. "debug ?", "debug ip ?")
      if (suggestions.length > 0) {
        // Dynamic suggestions already resolved above.
      } else if (modeCommands[lower]) {
        suggestions = [...modeCommands[lower]];
      } else {
        // Try expanding the last token if it's an abbreviated sub-keyword (e.g. "interface f" -> "interface FastEthernet")
        const tokens = lower.split(/\s+/);
        if (tokens.length > 1) {
          const parentKey = tokens.slice(0, -1).join(' ');
          const lastToken = tokens[tokens.length - 1];
          if (modeCommands[parentKey]) {
            const matches = modeCommands[parentKey].filter(child => child.toLowerCase().startsWith(lastToken));
            if (matches.length === 1) {
              const expandedKey = `${parentKey} ${matches[0]}`.toLowerCase();
              if (modeCommands[expandedKey]) {
                suggestions = [...modeCommands[expandedKey]];
              } else {
                suggestions = [matches[0]];
              }
            } else if (matches.length > 1) {
              suggestions = matches;
            }
          }
        }

        // Fallback: Prefix match for subcommands with trailing space
        if (suggestions.length === 0) {
          for (const key of Object.keys(modeCommands)) {
            if (key.startsWith(lower + ' ')) {
              const remaining = key.substring(lower.length + 1).trim();
              if (remaining) {
                const nextWord = remaining.split(' ')[0];
                if (nextWord && !suggestions.includes(nextWord)) {
                  suggestions.push(nextWord);
                }
              }
            }
          }
        }
      }
    } else {
      // No trailing space (e.g., "deb?", "debug?") — find completing keywords or exact command match
      for (const key of Object.keys(modeCommands)) {
        const tokens = key.split(' ');
        for (const token of tokens) {
          if (token.startsWith(lower) && !suggestions.includes(token)) {
            suggestions.push(token);
          }
        }
      }

      // Check top-level command list for matching prefixes
      const topLevel = modeCommands[''] || [];
      for (const cmd of topLevel) {
        if (cmd.startsWith(lower) && !suggestions.includes(cmd)) {
          suggestions.push(cmd);
        }
      }
    }

    // Fallback: derive suggestions from commandPatterns for this mode
    if (suggestions.length === 0 && lower !== '') {
      const patternSuggestions: string[] = [];
      for (const [name, pattern] of Object.entries(commandPatterns)) {
        if (!pattern.modes.includes(mode)) continue;
        const nameLower = name.toLowerCase();
        if (hasSpace) {
          if (nameLower.startsWith(lower + ' ')) {
            const remaining = nameLower.substring(lower.length + 1).trim();
            if (remaining) {
              const nextWord = remaining.split(' ')[0];
              if (nextWord && !patternSuggestions.includes(nextWord)) {
                patternSuggestions.push(nextWord);
              }
            }
          }
        } else {
          if (nameLower.startsWith(lower)) {
            const remaining = nameLower.substring(lower.length).trim();
            if (remaining) {
              const nextWord = remaining.split(' ')[0];
              if (nextWord && !patternSuggestions.includes(nextWord)) {
                patternSuggestions.push(nextWord);
              }
            } else if (!patternSuggestions.includes(nameLower)) {
              patternSuggestions.push(nameLower);
            }
          }
        }
      }
      suggestions = patternSuggestions;
    }

    // 4. User-defined exec alias support
    if (suggestions.length === 0 && state?.execAliases) {
      const userAliases = state.execAliases;
      // Check if input (or its prefix) matches a user alias
      const sortedUserAliases = Object.entries(userAliases)
        .sort((a, b) => b[0].length - a[0].length);
      for (const [alias, fullCommand] of sortedUserAliases as [string, string][]) {
        const aliasLower = alias.toLowerCase();
        // Exact match: "si ?" — resolve and show sub-commands of the resolved command
        if (lower === aliasLower) {
          const resolvedPrefix = fullCommand.trim().toLowerCase();
          // Look up in commandHelp
          if (modeCommands[resolvedPrefix]) {
            suggestions = [...modeCommands[resolvedPrefix]];
          } else {
            // Prefix match on resolved command
            for (const key of Object.keys(modeCommands)) {
              if (key.startsWith(resolvedPrefix) && key !== resolvedPrefix) {
                const remaining = key.substring(resolvedPrefix.length).trim();
                if (remaining) {
                  const nextWord = remaining.split(' ')[0];
                  if (nextWord && !suggestions.includes(nextWord)) {
                    suggestions.push(nextWord);
                  }
                }
              }
            }
          }
          break;
        }
        // Prefix match: "si s" where alias is "si" — resolve and show sub-commands
        if (lower.startsWith(aliasLower + ' ')) {
          const rest = lower.substring(aliasLower.length).trim();
          const resolvedPrefix = (fullCommand + ' ' + rest).trim().toLowerCase();
          if (modeCommands[resolvedPrefix]) {
            suggestions = [...modeCommands[resolvedPrefix]];
          } else {
            for (const key of Object.keys(modeCommands)) {
              if (key.startsWith(resolvedPrefix) && key !== resolvedPrefix) {
                const remaining = key.substring(resolvedPrefix.length).trim();
                if (remaining) {
                  const nextWord = remaining.split(' ')[0];
                  if (nextWord && !suggestions.includes(nextWord)) {
                    suggestions.push(nextWord);
                  }
                }
              }
            }
          }
          break;
        }
      }
    }
  }

  const lines: string[] = [];
  const trimmedInput = partialInput.trim();
  lines.push(prompt + partialInput + '?');
  lines.push('');

  // Check if current input is already a complete command
  let canCR = false;
  const resolved = expandKeywordPrefixes(resolveAliases(trimmedInput, state), mode);
  for (const [_name, pattern] of Object.entries(commandPatterns)) {
    if (pattern.modes.includes(mode)) {
      if (pattern.pattern.test(resolved)) {
        canCR = true;
        break;
      }
    }
  }

  if (suggestions.length === 0 && !canCR) {
    lines.push(CLI_ERRORS.unknown);
  } else {
    if (canCR && !suggestions.includes('<cr>')) {
      suggestions.push('<cr>');
    }

    // Kategorize suggestions
    const keywords: string[] = [];
    const parameters: string[] = [];

    suggestions.forEach(cmd => {
      if (cmd) {
        // Parameters are shown in angle brackets (e.g. <ip-address>)
        if (cmd.startsWith('<') && cmd.endsWith('>')) {
          parameters.push(cmd);
        } else {
          keywords.push(cmd);
        }
      }
    });

    // Display keywords first
    if (keywords.length > 0) {
      lines.push('  Komutlar:');
      keywords.forEach(cmd => {
        const description = modeDescriptions[cmd.toLowerCase()];
        if (description) {
          lines.push(`    ${cmd.padEnd(20)} - ${description}`);
        } else {
          lines.push(`    ${cmd}`);
        }
      });
    }

    // Display parameters separately
    if (parameters.length > 0) {
      if (keywords.length > 0) lines.push('');
      lines.push('  Parametreler:');
      parameters.forEach(param => {
        lines.push(`    ${param}`);
      });
    }
  }

  lines.push('');

  return lines.join('\n');
}

/**
 * Akıllı hata tahmin ve komut öneri sistemi
 */
function getEstimatedSuggestions(
  input: string,
  mode: CommandMode,
  state?: SwitchState
): string[] {
  const inputClean = input.trim().toLowerCase();
  if (!inputClean) return [];

  const words = inputClean.split(/\s+/);
  const lastWord = words[words.length - 1];
  const prefix = words.slice(0, -1).join(' ');

  const modeCommands = commandHelp[mode] || commandHelp.user;

  let effectivePrefix = prefix;
  let effectiveLastWord = lastWord;

  // Tüm girdinin geçerli bir prefix olup olmadığını kontrol et (örn: "do")
  const isEntireInputPrefix = !!modeCommands[inputClean] || Object.keys(commandPatterns).some(name => name.startsWith(inputClean + ' '));
  if (isEntireInputPrefix) {
    effectivePrefix = inputClean;
    effectiveLastWord = '';
  }

  // Kullanıcı tanımlı alias desteği
  if (state?.execAliases) {
    const sortedUserAliases = Object.entries(state.execAliases)
      .sort((a, b) => b[0].length - a[0].length);
    for (const [alias, fullCommand] of sortedUserAliases as [string, string][]) {
      const aliasLower = alias.toLowerCase();
      // Tam eşleşme: "si" → "show interfaces"
      if (inputClean === aliasLower) {
        effectivePrefix = fullCommand.trim().toLowerCase();
        effectiveLastWord = '';
        break;
      }
      // Prefix eşleşme: "si " ile başlayan → resolved komut + kalan
      if (inputClean.startsWith(aliasLower + ' ')) {
        const rest = inputClean.substring(aliasLower.length).trim();
        effectivePrefix = (fullCommand.trim().toLowerCase() + ' ' + rest).trim();
        effectiveLastWord = '';
        break;
      }
    }
  }

  const validNextWords = new Set<string>();

  const inferredDeviceType = state
    ? (state.deviceType === 'switch'
      ? (state.switchLayer === 'L3' ? 'switchL3' : 'switchL2')
      : state.deviceType || (state.switchLayer === 'FW' ? 'firewall' : state.switchLayer === 'L3' ? 'switchL3' : 'switchL2'))
    : 'switchL2';
  const capabilities = state ? getDeviceCapabilities({ type: inferredDeviceType as DeviceType } as Pick<CanvasDevice, 'type'>, state.switchModel) : undefined;

  // 1. commandHelp ağacından sonraki kelimeleri al
  if (effectivePrefix && modeCommands[effectivePrefix]) {
    modeCommands[effectivePrefix].forEach(cmd => validNextWords.add(cmd));
  } else if (!effectivePrefix) {
    (modeCommands[''] || []).forEach(cmd => validNextWords.add(cmd));
  }

  // 2. commandPatterns ağacından sonraki kelimeleri al
  for (const [patternName, pattern] of Object.entries(commandPatterns)) {
    if (!pattern.modes.includes(mode)) continue;
    if (capabilities && pattern.capability && !capabilities[pattern.capability]) continue;

    const patternWords = patternName.toLowerCase().split(/\s+/);
    if (effectivePrefix) {
      const prefixWords = effectivePrefix.split(/\s+/);
      let matchesPrefix = true;
      for (let i = 0; i < prefixWords.length; i++) {
        if (i >= patternWords.length || !patternWords[i].startsWith(prefixWords[i])) {
          matchesPrefix = false;
          break;
        }
      }
      if (matchesPrefix && patternWords.length > prefixWords.length) {
        validNextWords.add(patternWords[prefixWords.length]);
      }
    } else {
      validNextWords.add(patternWords[0]);
    }
  }

  const cleanNextWords = Array.from(validNextWords)
    .filter(s => s && !s.startsWith('<') && !s.endsWith('>'));

  // Eğer kullanıcının yazdığı son kelime varsa, en yakınları süz
  if (effectiveLastWord) {
    const closeMatches = cleanNextWords.filter(cmd =>
      cmd.startsWith(effectiveLastWord) || getLevenshteinDistance(effectiveLastWord, cmd) <= 2
    );
    if (closeMatches.length > 0) {
      return closeMatches.slice(0, 8);
    }
  }

  return cleanNextWords.slice(0, 8);
}

export { getInlineHelp, getEstimatedSuggestions };
