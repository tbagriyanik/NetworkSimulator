'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

import { useEffect } from 'react';

interface ConfirmationDialogsProps {
  t: Record<string, string>;
  isDark: boolean;
  confirmDialog: { show: boolean; message: string; action: string; onConfirm: () => void } | null;
  setConfirmDialog: (dialog: { show: boolean; message: string; action: string; onConfirm: () => void } | null) => void;
  saveDialog: { show: boolean; message: string; onConfirm: (save: boolean) => void } | null;
  setSaveDialog: (dialog: { show: boolean; message: string; onConfirm: (save: boolean) => void } | null) => void;
  focusActiveTerminalInput: () => void;
}

export function ConfirmationDialogs({
  t,
  isDark,
  confirmDialog,
  setConfirmDialog,
  saveDialog,
  setSaveDialog,
  focusActiveTerminalInput,
}: ConfirmationDialogsProps) {
  useEffect(() => {
    const handleMobileBack = () => {
      if (confirmDialog?.show) {
        setConfirmDialog(null);
        focusActiveTerminalInput();
      } else if (saveDialog?.show) {
        setSaveDialog(null);
        focusActiveTerminalInput();
      }
    };
    window.addEventListener('mobile-back-pressed', handleMobileBack);
    return () => window.removeEventListener('mobile-back-pressed', handleMobileBack);
  }, [confirmDialog?.show, saveDialog?.show, setConfirmDialog, setSaveDialog, focusActiveTerminalInput]);

  return (
    <>
      {/* Global Dialogs (AlertDialog for better z-index and standard behavior) */}
      <AlertDialog open={!!confirmDialog && confirmDialog.show} onOpenChange={(open) => {
        if (!open) {
          setConfirmDialog(null);
          focusActiveTerminalInput();
        }
      }}>
        <AlertDialogContent className={`${isDark ? 'bg-secondary-900 border-success-500/30' : 'bg-white border-success-500/50'}`}>
          <AlertDialogHeader>
            <AlertDialogTitle className={isDark ? 'text-white' : 'text-secondary-900'}>
              {t.confirmationRequired}
            </AlertDialogTitle>
            <AlertDialogDescription className={isDark ? 'text-secondary-400' : 'text-secondary-500'}>
              {confirmDialog?.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={isDark ? 'bg-secondary-800 text-white border-secondary-700 hover:bg-secondary-700' : ''}>
              {t.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                confirmDialog?.onConfirm();
                focusActiveTerminalInput();
              }}
              className="bg-accent-600 hover:bg-accent-700 text-white"
            >
              {t.continue}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!saveDialog && saveDialog.show} onOpenChange={(open) => {
        if (!open) {
          setSaveDialog(null);
          focusActiveTerminalInput();
        }
      }}>
        <AlertDialogContent className={`${isDark ? 'bg-secondary-900 border-success-500/30' : 'bg-white border-success-500/50'}`}>
          <AlertDialogHeader>
            <AlertDialogTitle className={isDark ? 'text-white' : 'text-secondary-900'}>
              {t.saveProject}
            </AlertDialogTitle>
            <AlertDialogDescription className={isDark ? 'text-secondary-400' : 'text-secondary-500'}>
              {saveDialog?.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                saveDialog?.onConfirm(false);
                focusActiveTerminalInput();
              }}
              className={isDark ? 'bg-secondary-800 text-white border-secondary-700 hover:bg-secondary-700' : ''}
            >
              {t.dontSave}
            </Button>
            <AlertDialogAction
              onClick={() => {
                saveDialog?.onConfirm(true);
                focusActiveTerminalInput();
              }}
              className="bg-accent-600 hover:bg-accent-700 text-white"
            >
              {t.saveLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
