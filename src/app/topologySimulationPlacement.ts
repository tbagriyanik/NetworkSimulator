import type { CanvasDevice, CanvasConnection } from '@/components/network/NetworkTopology/types/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import type { SimulationContext } from './topologySimulationTypes';
import { getDefaultFactoryName } from './topologySimulationCliBuilders';

export function buildDevicePlacementSteps(
  ctx: SimulationContext,
  devices: CanvasDevice[],
  deviceStates: Map<string, SwitchState>
) {
  const { addStep, moveCursor, updateProgress, setDevices, setDeviceStates, isTr, getElementCoords } = ctx;

  devices.forEach((dev) => {
    const currentDevices = devices.slice(0, devices.indexOf(dev) + 1);
    const devTypeKey = dev.type === ('switch' as unknown as string) ? 'switchL2' : dev.type;
    const devSelector = `[data-toolbar-device="${devTypeKey}"], [data-toolbar-device="pc"]`;
    const devTypeCount = currentDevices.filter((item) => item.type === dev.type).length - 1;
    const targetDevName = dev.name || getDefaultFactoryName(dev.type, Math.max(0, devTypeCount));

    // Step 1a: Move cursor to toolbar icon
    addStep(() => {
      const step = ctx.incrementStep();
      updateProgress(step, isTr ? `${targetDevName} seçiliyor` : `Selecting ${targetDevName}`);
      const targetBtn = getElementCoords(devSelector, 220, 75);
      moveCursor(targetBtn.x, targetBtn.y, isTr ? `${dev.type.toUpperCase()} Seçiliyor` : `Selecting ${dev.type.toUpperCase()}`, false);
    }, 400);

    // Step 1b: Click toolbar button
    addStep(() => {
      const targetBtn = getElementCoords(devSelector, 220, 75);
      moveCursor(targetBtn.x, targetBtn.y, isTr ? `${dev.type.toUpperCase()} Seçildi` : `Selected ${dev.type.toUpperCase()}`, true);
    }, 350);

    // Step 1c: Move cursor to canvas target position
    addStep(() => {
      const screenX = Math.min(window.innerWidth - 100, Math.max(120, dev.x + 80));
      const screenY = Math.min(window.innerHeight - 150, Math.max(150, dev.y + 120));
      moveCursor(screenX, screenY, isTr ? `${targetDevName} Tuvale Yerleştiriliyor` : `Placing ${targetDevName} on Canvas`, false);
    }, 400);

    // Step 1d: Click and place blank device
    addStep(() => {
      const screenX = Math.min(window.innerWidth - 100, Math.max(120, dev.x + 80));
      const screenY = Math.min(window.innerHeight - 150, Math.max(150, dev.y + 120));
      moveCursor(screenX, screenY, isTr ? `${targetDevName} Eklendi ✓` : `${targetDevName} Added ✓`, true);

      const sanitizedDevices = currentDevices.map((d, idx) => {
        if (idx === currentDevices.length - 1) {
          if (d.type === 'pc') {
            const pcIndex = currentDevices.filter((item) => item.type === 'pc').length;
            const initialApipaIp = `169.254.1.${10 + pcIndex}`;
            return {
              ...d,
              name: targetDevName,
              ip: initialApipaIp,
              subnet: '255.255.0.0',
              gateway: '',
              dns: '',
              ipConfigMode: 'static' as const,
              wifi: d.wifi ? { ...d.wifi, enabled: false, ssid: '', password: '', mode: d.wifi.mode || 'client' } : undefined,
            };
          }
          if (d.type === 'mobile') {
            const mobileIndex = currentDevices.filter((item) => item.type === 'mobile').length;
            const initialApipaIp = `169.254.1.${20 + mobileIndex}`;
            return {
              ...d,
              name: targetDevName,
              ip: initialApipaIp,
              subnet: '255.255.0.0',
              wifi: d.wifi ? { ...d.wifi, enabled: false, ssid: '', password: '', mode: d.wifi.mode || 'client' } : undefined,
            };
          }
          if (d.type === 'printer' || d.type === 'iot') {
            return { ...d, name: targetDevName, ip: '', subnet: '255.255.255.0', gateway: '', dns: '' };
          }
          if (d.type === 'wlc') {
            return {
              ...d,
              name: targetDevName,
              ip: '',
              subnet: '255.255.255.0',
              gateway: '',
              wifi: d.wifi ? { ...d.wifi, enabled: false, ssid: '', password: '', mode: d.wifi.mode || 'ap' } : undefined,
            };
          }
          return { ...d, name: targetDevName, ip: '' };
        }
        return d;
      });
      ctx.simulatedDevices = sanitizedDevices;
      setDevices(sanitizedDevices);

      const currentStates = new Map<string, SwitchState>();
      currentDevices.forEach((d) => {
        const state = deviceStates.get(d.id);
        if (state) {
          const cleanPorts: Record<string, typeof state.ports[string]> = {};
          const isL2Switch = d.type === 'switchL2';
          Object.entries(state.ports || {}).forEach(([pId, p]) => {
            cleanPorts[pId] = {
              ...p,
              ipAddress: undefined,
              subnetMask: undefined,
              mode: isL2Switch ? 'access' : 'routed',
              accessVlan: 1,
              shutdown: isL2Switch ? false : (pId === 'console' ? false : true),
            };
          });

          const cleanSecurity: SwitchState['security'] = {
            ...state.security,
            enableSecret: undefined,
            enableSecretEncrypted: false,
            enablePassword: undefined,
            servicePasswordEncryption: false,
            users: [],
            consoleLine: { ...state.security.consoleLine, login: false, loginLocal: false, password: undefined },
            vtyLines: { ...state.security.vtyLines, login: false, loginLocal: false, password: undefined },
          };

          currentStates.set(d.id, {
            ...state,
            hostname: d.name || state.hostname || targetDevName,
            security: cleanSecurity,
            vlans: { 1: { id: 1, name: 'default', status: 'active', ports: [] } },
            ports: cleanPorts,
          });
        }
      });
      ctx.simulatedStates = currentStates;
      setDeviceStates(currentStates);

      window.dispatchEvent(
        new CustomEvent('commit-action-event', {
          detail: { action: isTr ? `${targetDevName} topolojiye eklendi` : `Added ${targetDevName} to topology` },
        })
      );
    }, 750);
  });
}

