import { useCallback, useEffect } from 'react';
import type { CanvasDevice, CanvasConnection, CanvasNote } from '@/components/network/NetworkTopology/types/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import { useLanguage, type Translations } from '@/contexts/LanguageContext';
import type { RefreshNetworkReport } from '@/hooks/useRefreshReport';
import { safeSetItem, safeRemoveItem, safeGetJSON } from '@/lib/storage/safeStorage';
import { useMultiWindowStore } from '@/hooks/useMultiWindowStore';

interface UsePageTopologyActionsParams {
  t: Translations;
  hasUnsavedChanges: boolean;
  isExamActive: boolean;
  handleSaveProject: () => void;
  closeExam: () => void;
  resetWorkspaceUiState: () => void;
  resetToEmptyProject: () => void;
  closeAllPanels: () => void;
  setDevices: (devices: CanvasDevice[]) => void;
  setConnections: (connections: CanvasConnection[]) => void;
  setDeviceStates: (states: Map<string, SwitchState>) => void;
  setNotes: (notes: CanvasNote[]) => void;
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  setProjectName: (name: string) => void;
  setProjectSearchQuery: (query: string) => void;
  setShowProjectPicker: (show: boolean) => void;
  setShowMobileMenu: (show: boolean) => void;
  setConfirmDialog: React.Dispatch<React.SetStateAction<{ show: boolean; message: string; action: string; onConfirm: () => void } | null>>;
  setSaveDialog: (dialog: { show: boolean; message: string; onConfirm: (save: boolean) => void } | null) => void;
  setShowPCPanel: (show: boolean) => void;
  setShowRouterPanel: (show: boolean) => void;
  setShowUnifiedDeviceModal: (show: boolean) => void;
  setShowAboutModal: (show: boolean) => void;
  setShowOnboarding: (show: boolean) => void;
  setShowBasarilarim: (show: boolean) => void;
  setShowTeacherPanel: (show: boolean) => void;
  setShowRoomJoinDialog: (show: boolean) => void;
  setIsGeneratorOpen: (show: boolean) => void;
  setRefreshNetworkReport: React.Dispatch<React.SetStateAction<RefreshNetworkReport | null>>;
  refreshNetworkReport: RefreshNetworkReport | null;
  refreshReportRef: React.RefObject<HTMLDivElement | null>;
  isMobile: boolean;
}

