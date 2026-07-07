import { useEffect, useRef, useCallback } from 'react';
import { CanvasDevice } from '@/components/network/networkTopology.types';
import { SwitchState } from '@/lib/network/types';

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

  // IoT Automation Pass
  useEffect(() => {
    if (!networkLogic?.applyIotAutomationPass) return;
    const interval = window.setInterval(() => {
      setTopologyDevices((prev) => networkLogic.applyIotAutomationPass(prev));
    }, 250);

    return () => window.clearInterval(interval);
  }, [networkLogic, setTopologyDevices]);

  // NTP Time Simulation
  useEffect(() => {
    const interval = window.setInterval(() => {
      setTopologyDevices((prevDevices) => {
        const devices = prevDevices.map((device) => {
          const devState = deviceStatesRef.current.get(device.id);
          if (devState?.services?.ntp?.enabled && !device.services?.ntp?.enabled) {
            return { ...device, services: { ...device.services, ntp: devState.services.ntp } };
          }
          return { ...device };
        });

        for (const device of devices) {
          const ntp = device.services?.ntp;
          if (!ntp?.enabled) continue;

          const serverIp = ntp.server?.trim();
          const upstreamDevice = serverIp && isValidIpv4Address(serverIp)
            ? devices.find((candidate) => candidate.ip === serverIp && candidate.services?.ntp?.enabled)
            : undefined;
          const upstreamNtp = upstreamDevice?.services?.ntp;

          if (upstreamNtp?.enabled) {
            device.services = {
              ...(device.services || {}),
              ntp: {
                ...ntp,
                enabled: true,
                date: upstreamNtp.date || formatLocalDate(new Date()),
                time: upstreamNtp.time || new Date().toTimeString().slice(0, 8),
              },
            };
            continue;
          }

          const nextTime = advanceNtpDateTime(ntp.date, ntp.time);
          device.services = {
            ...(device.services || {}),
            ntp: {
              ...ntp,
              enabled: true,
              date: nextTime.date,
              time: nextTime.time,
            },
          };
        }

        return devices;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [advanceNtpDateTime, formatLocalDate, isValidIpv4Address, setTopologyDevices]);
}
