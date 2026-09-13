'use client';

import { useMemo, type ComponentProps } from 'react';
import { IFRAME_FONT_FACES_CSS, INRIA_SANS_STACK, GEIST_MONO_STACK } from '@/lib/design-tokens/iframeFonts';
import { usePCPanel } from './PCPanelContext';
import { FtpFileTransferDialog } from './FtpFileTransferDialog';
import { FileEditorModal } from './FileEditorModal';
import { PCBrowser } from './PCBrowser';
import { PythonInputModal } from './PythonInputModal';
import { PythonFormWindow } from './PythonFormWindow';
import { loadFs, saveFs, writeFile, readFile, getFtpFilesFromUploadDir } from './pcFileSystem';
import { closeActiveDeviceForm } from './pcPythonFormModule';

/**
 * Floating dialogs (FTP picker, file editor, browser window).
 * Extracted from PCPanel orchestrator; reads everything from PCPanelContext.
 */
export function PCPanelDialogs() {
  const ctx = usePCPanel();
  const {
    deviceId, language, isDark, isMobile,
    isFtpFilePickerOpen, setIsFtpFilePickerOpen, ftpSession,
    handleFtpSessionCommand, executeFtpPut, editingFile, setEditingFile,
    setServiceHttpContent, setActiveTab, executeCommand, inputRef,
    httpAppContent, httpAppUrl, httpAppTitle,
    setHttpAppUrl, setHttpAppContent, setHttpAppDeviceId, setHttpAppTitle,
    browserWindow, setBrowserWindow, filteredSuggestions, showUrlSuggestions,
    setShowUrlSuggestions, selectedSuggestionIndex, setSelectedSuggestionIndex,
    urlInputRef, dragStateRef, openWebPage,
    pythonSession, setPythonSession, activePythonForm, setActivePythonForm,
  } = ctx;

  const httpAppSrcDoc = useMemo(() => {
    if (!httpAppContent) return '';
    const trimmed = httpAppContent.trim();
    if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')) {
      return httpAppContent;
    }
    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      ${IFRAME_FONT_FACES_CSS}
      html, body { margin: 0; padding: 0; }
      body { font-family: ${INRIA_SANS_STACK}; }
      pre, code, kbd, samp { font-family: ${GEIST_MONO_STACK}; }
    </style>
  </head>
  <body>${httpAppContent}</body>
</html>`;
  }, [httpAppContent]);

  return (
    <>
      <FtpFileTransferDialog
        open={isFtpFilePickerOpen}
        onOpenChange={setIsFtpFilePickerOpen}
        session={ftpSession}
        localFiles={getFtpFilesFromUploadDir(deviceId)}
        language={language}
        isDark={isDark}
        onGetFile={(fileName) => handleFtpSessionCommand(`get ${fileName}`)}
        onPutFile={executeFtpPut}
      />

      <FileEditorModal
        open={!!editingFile}
        filePath={editingFile?.path || ''}
        initialContent={editingFile?.content || ''}
        language={language}
        isDark={isDark}
        onSave={(newContent) => {
          if (editingFile) {
            const fs = loadFs(deviceId);
            writeFile(fs, editingFile.path, newContent);
            saveFs(deviceId, fs);
            if (editingFile.path.replace(/\\/g, '/').toLowerCase().includes('www/index.html')) {
              setServiceHttpContent(newContent);
            }
          }
        }}
        onRunPython={(newContent) => {
          if (editingFile) {
            const fs = loadFs(deviceId);
            writeFile(fs, editingFile.path, newContent);
            saveFs(deviceId, fs);
            if (editingFile.path.replace(/\\/g, '/').toLowerCase().includes('www/index.html')) {
              setServiceHttpContent(newContent);
            }
            const fileName = editingFile.path.split(/[\\/]/).pop() || '';
            setActiveTab('desktop');
            const isBat = fileName.toLowerCase().endsWith('.bat') || fileName.toLowerCase().endsWith('.cmd');
            const cmd = isBat ? fileName : `python ${fileName}`;
            setTimeout(() => {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('pc-run-command', {
                  detail: { deviceId, command: cmd }
                }));
              }
            }, 50);
          }
        }}
        onClose={() => {
          if (editingFile && editingFile.path.replace(/\\/g, '/').toLowerCase().includes('www/index.html')) {
            const fs = loadFs(deviceId);
            const wwwIndex = readFile(fs, 'C:\\www\\index.html') || readFile(fs, 'www/index.html');
            if (wwwIndex !== null) setServiceHttpContent(wwwIndex);
          }
          setEditingFile(null);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
      />

      <PCBrowser
        isOpen={!!httpAppContent}
        isMobile={isMobile}
        isDark={isDark}
        language={language}
        browserWindow={browserWindow}
        onBrowserWindowChange={setBrowserWindow}
        title={httpAppTitle}
        url={httpAppUrl || ''}
        srcDoc={httpAppSrcDoc}
        suggestions={filteredSuggestions}
        showSuggestions={showUrlSuggestions}
        selectedSuggestionIndex={selectedSuggestionIndex}
        urlInputRef={urlInputRef}
        dragStateRef={dragStateRef}
        currentDeviceId={deviceId}
        // Same ref object the orchestrator passed directly before; the
        // context type is readonly, the leaf needs a mutable ref.
        resizeStateRef={ctx.resizeStateRef as unknown as ComponentProps<typeof PCBrowser>['resizeStateRef']}
        onClose={() => {
          setHttpAppUrl('');
          setHttpAppContent(null);
          setHttpAppDeviceId(null);
          inputRef.current?.focus();
        }}
        onUrlChange={setHttpAppUrl}
        onSetShowSuggestions={setShowUrlSuggestions}
        onSetSelectedSuggestionIndex={setSelectedSuggestionIndex}
        onOpenWebPage={openWebPage}
      />

      <PythonInputModal
        session={pythonSession}
        isDark={isDark}
        isMobile={isMobile}
        language={language}
        onSubmit={(input) => {
          if (pythonSession) {
            executeCommand(input);
          }
        }}
        onCancel={() => {
          setPythonSession(null);
          inputRef.current?.focus();
        }}
      />

      <PythonFormWindow
        form={activePythonForm || null}
        isDark={isDark}
        isMobile={isMobile}
        onClose={() => {
          closeActiveDeviceForm(deviceId);
          setActivePythonForm?.(null);
        }}
        onOpenInBrowser={(html, title) => {
          setHttpAppTitle(title || 'Python Form');
          setHttpAppUrl('http://localhost/python-form');
          setHttpAppDeviceId(deviceId);
          setHttpAppContent(html);
        }}
      />
    </>
  );
}
