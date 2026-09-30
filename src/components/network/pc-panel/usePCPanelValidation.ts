import { useCallback } from 'react';
import type { CanvasDevice } from '../NetworkTopology/types/networkTopology.types';
import { validateIP } from './pcPanelHelpers';
import { isNetworkOrBroadcastAddress } from '@/lib/network/core/interface/helpers';

export interface UsePCPanelValidationParams {
  deviceId: string;
  topologyDevices: CanvasDevice[];
  pcIP?: string;
  pcSubnet: string;
  setPcSubnet: (subnet: string) => void;
  setErrors: (updater: (prev: Record<string, string>) => Record<string, string>) => void;
  dispatchDeviceConfig: (config: Partial<CanvasDevice>) => void;
  t: Record<string, string>;
}

export function usePCPanelValidation({
  deviceId,
  topologyDevices,
  pcIP,
  pcSubnet,
  setPcSubnet,
  setErrors,
  dispatchDeviceConfig,
  t
}: UsePCPanelValidationParams) {

  const validateIpField = useCallback((ip: string) => {
    if (validateIP(ip)) {
      let updatedSubnet = pcSubnet;
      const firstOctet = ip.split('.')[0];
      if (firstOctet) {
        const octetNum = parseInt(firstOctet, 10);
        if (!isNaN(octetNum)) {
          let autoSubnet = '255.255.255.0';
          if (octetNum >= 1 && octetNum <= 126) autoSubnet = '255.0.0.0';
          else if (octetNum >= 128 && octetNum <= 191) autoSubnet = '255.255.0.0';
          else if (octetNum >= 192 && octetNum <= 223) autoSubnet = '255.255.255.0';
          updatedSubnet = autoSubnet;
          setPcSubnet(autoSubnet);
        }
      }

      if (isNetworkOrBroadcastAddress(ip, updatedSubnet)) {
        setErrors(prev => ({
          ...prev,
          ip: t.invalidHostAddressMsg || (t.language === 'en' ? 'Invalid host address (Network or broadcast address)' : 'Geçersiz host adresi (Ağ veya Broadcast adresi atanamaz)')
        }));
        return;
      }

      const duplicateDevices = topologyDevices.filter(d => d.id !== deviceId && d.ip === ip);
      if (duplicateDevices.length > 0) {
        const names = duplicateDevices.map(d => d.name || d.id).join(', ');
        setErrors(prev => ({ ...prev, ip: t.ipAlreadyInUse?.replace('{names}', names) || 'IP already in use' }));
        return;
      } else {
        setErrors(prev => { const { ip: _, ...rest } = prev; return rest; });
      }

      dispatchDeviceConfig({ ip, subnet: updatedSubnet, ipConfigMode: 'static' });
    } else {
      setErrors(prev => ({ ...prev, ip: t.invalidIpAddress || 'Invalid IP' }));
    }
  }, [topologyDevices, deviceId, pcSubnet, setPcSubnet, dispatchDeviceConfig, setErrors, t]);

  const validateSubnetField = useCallback((subnet: string) => {
    if (subnet && !validateIP(subnet)) {
      setErrors(prev => ({ ...prev, subnet: t.invalidSubnetMaskMsg || 'Invalid Subnet Mask' }));
      return;
    }

    if (subnet && pcIP && validateIP(pcIP)) {
      if (isNetworkOrBroadcastAddress(pcIP, subnet)) {
        setErrors(prev => ({
          ...prev,
          ip: t.invalidHostAddressMsg || (t.language === 'en' ? 'Invalid host address (Network or broadcast address)' : 'Geçersiz host adresi (Ağ veya Broadcast adresi atanamaz)')
        }));
        return;
      } else {
        setErrors(prev => { const { ip: _, ...rest } = prev; return rest; });
      }
    }

    setErrors(prev => { const { subnet: _, ...rest } = prev; return rest; });
    dispatchDeviceConfig({ subnet, ipConfigMode: 'static' });
  }, [dispatchDeviceConfig, setErrors, t, pcIP]);

  return { validateIpField, validateSubnetField };
}


