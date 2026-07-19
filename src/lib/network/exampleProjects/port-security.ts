import { createInitialState } from '../initialState';
import { createSwitchDevice, createPcDevice, connectPorts, baseProjectData } from './helpers';
;
import type { CanvasConnection, CanvasNote } from '@/components/network/networkTopology.types';
import type { ExampleProject } from './types';
;

const example = (isTr: boolean): ExampleProject => {
  const psDevices = [
    createPcDevice('pc-1', 'PC-1', 40, 180, '192.168.1.10', 1),
    createSwitchDevice('switch-1', 'SW1', 240, 180)
  ];
  psDevices[0].macAddress = '00E0.F701.A124';
  const psConnections: CanvasConnection[] = [];
  connectPorts(psDevices, psConnections, 'pc-1', 'eth0', 'switch-1', 'fa0/3');
  const psNotes: CanvasNote[] = [
    {
      id: 'ps-note-1',
      text: isTr
        ? 'Amaç: Switch port\'unda port-security yapılandırarak sadece izin verilen MAC adreslerinin bağlanmasına izin vermek.\n\n🔧 YAPILANDIRMA ADIMLARI:\n\n1) TOPOLOJİ OLUŞTURMA:\n   - 1 adet Switch (SW1) ekle\n   - 1 adet PC (PC-1) ekle\n   - PC-1 Eth0 -> SW1 Fa0/3 (Straight kablo)\n\n2) SWITCH KONFİGÜRASYONU:\n   - SW1 terminaline gir: enable, conf t\n   - interface fa0/3\n     switchport mode access\n     switchport port-security\n     switchport port-security maximum 1\n     switchport port-security violation shutdown\n     switchport port-security mac-address sticky\n   - exit\n\n3) PC KONFİGÜRASYONU:\n   - PC-1: IP 192.168.1.10, Subnet 255.255.255.0\n   - PC-1 MAC adresi otomatik öğrenilir (sticky)\n\n4) DOĞRULAMA:\n   - show port-security interface fa0/3\n   - show port-security address\n\n5) TEST:\n   - PC-1\'den trafik gönder (ping)\n   - Farklı bir MAC adresi bağlanırsa port shutdown olur\n\n⚠️ Not: Ağı Yenile (F5)'
        : '🔧 BUILD STEPS:\n\n1) CREATE TOPOLOGY:\n   - Add 1 Switch (SW1)\n   - Add 1 PC (PC-1)\n   - Connect PC-1 Eth0 -> SW1 Fa0/3 (Straight cable)\n\n2) SWITCH CONFIGURATION:\n   - Enter SW1 terminal: enable, conf t\n   - interface fa0/3\n     switchport mode access\n     switchport port-security\n     switchport port-security maximum 1\n     switchport port-security violation shutdown\n     switchport port-security mac-address sticky\n   - exit\n\n3) PC CONFIGURATION:\n   - PC-1: IP 192.168.1.10, Subnet 255.255.255.0\n   - PC-1 MAC address is automatically learned (sticky)\n\n4) VERIFICATION:\n   - show port-security interface fa0/3\n   - show port-security address\n\n5) TEST:\n   - Send traffic from PC-1 (ping)\n   - If a different MAC connects, the port will shutdown\n\n⚠️ Note: Refresh network (F5)',
      x: 400,
      y: 80,
      width: 480,
      height: 280,
      color: 'var(--color-error-500)',
      font: 'verdana',
      fontSize: 12,
      opacity: 0.75
    }
  ];
  const psState = createInitialState();
  psState.hostname = 'SW1';
  psState.ports['fa0/3'] = {
    ...psState.ports['fa0/3'],
    status: 'connected',
    portSecurity: { enabled: true, maxAddresses: 1, violationAction: 'shutdown', sticky: true },
    staticMacs: ['00E0.F701.A124']
  };

  return {
    id: 'port-security',
    tag: isTr ? 'GÜVENLİK' : 'SECURITY',
    title: isTr ? 'Port-Security' : 'Port-Security',
    description: isTr
      ? 'Switch portunda MAC adres tabanlı güvenlik kısıtlaması yapılandırılmıştır.'
      : 'MAC address-based security restriction configured on switch port.',
    detail: isTr
      ? 'Fa0/3: max MAC 1, violation shutdown, MAC: 00-11-22-33-44-55'
      : 'Fa0/3: max MAC 1, violation shutdown, MAC: 00-11-22-33-44-55',
    level: 'intermediate',
    data: baseProjectData(psDevices, psConnections, psNotes, [{ id: 'switch-1', state: psState }])
  };
};

export default example;


