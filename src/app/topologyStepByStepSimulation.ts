import type { CanvasDevice, CanvasConnection } from '@/components/network/NetworkTopology/types/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import type { StepQueueItem, SimulationContext } from './topologySimulationTypes';
import { getElementCoords } from './topologySimulationTypes';
import { buildDevicePlacementSteps, buildCablingSteps } from './topologySimulationPlacement';
import { buildCliDeviceSteps } from './topologySimulationCliSteps';
import { buildEndpointSteps, buildVerificationSteps } from './topologySimulationEndpointSteps';
import {
  getSwitchCliCommands,
  getRouterCliCommands,
  getFirewallCliCommands,
  getSecurityVerificationCommands,
  getFirewallVerificationCommands,
} from './topologySimulationCliBuilders';

export interface StepByStepSimulationParams {
  data: {
    devices: CanvasDevice[];
    connections: CanvasConnection[];
    deviceStates: Map<string, SwitchState>;
    projectName?: string;
  };
  setDevices: (devices: CanvasDevice[]) => void;
  setConnections: (connections: CanvasConnection[]) => void;
  setDeviceStates: (states: Map<string, SwitchState>) => void;
  isTr: boolean;
}

export {
  getDefaultFactoryName,
  appendSecurityCommands,
  getSecurityVerificationCommands,
  appendSpanningTreeCommands,
  getSwitchPortFeatureCommands,
  appendAclCommands,
  appendNatCommands,
  hasNatConfig,
  appendNatInterfaceCommands,
  getSwitchCliCommands,
  getRouterCliCommands,
  getFirewallCliCommands,
  removeDuplicateModeEntryCommands,
  getFirewallVerificationCommands,
} from './topologySimulationCliBuilders';

export function calculateSimulationSteps(data: {
  devices: CanvasDevice[];
  connections: CanvasConnection[];
  deviceStates?: Map<string, SwitchState>;
}): number {
  const devices = data.devices || [];
  const connections = data.connections || [];
  const deviceStates = data.deviceStates || new Map();

  const switchDevices = devices.filter((d) => d.type === 'switchL2' || d.type === 'switchL3');
  const routerDevices = devices.filter((d) => d.type === 'router');
  const firewallDevices = devices.filter((d) => d.type === 'firewall');
  const pcDevices = devices.filter((d) => d.type === 'pc');
  const wlcDevices = devices.filter((d) => d.type === 'wlc');
  const wifiDevices = devices.filter((d) => d.type === 'mobile' || (d.type !== 'pc' && !!d.wifi));
  const printerDevices = devices.filter((d) => d.type === 'printer');
  const iotDevices = devices.filter((d) => d.type === 'iot');

  let totalSteps = devices.length + connections.length;
  switchDevices.forEach((d) => {
    const state = deviceStates.get(d.id);
    const cmds = getSwitchCliCommands(d, state);
    totalSteps += 3 + cmds.length + getSecurityVerificationCommands(state).length * 2;
  });
  routerDevices.forEach((d) => {
    const state = deviceStates.get(d.id);
    const cmds = getRouterCliCommands(d, state);
    totalSteps += 3 + cmds.length + getSecurityVerificationCommands(state).length * 2;
  });
  firewallDevices.forEach((d) => {
    const state = deviceStates.get(d.id);
    const cmds = getFirewallCliCommands(state);
    totalSteps += 3 + cmds.length + getFirewallVerificationCommands(state).length * 2;
  });
  totalSteps += wlcDevices.length * 3;
  pcDevices.forEach((pc) => {
    totalSteps += 3;
    if (pc.gateway) totalSteps += 1;
    if (pc.dns) totalSteps += 1;
    if (pc.wifi) totalSteps += 1;
  });
  totalSteps += wifiDevices.length * 3;
  totalSteps += printerDevices.length * 3;
  totalSteps += iotDevices.length * 3;
  if (pcDevices.length >= 2 || (pcDevices.length >= 1 && routerDevices.length >= 1)) {
    totalSteps += 4;
  }
  return totalSteps;
}

let activeSimulationStopper: (() => void) | null = null;

