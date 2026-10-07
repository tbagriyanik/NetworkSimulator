'use client';

import { Monitor, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
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
  const { language } = useLanguage();
  const isTr = language === 'tr';

  if (!showWarning) return null;

  return (
    <AlertDialog open={showWarning}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-primary-600">
            <Monitor className="h-5 w-5" />
            {isTr ? 'Birden Fazla Sekme Açık' : 'Multiple Tabs Active'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isTr
              ? `${tabCount} adet simülatör sekmesi açık. Her sekme verilerini bağımsız olarak kaydeder, böylece çakışma olmadan birden fazla sekmede çalışabilirsiniz.`
              : `You have ${tabCount} tab${tabCount > 1 ? 's' : ''} open. Each tab now saves its own data independently, so you can work in multiple tabs without conflicts.`}
            <div className="mt-3 p-3 bg-primary-50 dark:bg-primary-950/30 rounded-lg">
              <p className="text-sm font-medium text-primary-800 dark:text-primary-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-success-500 shrink-0" />
                <span>{isTr ? 'Her sekme izole depolamaya sahiptir' : 'Each tab has isolated storage'}</span>
              </p>
              <p className="text-sm text-primary-700 dark:text-primary-300 mt-1">
                {isTr ? 'Her sekmedeki çalışmalarınız ayrı kaydedilir' : 'Your work in each tab is saved separately'}
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={clearCurrentTabData}>
            {isTr ? 'Bu Sekmeyi Sıfırla' : 'Clear This Tab'}
          </AlertDialogCancel>
          <AlertDialogAction onClick={acknowledgeWarning}>
            {isTr ? 'Anladım' : 'Got It'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
