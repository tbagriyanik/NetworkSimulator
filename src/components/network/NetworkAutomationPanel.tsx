import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Send, Play, Copy, Check, Code, Globe, Server, CheckCircle2, RotateCcw, Sparkles } from 'lucide-react';
import type { CanvasDevice } from './NetworkTopology/types/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import { handleRestconfRequest, executeNetDevOpsPythonScript, RestconfResponse } from '@/lib/network/netdevopsEngine';
import { DraggableWindowWrapper } from './DraggableWindowWrapper';
import { useDrag } from '@/hooks/useDrag';

export interface NetworkAutomationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  devices: CanvasDevice[];
  deviceStates: Map<string, SwitchState>;
  isDark?: boolean;
  defaultDeviceId?: string;
  onUpdateDeviceState?: (deviceId: string, updater: (prev: SwitchState) => SwitchState) => void;
  onUpdateDeviceStates?: (newStates: Map<string, SwitchState>) => void;
}

const PYTHON_TEMPLATES = {
  netmiko_provision: `# NetDevOps Automated Provisioning Script (Netmiko)
from netmiko import ConnectHandler

devices = [
    {"device_type": "generic_router", "host": "R1", "username": "admin", "password": "netsim123"},
    {"device_type": "generic_switch", "host": "SW1", "username": "admin", "password": "netsim123"},
]

commands = [
    "interface GigabitEthernet0/0",
    "description Uplink to Core Network (Configured via Netmiko)",
    "ip address 192.168.100.1 255.255.255.0",
    "no shutdown"
]

print("[NetDevOps] Starting automated batch provisioning...")
for dev in devices:
    net_connect = ConnectHandler(**dev)
    output = net_connect.send_config_set(commands)
    print(f"[Netmiko] Configured {dev['host']} successfully.")
    
    show_res = net_connect.send_command("show ip int brief")
    print(show_res)
    net_connect.disconnect()
`,
  netmiko_audit: `# Network Device Status & IP Audit Script (Netmiko)
from netmiko import ConnectHandler

target_devices = ["R1", "SW1"]

print("[Audit] Gathering interface and routing status across active nodes...")
for host in target_devices:
    conn = ConnectHandler(host=host, device_type="generic_router")
    print(f"=== Host Audit Report: {host} ===")
    
    int_brief = conn.send_command("show ip int brief")
    print(int_brief)
    
    routes = conn.send_command("show ip route")
    print(routes)
    conn.disconnect()
`,
  restconf_requests: `# Programmatic RESTCONF Automation using Python Requests
import requests
import json

base_url = "https://R1/restconf/data"

# 1. Fetch live interface YANG model data
print("[RESTCONF] Sending GET request to ietf-interfaces...")
res = requests.get(f"{base_url}/ietf-interfaces:interfaces")
print("HTTP Status Code:", res.status_code)

# 2. Programmatically configure interface GigabitEthernet0/0
patch_payload = {
    "ietf-interfaces:interface": {
        "name": "GigabitEthernet0/0",
        "description": "Provisioned by Python Requests Automation",
        "enabled": True,
        "ietf-ip:ipv4": {
            "address": [{"ip": "10.200.1.1", "netmask": "255.255.255.0"}]
        }
    }
}

print("[RESTCONF] Applying interface configuration PATCH...")
patch_res = requests.patch(f"{base_url}/ietf-interfaces:interfaces/interface=GigabitEthernet0/0", json=patch_payload)
print("Configuration result status:", patch_res.status_code)
`,
  vlan_automation: `# Automated VLAN Provisioning (Netmiko)
from netmiko import ConnectHandler

vlan_commands = [
    "vlan 10",
    "name Engineering",
    "vlan 20",
    "name Sales_Dept",
    "vlan 30",
    "name Management_IT"
]

print("[NetDevOps] Deploying corporate VLAN architecture...")
conn = ConnectHandler(host="SW1", device_type="generic_switch")
conn.send_config_set(vlan_commands)
vlan_brief = conn.send_command("show vlan brief")
print(vlan_brief)
conn.disconnect()
`,
};

