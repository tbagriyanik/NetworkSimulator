import type { Port, SwitchState, CommandMode } from './types';

export function getSmartHint(state: SwitchState, lang: 'tr' | 'en'): string {
  const isTr = lang === 'tr';
  const aliasSupport = isTr
    ? "\nCLI: 'system-view', 'show config' gibi alternatif komut biçimleri de desteklenir."
    : "\nCLI: alternative forms like 'system-view', 'show config' are also supported.";
  const mode: CommandMode = state.currentMode;
  if (mode === 'user') return isTr ? `\nİpucu: Yapılandırma yapmak için 'enable' komutuyla ayrıcalıklı moda geçin.${aliasSupport}` : `\nHint: Enter privileged mode with 'enable' command to start configuration.${aliasSupport}`;
  if (mode === 'privileged') {
    if (!state.hostname || state.hostname === 'Switch' || state.hostname === 'Router') return isTr ? `\nİpucu: Cihaz adını değiştirmek için 'conf t' ve 'hostname <isim>' kullanın.${aliasSupport}` : `\nHint: Use 'conf t' followed by 'hostname <name>' to name your device.${aliasSupport}`;
    return isTr ? `\nİpucu: Yapılandırma moduna girmek için 'configure terminal' kullanın.${aliasSupport}` : `\nHint: Use 'configure terminal' to enter configuration mode.${aliasSupport}`;
  }
  if (mode === 'config') {
    const hasVlans = Object.keys(state.vlans || {}).length > 1;
    if (!hasVlans && state.deviceType?.startsWith('switch')) return isTr ? "\nİpucu: Yeni VLAN oluşturmak için 'vlan <id>' komutunu kullanın." : "\nHint: Use 'vlan <id>' to create a virtual network.";
    return isTr ? "\nİpucu: Arayüz yapılandırmak için 'interface <port-id>' kullanın (Örn: int fa0/1)." : "\nHint: Use 'interface <port-id>' to configure a port (e.g. int fa0/1).";
  }
  if (mode === 'interface') {
    const portId = state.currentInterface || ''; const port: Port | undefined = state.ports[portId];
    if (port?.shutdown) return isTr ? `\nİpucu: ${portId} portunu açmak için 'no shutdown' komutunu kullanın.` : `\nHint: Use 'no shutdown' command to enable port ${portId}.`;
    if (port && port.mode === 'access' && !port.accessVlan) return isTr ? "\nİpucu: Portu VLAN'a atamak için 'switchport access vlan <id>' kullanın." : "\nHint: Use 'switchport access vlan <id>' to assign this port to a VLAN.";
  }
  return '';
}
