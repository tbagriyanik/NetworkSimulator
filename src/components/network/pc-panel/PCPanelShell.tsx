'use client';

import { type RefObject } from 'react';
import { Terminal as TerminalIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ModernPanel } from '@/components/ui/ModernPanel';
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

      <div className="flex-1 min-h-0 p-0 md:px-2 md:pb-2">
        <div className="mx-auto flex h-full min-h-0 w-full max-w-[1500px] items-center justify-center overflow-hidden">
          <div
            className={cn(
              "relative flex h-full min-h-0 w-full flex-col overflow-hidden shadow-[0_15px_50px_rgba(15,23,42,0.1)]",
              isMobile
                ? "rounded-xl border-none bg-transparent"
                : (isDark
                  ? "rounded-[2rem] border border-white/10 bg-transparent"
                  : "rounded-[2rem] border border-white/70 bg-transparent")
            )}
          >
            <div
              className="relative flex-1 min-h-0 flex flex-col overflow-hidden bg-transparent"
            >
              <div className="pointer-events-none absolute inset-0">
              </div>
              <ModernPanel
                id={deviceId}
                title={activeTab === 'desktop' ? t.terminalLabel : internalPcHostname}
                headerStart={activeTab === 'desktop' ? (
                  <span className={cn("shrink-0", isDark ? "text-orange-300" : "text-orange-600")}>
                    <TerminalIcon className="w-4 h-4" />
                  </span>
                ) : undefined}
                // The outer PC window already owns collapse/close actions.
                // Keep the inner panel as a content-only surface.
                collapsible={false}
                hideTitle={(activeTab === 'desktop' || activeTab === 'terminal') ? false : true}
                hideHeader={(activeTab === 'desktop' || activeTab === 'terminal') ? false : true}
                headerAction={!isMobile ? <PCPanelTerminalToolbar
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
                /> : undefined}
                noPadding
                style={{ height: '100%' }}
                className="w-full min-w-0 h-full flex flex-col relative bg-transparent border-none shadow-none"
              >
                {/* Power Off Overlay - Mobile/Desktop ekranını tamamen karartır */}
                {isPcPoweredOff && <PowerOffOverlay />}
                <div className="bg-transparent flex-1 min-h-0 flex flex-col">

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
              </ModernPanel>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
