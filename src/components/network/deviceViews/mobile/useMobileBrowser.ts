import { useState, useMemo, useRef, useEffect } from 'react';
import type { CanvasDevice, CanvasConnection } from '../../NetworkTopology/types/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import { checkConnectivity } from '@/lib/network/connectivity/pathResolution';
import { isRouterDevice, generateRouterAdminPage } from '@/components/network/WifiControlPanel';
import { generatePrinterWebPanelContent } from '@/lib/network/printerWebPanel';
import { generateIotWebPanelContent, generateIotDevicePageContent } from '@/lib/network/iotWebPanel';
import { setRouterAuthenticated, setIotPanelAuthenticated } from '@/lib/network/adminSessionManager';

interface UseMobileBrowserProps {
  device: CanvasDevice;
  topologyDevices: CanvasDevice[];
  topologyConnections: CanvasConnection[];
  deviceStates: Map<string, SwitchState>;
  language: string;
  isTr: boolean;
}

export function useMobileBrowser({
  device,
  topologyDevices,
  topologyConnections,
  deviceStates,
  language,
  isTr,
}: UseMobileBrowserProps) {
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);
  const [browserUrl, setBrowserUrl] = useState(device.gateway || '192.168.1.1');
  const [browserContent, setBrowserContent] = useState<string>('');
  const [browserTitle, setBrowserTitle] = useState('Web Browser');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [browserWindow, setBrowserWindow] = useState({
    x: Math.max(20, typeof window !== 'undefined' ? Math.floor(window.innerWidth / 2 - 280) : 100),
    y: Math.max(20, typeof window !== 'undefined' ? Math.floor(window.innerHeight / 2 - 220) : 100),
    width: 560,
    height: 400,
  });

  const urlInputRef = useRef<HTMLInputElement | null>(null);
  const dragStateRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resizeStateRef = useRef<{ side: any; startX: number; startY: number; originX: number; originY: number; originW: number; originH: number } | null>(null);

  const suggestions = useMemo(() => {
    const list = [
      device.gateway || '192.168.1.1',
      '8.8.8.8',
      '1.1.1.1',
      'http://iot-panel',
    ];
    topologyDevices.forEach(d => {
      if (d.ip) list.push(`http://${d.ip}`);
    });
    return Array.from(new Set(list));
  }, [device.gateway, topologyDevices]);

  const handleNavigateBrowser = (targetUrl?: string) => {
    const rawUrl = (targetUrl || browserUrl || '192.168.1.1').trim();
    if (!rawUrl || rawUrl === '0.0.0.0') return;

    let displayUrl = rawUrl.startsWith('http://') || rawUrl.startsWith('https://') ? rawUrl : `http://${rawUrl}`;
    setBrowserUrl(displayUrl);

    let hostOrIp = displayUrl.replace(/^https?:\/\//i, '').split('/')[0].split(':')[0];

    if (rawUrl === 'http://iot-panel' || rawUrl === 'iot-panel') {
      const iotDevices = topologyDevices.filter(d => d.type === 'iot');
      const content = generateIotWebPanelContent(iotDevices, language, undefined, undefined, topologyConnections as unknown as { sourceDeviceId: string; targetDeviceId: string }[]);
      setBrowserContent(content);
      setBrowserTitle(isTr ? 'IoT Kontrol Paneli' : 'IoT Web Panel');
      return;
    }

    if (rawUrl.startsWith('iot://iot-device/')) {
      const targetDeviceId = rawUrl.split('iot://iot-device/')[1];
      const targetDevice = topologyDevices.find(d => d.id === targetDeviceId);
      if (targetDevice && targetDevice.type === 'iot') {
        const iotDevices = topologyDevices.filter(d => d.type === 'iot');
        const isActive = targetDevice.iot?.collaborationEnabled ?? true;
        const isPoweredOff = targetDevice.status === 'offline';
        const kind = targetDevice.iot?.kind || 'sensor';
        const rules = targetDevice.iot?.rules || [];
        const sensorType = targetDevice.iot?.sensorType || 'temperature';
        const dataFlowDirection = targetDevice.iot?.dataFlowDirection || (kind === 'sensor' ? 'input' : 'output');
        const iotDevicePage = generateIotDevicePageContent(targetDevice.id, targetDevice.name || targetDevice.id, language, isActive, isPoweredOff, kind, rules, sensorType, iotDevices, dataFlowDirection, topologyDevices);
        setBrowserTitle(`${targetDevice.name || targetDevice.id} ${isTr ? 'Cihaz Yönetimi' : 'Device Management'}`);
        setBrowserContent(iotDevicePage);
        return;
      }
    }

    let targetDev = topologyDevices.find(d => d.ip === hostOrIp || d.name?.toLowerCase() === hostOrIp.toLowerCase() || d.id === hostOrIp);

    if (!targetDev && (hostOrIp === 'gateway' || (device.gateway && hostOrIp === device.gateway))) {
      const gwIp = device.gateway || '192.168.1.1';
      targetDev = topologyDevices.find(d => d.ip === gwIp) || topologyDevices.find(d => d.type === 'router' || d.type === 'wlc' || d.type === 'firewall');
      if (targetDev) hostOrIp = targetDev.ip || gwIp;
    }

    const connRes = checkConnectivity(
      device.id,
      targetDev?.ip || hostOrIp,
      topologyDevices,
      topologyConnections,
      deviceStates,
      isTr ? 'tr' : 'en',
      { protocol: 'tcp', port: '80' }
    );

    if (!connRes.success) {
      setBrowserTitle(isTr ? 'Bağlantı Hatası' : 'Connection Error');
      setBrowserContent(`
        <main style="padding:32px;font-family:'Inria Sans',sans-serif;text-align:center;">
          <div style="font-size:48px;margin-bottom:12px;">🚫</div>
          <h1 style="margin:0 0 8px;font-size:22px;color:var(--color-danger-500);">${isTr ? 'Sunucuya Ulaşılamıyor' : 'Server Unreachable'}</h1>
          <p style="margin:0 0 12px;font-size:14px;color:var(--color-secondary-500);">${connRes.error || (isTr ? 'Ağ geçidi veya sunucu yanıt vermiyor.' : 'Gateway or server not responding.')}</p>
          <code style="display:inline-block;padding:6px 12px;border-radius:8px;background:var(--color-danger-100);color:var(--color-danger-800);font-size:12px;">${displayUrl}</code>
        </main>
      `);
      return;
    }

    const cloudDevice = topologyDevices.find(d => d.type === 'cloud');

    if (targetDev && (isRouterDevice(targetDev) || targetDev.type === 'router' || targetDev.type === 'wlc')) {
      const runtimeState = deviceStates.get(targetDev.id);
      const adminPage = generateRouterAdminPage(targetDev, language, runtimeState, [], []);
      setBrowserTitle(targetDev.name || 'Router Admin');
      setBrowserContent(adminPage);
    } else if (targetDev && targetDev.type === 'printer') {
      const printerPage = generatePrinterWebPanelContent(targetDev, language);
      setBrowserTitle(targetDev.name || 'Printer Web');
      setBrowserContent(printerPage);
    } else if (hostOrIp === '8.8.8.8' || hostOrIp === '8.8.4.4' || hostOrIp === '1.1.1.1' || targetDev?.type === 'cloud') {
      if (!cloudDevice) {
        setBrowserTitle(isTr ? 'Cihaz Bulunamadı' : 'Device Not Found');
        setBrowserContent(`
          <main style="padding:32px;font-family:'Inria Sans',sans-serif;text-align:center;">
            <div style="font-size:48px;margin-bottom:12px;">🌐 ⚡</div>
            <h1 style="margin:0 0 8px;font-size:22px;color:var(--color-danger-500);">${isTr ? 'Bulut (WAN) Cihazı Bulunamadı' : 'Cloud (WAN) Device Not Found'}</h1>
            <p style="margin:0 0 12px;font-size:14px;color:var(--color-secondary-500);">${isTr ? 'Ağda bağlı bir Bulut (Cloud/WAN) cihazı bulunmuyor!' : 'No Cloud (WAN) device exists on the network!'}</p>
            <code style="display:inline-block;padding:6px 12px;border-radius:8px;background:var(--color-danger-100);color:var(--color-danger-800);font-size:12px;">${displayUrl}</code>
          </main>
        `);
        return;
      }
      if (cloudDevice.status === 'offline') {
        setBrowserTitle(isTr ? 'Bulut Kapalı' : 'Cloud Offline');
        setBrowserContent(`
          <main style="padding:32px;font-family:'Inria Sans',sans-serif;text-align:center;">
            <div style="font-size:48px;margin-bottom:12px;">☁️ ⚡</div>
            <h1 style="margin:0 0 8px;font-size:22px;color:var(--color-danger-500);">${isTr ? 'Bulut Hizmeti Kapalı' : 'Cloud Service Offline'}</h1>
            <p style="margin:0 0 12px;font-size:14px;color:var(--color-secondary-500);">${isTr ? 'Hedef Bulut (WAN) cihazının gücü kapalı (Power Off) durumda!' : 'Target Cloud (WAN) device is powered off!'}</p>
            <code style="display:inline-block;padding:6px 12px;border-radius:8px;background:var(--color-danger-100);color:var(--color-danger-800);font-size:12px;">${displayUrl}</code>
          </main>
        `);
        return;
      }
      setBrowserTitle(isTr ? 'Genel Arama Kapısı - WAN' : 'Public Search Portal - WAN');
      setBrowserContent(`
        <main style="padding:32px;font-family:'Inria Sans',sans-serif;text-align:center;">
          <div style="font-size:36px;font-weight:bold;color:var(--color-primary-500);margin-bottom:8px;">🌐  ${isTr ? 'Arama Kapısı' : 'Web Portal'}</div>
          <p style="font-size:14px;color:var(--color-secondary-500);margin-bottom:20px;">${isTr ? 'Genel WAN İnternet Geçidi (8.8.8.8)' : 'Public WAN Internet Gateway (8.8.8.8)'}</p>
          <div style="border:1px solid var(--color-secondary-300);border-radius:24px;padding:10px 20px;max-width:320px;margin:0 auto 20px;font-size:13px;color:var(--color-secondary-700);">🔍 ${isTr ? 'Arama yapın veya URL girin' : 'Search or type URL'}</div>
          <div style="background:var(--color-secondary-100);padding:16px;border-radius:12px;font-size:12px;color:var(--color-secondary-800);text-align:left;max-width:400px;margin:0 auto;">
            <strong style="color:var(--color-secondary-900);">${isTr ? 'İnternet Bağlantısı Aktif' : 'Internet Connection Active'}</strong><br/>
            ${isTr ? 'WAN Köprüsü ve Genel DNS Sunucusu başarıyla yanıt verdi.' : 'WAN Transit Bridge and Public DNS Server responded successfully.'}
          </div>
        </main>
      `);
    } else if (targetDev && (targetDev.services?.http?.enabled || targetDev.ip)) {
      const pageContent = targetDev.services?.http?.content || `
        <main style="padding:32px;font-family:'Inria Sans',sans-serif;text-align:center;">
          <h2 style="font-size:24px;color:var(--color-success-500);margin-bottom:8px;">Welcome to ${targetDev.name || targetDev.id}</h2>
          <p style="font-size:14px;color:var(--color-secondary-700);">HTTP Web Server is online and active.</p>
        </main>
      `;
      setBrowserTitle(`${targetDev.name || targetDev.id} Web`);
      setBrowserContent(pageContent);
    } else {
      setBrowserTitle('404 Not Found');
      setBrowserContent(`
        <main style="padding:32px;font-family:'Inria Sans',sans-serif;text-align:center;">
          <h1 style="font-size:40px;margin:0 0 8px;">404</h1>
          <p style="font-size:14px;color:var(--color-secondary-500);margin:0 0 12px;">${isTr ? 'Web Sayfası Bulunamadı' : 'Web Page Not Found'}</p>
          <code style="display:inline-block;padding:6px 12px;border-radius:8px;background:var(--color-secondary-100);color:var(--color-secondary-900);font-size:12px;">${displayUrl}</code>
        </main>
      `);
    }
  };

  useEffect(() => {
    const handleMobilePanelMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin && event.origin !== 'null') return;
      const data = event.data;
      if (!data) return;

      if (data.type === 'router-admin-auth-success') {
        if (data.deviceId) setRouterAuthenticated(data.deviceId, true);
      } else if (data.type === 'router-admin-logout') {
        if (data.deviceId) setRouterAuthenticated(data.deviceId, false);
      } else if (data.type === 'iot-panel-auth-success') {
        setIotPanelAuthenticated(true);
      } else if (data.type === 'iot-panel-logout') {
        setIotPanelAuthenticated(false);
      } else if (data.type === 'open-iot-device' && data.deviceId) {
        handleNavigateBrowser(`iot://iot-device/${data.deviceId}`);
      } else if (data.type === 'back-to-iot-list') {
        handleNavigateBrowser('http://iot-panel');
      }
    };

    window.addEventListener('message', handleMobilePanelMessage);
    return () => window.removeEventListener('message', handleMobilePanelMessage);
  }, [topologyDevices, language, isTr]);

  const handleOpenBrowserWindow = (targetUrl?: string) => {
    const defaultUrl = (device.gateway && device.gateway !== '0.0.0.0') ? device.gateway : '192.168.1.1';
    const target = targetUrl || (browserUrl && browserUrl !== '0.0.0.0' ? browserUrl : defaultUrl);
    handleNavigateBrowser(target);
    setIsBrowserOpen(true);
  };

  return {
    isBrowserOpen,
    setIsBrowserOpen,
    browserUrl,
    setBrowserUrl,
    browserContent,
    browserTitle,
    showSuggestions,
    setShowSuggestions,
    selectedSuggestionIndex,
    setSelectedSuggestionIndex,
    browserWindow,
    setBrowserWindow,
    urlInputRef,
    dragStateRef,
    resizeStateRef,
    suggestions,
    handleNavigateBrowser,
    handleOpenBrowserWindow,
  };
}
