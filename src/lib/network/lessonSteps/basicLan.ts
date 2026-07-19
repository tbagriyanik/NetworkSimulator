import type { GuidedStep } from '../guidedMode.types';

export const basicLanGuidedSteps: GuidedStep[] = [
  {
    id: 'lan-connect-devices',
    order: 1,
    title: { tr: 'Fiziksel Bağlantıyı Kurma', en: 'Establish Physical Connection' },
    description: { tr: 'İki bilgisayarı switch\'e bağlayın', en: 'Connect two PCs to the switch' },
    hint: { tr: 'PC-1 -> Fa0/1, PC-2 -> Fa0/2 (Düz kablo)', en: 'PC-1 -> Fa0/1, PC-2 -> Fa0/2 (Straight cable)' },
    checkType: 'connection',
    checkParams: {
      cableType: 'straight',
      connections: [
        { sourceDevice: 'pc-1', sourcePort: 'eth0', targetDevice: 'switch-1', targetPort: 'fa0/1' },
        { sourceDevice: 'pc-2', sourcePort: 'eth0', targetDevice: 'switch-1', targetPort: 'fa0/2' }
      ]
    },
    completed: false,
    points: 10
  },
  {
    id: 'lan-pc0-ip',
    order: 2,
    title: { tr: 'PC0 IP Yapılandırması', en: 'PC0 IP Configuration' },
    description: { tr: 'PC0\'a 192.168.1.10 IP adresi atayın', en: 'Assign 192.168.1.10 IP to PC0' },
    hint: { tr: 'Desktop > IP Config > 192.168.1.10', en: 'Desktop > IP Config > 192.168.1.10' },
    checkType: 'config',
    checkParams: { configKey: 'pc.pc-1.ip', configValue: '192.168.1.10', subnetMask: '255.255.255.0' },
    completed: false,
    points: 10
  },
  {
    id: 'lan-pc1-ip',
    order: 3,
    title: { tr: 'PC1 IP Yapılandırması', en: 'PC1 IP Configuration' },
    description: { tr: 'PC1\'e 192.168.1.20 IP adresi atayın', en: 'Assign 192.168.1.20 IP to PC1' },
    hint: { tr: 'Desktop > IP Config > 192.168.1.20', en: 'Desktop > IP Config > 192.168.1.20' },
    checkType: 'config',
    checkParams: { configKey: 'pc.pc-2.ip', configValue: '192.168.1.20', subnetMask: '255.255.255.0' },
    completed: false,
    points: 10
  },
  {
    id: 'lan-ping-test',
    order: 10,
    title: { tr: 'Ping Testi', en: 'Ping Test' },
    description: { tr: 'PC0\'dan PC1\'e ping atın', en: 'Ping from PC0 to PC1' },
    hint: { tr: 'PC0 CMD > "ping 192.168.1.20"', en: 'PC0 CMD > "ping 192.168.1.20"' },
    animationId: 'ping-anim',
    checkType: 'ping',
    checkParams: { fromDevice: 'pc-1', toIp: '192.168.1.20' },
    completed: false,
    points: 20
  }
];
