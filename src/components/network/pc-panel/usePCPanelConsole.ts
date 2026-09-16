import type React from 'react';
import { useCallback, useEffect, useMemo, useState, type RefObject } from 'react';
import type { SwitchState } from '@/lib/network/types';
import type { TerminalOutput } from '../Terminal';
import type { CanvasDevice, CanvasConnection } from '../NetworkTopology/types/networkTopology.types';
import type { PCActiveTab, OutputLine } from './PCPanel.types';
import { getConsoleDevice } from './pcTerminal.utils';
import { toast } from '@/hooks/use-toast';

interface UsePCPanelConsoleTexts {
  consolePasswordErrorTitle: string;
  consolePasswordErrorDescription: string;
  pcConnectionError: string;
}

interface UsePCPanelConsoleOptions {
  deviceId: string;
  topologyDevices: CanvasDevice[];
  topologyConnections: CanvasConnection[];
  deviceStates: Map<string, SwitchState> | undefined;
  deviceOutputs: Map<string, TerminalOutput[]> | undefined;
  isPcPoweredOff: boolean;
  activeTab: PCActiveTab;
  inputRef: RefObject<HTMLInputElement | null>;
  setInput: (v: string) => void;
  setPcOutput: React.Dispatch<React.SetStateAction<OutputLine[]>>;
  onExecuteDeviceCommand?: (deviceId: string, command: string) => Promise<unknown>;
  t: UsePCPanelConsoleTexts;
}

/**
 * Console/serial connection lifecycle, extracted from PCPanel orchestrator:
 * connection state, power on/off handling, password & confirm dialogs,
 * and the connect action.
 */
