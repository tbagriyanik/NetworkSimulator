'use client';

import { type RefObject } from 'react';
import { Terminal as TerminalIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePCPanel } from './PCPanelContext';
import { PCPanelContent } from './PCPanelContent';
import { PCPanelHeader } from './PCPanelHeader';
import { PCPanelNavigation } from './PCPanelNavigation';
import { PCPanelTerminalToolbar } from './PCPanelTerminalToolbar';
import { PowerOffOverlay } from './PowerOffOverlay';
import { SearchOutputDialog } from './SearchOutputDialog';

interface PCPanelShellProps {
  panelRef: RefObject<HTMLDivElement | null>;
  className?: string;
  onTogglePower?: (deviceId: string) => void;
}

/**
 * Panel chrome (header, window frame, navigation, content area).
 * Extracted from PCPanel orchestrator; reads everything from PCPanelContext.
 */
export function PCPanelShell({ panelRef, className, onTogglePower }: PCPanelShellProps) {
  const ctx = usePCPanel();
  const {
    isDark, internalPcHostname, pcIP, activeTab, language, isPcPoweredOff,
    wifiSignalStrength, ntpPanelTime, t, deviceId, goHome, navigateToProgram,
    openWebPage, formatFullDateTime, isMobile, showCmdSettings, setSearchOpen,
    handleCopyAll, setShowCmdSettings, fontSize, handleFontSizeChange, setPcOutput,
    searchOpen, searchQuery, setSearchQuery, goToNextMatch, goToPrevMatch,
    searchMatchIndex, searchMatchCount, setActiveTab,
    httpAppContent, httpAppDeviceId,
  } = ctx;

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(language === 'tr' ? 'tr-TR' : 'en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      ref={panelRef}
      className={cn(
        "relative w-full h-full min-h-0 flex flex-col overflow-hidden",
        className
      )}
    >
      {/* Hide header on mobile home view for authentic smartphone home screen look */}
      {!(isMobile && activeTab === 'home') && (
        <PCPanelHeader
          isDark={isDark}
          internalPcHostname={internalPcHostname}
          pcIP={pcIP}
          activeTab={activeTab}
          language={language}
          isPcPoweredOff={isPcPoweredOff}
          wifiSignalStrength={wifiSignalStrength}
          ntpPanelTime={ntpPanelTime}
          t={t}
          deviceId={deviceId}
          onGoHome={goHome}
          onNavigateToProgram={navigateToProgram}
          onTogglePower={onTogglePower}
          openWebPage={openWebPage}
          formatTime={formatTime}
          formatFullDateTime={formatFullDateTime}
          terminalToolbar={isMobile ? <PCPanelTerminalToolbar
            activeTab={activeTab}
            isDark={isDark}
            t={t}
            isMobile={isMobile}
            language={language}
            showCmdSettings={showCmdSettings}
            onSearchOpen={() => setSearchOpen(true)}
            onCopyAll={handleCopyAll}
            onToggleCmdSettings={() => setShowCmdSettings(!showCmdSettings)}
          /> : undefined}
        />
      )}

      <div className={cn("flex-1 min-h-0", isMobile ? "p-0" : "p-1 md:px-2 md:pb-2")}>
        <div className="mx-auto flex h-full min-h-0 w-full max-w-[1500px] items-center justify-center overflow-hidden">
          <div
            className={cn(
              "relative flex h-full min-h-0 w-full flex-col overflow-hidden",
              isMobile
                ? "rounded-none border-none bg-transparent shadow-none"
                : (isDark
                  ? "rounded-2xl md:rounded-[2rem] border border-white/10 bg-transparent shadow-[0_15px_50px_rgba(15,23,42,0.1)]"
                  : "rounded-2xl md:rounded-[2rem] border border-white/70 bg-transparent shadow-[0_15px_50px_rgba(15,23,42,0.1)]")
            )}
          >
            <div className="relative flex-1 min-h-0 flex flex-col overflow-hidden bg-transparent">
              {/* Optional sub-header for desktop/terminal tabs */}
              {(activeTab === 'desktop' || activeTab === 'terminal') && (
                <div className={cn(
                  "flex items-center justify-between gap-1.5 px-3 py-1.5 border-b select-none shrink-0",
                  isDark ? "bg-secondary-900/60 border-secondary-800 text-secondary-100" : "bg-secondary-100/80 border-secondary-200 text-secondary-900"
                )}>
                  <div className="flex items-center gap-2 overflow-hidden flex-1">
                    <span className={cn("shrink-0", isDark ? "text-orange-300" : "text-orange-600")}>
                      <TerminalIcon className="w-4 h-4" />
                    </span>
                    <span className="text-xs font-bold font-mono truncate">
                      {activeTab === 'desktop' ? t.terminalLabel : internalPcHostname}
                    </span>
                  </div>
                  {!isMobile && (
                    <PCPanelTerminalToolbar
                      activeTab={activeTab}
                      isDark={isDark}
                      t={t}
                      isMobile={isMobile}
                      language={language}
                      showCmdSettings={showCmdSettings}
                      fontSize={fontSize}
                      onFontSizeChange={handleFontSizeChange}
                      onClear={() => setPcOutput([])}
                      onSearchOpen={() => setSearchOpen(true)}
                      onCopyAll={handleCopyAll}
                      onToggleCmdSettings={() => setShowCmdSettings(!showCmdSettings)}
                    />
                  )}
                </div>
              )}

              {/* Power Off Overlay - Mobile/Desktop ekranını tamamen karartır */}
              {isPcPoweredOff && <PowerOffOverlay />}

              <div className="bg-transparent flex-1 min-h-0 flex flex-col overflow-hidden">
                <SearchOutputDialog
                  open={searchOpen}
                  onOpenChange={setSearchOpen}
                  isDark={isDark}
                  labels={{
                    searchOutputTitle: t.searchOutputTitle,
                    searchOutputDescription: t.searchOutputDescription,
                    searchPlaceholder: t.searchPlaceholder,
                    close: t.close,
                    noResultsFound: t.noResultsFound,
                  }}
                  searchQuery={searchQuery}
                  onSearchQueryChange={setSearchQuery}
                  onNext={goToNextMatch}
                  onPrev={goToPrevMatch}
                  matchIndex={searchMatchIndex}
                  matchCount={searchMatchCount}
                />

                {/* Navigation Tabs - Hide on mobile, use main app tabs */}
                <PCPanelNavigation
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  isMobile={isMobile}
                  language={language}
                  httpAppContent={httpAppContent}
                  httpAppDeviceId={httpAppDeviceId}
                  openWebPage={openWebPage}
                  labels={{
                    commandPromptTab: t.commandPromptTab,
                    consoleTab: t.consoleTab,
                    settingsTab: t.settingsTab,
                    servicesTab: t.servicesTab,
                  }}
                />

                {/* Content Area — delegates to PCPanelContent which reads from context */}
                <PCPanelContent />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
