import { useMemo } from 'react';
import { Laptop, Terminal as TerminalIcon, Globe, Settings, Wifi, Radio } from 'lucide-react';

interface UsePCPanelLauncherAppsOptions {
  isDark: boolean;
  language: 'tr' | 'en';
  terminalLabel: string;
}

/** Home-launcher app definitions, extracted from PCPanel orchestrator. */
export function usePCPanelLauncherApps({ isDark, language, terminalLabel }: UsePCPanelLauncherAppsOptions) {
  const launcherApps = useMemo(() => [
    {
      tab: 'desktop' as const,
      label: terminalLabel,
      subtitle: language === 'tr' ? 'Komut İstemi' : 'Command Prompt',
      icon: TerminalIcon,
      accent: isDark ? 'bg-orange-500 from-orange-500 to-orange-400' : 'bg-orange-500 from-orange-600 to-orange-500',
      buttonClass: isDark ? 'text-orange-300 border-orange-400/20 bg-orange-500/10' : 'text-orange-700 border-orange-200 bg-orange-50/90',
    },
    {
      tab: 'terminal' as const,
      label: language === 'tr' ? 'Konsol' : 'Console',
      subtitle: language === 'tr' ? 'Cihaza seri bağlan' : 'Serial device access',
      icon: Laptop,
      accent: isDark ? 'bg-success-500 from-success-500 to-accent-400' : 'bg-success-500 from-success-600 to-accent-500',
      buttonClass: isDark ? 'text-success-300 border-success-400/20 bg-success-500/10' : 'text-success-700 border-success-200 bg-success-50/90',
    },
    {
      tab: 'wireless' as const,
      label: language === 'tr' ? 'Kablosuz' : 'Wireless',
      subtitle: language === 'tr' ? 'Wi-Fi bilgisi' : 'Wi-Fi overview',
      icon: Wifi,
      accent: isDark ? 'bg-accent-500 from-accent-500 to-accent-400' : 'bg-accent-500 from-accent-600 to-accent-500',
      buttonClass: isDark ? 'text-accent-300 border-accent-400/20 bg-accent-500/10' : 'text-accent-700 border-accent-200 bg-accent-50/90',
    },
    {
      tab: 'settings' as const,
      label: language === 'tr' ? 'Ayarlar' : 'Settings',
      subtitle: language === 'tr' ? 'PC yapılandırması' : 'PC configuration',
      icon: Settings,
      accent: isDark ? 'bg-purple-500 from-purple-500 to-pink-400' : 'bg-purple-500 from-purple-600 to-pink-500',
      buttonClass: isDark ? 'text-purple-300 border-purple-400/20 bg-purple-500/10' : 'text-purple-700 border-purple-200 bg-purple-50/90',
    },
    {
      tab: 'services' as const,
      label: language === 'tr' ? 'Servisler' : 'Services',
      subtitle: language === 'tr' ? 'HTTP, DNS, DHCP' : 'HTTP, DNS, DHCP',
      icon: Globe,
      accent: isDark ? 'bg-warning-500 from-warning-500 to-warning-400' : 'bg-warning-500 from-warning-600 to-warning-500',
      buttonClass: isDark ? 'text-warning-300 border-warning-400/20 bg-warning-500/10' : 'text-warning-700 border-warning-200 bg-warning-50/90',
    },
    {
      tab: 'iot' as const,
      label: 'IoT',
      subtitle: language === 'tr' ? 'Sensör ağı' : 'Sensor network',
      icon: Radio,
      accent: isDark ? 'bg-accent-500 from-accent-500 to-primary-400' : 'bg-accent-500 from-accent-600 to-primary-500',
      buttonClass: isDark ? 'text-accent-300 border-accent-400/20 bg-accent-500/10' : 'text-accent-700 border-accent-200 bg-accent-50/90',
    },
  ], [language, isDark, terminalLabel]);

  return { launcherApps };
}
