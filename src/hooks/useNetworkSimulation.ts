import { useEffect, useRef, useCallback } from 'react';
import { CanvasDevice } from '@/components/network/NetworkTopology/types/networkTopology.types';
import { SwitchState } from '@/lib/network/types';
import { updateChangedDevices } from '@/lib/simulation/partialDeviceUpdates';

export function useNetworkSimulation(
  deviceStates: Map<string, SwitchState>,
  setTopologyDevices: React.Dispatch<React.SetStateAction<CanvasDevice[]>>,
  networkLogic: { applyIotAutomationPass: (devices: CanvasDevice[]) => CanvasDevice[] }
) {
  const isValidIpv4Address = useCallback((value: string) => {
    const parts = value.trim().split('.');
    return parts.length === 4 && parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) >= 0 && Number(part) <= 255);
  }, []);

  const deviceStatesRef = useRef(deviceStates);
  useEffect(() => { deviceStatesRef.current = deviceStates; }, [deviceStates]);

  const formatLocalDate = useCallback((date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const advanceNtpDateTime = useCallback((dateValue?: string, timeValue?: string) => {
    const fallback = new Date();
    const baseDate = dateValue || formatLocalDate(fallback);
    const baseTime = timeValue || fallback.toTimeString().slice(0, 8);
    const next = new Date(`${baseDate}T${baseTime}`);
    if (Number.isNaN(next.getTime())) return {
      date: baseDate,
      time: baseTime,
    };
    next.setSeconds(next.getSeconds() + 1);
    return {
      date: formatLocalDate(next),
      time: next.toTimeString().slice(0, 8),
    };
  }, [formatLocalDate]);

  // Single simulation clock. Fast work runs on each tick; slower work uses
  // the elapsed-time accumulator so there is only one browser interval.
  useEffect(() => {
    if (!networkLogic?.applyIotAutomationPass) return;

    let lastTick = performance.now();
    let ntpAccumulator = 0;
    const interval = window.setInterval(() => {
      const now = performance.now();
      const elapsed = Math.min(now - lastTick, 1000);
      lastTick = now;
      ntpAccumulator += elapsed;
      const shouldAdvanceNtp = ntpAccumulator >= 1000;
      if (shouldAdvanceNtp) ntpAccumulator %= 1000;

      setTopologyDevices((previousDevices) => {
        let devices = networkLogic.applyIotAutomationPass(previousDevices);
        let changed = devices !== previousDevices;

        if (!shouldAdvanceNtp) return changed ? devices : previousDevices;

        const ntpUpdates = new Map<string, Partial<CanvasDevice>>();
        const devicesByIp = new Map<string, CanvasDevice>();
        devices.forEach((candidate) => {
          if (candidate.ip) devicesByIp.set(candidate.ip, candidate);
        });
        devices.forEach((device) => {
          const ntp = device.services?.ntp;
          const stateNtp = deviceStatesRef.current.get(device.id)?.services?.ntp;
          const effectiveNtp = ntp?.enabled ? ntp : stateNtp?.enabled ? stateNtp : undefined;
          if (!effectiveNtp?.enabled) return;

          const serverIp = effectiveNtp.server?.trim();
          const upstreamDevice = serverIp && isValidIpv4Address(serverIp)
            ? devicesByIp.get(serverIp)
            : undefined;
          const upstreamNtp = upstreamDevice?.services?.ntp?.enabled ? upstreamDevice.services.ntp : undefined;
          const nextNtp = upstreamNtp?.enabled
            ? { ...effectiveNtp, enabled: true, date: upstreamNtp.date || formatLocalDate(new Date()), time: upstreamNtp.time || new Date().toTimeString().slice(0, 8) }
            : (() => {
                const nextTime = advanceNtpDateTime(effectiveNtp.date, effectiveNtp.time);
                return { ...effectiveNtp, enabled: true, date: nextTime.date, time: nextTime.time };
              })();

          const currentNtp = device.services?.ntp;
          if (currentNtp?.date === nextNtp.date && currentNtp?.time === nextNtp.time && currentNtp?.enabled) return;
          ntpUpdates.set(device.id, {
            services: { ...device.services, ntp: nextNtp }
          });
        });

        if (ntpUpdates.size > 0) {
          devices = updateChangedDevices(devices, ntpUpdates).devices;
          changed = true;
        }
        return changed ? devices : previousDevices;
      });
    }, 250);

    return () => window.clearInterval(interval);
  }, [advanceNtpDateTime, formatLocalDate, isValidIpv4Address, networkLogic, setTopologyDevices]);
}


