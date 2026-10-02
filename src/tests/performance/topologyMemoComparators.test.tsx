import { describe, it, expect } from 'vitest';
import { ConnectionLine } from '@/components/network/ConnectionLine';
import { DeviceRenderer } from '@/components/network/topology/DeviceRenderer';
import { TopologyDeviceRenderer } from '@/components/network/topology/TopologyDeviceRenderer';
import { CABLE_COLORS } from '@/components/network/NetworkTopology/utils/networkTopology.constants';
import { getPortPosition } from '@/components/network/NetworkTopology/utils/networkTopology.helpers';
import type { CanvasConnection, CanvasDevice } from '@/components/network/NetworkTopology/types/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';

/**
 * Regression cover for the canvas memo comparators.
 *
 * Both components used to bail out on whole-`Map` identity, so any single
 * device's runtime state moving (the 2s VoIP pass, the 10s protocol pass, one
 * CLI command) repainted every device and every cable on the canvas. That is
 * the difference between a topology that pans smoothly and one that hitches
 * several times a minute on a 100-node lab.
 *
 * The comparators are exercised directly: `memo()` exposes the predicate, and
 * driving it with real prop pairs keeps the assertions about "would this cable
 * repaint?" instead of about React's commit bookkeeping.
 */

type ConnectionLineProps = React.ComponentProps<typeof ConnectionLine>;
type DeviceRendererProps = React.ComponentProps<typeof DeviceRenderer>;
type TopologyDeviceRendererProps = React.ComponentProps<typeof TopologyDeviceRenderer>;

const connectionCompare = (ConnectionLine as unknown as { compare: (a: ConnectionLineProps, b: ConnectionLineProps) => boolean }).compare;
const deviceCompare = (DeviceRenderer as unknown as { compare: (a: DeviceRendererProps, b: DeviceRendererProps) => boolean }).compare;

const noop = () => {};

function makeDevice(
  id: string,
  type: CanvasDevice['type'],
  x: number,
  y: number,
  extra: Partial<CanvasDevice> = {}
): CanvasDevice {
  return {
    id,
    type,
    name: id.toUpperCase(),
    x,
    y,
    ip: '192.168.1.1',
    status: 'online',
    ports: [{ id: 'eth0', label: 'eth0', shutdown: false }],
    ...extra,
  } as CanvasDevice;
}

function makeState(ports: SwitchState['ports'] = {}): SwitchState {
  return { ports } as SwitchState;
}

function makeConnection(
  id: string,
  sourceDeviceId: string,
  targetDeviceId: string,
  cableType: CanvasConnection['cableType'] = 'straight'
): CanvasConnection {
  return {
    id,
    sourceDeviceId,
    sourcePort: 'eth0',
    targetDeviceId,
    targetPort: 'eth0',
    cableType,
    active: true,
  } as CanvasConnection;
}

describe('memo comparators are wired up', () => {
  it('exposes a comparator on both memoized canvas components', () => {
    expect(typeof connectionCompare).toBe('function');
    expect(typeof deviceCompare).toBe('function');
  });
});

