'use client';

import React, { useCallback, useEffect } from 'react';
import type { CanvasDevice } from '../NetworkTopology/types/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import type { DhcpPoolConfig } from './PCPanel.types';
import { ensureDeviceStatesMap } from '@/lib/network/networkUtils';
import { generateRandomLinkLocalIpv4 } from '@/lib/network/linkLocal';
import { errorHandler, DHCP_ERRORS } from '@/lib/errors/errorHandler';
import { dispatchCapturedPackets } from '../../../utils/packetCapture';

interface UsePCPanelDhcpOptions {
  language: string;
  deviceId: string;
  topologyDevices: CanvasDevice[];
  topologyConnections: { sourceDeviceId: string; sourcePort: string; targetDeviceId: string; targetPort: string; cableType?: string; active?: boolean }[];
  deviceStates: Map<string, SwitchState> | undefined;
  ipConfigMode: string;
  pcIP: string;
  pcIpRef: React.RefObject<string | undefined>;
  pcSubnetRef: React.RefObject<string | undefined>;
  pcGatewayRef: React.RefObject<string | undefined>;
  pcDNSRef: React.RefObject<string | undefined>;
  setPcIP: (v: string) => void;
  setPcSubnet: (v: string) => void;
  setPcGateway: (v: string) => void;
  setPcDNS: (v: string) => void;
  validateIP: (ip: string) => boolean;
  hasPhysicalPathToDevice: (targetId: string) => boolean;
  canReachTargetIp: (targetIp: string) => boolean;
  isDhcpPoolCompatibleForClientCallback: (
    poolGateway: string,
    poolStartIp: string,
    poolSubnetMask: string,
    serverDevice: CanvasDevice | undefined,
    serverState?: SwitchState
  ) => boolean;
  checkDhcpAvailabilityRef: React.RefObject<(() => { available: boolean; reason: string }) | null>;
  applyDhcpLeaseRef: React.RefObject<((force?: boolean) => { ip: string; subnetMask: string; gateway: string; dns: string; serverName: string; poolName: string } | null) | null>;
  manualDhcpClickRef: React.RefObject<boolean>;
  prevIpConfigModeRef: React.RefObject<string>;
  addLocalOutput: (type: 'error' | 'html' | 'output' | 'command' | 'success' | 'prompt', content: string, prompt?: string) => void;
  toast: (opts: { title: string; description?: string; variant?: 'default' | 'destructive' | null; duration?: number }) => void;
  t: Record<string, string>;
}

