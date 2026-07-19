import { createPcDevice, createSwitchDevice, connectPorts, baseProjectData } from './helpers';
import type { ExampleProject } from './types';
import type { CanvasConnection, CanvasNote } from '@/components/network/networkTopology.types';
import { createInitialState } from '../initialState';

const example = (isTr: boolean): ExampleProject => {
  const vlanDevices = [
    createPcDevice('pc-1', 'PC-1', 40, 120, '192.168.10.10', 10),
    createPcDevice('pc-2', 'PC-2', 40, 260, '192.168.20.10', 20),
    createSwitchDevice('switch-1', 'SW1', 260, 190)
  ];
  const vlanConnections: CanvasConnection[] = [];
  connectPorts(vlanDevices, vlanConnections, 'pc-1', 'eth0', 'switch-1', 'fa0/1');
  connectPorts(vlanDevices, vlanConnections, 'pc-2', 'eth0', 'switch-1', 'fa0/2');
  const vlanNotes: CanvasNote[] = [
    {
      id: 'vlan-note-1',
      text: isTr
        ? 'Amaç: Tek bir switch üzerinde VLAN oluşturarak PC\'leri farklı broadcast domain\'lere ayırmak.\n\n🔧 YAPILANDIRMA ADIMLARI:\n\n1) TOPOLOJİ OLUŞTURMA:\n   - 1 adet Switch (SW1) ekle\n   - 2 adet PC ekle (PC-1, PC-2)\n   - PC-1 Eth0 -> SW1 Fa0/1 (Straight kablo)\n   - PC-2 Eth0 -> SW1 Fa0/2 (Straight kablo)\n\n2) SWITCH VLAN KONFİGÜRASYONU:\n   - SW1 terminaline gir: enable, conf t\n   - vlan 10\n     name VLAN10\n   - exit\n   - vlan 20\n     name VLAN20\n   - exit\n\n3) PORT VLAN ATAMASI:\n   - interface fa0/1\n     switchport mode access\n     switchport access vlan 10\n   - exit\n   - interface fa0/2\n     switchport mode access\n     switchport access vlan 20\n   - exit\n\n4) PC IP KONFİGÜRASYONU:\n   - PC-1: IP 192.168.10.10, Subnet 255.255.255.0, VLAN 10\n   - PC-2: IP 192.168.20.10, Subnet 255.255.255.0, VLAN 20\n\n5) DOĞRULAMA:\n   - show vlan brief (VLAN 10 ve 20\'yi gör)\n   - show interfaces status (port VLAN atamalarını kontrol et)\n   - PC-1 ve PC-2 birbirine ping atamaz (farklı VLAN)'
        : '🔧 BUILD STEPS:\n\n1) CREATE TOPOLOGY:\n   - Add 1 Switch (SW1)\n   - Add 2 PCs (PC-1, PC-2)\n   - Connect PC-1 Eth0 -> SW1 Fa0/1 (Straight cable)\n   - Connect PC-2 Eth0 -> SW1 Fa0/2 (Straight cable)\n\n2) SWITCH VLAN CONFIGURATION:\n   - Enter SW1 terminal: enable, conf t\n   - vlan 10\n     name VLAN10\n   - exit\n   - vlan 20\n     name VLAN20\n   - exit\n\n3) PORT VLAN ASSIGNMENT:\n   - interface fa0/1\n     switchport mode access\n     switchport access vlan 10\n   - exit\n   - interface fa0/2\n     switchport mode access\n     switchport access vlan 20\n   - exit\n\n4) PC IP CONFIGURATION:\n   - PC-1: IP 192.168.10.10, Subnet 255.255.255.0, VLAN 10\n   - PC-2: IP 192.168.20.10, Subnet 255.255.255.0, VLAN 20\n\n5) VERIFICATION:\n   - show vlan brief (see VLAN 10 and 20)\n   - show interfaces status (check port VLAN assignments)\n   - PC-1 and PC-2 cannot ping each other (different VLANs)',
      x: 600,
      y: 40,
      width: 480,
      height: 280,
      color: 'var(--color-warning-600)',
      font: 'verdana',
      fontSize: 12,
      opacity: 0.75
    }
  ];
  const vlanState = createInitialState();
  vlanState.hostname = 'SW1';
  vlanState.vlans[10] = { id: 10, name: 'VLAN10', status: 'active', ports: ['FA0/1'] };
  vlanState.vlans[20] = { id: 20, name: 'VLAN20', status: 'active', ports: ['FA0/2'] };
  vlanState.ports['fa0/1'] = { ...vlanState.ports['fa0/1'], vlan: 10, mode: 'access', status: 'connected' };
  vlanState.ports['fa0/2'] = { ...vlanState.ports['fa0/2'], vlan: 20, mode: 'access', status: 'connected' };

  return {
    id: 'single-vlan',
    tag: isTr ? 'VLAN' : 'VLAN',
    title: isTr ? '1 Switch VLAN' : 'Single Switch VLANs',
    description: isTr
      ? 'Tek switch üzerinde VLAN 10 ve 20 ile iki PC erişim portu yapılandırması.'
      : 'Single switch with VLAN 10 and 20 access port configuration for two PCs.',
    detail: isTr
      ? 'PC-1: VLAN 10 (192.168.10.10), PC-2: VLAN 20 (192.168.20.10)'
      : 'PC-1: VLAN 10 (192.168.10.10), PC-2: VLAN 20 (192.168.20.10)',
    level: 'basic',
    data: baseProjectData(vlanDevices, vlanConnections, vlanNotes, [{ id: 'switch-1', state: vlanState }])
  };
};

export default example;
