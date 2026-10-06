'use client';

import { useEffect, useRef, useCallback } from 'react';

export interface UseModalDismissOptions {
  isOpen: boolean;
  onClose: () => void;
  modalId?: string;
  enableEscape?: boolean;
  enableMobileBack?: boolean;
  lockScroll?: boolean;
}

/**
 * Universal hook providing ESC key and Mobile Back button (popstate) dismiss
 * support for all modal dialogs.
 */
export function useModalDismiss({
  isOpen,
  onClose,
  modalId = 'modal',
  enableEscape = true,
  enableMobileBack = true,
  lockScroll = true,
}: UseModalDismissOptions) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const hasPushedHistoryRef = useRef(false);
  const isClosingByHistoryRef = useRef(false);

  // 1. Mobile & Browser Back Button (popstate) support
  useEffect(() => {
    if (!isOpen || !enableMobileBack || typeof window === 'undefined') return;

    const stateKey = `netsim_modal_${modalId}_${Date.now()}`;
    window.history.pushState({ modalOpen: true, stateKey }, '');
    hasPushedHistoryRef.current = true;
    isClosingByHistoryRef.current = false;

    const handlePopState = () => {
      if (hasPushedHistoryRef.current) {
        hasPushedHistoryRef.current = false;
        isClosingByHistoryRef.current = true;
        onCloseRef.current();
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (hasPushedHistoryRef.current && !isClosingByHistoryRef.current) {
        hasPushedHistoryRef.current = false;
        try {
          window.history.back();
        } catch {
          // Ignore history rollback failure if window is unmounting
        }
      }
    };
  }, [isOpen, enableMobileBack, modalId]);

  // 2. Global ESC Key Listener (Capture phase to catch before nested inputs)
  useEffect(() => {
    if (!isOpen || !enableEscape || typeof window === 'undefined') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onCloseRef.current();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen, enableEscape]);

  // 3. Body Scroll Lock
  useEffect(() => {
    if (!isOpen || !lockScroll || typeof document === 'undefined') return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, lockScroll]);

  const handleDismiss = useCallback(() => {
    onCloseRef.current();
  }, []);

  return { handleDismiss };
}

