'use client';

import { useState, useRef, useEffect, useMemo, useCallback, Dispatch, SetStateAction } from 'react';
import type { CanvasDevice, CanvasConnection } from '../networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import { checkConnectivity } from '@/lib/network/connectivity';

interface UsePCPanelNtpOptions {
  language: string;
  deviceId: string;
  topologyDevices: CanvasDevice[];
  topologyConnections: {
    sourceDeviceId: string;
    sourcePort: string;
    targetDeviceId: string;
    targetPort: string;
    cableType?: string;
    active?: boolean;
  }[];
  deviceStates: Map<string, SwitchState> | undefined;
  serviceNtpEnabled: boolean;
  serviceNtpServer: string;
  serviceNtpDate: string;
  setServiceNtpDate: Dispatch<SetStateAction<string>>;
  serviceNtpTime: string;
  setServiceNtpTime: Dispatch<SetStateAction<string>>;
  setServiceNtpServerPreset: (
    v: 'pool.ntp.org' | 'time.google.com' | 'time.cloudflare.com' | 'local-clock' | 'custom'
  ) => void;
  isValidIpAddress: (value: string) => boolean;
}

export function usePCPanelNtp({
  language,
  deviceId,
  topologyDevices,
  topologyConnections,
  deviceStates,
  serviceNtpEnabled,
  serviceNtpServer,
  serviceNtpDate,
  setServiceNtpDate,
  serviceNtpTime,
  setServiceNtpTime,
  setServiceNtpServerPreset,
  isValidIpAddress,
}: UsePCPanelNtpOptions) {
  const [currentTime, setCurrentTime] = useState(new Date());

  const formatFullDateTime = useCallback(
    (date: Date) => {
      try {
        return new Intl.DateTimeFormat(language === 'tr' ? 'tr-TR' : 'en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }).format(date);
      } catch {
        return date.toLocaleString(language === 'tr' ? 'tr-TR' : 'en-US');
      }
    },
    [language]
  );

  const ntpPanelTime = useMemo(() => {
    if (!serviceNtpEnabled && !serviceNtpServer.trim()) return currentTime;
    const date = serviceNtpDate || currentTime.toISOString().slice(0, 10);
    const time = serviceNtpTime || currentTime.toTimeString().slice(0, 8);
    const combined = new Date(`${date}T${time}`);
    return Number.isNaN(combined.getTime()) ? currentTime : combined;
  }, [currentTime, serviceNtpDate, serviceNtpEnabled, serviceNtpTime, serviceNtpServer]);

  const formatLocalDate = useCallback((date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const ntpSyncState = useMemo(() => {
    const serverIp = serviceNtpServer.trim();
    if (!serviceNtpEnabled && !serverIp) return null;

    if (serverIp === 'local-clock' || (!serverIp && serviceNtpEnabled)) {
      const now = new Date();
      return {
        date: now.toISOString().slice(0, 10),
        time: now.toTimeString().slice(0, 8),
        realtime: true,
      };
    }

    if (!isValidIpAddress(serverIp)) return null;
    const canReach = checkConnectivity(
      deviceId,
      serverIp,
      topologyDevices,
      topologyConnections as unknown as CanvasConnection[],
      deviceStates || new Map(),
      language as 'tr' | 'en',
      { protocol: 'any' }
    );
    if (!canReach.success) return null;

    let serverDate = '';
    let serverTime = '';

    if (canReach.targetId) {
      const targetDev = topologyDevices.find((d) => d.id === canReach.targetId);
      if (targetDev) {
        if (
          targetDev.type === 'switchL2' ||
          targetDev.type === 'switchL3' ||
          targetDev.type === 'router'
        ) {
          const devState = deviceStates?.get(canReach.targetId);
          if (devState?.services?.ntp?.enabled) {
            const timeOffset = devState.services.ntp.timeOffset || 0;
            const adjustedTime = new Date(new Date().getTime() + timeOffset);
            serverDate = adjustedTime.toISOString().slice(0, 10);
            serverTime = adjustedTime.toTimeString().slice(0, 8);
          }
        } else {
          if (targetDev.services?.ntp?.enabled) {
            serverDate = targetDev.services.ntp.date || '';
            serverTime = targetDev.services.ntp.time || '';
          }
        }
      }
    }

    if (serverDate && serverTime) {
      const serverDateTime = new Date(`${serverDate}T${serverTime}`);
      if (!Number.isNaN(serverDateTime.getTime())) {
        const offset = serverDateTime.getTime() - new Date().getTime();
        return {
          date: serverDate,
          time: serverTime,
          realtime: false,
          offset,
        };
      }
    }

    const now = new Date();
    return {
      date: now.toISOString().slice(0, 10),
      time: now.toTimeString().slice(0, 8),
      realtime: true,
      offset: 0,
    };
  }, [
    deviceId,
    isValidIpAddress,
    serviceNtpEnabled,
    serviceNtpServer,
    topologyConnections,
    topologyDevices,
    deviceStates,
    language,
  ]);

  useEffect(() => {
    if (!ntpSyncState) {
      const timer = setInterval(() => setCurrentTime(new Date()), 1000);
      return () => clearInterval(timer);
    }

    if (ntpSyncState?.realtime) {
      const timer = setInterval(() => setCurrentTime(new Date()), 1000);
      return () => clearInterval(timer);
    }

    const offset = ntpSyncState.offset || 0;
    const timer = setInterval(() => {
      const adjusted = new Date(new Date().getTime() + offset);
      setCurrentTime(adjusted);
      setServiceNtpDate(adjusted.toISOString().slice(0, 10));
      setServiceNtpTime(adjusted.toTimeString().slice(0, 8));
    }, 1000);

    const initialAdjusted = new Date(new Date().getTime() + offset);
    setTimeout(() => setCurrentTime(initialAdjusted), 0);
    setTimeout(() => setServiceNtpDate(initialAdjusted.toISOString().slice(0, 10)), 0);
    setTimeout(() => setServiceNtpTime(initialAdjusted.toTimeString().slice(0, 8)), 0);

    return () => clearInterval(timer);
  }, [ntpSyncState]);

  const applyNtpServerTime = useCallback(
    (serverAddress: string) => {
      const normalized = serverAddress.trim();
      if (!normalized || !isValidIpAddress(normalized)) return null;

      const canReach = checkConnectivity(
        deviceId,
        normalized,
        topologyDevices,
        topologyConnections as unknown as CanvasConnection[],
        deviceStates || new Map(),
        language as 'tr' | 'en',
        { protocol: 'any' }
      );
      if (!canReach.success) return null;

      let serverDate = '';
      let serverTime = '';

      if (canReach.targetId) {
        const targetDev = topologyDevices.find((d) => d.id === canReach.targetId);
        if (targetDev) {
          if (
            targetDev.type === 'switchL2' ||
            targetDev.type === 'switchL3' ||
            targetDev.type === 'router'
          ) {
            const devState = deviceStates?.get(canReach.targetId);
            if (devState?.services?.ntp?.enabled) {
              const timeOffset = devState.services.ntp.timeOffset || 0;
              const adjustedTime = new Date(new Date().getTime() + timeOffset);
              serverDate = adjustedTime.toISOString().slice(0, 10);
              serverTime = adjustedTime.toTimeString().slice(0, 8);
            }
          } else {
            if (targetDev.services?.ntp?.enabled) {
              serverDate = targetDev.services.ntp.date || '';
              serverTime = targetDev.services.ntp.time || '';
            }
          }
        }
      }

      const nextDate = serverDate || new Date().toISOString().slice(0, 10);
      const nextTime = serverTime || new Date().toTimeString().slice(0, 8);

      const syncedDateTime = new Date(`${nextDate}T${nextTime}`);
      if (!Number.isNaN(syncedDateTime.getTime())) {
        setCurrentTime(syncedDateTime);
      }
      setServiceNtpDate(nextDate);
      setServiceNtpTime(nextTime);
      setServiceNtpServerPreset(
        normalized === 'pool.ntp.org'
          ? 'pool.ntp.org'
          : normalized === 'time.google.com'
            ? 'time.google.com'
            : normalized === 'time.cloudflare.com'
              ? 'time.cloudflare.com'
              : normalized === 'local-clock'
                ? 'local-clock'
                : 'custom'
      );
      return { date: nextDate, time: nextTime };
    },
    [deviceId, isValidIpAddress, topologyConnections, topologyDevices, deviceStates, language]
  );

  const ntpTimeRef = useRef(serviceNtpTime);

  useEffect(() => {
    ntpTimeRef.current = serviceNtpTime;
  }, [serviceNtpTime]);

  useEffect(() => {
    if (!serviceNtpEnabled) return;
    if (ntpSyncState) return;

    const timer = setInterval(() => {
      setServiceNtpDate((prevDate) => {
        const startDate = prevDate || new Date().toISOString().slice(0, 10);
        const startTime = ntpTimeRef.current || new Date().toTimeString().slice(0, 8);
        const next = new Date(`${startDate}T${startTime}`);
        if (Number.isNaN(next.getTime())) return prevDate;
        next.setSeconds(next.getSeconds() + 1);
        const nextDate = formatLocalDate(next);
        const nextTime = next.toTimeString().slice(0, 8);
        setServiceNtpTime(nextTime);
        setCurrentTime(next);
        return nextDate;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [formatLocalDate, ntpSyncState, serviceNtpEnabled]);

  const lastSyncedServerRef = useRef<string>('');
  const lastSyncedServerDataRef = useRef<string>('');

  useEffect(() => {
    const serverIp = serviceNtpServer.trim();
    if (!serverIp || !isValidIpAddress(serverIp)) return;

    const currentServerData = JSON.stringify({ ip: serverIp, connections: topologyConnections });

    if (
      lastSyncedServerRef.current === serverIp &&
      lastSyncedServerDataRef.current === currentServerData
    )
      return;

    lastSyncedServerRef.current = serverIp;
    lastSyncedServerDataRef.current = currentServerData;

    void applyNtpServerTime(serverIp);
  }, [applyNtpServerTime, isValidIpAddress, serviceNtpServer, topologyConnections, topologyDevices, deviceStates]);

  return {
    currentTime,
    setCurrentTime,
    ntpPanelTime,
    ntpSyncState,
    applyNtpServerTime,
    formatFullDateTime,
    formatLocalDate,
  };
}
