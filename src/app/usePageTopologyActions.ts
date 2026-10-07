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
        const routerCliCmds = ['enable', 'configure terminal', 'interface FastEthernet0/0', 'ip address 192.168.1.1 255.255.255.0', 'no shutdown'];
        const totalSteps = devices.length + connections.length + (pcDevices.length >= 2 ? 5 : 0) + (routerDevices.length * (3 + routerCliCmds.length));
        let currentStep = 0;

        const updateProgress = (step: number, msg: string) => {
          window.dispatchEvent(new CustomEvent('simulation-progress', {
            detail: { active: true, current: step, total: totalSteps, message: msg }
          }));
        };

        const getElementCoords = (selector: string, fallbackX: number, fallbackY: number) => {
          if (typeof document !== 'undefined') {
            const el = document.querySelector(selector);
            if (el) {
              const rect = el.getBoundingClientRect();
              return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
            }
          }
          return { x: fallbackX, y: fallbackY };
        };

        // 1. Click device icon in toolbar -> Device is automatically placed at its target canvas coordinates
        devices.forEach((dev) => {
          const currentDevices = devices.slice(0, devices.indexOf(dev) + 1);

          // Step 1a: Move cursor to toolbar icon, click it & immediately spawn device on canvas
          registerTimeout(() => {
            currentStep++;
            updateProgress(currentStep, isTr ? `${dev.name} ekleniyor` : `Adding ${dev.name}`);
            const targetBtnEl = document.querySelector(`[data-toolbar-device="${dev.type}"]`) as HTMLButtonElement | null;
            if (targetBtnEl) targetBtnEl.click();
            const targetBtn = getElementCoords(`[data-toolbar-device="${dev.type}"]`, 220, 75);
            moveCursor(targetBtn.x, targetBtn.y, isTr ? `${dev.type.toUpperCase()} Seç` : `Select ${dev.type.toUpperCase()}`, true);

            // Automatically place device at its canvas coordinates
            setDevices(currentDevices);

            const currentStates = new Map<string, SwitchState>();
            currentDevices.forEach(d => {
              const state = deviceStates.get(d.id);
              if (state) currentStates.set(d.id, state);
            });
            setDeviceStates(currentStates);

            window.dispatchEvent(new CustomEvent('commit-action-event', {
              detail: { action: isTr ? `${dev.name} topolojiye eklendi` : `Added ${dev.name} to topology` }
            }));
          }, delay);
          delay += 1100;

          // Step 1b: Cursor highlights the placed device at its target position
          registerTimeout(() => {
            const screenX = Math.min(window.innerWidth - 100, Math.max(120, dev.x + 80));
            const screenY = Math.min(window.innerHeight - 150, Math.max(150, dev.y + 120));
            moveCursor(screenX, screenY, isTr ? `${dev.name} Konumlandırıldı` : `${dev.name} Placed`, false);
          }, delay);
          delay += 950;
        });

        // 2. Mouse moves to Cable Tool, clicks exact cable type button in toolbar, then connects ports
        connections.forEach((conn) => {
          const currentConnections = connections.slice(0, connections.indexOf(conn) + 1);
          const srcDev = devices.find(d => d.id === conn.sourceDeviceId);
          const tgtDev = devices.find(d => d.id === conn.targetDeviceId);
          const cType = conn.cableType || 'straight';

          // Click exact cable button in toolbar
          registerTimeout(() => {
            currentStep++;
            updateProgress(currentStep, isTr ? `Kablo (${cType}): ${srcDev?.name || ''} ➔ ${tgtDev?.name || ''}` : `Cable (${cType}): ${srcDev?.name || ''} ➔ ${tgtDev?.name || ''}`);
            const cableBtnEl = document.querySelector(`[data-toolbar-cable="${cType}"], [data-toolbar-cable="straight"]`) as HTMLButtonElement | null;
            if (cableBtnEl) cableBtnEl.click();
            const cableBtn = getElementCoords(`[data-toolbar-cable="${cType}"], [data-toolbar-cable="straight"]`, 330, 75);
            moveCursor(cableBtn.x, cableBtn.y, isTr ? `${cType.toUpperCase()} Kablo Seç` : `Select ${cType.toUpperCase()} Cable`, true);
          }, delay);
          delay += 1100;

          // Click source device port
          registerTimeout(() => {
            const startX = srcDev ? srcDev.x + 80 : 200;
            const startY = srcDev ? srcDev.y + 120 : 200;
            moveCursor(startX, startY, isTr ? `${srcDev?.name || ''} Portuna Tıkla` : `Click ${srcDev?.name || ''} Port`, true);
          }, delay);
          delay += 1100;

          // Click target device to complete connection & record in timeline history
          registerTimeout(() => {
            const endX = tgtDev ? tgtDev.x + 80 : 350;
            const endY = tgtDev ? tgtDev.y + 120 : 250;
            moveCursor(endX, endY, isTr ? `${tgtDev?.name || ''} Portuna Bağla` : `Connect to ${tgtDev?.name || ''} Port`, true);
            setConnections(currentConnections);

            window.dispatchEvent(new CustomEvent('commit-action-event', {
              detail: { action: isTr ? `${srcDev?.name || ''} ➔ ${tgtDev?.name || ''} kablosu bağlandı` : `Connected cable ${srcDev?.name || ''} ➔ ${tgtDev?.name || ''}` }
            }));
          }, delay);
          delay += 1100;
        });

        // 3. PC Device Configuration (Double Click to open window, enter IP visually, close window)
        if (pcDevices.length >= 2) {
          const pc1 = pcDevices[0];
          const pc2 = pcDevices[1];

          // PC-1: Double click to open configuration window
          registerTimeout(() => {
            currentStep++;
            updateProgress(currentStep, isTr ? `${pc1.name} IP ayarları açılıyor` : `Opening ${pc1.name} IP settings`);
            moveCursor(pc1.x + 80, pc1.y + 120, isTr ? `${pc1.name} Çift Tıkla (Aç)` : `Double Click ${pc1.name} (Open)`, true);
            useMultiWindowStore.getState().openDeviceWindow(pc1.id, 'pc', 'settings');
          }, delay);
          delay += 1300;

          // PC-1: IP Address input typing & visual populating & record in timeline history
          registerTimeout(() => {
            currentStep++;
            updateProgress(currentStep, `${pc1.name} IP: 192.168.1.10 / 255.255.255.0`);
            const inputCoords = getElementCoords('input[placeholder*="192."], input[name="ip"], [data-modal-content="true"] input', window.innerWidth / 2, window.innerHeight / 2 - 20);
            moveCursor(inputCoords.x, inputCoords.y, isTr ? `${pc1.name} IP Girişi: 192.168.1.10` : `${pc1.name} IP Entry: 192.168.1.10`, false, `192.168.1.10`);
            pc1.ip = '192.168.1.10';
            pc1.subnet = '255.255.255.0';
            setDevices(devices.map(d => d.id === pc1.id ? { ...d, ip: '192.168.1.10', subnet: '255.255.255.0' } : d));
            const ipEl = document.querySelector('input[placeholder*="192."], input[name="ip"], [data-modal-content="true"] input') as HTMLInputElement | null;
            if (ipEl) {
              ipEl.focus();
              ipEl.value = '192.168.1.10';
              ipEl.dispatchEvent(new Event('input', { bubbles: true }));
            }
            window.dispatchEvent(new CustomEvent('commit-action-event', {
              detail: { action: isTr ? `${pc1.name} IP: 192.168.1.10 ayarlandı` : `Set ${pc1.name} IP: 192.168.1.10` }
            }));
          }, delay);
          delay += 1600;

          // PC-1: Close window after configuration
          registerTimeout(() => {
            const closeBtn = getElementCoords(`[data-window-close="${pc1.id}"]`, window.innerWidth / 2 + 200, window.innerHeight / 2 - 200);
            moveCursor(closeBtn.x, closeBtn.y, isTr ? `${pc1.name} Penceresini Kapat` : `Close ${pc1.name} Window`, true);
            useMultiWindowStore.getState().closeDeviceWindow(pc1.id);
          }, delay);
          delay += 1100;

          // PC-2: Double click to open configuration window
          registerTimeout(() => {
            currentStep++;
            updateProgress(currentStep, isTr ? `${pc2.name} IP ayarları açılıyor` : `Opening ${pc2.name} IP settings`);
            moveCursor(pc2.x + 80, pc2.y + 120, isTr ? `${pc2.name} Çift Tıkla (Aç)` : `Double Click ${pc2.name} (Open)`, true);
            useMultiWindowStore.getState().openDeviceWindow(pc2.id, 'pc', 'settings');
          }, delay);
          delay += 1300;

          // PC-2: IP Address input typing & visual populating & record in timeline history
          registerTimeout(() => {
            currentStep++;
            updateProgress(currentStep, `${pc2.name} IP: 192.168.1.20 / 255.255.255.0`);
            const inputCoords = getElementCoords('input[placeholder*="192."], input[name="ip"], [data-modal-content="true"] input', window.innerWidth / 2, window.innerHeight / 2 - 20);
            moveCursor(inputCoords.x, inputCoords.y, isTr ? `${pc2.name} IP Girişi: 192.168.1.20` : `${pc2.name} IP Entry: 192.168.1.20`, false, `192.168.1.20`);
            pc2.ip = '192.168.1.20';
            pc2.subnet = '255.255.255.0';
            setDevices(devices.map(d => d.id === pc2.id ? { ...d, ip: '192.168.1.20', subnet: '255.255.255.0' } : d));
            const ipEl = document.querySelector('input[placeholder*="192."], input[name="ip"], [data-modal-content="true"] input') as HTMLInputElement | null;
            if (ipEl) {
              ipEl.focus();
              ipEl.value = '192.168.1.20';
              ipEl.dispatchEvent(new Event('input', { bubbles: true }));
            }
            window.dispatchEvent(new CustomEvent('commit-action-event', {
              detail: { action: isTr ? `${pc2.name} IP: 192.168.1.20 ayarlandı` : `Set ${pc2.name} IP: 192.168.1.20` }
            }));
          }, delay);
          delay += 1600;

          // PC-2: Close window after configuration
          registerTimeout(() => {
            const closeBtn = getElementCoords(`[data-window-close="${pc2.id}"]`, window.innerWidth / 2 + 200, window.innerHeight / 2 - 200);
            moveCursor(closeBtn.x, closeBtn.y, isTr ? `${pc2.name} Penceresini Kapat` : `Close ${pc2.name} Window`, true);
            useMultiWindowStore.getState().closeDeviceWindow(pc2.id);
          }, delay);
          delay += 1100;

          // 4. Test Ping via CMD on PC-1
          const targetIp = pc2.ip || '192.168.1.20';
          const fullCmd = `ping ${targetIp}`;
          registerTimeout(() => {
            currentStep++;
            updateProgress(currentStep, isTr ? `CMD Terminali Açılıyor (${pc1.name})` : `Opening CMD Terminal (${pc1.name})`);
            moveCursor(pc1.x + 80, pc1.y + 120, isTr ? `${pc1.name} CMD Terminali Aç` : `Open ${pc1.name} CMD Terminal`, true);
            useMultiWindowStore.getState().openDeviceWindow(pc1.id, 'pc', 'desktop');
          }, delay);
          delay += 1400;

          // Word-by-word typing animation for ping command
          const words = fullCmd.split(' ');
          let currentTyped = '';
          words.forEach((w, wIdx) => {
            registerTimeout(() => {
              currentTyped += (wIdx > 0 ? ' ' : '') + w;
              const termCoords = getElementCoords('input[placeholder*="ping"], .custom-scrollbar input, [data-modal-content="true"] input', window.innerWidth / 2, window.innerHeight / 2 + 100);
              moveCursor(termCoords.x, termCoords.y, isTr ? `Kelime Kelime Yazılıyor: "${currentTyped}"` : `Typing Word-by-Word: "${currentTyped}"`, false, currentTyped);
            }, delay);
            delay += 750;
          });

          // Execute command and wait for ping response outputs
          registerTimeout(() => {
            currentStep++;
            updateProgress(currentStep, isTr ? `Komut Çalıştırılıyor: ${fullCmd}` : `Executing Command: ${fullCmd}`);
            const termCoords = getElementCoords('input[placeholder*="ping"], .custom-scrollbar input, [data-modal-content="true"] input', window.innerWidth / 2, window.innerHeight / 2 + 100);
            moveCursor(termCoords.x + 40, termCoords.y, isTr ? `Enter ↵ (Çalıştır)` : `Enter ↵ (Execute)`, true, fullCmd);
            window.dispatchEvent(
              new CustomEvent('pc-auto-type', {
                detail: { deviceId: pc1.id, command: fullCmd },
              })
            );
            window.dispatchEvent(new CustomEvent('commit-action-event', {
              detail: { action: isTr ? `${pc1.name} CMD: ${fullCmd}` : `${pc1.name} CMD: ${fullCmd}` }
            }));
          }, delay);
          delay += 1800;

          // Show Ping results badge & let video record the ping reply lines
          registerTimeout(() => {
            currentStep++;
            updateProgress(currentStep, isTr ? `Komut Başarıyla Sonuçlandı! Paketler İletildi (Reply from ${targetIp})` : `Command Succeeded! Packets Delivered (Reply from ${targetIp})`);
            moveCursor(window.innerWidth / 2, window.innerHeight / 2 + 30, isTr ? `Komut Başarıyla Sonuçlandı! (Reply from ${targetIp}: bytes=32 time=1ms TTL=128)` : `Command Succeeded! (Reply from ${targetIp}: bytes=32 time=1ms TTL=128)`, false);
          }, delay);
          delay += 4000;

          // Close PC-1 CMD window after showing results
          registerTimeout(() => {
            const closeBtn = getElementCoords(`[data-window-close="${pc1.id}"]`, window.innerWidth / 2 + 220, window.innerHeight / 2 - 200);
            moveCursor(closeBtn.x, closeBtn.y, isTr ? `${pc1.name} Penceresini Kapat` : `Close ${pc1.name} Window`, true);
            useMultiWindowStore.getState().closeDeviceWindow(pc1.id);
          }, delay);
          delay += 1100;
        }

        // 5. Router / Switch CLI Configuration Step (Double click Router/Switch, open Console CLI, execute CLI commands line-by-line)
        if (routerDevices.length > 0) {
          routerDevices.forEach((routerDev) => {
            const devCmds = routerDev.type === 'router'
              ? ['enable', 'configure terminal', 'interface FastEthernet0/0', 'ip address 192.168.1.1 255.255.255.0', 'no shutdown']
              : ['enable', 'configure terminal', 'vlan 10', 'name USERS', 'exit'];

            registerTimeout(() => {
              currentStep++;
              updateProgress(currentStep, isTr ? `${routerDev.name} CLI Konsolu Açılıyor` : `Opening ${routerDev.name} CLI Console`);
              moveCursor(routerDev.x + 80, routerDev.y + 120, isTr ? `${routerDev.name} Konsol Aç` : `Open ${routerDev.name} Console`, true);
              useMultiWindowStore.getState().openDeviceWindow(routerDev.id, routerDev.type, 'console');
            }, delay);
            delay += 1400;

            // Word-by-word Router/Switch CLI configuration typing animation per command line
            devCmds.forEach((cliCmd) => {
              const words = cliCmd.split(' ');
              let typed = '';
              words.forEach((w, wIdx) => {
                registerTimeout(() => {
                  typed += (wIdx > 0 ? ' ' : '') + w;
                  const cliCoords = getElementCoords('input[placeholder*="enable"], input[type="text"], [data-modal-content="true"] input', window.innerWidth / 2, window.innerHeight / 2 + 120);
                  moveCursor(cliCoords.x, cliCoords.y, isTr ? `${routerDev.name} CLI: "${typed}"` : `${routerDev.name} CLI: "${typed}"`, false, typed);
                }, delay);
                delay += 650;
              });

              // Execute this command line, commit as a separate line in timeline history, trigger terminal-auto-type & update step progress
              registerTimeout(() => {
                currentStep++;
                updateProgress(currentStep, isTr ? `${routerDev.name} CLI Komutu: ${cliCmd}` : `${routerDev.name} CLI Command: ${cliCmd}`);
                const cliCoords = getElementCoords('input[placeholder*="enable"], input[type="text"], [data-modal-content="true"] input', window.innerWidth / 2, window.innerHeight / 2 + 120);
                moveCursor(cliCoords.x + 40, cliCoords.y, isTr ? `Enter ↵ (${cliCmd})` : `Enter ↵ (${cliCmd})`, true, cliCmd);
                window.dispatchEvent(
                  new CustomEvent('terminal-auto-type', {
                    detail: { deviceId: routerDev.id, command: cliCmd },
                  })
                );
                window.dispatchEvent(new CustomEvent('commit-action-event', {
                  detail: { action: isTr ? `${routerDev.name} CLI: ${cliCmd}` : `${routerDev.name} CLI: ${cliCmd}` }
                }));
              }, delay);
              delay += 1400;
            });

            // Show CLI configuration output result & record in timeline history
            registerTimeout(() => {
              currentStep++;
              const resultMsg = routerDev.type === 'router'
                ? (isTr ? `${routerDev.name} CLI Konfigüre Edildi (%LINK-5-CHANGED: FastEthernet0/0 state to up)` : `${routerDev.name} CLI Configured (%LINK-5-CHANGED: FastEthernet0/0 state to up)`)
                : (isTr ? `${routerDev.name} VLAN 10 (USERS) Konfigüre Edildi` : `${routerDev.name} VLAN 10 (USERS) Configured`);
              updateProgress(currentStep, resultMsg);
              moveCursor(window.innerWidth / 2, window.innerHeight / 2 + 50, isTr ? `CLI Konfigürasyonu Başarılı!` : `CLI Configuration Succeeded!`, false);
              window.dispatchEvent(new CustomEvent('commit-action-event', {
                detail: { action: resultMsg }
              }));
            }, delay);
            delay += 3200;

            // Close Router/Switch CLI window
            registerTimeout(() => {
              const closeBtn = getElementCoords(`[data-window-close="${routerDev.id}"]`, window.innerWidth / 2 + 220, window.innerHeight / 2 - 200);
              moveCursor(closeBtn.x, closeBtn.y, isTr ? `${routerDev.name} Konsol Kapat` : `Close ${routerDev.name} Console`, true);
              useMultiWindowStore.getState().closeDeviceWindow(routerDev.id);
            }, delay);
            delay += 1100;
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
