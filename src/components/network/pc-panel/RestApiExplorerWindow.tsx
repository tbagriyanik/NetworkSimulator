import { useRef, useState } from 'react';
import {
  Code,
  Copy,
  Check,
  Server,
  FileJson,
  Sparkles,
  Send,
  Zap,
  Layers,
  Activity,
  KeyRound,
  Network,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { handleRestApiRequest, type RestApiResponse } from '@/lib/network/restApiMock';
import { usePCPanel } from './PCPanelContext';
import type { CanvasDevice, CanvasConnection } from '../NetworkTopology/types/networkTopology.types';

interface RestApiExplorerWindowProps {
  isDark: boolean;
  language: string;
  topologyDevices?: CanvasDevice[];
}

interface TemplateGroup {
  groupNameTr: string;
  groupNameEn: string;
  items: Array<{
    id: string;
    labelTr: string;
    labelEn: string;
    descriptionTr: string;
    descriptionEn: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    url: string;
    headers: string;
    body: string;
  }>;
}

const API_TEMPLATE_GROUPS: TemplateGroup[] = [
  {
    groupNameTr: 'Yönetim & Kimlik Doğrulama',
    groupNameEn: 'Management & Auth',
    items: [
      {
        id: 'auth-token',
        labelTr: 'Kimlik Doğrulama (Auth Token)',
        labelEn: 'Authentication Token',
        descriptionTr: 'Yönetici oturum belirteci alır',
        descriptionEn: 'Acquire admin session token',
        method: 'POST',
        url: 'https://controller/dna/system/api/v1/auth/token',
        headers: 'Content-Type: application/json\nAccept: application/json\nAuthorization: Basic YWRtaW46bmV0c2ltMTIz',
        body: '{\n  "username": "admin",\n  "password": "password123"\n}',
      },
    ],
  },
  {
    groupNameTr: 'Cihaz Envanteri & Topoloji',
    groupNameEn: 'Device Inventory & Topology',
    items: [
      {
        id: 'device-list',
        labelTr: 'Ağ Cihazları Listesi',
        labelEn: 'Network Devices List',
        descriptionTr: 'Tüm aktif yönlendirici ve anahtarları listeler',
        descriptionEn: 'List all active routers and switches',
        method: 'GET',
        url: 'https://controller/dna/intent/api/v1/network-device',
        headers: 'Content-Type: application/json\nx-auth-token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        body: '',
      },
      {
        id: 'device-count',
        labelTr: 'Toplam Cihaz Sayısı',
        labelEn: 'Total Device Count',
        descriptionTr: 'Ağdaki toplam cihaz adedini döner',
        descriptionEn: 'Returns total count of network nodes',
        method: 'GET',
        url: 'https://controller/dna/intent/api/v1/network-device/count',
        headers: 'Content-Type: application/json\nx-auth-token: demo_token_123',
        body: '',
      },
      {
        id: 'interfaces',
        labelTr: 'Cihaz Portları ve Arayüzler',
        labelEn: 'Device Interfaces',
        descriptionTr: 'Port IP ve durum bilgilerini getirir',
        descriptionEn: 'Retrieve port IP and operational status',
        method: 'GET',
        url: 'https://controller/dna/intent/api/v1/interface',
        headers: 'Content-Type: application/json\nx-auth-token: demo_token_123',
        body: '',
      },
      {
        id: 'topology-graph',
        labelTr: 'Topoloji Grafiği & Bağlantılar',
        labelEn: 'Topology Graph & Links',
        descriptionTr: 'Düğüm ve kablo bağlantı haritasını verir',
        descriptionEn: 'Get node and cable connection matrix',
        method: 'GET',
        url: 'https://controller/dna/intent/api/v1/topology/site-topology',
        headers: 'Content-Type: application/json\nx-auth-token: demo_token_123',
        body: '',
      },
      {
        id: 'network-health',
        labelTr: 'Ağ Sağlık Skoru',
        labelEn: 'Network Health Score',
        descriptionTr: 'Cihazların çalışma ve erişilebilirlik sağlığı',
        descriptionEn: 'Device operational and reachable health',
        method: 'GET',
        url: 'https://controller/dna/intent/api/v1/network-health',
        headers: 'Content-Type: application/json\nx-auth-token: demo_token_123',
        body: '',
      },
    ],
  },
  {
    groupNameTr: 'RESTCONF / YANG Cihaz Yapılandırması',
    groupNameEn: 'RESTCONF / YANG Configuration',
    items: [
      {
        id: 'yang-get-interfaces',
        labelTr: 'YANG Arayüzlerini Oku (GET)',
        labelEn: 'Read YANG Interfaces (GET)',
        descriptionTr: 'ietf-interfaces veri modelini çeker',
        descriptionEn: 'Retrieve ietf-interfaces data model',
        method: 'GET',
        url: 'https://router1/restconf/data/ietf-interfaces:interfaces',
        headers: 'Accept: application/yang-data+json\nContent-Type: application/yang-data+json',
        body: '',
      },
      {
        id: 'yang-patch-interface',
        labelTr: 'YANG Port Güncelle (PATCH)',
        labelEn: 'Update YANG Port (PATCH)',
        descriptionTr: 'GigabitEthernet0/0 IP adresini değiştirir',
        descriptionEn: 'Modify GigabitEthernet0/0 IP address',
        method: 'PATCH',
        url: 'https://router1/restconf/data/ietf-interfaces:interfaces/interface=GigabitEthernet0/0',
        headers: 'Accept: application/yang-data+json\nContent-Type: application/yang-data+json',
        body: '{\n  "ietf-interfaces:interface": {\n    "name": "GigabitEthernet0/0",\n    "description": "Configured via REST API",\n    "enabled": true,\n    "ietf-ip:ipv4": {\n      "address": [\n        {\n          "ip": "192.168.200.1",\n          "netmask": "255.255.255.0"\n        }\n      ]\n    }\n  }\n}',
      },
      {
        id: 'yang-native-config',
        labelTr: 'YANG Native Hostname (PUT)',
        labelEn: 'YANG Native Hostname (PUT)',
        descriptionTr: 'Cihazın ana adını ve yönlendirmesini ayarlar',
        descriptionEn: 'Configure hostname and routing parameters',
        method: 'PUT',
        url: 'https://router1/restconf/data/netsim-native:native',
        headers: 'Accept: application/yang-data+json\nContent-Type: application/yang-data+json',
        body: '{\n  "netsim-native:native": {\n    "hostname": "HQ-Core-Router",\n    "ip": {\n      "routing": true\n    }\n  }\n}',
      },
      {
        id: 'yang-delete-interface',
        labelTr: 'YANG Port Sıfırla (DELETE)',
        labelEn: 'Reset YANG Port (DELETE)',
        descriptionTr: 'Arayüz yapılandırmasını siler',
        descriptionEn: 'Delete interface configuration',
        method: 'DELETE',
        url: 'https://router1/restconf/data/ietf-interfaces:interfaces/interface=GigabitEthernet0/0',
        headers: 'Accept: application/yang-data+json',
        body: '',
      },
    ],
  },
];

const ALL_TEMPLATES = API_TEMPLATE_GROUPS.flatMap(g => g.items);

export function RestApiExplorerWindow({
  isDark,
  language,
  topologyDevices: propDevices,
}: RestApiExplorerWindowProps) {
  const pcContext = usePCPanel();
  const devices = propDevices || pcContext?.topologyDevices || [];
  const connections = pcContext?.topologyConnections || [];
  const deviceStates = pcContext?.deviceStates;

  const isTr = language === 'tr';

  const [method, setMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'>('GET');
  const [url, setUrl] = useState('https://controller/dna/intent/api/v1/network-device');
  const [headers, setHeaders] = useState('Content-Type: application/json\nx-auth-token: demo_token_123');
  const [body, setBody] = useState('');
  const [activeReqTab, setActiveReqTab] = useState<'headers' | 'body' | 'code'>('headers');
  const [snippetLanguage, setSnippetLanguage] = useState<'curl' | 'python'>('curl');
  const [activeResTab, setActiveResTab] = useState<'body' | 'headers'>('body');
  const [response, setResponse] = useState<RestApiResponse | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [splitPercent, setSplitPercent] = useState(48);
  const splitRef = useRef<HTMLDivElement>(null);

  const startSplitResize = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const move = (moveEvent: PointerEvent) => {
      const rect = splitRef.current?.getBoundingClientRect();
      if (!rect) return;
      setSplitPercent(Math.min(75, Math.max(25, ((moveEvent.clientX - rect.left) / rect.width) * 100)));
    };
    const stop = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop, { once: true });
  };

  const generateCurlSnippet = () => {
    const headerLines = headers.split('\n').filter(Boolean);
    let cmd = `curl -X ${method} "${url}"`;
    headerLines.forEach(h => {
      cmd += ` \\\n  -H "${h.trim()}"`;
    });
    if ((method === 'POST' || method === 'PUT' || method === 'PATCH') && body.trim()) {
      const sanitizedBody = body.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
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

  const handleCopySnippet = () => {
    const snippet = snippetLanguage === 'curl' ? generateCurlSnippet() : generatePythonSnippet();
    navigator.clipboard.writeText(snippet);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
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
      connections as CanvasConnection[]
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

  const applyTemplate = (item: typeof ALL_TEMPLATES[0], autoSend = false) => {
    setMethod(item.method);
    setUrl(item.url);
    setHeaders(item.headers);
    setBody(item.body);
    if (item.body) {
      setActiveReqTab('body');
    } else {
      setActiveReqTab('headers');
    }

    if (autoSend) {
      setTimeout(() => {
        const headerLines = item.headers.split('\n');
        const headerMap: Record<string, string> = {};
        headerLines.forEach(line => {
          const parts = line.split(':');
          if (parts.length >= 2) {
            headerMap[parts[0].trim()] = parts.slice(1).join(':').trim();
          }
        });
        const res = handleRestApiRequest(
          item.method,
          item.url,
          headerMap,
          item.body,
          devices,
          deviceStates,
          connections as CanvasConnection[]
        );
        setResponse(res);
      }, 50);
    }
  };

  const handleDeviceSelect = (devId: string) => {
    if (!devId) return;
    const matchedDev = devices.find(d => d.id === devId);
    const host = (matchedDev?.name || devId).toLowerCase();
    if (url.includes('/restconf/')) {
      setUrl(url.replace(/https?:\/\/[^/]+/, `https://${host}`));
    } else {
      setUrl(`https://${host}/restconf/data/ietf-interfaces:interfaces`);
      setMethod('GET');
      setHeaders('Accept: application/yang-data+json\nContent-Type: application/yang-data+json');
      setBody('');
    }
  };

  const quickPills = [
    {
      id: 'device-list',
      label: isTr ? 'Cihazlar' : 'Devices',
      icon: Server,
      accent: 'text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 border-sky-500/30',
    },
    {
      id: 'topology-graph',
      label: isTr ? 'Topoloji' : 'Topology',
      icon: Network,
      accent: 'text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-500/30',
    },
    {
      id: 'network-health',
      label: isTr ? 'Sağlık' : 'Health',
      icon: Activity,
      accent: 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30',
    },
    {
      id: 'auth-token',
      label: isTr ? 'Auth Token' : 'Auth Token',
      icon: KeyRound,
      accent: 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30',
    },
    {
      id: 'yang-get-interfaces',
      label: 'RESTCONF YANG',
      icon: Layers,
      accent: 'text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/30',
    },
  ];

  return (
    <div className={`flex-1 flex flex-col min-h-0 p-2.5 select-none ${isDark ? 'text-white' : 'text-slate-900'}`}>
      <div className={`rounded-xl border p-3 flex flex-col flex-1 min-h-0 gap-2.5 ${isDark ? 'border-secondary-800 bg-secondary-950/70' : 'border-secondary-200 bg-white'}`}>
        
        {/* 1. Header Bar */}
        <div className={`flex flex-wrap items-center justify-between gap-2 border-b pb-2.5 ${isDark ? 'border-secondary-800' : 'border-secondary-200'}`}>
          <div className="flex items-center gap-2.5">
            <div className={`p-1.5 rounded-lg border ${isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
              <Code className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold tracking-tight">
                  {isTr ? 'REST API & RESTCONF Gezgini' : 'REST API & RESTCONF Explorer'}
                </h2>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-medium border ${isDark ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                  Controller / YANG
                </span>
              </div>
              <p className="text-[11px] opacity-60">
                {isTr ? 'Ağ kontrolcüsü ve cihazlara REST API istekleri gönderin.' : 'Send REST requests to controller and network devices.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Target Device Quick Selector */}
            {devices.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 opacity-60" />
                <select
                  aria-label={isTr ? 'Hedef Cihaz' : 'Target Device'}
                  onChange={(e) => handleDeviceSelect(e.target.value)}
                  className={`text-xs px-2 py-1.5 rounded-lg border outline-none font-mono ${
                    isDark ? 'bg-secondary-900 border-secondary-700 text-sky-400' : 'bg-secondary-100 border-secondary-300 text-sky-700'
                  }`}
                >
                  <option value="">{isTr ? '-- Hedef Cihaz --' : '-- Target Device --'}</option>
                  {devices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name || d.id} ({d.type})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Categorized Template Dropdown */}
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <select
                aria-label={isTr ? 'Hazır API Şablonları' : 'Preset API Templates'}
                onChange={(e) => {
                  const item = ALL_TEMPLATES.find(t => t.id === e.target.value);
                  if (item) applyTemplate(item);
                }}
                className={`text-xs px-2.5 py-1.5 rounded-lg border outline-none font-mono max-w-[200px] truncate ${
                  isDark ? 'bg-secondary-900 border-secondary-700 text-emerald-400' : 'bg-secondary-100 border-secondary-300 text-emerald-700'
                }`}
              >
                <option value="">{isTr ? '📋 Hazır Şablonlar...' : '📋 Preset Templates...'}</option>
                {API_TEMPLATE_GROUPS.map((grp) => (
                  <optgroup key={grp.groupNameEn} label={isTr ? grp.groupNameTr : grp.groupNameEn}>
                    {grp.items.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        [{tpl.method}] {isTr ? tpl.labelTr : tpl.labelEn}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 2. Quick Action Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-0.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider opacity-50 mr-1 flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-400" />
            {isTr ? 'Hızlı Seçim' : 'Quick Presets'}:
          </span>
          {quickPills.map((pill) => {
            const tpl = ALL_TEMPLATES.find(t => t.id === pill.id);
            const Icon = pill.icon;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => {
                  if (tpl) applyTemplate(tpl, true);
                }}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all active:scale-95 whitespace-nowrap ${pill.accent}`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{pill.label}</span>
              </button>
            );
          })}
        </div>

        {/* 3. URL Bar & Send Button */}
        <div className="flex items-center gap-2">
          {/* Method Selector */}
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH')}
            aria-label={isTr ? 'HTTP Yöntemi' : 'HTTP Method'}
            className={`text-xs font-bold px-3 py-2 rounded-lg border outline-none font-mono cursor-pointer transition-colors ${
              method === 'GET'
                ? isDark ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : method === 'POST'
                ? isDark ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' : 'bg-amber-50 text-amber-700 border-amber-300'
                : method === 'PUT'
                ? isDark ? 'bg-sky-500/20 text-sky-400 border-sky-500/40' : 'bg-sky-50 text-sky-700 border-sky-300'
                : method === 'PATCH'
                ? isDark ? 'bg-purple-500/20 text-purple-400 border-purple-500/40' : 'bg-purple-50 text-purple-700 border-purple-300'
                : isDark ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' : 'bg-rose-50 text-rose-700 border-rose-300'
            }`}
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
            <option value="DELETE">DELETE</option>
          </select>

          {/* URL Input */}
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            placeholder="https://controller/dna/intent/api/v1/network-device"
            aria-label={isTr ? 'İstek URL Adresi' : 'Request URL Address'}
            className={`flex-1 text-xs font-mono px-3 py-2 rounded-lg border outline-none transition-colors ${
              isDark ? 'bg-secondary-900/90 border-secondary-700 text-white focus:border-primary-500' : 'bg-secondary-50 border-secondary-300 text-slate-900 focus:border-primary-500'
            }`}
          />

          {/* Send Button */}
          <Button
            size="sm"
            onClick={handleSend}
            className="h-9 px-4 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs gap-1.5 shadow-md active:scale-95 transition-all"
          >
            <Send className="w-3.5 h-3.5 fill-current" />
            <span>{isTr ? 'Gönder' : 'Send'}</span>
          </Button>
        </div>

        {/* 4. Split Pane: Request Config & Response Viewer */}
        <div
          ref={splitRef}
          className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_6px_minmax(0,1fr)] gap-0"
          style={{ gridTemplateColumns: `${splitPercent}% 6px minmax(0, ${100 - splitPercent}%)` }}
        >
          {/* Left / Top: Request Editor */}
          <div className={`min-w-0 min-h-0 flex flex-col border rounded-lg overflow-hidden ${isDark ? 'border-secondary-800' : 'border-secondary-200'}`}>
            {/* Request Tabs Header */}
            <div className={`flex items-center justify-between border-b px-2 py-1.5 text-xs font-semibold ${
              isDark ? 'bg-secondary-900/80 border-secondary-800' : 'bg-secondary-100 border-secondary-200'
            }`}>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setActiveReqTab('headers')}
                  className={`px-2.5 py-1 rounded-md text-[11px] transition-colors ${
                    activeReqTab === 'headers'
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  Headers ({headers.split('\n').filter(Boolean).length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveReqTab('body')}
                  className={`px-2.5 py-1 rounded-md text-[11px] transition-colors ${
                    activeReqTab === 'body'
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  Body (Payload)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveReqTab('code')}
                  className={`px-2.5 py-1 rounded-md text-[11px] transition-colors ${
                    activeReqTab === 'code'
                      ? 'bg-sky-500 text-slate-950 font-bold shadow-sm'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  {isTr ? 'Kod Oluştur' : 'Code Snippet'}
                </button>
              </div>

              {activeReqTab === 'code' ? (
                <div className="flex items-center gap-2">
                  <div className={`flex rounded-md p-0.5 border text-[10px] ${isDark ? 'bg-secondary-950 border-secondary-800' : 'bg-white border-secondary-200'}`}>
                    <button
                      type="button"
                      onClick={() => setSnippetLanguage('curl')}
                      className={`px-1.5 py-0.5 rounded ${snippetLanguage === 'curl' ? 'bg-sky-500/20 text-sky-400 font-bold' : 'opacity-60'}`}
                    >
                      cURL
                    </button>
                    <button
                      type="button"
                      onClick={() => setSnippetLanguage('python')}
                      className={`px-1.5 py-0.5 rounded ${snippetLanguage === 'python' ? 'bg-sky-500/20 text-sky-400 font-bold' : 'opacity-60'}`}
                    >
                      Python
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopySnippet}
                    className="flex items-center gap-1 text-[10px] font-mono text-sky-400 hover:underline"
                  >
                    {copiedSnippet ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSnippet ? (isTr ? 'Kopyalandı' : 'Copied') : (isTr ? 'Kopyala' : 'Copy')}</span>
                  </button>
                </div>
              ) : activeReqTab === 'body' ? (
                <button
                  type="button"
                  onClick={() => {
                    try {
                      if (body.trim()) {
                        const parsed = JSON.parse(body);
                        setBody(JSON.stringify(parsed, null, 2));
                      }
                    } catch {
                      // ignore parse errors
                    }
                  }}
                  className="text-[10px] opacity-60 hover:opacity-100 font-mono"
                >
                  {isTr ? 'Biçimlendir' : 'Prettify'}
                </button>
              ) : null}
            </div>

            {/* Request Tabs Content */}
            <div className="flex-1 min-h-0 p-2.5 overflow-hidden flex flex-col">
              {activeReqTab === 'headers' ? (
                <textarea
                  value={headers}
                  onChange={(e) => setHeaders(e.target.value)}
                  placeholder="Content-Type: application/json&#10;x-auth-token: demo_token_123"
                  aria-label="HTTP Headers"
                  className={`w-full flex-1 min-h-0 text-xs font-mono bg-transparent outline-none resize-none leading-relaxed custom-scrollbar ${
                    isDark ? 'text-slate-200 placeholder-slate-600' : 'text-slate-800 placeholder-slate-400'
                  }`}
                />
              ) : activeReqTab === 'body' ? (
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={method === 'GET' ? (isTr ? '// GET istekleri için payload gerekmez' : '// Payload not needed for GET requests') : '{\n  "key": "value"\n}'}
                  aria-label="Request Body JSON Payload"
                  className={`w-full flex-1 min-h-0 text-xs font-mono bg-transparent outline-none resize-none leading-relaxed custom-scrollbar ${
                    isDark ? 'text-slate-200 placeholder-slate-600' : 'text-slate-800 placeholder-slate-400'
                  }`}
                />
              ) : (
                <pre className={`flex-1 min-h-0 p-1 overflow-y-auto overflow-x-auto custom-scrollbar text-xs font-mono select-text whitespace-pre-wrap leading-relaxed ${
                  snippetLanguage === 'curl' ? (isDark ? 'text-amber-300' : 'text-amber-700') : (isDark ? 'text-sky-300' : 'text-sky-700')
                }`}>
                  {snippetLanguage === 'curl' ? generateCurlSnippet() : generatePythonSnippet()}
                </pre>
              )}
            </div>
          </div>

          {/* Split Separator / Draggable Divider */}
          <div
            role="separator"
            aria-label={isTr ? 'İstek ve yanıt bölmesi genişliğini ayarla' : 'Resize request and response panes'}
            onPointerDown={startSplitResize}
            className="hidden md:block w-1.5 mx-1 rounded-full bg-secondary-700/40 hover:bg-emerald-500/70 cursor-col-resize transition-colors"
          />

          {/* Right / Bottom: Response Viewer */}
          <div className={`min-w-0 min-h-0 flex flex-col border rounded-lg overflow-hidden ${isDark ? 'border-secondary-800' : 'border-secondary-200'}`}>
            {/* Response Header */}
            <div className={`flex items-center justify-between px-3 py-1.5 border-b text-xs font-semibold ${
              isDark ? 'bg-secondary-900/80 border-secondary-800' : 'bg-secondary-100 border-secondary-200'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-1.5">
                  <FileJson className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isTr ? 'Sunucu Yanıtı' : 'Server Response'}</span>
                </div>

                {response && (
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                      response.status >= 200 && response.status < 300
                        ? isDark ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                        : isDark ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-rose-50 text-rose-700 border border-rose-300'
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
                <div className={`flex rounded-md p-0.5 border text-[10px] ${isDark ? 'bg-secondary-950 border-secondary-800' : 'bg-white border-secondary-200'}`}>
                  <button
                    type="button"
                    onClick={() => setActiveResTab('body')}
                    className={`px-2 py-0.5 rounded ${activeResTab === 'body' ? 'bg-emerald-500/20 text-emerald-400 font-bold' : 'opacity-60'}`}
                  >
                    Body
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveResTab('headers')}
                    className={`px-2 py-0.5 rounded ${activeResTab === 'headers' ? 'bg-emerald-500/20 text-emerald-400 font-bold' : 'opacity-60'}`}
                  >
                    Headers
                  </button>
                </div>

                {response && (
                  <button
                    type="button"
                    onClick={handleCopyJson}
                    className="flex items-center gap-1 text-[10px] opacity-80 hover:opacity-100 transition-opacity ml-1"
                  >
                    {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{isCopied ? (isTr ? 'Kopyalandı' : 'Copied') : (isTr ? 'Kopyala' : 'Copy')}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Response Content View */}
            <div className={`flex-1 p-3 font-mono text-xs overflow-auto custom-scrollbar leading-relaxed ${
              isDark ? 'bg-secondary-950 text-emerald-400' : 'bg-slate-50 text-emerald-700'
            }`}>
              {response ? (
                <pre className="whitespace-pre-wrap select-text">
                  {activeResTab === 'body'
                    ? JSON.stringify(response.data, null, 2)
                    : JSON.stringify(response.headers, null, 2)}
                </pre>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-4 gap-3 select-none">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${
                    isDark ? 'bg-secondary-900 border-secondary-800 text-emerald-400' : 'bg-white border-secondary-200 text-emerald-600'
                  }`}>
                    <Server className="w-5 h-5 opacity-70" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold opacity-80 mb-0.5">
                      {isTr ? 'Henüz İstek Gönderilmedi' : 'No Request Sent Yet'}
                    </h3>
                    <p className="text-[11px] opacity-50 max-w-[240px]">
                      {isTr
                        ? 'Yukarıdaki hazır hızlı butonlara tıklayarak doğrudan veri çekebilir veya "Gönder" butonunu kullanabilirsiniz.'
                        : 'Click any quick preset above or press "Send" to execute an API call.'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center mt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const tpl = ALL_TEMPLATES.find(t => t.id === 'device-list');
                        if (tpl) applyTemplate(tpl, true);
                      }}
                      className="text-[11px] h-7 gap-1 border-sky-500/30 text-sky-400 hover:bg-sky-500/10"
                    >
                      <Server className="w-3 h-3" />
                      {isTr ? 'Cihazları Listele' : 'List Devices'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const tpl = ALL_TEMPLATES.find(t => t.id === 'topology-graph');
                        if (tpl) applyTemplate(tpl, true);
                      }}
                      className="text-[11px] h-7 gap-1 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10"
                    >
                      <Network className="w-3 h-3" />
                      {isTr ? 'Topoloji Haritası' : 'Topology Map'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