export const NetworkAutomationPanel: React.FC<NetworkAutomationPanelProps> = ({
  isOpen,
  onClose,
  devices,
  deviceStates,
  isDark = true,
  defaultDeviceId,
  onUpdateDeviceState,
  onUpdateDeviceStates,
}) => {
  const [activeTab, setActiveTab] = useState<'restconf' | 'python'>('restconf');
  const [restconfSplitPercent, setRestconfSplitPercent] = useState(50);
  const restconfSplitRef = useRef<HTMLDivElement>(null);
  const [pythonSplitPercent, setPythonSplitPercent] = useState(50);
  const pythonSplitRef = useRef<HTMLDivElement>(null);
  const startRestconfSplitResize = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const move = (moveEvent: PointerEvent) => {
      const rect = restconfSplitRef.current?.getBoundingClientRect();
      if (!rect) return;
      setRestconfSplitPercent(Math.min(75, Math.max(25, ((moveEvent.clientX - rect.left) / rect.width) * 100)));
    };
    const stop = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop, { once: true });
  };
  const startPythonSplitResize = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const move = (moveEvent: PointerEvent) => {
      const rect = pythonSplitRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPythonSplitPercent(Math.min(75, Math.max(25, ((moveEvent.clientX - rect.left) / rect.width) * 100)));
    };
    const stop = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop, { once: true });
  };

  const automationDrag = useDrag({
    storageKey: 'netdevops_automation_window',
    defaultPosition: { x: 120, y: 120 },
    defaultSize: { width: 940, height: 620 },
    minSize: { width: 500, height: 400 },
    mode: 'drag-resize',
  });

  // RESTCONF State
  const [restconfMethod, setRestconfMethod] = useState<'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'>('GET');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(defaultDeviceId || devices[0]?.id || '');
  const [restconfUri, setRestconfUri] = useState<string>('/restconf/data/ietf-interfaces:interfaces');
  const [restconfBody, setRestconfBody] = useState<string>(
    '{\n  "ietf-interfaces:interface": {\n    "name": "GigabitEthernet0/0",\n    "description": "Configured via RESTCONF",\n    "enabled": true,\n    "ietf-ip:ipv4": {\n      "address": [\n        {\n          "ip": "192.168.100.1",\n          "netmask": "255.255.255.0"\n        }\n      ]\n    }\n  }\n}'
  );
  const [restconfResponse, setRestconfResponse] = useState<RestconfResponse | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Python NetDevOps State
  const [pythonScript, setPythonScript] = useState<string>(PYTHON_TEMPLATES.netmiko_provision);
  const [pythonOutput, setPythonOutput] = useState<string>('');
  const [isRunningScript, setIsRunningScript] = useState(false);
  const [selectedPythonPreset, setSelectedPythonPreset] = useState<string>('netmiko_provision');

  useEffect(() => {
    if (selectedDeviceId && devices.some(d => d.id === selectedDeviceId)) {
      return;
    }
    if (defaultDeviceId && devices.some(d => d.id === defaultDeviceId)) {
      setSelectedDeviceId(defaultDeviceId);
    } else if (devices.length > 0) {
      setSelectedDeviceId(devices[0].id);
    }
  }, [defaultDeviceId, devices, selectedDeviceId]);

  if (!isOpen) return null;

  const targetDev = devices.find((d) => d.id === selectedDeviceId) || devices[0];
  const targetState = targetDev ? deviceStates.get(targetDev.id) : undefined;

  const handleSendRestconf = () => {
    if (!targetDev) return;

    let parsedBody: Record<string, unknown> | undefined;
    if (restconfMethod !== 'GET' && restconfBody.trim()) {
      try {
        parsedBody = JSON.parse(restconfBody);
      } catch {
        // use raw text
      }
    }

    const res = handleRestconfRequest(restconfMethod, restconfUri, targetDev, targetState, parsedBody);
    setRestconfResponse(res);

    if (res.updatedState) {
      if (onUpdateDeviceState) {
        onUpdateDeviceState(targetDev.id, () => res.updatedState!);
      } else if (onUpdateDeviceStates) {
        const nextMap = new Map(deviceStates);
        nextMap.set(targetDev.id, res.updatedState);
        onUpdateDeviceStates(nextMap);
      }
    }
  };

  const handleRunPython = () => {
    setIsRunningScript(true);
    setPythonOutput('Python betiği yürütülüyor...\n');
    setTimeout(() => {
      const res = executeNetDevOpsPythonScript(pythonScript, devices, deviceStates);
      setPythonOutput(res.output);
      setIsRunningScript(false);

      if (res.updatedDeviceStates && onUpdateDeviceStates) {
        onUpdateDeviceStates(res.updatedDeviceStates);
      }
    }, 350);
  };

  const handleCopyJson = () => {
    if (restconfResponse) {
      navigator.clipboard.writeText(JSON.stringify(restconfResponse.data, null, 2));
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleSelectRestconfPreset = (type: 'get_interfaces' | 'get_native' | 'patch_ip' | 'put_hostname' | 'delete_ip') => {
    if (type === 'get_interfaces') {
      setRestconfMethod('GET');
      setRestconfUri('/restconf/data/ietf-interfaces:interfaces');
    } else if (type === 'get_native') {
      setRestconfMethod('GET');
      setRestconfUri('/restconf/data/netsim-native:native');
    } else if (type === 'patch_ip') {
      setRestconfMethod('PATCH');
      setRestconfUri('/restconf/data/ietf-interfaces:interfaces/interface=GigabitEthernet0/0');
      setRestconfBody(
        '{\n  "ietf-interfaces:interface": {\n    "name": "GigabitEthernet0/0",\n    "description": "Configured via RESTCONF PATCH",\n    "enabled": true,\n    "ietf-ip:ipv4": {\n      "address": [\n        {\n          "ip": "192.168.50.1",\n          "netmask": "255.255.255.0"\n        }\n      ]\n    }\n  }\n}'
      );
    } else if (type === 'put_hostname') {
      setRestconfMethod('PUT');
      setRestconfUri('/restconf/data/netsim-native:native');
      setRestconfBody(
        '{\n  "netsim-native:native": {\n    "hostname": "Core-Gateway-01",\n    "ip": {\n      "routing": true\n    }\n  }\n}'
      );
    } else if (type === 'delete_ip') {
      setRestconfMethod('DELETE');
      setRestconfUri('/restconf/data/ietf-interfaces:interfaces/interface=GigabitEthernet0/0');
    }
  };

  return (
    <DraggableWindowWrapper
      id="netdevops-automation-window"
      parentWindowId={defaultDeviceId || 'deviceUnified'}
      alwaysOnTop={true}
      title={
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${isDark ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border border-emerald-300 text-emerald-600'}`}>
            <Terminal className="w-3.5 h-3.5" />
          </div>
          <span className={`font-bold text-xs truncate ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            NetDevOps
            <span className="hidden sm:inline"> & RESTCONF</span>
          </span>
          <span className={`hidden md:inline text-[10px] font-mono px-1.5 py-0.5 rounded-full font-semibold border ${isDark ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-emerald-100 text-emerald-700 border-emerald-300'}`}>
            API / Python
          </span>
        </div>
      }
      isOpen={isOpen}
      onClose={onClose}
      isDark={isDark}
      modalPosition={automationDrag.position}
      modalSize={automationDrag.size}
      handlePointerDown={automationDrag.handlePointerDown}
      handleResizeStart={automationDrag.handleResizeStart}
      collapsible
      onEscapeKeyDown={onClose}
      escapeRestoreWindowId={defaultDeviceId}
      headerActions={
        <div className={`flex rounded-lg p-0.5 border text-xs mr-1 shrink-0 ${isDark ? 'border-slate-700/60 bg-slate-950/40' : 'border-slate-300 bg-slate-100'}`}>
          <button
            onClick={() => setActiveTab('restconf')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 rounded text-[11px] font-semibold transition-all ${activeTab === 'restconf'
                ? (isDark ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm' : 'bg-emerald-600 text-white font-bold shadow-sm')
                : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900')
              }`}
          >
            <Globe className="w-3 h-3 shrink-0" />
            <span>RESTCONF</span>
            <span className="hidden sm:inline">(YANG)</span>
          </button>
          <button
            onClick={() => setActiveTab('python')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 rounded text-[11px] font-semibold transition-all ${activeTab === 'python'
                ? (isDark ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm' : 'bg-emerald-600 text-white font-bold shadow-sm')
                : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900')
              }`}
          >
            <Code className="w-3 h-3 shrink-0" />
            <span className="hidden sm:inline">Netmiko (</span>Python<span className="hidden sm:inline">)</span>
          </button>
        </div>
      }
    >
      <div className={`flex-1 min-h-0 overflow-hidden flex flex-col ${isDark ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
        {activeTab === 'restconf' && (
          <div ref={restconfSplitRef} className="flex-1 flex flex-col md:grid min-h-0 overflow-hidden" style={{ gridTemplateColumns: `${restconfSplitPercent}% 6px minmax(0, ${100 - restconfSplitPercent}%)` }}>
            {/* Left: Request Builder */}
            <div className="w-full md:w-auto p-4 overflow-y-auto space-y-3.5 min-h-0">
              <div className="flex items-center justify-between">
                <div className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  <Server className="w-3.5 h-3.5 text-emerald-500" />
                  RESTCONF İstek Oluşturucu (Request Builder)
                </div>
                {targetState && (
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-300'}`}>
                    Hostname: {targetState.hostname || targetDev?.name}
                  </span>
                )}
              </div>

              {/* Preset Buttons */}
              <div className="space-y-1">
                <span className={`text-[10px] font-semibold flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  Hazır YANG RESTCONF Şablonları:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => handleSelectRestconfPreset('get_interfaces')}
                    className={`text-[10px] px-2 py-0.5 rounded border font-mono transition ${isDark ? 'border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-emerald-300' : 'border-slate-300 bg-white hover:bg-slate-100 text-emerald-700 shadow-xs'}`}
                  >
                    GET ietf-interfaces
                  </button>
                  <button
                    onClick={() => handleSelectRestconfPreset('get_native')}
                    className={`text-[10px] px-2 py-0.5 rounded border font-mono transition ${isDark ? 'border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-emerald-300' : 'border-slate-300 bg-white hover:bg-slate-100 text-emerald-700 shadow-xs'}`}
                  >
                    GET netsim-native
                  </button>
                  <button
                    onClick={() => handleSelectRestconfPreset('patch_ip')}
                    className={`text-[10px] px-2 py-0.5 rounded border font-mono transition ${isDark ? 'border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-amber-300' : 'border-slate-300 bg-white hover:bg-slate-100 text-amber-700 shadow-xs'}`}
                  >
                    PATCH Interface IP
                  </button>
                  <button
                    onClick={() => handleSelectRestconfPreset('put_hostname')}
                    className={`text-[10px] px-2 py-0.5 rounded border font-mono transition ${isDark ? 'border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-sky-300' : 'border-slate-300 bg-white hover:bg-slate-100 text-sky-700 shadow-xs'}`}
                  >
                    PUT Hostname
                  </button>
                  <button
                    onClick={() => handleSelectRestconfPreset('delete_ip')}
                    className={`text-[10px] px-2 py-0.5 rounded border font-mono transition ${isDark ? 'border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-rose-300' : 'border-slate-300 bg-white hover:bg-slate-100 text-rose-700 shadow-xs'}`}
                  >
                    DELETE Interface IP
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1">
                  <label htmlFor="restconf-method-select" className={`text-[11px] font-semibold mb-1 block ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Metod</label>
                  <select
                    id="restconf-method-select"
                    value={restconfMethod}
                    onChange={(e) => setRestconfMethod(e.target.value as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE')}
                    className={`w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border focus:outline-none ${isDark ? 'bg-slate-950 border-slate-700 text-emerald-400' : 'bg-white border-slate-300 text-emerald-700 shadow-xs'
                      }`}
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="PATCH">PATCH</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label htmlFor="restconf-device-select" className={`text-[11px] font-semibold mb-1 block ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Hedef Cihaz</label>
                  <select
                    id="restconf-device-select"
                    value={selectedDeviceId}
                    onChange={(e) => setSelectedDeviceId(e.target.value)}
                    className={`w-full px-2.5 py-1.5 text-xs rounded-lg border focus:outline-none cursor-pointer relative z-10 no-drag ${isDark ? 'bg-slate-950 border-slate-700 text-slate-200 hover:border-emerald-500/50' : 'bg-white border-slate-300 text-slate-900 hover:border-emerald-500/50 shadow-xs'
                      }`}
                  >
                    {devices.map((d) => (
                      <option key={d.id} value={d.id} className={isDark ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900'}>
                        {d.name || d.id} ({d.type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="restconf-uri-input" className={`text-[11px] font-semibold mb-1 block ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>YANG Endpoint URI</label>
                <input
                  id="restconf-uri-input"
                  type="text"
                  value={restconfUri}
                  onChange={(e) => setRestconfUri(e.target.value)}
                  className={`w-full px-3 py-1.5 text-xs font-mono rounded-lg border focus:outline-none ${isDark ? 'bg-slate-950 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-900 shadow-xs'
                    }`}
                />
              </div>

              {restconfMethod !== 'GET' && restconfMethod !== 'DELETE' && (
                <div>
                  <label htmlFor="restconf-body-textarea" className={`text-[11px] font-semibold mb-1 block ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Request Body (JSON Payload)</label>
                  <textarea
                    id="restconf-body-textarea"
                    value={restconfBody}
                    onChange={(e) => setRestconfBody(e.target.value)}
                    rows={7}
                    className={`w-full p-2.5 text-xs font-mono rounded-lg border focus:outline-none ${isDark ? 'bg-slate-950 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-900 shadow-xs'
                      }`}
                  />
                </div>
              )}

              <button
                onClick={handleSendRestconf}
                className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition shadow active:scale-[0.99]"
              >
                <Send className="w-3.5 h-3.5" />
                RESTCONF İsteği Gönder (Send Request)
              </button>
            </div>

            <div role="separator" aria-label="RESTCONF istek ve yanıt bölmesi genişliğini ayarla" onPointerDown={startRestconfSplitResize} className={`hidden md:block w-1.5 mx-1 rounded-full cursor-col-resize transition-colors ${isDark ? 'bg-slate-700/60 hover:bg-emerald-500/70' : 'bg-slate-300 hover:bg-emerald-500'}`} />

            {/* Right: Response Viewer */}
            <div className="w-full md:w-auto p-4 overflow-y-auto space-y-3 min-h-0 flex flex-col">
              <div className="flex items-center justify-between">
                <div className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Sunucu Yanıtı (YANG JSON Output)
                </div>
                {restconfResponse && (
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${restconfResponse.status >= 200 && restconfResponse.status < 300
                          ? (isDark ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-emerald-100 border-emerald-300 text-emerald-800')
                          : (isDark ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-rose-100 border-rose-300 text-rose-800')
                        }`}
                    >
                      {restconfResponse.status} {restconfResponse.statusText}
                    </span>
                    <button
                      onClick={handleCopyJson}
                      className={`p-1 rounded ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-900'}`}
                      title="JSON Kopyala"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}
              </div>

              <pre
                className={`flex-1 p-4 rounded-lg border font-mono text-xs overflow-auto leading-relaxed custom-scrollbar ${isDark ? 'bg-slate-950 border-slate-800 text-emerald-400' : 'bg-slate-900 text-emerald-300 shadow-inner'
                  }`}
              >
                {restconfResponse
                  ? JSON.stringify(restconfResponse.data, null, 2)
                  : '// RESTCONF isteği gönderildiğinde JSON çıktısı burada gerçek zamanlı olarak görüntülenecektir.'}
              </pre>
            </div>
          </div>
        )}

        {activeTab === 'python' && (
          <div ref={pythonSplitRef} className="flex-1 flex flex-col md:grid min-h-0 overflow-hidden" style={{ gridTemplateColumns: `${pythonSplitPercent}% 6px minmax(0, ${100 - pythonSplitPercent}%)` }}>
            {/* Left: Code Editor */}
            <div className="w-full md:w-auto p-4 overflow-y-auto space-y-3 min-h-0 flex flex-col">
              <div className="flex items-center justify-between">
                <div className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  <Code className="w-3.5 h-3.5 text-emerald-500" />
                  Python Script Editörü
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedPythonPreset}
                    onChange={(e) => {
                      const key = e.target.value as keyof typeof PYTHON_TEMPLATES;
                      setSelectedPythonPreset(key);
                      if (PYTHON_TEMPLATES[key]) {
                        setPythonScript(PYTHON_TEMPLATES[key]);
                      }
                    }}
                    className={`text-[11px] px-2 py-1 rounded border outline-none font-mono ${isDark ? 'bg-slate-950 border-slate-700 text-emerald-400' : 'bg-white border-slate-300 text-emerald-700 shadow-xs'
                      }`}
                  >
                    <option value="netmiko_provision">Netmiko Toplu Yapılandırma</option>
                    <option value="netmiko_audit">Ağ & IP Sağlık Denetimi</option>
                    <option value="restconf_requests">RESTCONF Python Requests</option>
                    <option value="vlan_automation">Otomatik VLAN Dağıtımı</option>
                  </select>
                  <button
                    onClick={() => setPythonScript(PYTHON_TEMPLATES[selectedPythonPreset as keyof typeof PYTHON_TEMPLATES] || PYTHON_TEMPLATES.netmiko_provision)}
                    className={`text-[11px] p-1 ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'}`}
                    title="Şablonu Sıfırla"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <textarea
                value={pythonScript}
                onChange={(e) => setPythonScript(e.target.value)}
                className={`flex-1 p-3 text-xs font-mono rounded-lg border focus:outline-none resize-none leading-relaxed ${isDark ? 'bg-slate-950 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-900 shadow-xs'
                  }`}
              />

              <button
                onClick={handleRunPython}
                disabled={isRunningScript}
                className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition shadow disabled:opacity-50 active:scale-[0.99]"
              >
                <Play className="w-3.5 h-3.5" />
                {isRunningScript ? 'Yürütülüyor...' : 'Python Betiğini Çalıştır (Run NetDevOps Script)'}
              </button>
            </div>

            <div role="separator" aria-label="Python editör ve konsol genişliğini ayarla" onPointerDown={startPythonSplitResize} className={`hidden md:block w-1.5 mx-1 rounded-full cursor-col-resize transition-colors ${isDark ? 'bg-slate-700/60 hover:bg-emerald-500/70' : 'bg-slate-300 hover:bg-emerald-500'}`} />

            {/* Right: Execution Console Output */}
            <div className="w-full md:w-auto p-4 overflow-y-auto space-y-3 min-h-0 flex flex-col">
              <div className="flex items-center justify-between">
                <div className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  Konsol Çıktısı (NetDevOps Console Output)
                </div>
              </div>

              <pre
                className={`flex-1 p-4 rounded-lg border font-mono text-xs overflow-auto leading-relaxed custom-scrollbar ${isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-900 text-slate-200 shadow-inner'
                  }`}
              >
                {pythonOutput || '// Betiği çalıştırmak için "Python Betiğini Çalıştır" butonuna basın.'}
              </pre>
            </div>
          </div>
        )}
      </div>
    </DraggableWindowWrapper>
  );
};


