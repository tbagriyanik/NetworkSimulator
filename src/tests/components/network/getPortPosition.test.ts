import { describe, it, expect } from 'vitest';
import {
  getPortPosition,
  getDeviceCenter,
  getDeviceWidth,
} from '@/components/network/NetworkTopology/utils/networkTopology.helpers';
import {
  PORT_SPACING,
  PORT_START_X,
  PORT_START_Y,
  PC_PORT_SPACING,
} from '@/components/network/NetworkTopology/utils/networkTopology.constants';
import { isModulePort } from '@/lib/network/portUtils';
import type { CanvasDevice, CanvasPort } from '@/components/network/NetworkTopology/types/networkTopology.types';

/**
 * `getPortPosition` was rewritten to derive the router/WLC port rows once per
 * port array (cached in a WeakMap) instead of rebuilding four filtered arrays on
 * every call. That call happens twice per cable per render and twice per cable
 * per drag frame, so the caching is the whole point — but a cached layout is
 * only safe if it produces exactly the same coordinates as the straight-line
 * version it replaced.
 *
 * `referenceGetPortPosition` below is the previous implementation, kept verbatim
 * as the oracle. These tests compare the two across every device shape and port
 * mix the app can produce, so a future edit to either side cannot silently move
 * a cable.
 */
function referenceGetPortPosition(device: CanvasDevice, portId: string) {
  if (device.type === 'iot' && portId.toLowerCase() === 'wlan0') {
    const deviceWidth = getDeviceWidth(device.type);
    return { x: device.x + deviceWidth - 15, y: device.y + 14 };
  }
  const portIndex = device.ports.findIndex(p => p.id === portId);
  if (portIndex === -1) return getDeviceCenter(device);

  const portsPerRow = (device.type === 'pc' || device.type === 'iot') ? 2 : 8;
  const col = portIndex % portsPerRow;
  const row = Math.floor(portIndex / portsPerRow);

  if (device.type === 'pc' || device.type === 'iot') {
    const pcPortSpacing = PC_PORT_SPACING;
    const pcStartY = 85 / 2 - ((device.ports.length - 1) * pcPortSpacing) / 2;
    const devWidth = getDeviceWidth(device.type);
    return {
      x: device.x + devWidth - 8,
      y: device.y + pcStartY + portIndex * pcPortSpacing
    };
  }

  let actualCol: number;
  let actualRow: number;

  const isRouterOrSwitch = device.type === 'router' || device.type === 'switchL2' || device.type === 'switchL3';

  if (device.type === 'wlc') {
    const filteredPorts = device.ports.filter(p => p.id !== 'wlan0' && !p.id.startsWith('service'));
    const portIdLower = portId.toLowerCase();
    const giPorts = filteredPorts.filter(p => p.id.toLowerCase().startsWith('gi'));
    const otherPorts = filteredPorts.filter(p => !p.id.toLowerCase().startsWith('gi'));
    const isGi = portIdLower.startsWith('gi');

    if (isGi) {
      actualCol = giPorts.findIndex(p => p.id === portId);
    } else {
      actualCol = giPorts.length + otherPorts.findIndex(p => p.id === portId);
    }
    actualRow = 0;
  } else if (isRouterOrSwitch) {
    const isModulePortId = isModulePort(portId);

    if (isModulePortId) {
      const builtInPorts = device.ports.filter(p => !isModulePort(p.id) && p.id !== 'wlan0' && !p.id.startsWith('service'));
      const modulePorts = device.ports.filter(p => isModulePort(p.id));
      const modulePortIndex = modulePorts.findIndex(p => p.id === portId);

      let maxBuiltInRow = 0;
      if (device.type === 'router') {
        maxBuiltInRow = 1;
      } else {
        maxBuiltInRow = Math.max(0, Math.floor((builtInPorts.length - 1) / portsPerRow));
      }

      actualCol = modulePortIndex % portsPerRow;
      actualRow = (maxBuiltInRow + 1) + Math.floor(modulePortIndex / portsPerRow);
    } else if (device.type === 'router') {
      const filteredPorts = device.ports.filter(p => p.id !== 'wlan0' && !p.id.startsWith('service') && !isModulePort(p.id));
      const portIdLower = portId.toLowerCase();
      const giPorts = filteredPorts.filter(p => p.id.toLowerCase().startsWith('gi'));
      const otherPorts = filteredPorts.filter(p => !p.id.toLowerCase().startsWith('gi'));
      const isGi = portIdLower.startsWith('gi');

      if (isGi) {
        actualCol = giPorts.findIndex(p => p.id === portId);
        actualRow = 0;
      } else {
        actualCol = otherPorts.findIndex(p => p.id === portId);
        actualRow = 1;
      }
    } else {
      actualCol = col;
      actualRow = row;
    }
  } else {
    actualCol = col;
    actualRow = row;
  }

  const startX = device.type === 'cloud' ? 44 : PORT_START_X;
  return {
    x: device.x + startX + actualCol * PORT_SPACING,
    y: device.y + PORT_START_Y + actualRow * PORT_SPACING
  };
}

const port = (id: string): CanvasPort => ({ id, label: id, status: 'disconnected' });

function makeDevice(type: CanvasDevice['type'], ports: CanvasPort[]): CanvasDevice {
  return {
    id: `${type}-1`,
    type,
    name: `${type}-1`,
    x: 240,
    y: 180,
    status: 'online',
    ip: '10.0.0.1',
    ports,
  };
}

