'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { isMacPlatform } from '@/lib/utils/platform';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface KeyboardKey {
  /** Canonical identifier used for highlighting (e.g. 'ctrl', 'shift', 'a', 'f1'). */
  id: string;
  /** Visible label on the key cap. */
  label: string;
  /** Relative width of the key cap (1 = standard key). */
  width?: number;
}

interface KeyboardRow {
  keys: KeyboardKey[];
  /** Horizontal indent (in key units) applied to the whole row. */
  indent?: number;
}

export interface KeyboardLayoutLabels {
  highlightHint: string;
  selected: string;
  /** Legend labels for the modifier colour-coding. */
  modifierLegend?: {
    ctrl: string;
    shift: string;
    alt: string;
  };
}

interface KeyboardLayoutProps {
  /** Canonical key ids to highlight on the layout. */
  highlightKeys?: string[];
  /** Maps a canonical key id to a human readable description of its action(s). */
  keyDescriptions?: Record<string, string>;
  labels: KeyboardLayoutLabels;
  className?: string;
}

/**
 * Visual QWERTY keyboard used by the shortcuts guide. Keys are laid out from a
 * declarative structure so both the labels and the highlight behaviour stay in
 * sync with the shortcut list. All colours come from theme tokens.
 */
export function KeyboardLayout({ highlightKeys = [], keyDescriptions = {}, labels, className }: KeyboardLayoutProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const isMac = isMacPlatform();

  const modKey: KeyboardKey = isMac
    ? { id: 'cmd', label: '⌘', width: 1.25 }
    : { id: 'ctrl', label: 'Ctrl', width: 1.25 };

  const rows: KeyboardRow[] = [
    {
      keys: [
        { id: 'esc', label: 'Esc', width: 1.25 },
        { id: 'f1', label: 'F1' },
        { id: 'f2', label: 'F2' },
        { id: 'f3', label: 'F3' },
        { id: 'f4', label: 'F4' },
        { id: 'f5', label: 'F5' },
        { id: 'f6', label: 'F6' },
        { id: 'f7', label: 'F7' },
        { id: 'f8', label: 'F8' },
      ],
    },
    {
      keys: [
        { id: '`', label: '`' },
        { id: '1', label: '1' },
        { id: '2', label: '2' },
        { id: '3', label: '3' },
        { id: '4', label: '4' },
        { id: '5', label: '5' },
        { id: '6', label: '6' },
        { id: '7', label: '7' },
        { id: '8', label: '8' },
        { id: '9', label: '9' },
        { id: '0', label: '0' },
        { id: '-', label: '-' },
        { id: '=', label: '=' },
        { id: 'backspace', label: '⌫', width: 1.75 },
      ],
    },
    {
      keys: [
        { id: 'tab', label: 'Tab', width: 1.5 },
        { id: 'q', label: 'Q' },
        { id: 'w', label: 'W' },
        { id: 'e', label: 'E' },
        { id: 'r', label: 'R' },
        { id: 't', label: 'T' },
        { id: 'y', label: 'Y' },
        { id: 'u', label: 'U' },
        { id: 'i', label: 'I' },
        { id: 'o', label: 'O' },
        { id: 'p', label: 'P' },
        { id: '[', label: '[' },
        { id: ']', label: ']' },
        { id: '\\', label: '\\', width: 1.25 },
      ],
    },
    {
      keys: [
        { id: 'caps', label: 'Caps', width: 1.75 },
        { id: 'a', label: 'A' },
        { id: 's', label: 'S' },
        { id: 'd', label: 'D' },
        { id: 'f', label: 'F' },
        { id: 'g', label: 'G' },
        { id: 'h', label: 'H' },
        { id: 'j', label: 'J' },
        { id: 'k', label: 'K' },
        { id: 'l', label: 'L' },
        { id: ';', label: ';' },
        { id: "'", label: "'" },
        { id: 'enter', label: '⏎', width: 2 },
      ],
    },
    {
      keys: [
        { id: 'shift', label: 'Shift', width: 2.25 },
        { id: 'z', label: 'Z' },
        { id: 'x', label: 'X' },
        { id: 'c', label: 'C' },
        { id: 'v', label: 'V' },
        { id: 'b', label: 'B' },
        { id: 'n', label: 'N' },
        { id: 'm', label: 'M' },
        { id: ',', label: ',' },
        { id: '.', label: '.' },
        { id: '/', label: '/' },
        { id: 'shift-right', label: 'Shift', width: 2.25, },
      ],
    },
    {
      keys: [
        modKey,
        { id: 'alt', label: isMac ? '⌥' : 'Alt', width: 1.25 },
        { id: 'space', label: 'Space', width: 6.25 },
        { id: 'alt-right', label: isMac ? '⌥' : 'Alt', width: 1.25 },
        modKey.id === 'cmd' ? { id: 'ctrl', label: 'Ctrl', width: 1.25 } : { id: 'cmd', label: '⌘', width: 1.25 },
      ],
    },
  ];

  const highlightSet = new Set(highlightKeys.map((k) => k.toLowerCase()));

  /** Resolves the base id so left/right variants share one logical key. */
  const baseKeyId = (key: KeyboardKey) => key.id.toLowerCase().replace('-right', '');

  const isHighlighted = (key: KeyboardKey) => {
    const id = key.id.toLowerCase();
    if (highlightSet.has(id)) return true;
    // Treat the two (left/right) modifier or shift keys as one logical key.
    const base = baseKeyId(key);
    return highlightSet.has(base);
  };

  /** Tooltip text describing what the key does, if anything. */
  const getKeyDescription = (key: KeyboardKey) => {
    const id = key.id.toLowerCase();
    return keyDescriptions[id] ?? keyDescriptions[baseKeyId(key)];
  };

  // Modifier families and their accent colour. The "combined" keys (letters,
  // digits, function keys…) inherit the colour of the active modifier so a
  // Ctrl/Shift/Alt combination is visually tied together.
  const MODIFIER_IDS = ['ctrl', 'cmd', 'shift', 'alt'] as const;
  const MODIFIER_PRIORITY: string[] = ['ctrl', 'shift', 'alt'];

  const activeModifiers = MODIFIER_PRIORITY.filter((m) => highlightSet.has(m));
  const leadingModifier = activeModifiers[0] ?? null;

  const MODIFIER_STYLES: Record<string, string> = {
    ctrl: isDark
      ? 'bg-primary-400/25 text-primary-100 border-primary-400/70 shadow-sm shadow-primary-500/20 scale-[1.04]'
      : 'bg-primary-100 text-primary-700 border-primary-300 shadow-sm shadow-primary-500/20 scale-[1.04]',
    shift: isDark
      ? 'bg-accent-400/25 text-accent-100 border-accent-400/70 shadow-sm shadow-accent-500/20 scale-[1.04]'
      : 'bg-accent-100 text-accent-700 border-accent-300 shadow-sm shadow-accent-500/20 scale-[1.04]',
    alt: isDark
      ? 'bg-success-400/25 text-success-100 border-success-400/70 shadow-sm shadow-success-500/20 scale-[1.04]'
      : 'bg-success-100 text-success-700 border-success-300 shadow-sm shadow-success-500/20 scale-[1.04]',
  };

  /** Returns the active (emphasised) class for a highlighted key. */
  const getActiveClass = (key: KeyboardKey) => {
    const id = baseKeyId(key);
    const modifierId = id === 'cmd' ? 'ctrl' : id;
    if ((MODIFIER_IDS as readonly string[]).includes(modifierId) && highlightSet.has(modifierId)) {
      return MODIFIER_STYLES[modifierId] ?? MODIFIER_STYLES.ctrl;
    }
    // Combined (non-modifier) key: follow the leading active modifier.
    return MODIFIER_STYLES[leadingModifier ?? 'ctrl'];
  };

  const modifierLegend = labels.modifierLegend;

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className={isDark ? 'text-secondary-400' : 'text-secondary-500'}>
            {labels.highlightHint}
          </span>
          {modifierLegend && (
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm border border-primary-300 bg-primary-100 dark:border-primary-400/70 dark:bg-primary-400/25" aria-hidden />
                <span className={isDark ? 'text-secondary-300' : 'text-secondary-600'}>{modifierLegend.ctrl}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm border border-accent-300 bg-accent-100 dark:border-accent-400/70 dark:bg-accent-400/25" aria-hidden />
                <span className={isDark ? 'text-secondary-300' : 'text-secondary-600'}>{modifierLegend.shift}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm border border-success-300 bg-success-100 dark:border-success-400/70 dark:bg-success-400/25" aria-hidden />
                <span className={isDark ? 'text-secondary-300' : 'text-secondary-600'}>{modifierLegend.alt}</span>
              </span>
            </div>
          )}
        </div>
        {highlightKeys.length > 0 && (
          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-2 py-1 rounded-md font-medium',
              isDark
                ? 'bg-primary-900/50 text-primary-200 border border-primary-700/50'
                : 'bg-primary-50 text-primary-700 border border-primary-200'
            )}
          >
            {labels.selected}
          </span>
        )}
      </div>

      <div
        className={cn(
          'rounded-2xl border p-2 sm:p-3 overflow-x-auto custom-scrollbar',
          isDark ? 'bg-secondary-950/50 border-secondary-800' : 'bg-secondary-50/70 border-secondary-200'
        )}
      >
        <div className="flex flex-col gap-1 sm:gap-1.5 min-w-[520px]">
          {rows.map((row, rowIdx) => (
            <div
              key={rowIdx}
              className="flex gap-1 sm:gap-1.5"
              style={row.indent ? { paddingLeft: `${row.indent * 2.5}rem` } : undefined}
            >
              {row.keys.map((key, keyIdx) => {
                const active = isHighlighted(key);
                const description = getKeyDescription(key);
                const keyCapClass = cn(
                  'h-8 sm:h-10 flex items-center justify-center rounded-md border text-[10px] sm:text-xs font-semibold select-none',
                  'transition-all duration-200',
                  active
                    ? getActiveClass(key)
                    : isDark
                      ? 'bg-secondary-800 text-secondary-300 border-secondary-700'
                      : 'bg-white text-secondary-600 border-secondary-200'
                );

                // Only render a tooltip when the key actually has a shortcut.
                if (!description) {
                  return (
                    <div
                      key={`${key.id}-${keyIdx}`}
                      style={{ flexGrow: key.width ?? 1, flexBasis: 0 }}
                      className={keyCapClass}
                    >
                      {key.label}
                    </div>
                  );
                }

                return (
                  <Tooltip key={`${key.id}-${keyIdx}`}>
                    <TooltipTrigger asChild>
                      <div
                        style={{ flexGrow: key.width ?? 1, flexBasis: 0 }}
                        className={cn(keyCapClass, 'cursor-help')}
                      >
                        {key.label}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[240px] whitespace-normal text-center leading-snug">
                      {description}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
