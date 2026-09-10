import React, { useState } from 'react';
import { Terminal, Send, Play, Copy, Check, Code, Globe, Server, CheckCircle2, RotateCcw } from 'lucide-react';
import type { CanvasDevice } from './networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import { handleRestconfRequest, executeNetDevOpsPythonScript, RestconfResponse } from '@/lib/network/netdevopsEngine';

interface NetworkAutomationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  devices: CanvasDevice[];
  deviceStates: Map<string, SwitchState>;
  isDark?: boolean;
}

const SAMPLE_PYTHON_SCRIPT = `# NetDevOps Automated Provisioning Script
from netmiko import ConnectHandler
import json

devices = [
    {"device_type": "netsim_ios", "host": "R1", "username": "admin", "password": "netsim123"},
    {"device_type": "netsim_ios", "host": "SW1", "username": "admin", "password": "netsim123"},
]

commands = [
    "interface GigabitEthernet0/0",
    "description Uplink to Core Network (Configured via Netmiko)",
    "ip address 192.168.100.1 255.255.255.0",
    "no shutdown"
]

print("[NetDevOps] Starting automated provisioning...")
for dev in devices:
    net_connect = ConnectHandler(**dev)
    output = net_connect.send_config_set(commands)
    print(f"[Netmiko] Configured {dev['host']} successfully.")
    
    show_res = net_connect.send_command("show ip int brief")
    print(show_res)
    net_connect.disconnect()
`;

