import { useState } from 'react';
import { Code, Copy, Check, Server, FileJson, Sparkles, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { handleRestApiRequest, type RestApiResponse } from '@/lib/network/restApiMock';
import { usePCPanel } from './PCPanelContext';
import type { CanvasDevice } from '../networkTopology.types';

interface RestApiExplorerWindowProps {
  isDark: boolean;
  language: string;
  topologyDevices?: CanvasDevice[];
}

const TEMPLATE_ENDPOINTS = [
  {
    label: '1. [Auth] POST - /dna/system/api/v1/auth/token',
    method: 'POST',
    url: 'https://controller/dna/system/api/v1/auth/token',
    headers: 'Content-Type: application/json\nAccept: application/json\nAuthorization: Basic YWRtaW46bmV0c2ltMTIz',
    body: '{\n  "username": "admin",\n  "password": "password123"\n}',
  },
  {
    label: '2. [Inventory] GET - /dna/intent/api/v1/network-device',
    method: 'GET',
    url: 'https://controller/dna/intent/api/v1/network-device',
    headers: 'Content-Type: application/json\nx-auth-token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
    body: '',
  },
  {
    label: '3. [Count] GET - /dna/intent/api/v1/network-device/count',
    method: 'GET',
    url: 'https://controller/dna/intent/api/v1/network-device/count',
    headers: 'Content-Type: application/json\nx-auth-token: demo_token_123',
    body: '',
  },
  {
    label: '4. [Interfaces] GET - /dna/intent/api/v1/interface',
    method: 'GET',
    url: 'https://controller/dna/intent/api/v1/interface',
    headers: 'Content-Type: application/json\nx-auth-token: demo_token_123',
    body: '',
  },
  {
    label: '5. [Topology Graph] GET - /dna/intent/api/v1/topology/site-topology',
    method: 'GET',
    url: 'https://controller/dna/intent/api/v1/topology/site-topology',
    headers: 'Content-Type: application/json\nx-auth-token: demo_token_123',
    body: '',
  },
  {
    label: '6. [Health] GET - /dna/intent/api/v1/network-health',
    method: 'GET',
    url: 'https://controller/dna/intent/api/v1/network-health',
    headers: 'Content-Type: application/json\nx-auth-token: demo_token_123',
    body: '',
  },
  {
    label: '7. [Clients] GET - /dna/intent/api/v1/client-health',
    method: 'GET',
    url: 'https://controller/dna/intent/api/v1/client-health',
    headers: 'Content-Type: application/json\nx-auth-token: demo_token_123',
    body: '',
  },
  {
    label: '8. [YANG] GET - /restconf/data/ietf-interfaces:interfaces',
    method: 'GET',
    url: 'https://router1/restconf/data/ietf-interfaces:interfaces',
    headers: 'Accept: application/yang-data+json\nContent-Type: application/yang-data+json',
    body: '',
  },
  {
    label: '9. [YANG] PATCH - /restconf/data/ietf-interfaces:interfaces/interface=Gi0/0',
    method: 'PATCH',
    url: 'https://router1/restconf/data/ietf-interfaces:interfaces/interface=GigabitEthernet0/0',
    headers: 'Accept: application/yang-data+json\nContent-Type: application/yang-data+json',
    body: '{\n  "ietf-interfaces:interface": {\n    "name": "GigabitEthernet0/0",\n    "description": "Configured via RESTCONF API Explorer",\n    "enabled": true,\n    "ietf-ip:ipv4": {\n      "address": [\n        {\n          "ip": "192.168.200.1",\n          "netmask": "255.255.255.0"\n        }\n      ]\n    }\n  }\n}',
  },
  {
    label: '10. [YANG] GET - /restconf/data/netsim-native:native',
    method: 'GET',
    url: 'https://router1/restconf/data/netsim-native:native',
    headers: 'Accept: application/yang-data+json\nContent-Type: application/yang-data+json',
    body: '',
  },
  {
    label: '11. [YANG] PUT - /restconf/data/netsim-native:native',
    method: 'PUT',
    url: 'https://router1/restconf/data/netsim-native:native',
    headers: 'Accept: application/yang-data+json\nContent-Type: application/yang-data+json',
    body: '{\n  "netsim-native:native": {\n    "hostname": "HQ-Core-Router",\n    "ip": {\n      "routing": true\n    }\n  }\n}',
  },
  {
    label: '12. [YANG] DELETE - /restconf/data/ietf-interfaces:interfaces/interface=Gi0/0',
    method: 'DELETE',
    url: 'https://router1/restconf/data/ietf-interfaces:interfaces/interface=GigabitEthernet0/0',
    headers: 'Accept: application/yang-data+json',
    body: '',
  },
];

export function RestApiExplorerWindow({
  isDark,
  language,
  topologyDevices: propDevices,
}: RestApiExplorerWindowProps) {
  const pcContext = usePCPanel();
  const devices = propDevices || pcContext?.topologyDevices || [];
  const connections = pcContext?.topologyConnections || [];
  const deviceStates = pcContext?.deviceStates;

  const [method, setMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'>('GET');
  const [url, setUrl] = useState('https://controller/dna/intent/api/v1/network-device');
  const [headers, setHeaders] = useState('Content-Type: application/json\nx-auth-token: demo_token_123');
  const [body, setBody] = useState('{\n  "name": "Router-1",\n  "type": "netsim"\n}');
  const [activeReqTab, setActiveReqTab] = useState<'headers' | 'body' | 'python' | 'curl'>('headers');
  const [activeResTab, setActiveResTab] = useState<'body' | 'headers'>('body');
  const [response, setResponse] = useState<RestApiResponse | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  const isTr = language === 'tr';

  const generateCurlSnippet = () => {
    const headerLines = headers.split('\n').filter(Boolean);
    let cmd = `curl -X ${method} "${url}"`;
    headerLines.forEach(h => {
      cmd += ` \\\n  -H "${h.trim()}"`;
    });
    if ((method === 'POST' || method === 'PUT' || method === 'PATCH') && body.trim()) {
      const sanitizedBody = body.replace(/"/g, '\\"');
      cmd += ` \\\n  -d "${sanitizedBody}"`;
    }
    return cmd;
  };

  const generatePythonSnippet = () => {
    const headerLines = headers.split('\n').filter(Boolean);
    const headerObj: Record<string, string> = {};
    headerLines.forEach(l => {
      const parts = l.split(':');
      if (parts.length >= 2) headerObj[parts[0].trim()] = parts.slice(1).join(':').trim();
    });

    let code = `import requests\nimport json\n\nurl = "${url}"\n`;
    code += `headers = ${JSON.stringify(headerObj, null, 4)}\n\n`;

    if ((method === 'POST' || method === 'PUT' || method === 'PATCH') && body.trim()) {
      code += `payload = ${body.trim()}\n\n`;
      code += `response = requests.${method.toLowerCase()}(url, headers=headers, json=payload)\n`;
    } else {
      code += `response = requests.${method.toLowerCase()}(url, headers=headers)\n`;
    }
    code += `\nprint("Status:", response.status_code)\ntry:\n    print(json.dumps(response.json(), indent=2))\nexcept Exception:\n    print(response.text)\n`;
    return code;
  };

  const handleCopySnippet = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(type);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  const handleSend = () => {
    const headerLines = headers.split('\n');
    const headerMap: Record<string, string> = {};
    headerLines.forEach(line => {
      const parts = line.split(':');
      if (parts.length >= 2) {
        headerMap[parts[0].trim()] = parts.slice(1).join(':').trim();
      }
    });

    const res = handleRestApiRequest(
      method,
      url,
      headerMap,
      body,
      devices,
      deviceStates,
      connections as any
    );
    setResponse(res);

    if (res.updatedState && res.updatedDeviceId) {
      window.dispatchEvent(
        new CustomEvent('update-device-state', {
          detail: { deviceId: res.updatedDeviceId, newState: res.updatedState },
        })
      );
    }
  };

  const handleCopyJson = () => {
    if (!response) return;
    const contentToCopy = activeResTab === 'body' ? JSON.stringify(response.data, null, 2) : JSON.stringify(response.headers, null, 2);
    navigator.clipboard.writeText(contentToCopy);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSelectTemplate = (targetUrl: string) => {
    const selected = TEMPLATE_ENDPOINTS.find(t => t.url === targetUrl);
    if (selected) {
      setMethod(selected.method as any);
      setUrl(selected.url);
      if (selected.headers) setHeaders(selected.headers);
      if (selected.body) {
        setBody(selected.body);
        setActiveReqTab('body');
      } else {
        setActiveReqTab('headers');
      }
    }
  };

  return (
    <div className={`flex-1 flex flex-col min-h-0 p-3 select-none ${isDark ? 'text-white' : 'text-slate-900'}`}>
      <div className={`rounded-xl border p-3 flex flex-col flex-1 min-h-0 gap-3 ${isDark ? 'border-secondary-800 bg-secondary-950/60' : 'border-secondary-200 bg-white'}`}>
        
        {/* Header / Title */}
        <div className="flex items-center justify-between border-b pb-2 dark:border-secondary-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Code className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold uppercase tracking-wider">
                  REST API Explorer & Intent Controller Tester
                </h2>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold">
                  Intent API / RESTCONF
                </span>
              </div>
              <p className="text-[10px] opacity-60">Controller Intent API, Network Device Telemetry & YANG Models</p>
            </div>
          </div>

          {/* Target Device Selector & Preset templates dropdown */}
          <div className="flex items-center gap-2">
            {/* Device Selector */}
            {devices.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-sky-400" />
                <select
                  aria-label={isTr ? 'Hedef Cihaz' : 'Target Device'}
                  onChange={(e) => {
                    const devId = e.target.value;
                    if (!devId) return;
                    const matchedDev = devices.find(d => d.id === devId);
                    const host = matchedDev?.name || devId;
                    // If current URL has RESTCONF, replace host
                    if (url.includes('/restconf/')) {
                      setUrl(url.replace(/https?:\/\/[^/]+/, `https://${host.toLowerCase()}`));
                    } else {
                      setUrl(`https://${host.toLowerCase()}/restconf/data/ietf-interfaces:interfaces`);
                    }
                  }}
                  className={`text-xs px-2 py-1.5 rounded-lg border outline-none font-mono ${
                    isDark ? 'bg-secondary-900 border-secondary-700 text-sky-400' : 'bg-secondary-100 border-secondary-300 text-sky-700'
                  }`}
                >
                  <option value="">{isTr ? '-- Hedef Cihaz Seç --' : '-- Select Target Device --'}</option>
                  {devices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name || d.id} ({d.type})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Preset Templates */}
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <select
                aria-label={isTr ? 'Hazır Şablonlar' : 'Preset Templates'}
                onChange={(e) => handleSelectTemplate(e.target.value)}
                className={`text-xs px-2.5 py-1.5 rounded-lg border outline-none font-mono ${
                  isDark ? 'bg-secondary-900 border-secondary-700 text-emerald-400' : 'bg-secondary-100 border-secondary-300 text-emerald-700'
                }`}
              >
                <option value="">{isTr ? '-- Hazır Şablon Seç --' : '-- Preset Template --'}</option>
                {TEMPLATE_ENDPOINTS.map((tpl, i) => (
                  <option key={i} value={tpl.url}>{tpl.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Request Address Bar */}
        <div className="flex items-center gap-2">
          <select
            role="combobox"
            value={method}
            onChange={(e) => setMethod(e.target.value as 'GET')}
            className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border outline-none font-mono ${
              method === 'GET' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' :
              method === 'POST' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' :
              method === 'PUT' ? 'bg-sky-500/20 text-sky-400 border-sky-500/40' :
              method === 'PATCH' ? 'bg-purple-500/20 text-purple-400 border-purple-500/40' :
              'bg-rose-500/20 text-rose-400 border-rose-500/40'
            }`}
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
            <option value="DELETE">DELETE</option>
          </select>

          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://controller/dna/intent/api/v1/network-device"
            className={`flex-1 text-xs font-mono px-3 py-1.5 rounded-lg border outline-none ${
              isDark ? 'bg-secondary-900 border-secondary-700 text-white' : 'bg-secondary-50 border-secondary-300 text-slate-900'
            }`}
          />

          <Button
            size="sm"
            onClick={handleSend}
            className="bg-emerald-600 hover:bg-emerald-700 text-slate-950 font-bold text-xs gap-1.5 shadow"
          >
            <Send className="w-3.5 h-3.5 fill-current" />
            <span>{isTr ? 'İstek Gönder' : 'Send'}</span>
          </Button>
        </div>

        {/* Request Options & Tabs */}
        <div className="flex flex-col h-[35%] min-h-0 border rounded-lg overflow-hidden dark:border-secondary-800">
          <div className={`flex items-center justify-between border-b px-2 py-1 text-[11px] font-bold ${
            isDark ? 'bg-secondary-900 border-secondary-800' : 'bg-secondary-100 border-secondary-200'
          }`}>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setActiveReqTab('headers')}
                className={`px-2.5 py-0.5 rounded transition-colors ${activeReqTab === 'headers' ? 'bg-emerald-500 text-slate-950 font-bold' : 'opacity-60 hover:opacity-100'}`}
              >
                Headers ({headers.split('\n').filter(Boolean).length})
              </button>
              <button
                onClick={() => setActiveReqTab('body')}
                className={`px-2.5 py-0.5 rounded transition-colors ${activeReqTab === 'body' ? 'bg-emerald-500 text-slate-950 font-bold' : 'opacity-60 hover:opacity-100'}`}
              >
                Body (JSON Payload)
              </button>
              <button
                onClick={() => setActiveReqTab('python')}
                className={`px-2 py-0.5 rounded transition-colors ${activeReqTab === 'python' ? 'bg-sky-500 text-slate-950 font-bold' : 'opacity-60 hover:opacity-100 text-sky-400'}`}
              >
                Python (requests)
              </button>
              <button
                onClick={() => setActiveReqTab('curl')}
                className={`px-2 py-0.5 rounded transition-colors ${activeReqTab === 'curl' ? 'bg-amber-500 text-slate-950 font-bold' : 'opacity-60 hover:opacity-100 text-amber-400'}`}
              >
                cURL Snippet
              </button>
            </div>
            
            {activeReqTab === 'python' && (
              <button
                onClick={() => handleCopySnippet(generatePythonSnippet(), 'python')}
                className="flex items-center gap-1 text-[10px] text-sky-400 font-mono hover:underline"
              >
                {copiedSnippet === 'python' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedSnippet === 'python' ? (isTr ? 'Kopyalandı' : 'Copied') : (isTr ? 'Python Kodu Kopyala' : 'Copy Python')}</span>
              </button>
            )}

            {activeReqTab === 'curl' && (
              <button
                onClick={() => handleCopySnippet(generateCurlSnippet(), 'curl')}
                className="flex items-center gap-1 text-[10px] text-amber-400 font-mono hover:underline"
              >
                {copiedSnippet === 'curl' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedSnippet === 'curl' ? (isTr ? 'Kopyalandı' : 'Copied') : (isTr ? 'cURL Kopyala' : 'Copy cURL')}</span>
              </button>
            )}

            {activeReqTab !== 'python' && activeReqTab !== 'curl' && (
              <span className="text-[10px] opacity-50 font-mono">Request Config</span>
            )}
          </div>

          <div className="flex-1 p-2 min-h-0 overflow-auto">
            {activeReqTab === 'headers' ? (
              <textarea
                value={headers}
                onChange={(e) => setHeaders(e.target.value)}
                placeholder="Content-Type: application/json&#10;x-auth-token: demo_token_123"
                className={`w-full h-full text-xs font-mono bg-transparent outline-none resize-none leading-relaxed ${isDark ? 'text-slate-200' : 'text-slate-800'}`}
              />
            ) : activeReqTab === 'body' ? (
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder='{ "key": "value" }'
                className={`w-full h-full text-xs font-mono bg-transparent outline-none resize-none leading-relaxed ${isDark ? 'text-slate-200' : 'text-slate-800'}`}
              />
            ) : activeReqTab === 'python' ? (
              <pre className="text-xs font-mono text-sky-300 select-text whitespace-pre-wrap leading-relaxed">
                {generatePythonSnippet()}
              </pre>
            ) : (
              <pre className="text-xs font-mono text-amber-300 select-text whitespace-pre-wrap leading-relaxed">
                {generateCurlSnippet()}
              </pre>
            )}
          </div>
        </div>

        {/* Response Viewer */}
        <div className="flex-1 flex flex-col min-h-0 border rounded-lg overflow-hidden dark:border-secondary-800">
          <div className={`flex items-center justify-between px-3 py-1.5 border-b text-[11px] font-bold ${
            isDark ? 'bg-secondary-900 border-secondary-800' : 'bg-secondary-100 border-secondary-200'
          }`}>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <FileJson className="w-3.5 h-3.5 text-amber-400" />
                <span>{isTr ? 'Sunucu Yanıtı (Response)' : 'Response'}</span>
              </div>

              {response && (
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                    response.status >= 200 && response.status < 300
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}>
                    {response.status} {response.statusText}
                  </span>
                  <span className="text-[10px] opacity-60 font-mono">
                    {response.executionTimeMs} ms
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex rounded p-0.5 bg-secondary-950/40 border border-secondary-800 text-[10px]">
                <button
                  onClick={() => setActiveResTab('body')}
                  className={`px-2 py-0.5 rounded ${activeResTab === 'body' ? 'bg-emerald-500/20 text-emerald-400 font-bold' : 'opacity-60'}`}
                >
                  Body
                </button>
                <button
                  onClick={() => setActiveResTab('headers')}
                  className={`px-2 py-0.5 rounded ${activeResTab === 'headers' ? 'bg-emerald-500/20 text-emerald-400 font-bold' : 'opacity-60'}`}
                >
                  Headers
                </button>
              </div>

              {response && (
                <button
                  onClick={handleCopyJson}
                  className="flex items-center gap-1 text-[10px] opacity-70 hover:opacity-100 transition-opacity ml-1"
                >
                  {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{isCopied ? (isTr ? 'Kopyalandı' : 'Copied') : (isTr ? 'JSON Kopyala' : 'Copy JSON')}</span>
                </button>
              )}
            </div>
          </div>

          <div className={`flex-1 p-3 font-mono text-xs overflow-auto custom-scrollbar leading-relaxed ${
            isDark ? 'bg-secondary-950 text-emerald-400' : 'bg-slate-900 text-emerald-300'
          }`}>
            {response ? (
              <pre className="whitespace-pre-wrap">
                {activeResTab === 'body'
                  ? JSON.stringify(response.data, null, 2)
                  : JSON.stringify(response.headers, null, 2)}
              </pre>
            ) : (
              <div className="flex flex-col items-center justify-center h-full opacity-35 gap-2 select-none">
                <Server className="w-8 h-8 text-emerald-400" />
                <span className="text-xs">{isTr ? 'İstek göndermek için "İstek Gönder" butonuna veya bir şablona tıklayın' : 'Select a preset template or click "Send" to execute API request'}</span>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