export function usePCPanelConsole({
  deviceId,
  topologyDevices,
  topologyConnections,
  deviceStates,
  deviceOutputs,
  isPcPoweredOff,
  activeTab,
  inputRef,
  setInput,
  setPcOutput,
  onExecuteDeviceCommand,
  t,
}: UsePCPanelConsoleOptions) {
  // Console connection state
  const [isConsoleConnected, setIsConsoleConnected] = useState(false);
  const [connectedDeviceId, setConnectedDeviceId] = useState<string | null>(null);
  const [consoleConnectionTime, setConsoleConnectionTime] = useState<number>(0);
  const [consolePasswordAttempted, setConsolePasswordAttempted] = useState(false);

  // Disconnect console when PC powers off
  useEffect(() => {
    if (isPcPoweredOff && isConsoleConnected) {
      setTimeout(() => setIsConsoleConnected(false), 0);
      setTimeout(() => setConsoleConnectionTime(0), 0);
      // Don't clear connectedDeviceId so we can reconnect when power comes back on
    }
  }, [isPcPoweredOff, isConsoleConnected]);

  // Reconnect console when PC powers on if it was connected before
  useEffect(() => {
    if (!isPcPoweredOff && connectedDeviceId && !isConsoleConnected) {
      // Auto-reconnect to the same device
      const device = topologyDevices.find(d => d.id === connectedDeviceId);
      if (device && device.status !== 'offline') {
        setTimeout(() => setConsoleConnectionTime(Date.now()), 0);
        setTimeout(() => setIsConsoleConnected(true), 0);
      }
    }
  }, [isPcPoweredOff, connectedDeviceId, isConsoleConnected, topologyDevices]);

  const getConsoleDeviceCallback = useCallback(() => {
    return getConsoleDevice({
      deviceId,
      topologyDevices,
      topologyConnections: topologyConnections as unknown as CanvasConnection[]
    });
  }, [deviceId, topologyConnections, topologyDevices]);

  const consoleDevice = getConsoleDeviceCallback();

  const connectedConsoleDevice = useMemo(() => {
    if (!connectedDeviceId) return null;
    return topologyDevices.find(d => d.id === connectedDeviceId) || null;
  }, [connectedDeviceId, topologyDevices]);

  const isConsoleTargetPoweredOff = isConsoleConnected && !!connectedConsoleDevice && connectedConsoleDevice.status === 'offline';
  const isCmdInputDisabled = isPcPoweredOff;
  const consoleAwaitingPassword = !!(connectedDeviceId && deviceStates?.get(connectedDeviceId)?.awaitingPassword);
  const isConsoleInputDisabled = isPcPoweredOff || !isConsoleConnected || isConsoleTargetPoweredOff;

  // Detect password/confirm states from device state
  const consoleNeedsPassword = useMemo(() => {
    if (!isConsoleConnected || !connectedDeviceId) return false;
    const state = deviceStates?.get(connectedDeviceId);
    // Only show password prompt if explicitly awaiting password
    return state?.awaitingPassword === true;
  }, [isConsoleConnected, connectedDeviceId, deviceStates]);

  const consoleReloadPending = false;

  const consoleConfirmDialog = useMemo(() => {
    if (!isConsoleConnected || !connectedDeviceId) return null;
    // Don't show confirm dialog if password is still being entered
    if (consoleNeedsPassword) return null;
    const output = deviceOutputs?.get(connectedDeviceId) || [];
    const confirmLine = output.find((line: TerminalOutput) => line.type === 'output' && /\[confirm\]/i.test(line.content));
    if (confirmLine) {
      return { show: true, message: confirmLine.content };
    }
    return null;
  }, [isConsoleConnected, connectedDeviceId, deviceOutputs, consoleNeedsPassword]);

  // Keep password prompts focused so SSH/Telnet input is immediately usable.
  useEffect(() => {
    if (activeTab !== 'terminal' || !isConsoleConnected) return;
    if (!consoleNeedsPassword && !consoleConfirmDialog?.show && !consoleReloadPending) return;
    const timer = setTimeout(() => {
      if (consoleNeedsPassword) setInput('');
      inputRef.current?.focus();
      inputRef.current?.select?.();
    }, 50);
    return () => clearTimeout(timer);
  }, [activeTab, isConsoleConnected, consoleNeedsPassword, consoleConfirmDialog?.show, consoleReloadPending, inputRef, setInput]);

  const consoleAuthenticated = useMemo(() => {
    if (!connectedDeviceId) return true;
    return deviceStates?.get(connectedDeviceId)?.consoleAuthenticated !== false;
  }, [connectedDeviceId, deviceStates]);

  useEffect(() => {
    if (!connectedDeviceId) return;
    if (consolePasswordAttempted && consoleAwaitingPassword) {
      toast({
        title: t.consolePasswordErrorTitle,
        description: t.consolePasswordErrorDescription,
        variant: 'destructive',
      });
      setTimeout(() => setConsolePasswordAttempted(false), 0);
      setTimeout(() => setIsConsoleConnected(false), 0);
      setTimeout(() => setConnectedDeviceId(null), 0);
    } else if (consolePasswordAttempted && !consoleAwaitingPassword && consoleAuthenticated) {
      setTimeout(() => setIsConsoleConnected(true), 0);
      setTimeout(() => setConsolePasswordAttempted(false), 0);
    } else if (consolePasswordAttempted && !consoleAwaitingPassword && !consoleAuthenticated) {
      setTimeout(() => setConsolePasswordAttempted(false), 0);
      setTimeout(() => setIsConsoleConnected(false), 0);
      setTimeout(() => setConnectedDeviceId(null), 0);
    }
  }, [consoleAuthenticated, consoleAwaitingPassword, consolePasswordAttempted, connectedDeviceId, t]);

  const connectionErrorText = useMemo(() => {
    if (!isPcPoweredOff && !isConsoleTargetPoweredOff) return '';
    return t.pcConnectionError;
  }, [isPcPoweredOff, isConsoleTargetPoweredOff, t]);

  const handleConnect = async () => {
    if (!consoleDevice) return;

    // Clear previous console output before connecting
    setPcOutput([]);

    setConnectedDeviceId(consoleDevice.id);
    setConsoleConnectionTime(Date.now());
    if (onExecuteDeviceCommand) {
      await onExecuteDeviceCommand(consoleDevice.id, '__CONSOLE_CONNECT__');
      const deviceState = deviceStates?.get(consoleDevice.id);
      if (!deviceState?.awaitingPassword) {
        setIsConsoleConnected(true);
      }
    } else {
      setIsConsoleConnected(true);
    }
  };

  return {
    isConsoleConnected,
    setIsConsoleConnected,
    connectedDeviceId,
    setConnectedDeviceId,
    consoleConnectionTime,
    setConsoleConnectionTime,
    setConsolePasswordAttempted,
    consoleDevice,
    isConsoleInputDisabled,
    isCmdInputDisabled,
    consoleNeedsPassword,
    consoleConfirmDialog,
    consoleReloadPending,
    connectionErrorText,
    handleConnect,
  };
}

