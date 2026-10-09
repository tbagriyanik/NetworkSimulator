import { useMultiWindowStore } from '@/hooks/useMultiWindowStore';
import type { SimulationContext } from './topologySimulationTypes';
import {
  getSwitchCliCommands,
  getRouterCliCommands,
  getFirewallCliCommands,
  removeDuplicateModeEntryCommands,
  getSecurityVerificationCommands,
  getFirewallVerificationCommands,
} from './topologySimulationCliBuilders';

export function buildCliDeviceSteps(ctx: SimulationContext) {
  const {
    devices,
    deviceStates,
    addStep,
    moveCursor,
    updateProgress,
    getElementCoords,
    setDevices,
    setDeviceStates,
    isTr,
  } = ctx;

  const switchDevices = devices.filter((d) => d.type === 'switchL2' || d.type === 'switchL3');
  const routerDevices = devices.filter((d) => d.type === 'router');
  const firewallDevices = devices.filter((d) => d.type === 'firewall');

  // PHASE 3: SWITCH CONFIGURATION
  switchDevices.forEach((switchDev) => {
    const devState = deviceStates?.get(switchDev.id);
    const switchCmds = removeDuplicateModeEntryCommands(getSwitchCliCommands(switchDev, devState));
    if (switchCmds.length === 0) return;

    addStep(() => {
      const step = ctx.incrementStep();
      updateProgress(step, isTr ? `${switchDev.name} CLI Konsolu Açılıyor (VLAN & Port Yapılandırması)` : `Opening ${switchDev.name} CLI Console (VLAN & Port Config)`);
      const devCoords = getElementCoords(`[data-device-id="${switchDev.id}"]`, switchDev.x + 80, switchDev.y + 120);
      moveCursor(devCoords.x, devCoords.y, isTr ? `${switchDev.name} Konsol Aç` : `Open ${switchDev.name} Console`, true);
      useMultiWindowStore.getState().openDeviceWindow(switchDev.id, switchDev.type, 'console');
    }, 900);

    switchCmds.forEach((cliCmd, cmdIdx) => {
      const typedCmd = cmdIdx === 0 ? `enable\nconfigure terminal\n${cliCmd}` : cliCmd;
      addStep(() => {
        const step = ctx.incrementStep();
        updateProgress(step, `${switchDev.name} CLI: ${cliCmd}`);
        const cliCoords = getElementCoords(`[data-modal-id="${switchDev.id}"] input, [data-modal-id="${switchDev.id}"] textarea, input[placeholder*="enable"], input[type="text"]`, window.innerWidth / 2, window.innerHeight / 2 + 120);
        moveCursor(cliCoords.x, cliCoords.y, `${switchDev.name} CLI: ${cliCmd}`, false);
        window.dispatchEvent(
          new CustomEvent('terminal-auto-type', {
            detail: { deviceId: switchDev.id, command: typedCmd },
          })
        );
      }, Math.max(1000, typedCmd.length * 45 + 550));

      addStep(() => {
        const cliCoords = getElementCoords(`[data-modal-id="${switchDev.id}"] input, [data-modal-id="${switchDev.id}"] textarea, input[placeholder*="enable"], input[type="text"]`, window.innerWidth / 2, window.innerHeight / 2 + 120);
        moveCursor(cliCoords.x + 35, cliCoords.y, `Enter ↵ (${cliCmd})`, true, cliCmd);
        window.dispatchEvent(
          new CustomEvent('commit-action-event', {
            detail: { action: `${switchDev.name} CLI: ${cliCmd}` },
          })
        );
      }, 600);
    });

    getSecurityVerificationCommands(devState).forEach((verifyCmd) => {
      addStep(() => {
        const step = ctx.incrementStep();
        updateProgress(step, isTr ? `${switchDev.name} Doğrulama: ${verifyCmd}` : `${switchDev.name} Verify: ${verifyCmd}`);
        const cliCoords = getElementCoords(`[data-modal-id="${switchDev.id}"] input, [data-modal-id="${switchDev.id}"] textarea, input[type="text"]`, window.innerWidth / 2, window.innerHeight / 2 + 120);
        moveCursor(cliCoords.x, cliCoords.y, `${switchDev.name} CLI: ${verifyCmd}`, false);
        window.dispatchEvent(
          new CustomEvent('terminal-auto-type', {
            detail: { deviceId: switchDev.id, command: verifyCmd },
          })
        );
      }, Math.max(1000, verifyCmd.length * 45 + 550));

      addStep(() => {
        const cliCoords = getElementCoords(`[data-modal-id="${switchDev.id}"] input, [data-modal-id="${switchDev.id}"] textarea, input[type="text"]`, window.innerWidth / 2, window.innerHeight / 2 + 120);
        moveCursor(cliCoords.x + 35, cliCoords.y, `Enter ↵ (${verifyCmd})`, true, verifyCmd);
        window.dispatchEvent(
          new CustomEvent('commit-action-event', {
            detail: {
              action: isTr
                ? `${switchDev.name} parolaları doğrulandı (${verifyCmd})`
                : `${switchDev.name} passwords verified (${verifyCmd})`,
            },
          })
        );
      }, 600);
    });

    addStep(() => {
      const step = ctx.incrementStep();
      const resultMsg = isTr
        ? `${switchDev.name} Switch ve VLAN Ayarları Başarıyla Yapılandırıldı`
        : `${switchDev.name} Switch and VLAN Configured Successfully`;
      updateProgress(step, resultMsg);
      moveCursor(window.innerWidth / 2, window.innerHeight / 2 + 50, isTr ? `Switch Yapılandırması Tamam!` : `Switch Config Completed!`, false);

      if (devState) {
        const updated = new Map(ctx.simulatedStates);
        updated.set(switchDev.id, devState);
        ctx.simulatedStates = updated;
        setDeviceStates(updated);
      }
      const updatedDevs = ctx.simulatedDevices.map((d) => (d.id === switchDev.id ? { ...d, name: switchDev.name } : d));
      ctx.simulatedDevices = updatedDevs;
      setDevices(updatedDevs);

      window.dispatchEvent(new CustomEvent('commit-action-event', { detail: { action: resultMsg } }));
    }, 1500);

    addStep(() => {
      const closeBtn = getElementCoords(`[data-window-close="${switchDev.id}"]`, window.innerWidth / 2 + 220, window.innerHeight / 2 - 200);
      moveCursor(closeBtn.x, closeBtn.y, isTr ? `${switchDev.name} Kapat ✕` : `Close ${switchDev.name} ✕`, true);
      useMultiWindowStore.getState().closeDeviceWindow(switchDev.id);
    }, 500);
  });

  // PHASE 4: ROUTER CONFIGURATION
  routerDevices.forEach((routerDev) => {
    const devState = deviceStates?.get(routerDev.id);
    const routerCmds = removeDuplicateModeEntryCommands(getRouterCliCommands(routerDev, devState));
    if (routerCmds.length === 0) return;

    addStep(() => {
      const step = ctx.incrementStep();
      updateProgress(step, isTr ? `${routerDev.name} CLI Konsolu Açılıyor (IP & Yönlendirme)` : `Opening ${routerDev.name} CLI Console (IP & Routing)`);
      const devCoords = getElementCoords(`[data-device-id="${routerDev.id}"]`, routerDev.x + 80, routerDev.y + 120);
      moveCursor(devCoords.x, devCoords.y, isTr ? `${routerDev.name} Konsol Aç` : `Open ${routerDev.name} Console`, true);
      useMultiWindowStore.getState().openDeviceWindow(routerDev.id, routerDev.type, 'console');
    }, 900);

    routerCmds.forEach((cliCmd, cmdIdx) => {
      const typedCmd = cmdIdx === 0 ? `enable\nconfigure terminal\n${cliCmd}` : cliCmd;
      addStep(() => {
        const step = ctx.incrementStep();
        updateProgress(step, `${routerDev.name} CLI: ${cliCmd}`);
        const cliCoords = getElementCoords(`[data-modal-id="${routerDev.id}"] input, [data-modal-id="${routerDev.id}"] textarea, input[placeholder*="enable"], input[type="text"]`, window.innerWidth / 2, window.innerHeight / 2 + 120);
        moveCursor(cliCoords.x, cliCoords.y, `${routerDev.name} CLI: ${cliCmd}`, false);
        window.dispatchEvent(
          new CustomEvent('terminal-auto-type', {
            detail: { deviceId: routerDev.id, command: typedCmd },
          })
        );
      }, Math.max(1000, typedCmd.length * 45 + 550));

      addStep(() => {
        const cliCoords = getElementCoords(`[data-modal-id="${routerDev.id}"] input, [data-modal-id="${routerDev.id}"] textarea, input[placeholder*="enable"], input[type="text"]`, window.innerWidth / 2, window.innerHeight / 2 + 120);
        moveCursor(cliCoords.x + 35, cliCoords.y, `Enter ↵ (${cliCmd})`, true, cliCmd);
        window.dispatchEvent(
          new CustomEvent('commit-action-event', {
            detail: { action: `${routerDev.name} CLI: ${cliCmd}` },
          })
        );
      }, 600);
    });

    getSecurityVerificationCommands(devState).forEach((verifyCmd) => {
      addStep(() => {
        const step = ctx.incrementStep();
        updateProgress(step, isTr ? `${routerDev.name} Doğrulama: ${verifyCmd}` : `${routerDev.name} Verify: ${verifyCmd}`);
        const cliCoords = getElementCoords(`[data-modal-id="${routerDev.id}"] input, [data-modal-id="${routerDev.id}"] textarea, input[type="text"]`, window.innerWidth / 2, window.innerHeight / 2 + 120);
        moveCursor(cliCoords.x, cliCoords.y, `${routerDev.name} CLI: ${verifyCmd}`, false);
        window.dispatchEvent(
          new CustomEvent('terminal-auto-type', {
            detail: { deviceId: routerDev.id, command: verifyCmd },
          })
        );
      }, Math.max(1000, verifyCmd.length * 45 + 550));

      addStep(() => {
        const cliCoords = getElementCoords(`[data-modal-id="${routerDev.id}"] input, [data-modal-id="${routerDev.id}"] textarea, input[type="text"]`, window.innerWidth / 2, window.innerHeight / 2 + 120);
        moveCursor(cliCoords.x + 35, cliCoords.y, `Enter ↵ (${verifyCmd})`, true, verifyCmd);
        window.dispatchEvent(
          new CustomEvent('commit-action-event', {
            detail: {
              action: isTr
                ? `${routerDev.name} parolaları doğrulandı (${verifyCmd})`
                : `${routerDev.name} passwords verified (${verifyCmd})`,
            },
          })
        );
      }, 600);
    });

    addStep(() => {
      const step = ctx.incrementStep();
      const resultMsg = isTr
        ? `${routerDev.name} Router Arayüzleri ve Protokolleri Yapılandırıldı`
        : `${routerDev.name} Router Interfaces & Protocols Configured`;
      updateProgress(step, resultMsg);
      moveCursor(window.innerWidth / 2, window.innerHeight / 2 + 50, isTr ? `Router Yapılandırması Tamam!` : `Router Config Completed!`, false);

      if (devState) {
        const updated = new Map(ctx.simulatedStates);
        updated.set(routerDev.id, devState);
        ctx.simulatedStates = updated;
        setDeviceStates(updated);
      }
      const updatedDevs = ctx.simulatedDevices.map((d) => (d.id === routerDev.id ? { ...d, name: routerDev.name } : d));
      ctx.simulatedDevices = updatedDevs;
      setDevices(updatedDevs);

      window.dispatchEvent(new CustomEvent('commit-action-event', { detail: { action: resultMsg } }));
    }, 1500);

    addStep(() => {
      const closeBtn = getElementCoords(`[data-window-close="${routerDev.id}"]`, window.innerWidth / 2 + 220, window.innerHeight / 2 - 200);
      moveCursor(closeBtn.x, closeBtn.y, isTr ? `${routerDev.name} Kapat ✕` : `Close ${routerDev.name} ✕`, true);
      useMultiWindowStore.getState().closeDeviceWindow(routerDev.id);
    }, 500);
  });

  // PHASE 4b: FIREWALL CONFIGURATION
  firewallDevices.forEach((fwDev) => {
    const devState = deviceStates?.get(fwDev.id);
    const fwCmds = removeDuplicateModeEntryCommands(getFirewallCliCommands(devState));
    if (fwCmds.length === 0) return;

    addStep(() => {
      const step = ctx.incrementStep();
      updateProgress(step, isTr ? `${fwDev.name} CLI Konsolu Açılıyor (Arayüz & Kural Yapılandırması)` : `Opening ${fwDev.name} CLI Console (Interface & Rule Config)`);
      const devCoords = getElementCoords(`[data-device-id="${fwDev.id}"]`, fwDev.x + 80, fwDev.y + 120);
      moveCursor(devCoords.x, devCoords.y, isTr ? `${fwDev.name} Konsol Aç` : `Open ${fwDev.name} Console`, true);
      useMultiWindowStore.getState().openDeviceWindow(fwDev.id, fwDev.type, 'console');
    }, 900);

    fwCmds.forEach((cliCmd, cmdIdx) => {
      const typedCmd = cmdIdx === 0 ? `enable\nconfigure terminal\n${cliCmd}` : cliCmd;
      addStep(() => {
        const step = ctx.incrementStep();
        updateProgress(step, `${fwDev.name} CLI: ${cliCmd}`);
        const cliCoords = getElementCoords(`[data-modal-id="${fwDev.id}"] input, [data-modal-id="${fwDev.id}"] textarea, input[type="text"]`, window.innerWidth / 2, window.innerHeight / 2 + 120);
        moveCursor(cliCoords.x, cliCoords.y, `${fwDev.name} CLI: ${cliCmd}`, false);
        window.dispatchEvent(
          new CustomEvent('terminal-auto-type', {
            detail: { deviceId: fwDev.id, command: typedCmd },
          })
        );
      }, Math.max(1000, typedCmd.length * 45 + 550));

      addStep(() => {
        const cliCoords = getElementCoords(`[data-modal-id="${fwDev.id}"] input, [data-modal-id="${fwDev.id}"] textarea, input[type="text"]`, window.innerWidth / 2, window.innerHeight / 2 + 120);
        moveCursor(cliCoords.x + 35, cliCoords.y, `Enter ↵ (${cliCmd})`, true, cliCmd);
        window.dispatchEvent(
          new CustomEvent('commit-action-event', {
            detail: { action: `${fwDev.name} CLI: ${cliCmd}` },
          })
        );
      }, 600);
    });

    getFirewallVerificationCommands(devState).forEach((verifyCmd) => {
      addStep(() => {
        const step = ctx.incrementStep();
        updateProgress(step, isTr ? `${fwDev.name} Doğrulama: ${verifyCmd}` : `${fwDev.name} Verify: ${verifyCmd}`);
        const cliCoords = getElementCoords(`[data-modal-id="${fwDev.id}"] input, [data-modal-id="${fwDev.id}"] textarea, input[type="text"]`, window.innerWidth / 2, window.innerHeight / 2 + 120);
        moveCursor(cliCoords.x, cliCoords.y, `${fwDev.name} CLI: ${verifyCmd}`, false);
        window.dispatchEvent(
          new CustomEvent('terminal-auto-type', {
            detail: { deviceId: fwDev.id, command: verifyCmd },
          })
        );
      }, Math.max(1000, verifyCmd.length * 45 + 550));

      addStep(() => {
        const cliCoords = getElementCoords(`[data-modal-id="${fwDev.id}"] input, [data-modal-id="${fwDev.id}"] textarea, input[type="text"]`, window.innerWidth / 2, window.innerHeight / 2 + 120);
        moveCursor(cliCoords.x + 35, cliCoords.y, `Enter ↵ (${verifyCmd})`, true, verifyCmd);
        window.dispatchEvent(
          new CustomEvent('commit-action-event', {
            detail: {
              action: isTr
                ? `${fwDev.name} kuralları doğrulandı (${verifyCmd})`
                : `${fwDev.name} rules verified (${verifyCmd})`,
            },
          })
        );
      }, 600);
    });

    addStep(() => {
      const step = ctx.incrementStep();
      const resultMsg = isTr
        ? `${fwDev.name} Güvenlik Duvarı Arayüzleri ve Kuralları Yapılandırıldı`
        : `${fwDev.name} Firewall Interfaces & Rules Configured`;
      updateProgress(step, resultMsg);
      moveCursor(window.innerWidth / 2, window.innerHeight / 2 + 50, isTr ? `Firewall Yapılandırması Tamam!` : `Firewall Config Completed!`, false);

      if (devState) {
        const updated = new Map(ctx.simulatedStates);
        updated.set(fwDev.id, devState);
        ctx.simulatedStates = updated;
        setDeviceStates(updated);
      }
      window.dispatchEvent(new CustomEvent('commit-action-event', { detail: { action: resultMsg } }));
    }, 1500);

    addStep(() => {
      const closeBtn = getElementCoords(`[data-window-close="${fwDev.id}"]`, window.innerWidth / 2 + 220, window.innerHeight / 2 - 200);
      moveCursor(closeBtn.x, closeBtn.y, isTr ? `${fwDev.name} Kapat ✕` : `Close ${fwDev.name} ✕`, true);
      useMultiWindowStore.getState().closeDeviceWindow(fwDev.id);
    }, 500);
  });
}
