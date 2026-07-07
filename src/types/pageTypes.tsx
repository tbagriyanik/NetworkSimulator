import React from 'react';
import { Network } from 'lucide-react';
import { Translations } from '@/contexts/LanguageContext';
import { DeviceType } from '@/components/network/networkTopology.types';
import { topologyTasks } from '@/lib/network/taskDefinitions';
import type { ExampleProjectLevel } from '@/lib/network/exampleProjects';

export type TabType = 'topology' | 'cmd' | 'terminal' | 'tasks';

// PC Output type for PCPanel
export interface PCOutputLine {
  id: string;
  type: 'command' | 'output' | 'error' | 'success';
  content: string;
}

export interface TabDefinition {
  id: TabType;
  labelKey: keyof Translations;
  icon: React.ReactNode;
  tasks: readonly unknown[];
  color: string;
  showFor: DeviceType[];
}

export const SWITCH_DEVICE_TYPES: DeviceType[] = ['switchL2', 'switchL3'];

export const ALL_TABS: TabDefinition[] = [
  {
    id: 'topology',
    labelKey: 'networkTopology',
    icon: <Network className="w-4 h-4" />,
    tasks: topologyTasks,
    color: 'from-accent-500 to-primary-500',
    showFor: ['pc', 'iot', ...SWITCH_DEVICE_TYPES, 'router'],
  },
];

export const exampleLevelOrder: ExampleProjectLevel[] = ['basic', 'intermediate', 'advanced'];
