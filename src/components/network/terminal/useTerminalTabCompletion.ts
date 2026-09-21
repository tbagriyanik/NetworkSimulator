'use client';

import { useCallback } from 'react';
import type { SwitchState } from '@/lib/network/types';
import { commandHelp } from '@/lib/network/executor';

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
    const helpTree = commandHelp[mode] || commandHelp.user || {};
    const contextKey = base.contextTokens.join(' ').toLowerCase();

    let candidates = base.candidates;
    if (helpTree[contextKey]) {
      candidates = helpTree[contextKey];
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
      const ifaceNames = state.ports ? Object.keys(state.ports) : ['GigabitEthernet0/0', 'GigabitEthernet0/1', 'FastEthernet0/1', 'Vlan1', 'Loopback0'];
      candidates = Array.from(new Set([...candidates, ...ifaceNames]));
    }

    return {
      ...base,
      candidates,
      allCandidates: candidates,
    };
  }, [state.currentMode, state.ports, expandCommandContext]);

  return { getAutocompleteContext };
}
