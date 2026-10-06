import { useCallback } from 'react';
import type { CanvasDevice } from '../NetworkTopology/types/networkTopology.types';
import { validateIP, validateIPv6 } from './pcPanelHelpers';
import { isValidMAC, normalizeMAC } from '@/lib/utils';
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

  const validateMacField = useCallback((mac: string) => {
    if (!mac || !mac.trim()) {
      setErrors(prev => { const { mac: _, ...rest } = prev; return rest; });
      return;
    }

    if (isValidMAC(mac)) {
      const normalized = normalizeMAC(mac);
      const duplicateDevices = topologyDevices.filter(d => {
        if (d.id === deviceId) return false;
        if (d.macAddress && normalizeMAC(d.macAddress) === normalized) return true;
        if (d.ports?.some(p => p.macAddress && normalizeMAC(p.macAddress) === normalized)) return true;
        return false;
      });

      if (duplicateDevices.length > 0) {
        const names = duplicateDevices.map(d => d.name || d.id).join(', ');
        setErrors(prev => ({
          ...prev,
          mac: t.macAlreadyInUse?.replace('{names}', names) || (t.language === 'en' ? `This MAC address is already used by ${names}` : `Bu MAC adresi zaten ${names} tarafından kullanılıyor`)
        }));
        return;
      } else {
        setErrors(prev => { const { mac: _, ...rest } = prev; return rest; });
      }

      dispatchDeviceConfig({ macAddress: normalized });
    } else {
      setErrors(prev => ({
        ...prev,
        mac: t.invalidMacAddress || (t.language === 'en' ? 'Invalid MAC address' : 'Geçersiz MAC adresi')
      }));
    }
  }, [topologyDevices, deviceId, dispatchDeviceConfig, setErrors, t]);

  const validateIpv6Field = useCallback((ipv6: string) => {
    if (!ipv6 || !ipv6.trim()) {
      setErrors(prev => { const { ipv6: _, ...rest } = prev; return rest; });
      return;
    }

    if (validateIPv6(ipv6)) {
      const normIpv6 = ipv6.trim().toLowerCase();
      const duplicateDevices = topologyDevices.filter(d => {
        if (d.id === deviceId) return false;
        if (d.ipv6 && d.ipv6.trim().toLowerCase() === normIpv6) return true;
        if (d.ports?.some(p => p.ipv6Address && p.ipv6Address.trim().toLowerCase() === normIpv6)) return true;
        return false;
      });

      if (duplicateDevices.length > 0) {
        const names = duplicateDevices.map(d => d.name || d.id).join(', ');
        setErrors(prev => ({
          ...prev,
          ipv6: t.ipv6AlreadyInUse?.replace('{names}', names) || (t.language === 'en' ? `This IPv6 address is already used by ${names}` : `Bu IPv6 adresi zaten ${names} tarafından kullanılıyor`)
        }));
        return;
      } else {
        setErrors(prev => { const { ipv6: _, ...rest } = prev; return rest; });
      }

      dispatchDeviceConfig({ ipv6 });
    } else {
      setErrors(prev => ({
        ...prev,
        ipv6: t.invalidIpv6Address || (t.language === 'en' ? 'Invalid IPv6 address' : 'Geçersiz IPv6 adresi')
      }));
    }
  }, [topologyDevices, deviceId, dispatchDeviceConfig, setErrors, t]);

  const validateIpv6PrefixField = useCallback((prefix: string) => {
    if (!prefix || !prefix.trim()) {
      setErrors(prev => { const { ipv6Prefix: _, ...rest } = prev; return rest; });
      return;
    }

    const num = parseInt(prefix.trim(), 10);
    if (!isNaN(num) && num >= 1 && num <= 128) {
      setErrors(prev => { const { ipv6Prefix: _, ...rest } = prev; return rest; });
      dispatchDeviceConfig({ ipv6Prefix: prefix.trim() });
    } else {
      setErrors(prev => ({
        ...prev,
        ipv6Prefix: t.invalidIpv6Prefix || (t.language === 'en' ? 'Invalid IPv6 prefix (1-128)' : 'Geçersiz IPv6 öneki (1-128)')
      }));
    }
  }, [dispatchDeviceConfig, setErrors, t]);

  return { validateIpField, validateSubnetField, validateMacField, validateIpv6Field, validateIpv6PrefixField };
}


