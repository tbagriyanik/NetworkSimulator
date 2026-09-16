import { createRouterDevice, connectPorts, baseProjectData } from './helpers';
import type { ExampleProject } from './types';
import type { CanvasConnection, CanvasNote } from '@/components/network/NetworkTopology/types/networkTopology.types';
import { createInitialRouterState } from '../initialState';

const example = (isTr: boolean): ExampleProject => {
  const ospfTroubleDevices = [
    createRouterDevice('router-1', 'R1', 200, 150),
    createRouterDevice('router-2', 'R2', 500, 150)
  ];
  const ospfTroubleConnections: CanvasConnection[] = [];
  connectPorts(ospfTroubleDevices, ospfTroubleConnections, 'router-1', 'gi0/0', 'router-2', 'gi0/0', 'crossover');

  const ospfR1State = createInitialRouterState();
  ospfR1State.hostname = 'R1';
  ospfR1State.routingProtocol = 'ospf';
  ospfR1State.ports['gi0/0'] = { ...ospfR1State.ports['gi0/0'], ipAddress: '10.0.0.1', subnetMask: '255.255.255.252', status: 'connected', shutdown: false };
  ospfR1State.dynamicRoutes = [{ destination: '192.168.1.0', subnetMask: '255.255.255.0', nextHop: '10.0.0.2', metric: 1, type: 'dynamic', area: 0 }];

  const ospfR2State = createInitialRouterState();
  ospfR2State.hostname = 'R2';
  ospfR2State.routingProtocol = 'ospf';
  ospfR2State.ports['gi0/0'] = { ...ospfR2State.ports['gi0/0'], ipAddress: '10.0.0.2', subnetMask: '255.255.255.252', status: 'connected', shutdown: false };
  ospfR2State.dynamicRoutes = [{ destination: '172.16.1.0', subnetMask: '255.255.255.0', nextHop: '10.0.0.1', metric: 1, type: 'dynamic', area: 1 }];

  const ospfTroubleNotes: CanvasNote[] = [{
    id: 'ospf-area-mismatch-note',
    text: isTr
      ? 'OSPF ALAN HATASI\n\nR1 Area 0, R2 ise hatalı olarak Area 1 kullanıyor. Aynı bağlantı üzerindeki OSPF router’ları komşuluk kurabilmek için aynı area içinde olmalıdır.\n\nDÜZELTME:\nR2 üzerinde OSPF ağ bildirimindeki area değerini 1’den 0’a değiştirin. Ardından komşuluk yeniden kurulmalı ve rotalar öğrenilmelidir.'
      : 'OSPF AREA MISMATCH\n\nR1 uses Area 0, while R2 incorrectly uses Area 1. OSPF routers on the same link must use the same area to form an adjacency.\n\nFIX:\nChange the OSPF network statement area on R2 from 1 to 0. The adjacency should then form and routes should be learned again.',
    x: 80,
    y: 40,
    width: 520,
    height: 230,
    color: 'var(--color-error-500)',
    font: 'verdana',
    fontSize: 12,
    opacity: 0.75,
  }];

  return {
    id: 'trouble-ospf-area',
    tag: isTr ? 'ARIZA' : 'TROUBLE',
    title: isTr ? 'OSPF Alan Hatası' : 'OSPF Area Mismatch',
    description: isTr ? 'Routerlar komşuluk kuramıyor. OSPF alanlarını (area) kontrol edin.' : 'Routers cannot establish adjacency. Check OSPF areas.',
    detail: isTr
      ? 'R1 ve R2 arasındaki bağlantı çalışıyor; ancak R1 Area 0, R2 Area 1 kullandığı için OSPF komşuluğu oluşmuyor. R2 üzerindeki OSPF area değerini Area 0 yaparak hatayı giderin.'
      : 'The link between R1 and R2 is operational, but OSPF adjacency fails because R1 uses Area 0 and R2 uses Area 1. Change R2 to Area 0 to resolve the fault.',
    level: 'intermediate',
    injectedFaults: [
      {
        id: 'fault-ospf-area',
        deviceId: 'router-2',
        faultType: 'wrongVlan',
        description: { tr: 'R2 OSPF alanı 1 olarak ayarlanmış (0 olmalı).', en: 'R2 OSPF area is set to 1 (should be 0).' },
        configKey: 'dynamicRoutes.0.area',
        faultValue: 1,
        correctValue: 0,
        hint: {
          tr: 'Komut ipucu: R2# configure terminal → R2(config)# router ospf 1 → R2(config-router)# network 10.0.0.0 0.0.0.3 area 0. Area 1 yerine Area 0 kullanın.\nKontrol: show ip ospf neighbor ve show ip route ospf',
          en: 'Command hint: R2# configure terminal → R2(config)# router ospf 1 → R2(config-router)# network 10.0.0.0 0.0.0.3 area 0. Use Area 0 instead of Area 1.\nVerify: show ip ospf neighbor and show ip route ospf'
        }
      }
    ],
    data: baseProjectData(ospfTroubleDevices, ospfTroubleConnections, ospfTroubleNotes, [
      { id: 'router-1', state: ospfR1State },
      { id: 'router-2', state: ospfR2State }
    ])
  };
};

export default example;


