'use client';

import { useState, useRef, useEffect, KeyboardEvent, useCallback, useMemo, ClipboardEvent } from 'react';
import { SwitchState, CommandMode } from '@/lib/network/types';
import { Translations } from '@/contexts/LanguageContext';
import { getDeviceWifiConfig, getWirelessSignalStrength } from '@/lib/network/connectivity';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Laptop, X, CornerDownLeft, Search, Copy, Trash2, Download, Settings, Wifi, Type } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { TooltipWrapper } from '@/components/ui/TooltipWrapper';
import { ShortcutBadge } from '@/components/ui/ShortcutBadge';
import { toast } from "@/hooks/use-toast";
import { commandHelp } from '@/lib/network/executor';
import { commandPatterns } from '@/lib/network/parser';
import { ModernPanel } from '@/components/ui/ModernPanel';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-breakpoint';
import type { CanvasDevice } from './networkTopology.types';
import { RouterIcon, SwitchIcon } from './PCPanelWidgets';

export interface TerminalOutput {
  id: string;
  type: 'command' | 'output' | 'error' | 'success' | 'password-prompt';
  content: string;
  prompt?: string;
  realismLevel?: 'real' | 'stub' | 'sim-only';
  hint?: string | { tr: string; en: string };
  timestamp?: number;
}

export const BOOT_PROGRESS_MARKER = '\x00BOOT_PROGRESS\x00';

const QUICK_COMMANDS: Record<string, string[]> = {
  user: ['enable', 'show ip int brief', 'show version', 'ping '],
  privileged: ['conf t', 'show run', 'show ip route', 'show mac address-table', 'show vlan brief', 'wr', 'disable', 'exit'],
  config: ['int fa0/1', 'int gi0/1', 'vlan ', 'ip dhcp pool ', 'router ospf 1', 'hostname ', 'exit', 'end'],
  interface: ['ip add ', 'no shut', 'switchport mode access', 'switchport mode trunk', 'switchport access vlan ', 'exit', 'end'],
  'config-if-range': ['switchport mode access', 'switchport access vlan ', 'no shut', 'exit', 'end'],
  line: ['password ', 'login', 'exit', 'end'],
  vlan: ['name ', 'exit', 'end'],
  'router-config': ['network ', 'passive-interface ', 'exit', 'end'],
  'dhcp-config': ['network ', 'default-router ', 'dns-server ', 'exit', 'end'],
  'config-std-nacl': ['permit ', 'deny ', 'exit', 'end'],
  'config-ext-nacl': ['permit ', 'deny ', 'exit', 'end'],
  pc: ['ipconfig', 'ping ', 'tracert ', 'nslookup ', 'telnet ', 'ssh ', 'help', 'cls'],
  iot: ['help', 'cls']
};

// Global set — animasyon tamamlanan boot id'lerini tutar, tab değişiminde sıfırlanmaz
const completedBootIds = new Set<string>();

