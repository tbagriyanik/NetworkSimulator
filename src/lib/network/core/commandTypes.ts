import type { SwitchState, CommandResult } from '../types';
import type { CanvasDevice, CanvasConnection } from '@/components/network/networkTopology.types';

// Ortak komut çalışma bağlamı
export interface CommandContext {
  language: 'tr' | 'en';
  devices?: CanvasDevice[];
  connections?: CanvasConnection[];
  deviceStates: Map<string, SwitchState>;
  sourceDeviceId?: string;
}

// Tüm komut handler'ları için standart imza
export type CommandHandler = (
  state: SwitchState,
  input: string,
  ctx: CommandContext
) => CommandResult;
