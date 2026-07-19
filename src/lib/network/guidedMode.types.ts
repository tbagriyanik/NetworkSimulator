import { ExampleProject } from './exampleProjects';

export interface GuidedStep {
  id: string;
  order: number;
  title: { tr: string; en: string };
  description: { tr: string; en: string };
  hint: { tr: string; en: string };
  detailedInstructions?: { tr: string[]; en: string[] };
  sectionTitle?: { tr: string; en: string };
  animationId?: string;
  checkType: 'deviceAccess' | 'command' | 'config' | 'connection' | 'ping' | 'manual' | 'deviceCount' | 'faultResolved' | 'routingConverged' | 'showOutputMatch';
  checkParams?: {
    deviceType?: 'switch' | 'router' | 'pc' | 'iot' | 'firewall';
    minCount?: number;
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
    fromDevice?: string;
    toIp?: string;
    interfaceId?: string;
    vlanId?: number;
    poolName?: string;
    faultId?: string;
    showCommand?: string;
    matchPattern?: string;
  };
  completed: boolean;
  completedAt?: Date;
  points?: number;
}

export interface GuidedProject extends ExampleProject {
  isGuided: true;
  steps: GuidedStep[];
  estimatedTimeMinutes: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  startedAt?: Date;
  totalPoints?: number;
  integrityHash?: string;
}
