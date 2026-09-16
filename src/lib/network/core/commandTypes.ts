import type { SwitchState, CommandResult } from '../types';
import type { CanvasDevice, CanvasConnection } from '@/components/network/NetworkTopology/types/networkTopology.types';

// Ortak komut Ã§alÄ±ÅŸma baÄŸlamÄ±
export interface CommandContext {
  language: 'tr' | 'en';
  devices?: CanvasDevice[];
  connections?: CanvasConnection[];
  deviceStates: Map<string, SwitchState>;
  sourceDeviceId?: string;
  skipConfirm?: boolean;
}

// TÃ¼m komut handler'larÄ± iÃ§in standart imza
export type CommandHandler = (
  state: SwitchState,
  input: string,
  ctx: CommandContext
) => CommandResult;