describe('ConnectionLine memo comparator', () => {
  const source = makeDevice('pc1', 'pc', 0, 0);
  const target = makeDevice('sw1', 'switchL2', 200, 0);
  const ap = makeDevice('wlc1', 'wlc', 200, 0);
  const devices = [source, target];
  const connection = makeConnection('c1', 'pc1', 'sw1');

  function makeProps(overrides: Partial<ConnectionLineProps> = {}): ConnectionLineProps {
    return {
      connection,
      sourceDevice: source,
      targetDevice: target,
      totalSameConns: 1,
      sameConnIndex: 0,
      getPortPosition,
      CABLE_COLORS,
      isDark: true,
      deviceStates: new Map(),
      topologyDevices: devices,
      ...overrides,
    };
  }

  it('skips the repaint when a device-state tick touched another device', () => {
    const base = makeProps({
      deviceStates: new Map<string, SwitchState>([
        ['pc1', makeState()],
        ['sw1', makeState()],
      ]),
    });
    const next = makeProps({
      deviceStates: new Map<string, SwitchState>([
        ['pc1', makeState()],
        ['sw1', makeState()],
        ['fw1', makeState()],
      ]),
    });

    expect(connectionCompare(base, next)).toBe(true);
  });

  it('repaints when one of its endpoints enters a blocking STP state', () => {
    const base = makeProps();
    const next = makeProps({
      deviceStates: new Map<string, SwitchState>([
        ['sw1', makeState({ eth0: { spanningTree: { state: 'blocking' } } } as never)],
      ]),
    });

    expect(connectionCompare(base, next)).toBe(false);
  });

  it('repaints when the cable itself changes, even with the same id', () => {
    // A cable-type swap keeps the id and `active` flag but must not leave a
    // stale fibre-coloured line on screen.
    const next = makeProps({
      connection: { ...connection, cableType: 'fiber' },
    });

    expect(connectionCompare(makeProps(), next)).toBe(false);
  });

  it('repaints when a device moves', () => {
    expect(connectionCompare(makeProps(), makeProps({ sourceDevice: { ...source, x: 40 } }))).toBe(false);
  });

  it('repaints on hover, label and graphics-quality changes', () => {
    expect(connectionCompare(makeProps(), makeProps({ isHovered: true }))).toBe(false);
    expect(connectionCompare(makeProps(), makeProps({ showLabel: false }))).toBe(false);
    expect(connectionCompare(makeProps(), makeProps({ graphicsQuality: 'low' }))).toBe(false);
  });

  it('keeps wireless cables sensitive to the global state map', () => {
    // A wireless bar is drawn against every AP, so a state change anywhere is a
    // real input even though neither endpoint's slice changed.
    const wirelessProps = (deviceStates: Map<string, SwitchState>): ConnectionLineProps => ({
      ...makeProps({ deviceStates }),
      connection: makeConnection('w1', 'pc1', 'wlc1', 'wireless'),
      targetDevice: ap,
      topologyDevices: [source, ap],
    });

    const base = wirelessProps(new Map());
    const next = wirelessProps(new Map([['wlc1', makeState({ wlan0: { shutdown: true } } as never)]]));

    expect(connectionCompare(base, next)).toBe(false);
  });

  it('skips the repaint for a wireless cable when nothing at all changed', () => {
    const wirelessDevices = [source, ap];
    const wirelessConnection = makeConnection('w1', 'pc1', 'wlc1', 'wireless');
    const states = new Map<string, SwitchState>([['wlc1', makeState()]]);
    const props: ConnectionLineProps = {
      ...makeProps({ deviceStates: states }),
      connection: wirelessConnection,
      targetDevice: ap,
      topologyDevices: wirelessDevices,
    };

    expect(connectionCompare(props, { ...props })).toBe(true);
  });
});

