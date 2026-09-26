import type { DeviceType } from '@/components/network/NetworkTopology/types/networkTopology.types';
import type { ExampleProjectLevel } from '@/lib/network/exampleProjects';

export type TabType = 'topology' | 'cmd' | 'terminal' | 'tasks';

/** Alias of the PC panel's canonical `OutputLine`; see deviceManagerDefaults. */
export type { OutputLine as PCOutputLine } from '@/components/network/pc-panel/PCPanel.types';

export const SWITCH_DEVICE_TYPES: DeviceType[] = ['switchL2', 'switchL3'];

export const ALL_TABS = [
  {
    id: 'topology' as TabType,
    labelKey: 'networkTopology' as const,
    showFor: ['pc', 'iot', ...SWITCH_DEVICE_TYPES, 'router'] as DeviceType[],
  },
];

export const exampleLevelOrder: ExampleProjectLevel[] = ['basic', 'intermediate', 'advanced'];


