import type { Port, SwitchState, CommandMode } from './types';

export function getSmartHint(state: SwitchState, lang: 'tr' | 'en'): string {
  const isTr = lang === 'tr';
  const aliasSupport = isTr
    ? "\n💡 CLI uyumluluğu: 'system-view', 'show config', 'display interface brief' gibi yaygın alternatif komut biçimleri de tanınır."
    : "\n💡 CLI compatibility: common alternative command forms such as 'system-view', 'show config', and 'display interface brief' are also recognized.";
  const mode: CommandMode = state.currentMode;
  if (mode === 'user') return isTr ? `\n💡 İpucu: Yapılandırma yapmak için 'enable' komutuyla ayrıcalıklı moda geçin.${aliasSupport}` : `\n💡 Hint: Enter privileged mode with 'enable' command to start configuration.${aliasSupport}`;
  if (mode === 'privileged') {
    if (!state.hostname || state.hostname === 'Switch' || state.hostname === 'Router') return isTr ? `\n💡 İpucu: Cihaza isim vermek için 'conf t' yazıp 'hostname <isim>' komutunu kullanın.${aliasSupport}` : `\n💡 Hint: Use 'conf t' followed by 'hostname <name>' to name your device.${aliasSupport}`;
    return isTr ? `\n💡 İpucu: Yapılandırma moduna girmek için 'configure terminal' kullanın.${aliasSupport}` : `\n💡 Hint: Use 'configure terminal' to enter configuration mode.${aliasSupport}`;
  }
  if (mode === 'config') {
    const hasVlans = Object.keys(state.vlans || {}).length > 1;
    if (!hasVlans && state.deviceType?.startsWith('switch')) return isTr ? "\n💡 İpucu: Yeni bir sanal ağ oluşturmak için 'vlan <id>' komutunu kullanın." : "\n💡 Hint: Use 'vlan <id>' to create a new virtual network.";
    return isTr ? "\n💡 İpucu: Bir portu yapılandırmak için 'interface <port-id>' komutunu kullanın (Örn: int fa0/1)." : "\n💡 Hint: Use 'interface <port-id>' to configure a port (e.g., int fa0/1).";
  }
  if (mode === 'interface') {
    const portId = state.currentInterface || ''; const port: Port | undefined = state.ports[portId];
    if (port?.shutdown) return isTr ? `\n💡 İpucu: ${portId} portunu aktif hale getirmek için 'no shutdown' komutunu kullanın.` : `\n💡 Hint: Use 'no shutdown' command to enable port ${portId}.`;
    if (port && port.mode === 'access' && !port.accessVlan) return isTr ? "\n💡 İpucu: Bu portu bir VLAN'a atamak için 'switchport access vlan <id>' kullanın." : "\n💡 Hint: Use 'switchport access vlan <id>' to assign this port to a VLAN.";
  }
  return '';
}