describe('DeviceRenderer memo comparator', () => {
  const switchDevice = makeDevice('sw1', 'switchL2', 0, 0);
  const pc = makeDevice('pc1', 'pc', 0, 0);
  const firewall = makeDevice('fw1', 'firewall', 400, 0);

  // Stable identities: these props are compared by reference, so handing each
  // call fresh objects would report a repaint for reasons the comparator is
  // meant to catch in the topology data, not in the test scaffolding.
  const translations: Record<string, string> = {};
  const stableConnectionMap = new Map<string, CanvasConnection[]>();
  const stableProps = {
    isSelected: false,
    isDark: true,
    language: 'en',
    t: translations,
    graphicsQuality: 'high' as const,
    isDraggingInteractionDisabled: false,
    getLiveDeviceVlan: () => null,
    getIotMeasuredValue: () => '',
    handlePortHover: noop,
    handlePortMouseLeave: noop,
    handlePortClick: noop,
    handleDeviceMouseDown: noop,
    handleDevicePointerDown: noop,
    handleDeviceClick: noop,
    handleDeviceKeyDown: noop,
    handleDeviceDoubleClick: noop,
    handleDeviceMouseLeave: noop,
    handleDeviceTouchStart: noop,
    handleDeviceTouchMove: noop,
    handleDeviceTouchEnd: noop,
    _mousePosRef: { current: { x: 0, y: 0 } },
  };

  function makeProps(overrides: Partial<DeviceRendererProps> = {}): DeviceRendererProps {
    return {
      ...stableProps,
      device: switchDevice,
      topologyDevices: [switchDevice, firewall],
      deviceStates: new Map(),
      deviceToConnectionsMap: new Map<string, CanvasConnection[]>(),
      ...overrides,
    } as DeviceRendererProps;
  }

  it('skips the repaint when a device-state tick touched another device', () => {
    // Structural sharing: the tick replaced the map, but `sw1`'s slice is the
    // same object it was before — only `fw1` gained an entry.
    const switchState = makeState();
    const base = makeProps({ deviceStates: new Map<string, SwitchState>([['sw1', switchState]]) });
    const next = makeProps({
      deviceStates: new Map<string, SwitchState>([['sw1', switchState], ['fw1', makeState()]]),
    });

    expect(deviceCompare(base, next)).toBe(true);
  });

  it('repaints when its own device-state slice changes', () => {
    expect(
      deviceCompare(makeProps({ deviceStates: new Map() }), makeProps({
        deviceStates: new Map<string, SwitchState>([['sw1', makeState()]]),
      })),
    ).toBe(false);
  });

  it('ignores a rebuilt connection map that did not touch this device', () => {
    // A cable was added on the firewall; `sw1`'s own slice is untouched, so the
    // rebuilt map must not force this device to repaint.
    const firewallCable = makeConnection('c9', 'fw1', 'r1');
    const base = makeProps({
      deviceToConnectionsMap: new Map<string, CanvasConnection[]>([['fw1', [firewallCable]]]),
    });
    const next = makeProps({
      deviceToConnectionsMap: new Map<string, CanvasConnection[]>([
        ['fw1', [firewallCable, makeConnection('c10', 'fw1', 'r2')]],
      ]),
    });

    expect(deviceCompare(base, next)).toBe(true);
  });

  it('repaints when a cable appears on this device', () => {
    const base = makeProps({ deviceToConnectionsMap: new Map<string, CanvasConnection[]>() });
    const next = makeProps({
      deviceToConnectionsMap: new Map<string, CanvasConnection[]>([
        ['sw1', [makeConnection('c1', 'sw1', 'r1')]],
      ]),
    });

    expect(deviceCompare(base, next)).toBe(false);
  });

  it('repaints when a cable on this device changed', () => {
    const cable = makeConnection('c1', 'sw1', 'r1');
    const base = makeProps({
      deviceToConnectionsMap: new Map<string, CanvasConnection[]>([['sw1', [cable]]]),
    });
    const next = makeProps({
      deviceToConnectionsMap: new Map<string, CanvasConnection[]>([
        ['sw1', [cable, makeConnection('c2', 'sw1', 'r2')]],
      ]),
    });

    expect(deviceCompare(base, next)).toBe(false);
  });

  it('keeps wifi clients sensitive to the global state map', () => {
    const wifiDevices = [pc, firewall];
    const pcProps = (deviceStates: Map<string, SwitchState>): DeviceRendererProps => makeProps({
      device: pc,
      topologyDevices: wifiDevices,
      deviceStates,
    });

    // A wifi client resolves its bars against every AP, so an AP's state moving
    // is a real input for it even though its own slice did not change.
    expect(
      deviceCompare(pcProps(new Map()), pcProps(new Map([['fw1', makeState()]]))),
    ).toBe(false);
  });

  it('skips the repaint for a wifi client when its own slice is untouched', () => {
    const wifiDevices = [pc, firewall];
    const states = new Map<string, SwitchState>([['pc1', makeState()]]);
    const pcProps = makeProps({ device: pc, topologyDevices: wifiDevices, deviceStates: states });
    expect(deviceCompare(pcProps, { ...pcProps })).toBe(true);
  });

  it('repaints on selection, drag and quality changes', () => {
    expect(deviceCompare(makeProps(), makeProps({ isSelected: true }))).toBe(false);
    expect(deviceCompare(makeProps(), makeProps({ isDragging: true }))).toBe(false);
    expect(deviceCompare(makeProps(), makeProps({ graphicsQuality: 'low' }))).toBe(false);
    expect(deviceCompare(makeProps(), makeProps({ isDark: false }))).toBe(false);
  });

  it('lets the refresh tick repaint a live sensor and nothing else', () => {
    const sensor = makeDevice('iot1', 'iot', 0, 0, {
      iot: { sensorType: 'temperature', collaborationEnabled: true },
    } as Partial<CanvasDevice>);
    const lamp = makeDevice('iot2', 'iot', 200, 0, {
      iot: { kind: 'lamp', collaborationEnabled: true },
    } as Partial<CanvasDevice>);
    const switchWithSensor = makeDevice('sw1', 'switchL2', 400, 0);
    const iotDevices = [sensor, lamp];
    const stableStates = new Map<string, SwitchState>();

    const tickProps = (device: CanvasDevice, trigger: number): DeviceRendererProps => makeProps({
      device,
      topologyDevices: device === switchWithSensor ? [switchWithSensor, firewall] : iotDevices,
      deviceStates: stableStates,
      iotUpdateTrigger: trigger,
    });

    // The tick only exists to move live sensor readouts, which are sampled
    // during render — a controlled lamp's label already follows its object.
    expect(deviceCompare(tickProps(sensor, 1), tickProps(sensor, 2))).toBe(false);
    expect(deviceCompare(tickProps(lamp, 1), tickProps(lamp, 2))).toBe(true);
    expect(deviceCompare(tickProps(switchWithSensor, 1), tickProps(switchWithSensor, 2))).toBe(true);
  });

  it('lets the refresh tick through the outer wrapper only for live sensors', () => {
    // The outer wrapper bails out first, so if it swallowed the tick the inner
    // comparator would never get the chance to repaint a sensor label.
    const outerCompare = (TopologyDeviceRenderer as unknown as {
      compare: (a: TopologyDeviceRendererProps, b: TopologyDeviceRendererProps) => boolean;
    }).compare;

    const sensor = makeDevice('iot1', 'iot', 0, 0, {
      iot: { sensorType: 'temperature', collaborationEnabled: true },
    } as Partial<CanvasDevice>);
    const lamp = makeDevice('iot2', 'iot', 200, 0, {
      iot: { kind: 'lamp', collaborationEnabled: true },
    } as Partial<CanvasDevice>);
    const switchDevice = makeDevice('sw1', 'switchL2', 400, 0);
    const iotDevices = [sensor, lamp];
    const switchTopologyDevices = [switchDevice, firewall];
    const stableStates = new Map<string, SwitchState>();
    const selected = new Set<string>();

    const tickProps = (device: CanvasDevice, trigger: number): TopologyDeviceRendererProps => ({
      ...stableProps,
      device,
      selectedDeviceIds: selected,
      topologyDevices: device === switchDevice ? switchTopologyDevices : iotDevices,
      deviceStates: stableStates,
      deviceToConnectionsMap: stableConnectionMap,
      iotUpdateTrigger: trigger,
    });

    expect(outerCompare(tickProps(sensor, 1), tickProps(sensor, 2))).toBe(false);
    expect(outerCompare(tickProps(lamp, 1), tickProps(lamp, 2))).toBe(true);
    expect(outerCompare(tickProps(switchDevice, 1), tickProps(switchDevice, 2))).toBe(true);
  });
});
