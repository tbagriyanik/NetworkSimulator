import { cn } from '@/lib/utils';

/**
 * Global standardized styling classes for window & modal components.
 * Guarantees visual harmony across all dialogs, modals, and draggable windows.
 */

/** Standart pencere/modal kapat (X) butonu sınıfı */
export const WINDOW_CLOSE_BUTTON_CLASS = cn(
  'inline-flex items-center justify-center w-6 h-6 rounded-md',
  'bg-error-500 text-white hover:bg-error-600 active:scale-95 transition-all shrink-0',
  'shadow-sm border border-error-600/30 cursor-pointer focus:outline-none'
);

/** Standart pencere/modal Vazgeç / İptal butonu sınıfı */
export const WINDOW_CANCEL_BUTTON_CLASS = (isDark = true) =>
  cn(
    'h-8.5 px-3.5 rounded-lg text-xs font-bold transition-all cursor-pointer border',
    isDark
      ? 'bg-secondary-800 hover:bg-secondary-700 text-secondary-300 hover:text-white border-secondary-700'
      : 'bg-secondary-100 hover:bg-secondary-200 text-secondary-700 hover:text-secondary-900 border-secondary-200'
  );

/** Standart pencere/modal başlık metni sınıfı */
export const WINDOW_TITLE_CLASS = (isDark = true) =>
  cn(
    'text-sm font-semibold truncate',
    isDark ? 'text-secondary-100' : 'text-secondary-900'
  );

/** Standart modal başlık alanı sınıfı */
export const WINDOW_HEADER_CLASS = (isDark = true) =>
  cn(
    'shrink-0 px-4 py-3 border-b flex items-center justify-between select-none',
    isDark
      ? 'border-secondary-800 bg-secondary-900/90'
      : 'border-secondary-100 bg-secondary-50/80'
  );

/** Standart modal altlık (footer) alanı sınıfı */
export const WINDOW_FOOTER_CLASS = (isDark = true) =>
  cn(
    'shrink-0 px-4 py-3 border-t flex items-center justify-end gap-2',
    isDark
      ? 'border-secondary-800 bg-secondary-950/40'
      : 'border-secondary-100 bg-secondary-50/50'
  );
