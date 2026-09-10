'use client';

import { useState } from 'react';
import {
  Power,
  Cpu,
  Plus,
  Trash2,
  AlertTriangle,
  Layers,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import type { CanvasDevice, CanvasConnection } from './networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import {
  MODULE_CATALOG,
  getDeviceSlots,
  installExpansionModule,
  removeExpansionModule,
} from '@/lib/network/modularExpansion';

interface PhysicalDeviceViewProps {
  device: CanvasDevice;
  switchState?: SwitchState;
  connections: CanvasConnection[];
  onUpdateDevice: (updatedDevice: CanvasDevice, updatedSwitchState?: SwitchState, removedConnections?: string[]) => void;
  isDark?: boolean;
  language?: string;
}

export function PhysicalDeviceView({
  device,
  switchState,
  connections,
  onUpdateDevice,
  isDark = true,
  language = 'tr',
}: PhysicalDeviceViewProps) {
  const isTR = language === 'tr';
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [powerOn, setPowerOn] = useState<boolean>(device.status !== 'offline');
  const [powerError, setPowerError] = useState<string | null>(null);

  const slots = getDeviceSlots(device);
  const isRouter = device.type === 'router' || device.type === 'firewall';

  const handleTogglePower = () => {
    const nextPower = !powerOn;
    setPowerOn(nextPower);
    setPowerError(null);
    const updatedDevice: CanvasDevice = {
      ...device,
      status: nextPower ? 'online' : 'offline',
    };
    onUpdateDevice(updatedDevice, switchState, []);
  };

  const handleInstall = (slotIndex: number, moduleId: string) => {
    if (powerOn) {
      setPowerError(
        isTR
          ? '⚠️ Güvenlik Uyarısı: Modül takmadan önce cihazın güç anahtarını (Power Switch) KAPATIN!'
          : '⚠️ Safety Warning: Turn the device power OFF before inserting expansion cards!'
      );
      return;
    }
    setPowerError(null);
    try {
      const res = installExpansionModule(device, slotIndex, moduleId, switchState);
      onUpdateDevice(res.updatedDevice, res.updatedSwitchState, []);
      setSelectedSlot(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setPowerError(msg);
    }
  };

  const handleRemove = (slotIndex: number) => {
    if (powerOn) {
      setPowerError(
        isTR
          ? '⚠️ Güvenlik Uyarısı: Modül çıkarmadan önce cihazın güç anahtarını (Power Switch) KAPATIN!'
          : '⚠️ Safety Warning: Turn the device power OFF before removing expansion cards!'
      );
      return;
    }
    setPowerError(null);
    const res = removeExpansionModule(device, slotIndex, connections, switchState);
    onUpdateDevice(res.updatedDevice, res.updatedSwitchState, res.removedConnections);
    setSelectedSlot(null);
  };

  return (
    <div className={`flex flex-col h-full overflow-y-auto p-4 space-y-4 select-none ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
      {/* Header Info & Power Switch Banner */}
      <div className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-4 backdrop-blur-md ${
        isDark ? 'bg-secondary-900/80 border-secondary-800' : 'bg-slate-100/90 border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-wide">
                {isRouter ? 'NetSim Modular Services Router (ISR Equivalent)' : 'NetSim Managed Enterprise Switch (Catalyst Equivalent)'}
              </span>
              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                powerOn ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
              }`}>
                {powerOn ? (isTR ? 'GÜÇ AÇIK' : 'POWER ON') : (isTR ? 'GÜÇ KAPALI' : 'POWER OFF')}
              </span>
            </div>
            <div className="text-xs text-slate-400">
              {isTR
                ? 'Donanım Yuvaları (Slots) & WIC/HWIC/SFP Modül Yönetimi'
                : 'Chassis Slots & WIC/HWIC/SFP Module Management'}
            </div>
          </div>
        </div>

        {/* Physical Power Rocker Switch */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[11px] font-semibold text-slate-400">
              {isTR ? 'Şasi Güç Anahtarı' : 'Chassis Power Switch'}
            </div>
            <div className="text-[10px] text-slate-500">
              {isTR ? '(Modül değişimi için kapatın)' : '(Turn off for hot-swap)'}
            </div>
          </div>
          <button
            onClick={handleTogglePower}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all shadow-md active:scale-95 ${
              powerOn
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40'
                : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/40'
            }`}
          >
            <Power className="w-4 h-4" />
            <span>{powerOn ? 'POWER: ON [I]' : 'POWER: OFF [O]'}</span>
          </button>
        </div>
      </div>

      {/* Safety Warning Toast */}
      {powerError && (
        <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs flex items-center gap-2 animate-pulse">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>{powerError}</span>
        </div>
      )}

      {/* Realistic NetSim Chassis Hardware Rear/Front Panel Visual */}
      <div className={`p-4 rounded-2xl border ${
        isDark ? 'bg-gradient-to-b from-slate-900 via-slate-950 to-black border-slate-700' : 'bg-gradient-to-b from-slate-200 to-slate-300 border-slate-400 shadow-inner'
      }`}>
        <div className="flex items-center justify-between mb-3 text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-bold text-slate-300">NETSIM MODULAR CHASSIS VIEW</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><span className={`w-2 h-2 rounded-full ${powerOn ? 'bg-emerald-400' : 'bg-slate-600'}`} /> PWR</span>
            <span className="flex items-center gap-1"><span className={`w-2 h-2 rounded-full ${powerOn ? 'bg-emerald-400' : 'bg-slate-600'}`} /> SYS</span>
            <span className="flex items-center gap-1"><span className={`w-2 h-2 rounded-full ${powerOn ? 'bg-amber-400' : 'bg-slate-600'}`} /> ACT</span>
          </div>
        </div>

        {/* Chassis Metal Frame */}
        <div className={`p-4 rounded-xl border-2 border-dashed ${
          isDark ? 'bg-slate-950/90 border-slate-700/80 shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)]' : 'bg-slate-100 border-slate-400 shadow-inner'
        }`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Built-in Fixed Motherboard Ports */}
            <div className={`p-3 rounded-lg border flex flex-col justify-between ${
              isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-300'
            }`}>
              <div className="flex items-center justify-between text-[10px] font-mono mb-2 text-slate-400">
                <span className="font-bold">SLOT 0 (BUILT-IN)</span>
                <span className="text-emerald-500 font-semibold">FIXED</span>
              </div>
              <div className="flex flex-wrap gap-1.5 my-2">
                {device.ports
                  .filter((p) => !p.id.includes('0/1/') && !p.id.includes('0/2/') && !p.id.includes('0/3/'))
                  .slice(0, 6)
                  .map((p) => (
                    <div
                      key={p.id}
                      className={`px-2 py-1 rounded text-[10px] font-mono border flex items-center gap-1 ${
                        p.status === 'connected' || p.linkStatus === 'up'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                      title={`${p.id} (${p.status})`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${p.status === 'connected' || p.linkStatus === 'up' ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                      <span>{p.label || p.id}</span>
                    </div>
                  ))}
              </div>
              <div className="text-[9px] text-slate-500">Fixed onboard interfaces</div>
            </div>

            {/* Expansion Slots */}
            {slots.map((slot) => {
              const installedMod = slot.installedModuleId ? MODULE_CATALOG[slot.installedModuleId] : null;

              return (
                <div
                  key={slot.slotIndex}
                  onClick={() => setSelectedSlot(selectedSlot === slot.slotIndex ? null : slot.slotIndex)}
                  className={`p-3 rounded-lg border-2 transition-all cursor-pointer relative group ${
                    installedMod
                      ? isDark
                        ? 'bg-slate-900 border-cyan-500/50 hover:border-cyan-400 shadow-md'
                        : 'bg-cyan-50/70 border-cyan-400 shadow-sm'
                      : isDark
                      ? 'bg-slate-950/60 border-slate-800 border-dashed hover:border-slate-600'
                      : 'bg-slate-50 border-slate-300 border-dashed hover:border-slate-400'
                  } ${selectedSlot === slot.slotIndex ? 'ring-2 ring-primary-500' : ''}`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                    <span className="font-bold text-slate-300">{slot.slotName}</span>
                    {installedMod ? (
                      <span
                        style={{ color: installedMod.color }}
                        className="font-bold text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-current"
                      >
                        {installedMod.badge}
                      </span>
                    ) : (
                      <span className="text-slate-500 italic text-[9px]">{isTR ? 'BOŞ YUVA' : 'EMPTY BAY'}</span>
                    )}
                  </div>

                  {installedMod ? (
                    <div className="my-2 space-y-1.5">
                      <div className="text-xs font-semibold text-slate-200">{installedMod.name}</div>
                      <div className="flex flex-wrap gap-1">
                        {device.ports
                          .filter((p) => p.id.includes(`0/${slot.slotIndex}/`))
                          .map((p) => (
                            <span
                              key={p.id}
                              className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-sky-500/20 text-sky-300 border border-sky-500/30"
                            >
                              {p.label || p.id}
                            </span>
                          ))}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemove(slot.slotIndex);
                        }}
                        className="mt-2 w-full py-1 text-[10px] font-bold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded flex items-center justify-center gap-1 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>{isTR ? 'Modülü Çıkar' : 'Remove Module'}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="my-4 flex flex-col items-center justify-center text-center text-slate-500 space-y-1">
                      <Plus className="w-5 h-5 text-slate-400 group-hover:text-primary-400 transition-colors" />
                      <span className="text-[10px] font-medium group-hover:text-slate-300">
                        {isTR ? 'Kart Takmak İçin Tıkla' : 'Click to Insert Card'}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Module Catalog & Insertion Panel */}
      <div className={`p-4 rounded-xl border space-y-3 ${
        isDark ? 'bg-secondary-900/60 border-secondary-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider">
              {isTR ? 'Kullanılabilir Genişletme Modülleri (Module Catalog)' : 'Available Expansion Modules'}
            </h4>
          </div>
          <span className="text-[10px] text-slate-400">
            {selectedSlot
              ? (isTR ? `Seçili Yuva: Slot 0/${selectedSlot}` : `Target: Slot 0/${selectedSlot}`)
              : (isTR ? 'Lütfen yukarıdan boş bir yuva seçin' : 'Select an empty bay above to install')}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.values(MODULE_CATALOG).map((mod) => {
            const isSupported = selectedSlot
              ? slots.find((s) => s.slotIndex === selectedSlot)?.supportedModules.includes(mod.id)
              : true;

            return (
              <div
                key={mod.id}
                className={`p-3 rounded-xl border transition-all ${
                  isDark ? 'bg-secondary-950/70 border-secondary-800' : 'bg-slate-50 border-slate-200'
                } ${!isSupported ? 'opacity-40 grayscale cursor-not-allowed' : 'hover:border-primary-500/50'}`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div>
                    <span
                      style={{ backgroundColor: `${mod.color}20`, color: mod.color, borderColor: `${mod.color}50` }}
                      className="text-[10px] font-bold px-2 py-0.5 rounded border uppercase"
                    >
                      {mod.badge}
                    </span>
                    <h5 className="font-bold text-xs mt-1 text-slate-200">{mod.name}</h5>
                  </div>
                  <button
                    disabled={!selectedSlot || !isSupported}
                    onClick={() => selectedSlot && handleInstall(selectedSlot, mod.id)}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
                      selectedSlot && isSupported
                        ? 'bg-primary-600 hover:bg-primary-500 text-white shadow-sm active:scale-95'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <Plus className="w-3 h-3" />
                    <span>{isTR ? 'Yuvaya Tak' : 'Insert'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {isTR ? mod.descriptionTr : mod.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Port Inventory Table */}
      <div className={`p-4 rounded-xl border space-y-2 ${
        isDark ? 'bg-secondary-900/60 border-secondary-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider">
              {isTR ? 'Mevcut Port Envanteri' : 'Active Port Inventory'}
            </h4>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {device.ports?.length || 0} {isTR ? 'Port Kayıtlı' : 'Ports Active'}
          </span>
        </div>

        <div className="overflow-x-auto max-h-48 border rounded-lg">
          <table className="w-full text-[11px] text-left font-mono">
            <thead className={isDark ? 'bg-slate-900/90 text-slate-400' : 'bg-slate-100 text-slate-600'}>
              <tr>
                <th className="p-2">Port ID</th>
                <th className="p-2">{isTR ? 'Tür' : 'Type'}</th>
                <th className="p-2">{isTR ? 'Hız' : 'Speed'}</th>
                <th className="p-2">{isTR ? 'Mod' : 'Mode'}</th>
                <th className="p-2">{isTR ? 'Durum' : 'Status'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {device.ports?.map((p) => {
                const isConn = connections.some(
                  (c) => (c.sourceDeviceId === device.id && c.sourcePort === p.id) || (c.targetDeviceId === device.id && c.targetPort === p.id)
                );
                return (
                  <tr key={p.id} className={isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}>
                    <td className="p-2 font-bold text-slate-200">{p.id}</td>
                    <td className="p-2 text-slate-400">{p.type || 'ethernet'}</td>
                    <td className="p-2 text-slate-400">{p.speed ? `${p.speed} Mbps` : 'Auto'}</td>
                    <td className="p-2 text-slate-400">{p.mode || (isRouter ? 'routed' : 'access')}</td>
                    <td className="p-2">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        isConn ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-500'
                      }`}>
                        {isConn ? <CheckCircle2 className="w-2.5 h-2.5" /> : null}
                        {isConn ? (isTR ? 'Bağlı' : 'Connected') : (isTR ? 'Boş' : 'Unused')}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
