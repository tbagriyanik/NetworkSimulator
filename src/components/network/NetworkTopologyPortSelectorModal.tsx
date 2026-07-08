'use client';

import { CableType } from '@/lib/network/types';
import { X, Cable, LineSquiggle, Plug, TrendingUpDown } from 'lucide-react';
import { DEVICE_ICONS } from './networkTopology.constants';
import { CanvasDevice, SelectedPortRef } from './networkTopology.types';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEffect } from 'react';

type PortSelectorStep = 'source' | 'target';

interface NetworkTopologyPortSelectorModalProps {
  isOpen: boolean;
  isDark: boolean;
  graphicsQuality?: 'high' | 'low';
  devices: CanvasDevice[];
  cableType: CableType;
  portSelectorStep: PortSelectorStep;
  selectedSourcePort: SelectedPortRef | null;
  onClose: () => void;
  onCableTypeChange: (nextType: CableType) => void;
  onSelectPort: (deviceId: string, portId: string) => void;
}

export function NetworkTopologyPortSelectorModal({
  isOpen,
  isDark,
  graphicsQuality = 'high',
  devices,
  cableType,
  portSelectorStep,
  selectedSourcePort,
  onClose,
  onCableTypeChange,
  onSelectPort,
}: NetworkTopologyPortSelectorModalProps) {
  const { t } = useLanguage();

  useEffect(() => {
    if (!isOpen) return;
    const handleMobileBack = () => onClose();
    window.addEventListener('mobile-back-pressed', handleMobileBack);
    return () => window.removeEventListener('mobile-back-pressed', handleMobileBack);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4" onClick={onClose}>
      <div className={graphicsQuality === 'low' ? 'absolute inset-0 bg-transparent' : 'absolute inset-0 bg-secondary-950/10'} />
      <div
        className={`liquid-glass-light relative w-full max-w-2xl rounded-[2.5rem] ${isDark ? 'bg-secondary-900/75 border-white/10 backdrop-blur-xl' : 'bg-white/70 border-white/70 backdrop-blur-xl'} border shadow-2xl overflow-hidden flex flex-col transition-all duration-500`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`px-8 py-6 border-b ${isDark ? 'border-secondary-800/50 bg-secondary-800/30' : 'border-secondary-100 bg-secondary-50/50'}`}>
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl shadow-inner ${isDark ? 'bg-warning-500/10 text-warning-500 border border-warning-500/20' : 'bg-warning-50 text-warning-600 border border-warning-100'}`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 0 0 -5.656 0l-4 4a4 4 0 1 0 5.656 5.656l1.102-1.101m-.758-4.899a4 4 0 0 0 5.656 0l4-4a4 4 0 0 0 -5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <div>
                <h3 className={`text-xl font-black tracking-tight ${isDark ? 'text-white' : 'text-secondary-900'}`}>
                  {portSelectorStep === 'source' ? t.selectSourcePort : t.selectTargetPort}
                </h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-5 h-5 rounded-md bg-error-500 hover:bg-error-600 cursor-pointer transition-colors inline-flex items-center justify-center shrink-0"
            >
              <X className="w-3 h-3 text-white pointer-events-none" />
            </button>
          </div>

          <div className="mt-8 flex items-center gap-4">
            <div className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${portSelectorStep === 'source' ? 'bg-accent-500 shadow-[0_0_3px_rgba(6,182,212,0.2)]' : 'bg-success-500/40'}`} />
            <div className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${portSelectorStep === 'target' ? 'bg-accent-500 shadow-[0_0_3px_rgba(6,182,212,0.2)]' : (isDark ? 'bg-secondary-800' : 'bg-secondary-200')}`} />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <span className={`text-xs font-bold tracking-widest ${isDark ? 'text-secondary-500' : 'text-secondary-400'}`}>
                {t.cableType.toUpperCase()}:
              </span>
              <div className={`flex items-center rounded-lg border overflow-hidden ${isDark ? 'bg-secondary-800/50 border-secondary-800' : 'bg-secondary-100 border-secondary-200'}`}>
                {(['straight', 'crossover', 'serial', 'console'] as CableType[]).map((type) => {
                  const colorMap: Record<string, { active: string; inactive: string }> = {
                    straight: { active: 'text-primary-400', inactive: 'text-primary-500 hover:text-primary-400' },
                    crossover: { active: 'text-warning-400', inactive: 'text-warning-500 hover:text-warning-400' },
                    serial: { active: 'text-success-400', inactive: 'text-success-500 hover:text-success-400' },
                    console: { active: 'text-accent-400', inactive: 'text-accent-500 hover:text-accent-400' },
                  };
                  const c = colorMap[type] || colorMap.console;
                  return (
                    <button
                      key={type}
                      onClick={() => onCableTypeChange(type)}
                      className={`h-8 md:px-3 px-2.5 flex items-center gap-1.5 transition-all text-xs font-bold
                      ${isDark ? 'hover:bg-secondary-700/50' : 'hover:bg-secondary-200/50'}
                      ${cableType === type
                          ? isDark ? 'bg-secondary-700/80' : 'bg-secondary-200/80'
                          : ''
                        }
                      ${cableType === type ? c.active : c.inactive}`}
                      title={type === 'straight' ? t.straight : type === 'crossover' ? t.crossover : type === 'serial' ? t.serial : t.console}
                    >
                      {type === 'straight' ? (
                        <Cable className="w-4 h-4" />
                      ) : type === 'crossover' ? (
                        <LineSquiggle className="w-4 h-4" />
                      ) : type === 'serial' ? (
                        <Plug className="w-4 h-4" />
                      ) : (
                        <TrendingUpDown className="w-4 h-4" />
                      )}
                      <span className="hidden md:inline">
                        {type === 'straight' ? t.straight : type === 'crossover' ? t.crossover : type === 'serial' ? t.serial : t.console}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {portSelectorStep === 'target' && selectedSourcePort && (
              <div className="flex items-center gap-3 ml-auto px-4 py-2 rounded-xl bg-accent-500/5 border border-accent-500/20 text-accent-500">
                <div className="w-1.5 h-1.5 rounded-full bg-accent-500 animate-pulse" />
                <span className="text-[10px] font-black tracking-widest">
                  {t.linkFrom}: {devices.find(d => d.id === selectedSourcePort.deviceId)?.name} ({selectedSourcePort.portId})
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-8 custom-scrollbar space-y-8 max-h-[50vh]">
          {devices.map((device) => {
            const isSwitch = device.type === 'switchL2' || device.type === 'switchL3';
            // In the "connect cable" panel, we want to show all ports regardless of cable type
            // But we still separate them by availability for better UX
            const filteredPorts = device.ports;
            if (filteredPorts.length === 0) return null;

            return (
              <div key={device.id} className="space-y-4">
                <div className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl border transition-colors ${(device.type === 'pc' || device.type === 'iot') ? 'bg-primary-500/10 border-primary-500/20 text-primary-500' :
                      isSwitch ? 'bg-success-500/10 border-success-500/20 text-success-500' :
                        'bg-purple-500/10 border-purple-500/20 text-purple-500'
                      }`}>
                      {DEVICE_ICONS[isSwitch ? 'switch' : device.type]}
                    </div>
                    <span className={`text-base font-black tracking-tight ${isDark ? 'text-white' : 'text-secondary-900'} group-hover:text-accent-500 transition-colors`}>
                      {device.name}
                    </span>
                  </div>
                  <div className={`text-xs font-bold tracking-widest ${isDark ? 'text-secondary-500' : 'text-secondary-400'}`}>
                    {device.ports.filter(p => p.status === 'disconnected').length} {device.ports.filter(p => p.status === 'disconnected').length <= 1 ? t.freePortSingular : t.freePortPlural}
                  </div>
                </div>

                <div className={`grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 p-4 rounded-3xl border ${isDark ? 'bg-secondary-950/40 border-secondary-800/50' : 'bg-secondary-50 border-secondary-200'}`}>
                  <div className="col-span-full flex flex-wrap gap-3 mb-2 pb-2 border-b border-dashed border-secondary-700/30 text-xs">
                    {(device.type === 'pc' || device.type === 'iot') ? (
                      <>
                        <span className="flex items-center gap-1 text-secondary-400"><span className="w-2 h-2 rounded-full bg-primary-500 inline-block" /> ETH</span>
                        {device.type === 'pc' && (
                          <span className="flex items-center gap-1 text-secondary-400"><span className="w-2 h-2 rounded-full bg-accent-500 inline-block" /> COM</span>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="flex items-center gap-1 text-secondary-400"><span className="w-2 h-2 rounded-full bg-primary-500 inline-block" /> Fa</span>
                        <span className="flex items-center gap-1 text-secondary-400"><span className="w-2 h-2 rounded-full bg-primary-500 inline-block" /> Gi</span>
                        <span className="flex items-center gap-1 text-secondary-400"><span className="w-2 h-2 rounded-full bg-accent-500 inline-block" /> Con</span>
                      </>
                    )}
                    <span className="flex items-center gap-1 text-secondary-500 ml-auto"><span className="w-2 h-2 rounded-full bg-secondary-600 inline-block" /> {t.connected}</span>
                  </div>
                  {filteredPorts.map((port) => {
                    const isConnected = port.status === 'connected';
                    const isSelectedSource = selectedSourcePort?.deviceId === device.id && selectedSourcePort?.portId === port.id && selectedSourcePort?.portId !== '';
                    
                    // In the first step (source selection):
                    // If we already predefined the source device (e.g. from mobile tap-tap), 
                    // then only that source device's ports should be enabled. All other devices' ports are disabled.
                    // If selectedSourcePort is null (e.g. opened from toolbar), any device's ports are enabled.
                    const isSelectable = portSelectorStep === 'source'
                      ? (selectedSourcePort ? selectedSourcePort.deviceId === device.id : true)
                      : (selectedSourcePort ? selectedSourcePort.deviceId !== device.id : true);

                    const pid = port.id.toLowerCase();
                    const isConsolePrt = pid === 'console' || pid.startsWith('com');
                    const isGigabit = pid.startsWith('gi');
                    const isFastEth = pid.startsWith('fa') || pid.startsWith('eth');
                    let dotCls = 'bg-secondary-600';
                    let cardCls = isDark
                      ? 'bg-secondary-800 border-secondary-700 hover:border-accent-500/50 hover:bg-secondary-700'
                      : 'bg-white border-secondary-200 hover:border-accent-500 shadow-sm';
                    let textCls = isDark ? 'text-secondary-500 group-hover:text-white' : 'text-secondary-500 group-hover:text-accent-600';
                    
                    if (isSelectedSource) {
                      dotCls = 'bg-success-500';
                      cardCls = isDark
                        ? 'bg-success-950/40 border-success-500'
                        : 'bg-success-50 border-success-500';
                      textCls = 'text-success-500 font-black';
                    } else if (!isConnected) {
                      if (isConsolePrt) {
                        dotCls = 'bg-accent-500';
                        cardCls = isDark
                          ? 'bg-accent-950/20 border-accent-800/50 hover:border-accent-400 hover:bg-accent-900/30'
                          : 'bg-accent-50 border-accent-200 hover:border-accent-400 shadow-sm';
                        textCls = 'text-accent-400 group-hover:text-accent-300';
                      } else if (isGigabit) {
                        dotCls = 'bg-primary-500'; // Use primary instead of warning (golden)
                        cardCls = isDark
                          ? 'bg-primary-950/20 border-primary-800/50 hover:border-primary-400 hover:bg-primary-900/30'
                          : 'bg-primary-50 border-primary-200 hover:border-primary-400 shadow-sm';
                        textCls = 'text-primary-400 group-hover:text-primary-300';
                      } else if (isFastEth) {
                        dotCls = 'bg-primary-500';
                        cardCls = isDark
                          ? 'bg-primary-950/20 border-primary-800/50 hover:border-primary-400 hover:bg-primary-900/30'
                          : 'bg-primary-50 border-primary-200 hover:border-primary-400 shadow-sm';
                        textCls = 'text-primary-400 group-hover:text-primary-300';
                      }
                    }

                    const isDisabled = isConnected || !isSelectable;
                    const disabledStyles = isDark 
                      ? 'bg-secondary-900/40 border-secondary-800 cursor-not-allowed opacity-40' 
                      : 'bg-secondary-200 border-secondary-300 cursor-not-allowed opacity-40';

                    return (
                      <button
                        key={`${device.id}-${port.id}`}
                        disabled={isDisabled}
                        onClick={() => {
                          // Don't call onSelectPort if clicking already selected source port in target step
                          if (portSelectorStep === 'target' && isSelectedSource) return;
                          onSelectPort(device.id, port.id);
                        }}
                        className={`group relative flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all duration-300 border ${
                          isDisabled && !isSelectedSource
                          ? disabledStyles
                          : cardCls
                        }`}
                      >
                        <div className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${isDisabled && !isSelectedSource ? 'bg-secondary-600' : dotCls}`} />
                        <span className={`text-xs font-bold font-mono transition-colors ${isDisabled && !isSelectedSource ? 'text-secondary-600' : textCls}`}>
                          {port.label.replace('FastEthernet', 'Fa').replace('GigabitEthernet', 'Gi')}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {devices.every(d => d.ports.filter(p => p.status === 'disconnected').length === 0) && (
            <div className="flex flex-col items-center py-12 space-y-4">
              <div className={`p-6 rounded-full ${isDark ? 'bg-secondary-800/50' : 'bg-secondary-100'}`}>
                <svg className={`w-12 h-12 ${isDark ? 'text-secondary-700' : 'text-secondary-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className={`text-center max-w-xs ${isDark ? 'text-secondary-500' : 'text-secondary-400'}`}>
                <h4 className="font-bold text-secondary-400">{t.noFreePorts}</h4>
                <p className="text-xs mt-1">{t.noFreePortsMessage}</p>
              </div>
            </div>
          )}
        </div>

        <div className={`px-8 py-6 border-t ${isDark ? 'border-secondary-800/50 bg-secondary-800/30' : 'border-secondary-100 bg-secondary-50/50'} flex justify-between items-center`}>
          <div className={`text-xs font-bold tracking-widest ${isDark ? 'text-secondary-600' : 'text-secondary-400'}`}>
            {portSelectorStep === 'source' ? t.step1 : t.step2}
          </div>
          <button
            onClick={onClose}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black tracking-widest transition-all ${isDark ? 'bg-secondary-800 text-secondary-400 hover:text-secondary-200' : 'bg-secondary-100 text-secondary-500 hover:text-secondary-700'}`}
          >
            {t.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}
