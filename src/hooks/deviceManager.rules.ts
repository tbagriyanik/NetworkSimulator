import type { DeviceType } from '@/components/network/NetworkTopology/types/networkTopology.types';

export const isSwitchDeviceType = (type?: DeviceType | string): boolean => type === 'switchL2' || type === 'switchL3';
export const resolveSwitchBootType = (switchModel?: string): 'switchL2' | 'switchL3' => switchModel === 'NS-L3-24PS' ? 'switchL3' : 'switchL2';