export function usePageTopologyActions({
  t,
  hasUnsavedChanges,
  isExamActive,
  handleSaveProject,
  closeExam,
  resetWorkspaceUiState,
  resetToEmptyProject,
  closeAllPanels,
  setDevices,
  setConnections,
  setDeviceStates,
  setNotes,
  setZoom,
  setPan,
  setProjectName,
  setProjectSearchQuery,
  setShowProjectPicker,
  setShowMobileMenu,
  setConfirmDialog,
  setSaveDialog,
  setShowPCPanel,
  setShowRouterPanel,
  setShowUnifiedDeviceModal,
  setShowAboutModal,
  setShowOnboarding,
  setShowBasarilarim,
  setShowTeacherPanel,
  setShowRoomJoinDialog,
  setIsGeneratorOpen,
  setRefreshNetworkReport,
  refreshNetworkReport,
  refreshReportRef,
  isMobile,
}: UsePageTopologyActionsParams) {
  const { language } = useLanguage();
  const isTr = language === 'tr';

  const closeEscLikeWindows = useCallback(() => {
    setShowMobileMenu(false);
    setConfirmDialog(null);
    setSaveDialog(null);
    setShowPCPanel(false);
    setShowRouterPanel(false);
    setShowUnifiedDeviceModal(false);
    setShowAboutModal(false);
    setShowProjectPicker(false);
    setShowOnboarding(false);
    setShowBasarilarim(false);
    setShowTeacherPanel(false);
    setShowRoomJoinDialog(false);
    setIsGeneratorOpen(false);
    if (!isExamActive) {
      setRefreshNetworkReport((prev) => (prev ? { ...prev, show: false } : null));
    }
    window.dispatchEvent(new CustomEvent('close-menus-broadcast', { detail: { source: 'escape' } }));
  }, [
    isExamActive,
    setRefreshNetworkReport,
    setShowTeacherPanel,
    setShowRoomJoinDialog,
    setShowMobileMenu,
    setConfirmDialog,
    setSaveDialog,
    setShowPCPanel,
    setShowRouterPanel,
    setShowUnifiedDeviceModal,
    setShowAboutModal,
    setShowProjectPicker,
    setShowOnboarding,
    setShowBasarilarim,
    setIsGeneratorOpen,
  ]);

  useEffect(() => {
    const handleMobileBack = () => {
      closeEscLikeWindows();
      closeAllPanels();
    };
    window.addEventListener('mobile-back-pressed', handleMobileBack as EventListener);
    return () => window.removeEventListener('mobile-back-pressed', handleMobileBack as EventListener);
  }, [closeAllPanels, closeEscLikeWindows]);

  const runWithSaveGuard = useCallback(
    (action: () => void) => {
      if (hasUnsavedChanges) {
        setSaveDialog({
          show: true,
          message: t.unsavedChangesConfirm,
          onConfirm: (save: boolean) => {
            setSaveDialog(null);
            if (save) {
              handleSaveProject();
            }
            action();
          },
        });
        return;
      }
      action();
    },
    [hasUnsavedChanges, handleSaveProject, setSaveDialog, t.unsavedChangesConfirm]
  );

  const handleGeneratedTopology = useCallback(
    (data: {
      devices: CanvasDevice[];
      connections: CanvasConnection[];
      deviceStates: Map<string, SwitchState>;
      projectName?: string;
      projectDescription?: string;
      stepByStep?: boolean;
    }) => {
      resetWorkspaceUiState();
      resetToEmptyProject();
      setNotes([]);
      setZoom(1.0);
      setPan({ x: 0, y: 0 });
      if (data.projectName) {
        setProjectName(data.projectName);
      }

      if (data.projectDescription) {
        safeSetItem('lastProjectDescription', data.projectDescription);
      } else {
        safeRemoveItem('lastProjectDescription');
      }

      if (data.stepByStep) {
        // Start from empty screen and add each device then connection with animated mouse & keyboard
        setDevices([]);
        setConnections([]);
        setDeviceStates(new Map());

        // Open Timeline History Panel so the user sees steps recorded live
        window.dispatchEvent(new CustomEvent('set-timeline-minimized', { detail: { minimized: false } }));

        const devices = [...data.devices];
        const connections = [...data.connections];
        const deviceStates = data.deviceStates;
        const pcDevices = devices.filter(d => d.type === 'pc');
        let simulatedDevices: CanvasDevice[] = [];
        let simulatedStates = new Map<string, SwitchState>();
        let delay = 300;

        const moveCursor = (x: number, y: number, actionLabel?: string, clicking = false, typingText?: string) => {
          window.dispatchEvent(
            new CustomEvent('virtual-cursor-move', {
              detail: { visible: true, x, y, actionLabel, clicking, typingText },
            })
          );
        };

        const hideCursor = () => {
          window.dispatchEvent(new CustomEvent('virtual-cursor-hide'));
        };

        const timeouts: NodeJS.Timeout[] = [];
        const registerTimeout = (fn: () => void, ms: number) => {
          const id = setTimeout(fn, ms);
          timeouts.push(id);
          return id;
        };

        const stopSimulation = () => {
          timeouts.forEach(t => clearTimeout(t));
          hideCursor();
          window.dispatchEvent(new CustomEvent('simulation-progress', { detail: { active: false, current: 0, total: 0, message: isTr ? 'İptal Edildi' : 'Cancelled' } }));
        };

        const onStopReq = () => {
          stopSimulation();
          window.removeEventListener('simulation-stop', onStopReq);
        };
        window.addEventListener('simulation-stop', onStopReq);

        const routerDevices = devices.filter(d => d.type === 'router' || d.type === 'switchL2' || d.type === 'switchL3');
        const wlcDevices = devices.filter(d => d.type === 'wlc');
        const wifiDevices = devices.filter(d => d.type === 'mobile' || !!d.wifi);
        const iotDevices = devices.filter(d => d.type === 'iot');
        const printerDevices = devices.filter(d => d.type === 'printer');

        // Helper to generate factory default names when devices are initially added
        const getDefaultFactoryName = (devType: CanvasDevice['type'], indexOfType: number) => {
          switch (devType) {
            case 'router': return `Router${indexOfType}`;
            case 'switchL2':
            case 'switchL3': return `Switch${indexOfType}`;
            case 'pc': return `PC${indexOfType}`;
            case 'mobile': return `Mobile${indexOfType}`;
            case 'printer': return `Printer${indexOfType}`;
            case 'iot': return `IoT${indexOfType}`;
            case 'wlc': return `WLC${indexOfType}`;
            case 'firewall': return `Firewall${indexOfType}`;
            case 'hub': return `Hub${indexOfType}`;
            default: return `Device${indexOfType}`;
          }
        };

        // Helper function to extract exact required CLI commands based on topology scenario
        const getDeviceCliCommands = (routerDev: CanvasDevice): string[] => {
          const devState = deviceStates?.get(routerDev.id);
          const devCmds: string[] = ['enable'];

          if (routerDev.type === 'router') {
            const configuredPorts = devState?.ports
              ? Object.values(devState.ports).filter(p => p.ipAddress && p.subnetMask)
              : [];

            const dynamicRoutes = (devState as unknown as { dynamicRoutes?: Array<{ destination: string; subnetMask: string; area?: number }> })?.dynamicRoutes || [];
            const staticRoutes = (devState as unknown as { staticRoutes?: Array<{ destination: string; subnetMask: string; nextHop: string }> })?.staticRoutes || [];
            const bgpCfg = (devState as unknown as { bgpConfig?: { localAs: number; neighbors: string[] } })?.bgpConfig;
            const ripCfg = (devState as unknown as { ripConfig?: { version?: number; networks: string[] } })?.ripConfig;
            const ospfId = (devState as unknown as { ospfProcessId?: string })?.ospfProcessId;
            const dhcpPool = (devState as unknown as { dhcpPools?: Array<{ name: string; network: string; mask: string; defaultRouter?: string }> })?.dhcpPools || [];

            const configCommands: string[] = [];

            // Configure Hostname if different from default or specified in deviceState
            const targetHostname = devState?.hostname || routerDev.name;
            if (targetHostname) {
              configCommands.push(`hostname ${targetHostname}`);
            }

            // Configure all assigned ports
            configuredPorts.forEach(p => {
              configCommands.push(`interface ${p.id}`);
              configCommands.push(`ip address ${p.ipAddress} ${p.subnetMask}`);
              configCommands.push('no shutdown');
              configCommands.push('exit');
            });

            // Configure DHCP Pools if present
            dhcpPool.forEach(pool => {
              configCommands.push(`ip dhcp pool ${pool.name}`);
              configCommands.push(`network ${pool.network} ${pool.mask}`);
              if (pool.defaultRouter) {
                configCommands.push(`default-router ${pool.defaultRouter}`);
              }
              configCommands.push('exit');
            });

            // Configure Routing Protocols
            if (ospfId || dynamicRoutes.length > 0) {
              configCommands.push(`router ospf ${ospfId || '1'}`);
              dynamicRoutes.forEach(r => {
                configCommands.push(`network ${r.destination} ${r.subnetMask} area ${r.area ?? 0}`);
              });
              configCommands.push('exit');
            } else if (ripCfg && ripCfg.networks?.length > 0) {
              configCommands.push('router rip');
              configCommands.push(`version ${ripCfg.version || 2}`);
              ripCfg.networks.forEach(net => {
                configCommands.push(`network ${net}`);
              });
              configCommands.push('exit');
            } else if (bgpCfg && bgpCfg.localAs) {
              configCommands.push(`router bgp ${bgpCfg.localAs}`);
              (bgpCfg.neighbors || []).forEach(nbr => {
                configCommands.push(`neighbor ${nbr} remote-as ${bgpCfg.localAs}`);
              });
              configCommands.push('exit');
            } else if (staticRoutes.length > 0) {
              staticRoutes.forEach(sr => {
                configCommands.push(`ip route ${sr.destination} ${sr.subnetMask} ${sr.nextHop}`);
              });
            }

            if (configCommands.length > 0) {
              devCmds.push('configure terminal', ...configCommands);
            } else {
              devCmds.push('show ip interface brief', 'show ip route');
            }
          } else {
            // Switch configuration (L2 / L3)
            const trunkPorts = devState?.ports
              ? Object.values(devState.ports).filter(p => p.mode === 'trunk')
              : [];
            const accessPorts = devState?.ports
              ? Object.values(devState.ports).filter(p => p.mode === 'access' && typeof p.accessVlan === 'number' && p.accessVlan > 1)
              : [];

            const switchConfigCmds: string[] = [];

            // Configure Hostname if different from default
            const targetHostname = devState?.hostname || routerDev.name;
            if (targetHostname) {
              switchConfigCmds.push(`hostname ${targetHostname}`);
            }

            trunkPorts.forEach(tp => {
              switchConfigCmds.push(`interface ${tp.id}`);
              switchConfigCmds.push('switchport mode trunk');
              switchConfigCmds.push('exit');
            });

            accessPorts.forEach(ap => {
              switchConfigCmds.push(`interface ${ap.id}`);
              switchConfigCmds.push(`switchport access vlan ${ap.accessVlan}`);
              switchConfigCmds.push('exit');
            });

            if (switchConfigCmds.length > 0) {
              devCmds.push('configure terminal', ...switchConfigCmds);
            } else {
              devCmds.push('show vlan brief', 'show mac address-table');
            }
          }

          return devCmds;
        };

        const totalCliSteps = routerDevices.reduce((sum, d) => sum + (3 + getDeviceCliCommands(d).length), 0);
        const totalSteps = devices.length + connections.length +
          (pcDevices.length >= 2 ? 7 : 0) +
          (wlcDevices.length * 3) +
          (wifiDevices.length * 3) +
          (iotDevices.length * 3) +
          (printerDevices.length * 3) +
          totalCliSteps;
        let currentStep = 0;

        const updateProgress = (step: number, msg: string) => {
          window.dispatchEvent(new CustomEvent('simulation-progress', {
            detail: { active: true, current: step, total: totalSteps, message: msg }
          }));
        };

        const getElementCoords = (selector: string, fallbackX: number, fallbackY: number) => {
          if (typeof document !== 'undefined') {
            const parts = selector.split(',').map(s => s.trim());
            for (const part of parts) {
              const el = document.querySelector(part);
              if (el) {
                const rect = el.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
                }
              }
            }
          }
          return { x: fallbackX, y: fallbackY };
        };


        // 1. First click device in toolbar, then move cursor to canvas target and click to place device
        devices.forEach((dev) => {
          const currentDevices = devices.slice(0, devices.indexOf(dev) + 1);
          const devTypeKey = dev.type === ('switch' as unknown as string) ? 'switchL2' : dev.type;
          const devSelector = `[data-toolbar-device="${devTypeKey}"], [data-toolbar-device="pc"]`;

          // Step 1a: Move cursor to toolbar icon FIRST (glide without click)
          const devTypeCount = currentDevices.filter(item => item.type === dev.type).length - 1;
          const initialFactoryName = getDefaultFactoryName(dev.type, Math.max(0, devTypeCount));

          registerTimeout(() => {
            currentStep++;
            updateProgress(currentStep, isTr ? `${initialFactoryName} seçiliyor` : `Selecting ${initialFactoryName}`);
            const targetBtn = getElementCoords(devSelector, 220, 75);
            moveCursor(targetBtn.x, targetBtn.y, isTr ? `${dev.type.toUpperCase()} Seçiliyor` : `Selecting ${dev.type.toUpperCase()}`, false);
          }, delay);
          delay += 450;

          // Step 1b: Click toolbar button when cursor arrives at button (visual selection only, device placed directly at target coordinates)
          registerTimeout(() => {
            const targetBtn = getElementCoords(devSelector, 220, 75);
            moveCursor(targetBtn.x, targetBtn.y, isTr ? `${dev.type.toUpperCase()} Seçildi` : `Selected ${dev.type.toUpperCase()}`, true);
          }, delay);
          delay += 400;

          // Step 1c: Move cursor across canvas to target position (glide without click)
          registerTimeout(() => {
            const screenX = Math.min(window.innerWidth - 100, Math.max(120, dev.x + 80));
            const screenY = Math.min(window.innerHeight - 150, Math.max(150, dev.y + 120));
            moveCursor(screenX, screenY, isTr ? `${initialFactoryName} Yerleştiriliyor` : `Placing ${initialFactoryName}`, false);
          }, delay);
          delay += 450;

          // Step 1d: Click canvas position and PLACE device right as click happens
          registerTimeout(() => {
            const screenX = Math.min(window.innerWidth - 100, Math.max(120, dev.x + 80));
            const screenY = Math.min(window.innerHeight - 150, Math.max(150, dev.y + 120));
            moveCursor(screenX, screenY, isTr ? `${initialFactoryName} Eklendi` : `${initialFactoryName} Placed`, true);

            // Device is added to canvas on click in clean initial state with factory default name
            const sanitizedDevices = currentDevices.map((d, idx) => {
              if (idx === currentDevices.length - 1) {
                // If it's a PC or WiFi client being placed, start with static 169.254.x.x APIPA IP & disabled/unconfigured WiFi
                if (d.type === 'pc') {
                  const pcIndex = currentDevices.filter(item => item.type === 'pc').length;
                  const initialApipaIp = `169.254.1.${10 + pcIndex}`;
                  return { ...d, name: initialFactoryName, ip: initialApipaIp, subnet: '255.255.0.0', gateway: '', dns: '', ipConfigMode: 'static' as const };
                }
                if (d.type === 'mobile') {
                  const mobileIndex = currentDevices.filter(item => item.type === 'mobile').length;
                  const initialApipaIp = `169.254.1.${20 + mobileIndex}`;
                  return { ...d, name: initialFactoryName, ip: initialApipaIp, subnet: '255.255.0.0', wifi: d.wifi ? { ...d.wifi, enabled: false, ssid: '', password: '' } : undefined };
                }
                if (d.type === 'printer') {
                  return { ...d, name: initialFactoryName, ip: '', subnet: '255.255.255.0', gateway: '', dns: '' };
                }
                if (d.type === 'iot') {
                  return { ...d, name: initialFactoryName, ip: '', subnet: '255.255.255.0', gateway: '', dns: '' };
                }
                if (d.type === 'wlc') {
                  return { ...d, name: initialFactoryName, ip: '', subnet: '255.255.255.0', gateway: '', wifi: d.wifi ? { ...d.wifi, enabled: false, ssid: '', password: '' } : undefined };
                }
                // Routers & Switches start with factory default name (e.g. Router0, Switch0)
                return { ...d, name: initialFactoryName };
              }
              return d;
            });
            simulatedDevices = sanitizedDevices;
            setDevices(sanitizedDevices);

            // Do not initialize states with final configured routing/interfaces immediately; will be configured step-by-step
            const currentStates = new Map<string, SwitchState>();
            currentDevices.forEach(d => {
              const state = deviceStates.get(d.id);
              if (state) {
                // Clean unconfigured ports initially (no IP, default VLAN 1)
                const cleanPorts: Record<string, typeof state.ports[string]> = {};
                Object.entries(state.ports || {}).forEach(([pId, p]) => {
                  cleanPorts[pId] = {
                    ...p,
                    ipAddress: undefined,
                    subnetMask: undefined,
                    mode: 'access',
                    accessVlan: 1,
                  };
                });
                currentStates.set(d.id, {
                  ...state,
                  ports: cleanPorts,
                });
              }
            });
            simulatedStates = currentStates;
            setDeviceStates(currentStates);

            window.dispatchEvent(new CustomEvent('commit-action-event', {
              detail: { action: isTr ? `${dev.name} topolojiye eklendi` : `Added ${dev.name} to topology` }
            }));
          }, delay);
          delay += 850;
        });

        // 2. Connect cables: Only click toolbar if cable type changes (or for the first cable), otherwise connect ports directly
        let lastSelectedCableType: string | null = null;

        connections.forEach((conn) => {
          const currentConnections = connections.slice(0, connections.indexOf(conn) + 1);
          const srcDev = devices.find(d => d.id === conn.sourceDeviceId);
          const tgtDev = devices.find(d => d.id === conn.targetDeviceId);
          const cableTypeVal = (conn.cableType === 'crossover' || (conn.cableType as string) === 'cross') ? 'crossover' : (conn.cableType || 'straight');
          const cableLabel = cableTypeVal === 'crossover' ? 'CROSSOVER' : cableTypeVal.toUpperCase();
          const cableSelector = `[data-toolbar-cable="${cableTypeVal}"], [data-toolbar-cable="straight"]`;
          const isSameCableType = lastSelectedCableType === cableTypeVal;

          if (!isSameCableType) {
            lastSelectedCableType = cableTypeVal;

            // Step 2a: Move cursor to toolbar cable button FIRST (glide without click)
            registerTimeout(() => {
              currentStep++;
              updateProgress(currentStep, isTr ? `Kablo (${cableLabel}): ${srcDev?.name || ''} ➔ ${tgtDev?.name || ''}` : `Cable (${cableLabel}): ${srcDev?.name || ''} ➔ ${tgtDev?.name || ''}`);
              const cableBtnCoords = getElementCoords(cableSelector, 330, 75);
              moveCursor(cableBtnCoords.x, cableBtnCoords.y, isTr ? `${cableLabel} Kablo Seçiliyor` : `Selecting ${cableLabel} Cable`, false);
            }, delay);
            delay += 450;

            // Step 2b: Click cable button when cursor arrives at button
            registerTimeout(() => {
              const cableBtnCoords = getElementCoords(cableSelector, 330, 75);
              moveCursor(cableBtnCoords.x, cableBtnCoords.y, isTr ? `${cableLabel} Kablo Seçildi` : `Selected ${cableLabel} Cable`, true);
            }, delay);
            delay += 400;
          } else {
            // Update progress without going back to toolbar
            registerTimeout(() => {
              currentStep++;
              updateProgress(currentStep, isTr ? `Kablo (${cableLabel}): ${srcDev?.name || ''} ➔ ${tgtDev?.name || ''}` : `Cable (${cableLabel}): ${srcDev?.name || ''} ➔ ${tgtDev?.name || ''}`);
            }, delay);
          }

          // Step 2c: Move cursor to source device port
          registerTimeout(() => {
            const portName = conn.sourcePort || 'Port';
            const srcPortSelector = `[data-device-id="${srcDev?.id}"][data-port-id="${conn.sourcePort}"], [data-device-id="${srcDev?.id}"] [data-port-id="${conn.sourcePort}"], [data-device-id="${srcDev?.id}"]`;
            const srcCoords = getElementCoords(srcPortSelector, srcDev ? srcDev.x + 80 : 200, srcDev ? srcDev.y + 120 : 200);
            moveCursor(srcCoords.x, srcCoords.y, isTr ? `${srcDev?.name || ''} [${portName}] Bağlanıyor` : `Connecting to ${srcDev?.name || ''} [${portName}]`, false);
          }, delay);
          delay += 450;

          // Step 2d: Click source device port (clear click ripple & label)
          registerTimeout(() => {
            const portName = conn.sourcePort || 'Port';
            const srcPortSelector = `[data-device-id="${srcDev?.id}"][data-port-id="${conn.sourcePort}"], [data-device-id="${srcDev?.id}"] [data-port-id="${conn.sourcePort}"], [data-device-id="${srcDev?.id}"]`;
            const srcCoords = getElementCoords(srcPortSelector, srcDev ? srcDev.x + 80 : 200, srcDev ? srcDev.y + 120 : 200);
            moveCursor(srcCoords.x, srcCoords.y, isTr ? `${srcDev?.name || ''} [${portName}] Tıklandı ✓` : `${srcDev?.name || ''} [${portName}] Clicked ✓`, true);
          }, delay);
          delay += 500;

          // Step 2e: Move cursor to target device port
          registerTimeout(() => {
            const portName = conn.targetPort || 'Port';
            const tgtPortSelector = `[data-device-id="${tgtDev?.id}"][data-port-id="${conn.targetPort}"], [data-device-id="${tgtDev?.id}"] [data-port-id="${conn.targetPort}"], [data-device-id="${tgtDev?.id}"]`;
            const tgtCoords = getElementCoords(tgtPortSelector, tgtDev ? tgtDev.x + 80 : 350, tgtDev ? tgtDev.y + 120 : 250);
            moveCursor(tgtCoords.x, tgtCoords.y, isTr ? `${tgtDev?.name || ''} [${portName}] Bağlanıyor` : `Connecting to ${tgtDev?.name || ''} [${portName}]`, false);
          }, delay);
          delay += 450;

          // Step 2f: Click target device port to complete connection & record in timeline history
          registerTimeout(() => {
            const portName = conn.targetPort || 'Port';
            const tgtPortSelector = `[data-device-id="${tgtDev?.id}"][data-port-id="${conn.targetPort}"], [data-device-id="${tgtDev?.id}"] [data-port-id="${conn.targetPort}"], [data-device-id="${tgtDev?.id}"]`;
            const tgtCoords = getElementCoords(tgtPortSelector, tgtDev ? tgtDev.x + 80 : 350, tgtDev ? tgtDev.y + 120 : 250);
            moveCursor(tgtCoords.x, tgtCoords.y, isTr ? `${tgtDev?.name || ''} [${portName}] Bağlandı ✓` : `${tgtDev?.name || ''} [${portName}] Connected ✓`, true);
            setConnections(currentConnections);

            window.dispatchEvent(new CustomEvent('commit-action-event', {
              detail: { action: isTr ? `${srcDev?.name || ''} (${conn.sourcePort}) ➔ ${tgtDev?.name || ''} (${conn.targetPort}) [${cableLabel}] bağlandı` : `Connected ${srcDev?.name || ''} (${conn.sourcePort}) ➔ ${tgtDev?.name || ''} (${conn.targetPort}) [${cableLabel}]` }
            }));
          }, delay);
          delay += 950;
        });

        // 3. PC Device Configuration (Double Click to open window, enter IP & Subnet Mask visually as two distinct steps, close window)
        if (pcDevices.length >= 2) {
          const pc1 = pcDevices[0];
          const pc2 = pcDevices[1];
          const targetPc1Ip = pc1.ip || '192.168.1.10';
          const targetPc2Ip = pc2.ip || '192.168.1.11';
          const defaultSubnet = '255.255.255.0';

          // PC-1: Double click to open configuration window
          registerTimeout(() => {
            currentStep++;
            updateProgress(currentStep, isTr ? `${pc1.name} IP ayarları açılıyor` : `Opening ${pc1.name} IP settings`);
            moveCursor(pc1.x + 80, pc1.y + 120, isTr ? `${pc1.name} Çift Tıkla (Aç)` : `Double Click ${pc1.name} (Open)`, true);
            useMultiWindowStore.getState().openDeviceWindow(pc1.id, 'pc', 'settings');
          }, delay);
          delay += 1100;

          // PC-1: IP Address input typing & visual populating & record in timeline history
          registerTimeout(() => {
            currentStep++;
            updateProgress(currentStep, `${pc1.name} IP Adresi: ${targetPc1Ip}`);
            const ipCoords = getElementCoords('input[placeholder*="192.168.1.100"], input[placeholder*="192."], input[name="ip"]', window.innerWidth / 2 - 100, window.innerHeight / 2 - 40);
            moveCursor(ipCoords.x, ipCoords.y, isTr ? `${pc1.name} IP: ${targetPc1Ip}` : `${pc1.name} IP: ${targetPc1Ip}`, false, targetPc1Ip);
            pc1.ip = targetPc1Ip;
            setDevices(devices.map(d => d.id === pc1.id ? { ...d, ip: targetPc1Ip } : d));
            const ipEl = (document.querySelector('input[placeholder*="192.168.1.100"]') || document.querySelector('input[placeholder*="192."]') || document.querySelector('input[name="ip"]')) as HTMLInputElement | null;
            if (ipEl) {
              ipEl.focus();
              ipEl.value = targetPc1Ip;
              ipEl.dispatchEvent(new Event('input', { bubbles: true }));
              ipEl.dispatchEvent(new Event('change', { bubbles: true }));
            }
            window.dispatchEvent(new CustomEvent('commit-action-event', {
              detail: { action: isTr ? `${pc1.name} IP: ${targetPc1Ip} ayarlandı` : `Set ${pc1.name} IP: ${targetPc1Ip}` }
            }));
          }, delay);
          delay += 1350;

          // PC-1: Subnet Mask input typing & visual populating & record in timeline history
          registerTimeout(() => {
            currentStep++;
            updateProgress(currentStep, `${pc1.name} Alt Ağ Maskesi: ${defaultSubnet}`);
            const subnetCoords = getElementCoords('input[placeholder*="255.255.255.0"], input[placeholder*="255."], input[name="subnet"]', window.innerWidth / 2 + 100, window.innerHeight / 2 - 40);
            moveCursor(subnetCoords.x, subnetCoords.y, isTr ? `${pc1.name} Maske: ${defaultSubnet}` : `${pc1.name} Mask: ${defaultSubnet}`, false, defaultSubnet);
            pc1.subnet = defaultSubnet;
            const updated = simulatedDevices.map(d => d.id === pc1.id ? { ...d, name: pc1.name, ip: targetPc1Ip, subnet: defaultSubnet } : d);
            simulatedDevices = updated;
            setDevices(updated);
            const subnetEl = (document.querySelector('input[placeholder*="255.255.255.0"]') || document.querySelector('input[placeholder*="255."]') || document.querySelector('input[name="subnet"]')) as HTMLInputElement | null;
            if (subnetEl) {
              subnetEl.focus();
              subnetEl.value = defaultSubnet;
              subnetEl.dispatchEvent(new Event('input', { bubbles: true }));
              subnetEl.dispatchEvent(new Event('change', { bubbles: true }));
            }
            window.dispatchEvent(new CustomEvent('commit-action-event', {
              detail: { action: isTr ? `${pc1.name} Yapılandırıldı (IP: ${targetPc1Ip}, Maske: ${defaultSubnet})` : `Configured ${pc1.name} (IP: ${targetPc1Ip}, Mask: ${defaultSubnet})` }
            }));
          }, delay);
          delay += 1350;

          // PC-1: Close window after configuration (move to close button then click)
          registerTimeout(() => {
            const closeBtn = getElementCoords(`[data-window-close="${pc1.id}"]`, window.innerWidth / 2 + 220, window.innerHeight / 2 - 180);
            moveCursor(closeBtn.x, closeBtn.y, isTr ? `${pc1.name} Kapat Butonuna Gidiliyor` : `Moving to ${pc1.name} Close Button`, false);
          }, delay);
          delay += 400;

          registerTimeout(() => {
            const closeBtn = getElementCoords(`[data-window-close="${pc1.id}"]`, window.innerWidth / 2 + 220, window.innerHeight / 2 - 180);
            moveCursor(closeBtn.x, closeBtn.y, isTr ? `${pc1.name} Kapat ✕` : `Close ${pc1.name} ✕`, true);
            useMultiWindowStore.getState().closeDeviceWindow(pc1.id);
          }, delay);
          delay += 600;

          // PC-2: Double click to open configuration window
          registerTimeout(() => {
            currentStep++;
            updateProgress(currentStep, isTr ? `${pc2.name} IP ayarları açılıyor` : `Opening ${pc2.name} IP settings`);
            moveCursor(pc2.x + 80, pc2.y + 120, isTr ? `${pc2.name} Çift Tıkla (Aç)` : `Double Click ${pc2.name} (Open)`, true);
            useMultiWindowStore.getState().openDeviceWindow(pc2.id, 'pc', 'settings');
          }, delay);
          delay += 1100;

          // PC-2: IP Address input typing & visual populating & record in timeline history
          registerTimeout(() => {
            currentStep++;
            updateProgress(currentStep, `${pc2.name} IP Adresi: ${targetPc2Ip}`);
            const ipCoords = getElementCoords('input[placeholder*="192.168.1.100"], input[placeholder*="192."], input[name="ip"]', window.innerWidth / 2 - 100, window.innerHeight / 2 - 40);
            moveCursor(ipCoords.x, ipCoords.y, isTr ? `${pc2.name} IP: ${targetPc2Ip}` : `${pc2.name} IP: ${targetPc2Ip}`, false, targetPc2Ip);
            pc2.ip = targetPc2Ip;
            setDevices(devices.map(d => d.id === pc2.id ? { ...d, ip: targetPc2Ip } : d));
            const ipEl = (document.querySelector('input[placeholder*="192.168.1.100"]') || document.querySelector('input[placeholder*="192."]') || document.querySelector('input[name="ip"]')) as HTMLInputElement | null;
            if (ipEl) {
              ipEl.focus();
              ipEl.value = targetPc2Ip;
              ipEl.dispatchEvent(new Event('input', { bubbles: true }));
              ipEl.dispatchEvent(new Event('change', { bubbles: true }));
            }
            window.dispatchEvent(new CustomEvent('commit-action-event', {
              detail: { action: isTr ? `${pc2.name} IP: ${targetPc2Ip} ayarlandı` : `Set ${pc2.name} IP: ${targetPc2Ip}` }
            }));
          }, delay);
          delay += 1350;

          // PC-2: Subnet Mask input typing & visual populating & record in timeline history
          registerTimeout(() => {
            currentStep++;
            updateProgress(currentStep, `${pc2.name} Alt Ağ Maskesi: ${defaultSubnet}`);
            const subnetCoords = getElementCoords('input[placeholder*="255.255.255.0"], input[placeholder*="255."], input[name="subnet"]', window.innerWidth / 2 + 100, window.innerHeight / 2 - 40);
            moveCursor(subnetCoords.x, subnetCoords.y, isTr ? `${pc2.name} Maske: ${defaultSubnet}` : `${pc2.name} Mask: ${defaultSubnet}`, false, defaultSubnet);
            pc2.subnet = defaultSubnet;
            const updated = simulatedDevices.map(d => d.id === pc2.id ? { ...d, name: pc2.name, ip: targetPc2Ip, subnet: defaultSubnet } : d);
            simulatedDevices = updated;
            setDevices(updated);
            const subnetEl = (document.querySelector('input[placeholder*="255.255.255.0"]') || document.querySelector('input[placeholder*="255."]') || document.querySelector('input[name="subnet"]')) as HTMLInputElement | null;
            if (subnetEl) {
              subnetEl.focus();
              subnetEl.value = defaultSubnet;
              subnetEl.dispatchEvent(new Event('input', { bubbles: true }));
              subnetEl.dispatchEvent(new Event('change', { bubbles: true }));
            }
            window.dispatchEvent(new CustomEvent('commit-action-event', {
              detail: { action: isTr ? `${pc2.name} Yapılandırıldı (IP: ${targetPc2Ip}, Maske: ${defaultSubnet})` : `Configured ${pc2.name} (IP: ${targetPc2Ip}, Mask: ${defaultSubnet})` }
            }));
          }, delay);
          delay += 1350;

          // PC-2: Close window after configuration (move to close button then click)
          registerTimeout(() => {
            const closeBtn = getElementCoords(`[data-window-close="${pc2.id}"]`, window.innerWidth / 2 + 220, window.innerHeight / 2 - 180);
            moveCursor(closeBtn.x, closeBtn.y, isTr ? `${pc2.name} Kapat Butonuna Gidiliyor` : `Moving to ${pc2.name} Close Button`, false);
          }, delay);
          delay += 400;

          registerTimeout(() => {
            const closeBtn = getElementCoords(`[data-window-close="${pc2.id}"]`, window.innerWidth / 2 + 220, window.innerHeight / 2 - 180);
            moveCursor(closeBtn.x, closeBtn.y, isTr ? `${pc2.name} Kapat ✕` : `Close ${pc2.name} ✕`, true);
            useMultiWindowStore.getState().closeDeviceWindow(pc2.id);
          }, delay);
          delay += 600;

          // 4. Test Ping via CMD on PC-1 (Perfect synchronization with pc-auto-type)
          const targetIp = targetPc2Ip;
          const fullCmd = `ping ${targetIp}`;
          registerTimeout(() => {
            currentStep++;
            updateProgress(currentStep, isTr ? `CMD Terminali Açılıyor (${pc1.name})` : `Opening CMD Terminal (${pc1.name})`);
            moveCursor(pc1.x + 80, pc1.y + 120, isTr ? `${pc1.name} CMD Aç` : `Open ${pc1.name} CMD`, true);
            useMultiWindowStore.getState().openDeviceWindow(pc1.id, 'pc', 'desktop');
          }, delay);
          delay += 1100;

          // Move cursor to input and trigger synchronized character typing
          registerTimeout(() => {
            currentStep++;
            updateProgress(currentStep, isTr ? `Komut Yazılıyor: ${fullCmd}` : `Typing Command: ${fullCmd}`);
            const termCoords = getElementCoords('input[placeholder*="ping"], .custom-scrollbar input, [data-modal-content="true"] input', window.innerWidth / 2, window.innerHeight / 2 + 100);
            moveCursor(termCoords.x, termCoords.y, isTr ? `Komut: ${fullCmd}` : `Command: ${fullCmd}`, false);
            window.dispatchEvent(
              new CustomEvent('pc-auto-type', {
                detail: { deviceId: pc1.id, command: fullCmd },
              })
            );
          }, delay);
          delay += Math.max(1100, fullCmd.length * 75 + 300);

          // Enter key press & timeline logging as command finishes typing
          registerTimeout(() => {
            const termCoords = getElementCoords('input[placeholder*="ping"], .custom-scrollbar input, [data-modal-content="true"] input', window.innerWidth / 2, window.innerHeight / 2 + 100);
            moveCursor(termCoords.x + 35, termCoords.y, isTr ? `Enter ↵ (${fullCmd})` : `Enter ↵ (${fullCmd})`, true, fullCmd);
            window.dispatchEvent(new CustomEvent('commit-action-event', {
              detail: { action: isTr ? `${pc1.name} CMD: ${fullCmd}` : `${pc1.name} CMD: ${fullCmd}` }
            }));
          }, delay);
          delay += 900;

          // Show Ping results badge & let video record the ping reply lines
          registerTimeout(() => {
            currentStep++;
            updateProgress(currentStep, isTr ? `Komut Başarıyla Sonuçlandı! Paketler İletildi (Reply from ${targetIp})` : `Command Succeeded! Packets Delivered (Reply from ${targetIp})`);
            moveCursor(window.innerWidth / 2, window.innerHeight / 2 + 30, isTr ? `Komut Başarıyla Sonuçlandı! (Reply from ${targetIp}: bytes=32 time=1ms TTL=128)` : `Command Succeeded! (Reply from ${targetIp}: bytes=32 time=1ms TTL=128)`, false);
          }, delay);
          delay += 3000;

          // Close PC-1 CMD window after showing results (move to close button then click)
          registerTimeout(() => {
            const closeBtn = getElementCoords(`[data-window-close="${pc1.id}"]`, window.innerWidth / 2 + 220, window.innerHeight / 2 - 200);
            moveCursor(closeBtn.x, closeBtn.y, isTr ? `${pc1.name} Kapat Butonuna Gidiliyor` : `Moving to ${pc1.name} Close Button`, false);
          }, delay);
          delay += 400;

          registerTimeout(() => {
            const closeBtn = getElementCoords(`[data-window-close="${pc1.id}"]`, window.innerWidth / 2 + 220, window.innerHeight / 2 - 200);
            moveCursor(closeBtn.x, closeBtn.y, isTr ? `${pc1.name} CMD Kapat ✕` : `Close ${pc1.name} CMD ✕`, true);
            useMultiWindowStore.getState().closeDeviceWindow(pc1.id);
          }, delay);
          delay += 600;
        }

        // 5. Router / Switch CLI Configuration Step (Synchronized character-by-character typing with terminal-auto-type)
        if (routerDevices.length > 0) {
          routerDevices.forEach((routerDev) => {
            const devState = deviceStates?.get(routerDev.id);
            const devCmds = getDeviceCliCommands(routerDev);

            registerTimeout(() => {
              currentStep++;
              updateProgress(currentStep, isTr ? `${routerDev.name} CLI Konsolu Açılıyor` : `Opening ${routerDev.name} CLI Console`);
              moveCursor(routerDev.x + 80, routerDev.y + 120, isTr ? `${routerDev.name} Konsol Aç` : `Open ${routerDev.name} Console`, true);
              useMultiWindowStore.getState().openDeviceWindow(routerDev.id, routerDev.type, 'console');
            }, delay);
            delay += 1100;

            // Synchronized CLI command typing per command line
            devCmds.forEach((cliCmd) => {
              // Move cursor to input and trigger character typing in Terminal
              registerTimeout(() => {
                currentStep++;
                updateProgress(currentStep, isTr ? `${routerDev.name} CLI: ${cliCmd}` : `${routerDev.name} CLI: ${cliCmd}`);
                const cliCoords = getElementCoords('input[placeholder*="enable"], input[type="text"], [data-modal-content="true"] input', window.innerWidth / 2, window.innerHeight / 2 + 120);
                moveCursor(cliCoords.x, cliCoords.y, isTr ? `${routerDev.name} CLI: ${cliCmd}` : `${routerDev.name} CLI: ${cliCmd}`, false);
                window.dispatchEvent(
                  new CustomEvent('terminal-auto-type', {
                    detail: { deviceId: routerDev.id, command: cliCmd },
                  })
                );
              }, delay);
              delay += Math.max(850, cliCmd.length * 70 + 250);

              // Enter key press & timeline logging as command finishes typing
              registerTimeout(() => {
                const cliCoords = getElementCoords('input[placeholder*="enable"], input[type="text"], [data-modal-content="true"] input', window.innerWidth / 2, window.innerHeight / 2 + 120);
                moveCursor(cliCoords.x + 35, cliCoords.y, isTr ? `Enter ↵ (${cliCmd})` : `Enter ↵ (${cliCmd})`, true, cliCmd);
                window.dispatchEvent(new CustomEvent('commit-action-event', {
                  detail: { action: isTr ? `${routerDev.name} CLI: ${cliCmd}` : `${routerDev.name} CLI: ${cliCmd}` }
                }));
              }, delay);
              delay += 800;
            });

            // Show CLI configuration output result & record in timeline history
            registerTimeout(() => {
              currentStep++;
              const resultMsg = routerDev.type === 'router'
                ? (isTr ? `${routerDev.name} CLI Konfigüre Edildi (%LINK-5-CHANGED: FastEthernet0/0 state to up)` : `${routerDev.name} CLI Configured (%LINK-5-CHANGED: FastEthernet0/0 state to up)`)
                : (routerDev.vlan && routerDev.vlan > 1
                    ? (isTr ? `${routerDev.name} VLAN ${routerDev.vlan} Konfigüre Edildi` : `${routerDev.name} VLAN ${routerDev.vlan} Configured`)
                    : (isTr ? `${routerDev.name} Switch Durumu Kontrol Edildi` : `${routerDev.name} Switch Status Verified`));
              updateProgress(currentStep, resultMsg);
              moveCursor(window.innerWidth / 2, window.innerHeight / 2 + 50, isTr ? `CLI İşlemi Başarılı!` : `CLI Operation Succeeded!`, false);

              // Apply this router/switch's configured state to active device states & update device name from factory default
              if (devState) {
                const updated = new Map(simulatedStates);
                updated.set(routerDev.id, devState);
                simulatedStates = updated;
                setDeviceStates(updated);
              }

              const updatedDevs = simulatedDevices.map(d => d.id === routerDev.id ? { ...d, name: routerDev.name } : d);
              simulatedDevices = updatedDevs;
              setDevices(updatedDevs);

              window.dispatchEvent(new CustomEvent('commit-action-event', {
                detail: { action: resultMsg }
              }));
            }, delay);
            delay += 2500;

            // Close Router/Switch CLI window (move to close button then click)
            registerTimeout(() => {
              const closeBtn = getElementCoords(`[data-window-close="${routerDev.id}"]`, window.innerWidth / 2 + 220, window.innerHeight / 2 - 200);
              moveCursor(closeBtn.x, closeBtn.y, isTr ? `${routerDev.name} Kapat Butonuna Gidiliyor` : `Moving to ${routerDev.name} Close Button`, false);
            }, delay);
            delay += 400;

            registerTimeout(() => {
              const closeBtn = getElementCoords(`[data-window-close="${routerDev.id}"]`, window.innerWidth / 2 + 220, window.innerHeight / 2 - 200);
              moveCursor(closeBtn.x, closeBtn.y, isTr ? `${routerDev.name} Konsol Kapat ✕` : `Close ${routerDev.name} Console ✕`, true);
              useMultiWindowStore.getState().closeDeviceWindow(routerDev.id);
            }, delay);
            delay += 600;
          });
        }

        // 6. Wi-Fi / Mobile Device Configuration Step
        if (wifiDevices.length > 0) {
          wifiDevices.forEach((wifiDev) => {
            const ssid = wifiDev.wifi?.ssid || 'NetSim-WiFi';
            const pass = wifiDev.wifi?.password || 'password123';

            // Open Wireless Config Window
            registerTimeout(() => {
              currentStep++;
              updateProgress(currentStep, isTr ? `${wifiDev.name} Wi-Fi Ayarları Açılıyor` : `Opening ${wifiDev.name} Wi-Fi Settings`);
              moveCursor(wifiDev.x + 80, wifiDev.y + 120, isTr ? `${wifiDev.name} Wi-Fi Aç` : `Open ${wifiDev.name} Wi-Fi`, true);
              useMultiWindowStore.getState().openDeviceWindow(wifiDev.id, wifiDev.type, 'wireless');
            }, delay);
            delay += 1100;

            // Type SSID & Password & update state
            registerTimeout(() => {
              currentStep++;
              updateProgress(currentStep, isTr ? `${wifiDev.name} Wi-Fi: SSID '${ssid}' Ayarlanıyor` : `${wifiDev.name} Wi-Fi: Setting SSID '${ssid}'`);
              const ssidCoords = getElementCoords('input[placeholder*="SSID"], input[name="ssid"], [data-modal-content="true"] input', window.innerWidth / 2, window.innerHeight / 2 - 20);
              moveCursor(ssidCoords.x, ssidCoords.y, isTr ? `SSID: ${ssid}` : `SSID: ${ssid}`, false, ssid);

              const updated = simulatedDevices.map(d => d.id === wifiDev.id ? {
                ...d,
                name: wifiDev.name,
                wifi: d.wifi ? { ...d.wifi, enabled: true, ssid, password: pass } : { enabled: true, ssid, password: pass, mode: 'client' as const }
              } : d);
              simulatedDevices = updated;
              setDevices(updated);

              window.dispatchEvent(new CustomEvent('commit-action-event', {
                detail: { action: isTr ? `${wifiDev.name} Wi-Fi Ayarlandı: SSID '${ssid}'` : `Configured ${wifiDev.name} Wi-Fi: SSID '${ssid}'` }
              }));
            }, delay);
            delay += 1350;

            // Close Wireless Window (move to close button then click)
            registerTimeout(() => {
              const closeBtn = getElementCoords(`[data-window-close="${wifiDev.id}"]`, window.innerWidth / 2 + 200, window.innerHeight / 2 - 200);
              moveCursor(closeBtn.x, closeBtn.y, isTr ? `${wifiDev.name} Kapat Butonuna Gidiliyor` : `Moving to ${wifiDev.name} Close Button`, false);
            }, delay);
            delay += 400;

            registerTimeout(() => {
              const closeBtn = getElementCoords(`[data-window-close="${wifiDev.id}"]`, window.innerWidth / 2 + 200, window.innerHeight / 2 - 200);
              moveCursor(closeBtn.x, closeBtn.y, isTr ? `${wifiDev.name} Kapat ✕` : `Close ${wifiDev.name} ✕`, true);
              useMultiWindowStore.getState().closeDeviceWindow(wifiDev.id);
            }, delay);
            delay += 600;
          });
        }

        // 7. Printer Device Configuration Step
        if (printerDevices.length > 0) {
          printerDevices.forEach((printerDev) => {
            const printerIp = printerDev.ip || '192.168.1.20';

            // Open Printer Window
            registerTimeout(() => {
              currentStep++;
              updateProgress(currentStep, isTr ? `${printerDev.name} Yazıcı Ayarları Açılıyor` : `Opening ${printerDev.name} Printer Settings`);
              moveCursor(printerDev.x + 80, printerDev.y + 120, isTr ? `${printerDev.name} Aç` : `Open ${printerDev.name}`, true);
              useMultiWindowStore.getState().openDeviceWindow(printerDev.id, 'printer', 'console');
            }, delay);
            delay += 1100;

            // Record Printer IP & Service state
            registerTimeout(() => {
              currentStep++;
              updateProgress(currentStep, isTr ? `${printerDev.name} Ağ Yazıcısı Aktif (IP: ${printerIp})` : `${printerDev.name} Network Printer Ready (IP: ${printerIp})`);
              moveCursor(window.innerWidth / 2, window.innerHeight / 2 - 10, isTr ? `Yazıcı IP: ${printerIp}` : `Printer IP: ${printerIp}`, false);

              const updated = simulatedDevices.map(d => d.id === printerDev.id ? { ...d, name: printerDev.name, ip: printerIp } : d);
              simulatedDevices = updated;
              setDevices(updated);

              window.dispatchEvent(new CustomEvent('commit-action-event', {
                detail: { action: isTr ? `${printerDev.name} Ağ Yazıcısı Yapılandırıldı (IP: ${printerIp})` : `Configured ${printerDev.name} Network Printer (IP: ${printerIp})` }
              }));
            }, delay);
            delay += 1200;

            // Close Printer Window (move to close button then click)
            registerTimeout(() => {
              const closeBtn = getElementCoords(`[data-window-close="${printerDev.id}"]`, window.innerWidth / 2 + 200, window.innerHeight / 2 - 200);
              moveCursor(closeBtn.x, closeBtn.y, isTr ? `${printerDev.name} Kapat Butonuna Gidiliyor` : `Moving to ${printerDev.name} Close Button`, false);
            }, delay);
            delay += 400;

            registerTimeout(() => {
              const closeBtn = getElementCoords(`[data-window-close="${printerDev.id}"]`, window.innerWidth / 2 + 200, window.innerHeight / 2 - 200);
              moveCursor(closeBtn.x, closeBtn.y, isTr ? `${printerDev.name} Kapat ✕` : `Close ${printerDev.name} ✕`, true);
              useMultiWindowStore.getState().closeDeviceWindow(printerDev.id);
            }, delay);
            delay += 600;
          });
        }

        // 8. IoT Device Configuration Step (Sensor reading & Actuator setup)
        if (iotDevices.length > 0) {
          iotDevices.forEach((iotDev) => {
            const iotIp = iotDev.ip || '192.168.1.30';
            const kind = iotDev.iot?.kind || 'sensor';
            const sensorType = iotDev.iot?.sensorType || 'temperature';
            const iotLabel = kind === 'sensor' ? `${sensorType.toUpperCase()} Sensörü` : `${kind.toUpperCase()} Aktüatörü`;

            // Open IoT Window
            registerTimeout(() => {
              currentStep++;
              updateProgress(currentStep, isTr ? `${iotDev.name} (${iotLabel}) Ayarları Açılıyor` : `Opening ${iotDev.name} (${iotLabel}) Settings`);
              moveCursor(iotDev.x + 80, iotDev.y + 120, isTr ? `${iotDev.name} Aç` : `Open ${iotDev.name}`, true);
              useMultiWindowStore.getState().openDeviceWindow(iotDev.id, 'iot', 'console');
            }, delay);
            delay += 1100;

            // Record IoT Panel state
            registerTimeout(() => {
              currentStep++;
              updateProgress(currentStep, isTr ? `${iotDev.name} (${iotLabel}) Servisi Aktif (IP: ${iotIp})` : `${iotDev.name} (${iotLabel}) Service Active (IP: ${iotIp})`);
              moveCursor(window.innerWidth / 2, window.innerHeight / 2 - 10, isTr ? `${iotLabel} IP: ${iotIp}` : `${iotLabel} IP: ${iotIp}`, false);

              const updated = simulatedDevices.map(d => d.id === iotDev.id ? { ...d, name: iotDev.name, ip: iotIp } : d);
              simulatedDevices = updated;
              setDevices(updated);

              window.dispatchEvent(new CustomEvent('commit-action-event', {
                detail: { action: isTr ? `${iotDev.name} [${iotLabel}] Yapılandırıldı (IP: ${iotIp})` : `Configured ${iotDev.name} [${iotLabel}] (IP: ${iotIp})` }
              }));
            }, delay);
            delay += 1200;

            // Close IoT Window (move to close button then click)
            registerTimeout(() => {
              const closeBtn = getElementCoords(`[data-window-close="${iotDev.id}"]`, window.innerWidth / 2 + 200, window.innerHeight / 2 - 200);
              moveCursor(closeBtn.x, closeBtn.y, isTr ? `${iotDev.name} Kapat Butonuna Gidiliyor` : `Moving to ${iotDev.name} Close Button`, false);
            }, delay);
            delay += 400;

            registerTimeout(() => {
              const closeBtn = getElementCoords(`[data-window-close="${iotDev.id}"]`, window.innerWidth / 2 + 200, window.innerHeight / 2 - 200);
              moveCursor(closeBtn.x, closeBtn.y, isTr ? `${iotDev.name} Kapat ✕` : `Close ${iotDev.name} ✕`, true);
              useMultiWindowStore.getState().closeDeviceWindow(iotDev.id);
            }, delay);
            delay += 600;
          });
        }

        // 9. WLC / Lightweight AP Configuration Step
        if (wlcDevices.length > 0) {
          wlcDevices.forEach((wlcDev) => {
            const wlcIp = wlcDev.ip || '192.168.1.250';
            const wlanSsid = wlcDev.wifi?.ssid || 'Enterprise-Corp';

            // Open WLC Config Window
            registerTimeout(() => {
              currentStep++;
              updateProgress(currentStep, isTr ? `${wlcDev.name} WLC Yönetim Paneli Açılıyor` : `Opening ${wlcDev.name} WLC Management Panel`);
              moveCursor(wlcDev.x + 80, wlcDev.y + 120, isTr ? `${wlcDev.name} Yönetim Aç` : `Open ${wlcDev.name} Management`, true);
              useMultiWindowStore.getState().openDeviceWindow(wlcDev.id, wlcDev.type, 'wireless');
            }, delay);
            delay += 1100;

            // Configure WLAN Profile on WLC
            registerTimeout(() => {
              currentStep++;
              updateProgress(currentStep, isTr ? `${wlcDev.name} WLAN Profili Oluşturuluyor: '${wlanSsid}'` : `${wlcDev.name} Creating WLAN Profile: '${wlanSsid}'`);
              moveCursor(window.innerWidth / 2, window.innerHeight / 2 - 10, isTr ? `WLAN: ${wlanSsid} (WPA2-Enterprise)` : `WLAN: ${wlanSsid} (WPA2-Enterprise)`, false);

              const updated = simulatedDevices.map(d => d.id === wlcDev.id ? {
                ...d,
                name: wlcDev.name,
                ip: wlcIp,
                wifi: d.wifi ? { ...d.wifi, enabled: true, ssid: wlanSsid } : { enabled: true, ssid: wlanSsid, mode: 'ap' as const }
              } : d);
              simulatedDevices = updated;
              setDevices(updated);

              window.dispatchEvent(new CustomEvent('commit-action-event', {
                detail: { action: isTr ? `${wlcDev.name} WLC: WLAN '${wlanSsid}' & CAPWAP Tüneli Aktif (IP: ${wlcIp})` : `${wlcDev.name} WLC: WLAN '${wlanSsid}' & CAPWAP Tunnel Active (IP: ${wlcIp})` }
              }));
            }, delay);
            delay += 1200;

            // Close WLC Window (move to close button then click)
            registerTimeout(() => {
              const closeBtn = getElementCoords(`[data-window-close="${wlcDev.id}"]`, window.innerWidth / 2 + 200, window.innerHeight / 2 - 200);
              moveCursor(closeBtn.x, closeBtn.y, isTr ? `${wlcDev.name} Kapat Butonuna Gidiliyor` : `Moving to ${wlcDev.name} Close Button`, false);
            }, delay);
            delay += 400;

            registerTimeout(() => {
              const closeBtn = getElementCoords(`[data-window-close="${wlcDev.id}"]`, window.innerWidth / 2 + 200, window.innerHeight / 2 - 200);
              moveCursor(closeBtn.x, closeBtn.y, isTr ? `${wlcDev.name} Kapat ✕` : `Close ${wlcDev.name} ✕`, true);
              useMultiWindowStore.getState().closeDeviceWindow(wlcDev.id);
            }, delay);
            delay += 600;
          });
        }

        // Final step: Finish, hide virtual cursor, and show summary note
        const projName = data.projectName || (isTr ? 'Topoloji' : 'Topology');
        registerTimeout(() => {
          hideCursor();
          setDeviceStates(deviceStates);
          window.dispatchEvent(new CustomEvent('simulation-progress', { detail: { active: false, current: totalSteps, total: totalSteps, message: isTr ? `${projName} Tamamlandı! 🎉` : `${projName} Completed! 🎉` } }));
          window.removeEventListener('simulation-stop', onStopReq);
          window.dispatchEvent(new CustomEvent('add-summary-note'));
        }, delay + 600);
      } else {
        setDevices(data.devices);
        setConnections(data.connections);
        setDeviceStates(data.deviceStates);
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('add-summary-note'));
        }, 500);
      }
    },
    [
      isTr,
      resetWorkspaceUiState,
      resetToEmptyProject,
      setDevices,
      setConnections,
      setDeviceStates,
      setNotes,
      setZoom,
      setPan,
      setProjectName,
    ]
  );

  useEffect(() => {
    const handleOpenGenerator = () => setIsGeneratorOpen(true);
    window.addEventListener('trigger-topology-generator', handleOpenGenerator);
    return () => window.removeEventListener('trigger-topology-generator', handleOpenGenerator);
  }, [setIsGeneratorOpen]);

  const handleNewProject = useCallback(() => {
    setProjectSearchQuery('');
    closeExam();
    resetWorkspaceUiState();
    runWithSaveGuard(() => setShowProjectPicker(true));
  }, [closeExam, resetWorkspaceUiState, runWithSaveGuard, setProjectSearchQuery, setShowProjectPicker]);

  // Draggable refresh network report saved position
  useEffect(() => {
    if (!refreshNetworkReport?.show || !refreshReportRef.current) return;
    const el = refreshReportRef.current;
    if (isMobile) {
      el.style.left = '';
      el.style.top = '';
      el.style.right = '';
      el.style.bottom = '';
      el.style.transform = '';
      el.style.position = '';
      return;
    }
    const parsed = safeGetJSON<{ x: number; y: number } | null>('draggable_position_refresh-network-report', null);
    if (parsed && typeof parsed.x === 'number' && typeof parsed.y === 'number') {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const rect = el.getBoundingClientRect();
      const safeX = Math.max(4, Math.min(parsed.x, vw - rect.width - 4));
      const safeY = Math.max(128, Math.min(parsed.y, vh - rect.height - 4));
      el.style.position = 'fixed';
      el.style.left = `${safeX}px`;
      el.style.top = `${safeY}px`;
      el.style.right = 'auto';
      el.style.bottom = 'auto';
      el.style.transform = 'none';
    }
  }, [refreshNetworkReport?.show, isMobile, refreshReportRef]);

  return {
    closeEscLikeWindows,
    runWithSaveGuard,
    handleGeneratedTopology,
    handleNewProject,
  };
}
