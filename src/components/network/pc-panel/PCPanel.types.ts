import type React from 'react';
import type { CableInfo, SwitchState } from '@/lib/network/types';
import type { TerminalOutput } from '../Terminal';
import type { CanvasDevice } from '../NetworkTopology/types/networkTopology.types';

export type PCActiveTab = 'home' | 'desktop' | 'terminal' | 'settings' | 'services' | 'wireless' | 'iot' | 'rest-api';

export interface OutputLine {
  id: string;
  type: 'command' | 'output' | 'error' | 'success' | 'prompt' | 'html';
  content: string;
  prompt?: string;
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
  topologyConnections?: {
    sourceDeviceId: string;
    sourcePort: string;
    targetDeviceId: string;
    targetPort: string;
    cableType?: string;
    active?: boolean;
  }[];
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