export function buildCablingSteps(
  ctx: SimulationContext,
  connections: CanvasConnection[],
  devices: CanvasDevice[]
) {
  const { addStep, moveCursor, updateProgress, setConnections, isTr, getElementCoords } = ctx;

  let lastSelectedCableType: string | null = null;
  connections.forEach((conn) => {
    const currentConnections = connections.slice(0, connections.indexOf(conn) + 1);
    const srcDev = devices.find((d) => d.id === conn.sourceDeviceId);
    const tgtDev = devices.find((d) => d.id === conn.targetDeviceId);
    const cableTypeVal =
      conn.cableType === 'crossover' || (conn.cableType as string) === 'cross' ? 'crossover' : conn.cableType || 'straight';
    const cableLabel = cableTypeVal === 'crossover' ? 'CROSSOVER' : cableTypeVal.toUpperCase();
    const cableSelector = `[data-toolbar-cable="${cableTypeVal}"], [data-toolbar-cable="straight"]`;
    const isSameCableType = lastSelectedCableType === cableTypeVal;

    if (!isSameCableType) {
      lastSelectedCableType = cableTypeVal;
      addStep(() => {
        const step = ctx.incrementStep();
        updateProgress(
          step,
          isTr
            ? `Kablo (${cableLabel}): ${srcDev?.name || ''} ➔ ${tgtDev?.name || ''}`
            : `Cable (${cableLabel}): ${srcDev?.name || ''} ➔ ${tgtDev?.name || ''}`
        );
        const cableBtnCoords = getElementCoords(cableSelector, 330, 75);
        moveCursor(cableBtnCoords.x, cableBtnCoords.y, isTr ? `${cableLabel} Kablo Seçiliyor` : `Selecting ${cableLabel} Cable`, false);
      }, 400);

      addStep(() => {
        const cableBtnCoords = getElementCoords(cableSelector, 330, 75);
        moveCursor(cableBtnCoords.x, cableBtnCoords.y, isTr ? `${cableLabel} Kablo Seçildi` : `Selected ${cableLabel} Cable`, true);
      }, 350);
    } else {
      addStep(() => {
        const step = ctx.incrementStep();
        updateProgress(
          step,
          isTr
            ? `Kablo (${cableLabel}): ${srcDev?.name || ''} ➔ ${tgtDev?.name || ''}`
            : `Cable (${cableLabel}): ${srcDev?.name || ''} ➔ ${tgtDev?.name || ''}`
        );
      }, 350);
    }

    // Source Port
    addStep(() => {
      const portName = conn.sourcePort || 'Port';
      const srcPortSelector = `[data-device-id="${srcDev?.id}"][data-port-id="${conn.sourcePort}"], [data-device-id="${srcDev?.id}"] [data-port-id="${conn.sourcePort}"], [data-device-id="${srcDev?.id}"]`;
      const srcCoords = getElementCoords(srcPortSelector, srcDev ? srcDev.x + 80 : 200, srcDev ? srcDev.y + 120 : 200);
      moveCursor(srcCoords.x, srcCoords.y, isTr ? `${srcDev?.name || ''} [${portName}] Bağlanıyor` : `Connecting to ${srcDev?.name || ''} [${portName}]`, false);
    }, 400);

    addStep(() => {
      const portName = conn.sourcePort || 'Port';
      const srcPortSelector = `[data-device-id="${srcDev?.id}"][data-port-id="${conn.sourcePort}"], [data-device-id="${srcDev?.id}"] [data-port-id="${conn.sourcePort}"], [data-device-id="${srcDev?.id}"]`;
      const srcCoords = getElementCoords(srcPortSelector, srcDev ? srcDev.x + 80 : 200, srcDev ? srcDev.y + 120 : 200);
      moveCursor(srcCoords.x, srcCoords.y, isTr ? `${srcDev?.name || ''} [${portName}] Tıklandı ✓` : `${srcDev?.name || ''} [${portName}] Clicked ✓`, true);
    }, 400);

    // Target Port
    addStep(() => {
      const portName = conn.targetPort || 'Port';
      const tgtPortSelector = `[data-device-id="${tgtDev?.id}"][data-port-id="${conn.targetPort}"], [data-device-id="${tgtDev?.id}"] [data-port-id="${conn.targetPort}"], [data-device-id="${tgtDev?.id}"]`;
      const tgtCoords = getElementCoords(tgtPortSelector, tgtDev ? tgtDev.x + 80 : 350, tgtDev ? tgtDev.y + 120 : 250);
      moveCursor(tgtCoords.x, tgtCoords.y, isTr ? `${tgtDev?.name || ''} [${portName}] Bağlanıyor` : `Connecting to ${tgtDev?.name || ''} [${portName}]`, false);
    }, 400);

    addStep(() => {
      const portName = conn.targetPort || 'Port';
      const tgtPortSelector = `[data-device-id="${tgtDev?.id}"][data-port-id="${conn.targetPort}"], [data-device-id="${tgtDev?.id}"] [data-port-id="${conn.targetPort}"], [data-device-id="${tgtDev?.id}"]`;
      const tgtCoords = getElementCoords(tgtPortSelector, tgtDev ? tgtDev.x + 80 : 350, tgtDev ? tgtDev.y + 120 : 250);
      moveCursor(tgtCoords.x, tgtCoords.y, isTr ? `${tgtDev?.name || ''} [${portName}] Bağlandı ✓` : `${tgtDev?.name || ''} [${portName}] Connected ✓`, true);
      setConnections(currentConnections);

      window.dispatchEvent(
        new CustomEvent('commit-action-event', {
          detail: {
            action: isTr
              ? `${srcDev?.name || ''} (${conn.sourcePort}) ➔ ${tgtDev?.name || ''} (${conn.targetPort}) [${cableLabel}] bağlandı`
              : `Connected ${srcDev?.name || ''} (${conn.sourcePort}) ➔ ${tgtDev?.name || ''} (${conn.targetPort}) [${cableLabel}]`,
          },
        })
      );
    }, 750);
  });
}

