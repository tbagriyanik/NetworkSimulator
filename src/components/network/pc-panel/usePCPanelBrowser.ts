'use client';

import { useCallback } from 'react';
import type { CanvasDevice, CanvasConnection } from '../NetworkTopology/types/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import type { OutputLine } from './PCPanel.types';
import { checkConnectivity } from '@/lib/network/connectivity';
import { dispatchCapturedPackets } from '../../../utils/packetCapture';
import { isRouterDevice, generateRouterAdminPage } from '@/components/network/WifiControlPanel';
import { generateIotWebPanelContent, generateIotDevicePageContent } from '@/lib/network/iotWebPanel';
import { generatePrinterWebPanelContent } from '@/lib/network/printerWebPanel';
import { loadFs, readFile } from './pcFileSystem';

interface ConnectedIoTDevice {
  id: string;
  name: string;
  sensorType: 'temperature' | 'sound' | 'motion' | 'humidity' | 'light';
  connected: boolean;
  ip: string;
  isWired: boolean;
}

interface AvailableIoTDevice {
  id: string;
  name: string;
  sensorType: 'temperature' | 'sound' | 'motion' | 'humidity' | 'light';
  currentSsid: string | undefined;
}

interface UsePCPanelBrowserOptions {
  language: string;
  deviceId: string;
  pcHostname?: string;
  pcDNS: string;
  pcIPv6: string;
  topologyDevices: CanvasDevice[];
  topologyConnections: { sourceDeviceId: string; sourcePort: string; targetDeviceId: string; targetPort: string; cableType?: string; active?: boolean }[];
  deviceStates: Map<string, SwitchState> | undefined;
  iotDevices: CanvasDevice[];
  httpAppDeviceId: string | null;
  setHttpAppUrl: (v: string) => void;
  setHttpAppContent: (v: string | null) => void;
  setHttpAppTitle: (v: string) => void;
  setHttpAppDeviceId: (v: string | null) => void;
  addLocalOutput: (type: OutputLine['type'], content: string) => void;
  normalizeLookupTargetCallback: (target: string) => string;
  resolveDeviceNameTargetCallback: (target: string) => { ip: string; name?: string } | null;
  hasGatewayForTargetCallback: (targetIp: string) => boolean;
  isLoopbackTarget: (target: string) => boolean;
  isValidIpv4: (value: string) => boolean;
  isValidIpv6: (value: string) => boolean;
  findHttpServerByTargetCallback: (targetIp: string) => CanvasDevice | null;
  getConnectedIotDevices: (routerId: string) => ConnectedIoTDevice[];
  getAvailableIotDevices: (routerId: string) => AvailableIoTDevice[];
  addPcArpEntry?: (targetIp: string, targetMac: string, isIot?: boolean) => void;
  t: Record<string, string>;
}

