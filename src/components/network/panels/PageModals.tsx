import dynamic from 'next/dynamic';

const MultiTabWarningDialog = dynamic(() => import('@/components/network/MultiTabWarningDialog').then(m => m.MultiTabWarningDialog), { ssr: false });
const ConfirmationDialogs = dynamic(() => import('@/components/network/ConfirmationDialogs').then(m => m.ConfirmationDialogs), { ssr: false });
const RoomJoinDialog = dynamic(() => import('@/components/RoomJoinDialog').then(m => m.RoomJoinDialog));
const TeacherRoomPanel = dynamic(() => import('@/components/TeacherRoomPanel').then(m => m.TeacherRoomPanel));

import type { Dispatch, SetStateAction } from 'react';

type ConfirmDialogValue = { show: boolean; message: string; action: string; onConfirm: () => void } | null;
type SaveDialogValue = { show: boolean; message: string; onConfirm: (save: boolean) => void } | null;

export interface PageModalsProps {
  t: Record<string, string>;
  isDark: boolean;
  showWarning: boolean;
  tabCount: number;
  clearCurrentTabData: () => void;
  acknowledgeWarning: () => void;
  confirmDialog: ConfirmDialogValue;
  setConfirmDialog: Dispatch<SetStateAction<ConfirmDialogValue>>;
  saveDialog: SaveDialogValue;
  setSaveDialog: Dispatch<SetStateAction<SaveDialogValue>>;
  focusActiveTerminalInput: () => void;
}

export function PageModals({
  t,
  isDark,
  showWarning,
  tabCount,
  clearCurrentTabData,
  acknowledgeWarning,
  confirmDialog,
  setConfirmDialog,
  saveDialog,
  setSaveDialog,
  focusActiveTerminalInput,
}: PageModalsProps) {
  return (
    <>
      <MultiTabWarningDialog
        showWarning={showWarning}
        tabCount={tabCount}
        clearCurrentTabData={clearCurrentTabData}
        acknowledgeWarning={acknowledgeWarning}
      />
      <ConfirmationDialogs
        t={t}
        isDark={isDark}
        confirmDialog={confirmDialog}
        setConfirmDialog={setConfirmDialog}
        saveDialog={saveDialog}
        setSaveDialog={setSaveDialog}
        focusActiveTerminalInput={focusActiveTerminalInput}
      />
      <RoomJoinDialog />
      <TeacherRoomPanel />
    </>
  );
}
