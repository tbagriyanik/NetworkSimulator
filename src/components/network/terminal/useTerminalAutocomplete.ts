'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { SwitchState, CommandMode } from '@/lib/network/types';
import type { Translations } from '@/contexts/LanguageContext';
import type { CanvasDevice } from '../NetworkTopology/types/networkTopology.types';
import { commandHelp } from '@/lib/network/executor';
import { commandPatterns } from '@/lib/network/parser';
import { toast } from '@/hooks/use-toast';
import { useTerminalTabCompletion } from './useTerminalTabCompletion';

interface UseTerminalAutocompleteOptions {
  input: string;
  setInput: (value: string) => void;
  state: SwitchState;
  devices: CanvasDevice[];
  deviceStates?: Map<string, SwitchState>;
  onCommand: (command: string) => Promise<unknown>;
  t: Translations;
  inputRef: RefObject<HTMLInputElement | null>;
}

export function useTerminalAutocomplete({
  input,
  setInput,
  state,
  devices,
  deviceStates,
  onCommand,
  t,
  inputRef,
}: UseTerminalAutocompleteOptions) {
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteIndex, setAutocompleteIndex] = useState(-1);
  const [tabCycleIndex, setTabCycleIndex] = useState(-1);
  const [lastTabInput, setLastTabInput] = useState('');

  const autocompleteRef = useRef<HTMLDivElement>(null);
  const autocompleteListRef = useRef<HTMLDivElement>(null);

  const expandCommandContext = useCallback((mode: keyof typeof commandHelp, rawValue: string) => {
    const isDoPrefix = rawValue.trim().toLowerCase().startsWith('do ') && mode !== 'privileged' && mode !== 'user';
    const effectiveMode = isDoPrefix ? 'privileged' : mode;
    const valueToProcess = isDoPrefix ? (rawValue.trim().substring(3) + (rawValue.endsWith(' ') ? ' ' : '')) : rawValue;

    const helpTree = commandHelp[effectiveMode] || commandHelp.user;
    const tokens = valueToProcess.trim().split(/\s+/).filter(Boolean);
    const hasTrailingSpace = valueToProcess.endsWith(' ');
    const contextTokens = hasTrailingSpace ? tokens : tokens.slice(0, -1);
    const currentWord = hasTrailingSpace ? '' : (tokens[tokens.length - 1] || '').toLowerCase();
    const contextKey = contextTokens.join(' ').toLowerCase();

    const finalContextTokens = isDoPrefix ? ['do', ...contextTokens] : contextTokens;

    let candidates: string[] = contextTokens.length === 0
      ? helpTree[''] || []
      : helpTree[contextKey] || [];

    if (candidates.length === 0 && contextKey) {
      const patternCandidates: string[] = [];
      for (const [name, pattern] of Object.entries(commandPatterns)) {
        if (!pattern.modes.includes(effectiveMode as CommandMode)) continue;
        const nameLower = name.toLowerCase();
        const prefix = contextKey + ' ';
        if (!nameLower.startsWith(prefix)) continue;
        const remaining = nameLower.substring(prefix.length).trim();
        if (!remaining) continue;
        const nextWord = remaining.split(' ')[0];
        if (nextWord && !patternCandidates.includes(nextWord)) {
          patternCandidates.push(nextWord);
        }
      }
      candidates = patternCandidates;
    }

    const filteredCandidates = currentWord
      ? candidates.filter(c => c.toLowerCase().startsWith(currentWord))
      : candidates;

    return {
      candidates: filteredCandidates,
      currentWord,
      contextTokens: finalContextTokens,
      hasTrailingSpace,
      allCandidates: candidates
    };
  }, []);

  const { getAutocompleteContext } = useTerminalTabCompletion({
    state,
    expandCommandContext,
  });

  const getAutocompleteSuggestions = useCallback((value: string) => {
    const isIpv4 = (raw: string) => /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/.test(raw);
    const collectKnownIps = () => {
      const fromDevices = (devices || [])
        .map((d) => d.ip)
        .filter((ip): ip is string => !!ip && isIpv4(ip) && ip !== '0.0.0.0' && ip !== '169.254.0.0');
      const fromStates = Array.from(deviceStates?.values() || [])
        .flatMap((s) => Object.values(s.ports || {}).map((p) => p?.ipAddress))
        .filter((ip): ip is string => !!ip && isIpv4(ip) && ip !== '0.0.0.0' && ip !== '169.254.0.0');
      return Array.from(new Set([...fromDevices, ...fromStates]));
    };

    const { candidates, currentWord } = getAutocompleteContext(value);
    const baseSuggestions = candidates.filter(
      opt => opt !== '?' && opt.toLowerCase().startsWith(currentWord)
    );

    const trimmed = value.trim();
    const expectsIpArg = /^(?:telnet|ssh|ping|curl|wget|ip\s+default-gateway|default-router|dns-server)\s+\S*$/i.test(trimmed)
      || /^(?:telnet|ssh|ping|curl|wget|ip\s+default-gateway|default-router|dns-server)\s*$/i.test(trimmed);

    if (!expectsIpArg) {
      return baseSuggestions.slice(0, 50);
    }

    const knownIps = collectKnownIps().filter((ip) => ip.toLowerCase().startsWith(currentWord));
    const merged = Array.from(new Set([...knownIps, ...baseSuggestions]));
    return merged.slice(0, 50);
  }, [getAutocompleteContext, devices, deviceStates]);

  const renderAutocompleteSuggestions = useMemo(
    () => getAutocompleteSuggestions(input),
    [getAutocompleteSuggestions, input]
  );

  const shouldShowAutocomplete = useMemo(
    () => showAutocomplete && input.trim().length > 0 && renderAutocompleteSuggestions.length > 0,
    [showAutocomplete, input, renderAutocompleteSuggestions]
  );

  useEffect(() => {
    if (!showAutocomplete) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (autocompleteRef.current && target && !autocompleteRef.current.contains(target)) {
        setShowAutocomplete(false);
        setAutocompleteIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAutocomplete]);

  useEffect(() => {
    if (showAutocomplete && autocompleteIndex >= 0) {
      const container = autocompleteListRef.current;
      const activeEl = autocompleteRef.current?.querySelector(`[data-autocomplete-index="${autocompleteIndex}"]`) as HTMLElement | null;
      if (container && activeEl) {
        const containerRect = container.getBoundingClientRect();
        const itemRect = activeEl.getBoundingClientRect();
        if (itemRect.top < containerRect.top) {
          container.scrollTop += itemRect.top - containerRect.top;
        } else if (itemRect.bottom > containerRect.bottom) {
          container.scrollTop += itemRect.bottom - containerRect.bottom;
        }
      }
    }
  }, [showAutocomplete, autocompleteIndex]);

  const handleTabComplete = useCallback(() => {
    const value = input;
    if (!value && tabCycleIndex === -1) return;

    const isIpv4 = (raw: string) => /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/.test(raw);
    const trimmed = value.trim();
    const hasTrailingSpace = /\s$/.test(value);

    const ipAddressMatch = trimmed.match(/^ip\s+address\s+(\S+)(?:\s+(\S+))?$/i);
    if (ipAddressMatch) {
      const ip = ipAddressMatch[1];
      const mask = ipAddressMatch[2];
      if (isIpv4(ip) && !mask) {
        setInput(`ip address ${ip} 255.255.255.0 `);
        setTabCycleIndex(-1);
        return;
      }
      if (isIpv4(ip) && mask && isIpv4(mask) && !hasTrailingSpace) {
        setInput(`${trimmed} `);
        setTabCycleIndex(-1);
        return;
      }
    }

    const singleIpArgMatch = trimmed.match(/^(?:ip\s+default-gateway|ping|curl|wget|telnet|ssh)\s+(\S+)$/i);
    if (singleIpArgMatch && isIpv4(singleIpArgMatch[1]) && !hasTrailingSpace) {
      setInput(`${trimmed} `);
      setTabCycleIndex(-1);
      return;
    }

    const networkMatch = trimmed.match(/^network\s+(\S+)(?:\s+(\S+))?$/i);
    if (networkMatch) {
      const netIp = networkMatch[1];
      const mask = networkMatch[2];
      if (isIpv4(netIp) && !mask) {
        setInput(`network ${netIp} 255.255.255.0 `);
        setTabCycleIndex(-1);
        return;
      }
      if (isIpv4(netIp) && mask && isIpv4(mask) && !hasTrailingSpace) {
        setInput(`${trimmed} `);
        setTabCycleIndex(-1);
        return;
      }
    }

    const dhcpSingleIpArgMatch = trimmed.match(/^(?:default-router|dns-server)\s+(\S+)$/i);
    if (dhcpSingleIpArgMatch && isIpv4(dhcpSingleIpArgMatch[1]) && !hasTrailingSpace) {
      setInput(`${trimmed} `);
      setTabCycleIndex(-1);
      return;
    }

    const context = getAutocompleteContext(value);
    const { candidates, currentWord, contextTokens } = context;

    const matches = candidates.filter((opt) => {
      if (opt === '?') return false;
      const optLower = opt.toLowerCase();
      const cwLower = currentWord.toLowerCase();
      if (optLower.startsWith(cwLower)) return true;

      const expandShorthand = (s: string) => s
        .replace(/^gi?(?=\d)/, 'gigabitethernet')
        .replace(/^fa?(?=\d)/, 'fastethernet')
        .replace(/^eth?(?=\d)/, 'ethernet')
        .replace(/^v(?=\d)/, 'vlan')
        .replace(/^lo(?=\d)/, 'loopback');

      if (cwLower.length > 0 && /^[a-z]+\d/i.test(cwLower)) {
        return optLower.startsWith(expandShorthand(cwLower));
      }
      return false;
    });

    if (matches.length > 0) {
      if (tabCycleIndex === -1) {
        setLastTabInput(value);
        setTabCycleIndex(0);
        const completion = matches[0];
        const prefix = contextTokens.join(' ');
        const nextValue = prefix ? `${prefix} ${completion} ` : `${completion} `;
        setInput(nextValue);

        if (matches.length > 1) {
          toast({
            title: t.multipleMatches,
            description: t.pressTabToCycle.replace('{count}', matches.length.toString()),
            duration: 1500
          });
        }
      } else {
        const nextIndex = (tabCycleIndex + 1) % matches.length;
        setTabCycleIndex(nextIndex);
        const originalParts = lastTabInput.split(/\s+/);
        const originalContext = lastTabInput.endsWith(' ') ? lastTabInput.trim() : originalParts.slice(0, -1).join(' ');
        const completion = matches[nextIndex];
        setInput(originalContext ? `${originalContext} ${completion} ` : `${completion} `);
      }

      setTimeout(() => {
        if (inputRef.current) {
          const len = inputRef.current.value.length;
          inputRef.current.setSelectionRange(len, len);
        }
      }, 0);
    } else if (value.trim()) {
      onCommand(value.trim() + ' ?');
    }
  }, [input, tabCycleIndex, lastTabInput, getAutocompleteContext, onCommand]);

  const buildCompletedInput = useCallback((selected: string) => {
    const { contextTokens, currentWord } = getAutocompleteContext(input);
    const isIp = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/.test(selected);
    if (isIp && currentWord) {
      const tokens = input.trim().split(/\s+/);
      const commandPrefix = input.endsWith(' ') ? input.trim() : tokens.slice(0, -1).join(' ');
      return commandPrefix ? `${commandPrefix} ${selected} ` : `${selected} `;
    }
    const prefix = contextTokens.join(' ');
    return prefix ? `${prefix} ${selected} ` : `${selected} `;
  }, [input, getAutocompleteContext]);

  const completeAutocompleteSelection = useCallback((selected: string) => {
    const completed = buildCompletedInput(selected);
    setInput(completed);
    setShowAutocomplete(false);
    setAutocompleteIndex(-1);
    return completed;
  }, [buildCompletedInput]);

  const refreshAutocomplete = useCallback((newValue: string) => {
    if (newValue.trim().length > 0) {
      const suggestions = getAutocompleteSuggestions(newValue);
      if (suggestions.length > 0) {
        setShowAutocomplete(true);
        setAutocompleteIndex(-1);
      } else {
        setShowAutocomplete(false);
      }
    } else {
      setShowAutocomplete(false);
    }
  }, [getAutocompleteSuggestions]);

  return {
    showAutocomplete,
    setShowAutocomplete,
    autocompleteIndex,
    setAutocompleteIndex,
    tabCycleIndex,
    setTabCycleIndex,
    lastTabInput,
    setLastTabInput,
    suggestions: renderAutocompleteSuggestions,
    shouldShowAutocomplete,
    autocompleteRef,
    autocompleteListRef,
    refreshAutocomplete,
    handleTabComplete,
    completeAutocompleteSelection,
  };
}