function BootProgressBar({ id, isDark, onDone, readyText = "Ready!" }: { id: string; isDark: boolean; onDone: (id: string) => void; readyText?: string }) {
  const [filled, setFilled] = useState(0);
  const [done, setDone] = useState(false);
  const total = 10;
  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);

  useEffect(() => {
    if (filled < total) {
      const timer = setTimeout(() => setFilled(f => f + 1), 180);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        setDone(true);
        onDoneRef.current(id);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [filled, id]);

  return (
    <span className={`font-mono ${isDark ? 'text-success-400' : 'text-success-600'}`}>
      {done ? (
        <span className="font-bold">{'#'.repeat(total)} {readyText}</span>
      ) : (
        <span className="inline-block min-w-[12ch]">{'#'.repeat(filled)}<span className="opacity-30">{'#'.repeat(total - filled)}</span></span>
      )}
    </span>
  );
}

interface TerminalProps {
  deviceId: string;
  deviceName: string;
  prompt: string;
  state: SwitchState;
  onCommand: (command: string) => Promise<unknown>;
  onClear: () => void;
  output: TerminalOutput[];
  isLoading: boolean;
  isConnectionError?: boolean;
  connectionErrorMessage?: string;
  isPoweredOff?: boolean;
  onTogglePower?: (deviceId: string) => void;
  onClose?: () => void;
  onQuickSettings?: () => void;
  t: Translations;
  theme: string;
  language: string;
  helpLevel?: 'beginner' | 'intermediate' | 'exam';
  onUpdateHistory?: (deviceId: string, history: string[]) => void;
  confirmDialog?: { show: boolean; message?: string; onConfirm: () => void } | null;
  setConfirmDialog?: (dialog: { show: boolean; message: string; action: string; onConfirm: () => void } | null) => void;
  onRequestFocus?: () => void;
  className?: string;
  title?: string;
  device?: CanvasDevice;
  devices?: CanvasDevice[];
  deviceStates?: Map<string, SwitchState>;
}

export type { TerminalProps };

export function Terminal({
  deviceId,
  deviceName,
  prompt,
  state,
  onCommand,
  onClear,
  output,
  isLoading,
  isConnectionError = false,
  isPoweredOff = false,
  onTogglePower,
  onClose,
  onQuickSettings,
  t,
  theme,
  language,
  helpLevel = 'beginner',
  onUpdateHistory,
  confirmDialog,
  setConfirmDialog,
  className,
  title,
  device,
  devices = [],
  deviceStates
}: TerminalProps) {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>(() => state.commandHistory || []);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [fontSize, setFontSize] = useState<number>(() => {
    try { return parseInt(localStorage.getItem('terminal-font-size') || '13', 10); } catch { return 13; }
  });

  // Mobile virtual keyboard height handling
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const handleResize = () => {
      if (!window.visualViewport) return;
      const height = window.innerHeight - window.visualViewport.height;
      setKeyboardHeight(Math.max(0, height));
    };

    window.visualViewport.addEventListener('resize', handleResize);
    return () => window.visualViewport?.removeEventListener('resize', handleResize);
  }, []);

  // State for displaying output
  const [displayedLines, setDisplayedLines] = useState<Array<{ id: string, type: string, content: string, prompt?: string, realismLevel?: 'real' | 'stub' | 'sim-only', hint?: string | { tr: string; en: string } }>>(() => {
    // Initialize from output on mount to show history when terminal opens
    const initialLines: Array<{ id: string, type: string, content: string, prompt?: string, realismLevel?: 'real' | 'stub' | 'sim-only', hint?: string | { tr: string; en: string } }> = [];
    if (output && output.length > 0) {
      output.forEach((outputItem) => {
        if (!outputItem || !outputItem.id) return;
        if (outputItem.content && outputItem.content.includes('\n')) {
          const lines = outputItem.content.split('\n');
          lines.forEach((line, index) => {
            initialLines.push({
              id: `${outputItem.id}-line-${index}`,
              type: outputItem.type,
              content: line,
              prompt: index === 0 ? outputItem.prompt : '',
              realismLevel: index === lines.length - 1 ? outputItem.realismLevel : undefined,
              hint: index === lines.length - 1 ? outputItem.hint : undefined
            });
          });
        } else {
          initialLines.push({
            id: outputItem.id,
            type: outputItem.type,
            content: outputItem.content,
            prompt: outputItem.prompt,
            realismLevel: outputItem.realismLevel,
            hint: outputItem.hint
          });
        }
      });
    }
    return initialLines;
  });
  const processedOutputIdsRef = useRef<Set<string>>(new Set());
  const cancelOutputRef = useRef(false);

  // Initialize processedOutputIdsRef with existing output IDs on mount
  useEffect(() => {
    if (output && output.length > 0) {
      const ids = new Set<string>();
      output.forEach((outputItem) => {
        if (outputItem && outputItem.id) {
          ids.add(outputItem.id);
        }
      });
      processedOutputIdsRef.current = ids;
    }
  }, []);

  // Undo/Redo state
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);

  // Autocomplete state
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteIndex, setAutocompleteIndex] = useState(-1);
  const [autocompleteNavigated, setAutocompleteNavigated] = useState(false);
  const [localPasswordPrompt, setLocalPasswordPrompt] = useState(false);

  const isDark = theme === 'dark';
  const isMobile = useIsMobile();


  // Determine device icon and color
  const deviceIconInfo = useMemo(() => {
    const deviceType = device?.type;
    const switchModel = state.switchModel;

    if (deviceType === 'router') {
      return { icon: RouterIcon, color: 'text-purple-400' };
    } else if (deviceType === 'switchL3' || switchModel === 'WS-C3650-24PS') {
      return { icon: SwitchIcon, color: 'text-purple-400', isL3: true };
    } else if (deviceType === 'switchL2' || switchModel === 'WS-C2960-24TT-L') {
      return { icon: SwitchIcon, color: 'text-success-400', isL3: false };
    } else if (deviceType === 'pc') {
      return { icon: Laptop, color: 'text-primary-400' };
    }
    return null;
  }, [device?.type, state.switchModel]);

  // Sync with global history
  useEffect(() => {
    const globalHistory = state.commandHistory || [];
    if (JSON.stringify(globalHistory) !== JSON.stringify(history)) {
      setTimeout(() => setHistory(globalHistory), 0);
      setTimeout(() => setHistoryIndex(-1), 0);
    }
  }, [state.commandHistory, deviceId]);

  const [tabCycleIndex, setTabCycleIndex] = useState(-1);
  const [lastTabInput, setLastTabInput] = useState('');
  const [bootVersion, setBootVersion] = useState(0);

  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);
  const wasWifiConnectedRef = useRef<boolean>(true);

  const isBooted = useMemo(() => {
    const bootMarkers = output.filter(o => o.content === BOOT_PROGRESS_MARKER);
    return bootMarkers.length === 0 || bootMarkers.every(m => completedBootIds.has(m.id));
  }, [output, bootVersion]);
  const isInputDisabled = isLoading || isConnectionError;

  useEffect(() => {
    if (isBooted && !isInputDisabled) {
      inputRef.current?.focus();
    }
  }, [isBooted]);

  const commandQueueRef = useRef<string[]>([]);
  const isProcessingQueueRef = useRef(false);
  const historyRef = useRef<string[]>(state.commandHistory || []);
  const isLoadingRef = useRef<boolean>(isLoading);
  const awaitingPasswordRef = useRef<boolean>(!!state.awaitingPassword);
  const confirmDialogOpenRef = useRef<boolean>(!!confirmDialog?.show);
  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    awaitingPasswordRef.current = !!state.awaitingPassword;
  }, [state.awaitingPassword]);

  useEffect(() => {
    confirmDialogOpenRef.current = !!confirmDialog?.show;
  }, [confirmDialog?.show]);

  // Check WiFi connectivity but do NOT auto-close terminal (user requested modals stay open)
  useEffect(() => {
    if (!device || !devices || !deviceStates) return;

    // Check if this device has WiFi and if it's connected
    if (device.type !== 'pc') return;

    // For PC devices, check WiFi signal strength
    const signalStrength = getWirelessSignalStrength(device, devices, deviceStates);
    const isCurrentlyConnected = signalStrength > 0;

    // Update the ref for next check but do NOT close terminal
    wasWifiConnectedRef.current = isCurrentlyConnected;
  }, [device, devices, deviceStates]);

  // Mobile back button handling removed - terminal should stay open per user request

  const clearTerminalView = useCallback(() => {
    cancelOutputRef.current = true;
    processedOutputIdsRef.current.clear();
    setDisplayedLines([]);
    onClear();
  }, [onClear]);

  const queueCommands = useCallback((commands: string[]) => {
    const sanitized = commands
      .map((line) => line.replace(/\r/g, '').trim())
      .filter((line) => line.length > 0);

    if (sanitized.length === 0) return;
    commandQueueRef.current.push(...sanitized);
  }, []);

  const processCommandQueue = useCallback(async () => {
    if (isProcessingQueueRef.current) return;
    isProcessingQueueRef.current = true;

    try {
      while (commandQueueRef.current.length > 0) {
        const nextCommand = commandQueueRef.current.shift();
        if (!nextCommand) continue;

        const currentHistory = historyRef.current;
        if (currentHistory[0] !== nextCommand) {
          const newHistory = [nextCommand, ...currentHistory].slice(0, 50);
          historyRef.current = newHistory;
          setHistory(newHistory);
          if (onUpdateHistory) onUpdateHistory(deviceId, newHistory);
        }
        setHistoryIndex(-1);
        setTabCycleIndex(-1);
        setShowAutocomplete(false);
        setAutocompleteIndex(-1);

        await onCommand(nextCommand);

        // Wait until the command lifecycle is fully settled before next command.
        // This prevents pasted commands from overlapping.
        await new Promise((resolve) => setTimeout(resolve, 20));
        let guard = 0;
        while (isLoadingRef.current && guard < 600) {
          await new Promise((resolve) => setTimeout(resolve, 25));
          guard += 1;
        }

        // If command triggered an interactive mode, pause the queue.
        if (awaitingPasswordRef.current || confirmDialogOpenRef.current) {
          break;
        }
      }
    } finally {
      isProcessingQueueRef.current = false;
    }
  }, [deviceId, onCommand, onUpdateHistory]);

  useEffect(() => {
    if (!showAutocomplete) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (autocompleteRef.current && target && !autocompleteRef.current.contains(target)) {
        setShowAutocomplete(false);
        setAutocompleteIndex(-1);
        setAutocompleteNavigated(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAutocomplete]);

  // Process output lines — show all at once, no artificial delays
  const prevFirstOutputIdRef = useRef<string | null>(null);
  const prevOutputLengthRef = useRef(0);
  const isInitializedRef = useRef(false);
  const lastDeviceIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Check if deviceId changed - if so, re-initialize from output
    const deviceChanged = lastDeviceIdRef.current !== null && lastDeviceIdRef.current !== deviceId;
    lastDeviceIdRef.current = deviceId;

    // On initial mount or device change, initialize displayedLines from output if empty
    if (!isInitializedRef.current || deviceChanged) {
      isInitializedRef.current = true;
      // If displayedLines is empty but output has content, process it
      if (displayedLines.length === 0 && output.length > 0) {
        const newLines: Array<{ id: string; type: string; content: string; prompt?: string; realismLevel?: 'real' | 'stub' | 'sim-only'; hint?: string | { tr: string; en: string } }> = [];
        output.forEach((outputItem) => {
          if (!outputItem || !outputItem.id) return;
          processedOutputIdsRef.current.add(outputItem.id);
          if (outputItem.content && outputItem.content.includes('\n')) {
            const lines = outputItem.content.split('\n');
            lines.forEach((line, index) => {
              newLines.push({
                id: `${outputItem.id}-line-${index}`,
                type: outputItem.type,
                content: line,
                prompt: index === 0 ? outputItem.prompt : '',
                realismLevel: index === lines.length - 1 ? outputItem.realismLevel : undefined,
                hint: index === lines.length - 1 ? outputItem.hint : undefined
              });
            });
          } else {
            newLines.push({
              id: outputItem.id,
              type: outputItem.type,
              content: outputItem.content,
              prompt: outputItem.prompt,
              realismLevel: outputItem.realismLevel,
              hint: outputItem.hint
            });
          }
        });
        if (newLines.length > 0) {
          setDisplayedLines(newLines);
        }
      }
      return;
    }

    if (output.length === 0) {
      setDisplayedLines([]);
      processedOutputIdsRef.current.clear();
      prevFirstOutputIdRef.current = null;
      prevOutputLengthRef.current = 0;
      return;
    }

    // Detect a full output reset (boot/reload): first item id changed
    const firstId = output[0]?.id ?? null;
    if (firstId !== prevFirstOutputIdRef.current) {
      prevFirstOutputIdRef.current = firstId;
      setDisplayedLines([]);
      processedOutputIdsRef.current.clear();
      cancelOutputRef.current = false;
    }

    const newLinesBatch: Array<{ id: string; type: string; content: string; prompt?: string; realismLevel?: 'real' | 'stub' | 'sim-only'; hint?: string | { tr: string; en: string } }> = [];

    for (const outputItem of output) {
      if (!outputItem || !outputItem.id) continue;
      if (processedOutputIdsRef.current.has(outputItem.id)) continue;
      processedOutputIdsRef.current.add(outputItem.id);

      if (outputItem.content && outputItem.content.includes('\n')) {
        const lines = outputItem.content.split('\n');
        lines.forEach((line, index) => {
          newLinesBatch.push({
            id: `${outputItem.id}-line-${index}`,
            type: outputItem.type,
            content: line,
            prompt: index === 0 ? outputItem.prompt : '',
            realismLevel: index === lines.length - 1 ? outputItem.realismLevel : undefined,
            hint: index === lines.length - 1 ? outputItem.hint : undefined
          });
        });
      } else {
        newLinesBatch.push({
          id: outputItem.id,
          type: outputItem.type,
          content: outputItem.content,
          prompt: outputItem.prompt,
          realismLevel: outputItem.realismLevel,
          hint: outputItem.hint
        });
      }
    }

    if (newLinesBatch.length > 0) {
      setDisplayedLines(prev => {
        const existingIds = new Set(prev.map(l => l.id));
        const toAdd = newLinesBatch.filter(l => !existingIds.has(l.id));
        return toAdd.length > 0 ? [...prev, ...toAdd] : prev;
      });
    }

    prevOutputLengthRef.current = output.length;
  }, [output, deviceId]);

  // Reset processed output IDs when modal opens (to re-render all output)
  useEffect(() => {
    // If displayedLines is empty but output has content, reset tracking to re-render
    if (displayedLines.length === 0 && output.length > 0) {
      processedOutputIdsRef.current.clear();
      prevFirstOutputIdRef.current = null;
    }
  }, [output.length, displayedLines.length]);

  // Clear command queue when switching devices (displayedLines re-initialization is handled by main effect)
  useEffect(() => {
    commandQueueRef.current = [];
    isProcessingQueueRef.current = false;
  }, [deviceId]);

  const isReloadConfirmationPending = false;

  // Command Context for Autocomplete
  const expandCommandContext = useCallback((mode: keyof typeof commandHelp, rawValue: string) => {
    const helpTree = commandHelp[mode] || commandHelp.user;
    const tokens = rawValue.trim().split(/\s+/).filter(Boolean);
    const hasTrailingSpace = rawValue.endsWith(' ');
    const contextTokens = hasTrailingSpace ? tokens : tokens.slice(0, -1);
    const currentWord = hasTrailingSpace ? '' : (tokens[tokens.length - 1] || '').toLowerCase();
    const contextKey = contextTokens.join(' ').toLowerCase();

    // 1. Try commandHelp tree first
    let candidates: string[] = contextTokens.length === 0
      ? helpTree[''] || []
      : helpTree[contextKey] || [];

    // 2. Fallback: derive from commandPatterns for multi-word prefixes (e.g. "no ip", "do ping")
    if (candidates.length === 0 && contextKey) {
      const patternCandidates: string[] = [];
      for (const [name, pattern] of Object.entries(commandPatterns)) {
        if (!pattern.modes.includes(mode as CommandMode)) continue;
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

    // 3. Filter candidates based on currentWord (for TAB completion)
    // This ensures TAB shows only matching options
    const filteredCandidates = currentWord
      ? candidates.filter(c => c.toLowerCase().startsWith(currentWord))
      : candidates;

    return {
      candidates: filteredCandidates,
      currentWord,
      contextTokens,
      hasTrailingSpace,
      allCandidates: candidates // Keep all candidates for ? help
    };
  }, []);

  // Syntax Highlighting for Commands
  const highlightCommand = useCallback((text: string) => {
    if (!text) return text;
    const parts = text.split(/\s+/);
    if (parts.length === 0) return text;

    return (
      <>
        <span className="text-accent-400 font-bold">{parts[0]}</span>
        {parts.length > 1 && (
          <span className="text-secondary-300"> {parts.slice(1).join(' ')}</span>
        )}
      </>
    );
  }, []);

  // Text search highlight
  const highlightText = useCallback((text: string) => {
    const q = searchQuery.trim();
    if (!q) return text;
    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(safe, 'gi');
    const parts = text.split(re);
    const matches = text.match(re);
    if (!matches) return text;
    const out: React.ReactNode[] = [];
    for (let i = 0; i < parts.length; i++) {
      if (parts[i]) out.push(<span key={`p-${i}`}>{parts[i]}</span>);
      if (matches[i]) {
        out.push(
          <mark key={`m-${i}`} className={cn('px-0.5 rounded', isDark ? 'bg-accent-500/30 text-accent-200' : 'bg-accent-200 text-secondary-900')}>
            {matches[i]}
          </mark>
        );
      }
    }
    return <>{out}</>;
  }, [searchQuery, isDark]);

  // Auto-scroll and focus
  useEffect(() => {
    if (terminalRef.current) {
      requestAnimationFrame(() => {
        if (terminalRef.current) {
          terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
      });
    }
    inputRef.current?.focus();
  }, [output, isLoading, deviceId]);

  // Auto-scroll when displayedLines updates (handles async content rendering)
  useEffect(() => {
    requestAnimationFrame(() => {
      if (terminalRef.current) {
        terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
      }
    });
    // Additional scroll to ensure it reaches the end
    setTimeout(() => {
      if (terminalRef.current) {
        terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
      }
    }, 50);
  }, [displayedLines]);

  useEffect(() => {
    if (state.awaitingPassword || confirmDialog?.show || isReloadConfirmationPending) {
      setTimeout(() => setInput(''), 0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [state.awaitingPassword, confirmDialog?.show, isReloadConfirmationPending]);

  useEffect(() => {
    // Keep password mode strictly tied to live device state.
    // Old password-prompt lines can remain in output history and must not lock input.
    setTimeout(() => setLocalPasswordPrompt(!!state.awaitingPassword), 0);
  }, [state.awaitingPassword]);

  const handleSubmit = async (cmdToExecute?: string) => {
    // Password mode: send whatever is typed (including empty) as password
    if (state.awaitingPassword || localPasswordPrompt) {
      const pwd = cmdToExecute ?? input;
      setInput('');
      await onCommand(pwd);
      return;
    }

    // Handle confirmation dialog - trigger inline confirmation or cancel
    if (confirmDialog?.show) {
      const trimmedInput = (cmdToExecute || input).trim().toLowerCase();
      setInput('');
      // 'n' or 'no' cancels the operation
      if (trimmedInput === 'n' || trimmedInput === 'no') {
        if (setConfirmDialog) {
          setConfirmDialog(null);
        }
        return;
      }
      // Any other input (including empty, 'confirm', 'y', 'yes') confirms
      if (confirmDialog.onConfirm) {
        confirmDialog.onConfirm();
      }
      return;
    }

    const command = (cmdToExecute || input).trim();
    if (!command || isInputDisabled) return;

    if (history[0] !== command) {
      const newHistory = [command, ...history].slice(0, 50);
      setHistory(newHistory);
      if (onUpdateHistory) onUpdateHistory(deviceId, newHistory);
    }
    setHistoryIndex(-1);
    setTabCycleIndex(-1);
    setInput('');
    setShowAutocomplete(false);
    setAutocompleteIndex(-1);
    await onCommand(command);
    // Scroll to input field after command execution
    setTimeout(() => {
      inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void handleSubmit();
  };

  const handleQuickCommand = (cmd: string) => {
    if (cmd.endsWith(' ')) {
      setInput(cmd);
      inputRef.current?.focus();
    } else {
      setInput('');
      void handleSubmit(cmd);
    }
  };

  const handlePaste = useCallback((e: ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text');
    if (!pastedText || !pastedText.includes('\n')) return;

    e.preventDefault();
    queueCommands(pastedText.split('\n'));
    setInput('');
    void processCommandQueue();
  }, [processCommandQueue, queueCommands]);

  const getAutocompleteContext = useCallback((value: string) => {
    const mode = state.currentMode;
    const base = expandCommandContext(mode, value);
    const helpTree = commandHelp[mode] || commandHelp.user || {};
    const contextKey = base.contextTokens.join(' ').toLowerCase();

    if (contextKey === 'conf' && helpTree['configure']) {
      return {
        ...base,
        candidates: helpTree['configure'],
        allCandidates: helpTree['configure'],
        contextTokens: ['configure']
      };
    }

    return base;
  }, [state.currentMode, expandCommandContext]);

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
        setInput(`ip address ${ip} 255.255.255.0`);
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
        setInput(`network ${netIp} 255.255.255.0`);
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

    // Use filtered candidates for TAB completion
    const matches = candidates.filter(
      opt => opt !== '?' && opt.toLowerCase().startsWith(currentWord)
    );

    if (matches.length > 0) {
      if (tabCycleIndex === -1) {
        setLastTabInput(value);
        setTabCycleIndex(0);
        const completion = matches[0];
        const prefix = contextTokens.join(' ');
        setInput(prefix ? `${prefix} ${completion} ` : `${completion} `);
      } else {
        const nextIndex = (tabCycleIndex + 1) % matches.length;
        setTabCycleIndex(nextIndex);
        const originalParts = lastTabInput.split(/\s+/);
        const originalContext = lastTabInput.endsWith(' ') ? lastTabInput.trim() : originalParts.slice(0, -1).join(' ');
        const completion = matches[nextIndex];
        setInput(originalContext ? `${originalContext} ${completion} ` : `${completion} `);
      }
    } else if (value.trim()) {
      // No matches - show help with all available options
      // This shows available commands/parameters for the current context
      onCommand(value.trim() + ' ?');
    }
  }, [input, tabCycleIndex, lastTabInput, getAutocompleteContext, onCommand]);

  // Undo/Redo helpers
  const handleUndo = useCallback(() => {
    if (undoStack.length > 0) {
      const newUndoStack = [...undoStack];
      const previousInput = newUndoStack.pop() || '';
      setRedoStack([input, ...redoStack]);
      setInput(previousInput);
      setUndoStack(newUndoStack);
    }
  }, [input, undoStack, redoStack]);

  const handleRedo = useCallback(() => {
    if (redoStack.length > 0) {
      const newRedoStack = [...redoStack];
      const nextInput = newRedoStack.shift() || '';
      setUndoStack([...undoStack, input]);
      setInput(nextInput);
      setRedoStack(newRedoStack);
    }
  }, [input, undoStack, redoStack]);

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
      return baseSuggestions.slice(0, 8);
    }

    const knownIps = collectKnownIps().filter((ip) => ip.toLowerCase().startsWith(currentWord));
    const merged = Array.from(new Set([...knownIps, ...baseSuggestions]));
    return merged.slice(0, 8);
  }, [getAutocompleteContext, devices, deviceStates]);

  const renderAutocompleteSuggestions = useMemo(
    () => getAutocompleteSuggestions(input),
    [getAutocompleteSuggestions, input]
  );

  const shouldShowAutocomplete = useMemo(
    () => showAutocomplete && input.trim().length > 0 && renderAutocompleteSuggestions.length > 0,
    [showAutocomplete, input, renderAutocompleteSuggestions]
  );

  const handleInputChange = useCallback((newValue: string) => {
    setUndoStack([...undoStack, input]);
    setRedoStack([]);
    setInput(newValue);
    setAutocompleteNavigated(false);

    // Autocomplete logic
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
  }, [input, undoStack, getAutocompleteSuggestions, onCommand, state.awaitingPassword, confirmDialog?.show]);

  const buildCompletedInput = useCallback((selected: string) => {
    const { contextTokens } = getAutocompleteContext(input);
    const prefix = contextTokens.join(' ');
    return prefix ? `${prefix} ${selected} ` : `${selected} `;
  }, [input, getAutocompleteContext]);

  const completeAutocompleteSelection = useCallback((selected: string) => {
    const completed = buildCompletedInput(selected);
    setInput(completed);
    setShowAutocomplete(false);
    setAutocompleteIndex(-1);
    setAutocompleteNavigated(false);
    return completed;
  }, [buildCompletedInput]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const autocompleteSuggestions = renderAutocompleteSuggestions;
    const canUseAutocomplete = showAutocomplete && autocompleteSuggestions.length > 0;

    // Terminal clear shortcut
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      setInput('');
      setShowAutocomplete(false);
      setAutocompleteIndex(-1);
      setAutocompleteNavigated(false);
      clearTerminalView();
      return;
    }

    // Terminal search shortcut
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      setSearchOpen(true);
      return;
    }

    // Handle ? for inline help
    if (e.key === '?' && !state.awaitingPassword && !confirmDialog?.show) {
      e.preventDefault();
      const currentInput = input;
      // Execute the command with ? suffix
      void onCommand(currentInput + '?');
      return;
    }

    if (e.key === 'Enter') {
      if (canUseAutocomplete && autocompleteNavigated) {
        e.preventDefault();
        const completed = completeAutocompleteSelection(autocompleteSuggestions[autocompleteIndex] || autocompleteSuggestions[0]);
        void handleSubmit(completed);
        return;
      }
      e.preventDefault();
      void handleSubmit();
      return;
    }
    // Escape cancels password/confirm and returns to normal input
    if (e.key === 'Escape') {
      if (state.awaitingPassword || confirmDialog?.show || isReloadConfirmationPending) {
        e.preventDefault();
        if (onCommand) {
          if (state.awaitingPassword) {
            onCommand('__PASSWORD_CANCELLED__');
          } else if (isReloadConfirmationPending) {
            // Send 'n' to cancel reload
            onCommand('n');
          }
        }
        if (state.awaitingPassword || localPasswordPrompt) {
          setLocalPasswordPrompt(false);
        }
        setInput('');
        return;
      }
      if (searchOpen) {
        e.preventDefault();
        setSearchOpen(false);
        setSearchQuery('');
        return;
      }
      if (showSettings) {
        e.preventDefault();
        setShowSettings(false);
        return;
      }
      // Close terminal with ESC when no dialogs are active
      if (onClose) {
        e.preventDefault();
        onClose();
        return;
      }
    }
    // Block history/tab navigation during password/confirm modes
    if (state.awaitingPassword || localPasswordPrompt || confirmDialog?.show) return;

    // Handle Ctrl+Z (Undo)
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      handleUndo();
      return;
    }

    // Handle Ctrl+Y (Redo)
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      handleRedo();
      return;
    }

    // Handle Ctrl+A (Select All)
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      if (inputRef.current) {
        inputRef.current.select();
      }
      return;
    }

    // Handle Ctrl+X (Cut)
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x') {
      e.preventDefault();
      if (inputRef.current && input) {
        const start = inputRef.current.selectionStart || 0;
        const end = inputRef.current.selectionEnd || 0;
        if (start !== end) {
          const selectedText = input.substring(start, end);
          navigator.clipboard.writeText(selectedText).then(() => {
            const newInput = input.substring(0, start) + input.substring(end);
            setInput(newInput);
          });
        }
      }
      return;
    }

    // Handle Ctrl+C (Copy)
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      if (inputRef.current && input) {
        const start = inputRef.current.selectionStart || 0;
        const end = inputRef.current.selectionEnd || 0;
        if (start !== end) {
          const selectedText = input.substring(start, end);
          navigator.clipboard.writeText(selectedText);
        } else if (input) {
          // If no selection, copy all
          navigator.clipboard.writeText(input);
        }
      }
      return;
    }

    // Handle Ctrl+V (Paste)
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
      e.preventDefault();
      navigator.clipboard.readText().then(text => {
        if (text && text.includes('\n')) {
          queueCommands(text.split('\n'));
          setInput('');
          void processCommandQueue();
          return;
        }

        if (inputRef.current) {
          const start = inputRef.current.selectionStart || 0;
          const end = inputRef.current.selectionEnd || 0;
          const newInput = input.substring(0, start) + text + input.substring(end);
          setInput(newInput);
          // Move cursor to end of pasted text
          setTimeout(() => {
            if (inputRef.current) {
              inputRef.current.setSelectionRange(start + text.length, start + text.length);
            }
          }, 0);
        }
      }).catch(() => {
        // Clipboard access denied, silently fail
      });
      return;
    }

    if (e.key === 'ArrowUp') {
      if (canUseAutocomplete) {
        e.preventDefault();
        setAutocompleteIndex(prev => {
          if (prev === -1) return autocompleteSuggestions.length - 1;
          return prev <= 0 ? autocompleteSuggestions.length - 1 : prev - 1;
        });
        setAutocompleteNavigated(true);
        return;
      }
      e.preventDefault();
      if (history.length > 0 && historyIndex < history.length - 1) {
        const ni = historyIndex + 1;
        setHistoryIndex(ni);
        setInput(history[ni]);
      }
    } else if (e.key === 'ArrowDown') {
      if (canUseAutocomplete) {
        e.preventDefault();
        setAutocompleteIndex(prev => {
          if (prev === -1) return 0;
          return (prev + 1) % autocompleteSuggestions.length;
        });
        setAutocompleteNavigated(true);
        return;
      }
      e.preventDefault();
      if (historyIndex > 0) {
        const ni = historyIndex - 1;
        setHistoryIndex(ni);
        setInput(history[ni]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput('');
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (canUseAutocomplete) {
        completeAutocompleteSelection(autocompleteSuggestions[autocompleteIndex] || autocompleteSuggestions[0]);
        return;
      }
      handleTabComplete();
    } else if (e.key === 'Escape') {
      if (showAutocomplete) {
        e.preventDefault();
        setShowAutocomplete(false);
        setAutocompleteIndex(-1);
        setAutocompleteNavigated(false);
        return;
      }
      e.preventDefault();
      clearTerminalView();
    } else {
      setTabCycleIndex(-1);
    }
  };

  const handleCopyAll = useCallback(async () => {
    try {
      const allText = output.map(line => line.type === 'command' ? `${line.prompt || prompt}${line.content}` : line.content).join('\n');
      await navigator.clipboard.writeText(allText);
      toast({ title: t.copy, description: language === 'tr' ? 'Terminal çıktısı panoya kopyalandı.' : 'Terminal output copied to clipboard.' });
    } catch {
      toast({ title: t.copy, description: language === 'tr' ? 'Pano erişimi engellendi.' : 'Clipboard access was blocked.', variant: "destructive" });
    }
  }, [output, prompt, t, language]);

  const exportTerminal = () => {
    const text = output.map(line => `${line.prompt || (line.type === 'command' ? prompt : '')}${line.content}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${deviceName}-cli-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Calculate WiFi signal strength for devices with WiFi
  const wifiSignalStrength = useMemo(() => {
    if (!device) return null;
    const wifi = getDeviceWifiConfig(device, deviceStates);
    if (!wifi || !wifi.enabled) return null;

    // AP mode devices always show full signal (they are broadcasting)
    if (wifi.mode === 'ap') return 5;

    // Client mode devices show signal based on distance to AP
    if (device.type === 'pc' && (wifi.mode === 'client' || wifi.mode === 'sta')) {
      return getWirelessSignalStrength(device, devices, deviceStates);
    }

    return null;
  }, [device, devices, deviceStates]);

  const getSignalIcon = (strength: number) => {
    if (strength === 0) return null;
    return (
      <div className="flex items-center gap-1">
        <Wifi className={cn(
          "w-4 h-4",
          strength >= 4 ? "text-success-500" :
            strength >= 3 ? "text-yellow-500" :
              strength >= 2 ? "text-warning-500" :
                "text-error-500"
        )} />
        <span className={cn(
          "text-[10px] font-black tracking-wider",
          strength >= 4 ? "text-success-500" :
            strength >= 3 ? "text-yellow-500" :
              strength >= 2 ? "text-warning-500" :
                "text-error-500"
        )}>
          {strength === 5 ? "100%" :
            strength === 4 ? "75%" :
              strength === 3 ? "50%" :
                strength === 2 ? "25%" :
                  "1%"}
        </span>
      </div>
    );
  };

  const headerAction = (
    <div className="flex items-center gap-1">
      {wifiSignalStrength !== null && wifiSignalStrength > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="h-8 px-2 flex items-center rounded-lg">
              {getSignalIcon(wifiSignalStrength)}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {t.wifiSignal}
          </TooltipContent>
        </Tooltip>
      )}
      {wifiSignalStrength !== null && wifiSignalStrength > 0 && (
        <div className={cn("w-px h-4 mx-1", isDark ? "bg-secondary-600" : "bg-border")} />
      )}
      <TooltipWrapper title={
        <div className="flex items-center gap-2">
          {t.search}
          {!isMobile && <ShortcutBadge shortcut="Ctrl+F" variant="primary" />}
        </div>
      }>
        <Button variant="ghost" size="icon" onClick={() => setSearchOpen(true)} className={cn("h-9 w-9 md:h-8 md:w-8 rounded-lg text-secondary-600 hover:text-secondary-900", isDark && "text-secondary-300 hover:text-secondary-100")} aria-controls="search-dialog">
          <Search className="w-4 h-4" aria-hidden="true" />
        </Button>
      </TooltipWrapper>
      <TooltipWrapper title={t.copy}>
        <Button variant="ghost" size="icon" onClick={handleCopyAll} className={cn("h-9 w-9 md:h-8 md:w-8 rounded-lg text-secondary-600 hover:text-secondary-900", isDark && "text-secondary-300 hover:text-secondary-100")}>
          <Copy className="w-4 h-4" aria-hidden="true" />
        </Button>
      </TooltipWrapper>
      <TooltipWrapper title={t.exportLabel}>
        <Button variant="ghost" size="icon" onClick={exportTerminal} className={cn("h-9 w-9 md:h-8 md:w-8 rounded-lg text-secondary-600 hover:text-secondary-900", isDark && "text-secondary-300 hover:text-secondary-100")}>
          <Download className="w-4 h-4" aria-hidden="true" />
        </Button>
      </TooltipWrapper>
      <TooltipWrapper title={t.fontLabel}>
        <Button variant="ghost" size="icon" onClick={() => setShowSettings(!showSettings)} className={cn("h-9 w-9 md:h-8 md:w-8 rounded-lg text-secondary-600 hover:text-secondary-900", showSettings && "bg-accent", isDark && "text-secondary-300 hover:text-secondary-100")}>
          <Type className="w-4 h-4" aria-hidden="true" />
        </Button>
      </TooltipWrapper>
      <div className={cn("w-px h-4 mx-1", isDark ? "bg-secondary-600" : "bg-border")} />
      <TooltipWrapper title={t.power}>
        <Button variant="ghost" size="icon" onClick={() => onTogglePower?.(deviceId)} className={cn("h-9 w-9 md:h-8 md:w-8 rounded-lg", isPoweredOff ? "text-error-500" : "text-success-500")}>
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v10" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 1 1-12.728 0" />
          </svg>
        </Button>
      </TooltipWrapper>
      {isMobile && onQuickSettings && (
        <TooltipWrapper title={t.quickSettingsAndTasks}>
          <Button variant="ghost" size="icon" onClick={onQuickSettings} className={cn("h-9 w-9 rounded-lg text-secondary-600 hover:text-secondary-900", isDark && "text-secondary-300 hover:text-secondary-100")}>
            <Settings className="w-4 h-4" aria-hidden="true" />
          </Button>
        </TooltipWrapper>
      )}
      {isMobile && (device?.type === 'firewall' || device?.type === 'pc' || device?.type === 'iot') && onClose && (
        <TooltipWrapper title={t.close || 'Close'}>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-9 w-9 rounded-lg hover:bg-error-500 hover:text-white dark:hover:bg-error-600">
            <X className="w-4 h-4" aria-hidden="true" />
          </Button>
        </TooltipWrapper>
      )}
    </div>
  );

  return (
    <ModernPanel
      id={`terminal-${deviceId}`}
      title={title || deviceName}
      headerStart={
        deviceIconInfo && (
          <span className={`shrink-0 ${deviceIconInfo.color}`}>
            {deviceIconInfo.icon === RouterIcon ? (
              <RouterIcon className="w-4 h-4" />
            ) : deviceIconInfo.icon === SwitchIcon ? (
              <SwitchIcon className="w-4 h-4" isL3={deviceIconInfo.isL3} />
            ) : (
              <deviceIconInfo.icon className="w-4 h-4" />
            )}
          </span>
        )
      }
      onClose={onClose}
      headerAction={headerAction}
      collapsible={false}
      noPadding
      mobileOnlyClose
      className={cn("flex flex-col h-full max-h-[85vh] sm:max-h-none", className)}
      style={{ height: '100%' }}
    >
      <div className={cn("flex flex-col h-full overflow-hidden terminal-container max-h-[75vh] sm:max-h-none", isDark ? "bg-black" : "bg-secondary-50")}>
        {/* Settings Bar */}
        {showSettings && (
          <div className="px-4 py-2 border-b bg-muted/30 flex items-center gap-4 animate-in slide-in-from-top-2">
            <label className="text-[10px] font-black tracking-widest text-muted-foreground whitespace-nowrap">
              {t.fontSizeLabel}: {fontSize}px
            </label>
            <input
              type="range" min="10" max="20" value={fontSize}
              aria-label={t.fontSizeLabel}
              onChange={(e) => { const v = parseInt(e.target.value); setFontSize(v); try { localStorage.setItem('terminal-font-size', String(v)); } catch { } }}
              className="flex-1 h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <Button variant="ghost" size="sm" onClick={clearTerminalView} className="h-7 text-[10px] font-black  tracking-widest text-error-500 gap-1.5">
              <Trash2 className="w-3 h-3" />
              {t.clearTerminalBtn}
              <ShortcutBadge shortcut="Ctrl+L" variant="danger" className="scale-75 origin-right" />
            </Button>
          </div>
        )}

        <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
          <div
            ref={terminalRef}
            className={cn(
              "flex-1 overflow-y-auto overflow-x-hidden font-geist-mono leading-relaxed custom-scrollbar min-h-0",
              isMobile ? "mobile-scroll p-3 pb-36" : "p-6 pb-32",
              isPoweredOff ? "bg-black" : (isDark ? "bg-black" : "bg-secondary-50")
            )}
            style={{
              fontSize: `${fontSize}px`,
              paddingBottom: isMobile && keyboardHeight > 0 ? `${keyboardHeight + 20}px` : undefined
            }}
          >
            {isPoweredOff ? (
              <div className="h-full flex flex-col items-center justify-center gap-3">
                <svg className="w-16 h-16 text-error-600 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v10" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 1 1-12.728 0" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.36 5.64a9 9 0 1 1-12.73 0" />
                </svg>
              </div>
            ) : (
              <div className="space-y-1.5">
                {/* Show all output with natural scrolling */}
                {displayedLines.filter(line => line != null).map((line) => (
                  <div key={line.id} className="animate-in fade-in slide-in-from-left-1 duration-200 break-words overflow-hidden">
                    {line.type === 'command' ? (
                      <div className="flex gap-2 text-accent-500 font-bold group flex-wrap">
                        {deviceIconInfo && (
                          <span className={`shrink-0 ${deviceIconInfo.color}`}>
                            {deviceIconInfo.icon === RouterIcon ? (
                              <RouterIcon className="w-4 h-4" />
                            ) : deviceIconInfo.icon === SwitchIcon ? (
                              <SwitchIcon className="w-4 h-4" isL3={deviceIconInfo.isL3} />
                            ) : (
                              <deviceIconInfo.icon className="w-4 h-4" />
                            )}
                          </span>
                        )}
                        <span className="shrink-0 opacity-40 select-none">{line.prompt || prompt}</span>
                        <span className={isDark ? "text-secondary-100" : "text-secondary-900"}>{highlightCommand(line.content)}</span>
                      </div>
                    ) : (
                      <>
                        <div className={cn(
                          "whitespace-pre-wrap break-words overflow-hidden flex items-start gap-2",
                          line.type === 'error' ? "text-error-500" :
                          (line.type === 'success' ?
                            (line.realismLevel === 'stub' ? "text-warning-500" :
                             line.realismLevel === 'sim-only' ? "text-primary-500" : "text-success-500")
                            : (isDark ? "text-secondary-300" : "text-secondary-700"))
                        )}>
                          {line.realismLevel === 'stub' && <span className="shrink-0 mt-1">⚠️</span>}
                          {line.realismLevel === 'sim-only' && <span className="shrink-0 mt-1">ℹ️</span>}
                          <div className="flex-1">
                            {line.content === BOOT_PROGRESS_MARKER
                              ? (completedBootIds.has(line.id)
                                ? <span className={`font-mono font-bold ${isDark ? 'text-success-400' : 'text-success-600'}`}>{'#'.repeat(10)} {t.bootReady}</span>
                                : <BootProgressBar key={line.id} id={line.id} isDark={isDark} readyText={t.bootReady} onDone={(id) => { completedBootIds.add(id); setBootVersion(v => v + 1); }} />)
                              : highlightText(line.content)}
                          </div>
                        </div>
                        {line.hint && (helpLevel === 'beginner' || (helpLevel === 'intermediate' && line.type === 'error')) && (
                          <div className={cn(
                            "mt-1 mb-2 p-2 rounded-lg border flex gap-2 animate-in zoom-in-95 duration-300",
                            isDark ? "bg-accent-500/5 border-accent-500/20 text-accent-200" : "bg-accent-50 border-accent-200 text-accent-800"
                          )}>
                            <span className="shrink-0">💡</span>
                            <div className="text-[11px] leading-relaxed">
                              <span className="font-black uppercase tracking-tighter mr-1 opacity-70">
                                {language === 'tr' ? 'Eğitici Not:' : 'Learning Note:'}
                              </span>
                              {typeof line.hint === 'string' ? line.hint : (language === 'tr' ? line.hint?.tr : line.hint?.en)}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex items-center gap-2 text-primary/50 italic py-1 animate-pulse">
                    <span className="text-[10px] font-black tracking-widest">{t.processing}...</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {!isPoweredOff && (
            <div onClick={() => inputRef.current?.focus()} className={cn(
              "absolute inset-x-0 bottom-0 z-20 border-t bg-muted/95 backdrop-blur-sm",
              isMobile ? "p-2 pb-safe" : "p-3"
            )}>
              {isMobile && !state.awaitingPassword && !confirmDialog?.show && (
                <div className="flex gap-1.5 overflow-x-auto pb-2 mb-1 px-1 no-scrollbar">
                  {(device?.type === 'pc' ? QUICK_COMMANDS.pc : device?.type === 'iot' ? QUICK_COMMANDS.iot : QUICK_COMMANDS[state.currentMode] || []).map((cmd) => (
                    <Button
                      key={cmd}
                      type="button"
                      variant="secondary"
                      size="sm"
                      className={cn(
                        "h-8 px-3 text-[11px] font-bold tracking-tight whitespace-nowrap rounded-lg flex-shrink-0 border shadow-sm",
                        isDark
                          ? "bg-secondary-800/80 border-secondary-700 text-secondary-300 active:bg-secondary-700"
                          : "bg-white border-secondary-200 text-secondary-600 active:bg-secondary-100"
                      )}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleQuickCommand(cmd);
                      }}
                    >
                      {cmd.trim()}
                    </Button>
                  ))}
                </div>
              )}
              <form onSubmit={handleFormSubmit} className="flex items-center gap-3 relative">
                {/* Contextual hint above input for confirm/reload states */}
                {(confirmDialog?.show || isReloadConfirmationPending) && helpLevel !== 'exam' && (
                  <div className="absolute -top-7 left-4 right-4 text-[10px] font-black tracking-widest text-warning-400 animate-pulse">
                    {confirmDialog?.show
                      ? (confirmDialog.message || t.pressEnterToConfirm)
                      : `${t.pressEnterToConfirm} [confirm]`}
                  </div>
                )}
                <div
                  onClick={() => inputRef.current?.focus()}
                  className={cn(
                  "flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 bg-background rounded-lg border flex-1 group focus-within:ring-1 transition-all shadow-inner overflow-hidden",
                  state.awaitingPassword || localPasswordPrompt
                    ? "border-warning-500/50 focus-within:ring-warning-500/50"
                    : confirmDialog?.show || isReloadConfirmationPending
                      ? "border-warning-500/50 focus-within:ring-warning-500/50"
                      : "border-input focus-within:ring-primary/50",
                  isMobile && "px-3 py-2"
                )}>
                  {deviceIconInfo && (
                    <span className={`shrink-0 ${deviceIconInfo.color}`}>
                      {deviceIconInfo.icon === RouterIcon ? (
                        <RouterIcon className="w-4 h-4" />
                      ) : deviceIconInfo.icon === SwitchIcon ? (
                        <SwitchIcon className="w-4 h-4" isL3={deviceIconInfo.isL3} />
                      ) : (
                        <deviceIconInfo.icon className="w-4 h-4" />
                      )}
                    </span>
                  )}
                  <span className={cn(
                    "font-geist-mono font-bold text-[10px] sm:text-xs select-none opacity-40 group-focus-within:opacity-100 transition-opacity shrink-0 truncate max-w-[80px] sm:max-w-none md:max-w-[150px]",
                    state.awaitingPassword || localPasswordPrompt || confirmDialog?.show || isReloadConfirmationPending
                      ? "text-warning-400"
                      : "text-primary"
                  )}>
                    {state.awaitingPassword || localPasswordPrompt
                      ? (language === 'tr' ? 'Parola:' : 'Password:')
                      : confirmDialog?.show || isReloadConfirmationPending
                        ? '[confirm]'
                        : prompt}
                  </span>
                  <input
                    ref={inputRef}
                    data-terminal-input
                    type={state.awaitingPassword || localPasswordPrompt ? 'password' : 'text'}
                    value={input}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onPaste={handlePaste}
                    onKeyDown={handleKeyDown}
                    onFocus={() => {
                      // Scroll input into view on mobile when keyboard opens
                      if (isMobile) {
                        setTimeout(() => {
                          inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }, 400);
                      }
                    }}
                    disabled={isInputDisabled}
                    className="flex-1 bg-transparent border-none outline-none font-geist-mono text-[16px] sm:text-[13px] placeholder:text-muted-foreground/50 min-w-0"
                    placeholder={
                      state.awaitingPassword || localPasswordPrompt
                        ? t.enterPassword
                        : confirmDialog?.show || isReloadConfirmationPending
                          ? t.typeCommandPlaceholder
                          : t.typeCommand
                    }
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
                {(state.awaitingPassword || localPasswordPrompt || confirmDialog?.show || isReloadConfirmationPending) && (
                  <Button
                    type="button"
                    disabled={isInputDisabled}
                    variant="ghost"
                    className="shrink-0 rounded-xl hover:bg-error-500/20 text-error-500 px-2 h-9 text-xs"
                    onClick={() => {
                      if (onCommand) {
                        if (state.awaitingPassword || localPasswordPrompt) {
                          onCommand('__PASSWORD_CANCELLED__');
                        } else if (isReloadConfirmationPending) {
                          // Send 'n' to cancel reload
                          onCommand('n');
                        }
                      }
                      if (state.awaitingPassword || localPasswordPrompt) {
                        setLocalPasswordPrompt(false);
                      }
                      setInput('');
                    }}
                    title={t.cancel}
                  >
                    <X className={cn("w-4 h-4 mr-1", isMobile && "w-3 h-3")} />
                    <span className="text-error-600 dark:text-error-400 font-medium">{t.cancel}</span>
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={isInputDisabled}
                  className={cn(
                    "shrink-0 rounded-xl shadow-lg px-3 bg-secondary-800 text-white hover:bg-secondary-700 dark:bg-white dark:text-secondary-900 dark:hover:bg-secondary-200",
                    isMobile ? "h-9 text-xs" : "h-11 text-sm",
                    (state.awaitingPassword || localPasswordPrompt || confirmDialog?.show || isReloadConfirmationPending) && "bg-warning-500 hover:bg-warning-600 text-white"
                  )}
                >
                  <span className="rounded-md p-1"><CornerDownLeft className={cn("w-4 h-4 text-white dark:text-secondary-900", isMobile && "w-3 h-3")} /></span>
                </Button>
              </form>

              {/* Autocomplete Dropdown */}
              {shouldShowAutocomplete && (
                <div
                  ref={autocompleteRef}
                  className="absolute bottom-16 sm:bottom-20 left-2 sm:left-4 z-20 w-[min(420px,calc(100%-1rem))]"
                >
                  <div className={cn(
                    "rounded-lg border shadow-xl overflow-hidden",
                    isDark ? "bg-secondary-800 border-secondary-700" : "bg-white border-secondary-200"
                  )}>
                    <div className="max-h-40 overflow-y-auto overflow-x-hidden font-geist-mono">
                      {renderAutocompleteSuggestions.map((cmd, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            completeAutocompleteSelection(cmd);
                            inputRef.current?.focus();
                          }}
                          className={cn(
                            "w-full text-left px-2.5 py-1 text-[11px] font-geist-mono transition-colors",
                            autocompleteIndex >= 0 && idx === autocompleteIndex
                              ? (isDark ? "bg-accent-500/20 text-accent-200" : "bg-accent-50 text-accent-900")
                              : (isDark ? "text-secondary-300 hover:bg-primary/10" : "text-secondary-700 hover:bg-primary/10")
                          )}
                        >
                          {cmd}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent aria-modal="true">
          <DialogHeader>
            <DialogTitle>{t.search}</DialogTitle>
            <DialogDescription>
              {t.searchTerminal}
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.search + "..."}
              className="pr-9"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-secondary-200 dark:hover:bg-secondary-700 text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>
      {/* ... Password and Confirm Dialogs ... */}
    </ModernPanel>
  );
}
