'use client';

import { useCallback } from 'react';
import type { CanvasDevice, CanvasConnection } from '../networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import type { OutputLine } from './PCPanel.types';
import { checkConnectivity } from '@/lib/network/connectivity';
import { isRouterDevice, generateRouterAdminPage } from '@/components/network/WifiControlPanel';
import { generateIotWebPanelContent, generateIotDevicePageContent } from '@/lib/network/iotWebPanel';

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
  t: Record<string, string>;
}

export function usePCPanelBrowser({
  language,
  deviceId,
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
  t,
}: UsePCPanelBrowserOptions) {

  const openWebPage = useCallback((rawTarget?: string, rawUrl?: string) => {
    const rawInput = (rawTarget || '').trim();
    const normalizedInput = rawInput || '192.168.1.10';
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
    } catch (_err) {
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

    // Check firewall for HTTP traffic
    const connectivityResult = checkConnectivity(deviceId, resolvedTargetIp, topologyDevices, topologyConnections as unknown as CanvasConnection[], deviceStates || new Map(), language as 'tr' | 'en', { protocol: 'tcp', port: '80' });
    if (!connectivityResult.success && connectivityResult.error?.includes('firewall')) {
      setHttpAppDeviceId(null);
      setHttpAppTitle('Access Denied');
      setHttpAppContent(`
        <main style="padding:32px;font-family:system-ui,-apple-system,Segoe UI,sans-serif;text-align:center;">
          <div style="font-size:64px;margin-bottom:16px;">🛡️</div>
          <h1 style="margin:0 0 8px;font-size:24px;color:var(--color-error-500);">${language === 'tr' ? 'Erişim Engellendi' : 'Access Denied'}</h1>
          <p style="margin:0 0 12px;font-size:16px;color:var(--color-muted-foreground);">${connectivityResult.error}</p>
          <code style="display:inline-block;padding:6px 10px;border-radius:8px;background:var(--color-error-100);color:var(--color-error-800);font-size:13px;">${displayUrl}</code>
        </main>
      `);
      addLocalOutput('error', connectivityResult.error);
      return;
    }

    const httpServer = findHttpServerByTargetCallback(resolvedTargetIp);
    setHttpAppUrl(displayUrl);

    if (!httpServer) {
      setHttpAppDeviceId(null);
      setHttpAppTitle('404 Not Found');
      setHttpAppContent(`
        <main style="padding:32px;font-family:system-ui,-apple-system,Segoe UI,sans-serif;">
          <h1 style="margin:0 0 8px;font-size:28px;">404</h1>
          <p style="margin:0 0 12px;font-size:16px;">${language === 'tr' ? 'Sayfa bulunamadı' : 'Page not found'}</p>
          <code style="display:inline-block;padding:6px 10px;border-radius:8px;background:var(--color-secondary-100);color:var(--color-secondary-900);">${displayUrl}</code>
        </main>
      `);
      addLocalOutput('error', `404 Not Found: ${target}`);
    } else if (isRouterDevice(httpServer)) {
      const runtimeState = deviceStates?.get(httpServer.id);
      const connectedIot = getConnectedIotDevices(httpServer.id);
      const availableIot = getAvailableIotDevices(httpServer.id);
      const adminPage = generateRouterAdminPage(httpServer, language, runtimeState, connectedIot, availableIot);
      setHttpAppDeviceId(httpServer.id);
      setHttpAppContent(adminPage);
      setHttpAppTitle(language === 'tr' ? 'Yönlendirici Yönetimi' : 'Router Management');
      addLocalOutput('success', language === 'tr'
        ? 'HTTP sayfası yeni pencerede açıldı.'
        : 'HTTP page opened in a new window.');
    } else {
      setHttpAppDeviceId(null);
      addLocalOutput('html', httpServer.services?.http?.content || t.helloWorld);
    }
  }, [addLocalOutput, deviceStates, findHttpServerByTargetCallback, getAvailableIotDevices, getConnectedIotDevices, hasGatewayForTargetCallback, isLoopbackTarget, isValidIpv4, isValidIpv6, language, normalizeLookupTargetCallback, pcDNS, resolveDeviceNameTargetCallback, t, iotDevices, topologyDevices, generateIotWebPanelContent, generateIotDevicePageContent, httpAppDeviceId, topologyConnections, pcIPv6]);

  return { openWebPage };
}