export function runStepByStepSimulation({
  data,
  setDevices,
  setConnections,
  setDeviceStates,
  isTr,
}: StepByStepSimulationParams) {
  if (activeSimulationStopper) {
    activeSimulationStopper();
    activeSimulationStopper = null;
  }

  // Start from empty screen
  setDevices([]);
  setConnections([]);
  setDeviceStates(new Map());

  // Open Timeline History Panel so the user sees steps recorded live
  window.dispatchEvent(new CustomEvent('set-timeline-minimized', { detail: { minimized: false } }));

  const devices = [...data.devices];
  const connections = [...data.connections];
  const deviceStates = data.deviceStates;

  const stepQueue: StepQueueItem[] = [];
  const addStep = (fn: () => void, durationMs = 400) => {
    stepQueue.push({ run: fn, durationMs });
  };

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

  let isPaused = false;
  let isStopped = false;
  let currentStep = 0;
  let currentStepIdx = 0;
  let currentMessage = '';
  let currentTimer: NodeJS.Timeout | null = null;
  let pauseWaiter: (() => void) | null = null;
  let delayResolver: (() => void) | null = null;
  let delayStartTimestamp = 0;
  let remainingDelayMs = 0;

  const totalSteps = calculateSimulationSteps({ devices, connections, deviceStates });

  const updateProgress = (step: number, msg: string, paused = false) => {
    currentMessage = msg;
    window.dispatchEvent(
      new CustomEvent('simulation-progress', {
        detail: { active: true, paused, current: step, total: totalSteps, message: msg },
      })
    );
  };

  const waitOrPause = (durationMs: number): Promise<void> => {
    if (isStopped) return Promise.resolve();

    return new Promise<void>((resolve) => {
      delayResolver = resolve;
      remainingDelayMs = durationMs;

      const finishDelay = () => {
        currentTimer = null;
        delayResolver = null;
        resolve();
      };

      const startTimer = () => {
        if (isStopped) {
          finishDelay();
          return;
        }
        if (isPaused) {
          pauseWaiter = () => {
            pauseWaiter = null;
            startTimer();
          };
          return;
        }

        if (remainingDelayMs <= 0) {
          finishDelay();
          return;
        }

        delayStartTimestamp = Date.now();
        currentTimer = setTimeout(finishDelay, remainingDelayMs);
      };

      if (isPaused) {
        pauseWaiter = () => {
          pauseWaiter = null;
          startTimer();
        };
      } else {
        startTimer();
      }
    });
  };

  const pauseSimulation = () => {
    if (isStopped || isPaused) return;
    isPaused = true;
    if (currentTimer) {
      clearTimeout(currentTimer);
      currentTimer = null;
      const elapsed = Date.now() - delayStartTimestamp;
      remainingDelayMs = Math.max(0, remainingDelayMs - elapsed);
    }
    updateProgress(currentStep, currentMessage || (isTr ? 'Duraklatıldı' : 'Paused'), true);
  };

  const resumeSimulation = () => {
    if (isStopped || !isPaused) return;
    isPaused = false;
    updateProgress(currentStep, currentMessage || (isTr ? 'Devam Ediyor' : 'Resuming'), false);
    if (pauseWaiter) {
      const waiter = pauseWaiter;
      pauseWaiter = null;
      waiter();
    } else if (remainingDelayMs > 0 && !currentTimer && delayResolver) {
      delayStartTimestamp = Date.now();
      const currentResolver = delayResolver;
      currentTimer = setTimeout(() => {
        currentTimer = null;
        delayResolver = null;
        currentResolver();
      }, remainingDelayMs);
    }
  };

  const togglePause = () => {
    if (isPaused) {
      resumeSimulation();
    } else {
      pauseSimulation();
    }
  };

  const stopSimulation = () => {
    if (isStopped) return;
    isStopped = true;
    isPaused = false;
    if (currentTimer) {
      clearTimeout(currentTimer);
      currentTimer = null;
    }
    if (pauseWaiter) {
      pauseWaiter = null;
    }
    if (delayResolver) {
      const res = delayResolver;
      delayResolver = null;
      res();
    }
    hideCursor();
    cleanupListeners();
    if (activeSimulationStopper === stopSimulation) {
      activeSimulationStopper = null;
    }
    window.dispatchEvent(
      new CustomEvent('simulation-progress', {
        detail: { active: false, paused: false, current: 0, total: 0, message: isTr ? 'İptal Edildi' : 'Cancelled' },
      })
    );
  };

  const onStopReq = () => stopSimulation();
  const onPauseReq = () => pauseSimulation();
  const onResumeReq = () => resumeSimulation();
  const onToggleReq = () => togglePause();

  const onCommandError = (e: Event) => {
    const detail = (e as CustomEvent<{ deviceId?: string; command?: string; error?: string }>).detail;
    if (isStopped) return;
    pauseSimulation();
    const cleanErr = detail?.error ? ` (${detail.error.trim().split('\n')[0]})` : '';
    const alertMsg = isTr
      ? `Hata: "${detail?.command || 'CLI'}" komutu başarısız oldu${cleanErr}. Otomatik ilerleme duraklatıldı.`
      : `Error: "${detail?.command || 'CLI'}" command failed${cleanErr}. Auto-progression paused.`;
    updateProgress(currentStep, alertMsg, true);
  };

  const cleanupListeners = () => {
    window.removeEventListener('simulation-stop', onStopReq);
    window.removeEventListener('simulation-pause', onPauseReq);
    window.removeEventListener('simulation-resume', onResumeReq);
    window.removeEventListener('simulation-toggle-pause', onToggleReq);
    window.removeEventListener('terminal-command-error', onCommandError);
  };

  window.addEventListener('simulation-stop', onStopReq);
  window.addEventListener('simulation-pause', onPauseReq);
  window.addEventListener('simulation-resume', onResumeReq);
  window.addEventListener('simulation-toggle-pause', onToggleReq);
  window.addEventListener('terminal-command-error', onCommandError);
  activeSimulationStopper = stopSimulation;

  const simulationContext: SimulationContext = {
    devices,
    connections,
    deviceStates,
    simulatedDevices: [],
    simulatedStates: new Map<string, SwitchState>(),
    setDevices,
    setConnections,
    setDeviceStates,
    isTr,
    addStep,
    moveCursor,
    updateProgress,
    incrementStep: () => ++currentStep,
    getElementCoords,
  };

  // Build each simulation phase via modular helpers
  buildDevicePlacementSteps(simulationContext, devices, deviceStates);
  buildCablingSteps(simulationContext, connections, devices);
  buildCliDeviceSteps(simulationContext);
  buildEndpointSteps(simulationContext);
  buildVerificationSteps(simulationContext);

  // Complete Simulation & Cleanup
  const projName = data.projectName || (isTr ? 'Topoloji' : 'Topology');
  addStep(() => {
    hideCursor();
    setDevices(data.devices);
    setConnections(data.connections);
    setDeviceStates(deviceStates);
    cleanupListeners();
    window.dispatchEvent(
      new CustomEvent('simulation-progress', {
        detail: {
          active: false,
          paused: false,
          current: totalSteps,
          total: totalSteps,
          message: isTr ? `${projName} Başarıyla Tamamlandı! 🎉` : `${projName} Successfully Completed! 🎉`,
        },
      })
    );
    window.dispatchEvent(new CustomEvent('add-summary-note'));
  }, 500);

  // Queue runner loop
  const runQueue = async () => {
    await waitOrPause(300);

    while (currentStepIdx < stepQueue.length && !isStopped) {
      if (isPaused) {
        await new Promise<void>((res) => {
          pauseWaiter = res;
        });
        if (isStopped) break;
      }

      const item = stepQueue[currentStepIdx];
      try {
        item.run();
      } catch (err) {
        console.error('Simulation step error:', err);
        pauseSimulation();
        updateProgress(
          currentStep,
          isTr ? 'Adım çalıştırma hatası! Otomatik ilerleme duraklatıldı.' : 'Step execution error! Auto-progression paused.',
          true
        );
      }
      currentStepIdx++;

      if (currentStepIdx < stepQueue.length && !isStopped) {
        await waitOrPause(item.durationMs);
      }
    }

    if (!isStopped) {
      cleanupListeners();
      if (activeSimulationStopper === stopSimulation) {
        activeSimulationStopper = null;
      }
    }
  };

  runQueue();
}
