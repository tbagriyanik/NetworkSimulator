'use client';

import { useCallback } from 'react';
import type { SwitchState } from '@/lib/network/types';
import { commandHelp } from '@/lib/network/executor';
import { buildModeHelpFromPatterns } from '@/lib/network/executorInlineHelp';

interface AutocompleteContextOptions {
  state: SwitchState;
  expandCommandContext: (mode: keyof typeof commandHelp, rawValue: string) => {
    candidates: string[];
    currentWord: string;
    contextTokens: string[];
    hasTrailingSpace: boolean;
    allCandidates: string[];
  };
}

export function useTerminalTabCompletion({
  state,
  expandCommandContext,
}: AutocompleteContextOptions) {
  const getAutocompleteContext = useCallback((value: string) => {
    const mode = state.currentMode;
    const base = expandCommandContext(mode, value);
    const helpTree = commandHelp[mode] || buildModeHelpFromPatterns(mode) || commandHelp.user || {};
    const contextKey = base.contextTokens.join(' ').toLowerCase();

    let candidates = base.candidates;
    if (helpTree[contextKey]) {
      candidates = helpTree[contextKey];
    } else if (contextKey === '' && helpTree['']) {
      candidates = helpTree[''];
    }

    // Pipe filter autocomplete (e.g. "show run | inc" -> include, exclude, begin, section)
    const pipeIdx = value.lastIndexOf('|');
    if (pipeIdx !== -1) {
      const pipePart = value.substring(pipeIdx + 1).trimStart();
      const pipeModifiers = ['include', 'exclude', 'begin', 'section'];
      const currentPipeWord = pipePart.split(/\s+/)[0]?.toLowerCase() || '';
      const filtered = currentPipeWord
        ? pipeModifiers.filter(m => m.startsWith(currentPipeWord))
        : pipeModifiers;
      return {
        ...base,
        candidates: filtered,
        allCandidates: pipeModifiers,
        currentWord: currentPipeWord,
      };
    }

    const isInterfaceContext = base.contextTokens.some(t => ['interface', 'int'].includes(t.toLowerCase()));
    if (isInterfaceContext) {
      const defaultIfaces = [
        'GigabitEthernet0/0', 'GigabitEthernet0/1', 'GigabitEthernet0/2', 'GigabitEthernet0/3',
        'FastEthernet0/1', 'FastEthernet0/2', 'FastEthernet0/3', 'FastEthernet0/4',
        'Vlan1', 'Vlan10', 'Vlan20', 'Loopback0', 'Serial0/0/0', 'Tunnel0', 'Port-channel1', 'Eth0'
      ];
      const configuredIfaces = state.ports ? Object.keys(state.ports) : [];
      const allIfaces = Array.from(new Set([...configuredIfaces, ...defaultIfaces]));
      candidates = Array.from(new Set([...candidates, ...allIfaces]));
    }

    return {
      ...base,
      candidates,
      allCandidates: candidates,
    };
  }, [state.currentMode, state.ports, expandCommandContext]);

  return { getAutocompleteContext };
}