export const NetworkAutomationPanel: React.FC<NetworkAutomationPanelProps> = ({
  isOpen,
  onClose,
  devices,
  deviceStates,
  isDark = true,
}) => {
  const [activeTab, setActiveTab] = useState<'restconf' | 'python'>('restconf');

  // RESTCONF State
  const [restconfMethod, setRestconfMethod] = useState<'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'>('GET');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(devices[0]?.id || '');
  const [restconfUri, setRestconfUri] = useState<string>('/restconf/data/ietf-interfaces:interfaces');
  const [restconfBody, setRestconfBody] = useState<string>('{\n  "ietf-interfaces:interface": {\n    "name": "GigabitEthernet0/0",\n    "enabled": true\n  }\n}');
  const [restconfResponse, setRestconfResponse] = useState<RestconfResponse | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Python NetDevOps State
  const [pythonScript, setPythonScript] = useState<string>(SAMPLE_PYTHON_SCRIPT);
  const [pythonOutput, setPythonOutput] = useState<string>('');
  const [isRunningScript, setIsRunningScript] = useState(false);

  if (!isOpen) return null;

  const handleSendRestconf = () => {
    const targetDev = devices.find((d) => d.id === selectedDeviceId) || devices[0];
    if (!targetDev) return;

    const state = deviceStates.get(targetDev.id);
    let parsedBody: Record<string, unknown> | undefined;
    if (restconfMethod !== 'GET' && restconfBody.trim()) {
      try {
        parsedBody = JSON.parse(restconfBody);
      } catch {
        // use raw text
      }
    }

    const res = handleRestconfRequest(restconfMethod, restconfUri, targetDev, state, parsedBody);
    setRestconfResponse(res);
  };

  const handleRunPython = () => {
    setIsRunningScript(true);
    setPythonOutput('Python betiği yürütülüyor...\n');
    setTimeout(() => {
      const res = executeNetDevOpsPythonScript(pythonScript, devices, deviceStates);
      setPythonOutput(res.output);
      setIsRunningScript(false);
    }, 400);
  };

  const handleCopyJson = () => {
    if (restconfResponse) {
      navigator.clipboard.writeText(JSON.stringify(restconfResponse.data, null, 2));
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`w-full max-w-5xl h-[85vh] rounded-xl flex flex-col shadow-2xl border overflow-hidden ${
          isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        {/* Header */}
        <div
          className={`px-6 py-4 border-b flex items-center justify-between shrink-0 ${
            isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold">NetDevOps & RESTCONF Otomasyon Konsolu</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold">
                  API & Scripting
                </span>
              </div>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                RESTCONF YANG API sorgulama ve Python Netmiko otomasyon betikleri
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex rounded-lg p-0.5 border border-slate-700/60 bg-slate-950/40 text-xs">
              <button
                onClick={() => setActiveTab('restconf')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
                  activeTab === 'restconf'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                RESTCONF API
              </button>
              <button
                onClick={() => setActiveTab('python')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
                  activeTab === 'python'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                Python Netmiko
              </button>
            </div>

            <button
              onClick={onClose}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-300 hover:bg-slate-100'
              }`}
            >
              Kapat
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {activeTab === 'restconf' && (
            <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden divide-y md:divide-y-0 md:divide-x divide-slate-800">
              {/* Left: Request Builder */}
              <div className="w-full md:w-1/2 p-5 overflow-y-auto space-y-4 min-h-0">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-emerald-400" />
                  RESTCONF İstek Oluşturucu (Request Builder)
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-1">
                    <label className="text-[11px] font-semibold text-slate-400 mb-1 block">Metod</label>
                    <select
                      value={restconfMethod}
                      onChange={(e) => setRestconfMethod(e.target.value as any)}
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
                  <div className="flex gap-2 mt-1.5">
                    <button
                      onClick={() => setRestconfUri('/restconf/data/ietf-interfaces:interfaces')}
                      className="text-[10px] text-emerald-400 hover:underline"
                    >
                      ietf-interfaces
                    </button>
                    <span className="text-slate-600">•</span>
                    <button
                      onClick={() => setRestconfUri('/restconf/data/netsim-native:native')}
                      className="text-[10px] text-emerald-400 hover:underline"
                    >
                      netsim-native
                    </button>
                  </div>
                </div>

                {restconfMethod !== 'GET' && (
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 mb-1 block">Request Body (JSON)</label>
                    <textarea
                      value={restconfBody}
                      onChange={(e) => setRestconfBody(e.target.value)}
                      rows={6}
                      className={`w-full p-2.5 text-xs font-mono rounded-lg border focus:outline-none ${
                        isDark ? 'bg-slate-950 border-slate-700 text-slate-200' : 'bg-white border-slate-300'
                      }`}
                    />
                  </div>
                )}

                <button
                  onClick={handleSendRestconf}
                  className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 transition shadow"
                >
                  <Send className="w-3.5 h-3.5" />
                  RESTCONF İsteği Gönder (Send)
                </button>
              </div>

              {/* Right: Response Viewer */}
              <div className="flex-1 p-5 overflow-y-auto space-y-3 min-h-0 flex flex-col">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Sunucu Yanıtı (Response Output)
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
                  className={`flex-1 p-4 rounded-lg border font-mono text-xs overflow-auto leading-relaxed ${
                    isDark ? 'bg-slate-950 border-slate-800 text-emerald-400' : 'bg-slate-900 text-emerald-300'
                  }`}
                >
                  {restconfResponse
                    ? JSON.stringify(restconfResponse.data, null, 2)
                    : '// RESTCONF isteği gönderildiğinde JSON çıktısı burada görünecektir.'}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'python' && (
            <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden divide-y md:divide-y-0 md:divide-x divide-slate-800">
              {/* Left: Code Editor */}
              <div className="w-full md:w-1/2 p-5 overflow-y-auto space-y-3 min-h-0 flex flex-col">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Code className="w-3.5 h-3.5 text-emerald-400" />
                    Python Script Editörü
                  </div>
                  <button
                    onClick={() => setPythonScript(SAMPLE_PYTHON_SCRIPT)}
                    className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Örnek Şablon
                  </button>
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
                  className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 transition shadow disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5" />
                  {isRunningScript ? 'Yürütülüyor...' : 'Python Betiğini Çalıştır (Run Script)'}
                </button>
              </div>

              {/* Right: Execution Console Output */}
              <div className="flex-1 p-5 overflow-y-auto space-y-3 min-h-0 flex flex-col">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Konsol Çıktısı (Execution Console)
                  </div>
                </div>

                <pre
                  className={`flex-1 p-4 rounded-lg border font-mono text-xs overflow-auto leading-relaxed ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-900 text-slate-200'
                  }`}
                >
                  {pythonOutput || '// Betiği çalıştırmak için "Python Betiğini Çalıştır" butonuna basın.'}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
