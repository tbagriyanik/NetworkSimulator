import { useState } from 'react';
import { safeGetItem, safeSetItem } from '@/lib/storage/safeStorage';

export function usePCPanelState() {
  const [activeServiceTab, setActiveServiceTab] = useState<'dns' | 'http' | 'dhcp' | 'ftp' | 'mail' | 'ntp' | 'syslog'>('http');
  const [showCmdSettings, setShowCmdSettings] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [fontSize, setFontSize] = useState<number>(() => {
    const raw = safeGetItem('terminal-font-size');
    const parsed = parseInt(raw || '13', 10);
    return Math.max(12, Math.min(20, isNaN(parsed) ? 13 : parsed));
  });

  const handleFontSizeChange = (val: number) => {
    setFontSize(val);
    safeSetItem('terminal-font-size', String(val));
  };

  return {
    activeServiceTab,
    setActiveServiceTab,
    fontSize,
    setFontSize,
    handleFontSizeChange,
    showCmdSettings,
    setShowCmdSettings,
    searchOpen,
    setSearchOpen,
    searchQuery,
    setSearchQuery,
  };
}
