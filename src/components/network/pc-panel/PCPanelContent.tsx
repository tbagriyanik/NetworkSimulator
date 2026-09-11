'use client';

import { cn } from '@/lib/utils';
import { usePCPanel } from './PCPanelContext';
import { HomeLauncher } from './HomeLauncher';
import { PCDesktop } from './PCDesktop';
import { PCTerminal } from './PCTerminal';
import { PCNetworkSettings } from './PCNetworkSettings';
import { PCServices } from './PCServices';
import { PCIotPanel } from './PCIotPanel';
import { PCWifi } from './PCWifi';
import { RestApiExplorerWindow } from './RestApiExplorerWindow';

/**
 * Renders the active tab content. Tab wrappers (PCDesktop, PCTerminal, …)
 * read everything they need from PCPanelContext, so this component is a
 * pure switch with no prop drilling.
 */
export function PCPanelContent() {
  const {
    activeTab, isPcPoweredOff, isDark, isMobile,
    mobileVerticalScrollStyle, launcherApps, navigateToProgram,
    language, topologyDevices,
  } = usePCPanel();

  return (
    <div className={cn(
      'relative z-10 flex-1 min-h-0 flex flex-col overflow-hidden',
      isMobile ? 'p-2' : 'p-[5px]'
    )}>
      {activeTab === 'home' && !isPcPoweredOff && (
        <HomeLauncher
          apps={launcherApps}
          isDark={isDark}
          isPoweredOff={isPcPoweredOff}
          mobileVerticalScrollStyle={mobileVerticalScrollStyle}
          onNavigate={navigateToProgram}
        />
      )}

      {activeTab === 'desktop' && <PCDesktop />}

      {activeTab === 'terminal' && <PCTerminal />}

      {activeTab === 'settings' && <PCNetworkSettings />}

      {activeTab === 'services' && <PCServices />}

      {activeTab === 'iot' && <PCIotPanel />}

      {activeTab === 'wireless' && <PCWifi />}

      {activeTab === 'rest-api' && (
        <RestApiExplorerWindow
          isDark={isDark}
          language={language}
          topologyDevices={topologyDevices}
        />
      )}
    </div>
  );
}
