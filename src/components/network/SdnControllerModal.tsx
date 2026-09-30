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

  const dragProps = useDrag({
    storageKey: 'sdnControllerPanel',
    defaultPosition: typeof window !== 'undefined'
      ? { x: Math.max(16, Math.floor((window.innerWidth - 650) / 2)), y: Math.max(100, Math.floor((window.innerHeight - 520) / 2)) }
      : { x: 80, y: 80 },
    defaultSize: { width: 620, height: 500 },
    minSize: { width: 440, height: 380 },
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
        name: intentType === 'qos-voip' ? 'VoIP QoS Intent' : 'VLAN Isolation Intent',
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
    setNetconfOutput(`${xml}\n\n<!-- Response Received -->\n${JSON.stringify(reply, null, 2)}`);
  };

  if (!open) return null;

  return (
    <DraggableWindowWrapper
      id="sdn-controller-modal"
      alwaysOnTop={true}
      title={isTr ? 'SDN & Intent-Based Ağ Denetleyicisi (APIC-EM / DNA-C)' : 'SDN & Intent-Based Controller'}
      icon={<Cpu className="w-4 h-4 text-sky-400 shrink-0" />}
      isOpen={open}
      onClose={() => onOpenChange(false)}
      isDark={isDark}
      modalPosition={dragProps.position}
      modalSize={dragProps.size}
      handlePointerDown={dragProps.handlePointerDown}
      handleResizeStart={dragProps.handleResizeStart}
      collapsible={true}
      mobileFullScreen={false}
      className={isDark ? '!bg-secondary-950 border-secondary-800' : '!bg-white border-secondary-300'}
      contentClassName="p-4 overflow-y-auto space-y-4 custom-scrollbar text-xs"
    >
      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-secondary-800 pb-2">
        <Button
          size="sm"
          variant={activeTab === 'inventory' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('inventory')}
          className="text-xs h-7"
        >
          <Layers className="w-3.5 h-3.5 mr-1" />
          {isTr ? 'Envanter' : 'Inventory'}
        </Button>
        <Button
          size="sm"
          variant={activeTab === 'trace' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('trace')}
          className="text-xs h-7"
        >
          <Activity className="w-3.5 h-3.5 mr-1" />
          {isTr ? 'Yol İzi (Path Trace)' : 'Path Trace'}
        </Button>
        <Button
          size="sm"
          variant={activeTab === 'intent' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('intent')}
          className="text-xs h-7"
        >
          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
          {isTr ? 'Intent Politikası' : 'Intent Policy'}
        </Button>
        <Button
          size="sm"
          variant={activeTab === 'netconf' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('netconf')}
          className="text-xs h-7"
        >
          <Terminal className="w-3.5 h-3.5 mr-1" />
          NETCONF/YANG
        </Button>
      </div>

      {/* Tab: Inventory */}
      {activeTab === 'inventory' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-2 rounded bg-secondary-900/60 border border-secondary-800">
              <span className="opacity-70">{isTr ? 'Toplam Cihaz' : 'Total Devices'}</span>
              <p className="text-lg font-bold text-sky-400">{inventory.totalDevices}</p>
            </div>
            <div className="p-2 rounded bg-secondary-900/60 border border-secondary-800">
              <span className="opacity-70">{isTr ? 'Anahtarlar' : 'Switches'}</span>
              <p className="text-lg font-bold text-emerald-400">{inventory.switchesCount}</p>
            </div>
            <div className="p-2 rounded bg-secondary-900/60 border border-secondary-800">
              <span className="opacity-70">{isTr ? 'Yönlendiriciler' : 'Routers'}</span>
              <p className="text-lg font-bold text-purple-400">{inventory.routersCount}</p>
            </div>
            <div className="p-2 rounded bg-secondary-900/60 border border-secondary-800">
              <span className="opacity-70">{isTr ? 'Aktif Hatlar' : 'Active Links'}</span>
              <p className="text-lg font-bold text-amber-400">{inventory.activeLinksCount}</p>
            </div>
          </div>
          <div className="p-2 rounded bg-secondary-900/40 border border-secondary-800">
            <span className="font-semibold block mb-1">{isTr ? 'Keşfedilen VLAN Dağılımı:' : 'Discovered VLANs:'}</span>
            <div className="flex gap-1.5 flex-wrap">
              {inventory.discoveredVlans.length > 0 ? (
                inventory.discoveredVlans.map(v => (
                  <span key={v} className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono text-[11px]">VLAN {v}</span>
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
              <label className="text-[11px] font-medium text-secondary-400">
                {isTr ? 'Kaynak Cihaz / IP' : 'Source Device / IP'}
              </label>
              <select
                value={devices.find(d => d.ip === sourceIp)?.id || ''}
                onChange={e => {
                  const dev = devices.find(d => d.id === e.target.value);
                  if (dev?.ip) setSourceIp(dev.ip);
                }}
                className="w-full p-1.5 text-xs rounded bg-secondary-900 border border-secondary-700 font-mono text-secondary-100 outline-none"
              >
                <option value="">{isTr ? '-- Listeden Cihaz Seç (Kaynak) --' : '-- Select Source Device --'}</option>
                {devices.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.ip || 'IP Yok'})
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder={isTr ? 'Kaynak IP (örn. 192.168.1.10)' : 'Source IP'}
                value={sourceIp}
                onChange={e => setSourceIp(e.target.value)}
                className="w-full p-1.5 rounded bg-secondary-900 border border-secondary-700 font-mono text-xs text-secondary-100"
              />
            </div>

            {/* Destination Device Selection */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-secondary-400">
                {isTr ? 'Hedef Cihaz / IP' : 'Dest Device / IP'}
              </label>
              <select
                value={devices.find(d => d.ip === destIp)?.id || ''}
                onChange={e => {
                  const dev = devices.find(d => d.id === e.target.value);
                  if (dev?.ip) setDestIp(dev.ip);
                }}
                className="w-full p-1.5 text-xs rounded bg-secondary-900 border border-secondary-700 font-mono text-secondary-100 outline-none"
              >
                <option value="">{isTr ? '-- Listeden Cihaz Seç (Hedef) --' : '-- Select Target Device --'}</option>
                {devices.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.ip || 'IP Yok'})
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder={isTr ? 'Hedef IP (örn. 192.168.2.20)' : 'Dest IP'}
                value={destIp}
                onChange={e => setDestIp(e.target.value)}
                className="w-full p-1.5 rounded bg-secondary-900 border border-secondary-700 font-mono text-xs text-secondary-100"
              />
            </div>
          </div>

          <Button size="sm" onClick={handleRunTrace} className="w-full h-8 flex items-center justify-center gap-1.5">
            <ArrowRight className="w-3.5 h-3.5" />
            <span>{isTr ? 'Yol İzleme Çalıştır (Run Path Trace)' : 'Run Path Trace'}</span>
          </Button>

          {traceResult && (
            <div className="p-2.5 rounded bg-secondary-900/60 border border-secondary-800 space-y-2">
              <div className="flex items-center justify-between font-semibold">
                <span>{isTr ? 'Durum:' : 'Status:'} {traceResult.healthStatus}</span>
                <span className="font-mono text-emerald-400">{traceResult.totalHops} {isTr ? 'Sekme' : 'Hops'} / {traceResult.latencyMs}ms</span>
              </div>
              <div className="space-y-1">
                {traceResult.pathHops.map((h, i) => (
                  <div key={i} className="flex items-center justify-between p-1 rounded bg-secondary-800/40 text-[11px] font-mono">
                    <span>{h.hopNumber}. {h.deviceName} ({h.deviceType})</span>
                    <span className="text-secondary-400">{h.ingressPort || 'IN'} &rarr; {h.egressPort || 'OUT'}</span>
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
          <p className="text-secondary-400">
            {isTr
              ? 'Intent-Based Networking (IBN) ile hedef durumu belirtin; SDN denetleyicisi konfigürasyonları otomatik iletsin.'
              : 'Specify network intent; SDN controller orchestrates policies directly down to devices.'}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={intentType === 'qos-voip' ? 'default' : 'outline'}
              onClick={() => setIntentType('qos-voip')}
              className="text-xs"
            >
              VoIP QoS Priority
            </Button>
            <Button
              size="sm"
              variant={intentType === 'isolate-vlan' ? 'default' : 'outline'}
              onClick={() => setIntentType('isolate-vlan')}
              className="text-xs"
            >
              VLAN 100 Isolation
            </Button>
            <Button
              size="sm"
              variant={intentType === 'rate-limit' ? 'default' : 'outline'}
              onClick={() => setIntentType('rate-limit')}
              className="text-xs"
            >
              Rate Limit (100Mbps)
            </Button>
          </div>
          <Button size="sm" onClick={handleApplyIntent} className="h-8">
            <Send className="w-3.5 h-3.5 mr-1" />
            {isTr ? 'Intent Dağıt (Deploy Intent)' : 'Deploy Intent'}
          </Button>
          {intentLog && (
            <div className="p-2 rounded bg-emerald-950/40 border border-emerald-800 text-emerald-300 font-mono text-[11px]">
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
          <pre className="p-2 rounded bg-secondary-900 border border-secondary-800 font-mono text-[11px] whitespace-pre-wrap overflow-x-auto max-h-48 text-sky-300">
            {netconfOutput || '<!-- NETCONF RPC Session Standby -->'}
          </pre>
        </div>
      )}
    </DraggableWindowWrapper>
  );
}
