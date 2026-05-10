import { canAssignIPToPhysicalPort } from './switchModels';
import { CanvasDevice, DeviceType } from '@/components/network/networkTopology.types';

export type DeviceCapabilities = {
  routing: boolean;
  switching: boolean;
  firewall: boolean;
  wirelessController: boolean;
};

export function getDeviceCapabilities(device?: Pick<CanvasDevice, 'type'> | null, switchModel?: string): DeviceCapabilities {
  const type = (device?.type || '') as DeviceType | '';
  const isSwitch = type === 'switchL2' || type === 'switchL3';
  const isL3Switch = type === 'switchL3' || canAssignIPToPhysicalPort(switchModel);

  return {
    routing: type === 'router' || isL3Switch,
    switching: isSwitch,
    firewall: type === 'firewall',
    wirelessController: type === 'router' || type === 'firewall',
  };
}