const ROUTER_PORTS: CanvasPort[] = [
  port('console'),
  port('gi0/0'),
  port('gi0/1'),
  port('gi0/2'),
  port('gi0/3'),
  port('s0/0/0'),
  port('s0/1/0'),
  port('s0/2/0'),
  port('wlan0'),
  port('service0/0'),
  port('Serial0/1/0'),
  port('Serial0/1/1'),
  port('Serial0/2/0'),
  port('Serial0/2/1'),
];

const SWITCH_PORTS: CanvasPort[] = [
  ...Array.from({ length: 24 }, (_, i) => port(`fa0/${i + 1}`)),
  port('gi0/1'),
  port('gi0/2'),
  port('console'),
  port('wlan0'),
  port('TenGigabitEthernet0/1/0'),
  port('TenGigabitEthernet0/1/1'),
];

const WLC_PORTS: CanvasPort[] = [
  port('gi0'),
  port('gi1'),
  port('gi2'),
  port('console'),
  port('wlan0'),
  port('service0'),
  port('port-1'),
];

const PC_PORTS: CanvasPort[] = Array.from({ length: 4 }, (_, i) => port(`eth${i}`));

const CASES: { name: string; device: CanvasDevice; extraPortIds?: string[] }[] = [
  { name: 'router with module ports', device: makeDevice('router', ROUTER_PORTS) },
  { name: 'router without module ports', device: makeDevice('router', ROUTER_PORTS.slice(0, 9)) },
  { name: 'router with only module ports', device: makeDevice('router', ROUTER_PORTS.slice(10)) },
  { name: 'router with a single built-in port', device: makeDevice('router', [port('gi0/0')]) },
  { name: 'L2 switch with module ports', device: makeDevice('switchL2', SWITCH_PORTS) },
  { name: 'L3 switch with module ports', device: makeDevice('switchL3', SWITCH_PORTS) },
  { name: 'switch with no module ports', device: makeDevice('switchL2', SWITCH_PORTS.slice(0, 27)) },
  { name: 'switch with exactly 8 built-in ports', device: makeDevice('switchL2', SWITCH_PORTS.slice(0, 8)) },
  { name: 'switch with 7 built-in ports', device: makeDevice('switchL2', SWITCH_PORTS.slice(0, 7)) },
  { name: 'wlc', device: makeDevice('wlc', WLC_PORTS) },
  { name: 'wlc with no ports', device: makeDevice('wlc', []) },
  { name: 'pc', device: makeDevice('pc', PC_PORTS) },
  { name: 'iot', device: makeDevice('iot', [...PC_PORTS, port('wlan0')]) },
  { name: 'firewall', device: makeDevice('firewall', PC_PORTS) },
  { name: 'hub', device: makeDevice('hub', PC_PORTS) },
  { name: 'cloud', device: makeDevice('cloud', []) },
];

describe('getPortPosition — cached layout matches the previous implementation', () => {
  for (const { name, device, extraPortIds } of CASES) {
    it(`produces identical coordinates for every port of a ${name}`, () => {
      const queriedPorts = [
        ...device.ports.map(p => p.id),
        // Also probe ids that do not exist, and near-misses.
        ...(extraPortIds ?? []),
        'does-not-exist',
        'GI0/0',
        'gi0/99',
      ];

      for (const portId of queriedPorts) {
        expect(
          getPortPosition(device, portId),
          `${name} / ${portId}`
        ).toEqual(
          referenceGetPortPosition(device, portId)
        );
      }
    });
  }

  it('keeps serving correct coordinates after the device moves', () => {
    // The layout cache is keyed on the port array, so a moved device must still
    // resolve to its new coordinates rather than a cached absolute position.
    const device = makeDevice('router', ROUTER_PORTS);
    const before = getPortPosition(device, 'gi0/0');

    const moved: CanvasDevice = { ...device, x: device.x + 500, y: device.y + 320 };
    const after = getPortPosition(moved, 'gi0/0');
    const afterReference = referenceGetPortPosition(moved, 'gi0/0');

    expect(after).toEqual(afterReference);
    expect(after.x).toBe(before.x + 500);
    expect(after.y).toBe(before.y + 320);
  });

  it('recomputes when the port array itself changes', () => {
    // Columns are assigned by Gi-order with first-wins, so prepending ports
    // leaves the first id alone but pushes every later Gi along. Probe `gi0/1`,
    // which really does move, so the assertion cannot pass on a stale cache.
    const device = makeDevice('router', ROUTER_PORTS);
    const original = getPortPosition(device, 'gi0/1');

    const withExtraGi: CanvasDevice = {
      ...device,
      ports: [port('gi0/0'), port('gi0/9'), ...ROUTER_PORTS],
    };
    const shifted = getPortPosition(withExtraGi, 'gi0/1');

    expect(shifted).toEqual(referenceGetPortPosition(withExtraGi, 'gi0/1'));
    expect(shifted.x).toBe(original.x + PORT_SPACING);
    expect(shifted).not.toEqual(original);
  });

  it('treats an identical port array as a separate device, not a moved one', () => {
    // Same ids, new array identity: the cache must be rebuilt rather than
    // reused, and must still land on the same coordinates.
    const device = makeDevice('router', ROUTER_PORTS);
    const copy: CanvasDevice = { ...device, ports: [...ROUTER_PORTS] };

    for (const portId of ROUTER_PORTS.map(p => p.id)) {
      expect(getPortPosition(copy, portId), portId).toEqual(getPortPosition(device, portId));
    }
  });
});
