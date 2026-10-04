'use client';

import { useState, useMemo } from 'react';
import { DraggableWindowWrapper } from './DraggableWindowWrapper';
import { useDrag } from '@/hooks/useDrag';
import { Button } from '@/components/ui/button';
import {
  Cpu,
  Layers,
  CheckCircle2,
  ArrowRight,
  Terminal,
  Activity,
  Send,
} from 'lucide-react';
import type { CanvasDevice, CanvasConnection } from './NetworkTopology/types/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import { SdnController, parseYangModule, type SdnPathTraceResult } from '@/lib/network/sdnController';

interface SdnControllerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  devices: CanvasDevice[];
  connections: CanvasConnection[];
  deviceStates?: Map<string, SwitchState>;
  isDark?: boolean;
  language?: 'tr' | 'en';
}

const DEFAULT_YANG = `module enterprise-sdn {
  namespace "urn:enterprise:params:xml:ns:yang:sdn";
  prefix "sdn";

  container controller-intent {
    leaf policy-name { type string; }
    leaf target-vlan { type string; }
  }

  rpc push-intent {
    input {
      leaf intent-type { type string; }
    }
  }
}`;

export function SdnControllerModal({
  open,
  onOpenChange,
  devices,
  connections,
  deviceStates = new Map(),
  isDark = true,
  language = 'tr',
}: SdnControllerModalProps) {
  const isTr = language === 'tr';
  const cardSurfaceClass = isDark
    ? 'bg-secondary-900/60 border-secondary-800'
    : 'bg-secondary-50 border-secondary-200';
  const softSurfaceClass = isDark
    ? 'bg-secondary-900/40 border-secondary-800'
    : 'bg-secondary-50 border-secondary-200';
  const inputClass = isDark
    ? 'bg-secondary-900 border-secondary-700 text-secondary-100'
    : 'bg-white border-secondary-300 text-secondary-900';
  const mutedTextClass = isDark ? 'text-secondary-400' : 'text-secondary-600';

  const dragProps = useDrag({
    storageKey: 'sdnControllerPanel',
    defaultPosition: typeof window !== 'undefined'
      ? {
        x: Math.max(8, Math.floor((window.innerWidth - Math.min(620, window.innerWidth - 16)) / 2)),
        y: Math.max(56, Math.floor((window.innerHeight - Math.min(500, window.innerHeight - 70)) / 2))
      }
      : { x: 80, y: 80 },
    defaultSize: typeof window !== 'undefined'
      ? {
        width: Math.min(620, Math.max(300, window.innerWidth - 16)),
        height: Math.min(500, Math.max(350, window.innerHeight - 70))
      }
      : { width: 620, height: 500 },
    minSize: { width: 280, height: 260 },
  });

  const controller = useMemo(() => {
    try {
      return new SdnController([parseYangModule(DEFAULT_YANG)]);
    } catch {
      return new SdnController([]);
    }
  }, []);

  const [activeTab, setActiveTab] = useState<'inventory' | 'trace' | 'intent' | 'netconf'>('inventory');
  const [sourceIp, setSourceIp] = useState('');
  const [destIp, setDestIp] = useState('');
  const [traceResult, setTraceResult] = useState<SdnPathTraceResult | null>(null);

  // Intent states
  const [intentType, setIntentType] = useState<'qos-voip' | 'isolate-vlan' | 'rate-limit'>('qos-voip');
  const [intentLog, setIntentLog] = useState<string>('');

  // NETCONF state
  const [netconfOutput, setNetconfOutput] = useState<string>('');

  const inventory = useMemo(() => {
    return controller.discoverInventory(devices, connections);
  }, [controller, devices, connections]);

  const handleRunTrace = () => {
    if (!sourceIp || !destIp) return;
    const res = controller.computePathTrace(sourceIp, destIp, devices, connections, deviceStates);
    setTraceResult(res);
  };

  const handleApplyIntent = () => {
    const targetIds = devices.filter(d => d.type === 'switchL2' || d.type === 'router').map(d => d.id);
    const res = controller.applyIntentPolicy(
      {
        id: `intent-${Date.now()}`,
        name: intentType === 'qos-voip'
          ? (isTr ? 'VoIP QoS Niyeti' : 'VoIP QoS Intent')
          : (isTr ? 'VLAN İzolasyon Niyeti' : 'VLAN Isolation Intent'),
        type: intentType,
        targetDeviceIds: targetIds,
        parameters: { vlanId: 100, bandwidthLimitMbps: 100 },
      },
      devices,
      deviceStates
    );
    setIntentLog(res.log);
  };

  const handleNetconfRpc = () => {
    const reply = controller.executeNetconfRpc({
      messageId: 'urn:msg-1',
      rpcName: 'push-intent',
      params: { 'intent-type': intentType },
    });
    const xml = controller.netconfRpcXml('urn:msg-1', 'push-intent', { intent: intentType });
    const responseHeader = isTr ? '<!-- Alınan Yanıt -->' : '<!-- Response Received -->';
    setNetconfOutput(`${xml}\n\n${responseHeader}\n${JSON.stringify(reply, null, 2)}`);
  };

  if (!open) return null;

  return (
    <DraggableWindowWrapper
      id="sdn-controller-modal"
      alwaysOnTop={true}
      title={isTr ? 'SDN & Niyet Tabanlı Ağ Denetleyicisi (APIC-EM / DNA-C)' : 'SDN & Intent-Based Network Controller (APIC-EM / DNA-C)'}
      icon={<Cpu className={`w-4 h-4 shrink-0 ${isDark ? 'text-sky-400' : 'text-sky-700'}`} />}
      isOpen={open}
      onClose={() => onOpenChange(false)}
      isDark={isDark}
      modalPosition={dragProps.position}
      modalSize={dragProps.size}
      handlePointerDown={dragProps.handlePointerDown}
      handleResizeStart={dragProps.handleResizeStart}
      collapsible={true}
      mobileFullScreen={true}
      className={isDark ? '!bg-secondary-950 border-secondary-800' : '!bg-white border-secondary-300'}
      contentClassName="p-3 sm:p-4 overflow-y-auto space-y-4 custom-scrollbar text-xs"
    >
      {/* Tabs */}
      <div className={`flex items-center gap-1 border-b pb-2 overflow-x-auto custom-scrollbar no-scrollbar flex-nowrap shrink-0 ${isDark ? 'border-secondary-800' : 'border-secondary-200'}`}>
        <Button
          size="sm"
          variant={activeTab === 'inventory' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('inventory')}
          className="text-xs h-7 shrink-0 whitespace-nowrap"
        >
          <Layers className="w-3.5 h-3.5 mr-1" />
          {isTr ? 'Envanter' : 'Inventory'}
        </Button>
        <Button
          size="sm"
          variant={activeTab === 'trace' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('trace')}
          className="text-xs h-7 shrink-0 whitespace-nowrap"
        >
          <Activity className="w-3.5 h-3.5 mr-1" />
          {isTr ? 'Yol İzi' : 'Path Trace'}
        </Button>
        <Button
          size="sm"
          variant={activeTab === 'intent' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('intent')}
          className="text-xs h-7 shrink-0 whitespace-nowrap"
        >
          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
          {isTr ? 'Niyet Politikası' : 'Intent Policy'}
        </Button>
        <Button
          size="sm"
          variant={activeTab === 'netconf' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('netconf')}
          className="text-xs h-7 shrink-0 whitespace-nowrap"
        >
          <Terminal className="w-3.5 h-3.5 mr-1" />
          NETCONF/YANG
        </Button>
      </div>

      {/* Tab: Inventory */}
      {activeTab === 'inventory' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className={`p-2 rounded border ${cardSurfaceClass}`}>
              <span className="opacity-70">{isTr ? 'Toplam Cihaz' : 'Total Devices'}</span>
              <p className={`text-lg font-bold ${isDark ? 'text-sky-400' : 'text-sky-700'}`}>{inventory.totalDevices}</p>
            </div>
            <div className={`p-2 rounded border ${cardSurfaceClass}`}>
              <span className="opacity-70">{isTr ? 'Anahtarlar' : 'Switches'}</span>
              <p className={`text-lg font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>{inventory.switchesCount}</p>
            </div>
            <div className={`p-2 rounded border ${cardSurfaceClass}`}>
              <span className="opacity-70">{isTr ? 'Yönlendiriciler' : 'Routers'}</span>
              <p className={`text-lg font-bold ${isDark ? 'text-purple-400' : 'text-purple-700'}`}>{inventory.routersCount}</p>
            </div>
            <div className={`p-2 rounded border ${cardSurfaceClass}`}>
              <span className="opacity-70">{isTr ? 'Aktif Hatlar' : 'Active Links'}</span>
              <p className={`text-lg font-bold ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>{inventory.activeLinksCount}</p>
            </div>
          </div>
          <div className={`p-2 rounded border ${softSurfaceClass}`}>
            <span className="font-semibold block mb-1">{isTr ? 'Keşfedilen VLAN Dağılımı:' : 'Discovered VLANs:'}</span>
            <div className="flex gap-1.5 flex-wrap">
              {inventory.discoveredVlans.length > 0 ? (
                inventory.discoveredVlans.map(v => (
                  <span key={v} className={`px-1.5 py-0.5 rounded font-mono text-[11px] ${isDark ? 'bg-sky-500/20 text-sky-300' : 'bg-sky-100 text-sky-700'}`}>VLAN {v}</span>
                ))
              ) : (
                <span className="opacity-60">{isTr ? 'VLAN bulunamadı' : 'No VLANs found'}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Path Trace */}
      {activeTab === 'trace' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Source Device Selection */}
            <div className="space-y-1">
              <label className={`text-[11px] font-medium ${mutedTextClass}`}>
                {isTr ? 'Kaynak Cihaz / IP' : 'Source Device / IP'}
              </label>
              <select
                value={devices.find(d => d.ip === sourceIp)?.id || ''}
                onChange={e => {
                  const dev = devices.find(d => d.id === e.target.value);
                  if (dev?.ip) setSourceIp(dev.ip);
                }}
                className={`w-full p-1.5 text-xs rounded border font-mono outline-none ${inputClass}`}
              >
                <option value="">{isTr ? '-- Listeden Cihaz Seç (Kaynak) --' : '-- Select Source Device --'}</option>
                {devices.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.ip || (isTr ? 'IP Yok' : 'No IP')})
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder={isTr ? 'Kaynak IP (örn. 192.168.1.10)' : 'Source IP (e.g. 192.168.1.10)'}
                value={sourceIp}
                onChange={e => setSourceIp(e.target.value)}
                className={`w-full p-1.5 rounded border font-mono text-xs ${inputClass}`}
              />
            </div>

            {/* Destination Device Selection */}
            <div className="space-y-1">
              <label className={`text-[11px] font-medium ${mutedTextClass}`}>
                {isTr ? 'Hedef Cihaz / IP' : 'Destination Device / IP'}
              </label>
              <select
                value={devices.find(d => d.ip === destIp)?.id || ''}
                onChange={e => {
                  const dev = devices.find(d => d.id === e.target.value);
                  if (dev?.ip) setDestIp(dev.ip);
                }}
                className={`w-full p-1.5 text-xs rounded border font-mono outline-none ${inputClass}`}
              >
                <option value="">{isTr ? '-- Listeden Cihaz Seç (Hedef) --' : '-- Select Destination Device --'}</option>
                {devices.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.ip || (isTr ? 'IP Yok' : 'No IP')})
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder={isTr ? 'Hedef IP (örn. 192.168.2.20)' : 'Destination IP (e.g. 192.168.2.20)'}
                value={destIp}
                onChange={e => setDestIp(e.target.value)}
                className={`w-full p-1.5 rounded border font-mono text-xs ${inputClass}`}
              />
            </div>
          </div>

          <Button size="sm" onClick={handleRunTrace} className="w-full h-8 flex items-center justify-center gap-1.5">
            <ArrowRight className="w-3.5 h-3.5" />
            <span>{isTr ? 'Yol İzlemeyi Çalıştır' : 'Run Path Trace'}</span>
          </Button>

          {traceResult && (
            <div className={`p-2.5 rounded border space-y-2 ${cardSurfaceClass}`}>
              <div className="flex items-center justify-between font-semibold">
                <span>{isTr ? 'Durum:' : 'Status:'} {traceResult.healthStatus}</span>
                <span className={`font-mono ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>{traceResult.totalHops} {isTr ? 'Sekme' : 'Hops'} / {traceResult.latencyMs}ms</span>
              </div>
              <div className="space-y-1">
                {traceResult.pathHops.map((h, i) => (
                  <div key={i} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-1.5 rounded text-[11px] font-mono ${isDark ? 'bg-secondary-800/40' : 'bg-secondary-100'}`}>
                    <span className="truncate">{h.hopNumber}. {h.deviceName} ({h.deviceType})</span>
                    <span className={`${mutedTextClass} shrink-0`}>
                      {h.ingressPort ? `${isTr ? 'GİRİŞ' : 'IN'}: ${h.ingressPort}` : (isTr ? 'GİRİŞ' : 'IN')} &rarr; {h.egressPort ? `${isTr ? 'ÇIKIŞ' : 'OUT'}: ${h.egressPort}` : (isTr ? 'ÇIKIŞ' : 'OUT')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Intent Policy */}
      {activeTab === 'intent' && (
        <div className="space-y-3">
          <p className={mutedTextClass}>
            {isTr
              ? 'Niyet Tabanlı Ağ Yapılandırması (IBN) ile hedef durumu belirtin; SDN denetleyicisi ilgili politikaları cihazlara otomatik uygulasın.'
              : 'Specify network intent with Intent-Based Networking (IBN); SDN controller automatically orchestrates policies down to devices.'}
          </p>
          <div className="flex gap-2 flex-wrap sm:flex-nowrap">
            <Button
              size="sm"
              variant={intentType === 'qos-voip' ? 'default' : 'outline'}
              onClick={() => setIntentType('qos-voip')}
              className="text-xs flex-1 min-w-[120px]"
            >
              {isTr ? 'VoIP QoS Önceliği' : 'VoIP QoS Priority'}
            </Button>
            <Button
              size="sm"
              variant={intentType === 'isolate-vlan' ? 'default' : 'outline'}
              onClick={() => setIntentType('isolate-vlan')}
              className="text-xs flex-1 min-w-[120px]"
            >
              {isTr ? 'VLAN 100 İzolasyonu' : 'VLAN 100 Isolation'}
            </Button>
            <Button
              size="sm"
              variant={intentType === 'rate-limit' ? 'default' : 'outline'}
              onClick={() => setIntentType('rate-limit')}
              className="text-xs flex-1 min-w-[120px]"
            >
              {isTr ? 'Hız Sınırı (100Mbps)' : 'Rate Limit (100Mbps)'}
            </Button>
          </div>
          <Button size="sm" onClick={handleApplyIntent} className="h-8">
            <Send className="w-3.5 h-3.5 mr-1" />
            {isTr ? 'Niyeti Dağıt (Uygula)' : 'Deploy Intent'}
          </Button>
          {intentLog && (
            <div className={`p-2 rounded border font-mono text-[11px] ${isDark ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
              {intentLog}
            </div>
          )}
        </div>
      )}

      {/* Tab: NETCONF / YANG */}
      {activeTab === 'netconf' && (
        <div className="space-y-3">
          <Button size="sm" onClick={handleNetconfRpc} className="h-8">
            <Terminal className="w-3.5 h-3.5 mr-1" />
            {isTr ? 'YANG RPC Gönder (<rpc>)' : 'Send YANG RPC (<rpc>)'}
          </Button>
          <pre className={`p-2 rounded border font-mono text-[11px] whitespace-pre-wrap overflow-x-auto max-h-48 ${isDark ? 'bg-secondary-900 border-secondary-800 text-sky-300' : 'bg-secondary-50 border-secondary-200 text-sky-800'}`}>
            {netconfOutput || (isTr ? '<!-- NETCONF RPC Oturumu Hazır Beklemede -->' : '<!-- NETCONF RPC Session Standby -->')}
          </pre>
        </div>
      )}
    </DraggableWindowWrapper>
  );
}
