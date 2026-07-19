import { createPcDevice, createSwitchDevice, connectPorts, baseProjectData } from './helpers';
import type { ExampleProject } from './types';
import type { CanvasConnection, CanvasNote } from '@/components/network/networkTopology.types';
import { createInitialState } from '../initialState';

const example = (isTr: boolean): ExampleProject => {
  const basicDevices = [
    createPcDevice('pc-1', 'PC-1', 40, 180, '192.168.10.10', 10),
    createPcDevice('pc-2', 'PC-2 (Console)', 40, 320, '', 1),
    createSwitchDevice('switch-1', 'SW1', 240, 220)
  ];
  const basicConnections: CanvasConnection[] = [];
  connectPorts(basicDevices, basicConnections, 'pc-1', 'eth0', 'switch-1', 'fa0/1');
  connectPorts(basicDevices, basicConnections, 'pc-2', 'com1', 'switch-1', 'console', 'console');
  const basicNotes: CanvasNote[] = [
    {
      id: 'basic-note-1',
      text: isTr
        ? 'Amaç: Switch üzerinde konsol, VTY ve enable parolalarını yapılandırmak ve doğrulamak.\n\n🔧 YAPILANDIRMA ADIMLARI:\n\n1) TOPOLOJİ OLUŞTURMA:\n   - 1 adet Switch (SW1) ekle\n   - 1 adet PC (PC-1) ekle\n   - 1 adet PC (PC-2) ekle (Console için)\n   - PC-1 Eth0 -> SW1 Fa0/1 (Straight kablo)\n   - PC-2 COM1 -> SW1 Console (Console kablo)\n\n2) SWITCH KONFİGÜRASYONU:\n   - SW1 terminaline gir: enable, conf t\n   - enable secret class\n   - enable password paswd\n   - service password-encryption\n   - line con 0\n     password console\n     login\n     logging synchronous\n   - line vty 0 4\n     password vty123\n     login\n     transport input telnet ssh\n   - exit\n\n3) VLAN VE IP AYARLARI:\n   - vlan 10\n     name VLAN10\n   - exit\n   - interface vlan 10\n     ip address 192.168.10.150 255.255.255.0\n     no shutdown\n   - exit\n   - interface fa0/1\n     switchport access vlan 10\n     switchport mode access\n   - exit\n\n4) PC KONFİGÜRASYONU:\n   - PC-1: IP 192.168.10.10, Subnet 255.255.255.0, Gateway 192.168.10.150\n   - PC-2: Console bağlantısı için IP gerekmez\n\n5) TEST:\n   - PC-2 Console terminalinden SW1\'e bağlan\n   - PC-1 CMD: telnet 192.168.10.150\n   - Kullanıcı adı: (yok), Şifre: vty123\n   - Enable şifresi: class veya paswd'
        : '🔧 BUILD STEPS:\n\n1) CREATE TOPOLOGY:\n   - Add 1 Switch (SW1)\n   - Add 1 PC (PC-1)\n   - Add 1 PC (PC-2) for Console\n   - Connect PC-1 Eth0 -> SW1 Fa0/1 (Straight cable)\n   - Connect PC-2 COM1 -> SW1 Console (Console cable)\n\n2) SWITCH CONFIGURATION:\n   - Enter SW1 terminal: enable, conf t\n   - enable secret class\n   - enable password paswd\n   - service password-encryption\n   - line con 0\n     password console\n     login\n     logging synchronous\n   - line vty 0 4\n     password vty123\n     login\n     transport input telnet ssh\n   - exit\n\n3) VLAN AND IP SETTINGS:\n   - vlan 10\n     name VLAN10\n   - exit\n   - interface vlan 10\n     ip address 192.168.10.150 255.255.255.0\n     no shutdown\n   - exit\n   - interface fa0/1\n     switchport access vlan 10\n     switchport mode access\n   - exit\n\n4) PC CONFIGURATION:\n   - PC-1: IP 192.168.10.10, Subnet 255.255.255.0, Gateway 192.168.10.150\n   - PC-2: No IP needed for Console connection\n\n5) TEST:\n   - Connect to SW1 from PC-2 Console terminal\n   - PC-1 CMD: telnet 192.168.10.150\n   - Username: (none), Password: vty123\n   - Enable password: class or paswd',
      x: 600,
      y: 40,
      width: 500,
      height: 320,
      color: 'var(--color-accent-500)',
      font: 'verdana',
      fontSize: 12,
      opacity: 0.75
    }
  ];
  const basicState = createInitialState();
  basicState.hostname = 'SW1';
  basicState.security = {
    ...basicState.security,
    enableSecret: 'class',
    enablePassword: 'paswd',
    servicePasswordEncryption: true,
    consoleLine: { ...basicState.security.consoleLine, password: 'console', login: true },
    vtyLines: { ...basicState.security.vtyLines, password: 'vty123', login: true }
  };
  basicState.vlans[10] = { id: 10, name: 'VLAN10', status: 'active', ports: ['FA0/1'] };
  basicState.ports['vlan10'] = {
    id: 'vlan10',
    name: 'VLAN10 Interface',
    status: 'connected',
    vlan: 10,
    mode: 'access',
    duplex: 'auto',
    speed: 'auto',
    shutdown: false,
    type: 'gigabitethernet',
    ipAddress: '192.168.10.150',
    subnetMask: '255.255.255.0'
  };
  basicState.ports['fa0/1'] = { ...basicState.ports['fa0/1'], vlan: 10, mode: 'access', status: 'connected' };

  return {
    id: 'basic-secure',
    tag: isTr ? 'TEMEL' : 'BASIC',
    title: isTr ? 'Basit Ağ + Parolalar' : 'Basic Network + Passwords',
    description: isTr
      ? 'Temel ağ güvenliği için console, VTY ve enable parolaları yapılandırılmıştır.'
      : 'Basic network security with console, VTY, and enable passwords configured.',
    detail: isTr
      ? 'Şifreler: enable secret: class, enable password: paswd, console: console, vty: vty123'
      : 'Passwords: enable secret: class, enable password: paswd, console: console, vty: vty123',
    level: 'basic',
    data: baseProjectData(basicDevices, basicConnections, basicNotes, [{ id: 'switch-1', state: basicState }])
  };
};

export default example;
