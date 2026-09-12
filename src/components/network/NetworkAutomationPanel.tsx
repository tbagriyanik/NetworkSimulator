import React, { useState, useEffect } from 'react';
import { Terminal, Send, Play, Copy, Check, Code, Globe, Server, CheckCircle2, RotateCcw, Sparkles } from 'lucide-react';
import type { CanvasDevice } from './networkTopology.types';
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
    if (defaultDeviceId) {
      setSelectedDeviceId(defaultDeviceId);
    } else if (!selectedDeviceId && devices.length > 0) {
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
      title={
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Terminal className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-xs">NetDevOps & RESTCONF Otomasyon</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold">
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
      headerActions={
        <div className="flex rounded-lg p-0.5 border border-slate-700/60 bg-slate-950/40 text-xs mr-2">
          <button
            onClick={() => setActiveTab('restconf')}
            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-semibold transition-all ${
              activeTab === 'restconf'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3 h-3" />
            RESTCONF (YANG)
          </button>
          <button
            onClick={() => setActiveTab('python')}
            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-semibold transition-all ${
              activeTab === 'python'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code className="w-3 h-3" />
            Netmiko & Requests (Python)
          </button>
        </div>
      }
    >
      <div className={`flex-1 min-h-0 overflow-hidden flex flex-col ${isDark ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-800'}`}>
        {activeTab === 'restconf' && (
          <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden divide-y md:divide-y-0 md:divide-x divide-slate-800">
            {/* Left: Request Builder */}
            <div className="w-full md:w-1/2 p-4 overflow-y-auto space-y-3.5 min-h-0">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-emerald-400" />
                  RESTCONF İstek Oluşturucu (Request Builder)
                </div>
                {targetState && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Hostname: {targetState.hostname || targetDev?.name}
                  </span>
                )}
              </div>

              {/* Preset Buttons */}
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  Hazır YANG RESTCONF Şablonları:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => handleSelectRestconfPreset('get_interfaces')}
                    className="text-[10px] px-2 py-0.5 rounded border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-emerald-300 font-mono transition"
                  >
                    GET ietf-interfaces
                  </button>
                  <button
                    onClick={() => handleSelectRestconfPreset('get_native')}
                    className="text-[10px] px-2 py-0.5 rounded border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-emerald-300 font-mono transition"
                  >
                    GET netsim-native
                  </button>
                  <button
                    onClick={() => handleSelectRestconfPreset('patch_ip')}
                    className="text-[10px] px-2 py-0.5 rounded border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-amber-300 font-mono transition"
                  >
                    PATCH Interface IP
                  </button>
                  <button
                    onClick={() => handleSelectRestconfPreset('put_hostname')}
                    className="text-[10px] px-2 py-0.5 rounded border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-sky-300 font-mono transition"
                  >
                    PUT Hostname
                  </button>
                  <button
                    onClick={() => handleSelectRestconfPreset('delete_ip')}
                    className="text-[10px] px-2 py-0.5 rounded border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-rose-300 font-mono transition"
                  >
                    DELETE Interface IP
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1">
                  <label className="text-[11px] font-semibold text-slate-400 mb-1 block">Metod</label>
                  <select
                    value={restconfMethod}
                    onChange={(e) => setRestconfMethod(e.target.value as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE')}
                    className={`w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border focus:outline-none ${
                      isDark ? 'bg-slate-950 border-slate-700 text-emerald-400' : 'bg-white border-slate-300 text-emerald-600'
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
                  <label className="text-[11px] font-semibold text-slate-400 mb-1 block">Hedef Cihaz</label>
                  <select
                    value={selectedDeviceId}
                    onChange={(e) => setSelectedDeviceId(e.target.value)}
                    className={`w-full px-2.5 py-1.5 text-xs rounded-lg border focus:outline-none ${
                      isDark ? 'bg-slate-950 border-slate-700 text-slate-200' : 'bg-white border-slate-300'
                    }`}
                  >
                    {devices.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name || d.id} ({d.type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 mb-1 block">YANG Endpoint URI</label>
                <input
                  type="text"
                  value={restconfUri}
                  onChange={(e) => setRestconfUri(e.target.value)}
                  className={`w-full px-3 py-1.5 text-xs font-mono rounded-lg border focus:outline-none ${
                    isDark ? 'bg-slate-950 border-slate-700 text-slate-200' : 'bg-white border-slate-300'
                  }`}
                />
              </div>

              {restconfMethod !== 'GET' && restconfMethod !== 'DELETE' && (
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 mb-1 block">Request Body (JSON Payload)</label>
                  <textarea
                    value={restconfBody}
                    onChange={(e) => setRestconfBody(e.target.value)}
                    rows={7}
                    className={`w-full p-2.5 text-xs font-mono rounded-lg border focus:outline-none ${
                      isDark ? 'bg-slate-950 border-slate-700 text-slate-200' : 'bg-white border-slate-300'
                    }`}
                  />
                </div>
              )}

              <button
                onClick={handleSendRestconf}
                className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 transition shadow active:scale-[0.99]"
              >
                <Send className="w-3.5 h-3.5" />
                RESTCONF İsteği Gönder (Send Request)
              </button>
            </div>

            {/* Right: Response Viewer */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 min-h-0 flex flex-col">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Sunucu Yanıtı (YANG JSON Output)
                </div>
                {restconfResponse && (
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                        restconfResponse.status >= 200 && restconfResponse.status < 300
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                      }`}
                    >
                      {restconfResponse.status} {restconfResponse.statusText}
                    </span>
                    <button
                      onClick={handleCopyJson}
                      className="p-1 rounded text-slate-400 hover:text-slate-200"
                      title="JSON Kopyala"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}
              </div>

              <pre
                className={`flex-1 p-4 rounded-lg border font-mono text-xs overflow-auto leading-relaxed custom-scrollbar ${
                  isDark ? 'bg-slate-950 border-slate-800 text-emerald-400' : 'bg-slate-900 text-emerald-300'
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
          <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden divide-y md:divide-y-0 md:divide-x divide-slate-800">
            {/* Left: Code Editor */}
            <div className="w-full md:w-1/2 p-4 overflow-y-auto space-y-3 min-h-0 flex flex-col">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Code className="w-3.5 h-3.5 text-emerald-400" />
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
                    className={`text-[11px] px-2 py-1 rounded border outline-none font-mono ${
                      isDark ? 'bg-slate-950 border-slate-700 text-emerald-400' : 'bg-white border-slate-300 text-emerald-700'
                    }`}
                  >
                    <option value="netmiko_provision">Netmiko Toplu Yapılandırma</option>
                    <option value="netmiko_audit">Ağ & IP Sağlık Denetimi</option>
                    <option value="restconf_requests">RESTCONF Python Requests</option>
                    <option value="vlan_automation">Otomatik VLAN Dağıtımı</option>
                  </select>
                  <button
                    onClick={() => setPythonScript(PYTHON_TEMPLATES[selectedPythonPreset as keyof typeof PYTHON_TEMPLATES] || PYTHON_TEMPLATES.netmiko_provision)}
                    className="text-[11px] text-slate-400 hover:text-slate-200 p-1"
                    title="Şablonu Sıfırla"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <textarea
                value={pythonScript}
                onChange={(e) => setPythonScript(e.target.value)}
                className={`flex-1 p-3 text-xs font-mono rounded-lg border focus:outline-none resize-none leading-relaxed ${
                  isDark ? 'bg-slate-950 border-slate-700 text-slate-200' : 'bg-white border-slate-300'
                }`}
              />

              <button
                onClick={handleRunPython}
                disabled={isRunningScript}
                className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 transition shadow disabled:opacity-50 active:scale-[0.99]"
              >
                <Play className="w-3.5 h-3.5" />
                {isRunningScript ? 'Yürütülüyor...' : 'Python Betiğini Çalıştır (Run NetDevOps Script)'}
              </button>
            </div>

            {/* Right: Execution Console Output */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 min-h-0 flex flex-col">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Konsol Çıktısı (NetDevOps Console Output)
                </div>
              </div>

              <pre
                className={`flex-1 p-4 rounded-lg border font-mono text-xs overflow-auto leading-relaxed custom-scrollbar ${
                  isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-900 text-slate-200'
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