export function usePCPanelBrowser({
  language,
  deviceId,
  pcHostname,
  pcDNS,
  pcIPv6,
  topologyDevices,
  topologyConnections,
  deviceStates,
  iotDevices,
  httpAppDeviceId,
  setHttpAppUrl,
  setHttpAppContent,
  setHttpAppTitle,
  setHttpAppDeviceId,
  addLocalOutput,
  normalizeLookupTargetCallback,
  resolveDeviceNameTargetCallback,
  hasGatewayForTargetCallback,
  isLoopbackTarget,
  isValidIpv4,
  isValidIpv6,
  findHttpServerByTargetCallback,
  getConnectedIotDevices,
  getAvailableIotDevices,
  addPcArpEntry,
  t,
}: UsePCPanelBrowserOptions) {

  const openWebPage = useCallback((rawTarget?: string, rawUrl?: string) => {
    const rawInput = (rawTarget || '').trim();
    const currentDevice = topologyDevices.find(d => d.id === deviceId);
    const defaultHostname = pcHostname || currentDevice?.name || currentDevice?.id || deviceId;
    const isAboutHome = !rawInput || rawInput === 'about:home' || rawInput === 'http://about:home';
    const normalizedInput = isAboutHome ? defaultHostname : rawInput;
    let lookupTarget = normalizeLookupTargetCallback(normalizedInput);
    let displayUrl = normalizedInput.startsWith('http://') || normalizedInput.startsWith('https://')
      ? normalizedInput
      : `http://${normalizedInput}`;
    if (rawUrl && rawUrl.trim().length > 0) {
      const candidate = rawUrl.trim();
      displayUrl = candidate.startsWith('http://') || candidate.startsWith('https://') ? candidate : `http://${candidate}`;
      lookupTarget = normalizeLookupTargetCallback(candidate);
    }

    // Handle special IoT Web Panel URL
    if (rawTarget === 'http://iot-panel' || rawTarget === 'iot-panel') {
      setHttpAppUrl(displayUrl);
      setHttpAppContent(generateIotWebPanelContent(iotDevices, language, undefined, undefined, topologyConnections as unknown as { sourceDeviceId: string; targetDeviceId: string }[]));
      setHttpAppTitle(t.iotWebPanel);
      setHttpAppDeviceId(null);
      return;
    }

    // Handle special IoT Device URL
    if (rawTarget?.startsWith('iot://iot-device/')) {
      const targetDeviceId = rawTarget.split('iot://iot-device/')[1];
      const targetDevice = topologyDevices.find(d => d.id === targetDeviceId);
      if (targetDevice && targetDevice.type === 'iot') {
        const isActive = targetDevice.iot?.collaborationEnabled ?? true;
        const isPoweredOff = targetDevice.status === 'offline';
        const kind = targetDevice.iot?.kind || 'sensor';
        const rules = targetDevice.iot?.rules || [];
        const sensorType = targetDevice.iot?.sensorType || 'temperature';
        const dataFlowDirection = targetDevice.iot?.dataFlowDirection || (kind === 'sensor' ? 'input' : 'output');
        const iotDevicePage = generateIotDevicePageContent(targetDevice.id, targetDevice.name || targetDevice.id, language, isActive, isPoweredOff, kind, rules, sensorType, iotDevices, dataFlowDirection, topologyDevices);
        setHttpAppUrl(displayUrl);
        setHttpAppContent(iotDevicePage);
        setHttpAppTitle(`${targetDevice.name || targetDevice.id} ${t.deviceManagement}`);
        setHttpAppDeviceId(targetDevice.id);
      }
      return;
    }

    // Browser-style inputs can include protocol/path/query. We only resolve host/IP.
    try {
      const parsed = new URL(displayUrl);
      lookupTarget = parsed.hostname || lookupTarget;
      displayUrl = parsed.toString();
    } catch {
      // URL parsing failed - using raw input as fallback
    }

    // Strip brackets from IPv6 hostnames if present (e.g. [2001:db8::1] -> 2001:db8::1)
    if (lookupTarget.startsWith('[') && lookupTarget.endsWith(']')) {
      lookupTarget = lookupTarget.slice(1, -1);
    }

    const target = lookupTarget.trim() || '192.168.1.10';
    const namedTarget = resolveDeviceNameTargetCallback(target);
    const resolvedTargetIp = namedTarget?.ip || target;

    const isIpV6 = isValidIpv6(resolvedTargetIp);
    if (!isIpV6 && !isValidIpv4(resolvedTargetIp)) {
      // Domain lookup
      if (!isValidIpv4(pcDNS) && !isValidIpv6(pcDNS)) {
        addLocalOutput('error', t.dnsAddressRequired);
        return;
      }
      if (isValidIpv4(pcDNS) && !hasGatewayForTargetCallback(pcDNS)) {
        addLocalOutput('error', t.dnsGatewayRequired);
        return;
      }
    } else if (isValidIpv4(resolvedTargetIp)) {
      if (!isLoopbackTarget(resolvedTargetIp) && !hasGatewayForTargetCallback(resolvedTargetIp)) {
        addLocalOutput('error', t.targetGatewayRequired);
        return;
      }
    } else if (isIpV6) {
      if (!pcIPv6) {
        addLocalOutput('error', language === 'tr' ? 'PC\'de IPv6 adresi yapılandırılmamış.' : 'IPv6 address is not configured on this PC.');
        return;
      }
    }

    const isSelfTarget = isLoopbackTarget(target) || isLoopbackTarget(resolvedTargetIp);
    const connectivityResult = isSelfTarget
      ? { success: true, targetId: deviceId, capturedPackets: [], error: undefined }
      : checkConnectivity(deviceId, resolvedTargetIp, topologyDevices, topologyConnections as unknown as CanvasConnection[], deviceStates || new Map(), language as 'tr' | 'en', { protocol: 'tcp', port: '80' });

    const httpPackets = (connectivityResult.capturedPackets || []).map(p => ({
      ...p,
      protocol: 'HTTP',
      info: `HTTP GET http://${displayUrl} (HTTP/1.1 200 OK)`
    }));
    dispatchCapturedPackets(httpPackets.length > 0 ? httpPackets : connectivityResult.capturedPackets);
    if (!connectivityResult.success && connectivityResult.error?.includes('firewall')) {
      setHttpAppDeviceId(null);
      setHttpAppTitle('Access Denied');
      setHttpAppContent(`
        <main style="padding:32px;font-family:'Inria Sans',sans-serif;text-align:center;">
          <div style="font-size:64px;margin-bottom:16px;">🛡️</div>
          <h1 style="margin:0 0 8px;font-size:24px;color:var(--color-error-500);">${language === 'tr' ? 'Erişim Engellendi' : 'Access Denied'}</h1>
          <p style="margin:0 0 12px;font-size:16px;color:var(--color-muted-foreground);">${connectivityResult.error}</p>
          <code style="display:inline-block;padding:6px 10px;border-radius:8px;background:var(--color-error-100);color:var(--color-error-800);font-size:13px;">${displayUrl}</code>
        </main>
      `);
      addLocalOutput('error', connectivityResult.error);
      return;
    }

    // ARP güncelle: curl/wget ile HTTP bağlantısı da ARP tablosunu günceller
    if (connectivityResult.success && connectivityResult.targetId) {
      const httpTarget = topologyDevices.find(d => d.id === connectivityResult.targetId)
        || topologyDevices.find(d => d.ip === resolvedTargetIp);
      if (httpTarget?.macAddress) {
        addPcArpEntry?.(resolvedTargetIp, httpTarget.macAddress, httpTarget.type === 'iot');
      }
    }

    const httpServer = findHttpServerByTargetCallback(resolvedTargetIp);
    const cloudTarget = topologyDevices.find(d => d.type === 'cloud');
    setHttpAppUrl(displayUrl);

    if (!connectivityResult.success) {
      setHttpAppDeviceId(null);
      setHttpAppTitle('Connection Error');
      setHttpAppContent(`
        <main style="padding:32px;font-family:'Inria Sans',sans-serif;text-align:center;">
          <div style="font-size:48px;margin-bottom:12px;">🚫</div>
          <h1 style="margin:0 0 8px;font-size:22px;color:var(--color-error-500);">${language === 'tr' ? 'Sunucuya Ulaşılamıyor' : 'Server Unreachable'}</h1>
          <p style="margin:0 0 12px;font-size:14px;color:var(--color-muted-foreground);">${connectivityResult.error || (language === 'tr' ? 'Ağ geçidi veya sunucu yanıt vermiyor.' : 'Gateway or server not responding.')}</p>
          <code style="display:inline-block;padding:6px 10px;border-radius:8px;background:var(--color-error-100);color:var(--color-error-800);font-size:12px;">${displayUrl}</code>
        </main>
      `);
      addLocalOutput('error', connectivityResult.error || (language === 'tr' ? 'Sunucuya ulaşılamıyor.' : 'Server unreachable.'));
      return;
    }

    if (resolvedTargetIp === '1.1.1.1' || resolvedTargetIp === '1.0.0.1' || resolvedTargetIp === '8.8.8.8' || resolvedTargetIp === '8.8.4.4' || (cloudTarget && !httpServer)) {
      if (!cloudTarget) {
        setHttpAppDeviceId(null);
        setHttpAppTitle('404 Not Found');
        setHttpAppContent(`
          <main style="padding:32px;font-family:'Inria Sans',sans-serif;text-align:center;">
            <div style="font-size:48px;margin-bottom:12px;">🌐 ⚡</div>
            <h1 style="margin:0 0 8px;font-size:22px;color:var(--color-error-500);">${language === 'tr' ? 'Bulut (WAN) Cihazı Bulunamadı' : 'Cloud (WAN) Device Not Found'}</h1>
            <p style="margin:0 0 12px;font-size:14px;color:var(--color-muted-foreground);">${language === 'tr' ? 'Ağda bağlı bir Bulut (Cloud/WAN) cihazı bulunmuyor!' : 'No Cloud (WAN) device exists on the network!'}</p>
            <code style="display:inline-block;padding:6px 10px;border-radius:8px;background:var(--color-error-100);color:var(--color-error-800);font-size:12px;">${displayUrl}</code>
          </main>
        `);
        addLocalOutput('error', language === 'tr' ? 'Bulut (Cloud) cihazı ağda mevcut değil.' : 'Cloud device not found on network.');
        return;
      }
      const isCloudConnected = cloudTarget && topologyConnections.some(
        c => (c.sourceDeviceId === cloudTarget.id || c.targetDeviceId === cloudTarget.id) && c.active !== false
      );
      if (cloudTarget && !isCloudConnected) {
        setHttpAppDeviceId(null);
        setHttpAppTitle(language === 'tr' ? 'Bulut Bağlantısız' : 'Cloud Disconnected');
        setHttpAppContent(`
          <main style="padding:32px;font-family:'Inria Sans',sans-serif;text-align:center;">
            <div style="font-size:64px;margin-bottom:16px;">☁️ 🔌</div>
            <h1 style="margin:0 0 8px;font-size:24px;color:var(--color-error-500);">${language === 'tr' ? 'Bulut Cihazı Bağlı Değil' : 'Cloud Device Not Connected'}</h1>
            <p style="margin:0 0 12px;font-size:16px;color:var(--color-muted-foreground);">${language === 'tr' ? 'Topolojideki Bulut (Cloud/WAN) cihazına bağlı bir kablo bulunmuyor!' : 'The Cloud (WAN) device on the topology is not connected with any cable!'}</p>
            <code style="display:inline-block;padding:6px 10px;border-radius:8px;background:var(--color-error-100);color:var(--color-error-800);font-size:13px;">${displayUrl}</code>
          </main>
        `);
        addLocalOutput('error', language === 'tr' ? 'Bulut (Cloud) cihazı ağa bağlı değil.' : 'Cloud device is not connected to the network.');
        return;
      }
      if (cloudTarget && cloudTarget.status === 'offline') {
        setHttpAppDeviceId(null);
        setHttpAppTitle(language === 'tr' ? 'Bulut Kapalı' : 'Cloud Offline');
        setHttpAppContent(`
          <main style="padding:32px;font-family:'Inria Sans',sans-serif;text-align:center;">
            <div style="font-size:64px;margin-bottom:16px;">☁️ ⚡</div>
            <h1 style="margin:0 0 8px;font-size:24px;color:var(--color-error-500);">${language === 'tr' ? 'Bulut Hizmeti Kapalı' : 'Cloud Service Offline'}</h1>
            <p style="margin:0 0 12px;font-size:16px;color:var(--color-muted-foreground);">${language === 'tr' ? 'Hedef Bulut (WAN) cihazının gücü kapalı (Power Off) durumda!' : 'Target Cloud (WAN) device is powered off!'}</p>
            <code style="display:inline-block;padding:6px 10px;border-radius:8px;background:var(--color-error-100);color:var(--color-error-800);font-size:13px;">${displayUrl}</code>
          </main>
        `);
        addLocalOutput('error', language === 'tr' ? 'Bulut cihazı kapalı.' : 'Cloud device is powered off.');
        return;
      }
      setHttpAppDeviceId(cloudTarget?.id || null);
      setHttpAppTitle(language === 'tr' ? 'Genel Arama Kapısı - WAN' : 'Public Search Portal - WAN');
      setHttpAppContent(`
        <main style="padding:32px;font-family:'Inria Sans',sans-serif;text-align:center;">
          <div style="font-size:36px;font-weight:bold;color:var(--color-primary-500);margin-bottom:8px;">🌐  ${language === 'tr' ? 'Arama Kapısı' : 'Web Portal'}</div>
          <p style="font-size:14px;color:var(--color-secondary-500);margin-bottom:20px;">${language === 'tr' ? 'Genel WAN İnternet Geçidi (1.1.1.1)' : 'Public WAN Internet Gateway (1.1.1.1)'}</p>
          <div style="border:1px solid var(--color-secondary-300);border-radius:24px;padding:10px 20px;max-width:320px;margin:0 auto 20px;font-size:13px;color:var(--color-secondary-700);">🔍 ${language === 'tr' ? 'Arama yapın veya URL girin' : 'Search or type URL'}</div>
          <div style="background:var(--color-secondary-100);padding:16px;border-radius:12px;font-size:12px;color:var(--color-secondary-800);text-align:left;max-width:400px;margin:0 auto;">
            <strong style="color:var(--color-secondary-900);">${language === 'tr' ? 'İnternet Bağlantısı Aktif' : 'Internet Connection Active'}</strong><br/>
            ${language === 'tr' ? 'WAN Köprüsü ve Genel DNS Sunucusu başarıyla yanıt verdi.' : 'WAN Transit Bridge and Public DNS Server responded successfully.'}
          </div>
        </main>
      `);
      addLocalOutput('success', language === 'tr' ? 'Genel WAN Web Kapısı açıldı.' : 'Public WAN Web Portal opened.');
    } else if (!httpServer) {
      setHttpAppDeviceId(null);
      setHttpAppTitle('404 Not Found');
      setHttpAppContent(`
        <main style="padding:32px;font-family:'Inria Sans',sans-serif;">
          <h1 style="margin:0 0 8px;font-size:28px;">404</h1>
          <p style="margin:0 0 12px;font-size:16px;">${language === 'tr' ? 'Sayfa bulunamadı' : 'Page not found'}</p>
          <code style="display:inline-block;padding:6px 10px;border-radius:8px;background:var(--color-secondary-100);color:var(--color-secondary-900);">${displayUrl}</code>
        </main>
      `);
      addLocalOutput('error', `404 Not Found: ${target}`);
    } else if (httpServer.type === 'printer') {
      const printerPage = generatePrinterWebPanelContent(httpServer, language);
      setHttpAppDeviceId(httpServer.id);
      setHttpAppContent(printerPage);
      setHttpAppTitle(`${httpServer.name || httpServer.id} - ${language === 'tr' ? 'Yazıcı Yönetimi' : 'Printer Management'}`);
      addLocalOutput('success', language === 'tr'
        ? 'Yazıcı web paneli açıldı.'
        : 'Printer web panel opened.');
    } else if (isRouterDevice(httpServer)) {
      const runtimeState = deviceStates?.get(httpServer.id);
      const connectedIot = getConnectedIotDevices(httpServer.id);
      const availableIot = getAvailableIotDevices(httpServer.id);
      const adminPage = generateRouterAdminPage(httpServer, language, runtimeState, connectedIot, availableIot);
      const isWlc = httpServer.type === 'wlc' || runtimeState?.deviceType === 'wlc';
      setHttpAppDeviceId(httpServer.id);
      setHttpAppContent(adminPage);
      setHttpAppTitle(isWlc
        ? (language === 'tr' ? 'Kablosuz Denetleyici Yönetimi' : 'Wireless Controller Management')
        : (language === 'tr' ? 'Yönlendirici Yönetimi' : 'Router Management'));
      addLocalOutput('success', language === 'tr'
        ? 'HTTP sayfası yeni pencerede açıldı.'
        : 'HTTP page opened in a new window.');
    } else {
      setHttpAppDeviceId(httpServer.id);
      const serverFs = loadFs(httpServer.id);
      const indexHtml = readFile(serverFs, 'C:\\www\\index.html') || readFile(serverFs, 'www/index.html');
      const pageContent = indexHtml || httpServer.services?.http?.content || t.helloWorld;
      setHttpAppContent(pageContent);
      setHttpAppTitle(`${httpServer.name || httpServer.id} Web Page`);
      addLocalOutput('html', pageContent);
    }
  }, [addLocalOutput, deviceStates, findHttpServerByTargetCallback, getAvailableIotDevices, getConnectedIotDevices, hasGatewayForTargetCallback, isLoopbackTarget, isValidIpv4, isValidIpv6, language, normalizeLookupTargetCallback, pcDNS, pcHostname, deviceId, resolveDeviceNameTargetCallback, t, iotDevices, topologyDevices, generateIotWebPanelContent, generateIotDevicePageContent, httpAppDeviceId, topologyConnections, pcIPv6, addPcArpEntry]);

  return { openWebPage };
}

