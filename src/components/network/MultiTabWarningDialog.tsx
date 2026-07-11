'use client';

import { Monitor } from 'lucide-react';
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

interface MultiTabWarningDialogProps {
  showWarning: boolean;
  tabCount: number;
  clearCurrentTabData: () => void;
  acknowledgeWarning: () => void;
}

export function MultiTabWarningDialog({
  showWarning,
  tabCount,
  clearCurrentTabData,
  acknowledgeWarning,
}: MultiTabWarningDialogProps) {
  if (!showWarning) return null;

  return (
    <AlertDialog open={showWarning}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-primary-600">
            <Monitor className="h-5 w-5" />
            Multiple Tabs Active
          </AlertDialogTitle>
          <AlertDialogDescription>
            You have {tabCount} tab{tabCount > 1 ? 's' : ''} of Network Simulator open. Each tab now saves its own data independently, so you can work in multiple tabs without conflicts.
            <div className="mt-3 p-3 bg-primary-50 dark:bg-primary-950/30 rounded-lg">
              <p className="text-sm font-medium text-primary-800 dark:text-primary-200">
                ✅ Each tab has isolated storage
              </p>
              <p className="text-sm text-primary-700 dark:text-primary-300 mt-1">
                Your work in each tab is saved separately
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={clearCurrentTabData}>
            Clear This Tab
          </AlertDialogCancel>
          <AlertDialogAction onClick={acknowledgeWarning}>
            Got It
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
