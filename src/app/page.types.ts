import type { DeviceType } from '@/components/network/networkTopology.types';
import type { ExampleProjectLevel } from '@/lib/network/exampleProjects';

export type TabType = 'topology' | 'cmd' | 'terminal' | 'tasks';

export interface PCOutputLine {
  id: string;
  type: 'command' | 'output' | 'error' | 'success';
  content: string;
}

export const SWITCH_DEVICE_TYPES: DeviceType[] = ['switchL2', 'switchL3'];

export const ALL_TABS = [
  {
    id: 'topology' as TabType,
    labelKey: 'networkTopology' as const,
    showFor: ['pc', 'iot', ...SWITCH_DEVICE_TYPES, 'router'] as DeviceType[],
  },
];

export const exampleLevelOrder: ExampleProjectLevel[] = ['basic', 'intermediate', 'advanced'];
