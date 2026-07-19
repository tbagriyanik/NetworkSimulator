import { createInitialState } from '../initialState';
import { createSwitchDevice, createPcDevice, connectPorts, baseProjectData } from './helpers';
;
import type { CanvasConnection, CanvasNote } from '@/components/network/networkTopology.types';
import type { ExampleProject } from './types';
;

const example = (isTr: boolean): ExampleProject => {
  const etherChannelDevices = [
    createPcDevice('pc-1', 'PC-1', 40, 120, '192.168.10.10', 10),
    createPcDevice('pc-2', 'PC-2', 40, 260, '192.168.10.11', 10),
    createSwitchDevice('switch-1', 'SW1', 240, 190),
    createSwitchDevice('switch-2', 'SW2', 440, 190)
  ];
  const etherChannelConnections: CanvasConnection[] = [];
  connectPorts(etherChannelDevices, etherChannelConnections, 'pc-1', 'eth0', 'switch-1', 'fa0/1');
  connectPorts(etherChannelDevices, etherChannelConnections, 'pc-2', 'eth0', 'switch-2', 'fa0/1');
  connectPorts(etherChannelDevices, etherChannelConnections, 'switch-1', 'gi0/1', 'switch-2', 'gi0/1', 'crossover');
  connectPorts(etherChannelDevices, etherChannelConnections, 'switch-1', 'gi0/2', 'switch-2', 'gi0/2', 'crossover');
  const etherChannelNotes: CanvasNote[] = [
    {
      id: 'etherchannel-note',
      text: isTr
        ? 'Amaç: İki switch arasında EtherChannel (LACP) kullanarak bant genişliğini artırmak ve redundancy sağlamak.\n\n🔧 YAPILANDIRMA ADIMLARI:\n\n1) TOPOLOJİ OLUŞTURMA:\n   - 2 adet Switch (SW1, SW2) ekle\n   - 2 adet PC (PC-1, PC-2) ekle\n   - PC-1 Eth0 -> SW1 Fa0/1 (Straight kablo)\n   - PC-2 Eth0 -> SW2 Fa0/1 (Straight kablo)\n   - SW1 Gi0/1 -> SW2 Gi0/1 (Crossover kablo)\n   - SW1 Gi0/2 -> SW2 Gi0/2 (Crossover kablo)\n\n2) SW1 KONFİGÜRASYONU:\n   - SW1 terminaline gir: enable, conf t\n   - vlan 10\n     name VLAN10\n   - exit\n   - interface fa0/1\n     switchport mode access\n     switchport access vlan 10\n   - exit\n   - interface range gi0/1-2\n     channel-group 1 mode active\n   - exit\n   - interface port-channel 1\n     switchport mode trunk\n   - exit\n\n3) SW2 KONFİGÜRASYONU:\n   - SW2 terminaline gir: enable, conf t\n   - vlan 10\n     name VLAN10\n   - exit\n   - interface fa0/1\n     switchport mode access\n     switchport access vlan 10\n   - exit\n   - interface range gi0/1-2\n     channel-group 1 mode active\n   - exit\n   - interface port-channel 1\n     switchport mode trunk\n   - exit\n\n4) PC KONFİGÜRASYONU:\n   - PC-1: IP 192.168.10.10, Subnet 255.255.255.0, VLAN 10\n   - PC-2: IP 192.168.10.11, Subnet 255.255.255.0, VLAN 10\n\n5) TEST:\n   - show etherchannel summary (EtherChannel durumunu gör)\n   - show spanning-tree (STP durumunu kontrol et)\n   - PC-1 ping 192.168.10.11 (PC-2)'
        : '🔧 BUILD STEPS:\n\n1) CREATE TOPOLOGY:\n   - Add 2 Switches (SW1, SW2)\n   - Add 2 PCs (PC-1, PC-2)\n   - Connect PC-1 Eth0 -> SW1 Fa0/1 (Straight cable)\n   - Connect PC-2 Eth0 -> SW2 Fa0/1 (Straight cable)\n   - Connect SW1 Gi0/1 -> SW2 Gi0/1 (Crossover cable)\n   - Connect SW1 Gi0/2 -> SW2 Gi0/2 (Crossover cable)\n\n2) SW1 CONFIGURATION:\n   - Enter SW1 terminal: enable, conf t\n   - vlan 10\n     name VLAN10\n   - exit\n   - interface fa0/1\n     switchport mode access\n     switchport access vlan 10\n   - exit\n   - interface range gi0/1-2\n     channel-group 1 mode active\n   - exit\n   - interface port-channel 1\n     switchport mode trunk\n   - exit\n\n3) SW2 CONFIGURATION:\n   - Enter SW2 terminal: enable, conf t\n   - vlan 10\n     name VLAN10\n   - exit\n   - interface fa0/1\n     switchport mode access\n     switchport access vlan 10\n   - exit\n   - interface range gi0/1-2\n     channel-group 1 mode active\n   - exit\n   - interface port-channel 1\n     switchport mode trunk\n   - exit\n\n4) PC CONFIGURATION:\n   - PC-1: IP 192.168.10.10, Subnet 255.255.255.0, VLAN 10\n   - PC-2: IP 192.168.10.11, Subnet 255.255.255.0, VLAN 10\n\n5) TEST:\n   - show etherchannel summary (view EtherChannel status)\n   - show spanning-tree (check STP status)\n   - PC-1 ping 192.168.10.11 (PC-2)',
      x: 600,
      y: 40,
      width: 500,
      height: 360,
      color: 'var(--color-warning-400)',
      font: 'verdana',
      fontSize: 12,
      opacity: 0.75
    }
  ];
  const etherSw1 = createInitialState('00:1A:2B:3C:4D:63');
  etherSw1.hostname = 'SW1';
  etherSw1.vlans[10] = { id: 10, name: 'VLAN10', status: 'active', ports: ['FA0/1'] };
  etherSw1.ports['fa0/1'] = { ...etherSw1.ports['fa0/1'], vlan: 10, mode: 'access', status: 'connected' };
  etherSw1.ports['gi0/1'] = { ...etherSw1.ports['gi0/1'], mode: 'trunk', allowedVlans: 'all', status: 'connected', channelGroup: 1, channelMode: 'active', channelProtocol: 'lacp' };
  etherSw1.ports['gi0/2'] = { ...etherSw1.ports['gi0/2'], mode: 'trunk', allowedVlans: 'all', status: 'connected', channelGroup: 1, channelMode: 'active', channelProtocol: 'lacp' };

  const etherSw2 = createInitialState('00:1A:2B:3C:4D:64');
  etherSw2.hostname = 'SW2';
  etherSw2.vlans[10] = { id: 10, name: 'VLAN10', status: 'active', ports: ['FA0/1'] };
  etherSw2.ports['fa0/1'] = { ...etherSw2.ports['fa0/1'], vlan: 10, mode: 'access', status: 'connected' };
  etherSw2.ports['gi0/1'] = { ...etherSw2.ports['gi0/1'], mode: 'trunk', allowedVlans: 'all', status: 'connected', channelGroup: 1, channelMode: 'active', channelProtocol: 'lacp' };
  etherSw2.ports['gi0/2'] = { ...etherSw2.ports['gi0/2'], mode: 'trunk', allowedVlans: 'all', status: 'connected', channelGroup: 1, channelMode: 'active', channelProtocol: 'lacp' };

  return {
    id: 'etherchannel',
    tag: isTr ? 'ETHERCHANNEL' : 'ETHERCHANNEL',
    title: isTr ? 'EtherChannel Lab' : 'EtherChannel Lab',
    description: isTr
      ? 'LACP ile birden fazla link tek bir mantıksal bağlantıda birleştirilir.'
      : 'Multiple links combined into single logical connection using LACP.',
    detail: isTr
      ? 'Fa0/1-2: channel-group 1 mode active, Po1 trunk'
      : 'Fa0/1-2: channel-group 1 mode active, Po1 trunk',
    level: 'advanced',
    data: baseProjectData(etherChannelDevices, etherChannelConnections, etherChannelNotes, [
      { id: 'switch-1', state: etherSw1 },
      { id: 'switch-2', state: etherSw2 }
    ])
  };
};

export default example;


