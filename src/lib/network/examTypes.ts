import { ExampleProject } from './exampleProjects';

interface NoteItem {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  font: string;
  fontSize: number;
  opacity: number;
}

interface DevicePort {
  id: string;
  label: string;
  status: string;
  ipAddress?: string;
  mode?: 'access' | 'trunk' | 'routed';
  vlan?: number;
  description?: string;
  wifi?: { ssid: string; mode: string };
  portSecurity?: { enabled: boolean };
  isSubinterface?: boolean;
}

interface DeviceState {
  hostname?: string;
  ports?: Record<string, DevicePort>;
  dhcpPools?: Record<string, { network: string }>;
  services?: {
    dns?: { enabled: boolean; records?: Array<{ domain: string; address: string }> };
  };
  security?: {
    enableSecret?: string;
    consoleLine?: { password: string };
    vtyLines?: { password: string };
    servicePasswordEncryption?: boolean;
    users?: Array<{ username: string }>;
  };
  staticRoutes?: Array<{ destination: string; prefixLength: number }>;
  ipRouting?: boolean;
  routingProtocol?: 'rip' | 'ospf';
  vtp?: { mode: string };
}

interface ProjectDevice {
  id: string;
  type: string;
  name?: string;
  ip?: string;
  subnet?: string;
  gateway?: string;
  macAddress?: string;
  status?: string;
  ports?: Array<{ id: string; label: string; status: string }>;
  state?: DeviceState;
}

interface TopologyData {
  devices: ProjectDevice[];
  connections: Array<{
    sourceDeviceId: string;
    sourcePort: string;
    targetDeviceId: string;
    targetPort: string;
    cableType: string;
    active?: boolean;
  }>;
  notes?: NoteItem[];
}

export interface ProjectData {
  version?: string;
  timestamp?: string;
  devices?: ProjectDevice[];
  deviceOutputs?: unknown[];
  pcOutputs?: unknown[];
  pcHistories?: unknown[];
  topology?: TopologyData;
  cableInfo?: {
    connected: boolean;
    cableType: string;
    sourceDevice: string;
    targetDevice: string;
  };
  activeDeviceId?: string;
  activeDeviceType?: string;
  activeTab?: string;
  zoom?: number;
  pan?: { x: number; y: number };
  tasks?: ExamTask[];
  steps?: ExamTask[];
}

export interface ExamTask {
  id: string;
  title: { tr: string; en: string };
  description: { tr: string; en: string };
  weight: number;
  checkType: 'deviceAccess' | 'command' | 'config' | 'connection' | 'manual' | 'faultResolved' | 'routingConverged' | 'showOutputMatch';
  checkParams?: {
    deviceType?: 'switch' | 'router' | 'pc' | 'iot' | 'firewall';
    commandPattern?: string;
    configKey?: string;
    configValue?: unknown;
    cableType?: 'straight' | 'crossover' | 'console';
    sourceDevice?: string;
    sourcePort?: string;
    targetDevice?: string;
    targetDeviceId?: string;
    targetPort?: string;
    connections?: Array<{ sourceDevice: string; sourcePort: string; targetDevice: string; targetPort: string }>;
    subnetMask?: string;
    pc1Ip?: string;
    pc2Ip?: string;
    // For faultResolved
    faultId?: string;
    // For showOutputMatch
    showCommand?: string;
    matchPattern?: string;
  };
  hint?: { tr: string; en: string };
  completed: boolean;
  completedAt?: Date;
}

export interface ExamProject extends Omit<ExampleProject, 'title' | 'description'> {
  title: string | { tr: string; en: string };
  description: string | { tr: string; en: string };
  isExam: true;
  tasks: ExamTask[];
  durationMinutes: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  startedAt?: Date;
  finishedAt?: Date;
  isCustom?: boolean; // True if created by a teacher
  integrityHash?: string; // Tamper-proof integrity hash
}

export type { NoteItem, DevicePort, DeviceState, ProjectDevice, TopologyData };
