import type { SwitchState } from './types';
import { isRouterModel } from './switchModels';

export function computeInterfaceSummary(state: SwitchState): string {
  const isRouter = isRouterModel(state.version.modelName) || isRouterModel(state.switchModel);
  const isL3Switch = state.version.modelName.includes('NS-L3');
  const isFirewall = state.deviceType === 'firewall' || state.switchLayer === 'FW' || state.version.modelName.includes('NS-FW');
  const reportedFeCount = isRouter ? 0 : 24;
  const reportedGiCount = isFirewall ? 2 : (isRouter || isL3Switch) ? 4 : 2;
  const wlanCount = Object.values(state.ports || {}).filter(p => (p?.id || '').startsWith('wlan')).length;
  const parts: string[] = [];
  if (reportedFeCount > 0) parts.push(`${reportedFeCount} FastEthernet/IEEE 802.3 interface(s)`);
  if (reportedGiCount > 0) parts.push(`${reportedGiCount} Gigabit Ethernet/IEEE 802.3 interface(s)`);
  if (wlanCount > 0) parts.push(`${wlanCount} 802.11 Wireless interface(s)`);
  return parts.join('\n');
}

export function generateBootMessages(state: SwitchState, language: 'tr' | 'en', full: boolean): string {
  const isRouter = isRouterModel(state.version.modelName) || isRouterModel(state.switchModel);
  const isL3Switch = state.version.modelName.includes('NS-L3');
  const ifaceSummary = computeInterfaceSummary(state);
  const syslog = language === 'tr' ? '*** Syslog istemcisi başlatıldı' : '*** Syslog client started';
  const platform = isRouter ? 'NS-R-4451 platform with 4096 K bytes of memory' : isL3Switch ? 'NS-L3 platform with 131072 K bytes of memory' : 'NS-L2 platform with 65536 K bytes of memory';
  const bootBin = isRouter ? 'router-software.bin' : isL3Switch ? 'l3switch-software.bin' : 'l2switch-software.bin';
  const postCheck = isRouter || isL3Switch ? 'POST: CPU PCIe port Check PASS' : 'POST: CPU Ethernet port Check PASS';
  let body: string;
  if (full) {
    const initLines = isRouter ? `Load/bootstrap symbols loaded, NetSim OS initialization\nReading all bootflash vectors` : `Load/bootstrap symbols loaded\nReading all bootflash vectors`;
    body = `${platform}\n\n${syslog}\n${initLines}\n${postCheck}\nCPU memory test . . . . . . . . . . . . . OK\nBoard initialization completed\nInitializing flash file system\n\nBooting flash:${bootBin}...OK!\nExtracting files from flash:${bootBin}...\n  ########## [OK]\n  0 bytes remaining in flash device\n\n${ifaceSummary}`;
  } else {
    const fullBootLines = `${syslog}\nLoad/bootstrap symbols loaded\nReading all bootflash vectors\n${postCheck}\nCPU memory test . . . . . . . . . . . . . OK\nBoard initialization completed\nInitializing flash file system\n\nBooting flash:${bootBin}...OK!\nExtracting files from flash:${bootBin}...\n  ########## [OK]\n  0 bytes remaining in flash device\n\n${ifaceSummary}`;
    const shortBootLines = `${syslog}\nExtracting files from flash:${bootBin}...\n  ########## [OK]\n  0 bytes remaining in flash device\n\n${ifaceSummary}`;
    body = (!isRouter && !isL3Switch) ? fullBootLines : shortBootLines;
  }
  return `System Bootstrap\nTechnical Support: http://yunus.sf.net\nCopyright (c) 1996-2026 by Network Systems, Inc.\n${body}`;
}
