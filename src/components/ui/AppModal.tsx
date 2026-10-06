'use client';

import React, { useRef } from 'react';
import { X } from 'lucide-react';
import { useModalDismiss } from '@/hooks/useModalDismiss';

export interface AppModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  isDark?: boolean;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | 'full';
  maxHeight?: string;
  modalId?: string;
  className?: string;
  bodyClassName?: string;
  headerClassName?: string;
  footerClassName?: string;
  cancelLabel?: string;
  confirmLabel?: string;
  onConfirm?: () => void;
  confirmDisabled?: boolean;
  confirmLoading?: boolean;
  showCancelButton?: boolean;
  showCloseButton?: boolean;
  closeOnBackdropClick?: boolean;
  enableEscape?: boolean;
  enableMobileBack?: boolean;
}

const MAX_WIDTH_MAP = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  full: 'max-w-[95vw]',
};

export function AppModal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  isDark = true,
  maxWidth = 'md',
  maxHeight = 'max-h-[90vh]',
  modalId = 'dialog',
  className = '',
  bodyClassName = '',
  headerClassName = '',
  footerClassName = '',
  cancelLabel = 'Vazgeç',
  confirmLabel,
  onConfirm,
  confirmDisabled = false,
  confirmLoading = false,
  showCancelButton = false,
  showCloseButton = true,
  closeOnBackdropClick = true,
  enableEscape = true,
  enableMobileBack = true,
}: AppModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useModalDismiss({
    isOpen,
    onClose,
    modalId,
    enableEscape,
    enableMobileBack,
  });

  if (!isOpen) return null;

  const widthClass = MAX_WIDTH_MAP[maxWidth] || MAX_WIDTH_MAP.md;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (closeOnBackdropClick && e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Consistent Backdrop */}
      <div className="absolute inset-0 bg-secondary-950/50 backdrop-blur-sm" />

      {/* Consistent Modal Container */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={`relative w-full ${widthClass} ${maxHeight} flex flex-col overflow-hidden rounded-2xl border transition-all duration-200 shadow-2xl animate-in zoom-in-95 ${
          isDark
            ? 'bg-secondary-900 border-secondary-800 text-white'
            : 'bg-white border-secondary-200 text-secondary-900'
        } ${className}`}
      >
        {/* Consistent Modal Header */}
        <div
          className={`shrink-0 px-4 py-3 border-b flex items-center justify-between ${
            isDark
              ? 'border-secondary-800 bg-secondary-900/90'
              : 'border-secondary-100 bg-secondary-50/80'
          } ${headerClassName}`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {icon && (
              <div
                className={`p-1.5 rounded-lg shrink-0 ${
                  isDark
                    ? 'bg-accent-500/15 text-accent-400 border border-accent-500/30'
                    : 'bg-accent-50 text-accent-600 border border-accent-100'
                }`}
              >
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <h3 className="text-sm font-bold tracking-tight truncate">
                {title}
              </h3>
              {subtitle && (
                <div className="text-[10px] font-mono opacity-50 leading-none mt-0.5 truncate">
                  {subtitle}
                </div>
              )}
            </div>
          </div>

          {showCloseButton && (
            <button
              type="button"
              onClick={onClose}
              title="Kapat (ESC)"
              aria-label="Kapat"
              className={`p-1 rounded-lg transition-colors cursor-pointer shrink-0 ${
                isDark
                  ? 'text-secondary-400 hover:text-white hover:bg-secondary-800'
                  : 'text-secondary-400 hover:text-secondary-800 hover:bg-secondary-100'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div
          className={`flex-1 overflow-y-auto overscroll-contain custom-scrollbar p-4 space-y-3 ${bodyClassName}`}
        >
          {children}
        </div>

        {/* Modal Footer */}
        {(footer || showCancelButton || onConfirm) && (
          <div
            className={`shrink-0 px-4 py-3 border-t flex items-center justify-end gap-2 ${
              isDark
                ? 'border-secondary-800 bg-secondary-950/40'
                : 'border-secondary-100 bg-secondary-50/50'
            } ${footerClassName}`}
          >
            {footer ? (
              footer
            ) : (
              <>
                {showCancelButton && (
                  <button
                    type="button"
                    onClick={onClose}
                    className={`h-8.5 px-3.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isDark
                        ? 'bg-secondary-800 hover:bg-secondary-700 text-secondary-300 hover:text-white'
                        : 'bg-secondary-100 hover:bg-secondary-200 text-secondary-600 hover:text-secondary-900'
                    }`}
                  >
                    {cancelLabel}
                  </button>
                )}
                {onConfirm && (
                  <button
                    type="button"
                    onClick={onConfirm}
                    disabled={confirmDisabled || confirmLoading}
                    className="h-8.5 px-4 bg-gradient-to-r from-accent-500 to-primary-500 hover:from-accent-400 hover:to-primary-400 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-accent-500/20 hover:shadow-accent-500/30 cursor-pointer"
                  >
                    {confirmLoading ? '...' : (confirmLabel || 'Tamam')}
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