export function usePCPanelDhcp({
  language,
  deviceId,
  topologyDevices,
  topologyConnections,
  deviceStates,
  ipConfigMode,
  pcIP,
  pcIpRef,
  pcSubnetRef,
  pcGatewayRef,
  pcDNSRef,
  setPcIP,
  setPcSubnet,
  setPcGateway,
  setPcDNS,
  validateIP,
  hasPhysicalPathToDevice,
  canReachTargetIp,
  isDhcpPoolCompatibleForClientCallback,
  checkDhcpAvailabilityRef,
  applyDhcpLeaseRef,
  manualDhcpClickRef,
  prevIpConfigModeRef,
  addLocalOutput,
  toast,
  t,
}: UsePCPanelDhcpOptions) {

  const ipToNumber = useCallback((ip: string) => {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return null;
    return (((parts[0] * 256 + parts[1]) * 256 + parts[2]) * 256 + parts[3]) >>> 0;
  }, []);

  const numberToIp = useCallback((num: number) => {
    const a = (num >>> 24) & 255;
    const b = (num >>> 16) & 255;
    const c = (num >>> 8) & 255;
    const d = num & 255;
    return `${a}.${b}.${c}.${d}`;
  }, []);

  const getDhcpLease = useCallback((): { ip: string; subnetMask: string; gateway: string; dns: string; serverName: string; serverIp: string; poolName: string } | null => {
    try {
      const usedIps = new Set(
        topologyDevices
          .filter((d) => d.id !== deviceId && validateIP(d.ip || ''))
          .map((d) => d.ip)
      );

      // 1. Check PC DHCP servers from topology
      const pcServers = topologyDevices.filter(
        (d) =>
          d.id !== deviceId &&
          d.services?.dhcp?.enabled &&
          (d.services?.dhcp?.pools?.length || 0) > 0 &&
          !!d.ip &&
          (hasPhysicalPathToDevice(d.id) || canReachTargetIp(d.ip))
      );

      for (const server of pcServers) {
        const pools = server.services?.dhcp?.pools || [];
        for (const pool of pools) {
          if (!validateIP(pool.startIp) || !validateIP(pool.subnetMask) || !validateIP(pool.defaultGateway) || !validateIP(pool.dnsServer)) {
            continue;
          }
          if (!isDhcpPoolCompatibleForClientCallback(pool.defaultGateway, pool.startIp, pool.subnetMask, server)) {
            continue;
          }
          const start = ipToNumber(pool.startIp);
          if (start === null) continue;
          const maxUsers = Math.max(1, Number(pool.maxUsers || 1));

          // Check if pool is full
          let availableCount = 0;
          for (let i = 0; i < maxUsers; i += 1) {
            const candidate = numberToIp(start + i);
            if (!usedIps.has(candidate)) {
              availableCount++;
            }
          }

          // Skip full pools
          if (availableCount === 0) {
            continue;
          }

          for (let i = 0; i < maxUsers; i += 1) {
            const candidate = numberToIp(start + i);
            if (!usedIps.has(candidate)) {
              return {
                ip: candidate,
                subnetMask: pool.subnetMask,
                gateway: pool.defaultGateway,
                dns: pool.dnsServer,
                serverName: server.name,
                serverIp: server.ip || pool.defaultGateway,
                poolName: pool.poolName,
              };
            }
          }
        }
      }

      // 2. Check Router/Switch DHCP servers from deviceStates (CLI-configured pools)
      const safeDeviceStates = ensureDeviceStatesMap(deviceStates);

      if (safeDeviceStates) {
        for (const [deviceId_, state] of safeDeviceStates.entries()) {
          if (deviceId_ === deviceId) continue;
          const device = topologyDevices.find(d => d.id === deviceId_);
          if (!device || (device.type !== 'router' && device.type !== 'switchL2' && device.type !== 'switchL3' && device.type !== 'wlc')) continue;

          // Check DHCP pools from device object, runtime services mirror, and raw CLI state.
          const topologyPools = device.services?.dhcp?.pools || [];
          const mirroredPools = state.services?.dhcp?.pools || [];
          const cliPools = Object.entries(state.dhcpPools || {}).map(([poolName, pool]: [string, { network?: string; subnetMask?: string; startIp?: string; defaultRouter?: string; dnsServer?: string; maxUsers?: number | string }]) => {
            const networkBase = typeof pool?.network === 'string' ? pool.network : '';
            const networkPrefix = networkBase.split('.').slice(0, 3).join('.');
            const fallbackStart = networkPrefix ? `${networkPrefix}.100` : '192.168.1.100';
            const fallbackGateway = networkPrefix ? `${networkPrefix}.1` : '192.168.1.1';
            return {
              poolName,
              subnetMask: pool?.subnetMask || '255.255.255.0',
              startIp: pool?.startIp || fallbackStart,
              defaultGateway: pool?.defaultRouter || fallbackGateway,
              dnsServer: pool?.dnsServer || '8.8.8.8',
              maxUsers: Number(pool?.maxUsers || 50),
            };
          });
          const dhcpPools = [...topologyPools];
          for (const pool of [...mirroredPools, ...cliPools]) {
            if (!dhcpPools.some((p: DhcpPoolConfig) => p.poolName === pool.poolName)) {
              dhcpPools.push(pool);
            }
          }
          if (dhcpPools.length === 0) continue;

          // DHCP DISCOVER is L2 broadcast; client has no usable IP yet.
          // In that case, only physical path is required (no server IP prerequisite).
          let deviceIp = device.ip;
          if (!deviceIp && state.ports) {
            for (const portId in state.ports) {
              const port = state.ports[portId];
              if (port.ipAddress && !port.shutdown) {
                deviceIp = port.ipAddress;
                break;
              }
            }
          }

          // Check if PC can reach this DHCP server:
          // - no client IP yet => physical path is enough
          // - client already has IP => normal reachability check by server IP
          const canReach = hasPhysicalPathToDevice(deviceId_) || (!!deviceIp && canReachTargetIp(deviceIp));
          if (!canReach) continue;

          // Use this device's DHCP pools
          for (const pool of dhcpPools) {
            if (!validateIP(pool.startIp) || !validateIP(pool.subnetMask) || !validateIP(pool.defaultGateway) || !validateIP(pool.dnsServer)) {
              continue;
            }
            if (!isDhcpPoolCompatibleForClientCallback(pool.defaultGateway, pool.startIp, pool.subnetMask, device, state)) {
              continue;
            }
            const start = ipToNumber(pool.startIp);
            if (start === null) continue;
            const maxUsers = Math.max(1, Number(pool.maxUsers || 50));

            // Check if pool is full
            let availableCount = 0;
            for (let i = 0; i < maxUsers; i += 1) {
              const candidate = numberToIp(start + i);
              if (!usedIps.has(candidate)) {
                availableCount++;
              }
            }

            // Skip full pools
            if (availableCount === 0) {
              continue;
            }

            for (let i = 0; i < maxUsers; i += 1) {
              const candidate = numberToIp(start + i);
              if (!usedIps.has(candidate)) {
                return {
                  ip: candidate,
                  subnetMask: pool.subnetMask,
                  gateway: pool.defaultGateway,
                  dns: pool.dnsServer,
                  serverName: device.name || state.hostname || deviceId_,
                  serverIp: deviceIp || pool.defaultGateway,
                  poolName: pool.poolName,
                };
              }
            }
          }
        }
      }

      return null;
    } catch (err) {
      errorHandler.logError(DHCP_ERRORS.LEASE_FAILED({ deviceId, source: 'getDhcpLease', error: String(err) }));
      return null;
    }
  }, [canReachTargetIp, deviceId, deviceStates, hasPhysicalPathToDevice, ipToNumber, isDhcpPoolCompatibleForClientCallback, numberToIp, topologyDevices, validateIP]);

  // Check if DHCP pools are available and get failure reason
  const checkDhcpAvailability = useCallback((): { available: boolean; reason: string } => {
    const usedIps = new Set(
      topologyDevices
        .filter((d) => d.id !== deviceId && validateIP(d.ip || ''))
        .map((d) => d.ip)
    );

    // Check PC DHCP servers
    const pcServers = topologyDevices.filter(
      (d) =>
        d.id !== deviceId &&
        d.services?.dhcp?.enabled &&
        (d.services?.dhcp?.pools?.length || 0) > 0 &&
        !!d.ip &&
        (hasPhysicalPathToDevice(d.id) || canReachTargetIp(d.ip))
    );

    // Check Router/Switch DHCP servers availability
    let hasAnyDhcpService = pcServers.length > 0;

    // Safety check: ensure deviceStates is iterable
    const safeDeviceStates = ensureDeviceStatesMap(deviceStates);

    if (!hasAnyDhcpService && safeDeviceStates) {
      for (const [deviceId_, state] of safeDeviceStates.entries()) {
        if (deviceId_ === deviceId) continue;
        const device = topologyDevices.find(d => d.id === deviceId_);
        if (!device || (device.type !== 'router' && device.type !== 'switchL2' && device.type !== 'switchL3' && device.type !== 'wlc')) continue;

        const topologyPools = device.services?.dhcp?.pools || [];
        const mirroredPools = state.services?.dhcp?.pools || [];
        const cliPools = Object.entries(state.dhcpPools || {}).length;
        if (topologyPools.length > 0 || mirroredPools.length > 0 || cliPools > 0) {
          hasAnyDhcpService = true;
          break;
        }
      }
    }

    // If no DHCP service available at all
    if (!hasAnyDhcpService) {
      return { available: false, reason: 'no_dhcp_service' };
    }

    for (const server of pcServers) {
      const pools = server.services?.dhcp?.pools || [];
      for (const pool of pools) {
        if (!validateIP(pool.startIp) || !validateIP(pool.subnetMask) || !validateIP(pool.defaultGateway) || !validateIP(pool.dnsServer)) {
          continue;
        }
        if (!isDhcpPoolCompatibleForClientCallback(pool.defaultGateway, pool.startIp, pool.subnetMask, server)) {
          continue;
        }
        const start = ipToNumber(pool.startIp);
        if (start === null) continue;
        const maxUsers = Math.max(1, Number(pool.maxUsers || 1));

        let availableCount = 0;
        for (let i = 0; i < maxUsers; i += 1) {
          const candidate = numberToIp(start + i);
          if (!usedIps.has(candidate)) {
            availableCount++;
          }
        }

        if (availableCount > 0) {
          return { available: true, reason: '' };
        }
      }
    }

    // Check Router/Switch DHCP servers
    if (deviceStates) {
      for (const [deviceId_, state] of ensureDeviceStatesMap(deviceStates).entries()) {
        if (deviceId_ === deviceId) continue;
        const device = topologyDevices.find(d => d.id === deviceId_);
        if (!device || (device.type !== 'router' && device.type !== 'switchL2' && device.type !== 'switchL3' && device.type !== 'wlc')) continue;

        const topologyPools = device.services?.dhcp?.pools || [];
        const mirroredPools = state.services?.dhcp?.pools || [];
        const cliPools = Object.entries(state.dhcpPools || {}).map(([poolName, pool]: [string, { network?: string; subnetMask?: string; startIp?: string; defaultRouter?: string; dnsServer?: string; maxUsers?: number | string }]) => {
          const networkBase = typeof pool?.network === 'string' ? pool.network : '';
          const networkPrefix = networkBase.split('.').slice(0, 3).join('.');
          const fallbackStart = networkPrefix ? `${networkPrefix}.100` : '192.168.1.100';
          const fallbackGateway = networkPrefix ? `${networkPrefix}.1` : '192.168.1.1';
          return {
            poolName,
            subnetMask: pool?.subnetMask || '255.255.255.0',
            startIp: pool?.startIp || fallbackStart,
            defaultGateway: pool?.defaultRouter || fallbackGateway,
            dnsServer: pool?.dnsServer || '8.8.8.8',
            maxUsers: Number(pool?.maxUsers || 50),
          };
        });
        const dhcpPools = [...topologyPools];
        for (const pool of [...mirroredPools, ...cliPools]) {
          if (!dhcpPools.some((p: DhcpPoolConfig) => p.poolName === pool.poolName)) {
            dhcpPools.push(pool);
          }
        }
        if (dhcpPools.length === 0) continue;

        let deviceIp = device.ip;
        if (!deviceIp && state.ports) {
          for (const portId in state.ports) {
            const port = state.ports[portId];
            if (port.ipAddress && !port.shutdown) {
              deviceIp = port.ipAddress;
              break;
            }
          }
        }

        const canReach = hasPhysicalPathToDevice(deviceId_) || (!!deviceIp && canReachTargetIp(deviceIp));
        if (!canReach) continue;

        for (const pool of dhcpPools) {
          if (!validateIP(pool.startIp) || !validateIP(pool.subnetMask) || !validateIP(pool.defaultGateway) || !validateIP(pool.dnsServer)) {
            continue;
          }
          if (!isDhcpPoolCompatibleForClientCallback(pool.defaultGateway, pool.startIp, pool.subnetMask, device, state)) {
            continue;
          }
          const start = ipToNumber(pool.startIp);
          if (start === null) continue;
          const maxUsers = Math.max(1, Number(pool.maxUsers || 50));

          let availableCount = 0;
          for (let i = 0; i < maxUsers; i += 1) {
            const candidate = numberToIp(start + i);
            if (!usedIps.has(candidate)) {
              availableCount++;
            }
          }

          if (availableCount > 0) {
            return { available: true, reason: '' };
          }
        }
      }
    }

    return { available: false, reason: 'all_pools_full' };
  }, [canReachTargetIp, deviceId, deviceStates, hasPhysicalPathToDevice, ipToNumber, isDhcpPoolCompatibleForClientCallback, numberToIp, topologyDevices, validateIP]);

  const applyDhcpLease = useCallback((force = false) => {
    const lease = getDhcpLease();
    // Use refs for comparison to avoid dependency issues
    const currentPcIP = pcIpRef.current;
    const currentPcSubnet = pcSubnetRef.current;
    const currentPcGateway = pcGatewayRef.current;
    const currentPcDNS = pcDNSRef.current;

    if (!lease) {
      const usedIps = new Set(
        topologyDevices
          .filter((d) => d.id !== deviceId && validateIP(d.ip || ''))
          .map((d) => d.ip)
      );
      const linkLocalIp = generateRandomLinkLocalIpv4(usedIps);
      const linkLocalLease = {
        ip: linkLocalIp,
        subnetMask: '255.255.0.0',
        gateway: '0.0.0.0',
        dns: '0.0.0.0',
        serverName: 'link-local',
        poolName: 'APIPA',
      };

      // Dispatch DHCP Discover broadcast packet to capture panel for connected cable
      const pcDevice = topologyDevices.find(d => d.id === deviceId);
      const activeConn = topologyConnections.find(c =>
        c.active !== false && (c.sourceDeviceId === deviceId || c.targetDeviceId === deviceId)
      );
      if (activeConn) {
        const connId = (activeConn as { id?: string }).id || `${activeConn.sourceDeviceId}-${activeConn.targetDeviceId}`;
        const clientMac = pcDevice?.macAddress || deviceId;
        dispatchCapturedPackets([{
          connectionId: connId,
          sourceIp: '0.0.0.0',
          targetIp: '255.255.255.255',
          protocol: 'UDP',
          length: 328,
          info: `DHCP Discover: Client ${clientMac} broadcasting for IP assignment`
        }]);
      }

      if (!force &&
        linkLocalLease.ip === currentPcIP &&
        linkLocalLease.subnetMask === currentPcSubnet &&
        linkLocalLease.gateway === currentPcGateway &&
        linkLocalLease.dns === currentPcDNS
      ) {
        return linkLocalLease;
      }
      setPcIP(linkLocalLease.ip);
      setPcSubnet(linkLocalLease.subnetMask);
      setPcGateway(linkLocalLease.gateway);
      setPcDNS(linkLocalLease.dns);
      // Update topology to persist the link-local IP
      window.dispatchEvent(new CustomEvent('update-topology-device-config', {
        detail: {
          deviceId,
          config: {
            ip: linkLocalLease.ip,
            subnet: linkLocalLease.subnetMask,
            gateway: linkLocalLease.gateway,
            dns: linkLocalLease.dns,
            ipConfigMode: 'dhcp'
          }
        }
      }));
      return linkLocalLease;
    }

    // Dispatch full DHCP DORA sequence (Discover, Offer, Request, ACK) to capture panel
    const pcDevice = topologyDevices.find(d => d.id === deviceId);
    const activeConn = topologyConnections.find(c =>
      c.active !== false && (c.sourceDeviceId === deviceId || c.targetDeviceId === deviceId)
    );
    if (activeConn) {
      const connId = (activeConn as { id?: string }).id || `${activeConn.sourceDeviceId}-${activeConn.targetDeviceId}`;
      const clientMac = pcDevice?.macAddress || deviceId;
      const srvIp = lease.serverIp || lease.gateway || '192.168.1.1';
      dispatchCapturedPackets([
        {
          connectionId: connId,
          sourceIp: '0.0.0.0',
          targetIp: '255.255.255.255',
          protocol: 'UDP',
          length: 328,
          info: `DHCP Discover: Client ${clientMac} broadcasting for IP assignment`
        },
        {
          connectionId: connId,
          sourceIp: srvIp,
          targetIp: '255.255.255.255',
          protocol: 'UDP',
          length: 328,
          info: `DHCP Offer: Server ${lease.serverName} offering IP ${lease.ip}`
        },
        {
          connectionId: connId,
          sourceIp: '0.0.0.0',
          targetIp: '255.255.255.255',
          protocol: 'UDP',
          length: 328,
          info: `DHCP Request: Client ${clientMac} requesting IP ${lease.ip} from ${lease.serverName}`
        },
        {
          connectionId: connId,
          sourceIp: srvIp,
          targetIp: lease.ip,
          protocol: 'UDP',
          length: 328,
          info: `DHCP ACK: Server ${lease.serverName} acknowledging IP ${lease.ip} lease`
        }
      ]);

      // Record binding entry in Switch DHCP Snooping Database if Snooping is enabled on connecting switch
      const switchId = activeConn.sourceDeviceId === deviceId ? activeConn.targetDeviceId : activeConn.sourceDeviceId;
      const switchPort = activeConn.sourceDeviceId === deviceId ? activeConn.targetPort : activeConn.sourcePort;
      const safeStates = deviceStates instanceof Map ? deviceStates : new Map(Object.entries(deviceStates || {}));
      const switchState = safeStates.get(switchId) as SwitchState | undefined;

      if (switchState && switchState.dhcpSnoopingEnabled) {
        const clientMac = pcDevice?.macAddress || '0050.56a1.b2c3';
        const bindings = [...(switchState.dhcpSnoopingBindings || [])];
        const existingIdx = bindings.findIndex(b => b.macAddress?.toLowerCase() === clientMac.toLowerCase() || b.ipAddress === lease.ip);
        const newBinding = {
          macAddress: clientMac,
          ipAddress: lease.ip,
          leaseTime: 86400,
          type: 'dynamic' as const,
          vlan: 1,
          portId: switchPort
        };
        if (existingIdx >= 0) {
          bindings[existingIdx] = newBinding;
        } else {
          bindings.push(newBinding);
        }
        switchState.dhcpSnoopingBindings = bindings;
      }
    }

    if (!force &&
      lease.ip === currentPcIP &&
      lease.subnetMask === currentPcSubnet &&
      lease.gateway === currentPcGateway &&
      lease.dns === currentPcDNS
    ) {
      return lease;
    }
    setPcIP(lease.ip);
    setPcSubnet(lease.subnetMask);
    setPcGateway(lease.gateway);
    setPcDNS(lease.dns);
    // Update topology to persist the DHCP lease IP
    window.dispatchEvent(new CustomEvent('update-topology-device-config', {
      detail: {
        deviceId,
        config: {
          ip: lease.ip,
          subnet: lease.subnetMask,
          gateway: lease.gateway,
          dns: lease.dns,
          ipConfigMode: 'dhcp'
        }
      }
    }));
    return lease;
  }, [getDhcpLease, deviceId, topologyDevices, validateIP]);

  // Keep ref in sync with callback to avoid dependency issues in useEffect
  useEffect(() => {
    checkDhcpAvailabilityRef.current = checkDhcpAvailability;
  }, [checkDhcpAvailability]);

  // Keep ref in sync with callback
  useEffect(() => {
    applyDhcpLeaseRef.current = applyDhcpLease;
  }, [applyDhcpLease]);

  // When DHCP mode is selected, request a lease immediately and notify the user.
  // Also retry if topology connections change, in case we were waiting for a cable.
  // Also retry on page load if device has link-local IP (169.254.x.x) and is in DHCP mode.
  useEffect(() => {
    // Skip if DHCP button was manually clicked (toast already shown by button handler)
    if (manualDhcpClickRef.current) {
      prevIpConfigModeRef.current = ipConfigMode;
      return;
    }

    // Check if IP is link-local (APIPA) - 169.254.x.x range
    const isLinkLocal = pcIP && pcIP.startsWith('169.254.');
    // If we already have a valid non-link-local IP and we didn't just switch to DHCP mode,
    // don't try to get a new lease automatically on every connection change.
    const hasValidIp = pcIP && pcIP !== '0.0.0.0' && !isLinkLocal;

    if (ipConfigMode !== 'dhcp') {
      prevIpConfigModeRef.current = ipConfigMode;
      return;
    }

    // If mode hasn't changed AND we already have a valid IP (not link-local), don't re-trigger
    // However, if we have a link-local IP, always try to get a proper DHCP lease
    if (prevIpConfigModeRef.current === 'dhcp' && hasValidIp && !isLinkLocal) {
      return;
    }

    let lease;
    try {
      lease = applyDhcpLeaseRef.current?.(true);
    } catch (err) {
      errorHandler.logError(DHCP_ERRORS.LEASE_FAILED({ deviceId, source: 'applyDhcpLease', error: String(err) }));
    }
    if (lease && lease.serverName !== 'link-local') {
      toast({
        title: t.dhcpSuccessTitle,
        description: t.dhcpSuccessDescription.replace('{ip}', lease.ip),
      });
    } else {
      if (lease && lease.serverName === 'link-local' && prevIpConfigModeRef.current !== 'dhcp') {
        toast({
          title: language === 'tr' ? 'DHCP bulunamadÄ±' : 'DHCP not found',
          description: language === 'tr'
            ? `Link-local IP atandÄ±: ${lease.ip}`
            : `Assigned link-local IP: ${lease.ip}`,
        });
      } else if (prevIpConfigModeRef.current !== 'dhcp') {
        try {
          if (!checkDhcpAvailabilityRef.current) return;
          const dhcpCheck = checkDhcpAvailabilityRef.current();
          let errorMessage = t.dhcpFailureDescription;
          if (dhcpCheck.reason === 'all_pools_full') {
            errorMessage = language === 'tr'
              ? 'DHCP havuzlarÄ± dolu! Maksimum IP sayÄ±sÄ±na ulaÅŸÄ±ldÄ±.'
              : 'All DHCP pools are full! Maximum number of IP addresses reached.';
          } else if (dhcpCheck.reason === 'no_dhcp_service') {
            errorMessage = language === 'tr'
              ? 'AÄŸda DHCP hizmeti bulunamadÄ±! LÃ¼tfen bir DHCP sunucusu yapÄ±landÄ±rÄ±n.'
              : 'No DHCP service found on the network! Please configure a DHCP server.';
          }
          toast({
            title: t.dhcpFailureTitle,
            description: errorMessage,
            variant: 'destructive',
          });
        } catch (checkErr) {
          errorHandler.logError(DHCP_ERRORS.LEASE_FAILED({ deviceId, source: 'checkDhcpAvailability', error: String(checkErr) }));
          toast({
            title: t.dhcpFailureTitle,
            description: t.dhcpFailureDescription,
            variant: 'destructive',
          });
        }
      }
    }

    prevIpConfigModeRef.current = ipConfigMode;
  }, [ipConfigMode, t, topologyConnections, language]);

  // Listen for auto-renew-dhcp event from page.tsx
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleAutoRenewDhcp = (event: Event) => {
      const customEvent = event as CustomEvent<{ deviceId: string }>;
      if (customEvent.detail && customEvent.detail.deviceId === deviceId) {
        if (ipConfigMode === 'dhcp' && (!pcIP || pcIP === '0.0.0.0' || pcIP.startsWith('169.254.'))) {
          try {
            const lease = applyDhcpLeaseRef.current?.(true);
            if (lease && lease.serverName !== 'link-local') {
              addLocalOutput('success', `DHCP lease renewed. New IP: ${lease.ip}`);
            }
          } catch (err) {
            errorHandler.logError(DHCP_ERRORS.LEASE_FAILED({ deviceId, source: 'autoRenewDhcp', error: String(err) }));
          }
        }
      }
    };

    window.addEventListener('auto-renew-dhcp', handleAutoRenewDhcp);
    return () => window.removeEventListener('auto-renew-dhcp', handleAutoRenewDhcp);
  }, [deviceId, ipConfigMode, pcIP, addLocalOutput]);

  return {
    getDhcpLease,
    checkDhcpAvailability,
    applyDhcpLease,
  };
}

