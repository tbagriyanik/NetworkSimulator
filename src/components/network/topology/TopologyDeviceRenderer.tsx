import { memo } from 'react';
import { CanvasDevice } from '../NetworkTopology/types/networkTopology.types';
import { DeviceRenderer, DeviceRendererProps } from './DeviceRenderer';

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
    if (!Object.is(prev[key], next[key])) return false;
  }
  return true;
});

