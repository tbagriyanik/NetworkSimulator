import { useEffect, useCallback } from 'react';
import { useAppStore } from '@/lib/store/appStore';
import { CanvasDevice, CanvasConnection, FirewallRule } from '@/components/network/networkTopology.types';
import { SwitchState } from '@/lib/network/types';
import { buildRunningConfig } from '@/lib/network/core/configBuilder';
import { TerminalOutput } from '@/components/network/Terminal';

interface UsePageNetworkLogicProps {
  setDeviceStates: React.Dispatch<React.SetStateAction<Map<string, SwitchState>>>;
  topologyDevices: CanvasDevice[];
  setTopologyDevices: (devices: CanvasDevice[] | ((prev: CanvasDevice[]) => CanvasDevice[])) => void;
  setTopologyConnections: (connections: CanvasConnection[] | ((prev: CanvasConnection[]) => CanvasConnection[])) => void;
  setDeviceOutputs: React.Dispatch<React.SetStateAction<Map<string, TerminalOutput[]>>>;
  setPcOutputs: React.Dispatch<React.SetStateAction<Map<string, { id: string; type: 'command' | 'output' | 'error' | 'success'; content: string }[]>>>;
  setPcHistories: React.Dispatch<React.SetStateAction<Map<string, string[]>>>;
  setFocusDeviceId: (id: string | null) => void;
  setActiveFirewallId: (id: string | null) => void;
  setShowFirewallPanel: (show: boolean) => void;
  toast: (props: { title?: string; description?: string; variant?: 'default' | 'destructive' }) => void;
  t: Record<string, string>;
  activeTab: string;
  topologyContainerRef: React.RefObject<HTMLDivElement | null>;
  setZoom: (zoom: number) => void;
  focusDeviceInTopology: (deviceId: string, zoomLevel: number, deviceData: CanvasDevice) => void;
  pendingFocusDeviceRef: React.MutableRefObject<string | null>;
  graphicsQuality: string;
}

