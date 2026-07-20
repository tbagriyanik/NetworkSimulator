import { isWLCModel, canAssignIPToPhysicalPort } from './switchModels';
import { CanvasDevice, DeviceType } from '@/components/network/networkTopology.types';

export type DeviceCapabilities = {
  routing: boolean;
  switching: boolean;
  firewall: boolean;
  wirelessController: boolean;
  wlc: boolean;
};

export function getDeviceCapabilities(device?: Pick<CanvasDevice, 'type'> | null, switchModel?: string): DeviceCapabilities {
  const type = (device?.type || '') as DeviceType | '';
  const isSwitch = type === 'switchL2' || type === 'switchL3';
  const isL3Switch = type === 'switchL3' || canAssignIPToPhysicalPort(switchModel);
  const isWLC = type === 'wlc' || isWLCModel(switchModel);

  return {
    routing: type === 'router' || isL3Switch,
    switching: isSwitch,
    firewall: type === 'firewall',
    wirelessController: isWLC,
    wlc: isWLC,
  };
}

export function isWirelessController(capabilities: DeviceCapabilities): boolean {
  return capabilities.wirelessController || capabilities.wlc;
}
