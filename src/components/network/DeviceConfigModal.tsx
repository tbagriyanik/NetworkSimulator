import { useState, useEffect, useRef, useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { CanvasDevice } from './NetworkTopology/types/networkTopology.types';
import { useLanguage } from '../../contexts/LanguageContext';
import { normalizeMAC } from '../../lib/utils';
import { useAppStore } from '../../lib/store/appStore';
import { buildRunningConfig } from '../../lib/network/core/configBuilder';
import { executeCommand } from '../../lib/network/executor';
import { createInitialState } from '../../lib/network/initialState';
import type { SwitchState } from '../../lib/network/types';
import { validateIP, validateIPv6 } from './pc-panel/pcPanelHelpers';
import { isValidSubnetMask, isNetworkOrBroadcastAddress } from '@/lib/network/core/interface/helpers';
import { useModalDismiss } from '@/hooks/useModalDismiss';
import { X } from 'lucide-react';
import { WINDOW_CLOSE_BUTTON_CLASS, WINDOW_CANCEL_BUTTON_CLASS, WINDOW_TITLE_CLASS } from '@/components/ui/windowStandards';

interface DeviceConfigModalProps {
  device: CanvasDevice;
  devices?: CanvasDevice[];
  onClose: () => void;
  onSave: (deviceId: string, updates: Partial<CanvasDevice>) => void;
  isMobile?: boolean;
  isDark: boolean;
}

export function DeviceConfigModal({
  device,
  devices,
  onClose,
  onSave,
  isDark,
}: DeviceConfigModalProps) {
  const { t, language } = useLanguage();
  const configInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const [tempNameValue, setTempNameValue] = useState(device.name || '');
  const [ipValue, setIpValue] = useState(device.ip || '');
  const [subnetValue, setSubnetValue] = useState(device.subnet || '255.255.255.0');

  const initialGateway = device.gateway || (device.ip ? (() => {
    const parts = device.ip.split('.');
    parts[3] = '1';
    return parts.join('.');
  })() : '192.168.1.1');

  const [gatewayValue, setGatewayValue] = useState(initialGateway);
  const [ipv6Value, setIpv6Value] = useState(device.ipv6 || '');
  const [dnsValue, setDnsValue] = useState(device.dns || '8.8.8.8');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [configMessage, setConfigMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSwitchOrRouter = ['switchL2', 'switchL3', 'router', 'firewall', 'wlc'].includes(device.type);

  const handleExportConfig = () => {
    try {
      let configContent = '';
      const filename = `${(tempNameValue.trim() || device.name || 'device').replace(/\s+/g, '_')}_config.cfg`;

      if (isSwitchOrRouter) {
        const switchState = useAppStore.getState().deviceStates.switchStates[device.id];
        if (switchState) {
          const lines = buildRunningConfig(switchState);
          configContent = lines.join('\n');
        } else {
          configContent = `! Configuration for ${device.name}\nhostname ${tempNameValue.trim() || device.name}\n! No running-config state found\n`;
        }
      } else {
        // PC / IoT config
        configContent = `! PC / Host Configuration File\n! Device: ${device.name}\nhostname ${tempNameValue.trim() || device.name}\nip address ${ipValue.trim() || '0.0.0.0'} ${subnetValue.trim() || '255.255.255.0'}\ndefault-gateway ${gatewayValue.trim() || '0.0.0.0'}\ndns-server ${dnsValue.trim() || '8.8.8.8'}\nipv6 address ${ipv6Value.trim() || 'none'}\n`;
      }

      const blob = new Blob([configContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setConfigMessage({
        text: language === 'tr' ? 'Konfigürasyon dosyası (.cfg) başarıyla indirildi.' : 'Configuration file (.cfg) downloaded successfully.',
        type: 'success'
      });
      setTimeout(() => setConfigMessage(null), 4000);
    } catch {
      setConfigMessage({
        text: language === 'tr' ? 'Konfigürasyon dışa aktarılamadı.' : 'Failed to export configuration.',
        type: 'error'
      });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        if (!content) return;

        if (isSwitchOrRouter) {
          const store = useAppStore.getState();
          let currentState = store.deviceStates.switchStates[device.id];
          if (!currentState) {
            currentState = createInitialState(
              device.macAddress,
              device.type === 'switchL3' || device.type === 'router' ? 'NS-L3-24PS' : 'NS-L2-24TT-L'
            );
            currentState.hostname = tempNameValue.trim() || device.name;
          }

          const rawLines = content.split(/\r?\n/);
          let appliedCount = 0;
          let stateCopy: SwitchState = { ...currentState, currentMode: 'config' };

          for (const rawLine of rawLines) {
            const line = rawLine.trim();
            if (!line || line.startsWith('!') || line.startsWith('#')) continue;

            const res = executeCommand(
              stateCopy,
              line,
              language === 'tr' ? 'tr' : 'en',
              store.topology.devices,
              store.topology.connections,
              undefined,
              device.id,
              true
            );
            if (res.newState) {
              stateCopy = { ...stateCopy, ...res.newState };
              appliedCount++;
            }
          }

          stateCopy.currentMode = 'privileged';
          store.setSwitchState(device.id, stateCopy);

          if (stateCopy.hostname && stateCopy.hostname !== tempNameValue) {
            setTempNameValue(stateCopy.hostname);
            onSave(device.id, { name: stateCopy.hostname });
          }

          setConfigMessage({
            text: language === 'tr'
              ? `Konfigürasyon uygulandı! (${appliedCount} komut işlendi)`
              : `Configuration applied! (${appliedCount} commands processed)`,
            type: 'success'
          });
        } else {
          // PC / IoT configuration parsing
          const lines = content.split(/\r?\n/);
          let newName = tempNameValue;
          let newIp = ipValue;
          let newSubnet = subnetValue;
          let newGateway = gatewayValue;
          let newDns = dnsValue;
          let newIpv6 = ipv6Value;

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('!') || trimmed.startsWith('#')) continue;

            const lower = trimmed.toLowerCase();
            if (lower.startsWith('hostname ')) {
              newName = trimmed.slice(9).trim();
            } else if (lower.startsWith('ip address ') || lower.startsWith('ip ')) {
              const parts = trimmed.replace(/^ip\s+(address\s+)?/i, '').split(/\s+/);
              if (parts[0]) newIp = parts[0];
              if (parts[1]) newSubnet = parts[1];
            } else if (lower.startsWith('default-gateway ') || lower.startsWith('gateway ')) {
              newGateway = trimmed.split(/\s+/)[1] || newGateway;
            } else if (lower.startsWith('dns-server ') || lower.startsWith('dns ')) {
              newDns = trimmed.split(/\s+/)[1] || newDns;
            } else if (lower.startsWith('ipv6 address ') || lower.startsWith('ipv6 ')) {
              newIpv6 = trimmed.replace(/^ipv6\s+(address\s+)?/i, '').trim();
            }
          }

          setTempNameValue(newName);
          setIpValue(newIp);
          setSubnetValue(newSubnet);
          setGatewayValue(newGateway);
          setDnsValue(newDns);
          setIpv6Value(newIpv6);

          onSave(device.id, {
            name: newName,
            ip: newIp,
            subnet: newSubnet,
            gateway: newGateway,
            dns: newDns,
            ipv6: newIpv6
          });

          setConfigMessage({
            text: language === 'tr' ? 'PC yapılandırması başarıyla yüklendi ve uygulandı!' : 'PC configuration loaded and applied successfully!',
            type: 'success'
          });
        }
        setTimeout(() => setConfigMessage(null), 4000);
      } catch {
        setConfigMessage({
          text: language === 'tr' ? 'Dosya ayrıştırılırken hata oluştu.' : 'Failed to parse configuration file.',
          type: 'error'
        });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const timer = setTimeout(() => configInputRef.current?.focus(), 50);
    return () => {
      clearTimeout(timer);
      previousFocusRef.current?.focus();
    };
  }, []);

  useEffect(() => {
    const handleTab = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !modalRef.current) return;
      const focusable = Array.from(modalRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, []);

  const handleIpChange = (newIp: string) => {
    setIpValue(newIp);
    if (errors.ip) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.ip;
        return next;
      });
    }
    if (validateIP(newIp)) {
      const firstOctet = newIp.split('.')[0];
      if (firstOctet) {
        const octetNum = parseInt(firstOctet, 10);
        if (!isNaN(octetNum)) {
          if (octetNum >= 1 && octetNum <= 126) setSubnetValue('255.0.0.0');
          else if (octetNum >= 128 && octetNum <= 191) setSubnetValue('255.255.0.0');
          else if (octetNum >= 192 && octetNum <= 223) setSubnetValue('255.255.255.0');
        }
      }
    }
  };

  const clearFieldError = (field: string) => {
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSave = () => {
    const nextName = tempNameValue.trim();
    const newErrors: Record<string, string> = {};

    if (!nextName) {
      newErrors.name = language === 'tr' ? 'Cihaz adı boş olamaz.' : 'Device name cannot be empty.';
    }

    const allDevices = devices && devices.length > 0 ? devices : (useAppStore.getState().topology.devices || []);

    if (device.type === 'pc' || device.type === 'iot') {
      const nextIp = ipValue.trim();
      const nextSubnet = subnetValue.trim();
      const nextGateway = gatewayValue.trim();
      const nextDns = dnsValue.trim();
      const nextIpv6 = ipv6Value.trim();

      // 1. IP format check
      if (!validateIP(nextIp)) {
        newErrors.ip = t.invalidIpAddress || (language === 'tr' ? 'Geçersiz IP adresi' : 'Invalid IP address');
      } else if (!validateIP(nextSubnet) || !isValidSubnetMask(nextSubnet)) {
        // 2. Subnet mask format & contiguous bits check
        newErrors.subnet = t.invalidSubnetMaskMsg || t.invalidSubnetMask || (language === 'tr' ? 'Geçersiz alt ağ maskesi' : 'Invalid subnet mask');
      } else if (isNetworkOrBroadcastAddress(nextIp, nextSubnet)) {
        // 3. Network or Broadcast Address Check
        newErrors.ip = t.invalidHostAddressMsg || (language === 'en' ? 'Invalid host address (Network or broadcast address)' : 'Geçersiz host adresi (Ağ veya Broadcast adresi atanamaz)');
      } else {
        // 4. IP Conflict check across topology
        const duplicateIpDevices = allDevices.filter(d => d.id !== device.id && d.ip === nextIp);
        if (duplicateIpDevices.length > 0) {
          const names = duplicateIpDevices.map(d => d.name || d.id).join(', ');
          newErrors.ip = t.ipAlreadyInUse?.replace('{names}', names) || (language === 'en' ? `This IP address is already used by ${names}` : `Bu IP adresi zaten ${names} tarafından kullanılıyor`);
        }
      }

      // Subnet mask validation check (if not checked above)
      if (!newErrors.subnet && (!validateIP(nextSubnet) || !isValidSubnetMask(nextSubnet))) {
        newErrors.subnet = t.invalidSubnetMaskMsg || t.invalidSubnetMask || (language === 'tr' ? 'Geçersiz alt ağ maskesi' : 'Invalid subnet mask');
      }

      // 5. Gateway check
      if (nextGateway) {
        if (!validateIP(nextGateway)) {
          newErrors.gateway = t.invalidGatewayAddress || (language === 'tr' ? 'Geçersiz Ağ Geçidi adresi' : 'Invalid Gateway address');
        } else if (!newErrors.subnet && isNetworkOrBroadcastAddress(nextGateway, nextSubnet)) {
          newErrors.gateway = language === 'tr' ? 'Ağ geçidi, ağ veya broadcast adresi olamaz' : 'Gateway cannot be network or broadcast address';
        }
      }

      // 6. DNS check
      if (nextDns && !validateIP(nextDns)) {
        newErrors.dns = t.invalidDnsAddress || (language === 'tr' ? 'Geçersiz DNS adresi' : 'Invalid DNS address');
      }

      // 7. IPv6 check
      if (nextIpv6) {
        if (!validateIPv6(nextIpv6)) {
          newErrors.ipv6 = t.invalidIpv6Address || (language === 'tr' ? 'Geçersiz IPv6 adresi' : 'Invalid IPv6 address');
        } else {
          const normIpv6 = nextIpv6.trim().toLowerCase();
          const duplicateIpv6Devices = allDevices.filter(d => {
            if (d.id === device.id) return false;
            if (d.ipv6 && d.ipv6.trim().toLowerCase() === normIpv6) return true;
            if (d.ports?.some(p => p.ipv6Address && p.ipv6Address.trim().toLowerCase() === normIpv6)) return true;
            return false;
          });

          if (duplicateIpv6Devices.length > 0) {
            const names = duplicateIpv6Devices.map(d => d.name || d.id).join(', ');
            newErrors.ipv6 = t.ipv6AlreadyInUse?.replace('{names}', names) || (language === 'en' ? `This IPv6 address is already used by ${names}` : `Bu IPv6 adresi zaten ${names} tarafından kullanılıyor`);
          }
        }
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      setErrors({});
      onSave(device.id, {
        name: nextName || device.name,
        ip: nextIp,
        subnet: nextSubnet,
        ipv6: nextIpv6,
        gateway: nextGateway,
        dns: nextDns
      });
    } else {
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      setErrors({});
      onSave(device.id, {
        name: nextName || device.name
      });
    }
  };

  // Optimize: Only subscribe to specific device state instead of all switchStates
  const switchState = useAppStore(state => state.deviceStates.switchStates[device.id]);
  const isDiff = useMemo(() => {
    if (!switchState || !switchState.savedConfig) return false;
    const currentRun = buildRunningConfig(switchState).join('\n').trim();
    return switchState.savedConfig.trim() !== currentRun;
  }, [switchState]);

  useModalDismiss({
    isOpen: true,
    onClose,
    modalId: `device-config-${device.id}`,
    enableEscape: true,
    enableMobileBack: true,
  });

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 modal"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-secondary-950/40 backdrop-blur-sm" />
      <div
        ref={modalRef}
        className={`relative w-full max-w-[420px] max-h-[88vh] flex flex-col overflow-hidden rounded-2xl border transition-all duration-300 shadow-2xl ${
          isDark ? 'bg-secondary-900 border-secondary-800 text-white' : 'bg-white border-secondary-200 text-secondary-900'
        }`}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
          } else if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSave();
          }
        }}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="device-config-title"
      >
        {/* Modal Header */}
        <div className={`shrink-0 px-3.5 py-2.5 border-b flex items-center justify-between ${
          isDark ? 'border-secondary-800 bg-secondary-900/90' : 'border-secondary-100 bg-secondary-50/80'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`p-1.5 rounded-lg ${
              isDark ? 'bg-accent-500/15 text-accent-400 border border-accent-500/30' : 'bg-accent-50 text-accent-600 border border-accent-100'
            }`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0 -2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0 -1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 1 1 -6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h3 id="device-config-title" className={WINDOW_TITLE_CLASS(isDark)}>
                {t.configure}
              </h3>
              <div className="text-[10px] font-mono opacity-50 leading-none mt-0.5">
                {device.name}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={WINDOW_CLOSE_BUTTON_CLASS}
            aria-label={t.close || (language === 'tr' ? 'Kapat' : 'Close')}
            title={t.close || (language === 'tr' ? 'Kapat' : 'Close')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar p-3 space-y-2.5">
          {/* Runtime State Diff Banner */}
          {isDiff && (
            <div className={`p-2 rounded-xl border flex items-start gap-2 text-[11px] ${
              isDark ? 'bg-amber-950/40 border-amber-500/40 text-amber-200' : 'bg-amber-50 border-amber-300 text-amber-900'
            }`}>
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-warning-500" />
              <div className="min-w-0 flex-1 leading-tight">
                <span className="font-bold">
                  {language === 'tr' ? 'Çalışma Zamanı Uyumsuzluğu: ' : 'Runtime State Diff: '}
                </span>
                <span className="opacity-90">
                  {language === 'tr'
                    ? 'Running-config ile startup-config arasında fark var. Persistent kayıt için "write memory" çalıştırın.'
                    : 'Running-config differs from startup-config. Run "write memory" to persist.'}
                </span>
              </div>
            </div>
          )}

          {/* Top Row: Device Name + MAC Address */}
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-7 space-y-1">
              <label htmlFor="device-name-input" className={`text-[10px] font-bold uppercase tracking-wider block ml-0.5 ${
                isDark ? 'text-secondary-400' : 'text-secondary-500'
              }`}>
                {t.deviceName}
              </label>
              <input
                id="device-name-input"
                ref={configInputRef}
                type="text"
                autoCapitalize="off"
                autoCorrect="off"
                value={tempNameValue}
                onChange={(e) => {
                  setTempNameValue(e.target.value);
                  clearFieldError('name');
                }}
                className={`w-full h-8 px-2.5 rounded-lg border text-xs font-bold transition-all outline-none ${
                  errors.name
                    ? 'border-error-500 bg-error-500/5 focus:border-error-500 focus:ring-2 focus:ring-error-500/10'
                    : isDark
                    ? 'bg-secondary-950/50 border-secondary-800 text-white placeholder-secondary-600 focus:border-accent-500/50 focus:ring-2 focus:ring-accent-500/10'
                    : 'bg-secondary-50 border-secondary-200 text-secondary-900 placeholder-secondary-400 focus:border-accent-500/50 focus:ring-2 focus:ring-accent-500/10'
                }`}
                placeholder={language === 'tr' ? 'Örn: Router-X' : 'e.g. Router-X'}
              />
              {errors.name && (
                <p className="text-[11px] text-error-500 flex items-center gap-1 font-medium mt-0.5 ml-0.5">
                  <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{errors.name}</span>
                </p>
              )}
            </div>

            <div className="col-span-5 space-y-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider block ml-0.5 ${
                isDark ? 'text-secondary-400' : 'text-secondary-500'
              }`}>
                MAC Address
              </span>
              <div className={`h-8 px-2.5 rounded-lg border flex items-center justify-between text-[11px] font-mono font-bold ${
                isDark ? 'bg-secondary-950/40 border-secondary-800 text-secondary-300' : 'bg-secondary-50 border-secondary-200 text-secondary-700'
              }`}>
                <span className="truncate" title={device.macAddress ? normalizeMAC(device.macAddress) : 'N/A'}>
                  {device.macAddress ? normalizeMAC(device.macAddress) : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* IP Configuration Section - For PCs / IoT */}
          {(device.type === 'pc' || device.type === 'iot') && (
            <div className={`p-2.5 rounded-xl border space-y-2 ${
              isDark ? 'bg-secondary-950/30 border-secondary-800/80' : 'bg-secondary-50/60 border-secondary-200/80'
            }`}>
              <div className={`text-[10px] font-black tracking-wider uppercase opacity-75 ${
                isDark ? 'text-accent-400' : 'text-accent-600'
              }`}>
                {t.ipConfiguration}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-0.5">
                  <label htmlFor="device-ip-input" className={`text-[10px] font-semibold block ml-0.5 ${
                    isDark ? 'text-secondary-400' : 'text-secondary-500'
                  }`}>
                    {language === 'tr' ? 'IP Adresi' : 'IP Address'}
                  </label>
                  <input
                    id="device-ip-input"
                    type="text"
                    inputMode="decimal"
                    autoCapitalize="off"
                    autoCorrect="off"
                    value={ipValue}
                    onChange={(e) => handleIpChange(e.target.value)}
                    className={`w-full h-7.5 px-2 rounded-lg border font-mono text-xs font-bold transition-all outline-none ${
                      errors.ip
                        ? 'border-error-500 bg-error-500/5 focus:border-error-500'
                        : isDark
                        ? 'bg-secondary-900/80 border-secondary-700 text-white placeholder-secondary-600 focus:border-accent-500/50'
                        : 'bg-white border-secondary-200 text-secondary-900 placeholder-secondary-300 focus:border-accent-500/50'
                    }`}
                    placeholder="192.168.1.1"
                  />
                  {errors.ip && (
                    <p className="text-[11px] text-error-500 flex items-center gap-1 font-medium mt-0.5 ml-0.5">
                      <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{errors.ip}</span>
                    </p>
                  )}
                </div>

                <div className="space-y-0.5">
                  <label htmlFor="device-subnet-input" className={`text-[10px] font-semibold block ml-0.5 ${
                    isDark ? 'text-secondary-400' : 'text-secondary-500'
                  }`}>
                    {language === 'tr' ? 'Alt Ağ Maskesi' : 'Subnet Mask'}
                  </label>
                  <input
                    id="device-subnet-input"
                    type="text"
                    inputMode="decimal"
                    autoCapitalize="off"
                    autoCorrect="off"
                    value={subnetValue}
                    onChange={(e) => {
                      setSubnetValue(e.target.value);
                      clearFieldError('subnet');
                    }}
                    className={`w-full h-7.5 px-2 rounded-lg border font-mono text-xs font-bold transition-all outline-none ${
                      errors.subnet
                        ? 'border-error-500 bg-error-500/5 focus:border-error-500'
                        : isDark
                        ? 'bg-secondary-900/80 border-secondary-700 text-white placeholder-secondary-600 focus:border-accent-500/50'
                        : 'bg-white border-secondary-200 text-secondary-900 placeholder-secondary-300 focus:border-accent-500/50'
                    }`}
                    placeholder="255.255.255.0"
                  />
                  {errors.subnet && (
                    <p className="text-[11px] text-error-500 flex items-center gap-1 font-medium mt-0.5 ml-0.5">
                      <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{errors.subnet}</span>
                    </p>
                  )}
                </div>

                <div className="space-y-0.5">
                  <label htmlFor="device-gateway-input" className={`text-[10px] font-semibold block ml-0.5 ${
                    isDark ? 'text-secondary-400' : 'text-secondary-500'
                  }`}>
                    {language === 'tr' ? 'Ağ Geçidi' : 'Gateway'}
                  </label>
                  <input
                    id="device-gateway-input"
                    type="text"
                    inputMode="decimal"
                    autoCapitalize="off"
                    autoCorrect="off"
                    value={gatewayValue}
                    onChange={(e) => {
                      setGatewayValue(e.target.value);
                      clearFieldError('gateway');
                    }}
                    className={`w-full h-7.5 px-2 rounded-lg border font-mono text-xs font-bold transition-all outline-none ${
                      errors.gateway
                        ? 'border-error-500 bg-error-500/5 focus:border-error-500'
                        : isDark
                        ? 'bg-secondary-900/80 border-secondary-700 text-white placeholder-secondary-600 focus:border-accent-500/50'
                        : 'bg-white border-secondary-200 text-secondary-900 placeholder-secondary-300 focus:border-accent-500/50'
                    }`}
                    placeholder="192.168.1.254"
                  />
                  {errors.gateway && (
                    <p className="text-[11px] text-error-500 flex items-center gap-1 font-medium mt-0.5 ml-0.5">
                      <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{errors.gateway}</span>
                    </p>
                  )}
                </div>

                <div className="space-y-0.5">
                  <label htmlFor="device-dns-input" className={`text-[10px] font-semibold block ml-0.5 ${
                    isDark ? 'text-secondary-400' : 'text-secondary-500'
                  }`}>
                    DNS Server
                  </label>
                  <input
                    id="device-dns-input"
                    type="text"
                    value={dnsValue}
                    onChange={(e) => {
                      setDnsValue(e.target.value);
                      clearFieldError('dns');
                    }}
                    className={`w-full h-7.5 px-2 rounded-lg border font-mono text-xs font-bold transition-all outline-none ${
                      errors.dns
                        ? 'border-error-500 bg-error-500/5 focus:border-error-500'
                        : isDark
                        ? 'bg-secondary-900/80 border-secondary-700 text-white placeholder-secondary-600 focus:border-accent-500/50'
                        : 'bg-white border-secondary-200 text-secondary-900 placeholder-secondary-300 focus:border-accent-500/50'
                    }`}
                    placeholder="8.8.8.8"
                  />
                  {errors.dns && (
                    <p className="text-[11px] text-error-500 flex items-center gap-1 font-medium mt-0.5 ml-0.5">
                      <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{errors.dns}</span>
                    </p>
                  )}
                </div>

                <div className="col-span-2 space-y-0.5">
                  <label htmlFor="device-ipv6-input" className={`text-[10px] font-semibold block ml-0.5 ${
                    isDark ? 'text-secondary-400' : 'text-secondary-500'
                  }`}>
                    IPv6
                  </label>
                  <input
                    id="device-ipv6-input"
                    type="text"
                    inputMode="text"
                    autoCapitalize="off"
                    autoCorrect="off"
                    value={ipv6Value}
                    onChange={(e) => {
                      setIpv6Value(e.target.value);
                      clearFieldError('ipv6');
                    }}
                    className={`w-full h-7.5 px-2 rounded-lg border font-mono text-xs font-bold transition-all outline-none ${
                      errors.ipv6
                        ? 'border-error-500 bg-error-500/5 focus:border-error-500'
                        : isDark
                        ? 'bg-secondary-900/80 border-secondary-700 text-white placeholder-secondary-600 focus:border-accent-500/50'
                        : 'bg-white border-secondary-200 text-secondary-900 placeholder-secondary-300 focus:border-accent-500/50'
                    }`}
                    placeholder="2001:db8::1"
                  />
                  {errors.ipv6 && (
                    <p className="text-[11px] text-error-500 flex items-center gap-1 font-medium mt-0.5 ml-0.5">
                      <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{errors.ipv6}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Quick Config Import / Export (.cfg / .txt) */}
          <div className={`p-2.5 rounded-xl border ${
            isDark ? 'bg-secondary-950/30 border-secondary-800/80' : 'bg-secondary-50/60 border-secondary-200/80'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className={`text-[10px] font-black tracking-wider uppercase opacity-75 ${
                isDark ? 'text-accent-400' : 'text-accent-600'
              }`}>
                {language === 'tr' ? 'Hızlı Konfigürasyon' : 'Quick Configuration'}
              </div>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                isDark ? 'bg-secondary-800 text-secondary-300' : 'bg-secondary-200 text-secondary-700'
              }`}>
                {isSwitchOrRouter ? 'Running-Config' : 'Host Config'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleExportConfig}
                className={`h-7.5 flex items-center justify-center gap-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all border ${
                  isDark
                    ? 'bg-secondary-900 hover:bg-secondary-800 border-secondary-700/80 text-secondary-200 hover:text-white'
                    : 'bg-white hover:bg-secondary-100 border-secondary-200 text-secondary-800 shadow-xs'
                }`}
                title={language === 'tr' ? 'Cihazın mevcut konfigürasyonunu .cfg dosyası olarak indir' : 'Download device configuration as .cfg file'}
              >
                <svg className="w-3.5 h-3.5 text-accent-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>{language === 'tr' ? 'Config İndir (.cfg)' : 'Export (.cfg)'}</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`h-7.5 flex items-center justify-center gap-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all border ${
                  isDark
                    ? 'bg-secondary-900 hover:bg-secondary-800 border-secondary-700/80 text-secondary-200 hover:text-white'
                    : 'bg-white hover:bg-secondary-100 border-secondary-200 text-secondary-800 shadow-xs'
                }`}
                title={language === 'tr' ? 'Hazır bir .cfg veya .txt konfigürasyon dosyası yükle' : 'Upload a .cfg or .txt configuration file'}
              >
                <svg className="w-3.5 h-3.5 text-primary-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12" />
                </svg>
                <span>{language === 'tr' ? 'Config Yükle' : 'Import Config'}</span>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".cfg,.txt,.conf,.config"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {configMessage && (
            <div
              role="alert"
              aria-live="polite"
              className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                configMessage.type === 'success'
                  ? isDark
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : isDark
                  ? 'bg-error-500/10 text-error-400 border border-error-500/20'
                  : 'bg-error-50 text-error-600 border border-error-100'
              }`}
            >
              {configMessage.type === 'success' ? (
                <svg className="w-3.5 h-3.5 shrink-0 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5 shrink-0 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <span>{configMessage.text}</span>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className={`shrink-0 px-3.5 py-2.5 border-t flex gap-2 ${
          isDark ? 'border-secondary-800 bg-secondary-950/40' : 'border-secondary-100 bg-secondary-50/50'
        }`}>
          <button
            type="button"
            onClick={onClose}
            className={`flex-1 ${WINDOW_CANCEL_BUTTON_CLASS(isDark)}`}
          >
            {t.cancel}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 h-8.5 px-3 bg-gradient-to-r from-accent-500 to-primary-500 hover:from-accent-400 hover:to-primary-400 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-accent-500/20 hover:shadow-accent-500/30"
          >
            {t.saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

