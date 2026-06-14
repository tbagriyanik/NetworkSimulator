import { commandHelp } from '@/lib/network/executor';

/** Expands autocomplete context for the given command mode and raw input value */
export const expandCommandContext = (mode: keyof typeof commandHelp, rawValue: string) => {
    const helpTree = commandHelp[mode] || commandHelp.user;
    const tokens = rawValue.trim().split(/\s+/).filter(Boolean);
    const hasTrailingSpace = rawValue.endsWith(' ');
    const contextTokens = hasTrailingSpace ? tokens : tokens.slice(0, -1);
    const currentWord = hasTrailingSpace ? '' : (tokens[tokens.length - 1] || '').toLowerCase();
    const contextKey = contextTokens.join(' ').toLowerCase();

    // Get all candidates
    const candidates = contextTokens.length === 0 ? (helpTree[''] || []) : (helpTree[contextKey] || []);

    // Filter candidates based on currentWord (for TAB completion)
    const filteredCandidates = currentWord
        ? candidates.filter(c => c.toLowerCase().startsWith(currentWord))
        : candidates;

    return {
        candidates: filteredCandidates,
        currentWord,
        contextTokens,
        allCandidates: candidates // Keep all candidates for ? help
    };
};

/** Available commands in the PC desktop (CMD) terminal */
export const DESKTOP_COMMANDS = [
    'ipconfig',
    'ping',
    'tracert',
    'telnet',
    'ssh',
    'ftp',
    'mail',
    'netstat',
    'nbtstat',
    'getmac',
    'nslookup',
    'curl',
    'wget',
    'arp',
    'hostname',
    'dir',
    'ver',
    'cls',
    'exit',
    'quit',
    'snake',
    'help',
    '?',
] as const;
