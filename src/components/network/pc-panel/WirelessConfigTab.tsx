'use client';

import React, { useState } from 'react';
import { Network, Wifi, Monitor, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { SwitchState } from '@/lib/network/types';
import { ensureDeviceStatesMap } from '@/lib/network/networkUtils';
import type { CanvasDevice } from '../networkTopology.types';

interface WirelessConfigTabProps {
  isDark: boolean;
  language: string;
  t: Record<string, string>;
  wifiEnabled: boolean;
  setWifiEnabled: (val: boolean) => void;
  wifiSSID: string;
  setWifiSSID: (val: string) => void;
  wifiBSSID: string;
  setWifiBSSID: (val: string) => void;
  wifiSecurity: 'open' | 'wpa' | 'wpa2' | 'wpa3';
  setWifiSecurity: (val: 'open' | 'wpa' | 'wpa2' | 'wpa3') => void;
  wifiPassword: string;
  setWifiPassword: (val: string) => void;
  wifiChannel: '2.4GHz' | '5GHz';
  setWifiChannel: (val: '2.4GHz' | '5GHz') => void;
  availableSSIDs: Array<{ ssid: string; deviceId: string; deviceName: string }>;
  deviceStates?: Map<string, SwitchState>;
  topologyDevices: CanvasDevice[];
  deviceId: string;
  wifiSignalStrength: number;
  dispatchDeviceConfig: (config: Record<string, unknown>) => void;
  navigateToProgram: (program: string) => void;
  setInput: (val: string) => void;
  executeCommand: (cmd: string) => Promise<void>;
  mobileVerticalScrollStyle?: React.CSSProperties;
}

export function WirelessConfigTab({
  isDark,
  language,
  t,
  wifiEnabled,
  setWifiEnabled,
  wifiSSID,
  setWifiSSID,
  wifiBSSID,
  setWifiBSSID,
  wifiSecurity,
  setWifiSecurity,
  wifiPassword,
  setWifiPassword,
  wifiChannel,
  setWifiChannel,
  availableSSIDs,
  deviceStates,
  topologyDevices,
  deviceId,
  wifiSignalStrength,
  dispatchDeviceConfig,
  navigateToProgram,
  setInput,
  executeCommand,
  mobileVerticalScrollStyle,
}: WirelessConfigTabProps) {
  const [showWifiPassword, setShowWifiPassword] = useState(false);
  const [ssidDropdownOpen, setSsidDropdownOpen] = useState(false);

  const filteredSSIDs = availableSSIDs.filter(e =>
    e.ssid.toLowerCase().includes(wifiSSID.toLowerCase())
  );

  return (
    <div
      className="flex-1 min-h-0 p-3 overflow-y-auto overflow-x-hidden custom-scrollbar"
      style={mobileVerticalScrollStyle}
    >
      <div className={`rounded-2xl border p-5 space-y-5 ${isDark ? 'border-secondary-800 bg-secondary-900/40' : 'border-secondary-200 bg-white'}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 text-purple-500">
            <Network className="w-5 h-5" />
            <h3 className="text-sm font-black tracking-widest ">
              {language === 'tr' ? 'Wi-Fi (Wireless Fidelity) Bağlantısı' : 'Wi-Fi (Wireless Fidelity) Connection'}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="h-7 px-3 text-xs font-semibold bg-accent-600 hover:bg-accent-700 text-white"
              onClick={() => {
                navigateToProgram('desktop');
                setTimeout(() => {
                  const apDevice = topologyDevices.find(d =>
                    (d.type === 'router' || d.type === 'switchL2' || d.type === 'switchL3') &&
                    d.services?.http?.enabled &&
                    (d.wifi?.ssid === wifiSSID || d.ports?.some((p: { wifi?: { ssid?: string } }) => p.wifi?.ssid === wifiSSID))
                  );
                  const targetIp = apDevice?.ip || '192.168.1.1';
                  setInput(`curl ${targetIp}`);
                  void executeCommand(`curl ${targetIp}`);
                }, 300);
              }}
            >
              {language === 'tr' ? 'Kablosuz Ayarları Aç' : 'Open Wireless Settings'}
            </Button>
            <button
              type="button"
              role="switch"
              aria-checked={wifiEnabled}
              onClick={() => {
                const enabled = !wifiEnabled;
                setWifiEnabled(enabled);
                dispatchDeviceConfig({
                  wifi: {
                    enabled: enabled,
                    ssid: wifiSSID,
                    bssid: wifiBSSID,
                    security: wifiSecurity,
                    password: wifiPassword,
                    channel: wifiChannel,
                    mode: 'client'
                  }
                });
              }}
              className={`relative inline-flex h-7 w-14 shrink-0 items-center rounded-full border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/60 ${wifiEnabled
                ? 'bg-purple-500 border-purple-400'
                : (isDark ? 'bg-secondary-800 border-secondary-700' : 'bg-secondary-200 border-secondary-300')
                }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${wifiEnabled ? 'translate-x-8' : 'translate-x-1'}`}
              />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="text-[10px] font-black tracking-widest text-secondary-500 ml-1">SSID (Service Set Identifier)</label>
            <div className="relative">
              <div className={cn(
                "flex items-center border rounded-md px-3 h-9 gap-2",
                !wifiEnabled && "opacity-50 pointer-events-none",
                isDark ? 'bg-background border-secondary-800' : 'bg-white border-secondary-200'
              )}>
                <input
                  type="text"
                  value={wifiSSID}
                  onChange={e => {
                    const val = e.target.value;
                    setWifiSSID(val);
                    setWifiBSSID('');
                    setSsidDropdownOpen(true);
                    dispatchDeviceConfig({
                      wifi: {
                        enabled: wifiEnabled,
                        ssid: val,
                        bssid: '',
                        security: wifiSecurity,
                        password: wifiPassword,
                        channel: wifiChannel,
                        mode: 'client'
                      }
                    });
                  }}
                  onFocus={() => setSsidDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setSsidDropdownOpen(false), 150)}
                  placeholder={language === 'tr' ? 'Ağ seçin veya yazın...' : 'Select or type SSID...'}
                  className={cn(
                    "flex-1 bg-transparent outline-none text-sm",
                    isDark ? 'text-white placeholder:text-secondary-500' : 'text-secondary-900 placeholder:text-secondary-400'
                  )}
                />
                {wifiSSID && (
                  <button type="button" onClick={() => { setWifiSSID(''); setWifiBSSID(''); setSsidDropdownOpen(false); }} className="text-secondary-200 hover:text-white text-xs">✕</button>
                )}
                <button type="button" onClick={() => setSsidDropdownOpen(o => !o)} className="text-secondary-200 hover:text-white text-xs">▾</button>
              </div>
              {ssidDropdownOpen && (
                <div className={cn(
                  "absolute z-50 w-full mt-1 rounded-md border shadow-lg max-h-48 overflow-y-auto overflow-x-hidden custom-scrollbar",
                  isDark ? 'bg-secondary-900 border-secondary-700' : 'bg-white border-secondary-200'
                )}>
                  {filteredSSIDs.length === 0 && (
                    <div className={cn("px-3 py-2 text-xs", isDark ? 'text-secondary-200' : 'text-secondary-400')}>
                      {language === 'tr' ? 'Ağ bulunamadı' : 'No networks found'}
                    </div>
                  )}
                  {filteredSSIDs.map(entry => {
                    const hasDupe = availableSSIDs.filter(e => e.ssid === entry.ssid).length > 1;
                    const label = hasDupe ? `${entry.ssid} (${entry.deviceName})` : entry.ssid;
                    return (
                      <button
                        key={`${entry.deviceId}-${entry.ssid}`}
                        type="button"
                        onPointerDown={(event) => {
                          event.preventDefault();
                          setSsidDropdownOpen(false);
                          setWifiSSID(entry.ssid);
                          setWifiBSSID(entry.deviceId);
                          dispatchDeviceConfig({
                            wifi: {
                              enabled: wifiEnabled,
                              ssid: entry.ssid,
                              bssid: entry.deviceId,
                              security: wifiSecurity,
                              password: wifiPassword,
                              channel: wifiChannel,
                              mode: 'client'
                            }
                          });
                          (document.activeElement as HTMLElement | null)?.blur?.();
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 text-sm hover:bg-purple-500/20",
                          isDark ? 'text-white' : 'text-secondary-900'
                        )}
                      >
                        📶 {label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black tracking-widest text-secondary-500 ml-1">
              {language === 'tr' ? 'Güvenlik' : 'Security'}
            </label>
            <Select
              value={wifiSecurity}
              onValueChange={(val: string) => {
                const security = val as 'open' | 'wpa' | 'wpa2' | 'wpa3';
                setWifiSecurity(security);
                dispatchDeviceConfig({
                  wifi: {
                    enabled: wifiEnabled,
                    ssid: wifiSSID,
                    bssid: wifiBSSID,
                    security: security,
                    password: wifiPassword,
                    channel: wifiChannel,
                    mode: 'client'
                  }
                });
              }}
              disabled={!wifiEnabled}
            >
              <SelectTrigger className={cn("w-full", isDark ? 'bg-background border-secondary-800 text-white' : 'bg-white border-secondary-200 text-secondary-900')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">{language === 'tr' ? 'Açık' : 'Open'}</SelectItem>
                <SelectItem value="wpa">WPA</SelectItem>
                <SelectItem value="wpa2">WPA2 Personal</SelectItem>
                <SelectItem value="wpa3">WPA3</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {wifiSecurity !== 'open' && (
            <div className="space-y-2">
              <label className="text-[10px] font-black tracking-widest text-secondary-500 ml-1">
                {language === 'tr' ? 'Parola' : 'Password'}
              </label>
              <div className="relative">
                <Input
                  type={showWifiPassword ? 'text' : 'password'}
                  value={wifiPassword}
                  onChange={(e) => {
                    const val = e.target.value;
                    setWifiPassword(val);
                    dispatchDeviceConfig({
                      wifi: {
                        enabled: wifiEnabled,
                        ssid: wifiSSID,
                        bssid: wifiBSSID,
                        security: wifiSecurity,
                        password: val,
                        channel: wifiChannel,
                        mode: 'client'
                      }
                    });
                  }}
                  placeholder={t.securityKey}
                  disabled={!wifiEnabled}
                  className="bg-background pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowWifiPassword(v => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-secondary-200 hover:text-white focus:outline-none"
                  tabIndex={-1}
                >
                  {showWifiPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black tracking-widest text-secondary-500 ml-1">
              {language === 'tr' ? 'Kanal' : 'Channel'}
            </label>
            <Select
              value={wifiChannel}
              onValueChange={(val: string) => {
                const channel = val as '2.4GHz' | '5GHz';
                setWifiChannel(channel);
                dispatchDeviceConfig({
                  wifi: {
                    enabled: wifiEnabled,
                    ssid: wifiSSID,
                    bssid: wifiBSSID,
                    security: wifiSecurity,
                    password: wifiPassword,
                    channel: channel,
                    mode: 'client'
                  }
                });
              }}
              disabled={!wifiEnabled}
            >
              <SelectTrigger className={cn("w-full", isDark ? 'bg-background border-secondary-800 text-white' : 'bg-white border-secondary-200 text-secondary-900')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2.4GHz">2.4 GHz</SelectItem>
                <SelectItem value="5GHz">5 GHz</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className={cn(
          "p-4 rounded-xl text-xs flex items-center gap-3",
          (() => {
            if (!wifiEnabled) return 'text-secondary-500 bg-secondary-500/5';
            if (!wifiSSID) return 'text-warning-500 bg-warning-500/10';
            const isConnected = !!deviceStates && Array.from(ensureDeviceStatesMap(deviceStates).entries()).some(([id, state]) => {
              // WLC broadcasts SSIDs through wlcWlans state
              if (state.wlcWlans) {
                const wlan = Object.values(state.wlcWlans).find(w => w.status === 'enabled' && w.ssid === wifiSSID);
                if (wlan) {
                  const apSecurity = wlan.security || 'open';
                  if (apSecurity !== wifiSecurity) return false;
                  if (apSecurity !== 'open' && wlan.password !== wifiPassword) return false;
                  return true;
                }
              }
              const wlan = state.ports['wlan0'];
              if (!wlan || wlan.shutdown || wlan.wifi?.mode !== 'ap') return false;
              if (wifiBSSID && wifiBSSID !== id) return false;
              if (wlan.wifi?.ssid !== wifiSSID) return false;
              const apSecurity = wlan.wifi?.security || 'open';
              if (apSecurity !== wifiSecurity) return false;
              if (apSecurity !== 'open' && wlan.wifi?.password !== wifiPassword) return false;
              return true;
            });
            return isConnected ? 'text-success-500 bg-success-500/10' : 'text-warning-500 bg-warning-500/10';
          })()
        )}>
          <div className={cn(
            "p-2 rounded-lg",
            (() => {
              if (!wifiEnabled) return 'bg-secondary-500/10';
              if (!wifiSSID) return 'bg-warning-500/20';
              const isConnected = !!deviceStates && Array.from(ensureDeviceStatesMap(deviceStates).entries()).some(([id, state]) => {
                // WLC broadcasts SSIDs through wlcWlans state
                if (state.wlcWlans) {
                  const wlan = Object.values(state.wlcWlans).find(w => w.status === 'enabled' && w.ssid === wifiSSID);
                  if (wlan) {
                    const apSecurity = wlan.security || 'open';
                    if (apSecurity !== wifiSecurity) return false;
                    if (apSecurity !== 'open' && wlan.password !== wifiPassword) return false;
                    return true;
                  }
                }
                const wlan = state.ports['wlan0'];
                if (!wlan || wlan.shutdown || wlan.wifi?.mode !== 'ap') return false;
                if (wifiBSSID && wifiBSSID !== id) return false;
                if (wlan.wifi?.ssid !== wifiSSID) return false;
                const apSecurity = wlan.wifi?.security || 'open';
                if (apSecurity !== wifiSecurity) return false;
                if (apSecurity !== 'open' && wlan.wifi?.password !== wifiPassword) return false;
                return true;
              });
              return isConnected ? 'bg-success-500/20' : 'bg-warning-500/20';
            })()
          )}>
            <Monitor className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold tracking-wider mb-0.5">
              {language === 'tr' ? 'Durum' : 'Status'}
            </div>
            <div className="opacity-80">
              {!wifiEnabled
                ? (language === 'tr' ? 'Kablosuz alıcı kapalı' : 'Wireless receiver disabled')
                : (() => {
                  if (!wifiSSID) return language === 'tr' ? 'WLAN0 aktif, ağ seçilmedi' : 'WLAN0 active, no network selected';

                  const foundInStates = !!deviceStates && Array.from(ensureDeviceStatesMap(deviceStates).entries()).find(([id, state]) => {
                    // WLC broadcasts SSIDs through wlcWlans state
                    if (state.wlcWlans) {
                      const wlan = Object.values(state.wlcWlans).find(w => w.status === 'enabled' && w.ssid === wifiSSID);
                      if (wlan) {
                        const apSecurity = wlan.security || 'open';
                        if (apSecurity !== wifiSecurity) return false;
                        if (apSecurity !== 'open' && wlan.password !== wifiPassword) return false;
                        return true;
                      }
                    }
                    const wlan = state.ports['wlan0'];
                    if (!wlan || wlan.shutdown || wlan.wifi?.mode !== 'ap') return false;
                    if (wifiBSSID && wifiBSSID !== id) return false;
                    if (wlan.wifi?.ssid !== wifiSSID) return false;
                    const apSecurity = wlan.wifi?.security || 'open';
                    if (apSecurity !== wifiSecurity) return false;
                    if (apSecurity !== 'open' && wlan.wifi?.password !== wifiPassword) return false;
                    return true;
                  });

                  const foundInTopology = !foundInStates && topologyDevices.find((apDevice) => {
                    if (apDevice.id === deviceId) return false;
                    if (apDevice.type !== 'router' && apDevice.type !== 'switchL2' && apDevice.type !== 'switchL3') return false;
                    const apWifi = apDevice.wifi;
                    if (!apWifi || apWifi.mode !== 'ap' || !apWifi.ssid) return false;
                    if (apWifi.ssid !== wifiSSID) return false;
                    const apSecurity = apWifi.security || 'open';
                    if (apSecurity !== wifiSecurity) return false;
                    if (apSecurity !== 'open' && apWifi.password !== wifiPassword) return false;
                    return true;
                  });

                  const isConnected = !!foundInStates || !!foundInTopology;
                  if (isConnected && wifiSSID) return language === 'tr' ? `Bağlı • SSID: ${wifiSSID}` : `Connected • SSID: ${wifiSSID}`;
                  return wifiSSID
                    ? (language === 'tr' ? `Ağ bulunamadı: ${wifiSSID}` : `Network not found: ${wifiSSID}`)
                    : (language === 'tr' ? 'WLAN0 aktif, ağ seçilmedi' : 'WLAN0 active, no network selected');
                })()
              }
            </div>
          </div>
        </div>

        {wifiEnabled && wifiSSID && (
          <div className={cn(
            "p-4 rounded-xl text-xs flex items-center gap-3",
            isDark ? 'bg-primary-500/10 text-primary-300 border border-primary-500/30' : 'bg-primary-50 text-primary-700 border border-primary-200'
          )}>
            <div className={cn("p-2 rounded-lg", isDark ? 'bg-primary-500/20' : 'bg-primary-100')}>
              <Wifi className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold tracking-wider mb-0.5">
                {language === 'tr' ? 'Sinyal Gücü' : 'Signal Strength'}
              </div>
              <div className="opacity-90">
                {(() => {
                  const strength = wifiSignalStrength;
                  const percentMap: Record<number, number> = { 0: 0, 1: 1, 2: 25, 3: 50, 4: 75, 5: 100 };
                  const percentage = percentMap[strength] || 0;
                  const levelMap = {
                    tr: { 0: 'Sinyal yok', 1: 'Çok Zayıf', 2: 'Zayıf', 3: 'Orta', 4: 'İyi', 5: 'Mükemmel' },
                    en: { 0: 'No signal', 1: 'Very Weak', 2: 'Weak', 3: 'Fair', 4: 'Good', 5: 'Excellent' }
                  };
                  const level = levelMap[language === 'tr' ? 'tr' : 'en'][strength as keyof typeof levelMap['en']] || 'Unknown';
                  return `${level} (${percentage}%)`;
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
