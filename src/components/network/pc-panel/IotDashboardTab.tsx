'use client';

import React from 'react';
import { Radio, Save, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { normalizeMAC } from "@/lib/utils";
import { getWirelessSignalStrength } from '@/lib/network/connectivity';
import { IoTSensorDisplay } from '../PCPanelWidgets';
import type { CanvasDevice } from '../networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import type { EnvironmentSettings } from '@/lib/store/appStore';

interface IotDashboardTabProps {
  isDark: boolean;
  language: string;
  isMobile: boolean;
  mobileVerticalScrollStyle?: React.CSSProperties;
  iotDevices: CanvasDevice[];
  selectedIotDeviceId: string;
  setSelectedIotDeviceId: (id: string) => void;
  selectedIotDevice: CanvasDevice | null;
  iotSensorType: 'temperature' | 'sound' | 'motion' | 'humidity' | 'light';
  setIotSensorType: (val: 'temperature' | 'sound' | 'motion' | 'humidity' | 'light') => void;
  iotKind: 'cooler' | 'lamp' | 'heater' | 'sensor';
  setIotKind: (val: 'cooler' | 'lamp' | 'heater' | 'sensor') => void;
  iotCollaborationEnabled: boolean;
  setIotCollaborationEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  iotDataStore: string;
  setIotDataStore: (val: string) => void;
  topologyDevices: CanvasDevice[];
  deviceStates?: Map<string, SwitchState>;
  topologyConnections: Array<{ sourceDeviceId: string; sourcePort: string; targetDeviceId: string; targetPort: string; cableType?: string; active?: boolean }>;
  deviceId: string;
  wifiSSID: string;
  navigateToProgram: (program: string) => void;
  setInput: (val: string) => void;
  executeCommand: (cmd: string) => Promise<void>;
  environment: EnvironmentSettings;
}

export function IotDashboardTab({
  isDark,
  language,
  mobileVerticalScrollStyle,
  iotDevices,
  selectedIotDeviceId,
  setSelectedIotDeviceId,
  selectedIotDevice,
  iotSensorType,
  setIotSensorType,
  iotKind,
  setIotKind,
  iotCollaborationEnabled,
  setIotCollaborationEnabled,
  iotDataStore,
  setIotDataStore,
  topologyDevices,
  deviceStates,
  topologyConnections,
  wifiSSID,
  navigateToProgram,
  setInput,
  executeCommand,
  environment,
}: IotDashboardTabProps) {
  return (
    <div className="flex-1 min-h-0 p-3 overflow-y-auto overflow-x-hidden custom-scrollbar" style={mobileVerticalScrollStyle}>
      <div className={`rounded-2xl border p-4 space-y-4 ${isDark ? 'border-secondary-800 bg-secondary-900/40' : 'border-secondary-200 bg-white'}`}>
        <div className="flex items-center justify-between gap-2 text-accent-500">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5" />
            <div>
              <h3 className="text-sm font-black tracking-widest">
                {language === 'tr' ? 'IoT Yönetimi' : 'IoT Management'}
              </h3>
              <p className="text-[10px] font-medium tracking-normal text-accent-500/70">
                {language === 'tr'
                  ? 'Nesneleri yönetmek için yönetim paneli'
                  : 'Panel for managing connected devices'}
              </p>
            </div>
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
            <Button
              size="sm"
              className="h-7 px-3 text-xs font-semibold bg-accent-600 hover:bg-accent-700 text-white"
              onClick={() => {
                navigateToProgram('desktop');
                setTimeout(() => {
                  setInput('curl http://iot-panel');
                  void executeCommand('curl http://iot-panel');
                }, 300);
              }}
            >
              {language === 'tr' ? 'Web Paneli Aç' : 'Open Web Panel'}
            </Button>
          </div>
        </div>

        {iotDevices.length === 0 ? (
          <div className={`text-xs ${isDark ? 'text-secondary-200' : 'text-secondary-600'}`}>
            {language === 'tr' ? 'Topolojide IoT nesnesi yoktur. Önce topolojiye IoT nesnesi ekleyiniz.' : 'No IoT object in topology. Add one first.'}
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <label className="text-xs font-bold text-secondary-500">{language === 'tr' ? 'Nesne Seçimi' : 'Object Selection'}</label>
              <Select value={selectedIotDeviceId} onValueChange={setSelectedIotDeviceId}>
                <SelectTrigger>
                  <SelectValue placeholder="IoT" />
                </SelectTrigger>
                <SelectContent>
                  {iotDevices.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-secondary-500">{language === 'tr' ? 'Cihaz Adı' : 'Device Name'}</label>
              <Input
                value={selectedIotDevice?.name || ''}
                onChange={(e) => {
                  const newName = e.target.value;
                  window.dispatchEvent(new CustomEvent('update-topology-device-config', {
                    detail: {
                      deviceId: selectedIotDeviceId,
                      config: { name: newName }
                    }
                  }));
                }}
                placeholder={language === 'tr' ? 'Cihaz adı...' : 'Device name...'}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-secondary-500">{language === 'tr' ? 'Cihaz Türü' : 'Device Type'}</label>
              <Select
                value={`${iotKind}:${iotSensorType}`}
                onValueChange={(v) => {
                  const [kind, sensor] = v.split(':');
                  setIotKind(kind as 'cooler' | 'lamp' | 'heater' | 'sensor');
                  setIotSensorType(sensor as 'temperature' | 'sound' | 'motion' | 'humidity' | 'light');
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="heater:temperature">{language === 'tr' ? 'Isıtıcı' : 'Heater'}</SelectItem>
                  <SelectItem value="lamp:light">{language === 'tr' ? 'Lamba' : 'Lamp'}</SelectItem>
                  <SelectItem value="cooler:temperature">{language === 'tr' ? 'Soğutucu' : 'Cooler'}</SelectItem>
                  <SelectItem value="sensor:temperature">{language === 'tr' ? 'Isı Sensörü' : 'Temperature Sensor'}</SelectItem>
                  <SelectItem value="sensor:light">{language === 'tr' ? 'Işık Sensörü' : 'Light Sensor'}</SelectItem>
                  <SelectItem value="sensor:humidity">{language === 'tr' ? 'Nem Sensörü' : 'Humidity Sensor'}</SelectItem>
                  <SelectItem value="sensor:motion">{language === 'tr' ? 'Hareket Sensörü' : 'Motion Sensor'}</SelectItem>
                  <SelectItem value="sensor:sound">{language === 'tr' ? 'Ses Sensörü' : 'Sound Sensor'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-4">
              <label className="text-xs font-bold text-secondary-500 shrink-0">
                {language === 'tr' ? 'Cihaz Durumu (Aktif/Pasif)' : 'Device Status (Active/Passive)'}
              </label>
              <span className={`text-[9px] font-bold ${!iotCollaborationEnabled ? 'text-error-500' : 'text-secondary-200'}`}>
                {language === 'tr' ? 'PASİF' : 'PASSIVE'}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={iotCollaborationEnabled}
                onClick={() => setIotCollaborationEnabled((prev) => !prev)}
                className={cn(
                  "relative inline-flex h-7 w-14 items-center rounded-full border transition-all duration-300 shrink-0",
                  iotCollaborationEnabled ? 'bg-accent-500 border-accent-400 shadow-[0_0_3px_rgba(6,182,212,0.15)]' : (isDark ? 'bg-secondary-800 border-secondary-700' : 'bg-secondary-200 border-secondary-300')
                )}
              >
                <span className={cn("inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-300", iotCollaborationEnabled ? 'translate-x-8' : 'translate-x-1')} />
              </button>
              <span className={`text-[9px] font-bold ${iotCollaborationEnabled ? 'text-accent-500' : 'text-secondary-200'}`}>
                {language === 'tr' ? 'AKTİF' : 'ACTIVE'}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <label className="text-xs font-bold text-secondary-500 shrink-0">
                {language === 'tr' ? 'Güç Durumu (Açık/Kapalı)' : 'Power Status (On/Off)'}
              </label>
              <span className={`text-[9px] font-bold ${selectedIotDevice?.status === 'offline' ? 'text-error-500' : 'text-secondary-200'}`}>
                {language === 'tr' ? 'KAPALI' : 'OFF'}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={selectedIotDevice?.status !== 'offline'}
                onClick={() => {
                  if (selectedIotDevice) {
                    const newStatus = selectedIotDevice.status === 'offline' ? 'online' : 'offline';
                    window.dispatchEvent(new CustomEvent('update-topology-device-config', {
                      detail: {
                        deviceId: selectedIotDeviceId,
                        config: { status: newStatus }
                      }
                    }));
                  }
                }}
                className={cn(
                  "relative inline-flex h-7 w-14 items-center rounded-full border transition-all duration-300 shrink-0",
                  selectedIotDevice?.status !== 'offline' ? 'bg-success-500 border-success-400 shadow-[0_0_3px_rgba(16,185,129,0.15)]' : (isDark ? 'bg-secondary-800 border-secondary-700' : 'bg-secondary-200 border-secondary-300')
                )}
              >
                <span className={cn("inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-300", selectedIotDevice?.status !== 'offline' ? 'translate-x-8' : 'translate-x-1')} />
              </button>
              <span className={`text-[9px] font-bold ${selectedIotDevice?.status !== 'offline' ? 'text-success-500' : 'text-secondary-200'}`}>
                {language === 'tr' ? 'AÇIK' : 'ON'}
              </span>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-secondary-500">{language === 'tr' ? 'Veri Saklama (not/json/metin)' : 'Data Storage (note/json/text)'}</label>
              <textarea
                value={iotDataStore}
                onChange={(e) => setIotDataStore(e.target.value)}
                rows={5}
                className={`w-full rounded-md border px-3 py-2 text-sm ${isDark ? 'bg-secondary-950 border-secondary-800 text-secondary-100' : 'bg-white border-secondary-300 text-secondary-900'}`}
                placeholder={language === 'tr' ? 'Sensör verisi veya notlar...' : 'Sensor data or notes...'}
              />
            </div>

            {(() => {
              const wifiStrength = selectedIotDevice ? getWirelessSignalStrength(selectedIotDevice, topologyDevices, deviceStates) : 0;
              const isWired = topologyConnections.some(c =>
                (c.sourceDeviceId === selectedIotDeviceId || c.targetDeviceId === selectedIotDeviceId) && c.active !== false
              );
              const isIotConnected = wifiStrength > 0 || isWired;

              return (
                <div className={`p-4 rounded-xl ${isDark ? 'bg-secondary-800/50' : 'bg-secondary-50'} border ${isDark ? 'border-secondary-700' : 'border-secondary-200'}`}>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-[11px] font-semibold text-secondary-500 mb-1">{language === 'tr' ? 'IP Adresi' : 'IP Address'}</div>
                        <div className={`text-sm font-mono ${selectedIotDevice?.ip ? 'text-accent-600 dark:text-accent-300' : 'text-secondary-200'}`}>
                          {selectedIotDevice?.ip || (language === 'tr' ? 'Atanmamış' : 'Not assigned')}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <div className="text-[11px] font-semibold text-secondary-500 mb-1">{language === 'tr' ? 'MAC Adresi' : 'MAC Address'}</div>
                        <div className="text-sm font-mono text-secondary-600 dark:text-secondary-200">{selectedIotDevice?.macAddress ? normalizeMAC(selectedIotDevice.macAddress) : (language === 'tr' ? 'Yok' : 'N/A')}</div>
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold text-secondary-500 mb-1">{language === 'tr' ? 'Ağ Geçidi' : 'Gateway'}</div>
                        <div className="text-sm font-mono text-secondary-600 dark:text-secondary-200">{selectedIotDevice?.gateway || '-'}</div>
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold text-secondary-500 mb-1">{language === 'tr' ? 'Alt Ağ Maskesi' : 'Subnet Mask'}</div>
                        <div className="text-sm font-mono text-secondary-600 dark:text-secondary-200">{selectedIotDevice?.subnet || '-'}</div>
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold text-secondary-500 mb-1">{language === 'tr' ? 'Durum' : 'Status'}</div>
                        <div className={`text-sm font-semibold ${isIotConnected ? 'text-success-600 dark:text-success-400' : 'text-error-600 dark:text-error-400'}`}>
                          {isIotConnected ? (
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-success-500 animate-pulse"></span>
                              {language === 'tr' ? 'Çevrimiçi' : 'Online'}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-error-500"></span>
                              {language === 'tr' ? 'Çevrimdışı' : 'Offline'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2">
                    {selectedIotDevice?.ip && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="hover:text-primary-500"
                        onClick={() => {
                          const targetIp = selectedIotDevice?.ip;
                          if (targetIp) {
                            navigateToProgram('desktop');
                            setTimeout(() => {
                              executeCommand(`ping ${targetIp}`);
                            }, 300);
                          }
                        }}
                      >
                        <Globe className="w-4 h-4 mr-2" />
                        {language === 'tr' ? 'Ping Gönder' : 'Ping'}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="hover:text-primary-500"
                      onClick={() => {
                        if (selectedIotDeviceId) {
                          window.parent.postMessage({
                            type: 'router-admin-renew-iot',
                            deviceId: selectedIotDeviceId,
                            payload: {
                              iotDeviceId: selectedIotDeviceId
                            }
                          }, '*');
                        }
                      }}
                    >
                      <Radio className="w-4 h-4 mr-2" />
                      {language === 'tr' ? 'IP Yenile' : 'IP Renew'}
                    </Button>
                  </div>
                </div>
              );
            })()}

            {/* Sensor Value & Graph Display */}
            {selectedIotDevice && (
              <IoTSensorDisplay
                device={selectedIotDevice}
                environment={environment}
                language={language}
                isDark={isDark}
              />
            )}

            <div className={`text-xs ${isDark ? 'text-secondary-200' : 'text-secondary-500'} flex items-center gap-1`}>
              <Save className="w-3 h-3" />
              {language === 'tr' ? 'Değişiklikler otomatik kaydediliyor' : 'Changes are auto-saved'}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
