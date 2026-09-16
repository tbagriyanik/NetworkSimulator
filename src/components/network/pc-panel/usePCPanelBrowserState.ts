import { useState, useEffect, useMemo } from 'react';
import type { CanvasDevice } from '../NetworkTopology/types/networkTopology.types';

import { secureStorage } from '@/lib/storage/secureStorage';

export interface UsePCPanelBrowserStateParams {
  topologyDevices: CanvasDevice[];
  httpAppUrl: string;
  setHttpAppUrl: (url: string) => void;
  httpAppContent: string | null;
  setHttpAppContent: (content: string | null) => void;
  setHttpAppDeviceId: (id: string | null) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

export function usePCPanelBrowserState({
  topologyDevices,
  httpAppUrl,
  setHttpAppUrl,
  httpAppContent,
  setHttpAppContent,
  setHttpAppDeviceId,
  inputRef
}: UsePCPanelBrowserStateParams) {

  const urlSuggestions = useMemo(() => {
    const suggestions: string[] = [];
    suggestions.push('http://iot-panel');

    topologyDevices.forEach(device => {
      if (device.ip && device.ip !== '0.0.0.0') {
        suggestions.push(`http://${device.ip}`);
      }
    });

    return [...new Set(suggestions)];
  }, [topologyDevices]);

  const filteredSuggestions = useMemo(() => {
    if (!httpAppUrl) return urlSuggestions;
    const lowerInput = httpAppUrl.toLowerCase();
    return urlSuggestions.filter(s =>
      s.toLowerCase().includes(lowerInput)
    );
  }, [httpAppUrl, urlSuggestions]);

  const [browserWindow, setBrowserWindow] = useState(() => {
    const defaultValue = { x: 40, y: 140, width: 960, height: 400 };
    if (typeof localStorage !== 'undefined') {
      const saved = secureStorage.getItem('pc-browser-window-state');
      if (!saved) return defaultValue;
      try {
        const parsed = JSON.parse(saved);
        return {
          x: typeof parsed.x === 'number' ? parsed.x : defaultValue.x,
          y: typeof parsed.y === 'number' ? parsed.y : defaultValue.y,
          width: typeof parsed.width === 'number' ? parsed.width : defaultValue.width,
          height: typeof parsed.height === 'number' ? parsed.height : defaultValue.height,
        };
      } catch {
        secureStorage.removeItem('pc-browser-window-state');
        return defaultValue;
      }
    }
    return defaultValue;
  });

  useEffect(() => {
    secureStorage.setItem('pc-browser-window-state', JSON.stringify(browserWindow));
  }, [browserWindow]);

  useEffect(() => {
    if (!httpAppContent) return;

    const handleBrowserWindowEscape = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setHttpAppUrl('');
        setHttpAppContent(null);
        setHttpAppDeviceId(null);
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleBrowserWindowEscape, true);
    return () => {
      window.removeEventListener('keydown', handleBrowserWindowEscape, true);
    };
  }, [httpAppContent, setHttpAppUrl, setHttpAppContent, setHttpAppDeviceId, inputRef]);

  return {
    urlSuggestions,
    filteredSuggestions,
    browserWindow,
    setBrowserWindow
  };
}



