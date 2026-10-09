import type { CanvasDevice, CanvasConnection } from '@/components/network/NetworkTopology/types/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';

export interface StepQueueItem {
  run: () => void;
  durationMs: number;
}

export interface SimulationContext {
  devices: CanvasDevice[];
  connections: CanvasConnection[];
  deviceStates: Map<string, SwitchState>;
  simulatedDevices: CanvasDevice[];
  simulatedStates: Map<string, SwitchState>;
  setDevices: (devices: CanvasDevice[]) => void;
  setConnections: (connections: CanvasConnection[]) => void;
  setDeviceStates: (states: Map<string, SwitchState>) => void;
  isTr: boolean;
  addStep: (fn: () => void, durationMs?: number) => void;
  moveCursor: (x: number, y: number, actionLabel?: string, clicking?: boolean, typingText?: string) => void;
  updateProgress: (step: number, msg: string, paused?: boolean) => void;
  incrementStep: () => number;
  getElementCoords: (selector: string, fallbackX: number, fallbackY: number) => { x: number; y: number };
}

export function getElementCoords(selector: string, fallbackX: number, fallbackY: number): { x: number; y: number } {
  if (typeof document !== 'undefined') {
    const parts = selector.split(',').map((s) => s.trim());
    for (const part of parts) {
      const el = document.querySelector(part);
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        }
      }
    }
  }
  return { x: fallbackX, y: fallbackY };
}

