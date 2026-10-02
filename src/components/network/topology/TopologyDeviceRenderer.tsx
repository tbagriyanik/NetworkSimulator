import { memo } from 'react';
import { CanvasDevice, CanvasConnection } from '../NetworkTopology/types/networkTopology.types';
import { DeviceRenderer, DeviceRendererProps, hasLiveSensorReading } from './DeviceRenderer';

type TopologyDeviceRendererProps = Omit<DeviceRendererProps, 'device' | 'isSelected' | 'isDragging'> & {
  device: CanvasDevice;
  selectedDeviceIds: Set<string>;
  isDragging?: boolean;
};

/**
 * Connects topology selection state to the presentational device renderer.
 *
 * Memoized so that a canvas re-render does not have to build an element for
 * every device on screen just to let `DeviceRenderer`'s own comparator reject
 * them. With hundreds of nodes that element churn is a measurable part of the
 * frame, and nothing here changes unless the device or its props do.
 */
export const TopologyDeviceRenderer = memo(function TopologyDeviceRenderer({
  device,
  selectedDeviceIds,
  isDragging = false,
  ...rendererProps
}: TopologyDeviceRendererProps) {
  return (
    <DeviceRenderer
      {...rendererProps}
      device={device}
      isDragging={isDragging}
      isSelected={selectedDeviceIds.has(device.id)}
    />
  );
}, (prev, next) => {
  // The selection Set is rebuilt on every selection change, but the only thing
  // derived from it here is this device's own membership. Comparing that
  // directly means a rubber-band selection drag re-renders the handful of
  // devices that actually gained or lost selection instead of all of them.
  const prevKeys = Object.keys(prev) as (keyof TopologyDeviceRendererProps)[];
  const nextKeys = Object.keys(next) as (keyof TopologyDeviceRendererProps)[];
  if (prevKeys.length !== nextKeys.length) return false;

  for (let i = 0; i < prevKeys.length; i++) {
    const key = prevKeys[i];
    if (key === 'selectedDeviceIds') {
      if (prev.device.id !== next.device.id) return false;
      if (prev.selectedDeviceIds.has(prev.device.id) !== next.selectedDeviceIds.has(next.device.id)) {
        return false;
      }
      continue;
    }
    if (key === 'deviceToConnectionsMap') {
      // Rebuilt whenever any cable changes; only this device's slice is drawn
      // here, so that is the slice worth comparing.
      if (!sameConnectionList(
        prev.deviceToConnectionsMap?.get(prev.device.id),
        next.deviceToConnectionsMap?.get(next.device.id),
      )) return false;
      continue;
    }
    if (key === 'iotUpdateTrigger') {
      // A live sensor sample is read while rendering, so this tick has to reach
      // those devices. Everything else stays bailing out here — the tick is not
      // a reason to rebuild every element on the canvas.
      if (
        prev.iotUpdateTrigger !== next.iotUpdateTrigger &&
        hasLiveSensorReading(prev.device)
      ) {
        return false;
      }
      continue;
    }
    if (!Object.is(prev[key], next[key])) return false;
  }
  return true;
});

function sameConnectionList(
  a: CanvasConnection[] | undefined,
  b: CanvasConnection[] | undefined
): boolean {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

