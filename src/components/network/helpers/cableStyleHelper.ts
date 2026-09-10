import type { CableType } from '@/lib/network/types';

export interface CableVisualProps {
  stroke: string;
  strokeDasharray?: string;
  strokeWidth: number;
  opacity: number;
  labelTr: string;
  labelEn: string;
}

export function getCableVisualProps(cableType?: CableType | string): CableVisualProps {
  switch (cableType) {
    case 'cross':
    case 'crossover':
      return {
        stroke: '#f59e0b', // Amber / Orange
        strokeDasharray: '6,4',
        strokeWidth: 2,
        opacity: 0.9,
        labelTr: 'Çapraz Kablo (Crossover)',
        labelEn: 'Crossover Cable',
      };
    case 'fiber':
      return {
        stroke: '#3b82f6', // Bright Blue
        strokeDasharray: '2,2',
        strokeWidth: 2.5,
        opacity: 0.95,
        labelTr: 'Fiber Optik Kablo',
        labelEn: 'Fiber Optic Cable',
      };
    case 'console':
      return {
        stroke: '#8b5cf6', // Light Purple / Rollover
        strokeDasharray: 'none',
        strokeWidth: 1.8,
        opacity: 0.85,
        labelTr: 'Konsol Kablosu (Rollover)',
        labelEn: 'Console Cable',
      };
    case 'wireless':
      return {
        stroke: '#10b981', // Emerald Green
        strokeDasharray: '4,4',
        strokeWidth: 1.5,
        opacity: 0.75,
        labelTr: 'Kablosuz Bağlantı (Wireless)',
        labelEn: 'Wireless Link',
      };
    case 'straight':
    default:
      return {
        stroke: '#64748b', // Slate Gray
        strokeDasharray: 'none',
        strokeWidth: 2,
        opacity: 0.9,
        labelTr: 'Düz Bakır Kablo (Straight-Through)',
        labelEn: 'Straight-Through Copper',
      };
  }
}
