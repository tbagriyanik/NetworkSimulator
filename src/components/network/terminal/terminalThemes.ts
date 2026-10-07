export type TerminalColorTheme = 'default' | 'matrix' | 'amber' | 'dracula' | 'cyberpunk';

export interface TerminalThemeConfig {
  id: TerminalColorTheme;
  name: string;
  labelTr: string;
  labelEn: string;
  bgDark: string;
  bgLight: string;
  textDark: string;
  textLight: string;
  commandDark: string;
  commandLight: string;
  promptDark: string;
  promptLight: string;
  accentDark: string;
  accentLight: string;
}

export const TERMINAL_COLOR_THEMES: Record<TerminalColorTheme, TerminalThemeConfig> = {
  default: {
    id: 'default',
    name: 'Modern Dark',
    labelTr: 'Klasik',
    labelEn: 'Classic',
    bgDark: 'bg-black',
    bgLight: 'bg-secondary-50',
    textDark: 'text-secondary-100',
    textLight: 'text-secondary-900',
    commandDark: 'text-secondary-100',
    commandLight: 'text-secondary-900',
    promptDark: 'text-accent-400',
    promptLight: 'text-accent-600',
    accentDark: 'text-accent-400',
    accentLight: 'text-accent-600',
  },
  matrix: {
    id: 'matrix',
    name: 'Matrix Green',
    labelTr: 'Matrix Yeşili',
    labelEn: 'Matrix Green',
    bgDark: 'bg-emerald-950/90',
    bgLight: 'bg-emerald-50/80',
    textDark: 'text-emerald-400',
    textLight: 'text-emerald-900',
    commandDark: 'text-emerald-300',
    commandLight: 'text-emerald-950',
    promptDark: 'text-emerald-500',
    promptLight: 'text-emerald-700',
    accentDark: 'text-emerald-400',
    accentLight: 'text-emerald-700',
  },
  amber: {
    id: 'amber',
    name: 'Retro Amber',
    labelTr: 'Retro Kehribar',
    labelEn: 'Retro Amber',
    bgDark: 'bg-amber-950/80',
    bgLight: 'bg-amber-50/80',
    textDark: 'text-amber-400',
    textLight: 'text-amber-950',
    commandDark: 'text-amber-300',
    commandLight: 'text-amber-900',
    promptDark: 'text-amber-500',
    promptLight: 'text-amber-700',
    accentDark: 'text-amber-400',
    accentLight: 'text-amber-700',
  },
  dracula: {
    id: 'dracula',
    name: 'Dracula Violet',
    labelTr: 'Gece Moru',
    labelEn: 'Night Purple',
    bgDark: 'bg-purple-950/80',
    bgLight: 'bg-purple-50/80',
    textDark: 'text-purple-200',
    textLight: 'text-purple-950',
    commandDark: 'text-pink-300',
    commandLight: 'text-purple-900',
    promptDark: 'text-purple-400',
    promptLight: 'text-purple-700',
    accentDark: 'text-pink-400',
    accentLight: 'text-purple-700',
  },
  cyberpunk: {
    id: 'cyberpunk',
    name: 'Cyberpunk Cyan',
    labelTr: 'Siber Turkuaz',
    labelEn: 'Cyber Cyan',
    bgDark: 'bg-cyan-950/80',
    bgLight: 'bg-cyan-50/80',
    textDark: 'text-cyan-300',
    textLight: 'text-cyan-950',
    commandDark: 'text-cyan-200',
    commandLight: 'text-cyan-900',
    promptDark: 'text-cyan-400',
    promptLight: 'text-cyan-700',
    accentDark: 'text-cyan-400',
    accentLight: 'text-cyan-700',
  },
};
