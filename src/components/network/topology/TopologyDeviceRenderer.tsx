import { CanvasDevice } from '../NetworkTopology/types/networkTopology.types';
import { DeviceRenderer, DeviceRendererProps } from './DeviceRenderer';

type TopologyDeviceRendererProps = Omit<DeviceRendererProps, 'device' | 'isSelected' | 'isDragging'> & {
  device: CanvasDevice;
  selectedDeviceIds: Set<string>;
  isDragging?: boolean;
};

/** Connects topology selection state to the presentational device renderer. */
export function TopologyDeviceRenderer({
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
}

