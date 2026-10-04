import type React from 'react';
import type { CableInfo, SwitchState } from '@/lib/network/types';
import type { TerminalOutput } from '../Terminal';
import type { CanvasConnection, CanvasDevice } from '../NetworkTopology/types/networkTopology.types';

export type PCActiveTab = 'home' | 'desktop' | 'terminal' | 'settings' | 'services' | 'wireless' | 'iot' | 'rest-api';

export interface OutputLine {
  id: string;
  type: 'command' | 'output' | 'error' | 'success' | 'prompt' | 'html';
  content: string;
  prompt?: string;
}

/**
 * The set of `TerminalOutput['type']` values that also exist on `OutputLine`.
 * The two interfaces overlap but are not identical: `'password-prompt'` only
 * exists on terminal output, while `'prompt'` and `'html'` only exist on PC
 * output lines. Converting between them therefore has to drop the terminal-only
 * variant and relabel the shared ones.
 */
export type SharedOutputLineType = Extract<TerminalOutput['type'], OutputLine['type']>;

/** Narrows a terminal output line to one whose type also exists on `OutputLine`. */
export function isSharedOutputLineType(type: TerminalOutput['type']): type is SharedOutputLineType {
  return type === 'command' || type === 'output' || type === 'error' || type === 'success';
}

/**
 * Convert terminal output lines into PC output lines, dropping the
 * terminal-only `'password-prompt'` variant. The return type is a real
 * `OutputLine[]`, so callers need no assertion.
 */
export function terminalOutputToOutputLines(lines: TerminalOutput[]): OutputLine[] {
  return lines
    .filter((line): line is TerminalOutput & { type: SharedOutputLineType } => isSharedOutputLineType(line.type))
    .map((line) => ({
      id: line.id,
      type: line.type,
      content: line.content,
      prompt: line.prompt,
    }));
}

export interface DhcpPoolConfig {
  poolName: string;
  defaultGateway: string;
  dnsServer: string;
  startIp: string;
  subnetMask: string;
  maxUsers: number;
}

export interface PcFile {
  name: string;
  size: number;
  modifiedAt?: string;
}

export interface FtpSession {
  host: string;
  targetDeviceId: string;
  files: PcFile[];
}

export interface PythonSession {
  code: string;
  inputs: string[];
  currentPrompt: string;
}

export interface PCPanelProps {
  deviceId: string;
  cableInfo: CableInfo;
  isVisible: boolean;
  initialTab?: PCActiveTab;
  className?: string;
  onClose: () => void;
  onTogglePower?: (deviceId: string) => void;
  topologyDevices?: CanvasDevice[];
  topologyConnections?: CanvasConnection[];
  deviceStates?: Map<string, SwitchState>;
  deviceOutputs?: Map<string, TerminalOutput[]>;
  pcOutputs?: Map<string, OutputLine[]>;
  setPcOutputs?: PcOutputsSetter;
  pcHistories?: Map<string, string[]>;
  onUpdatePCHistory?: (deviceId: string, history: string[]) => void;
  onExecuteDeviceCommand?: (deviceId: string, command: string) => Promise<unknown>;
  onNavigate?: (program: string) => void;
  onDeleteDevice?: (deviceId: string) => void;
  handleResizeStart?: (e: React.PointerEvent, direction: string, id: string) => void;
}

export type PcOutputsSetter = React.Dispatch<React.SetStateAction<Map<string, OutputLine[]>>>;

