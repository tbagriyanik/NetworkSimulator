import type { SwitchModel } from '@/lib/network/types';
import type { DeviceType } from '@/components/network/NetworkTopology/types/networkTopology.types';

/**
 * A line in a PC terminal pane.
 *
 * This must stay structurally compatible with `OutputLine` in
 * pc-panel/PCPanel.types.ts: the PC panel components are typed against that
 * interface, so a narrower union here makes `setPcOutputs` unassignable and
 * forces a cast at every boundary. `prompt` and `html` are declared but not
 * currently produced by any code path; they are kept so the two types cannot
 * drift apart again.
 */
/**
 * A line in a PC terminal pane.
 *
 * Re-exported from the PC panel's canonical `OutputLine` instead of being
 * redeclared. This file, `types/pageTypes`, `app/page.types` and
 * `hooks/useHistory` each used to carry their own copy of this interface, and
 * they had already drifted apart: the copies here lacked the `prompt`/`html`
 * line types that the PC panel components are typed against, which made
 * `setPcOutputs` unassignable without a cast.
 */
export type { OutputLine as PCOutputLine } from '@/components/network/pc-panel/PCPanel.types';

export function getDefaultDeviceName(deviceType: DeviceType): string {
  switch (deviceType) {
    case 'router': return 'Router';
    case 'firewall': return 'asa';
    case 'iot': return 'IoT';
    case 'wlc': return 'WLC';
    case 'hub': return 'Hub';
    case 'cloud': return 'Cloud';
    case 'printer': return 'Printer';
    case 'mobile': return 'Mobile';
    case 'pc': return 'PC';
    default: return 'Switch';
  }
}

export function getDefaultDeviceModel(deviceType: DeviceType): SwitchModel {
  switch (deviceType) {
    case 'router':
    case 'switchL3':
      return 'NS-L3-24PS';
    case 'firewall':
      return 'NS-FW-5506';
    case 'wlc':
      return 'NS-WLC-2504';
    default:
      return 'NS-L2-24TT-L';
  }
}

export function resolvePowerOnModel(
  existingModel?: string,
  incomingModel?: string,
  flags?: { isWLC?: boolean; isRouterOrL3?: boolean; isFirewall?: boolean }
): SwitchModel {
  if (existingModel) return existingModel as SwitchModel;
  if (incomingModel) return incomingModel as SwitchModel;
  if (flags?.isWLC) return 'NS-WLC-2504';
  if (flags?.isRouterOrL3) return 'NS-L3-24PS';
  if (flags?.isFirewall) return 'NS-FW-5506';
  return 'NS-L2-24TT-L';
}
