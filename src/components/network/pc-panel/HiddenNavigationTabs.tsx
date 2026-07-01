import { Command, Globe, LayoutGrid, Monitor, Network, Radio, ShieldCheck, Terminal as TerminalIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PCActiveTab } from './PCPanel.types';

interface HiddenNavigationTabsProps {
  activeTab: PCActiveTab;
  setActiveTab: (tab: PCActiveTab) => void;
  isMobile: boolean;
  language: string;
  httpAppContent: string | null;
  httpAppDeviceId: string | null;
  openWebPage: (target?: string, url?: string) => void;
  labels: {
    commandPromptTab: string;
    consoleTab: string;
    settingsTab: string;
    servicesTab: string;
  };
}

export function HiddenNavigationTabs({
  activeTab,
  setActiveTab,
  isMobile,
  language,
  httpAppContent,
  httpAppDeviceId,
  openWebPage,
  labels,
}: HiddenNavigationTabsProps) {
  return (
    <div className="hidden">
      <Button
        variant={activeTab === 'home' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => setActiveTab('home')}
        className={`h-9 px-4 text-xs font-black tracking-wider transition-all gap-2 ${activeTab === 'home' ? 'bg-secondary-500/10 text-secondary-300' : 'text-secondary-500 hover:text-secondary-300'} ${isMobile ? 'flex-1 min-w-0' : ''}`}
      >
        <Monitor className="w-4 h-4" />
        <span className={isMobile ? 'sr-only' : 'hidden md:inline'}>{language === 'tr' ? 'Ana Ekran' : 'Home'}</span>
      </Button>
      <Button
        variant={activeTab === 'desktop' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => setActiveTab('desktop')}
        className={`h-9 px-4 text-xs font-black tracking-wider transition-all gap-2 ${activeTab === 'desktop' ? 'bg-primary-500/10 text-primary-400' : 'text-secondary-500'} ${isMobile ? 'flex-1 min-w-0' : ''}`}
      >
        <Command className="w-4 h-4" />
        <span className={isMobile ? 'sr-only' : 'hidden md:inline'}>{labels.commandPromptTab}</span>
      </Button>
      <Button
        variant={httpAppDeviceId ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => {
          if (!httpAppDeviceId) {
            openWebPage('http://iot-panel');
          }
          setActiveTab('desktop');
        }}
        className={`h-9 px-4 text-xs font-black tracking-wider transition-all gap-2 ${activeTab === 'desktop' && httpAppContent && !httpAppDeviceId ? 'bg-indigo-500/10 text-indigo-400' : 'text-secondary-500'} ${isMobile ? 'flex-1 min-w-0' : ''}`}
      >
        <LayoutGrid className="w-4 h-4" />
        <span className={isMobile ? 'sr-only' : 'hidden md:inline'}>{language === 'tr' ? 'IoT Paneli' : 'IoT Panel'}</span>
      </Button>
      <Button
        variant={activeTab === 'terminal' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => setActiveTab('terminal')}
        className={`h-9 px-4 text-xs font-black tracking-wider  transition-all gap-2 ${activeTab === 'terminal' ? 'bg-emerald-500/10 text-emerald-500' : 'text-secondary-500 hover:text-emerald-500'} ${isMobile ? 'flex-1 min-w-0' : ''}`}
      >
        <TerminalIcon className="w-4 h-4" />
        <span className={isMobile ? 'sr-only' : 'hidden md:inline'}>{labels.consoleTab}</span>
      </Button>
      <Button
        variant={activeTab === 'settings' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => setActiveTab('settings')}
        className={`h-9 px-4 text-xs font-black tracking-wider  transition-all gap-2 ${activeTab === 'settings' ? 'bg-purple-500/10 text-purple-500' : 'text-secondary-500 hover:text-purple-500'} ${isMobile ? 'flex-1 min-w-0' : ''}`}
      >
        <ShieldCheck className="w-4 h-4" />
        <span className={isMobile ? 'sr-only' : 'hidden md:inline'}>{labels.settingsTab}</span>
      </Button>
      <Button
        variant={activeTab === 'services' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => setActiveTab('services')}
        className={`h-9 px-4 text-xs font-black tracking-wider transition-all gap-2 ${activeTab === 'services' ? 'bg-warning-500/10 text-warning-500' : 'text-secondary-500 hover:text-warning-500'} ${isMobile ? 'flex-1 min-w-0' : ''}`}
      >
        <Globe className="w-4 h-4" />
        <span className={isMobile ? 'sr-only' : 'hidden md:inline'}>{labels.servicesTab}</span>
      </Button>
      <Button
        variant={activeTab === 'wireless' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => setActiveTab('wireless')}
        className={`h-9 px-4 text-xs font-black tracking-wider transition-all gap-2 ${activeTab === 'wireless' ? 'bg-purple-500/10 text-purple-500' : 'text-secondary-500 hover:text-purple-500'} ${isMobile ? 'flex-1 min-w-0' : ''}`}
      >
        <Network className="w-4 h-4" />
        <span className={isMobile ? 'sr-only' : 'hidden md:inline'}>{language === 'tr' ? 'Kablosuz' : 'Wireless'}</span>
      </Button>
      <Button
        variant={activeTab === 'iot' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => setActiveTab('iot')}
        className={`h-9 px-4 text-xs font-black tracking-wider transition-all gap-2 ${activeTab === 'iot' ? 'bg-accent-500/10 text-accent-500' : 'text-secondary-500 hover:text-accent-500'} ${isMobile ? 'flex-1 min-w-0' : ''}`}
      >
        <Radio className="w-4 h-4" />
        <span className={isMobile ? 'sr-only' : 'hidden md:inline'}>IoT</span>
      </Button>
    </div>
  );
}