export function usePageNetworkLogic({
  setDeviceStates,
  topologyDevices,
  setTopologyDevices,
  setTopologyConnections,
  setDeviceOutputs,
  setPcOutputs,
  setPcHistories,
  setFocusDeviceId,
  setActiveFirewallId,
  setShowFirewallPanel,
  toast,
  t,
  activeTab,
  topologyContainerRef,
  setZoom,
  focusDeviceInTopology,
  pendingFocusDeviceRef,
  graphicsQuality,
}: UsePageNetworkLogicProps) {

  // Helper to update specific device state without losing closure freshness
  const updateDeviceState = useCallback((
    prev: Map<string, SwitchState>,
    deviceId: string,
    updater: (state: SwitchState) => SwitchState
  ): Map<string, SwitchState> => {
    const state = prev.get(deviceId);
    if (!state) return prev;
    const next = new Map(prev);
    next.set(deviceId, updater(state));
    return next;
  }, []);

  const toggleDevicePower = useCallback((deviceId: string) => {
    setTopologyDevices((prev) => {
      const current = prev.find(d => d.id === deviceId);
      const nextStatus: 'online' | 'offline' = current?.status === 'offline' ? 'online' : 'offline';
      window.dispatchEvent(new CustomEvent('trigger-topology-toggle-power', {
        detail: {
          deviceId,
          nextStatus,
          deviceType: current?.type,
          switchModel: current?.switchModel
        }
      }));

      // Clear previous outputs/history so fresh boot output is visible
      setDeviceOutputs(prevOutputs => {
        const next = new Map(prevOutputs);
        next.set(deviceId, []);
        return next;
      });
      setPcOutputs(prevOutputs => {
        const next = new Map(prevOutputs);
        next.set(deviceId, []);
        return next;
      });
      setPcHistories(prevHistories => {
        const next = new Map(prevHistories);
        next.set(deviceId, []);
        return next;
      });

      const nextDevices = prev.map((d) => (d.id === deviceId ? { ...d, status: nextStatus } : d));
      const byId = new Map(nextDevices.map(d => [d.id, d] as const));

      setTopologyConnections((prevConnections: CanvasConnection[]) => {
        const nextConnections = prevConnections.map((c) => {
          if (c.sourceDeviceId !== deviceId && c.targetDeviceId !== deviceId) return c;
          if (nextStatus === 'offline') return { ...c, active: false };
          const peerId = c.sourceDeviceId === deviceId ? c.targetDeviceId : c.sourceDeviceId;
          const peer = byId.get(peerId);
          return { ...c, active: peer?.status !== 'offline' };
        });

        // Trigger STP recalculation when power status changes
        window.dispatchEvent(new CustomEvent('stp-recalculation-needed', {
          detail: { topologyDevices: nextDevices, topologyConnections: nextConnections }
        }));

        return nextConnections;
      });

      return nextDevices;
    });
  }, [setTopologyDevices, setTopologyConnections, setDeviceOutputs, setPcOutputs, setPcHistories]);

  const updateDeviceConfig = useCallback((deviceId: string, config: Record<string, unknown>) => {
    const c = config as Partial<CanvasDevice>;
    setTopologyDevices(prev =>
      prev.map((d) =>
        d.id === deviceId
          ? {
            ...d,
            ...c,
            iot: c.iot ? { ...d.iot, ...c.iot } : d.iot,
          }
          : d
      )
    );

    if (c.name) {
      setDeviceStates((prev) => updateDeviceState(prev, deviceId, (s) => ({ ...s, hostname: c.name as string })));
    }

    if (c.wifi) {
      const wifi = c.wifi as NonNullable<CanvasDevice['wifi']>;
      setDeviceStates((prev) => updateDeviceState(prev, deviceId, (state) => {
        if (!state.ports?.['wlan0']) return state;
        return {
          ...state,
          ports: {
            ...state.ports,
            wlan0: {
              ...state.ports['wlan0'],
              shutdown: !wifi.enabled,
              wifi: {
                ssid: wifi.ssid || '',
                security: wifi.security || 'open',
                password: wifi.password || '',
                channel: wifi.channel || '2.4GHz',
                mode: wifi.mode || 'ap',
              },
            },
          },
        };
      }));
    }

    if (c.ip === '' && c.wifi?.enabled === false) {
      setDeviceStates((prev) => updateDeviceState(prev, deviceId, (state) => ({
        ...state,
        ports: {
          ...state.ports,
          wlan0: {
            ...state.ports?.['wlan0'],
            shutdown: true,
            wifi: { ssid: '', security: 'open', password: '', channel: '2.4GHz', mode: 'client' },
          },
        },
      })));
    }

    if (c.firewallRules) {
      setDeviceStates((prev) => updateDeviceState(prev, deviceId, (s) => {
        const updated = { ...s, firewallRules: c.firewallRules as FirewallRule[] };
        updated.runningConfig = buildRunningConfig(updated);
        return updated;
      }));
    }

    if (c.services?.ntp) {
      setDeviceStates((prev) => updateDeviceState(prev, deviceId, (state) => {
        const ntpServer = (c.services as CanvasDevice['services'])?.ntp?.server;
        const ntpServers = ntpServer ? [ntpServer] : (state.ntpServers ? [...state.ntpServers] : []);
        const updatedState = {
          ...state,
          ntpServers,
          services: {
            ...state.services,
            ntp: {
              ...state.services?.ntp,
              ...(c.services as CanvasDevice['services'])?.ntp,
              enabled: (c.services as CanvasDevice['services'])?.ntp?.enabled ?? state.services?.ntp?.enabled ?? false,
            },
          },
        };
        updatedState.runningConfig = buildRunningConfig(updatedState);
        return updatedState;
      }));
    }
  }, [setTopologyDevices, setDeviceStates, updateDeviceState]);

  // Listen for device config updates from PCPanel
  useEffect(() => {
    const handleDeviceUpdate = (event: CustomEvent<{ deviceId: string; config: Record<string, unknown> }>) => {
      const { deviceId, config } = event.detail;
      updateDeviceConfig(deviceId, config);
    };

    window.addEventListener('update-topology-device-config', handleDeviceUpdate as EventListener);
    return () => window.removeEventListener('update-topology-device-config', handleDeviceUpdate as EventListener);
  }, [updateDeviceConfig]);

  useEffect(() => {
    const handleTriggerOpenFirewall = () => {
      const firewall = topologyDevices.find(d => d.type === 'firewall');
      if (firewall) {
        setActiveFirewallId(firewall.id);
        setShowFirewallPanel(true);
      } else {
        toast({
          title: t.language === 'tr' ? 'Firewall bulunamadı' : 'Firewall not found',
          description: t.language === 'tr' ? 'Topolojide yapılandırılmış bir firewall bulunmuyor.' : 'No firewall configured in the topology.',
          variant: 'destructive'
        });
      }
    };

    window.addEventListener('trigger-open-firewall', handleTriggerOpenFirewall);
    return () => window.removeEventListener('trigger-open-firewall', handleTriggerOpenFirewall);
  }, [topologyDevices, t.language, setActiveFirewallId, setShowFirewallPanel, toast]);

  useEffect(() => {
    const handleAddDevice = (event: CustomEvent<{ device: CanvasDevice }>) => {
      const { device } = event.detail;
      if (!device) return;

      setTopologyDevices(prev => [...prev, device]);
      setFocusDeviceId(device.id);

      if (activeTab === 'topology' && topologyContainerRef.current) {
        setZoom(1.0); 
        focusDeviceInTopology(device.id, 1.0, device);
        pendingFocusDeviceRef.current = null;
      } else {
        pendingFocusDeviceRef.current = device.id;
      }

      if (device.type === 'iot') {
        setDeviceStates(prev => {
          const next = new Map(prev);
          const iotState: Record<string, unknown> = {
            hostname: device.name,
            macAddress: device.macAddress || '00-00-00-00-00-00',
            switchModel: 'WS-C2960-24TT-L',
            switchLayer: 'L2' as const,
            currentMode: 'user' as const,
            ports: {
              eth0: {
                id: 'eth0',
                label: 'Eth0',
                status: 'disconnected' as const,
                shutdown: false,
              },
              wlan0: {
                id: 'wlan0',
                label: 'Wlan0',
                status: 'connected' as const,
                shutdown: false,
                wifi: {
                  ssid: device.wifi?.ssid || '',
                  security: device.wifi?.security || 'open',
                  password: device.wifi?.password || '',
                  channel: device.wifi?.channel || '2.4GHz',
                  mode: 'client' as const,
                },
              },
            },
            vlans: {},
            security: {},
            runningConfig: [],
            commandHistory: [],
            historyIndex: -1,
            version: {
              nosVersion: '1.0',
              modelName: 'IoT Device',
              serialNumber: 'N/A',
              uptime: '0d 0h 0m',
            },
            macAddressTable: [],
          };
          next.set(device.id, iotState as unknown as SwitchState);
          return next;
        });
      }
    };

    window.addEventListener('add-topology-device', handleAddDevice as EventListener);
    return () => window.removeEventListener('add-topology-device', handleAddDevice as EventListener);
  }, [activeTab, setTopologyDevices, setFocusDeviceId, setZoom, focusDeviceInTopology, pendingFocusDeviceRef, setDeviceStates, topologyContainerRef]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin && event.origin !== 'null') {
        return;
      }
      if (event.data && event.data.type === 'router-admin-focus-device') {
        const deviceId = event.data.deviceId;
        if (deviceId) {
          setFocusDeviceId(deviceId);
          setTimeout(() => setFocusDeviceId(null), 500);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [setFocusDeviceId]);

  // Listen for global packet capture events
  useEffect(() => {
    const handlePacketCaptured = ((e: CustomEvent) => {
      if (e.detail) {
        const addCapturedPacket = useAppStore.getState().addCapturedPacket;
        addCapturedPacket(e.detail);
      }
    }) as EventListener;
    window.addEventListener('packet-captured', handlePacketCaptured);
    return () => window.removeEventListener('packet-captured', handlePacketCaptured);
  }, []);

  // Apply graphics quality class to body
  useEffect(() => {
    const body = document.body;
    if (graphicsQuality === 'low') {
      body.classList.add('graphics-low');
      body.classList.remove('graphics-high');
    } else {
      body.classList.add('graphics-high');
      body.classList.remove('graphics-low');
    }
  }, [graphicsQuality]);

  return {
    toggleDevicePower,
    updateDeviceConfig,
  };
}
