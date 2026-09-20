import { useCallback } from 'react';
import { SwitchState, SwitchModel, Port } from '@/lib/network/types';
import { createInitialState, createInitialRouterState } from '@/lib/network/initialState';
import { DeviceType } from '@/components/network/NetworkTopology/types/networkTopology.types';

export function useDeviceManagerHelpers() {
  const getBootMessage = useCallback((deviceType: Exclude<DeviceType, 'pc'>, switchModel?: string, language: 'tr' | 'en' = 'en') => {
    const isRouter = deviceType === 'router';
    const isFirewall = deviceType === 'firewall' || switchModel?.includes('NS-FW');
    const isL3Switch = deviceType === 'switchL3' || switchModel?.includes('NS-L3');
    const isWLC = deviceType === 'wlc' || switchModel?.includes('NS-WLC');

    if (isFirewall) {
      return {
        boot1: `\n\nNetSim Firewall Software\n\n`,
        boot2: `Compiled on Mon 21-Mar-16 11:52 PDT by builders\nSystem Bootstrap\n\nNS-FW-5506 platform with 4096 K bytes of memory\n`,
        boot3: `\nReading from flash... OK\nValidating image checksum... OK\n\n`,
        initMessage: language === 'tr' ? 'Firewall başlatılıyor' : 'Firewall is starting'
      };
    }

    if (isRouter) {
      const syslog = language === 'tr' ? '*** Syslog istemcisi başlatıldı' : '*** Syslog client started';
      return {
        boot1: `\n\nSystem Bootstrap\nTechnical Support: http://yunus.sf.net\nCopyright (c) 1996-2026 by Network Systems, Inc.\n`,
        boot2: `NS-R-4451 platform with 4096 K bytes of memory\n\n${syslog}\nLoad/bootstrap symbols loaded, NetSim OS initialization\nReading all bootflash vectors\nPOST: CPU PCIe port Check PASS\nCPU memory test . . . . . . . . . . . . . OK\nBoard initialization completed\nInitializing flash file system\n`,
        boot3: `\nBooting flash:ns-r-universalk9-mz.SPA.154-3.M.bin...OK!\nExtracting files from flash:ns-r-universalk9-mz.SPA.154-3.M.bin...\n  ########## [OK]\n  0 bytes remaining in flash device\n`,
        initMessage: language === 'tr' ? 'Sistem başlatılıyor' : 'Initializing system'
      };
    }

    if (isWLC) {
      const syslog = language === 'tr' ? '*** Syslog istemcisi başlatıldı' : '*** Syslog client started';
      return {
        boot1: `\n\nSystem Bootstrap\nTechnical Support: http://yunus.sf.net\nCopyright (c) 1996-2026 by Network Systems, Inc.\n`,
        boot2: `NS-WLC-2504 platform with 2097152 K bytes of memory\n\n${syslog}\nLoad/bootstrap symbols loaded\nReading all bootflash vectors\nPOST: CPU PCIe port Check PASS\nCPU memory test . . . . . . . . . . . . . OK\nBoard initialization completed\nInitializing flash file system\n`,
        boot3: `\nBooting flash:ns-wlc-8-0-125-0.bin...OK!\nExtracting files from flash:ns-wlc-8-0-125-0.bin...\n  ########## [OK]\n  0 bytes remaining in flash device\n`,
        initMessage: language === 'tr' ? 'WLC başlatılıyor' : 'WLC is starting'
      };
    }

    if (isL3Switch) {
      const syslog = language === 'tr' ? '*** Syslog istemcisi başlatıldı' : '*** Syslog client started';
      return {
        boot1: `\n\nSystem Bootstrap\nTechnical Support: http://yunus.sf.net\nCopyright (c) 1996-2026 by Network Systems, Inc.\n`,
        boot2: `NS-L3 platform with 131072 K bytes of memory\n\n${syslog}\nLoad/bootstrap symbols loaded\nReading all bootflash vectors\nPOST: CPU PCIe port Check PASS\nCPU memory test . . . . . . . . . . . . . OK\nBoard initialization completed\nInitializing flash file system\n`,
        boot3: `\nBooting flash:ns-l3-ipbase-mz.152-2.SE4.bin...OK!\nExtracting files from flash:ns-l3-ipbase-mz.152-2.SE4.bin...\n  ########## [OK]\n  0 bytes remaining in flash device\n`,
        initMessage: language === 'tr' ? 'Sistem açıldı' : 'System is powered on'
      };
    }

    const syslog = language === 'tr' ? '*** Syslog istemcisi başlatıldı' : '*** Syslog client started';
    return {
      boot1: `\n\nSystem Bootstrap\nTechnical Support: http://yunus.sf.net\nCopyright (c) 1996-2026 by Network Systems, Inc.\n`,
      boot2: `NS-L2 platform with 65536 K bytes of memory\n\n${syslog}\nLoad/bootstrap symbols loaded\nReading all bootflash vectors\nPOST: CPU Ethernet port Check PASS\nCPU memory test . . . . . . . . . . . . . OK\nBoard initialization completed\nInitializing flash file system\n`,
      boot3: `\nBooting flash:ns-l2-lanbase-mz.152-2.E6.bin...OK!\nExtracting files from flash:ns-l2-lanbase-mz.152-2.E6.bin...\n  ########## [OK]\n  0 bytes remaining in flash device\n`,
      initMessage: language === 'tr' ? 'Sistem açıldı' : 'System is powered on'
    };
  }, []);

  const ensureSwitchModelConsistency = useCallback((state: SwitchState, model?: string, macAddress?: string, isRouter?: boolean): SwitchState => {
    if (!model) return state;

    const normalizedModel = model as string;
    const baseState = isRouter ? createInitialRouterState(macAddress || state.macAddress) : createInitialState(macAddress || state.macAddress, normalizedModel as 'NS-L2-24TT-L' | 'NS-L3-24PS');

    const modelChanged = state.switchModel !== normalizedModel;

    let mergedPorts: Record<string, Port> = {} as Record<string, Port>;

    if (modelChanged) {
      const newPortIds = Object.keys(baseState.ports);
      mergedPorts = { ...baseState.ports };

      Object.entries(state.ports).forEach(([id, port]) => {
        if (id === 'console' || id.toLowerCase().startsWith('vlan')) {
          mergedPorts[id] = { ...mergedPorts[id], ...port, id };
          return;
        }

        if (id === 'wlan0' && newPortIds.includes('wlan0')) {
          mergedPorts[id] = { ...mergedPorts[id], ...port, id };
          return;
        }

        if (newPortIds.includes(id)) {
          const oldType = port.type;
          const newType = mergedPorts[id]?.type;
          if (oldType && newType && oldType !== newType && /^[a-z]+\d*\/\d+$/.test(id)) {
            return;
          }
          mergedPorts[id] = { ...mergedPorts[id], ...port, id };
        }

        if (id.includes('.')) {
          const parentId = id.split('.')[0];
          if (newPortIds.includes(parentId)) {
            mergedPorts[id] = port;
          }
        }
      });
    } else {
      mergedPorts = { ...baseState.ports, ...state.ports };
    }

    return {
      ...state,
      switchModel: normalizedModel as SwitchModel,
      switchLayer: baseState.switchLayer,
      ports: mergedPorts,
      version: {
        ...state.version,
        modelName: normalizedModel,
      },
    };
  }, []);

  return { getBootMessage, ensureSwitchModelConsistency };
}

