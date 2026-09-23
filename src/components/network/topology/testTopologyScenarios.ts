'use client';

import { CanvasDevice, CanvasConnection } from '@/components/network/NetworkTopology/types/networkTopology.types';
import { SwitchState } from '@/lib/network/types';
import {
  newCtx,
  addSwitch,
  addL3Switch,
  addRouter,
  addFirewall,
  addWlc,
  addAccessPoint,
  addPcToSwitch,
  connect,
  enableRouterPort,
  MAC_POOL,
  type Ctx,
} from './generators/shared';

export interface TestTopologyScenario {
  id: string;
  titleTr: string;
  titleEn: string;
  testFile: string;
  category: 'switching' | 'routing' | 'e2e' | 'security' | 'ipv6' | 'wireless' | 'diagnostics';
  tags: string[];
  descTr: string;
  descEn: string;
  objectiveTr: string;
  objectiveEn: string;
  build: (isTr: boolean) => {
    devices: CanvasDevice[];
    connections: CanvasConnection[];
    deviceStates: Map<string, SwitchState>;
    detailTr: string;
    detailEn: string;
  };
}

export const TEST_TOPOLOGY_SCENARIOS: TestTopologyScenario[] = [
  // 1. STP Triangle & Root Election
  {
    id: 'test-stp-triangle',
    titleTr: 'STP 3-Switch Triangle Döngü & Kök Seçimi Testi',
    titleEn: 'STP 3-Switch Triangle Loop & Root Election Test',
    testFile: 'src/tests/lib/network/stp.test.ts',
    category: 'switching',
    tags: ['stp', 'spanning-tree', 'root-bridge', 'blocking-port', 'loop-prevention'],
    descTr: 'stp.test.ts dosyasındaki 3 anahtarlı üçgen döngü topolojisi. SW2 (Bridge Priority: 4096) root seçilir, döngü engelleyici port bloke edilir.',
    descEn: '3-switch triangle loop topology from stp.test.ts. SW2 (Bridge Priority: 4096) is elected root, blocking ports prevent broadcast storms.',
    objectiveTr: 'STP protokolünün 3 anahtarlı yedekli yapıda kök köprüyü doğru seçmesini ve alternatif bloklu port belirlemesini doğrulamak.',
    objectiveEn: 'Verify STP root election and alternate blocking port calculation in a 3-switch redundant triangle.',
    build: () => {
      const ctx: Ctx = newCtx();
      const { state: sw1State } = addSwitch(ctx, 'sw1', 'SW1-Distribution', MAC_POOL[0], 200, 180);
      const { state: sw2State } = addSwitch(ctx, 'sw2', 'SW2-RootBridge', MAC_POOL[1], 450, 100);
      const { state: sw3State } = addSwitch(ctx, 'sw3', 'SW3-Access', MAC_POOL[2], 700, 180);

      sw1State.spanningTreePriority = 32768;
      sw2State.spanningTreePriority = 4096;
      sw3State.spanningTreePriority = 32768;

      connect(ctx, 'c1', 'sw1', 'fa0/1', sw1State, 'sw2', 'fa0/1', sw2State, 'crossover');
      connect(ctx, 'c2', 'sw2', 'fa0/2', sw2State, 'sw3', 'fa0/1', sw3State, 'crossover');
      connect(ctx, 'c3', 'sw3', 'fa0/2', sw3State, 'sw1', 'fa0/2', sw1State, 'crossover');

      addPcToSwitch(ctx, 1, '192.168.1.10', '192.168.1.1', '192.168.1.1', 'sw1', sw1State, 'fa0/10', 200, 340);
      addPcToSwitch(ctx, 2, '192.168.1.20', '192.168.1.1', '192.168.1.1', 'sw3', sw3State, 'fa0/10', 700, 340);

      return {
        devices: ctx.devices,
        connections: ctx.connections,
        deviceStates: ctx.states,
        detailTr: 'SW2 önceliği 4096 yapılandırılmıştır. "show spanning-tree" komutu ile SW2\'nin Root olduğunu ve bloklu portu inceleyin.',
        detailEn: 'SW2 priority is set to 4096. Use "show spanning-tree" to observe SW2 root status and blocked alternate ports.',
      };
    },
  },

  // 2. MSTP Multi-Instance Spanning Tree
  {
    id: 'test-mstp-e2e',
    titleTr: 'MSTP (IEEE 802.1s) Çoklu Örnek Spanning Tree Testi',
    titleEn: 'MSTP (IEEE 802.1s) Multiple Spanning Tree Test',
    testFile: 'src/tests/lib/network/e2e/mstpE2E.test.ts',
    category: 'switching',
    tags: ['mstp', 'mst-region', 'cist', 'msti', 'instance-mapping', 'vlan-balancing'],
    descTr: 'mstpE2E.test.ts dosyasından MST bölgesi, MSTI 1 (VLAN 10-20) ve MSTI 2 (VLAN 30-40) için farklı kök köprülerle yük dengeleme.',
    descEn: 'MST Region with Instance 1 and Instance 2 load balancing from mstpE2E.test.ts. Separate root bridges per VLAN instance.',
    objectiveTr: 'VLAN gruplarını farklı MST örneklerine eşleyerek anahtarlar arası link kullanımını optimize etmek.',
    objectiveEn: 'Map VLAN groups to distinct MST instances for active-active link utilization and fast convergence.',
    build: () => {
      const ctx: Ctx = newCtx();
      const { state: sw1 } = addSwitch(ctx, 'mst_sw1', 'SW1-MST-Root1', MAC_POOL[3], 300, 140, { '10': 'Sales', '20': 'Marketing' });
      const { state: sw2 } = addSwitch(ctx, 'mst_sw2', 'SW2-MST-Root2', MAC_POOL[4], 600, 140, { '30': 'Engineering', '40': 'DevOps' });
      const { state: sw3 } = addSwitch(ctx, 'mst_sw3', 'SW3-Access-MST', MAC_POOL[5], 450, 300, { '10': 'Sales', '30': 'Engineering' });

      connect(ctx, 'c1', 'mst_sw1', 'fa0/1', sw1, 'mst_sw2', 'fa0/1', sw2, 'crossover');
      connect(ctx, 'c2', 'mst_sw2', 'fa0/2', sw2, 'mst_sw3', 'fa0/1', sw3, 'crossover');
      connect(ctx, 'c3', 'mst_sw3', 'fa0/2', sw3, 'mst_sw1', 'fa0/2', sw1, 'crossover');

      addPcToSwitch(ctx, 1, '10.10.0.10', '10.10.0.1', '10.10.0.1', 'mst_sw1', sw1, 'fa0/10', 160, 140);
      addPcToSwitch(ctx, 2, '10.30.0.10', '10.30.0.1', '10.30.0.1', 'mst_sw2', sw2, 'fa0/10', 740, 140);

      return {
        devices: ctx.devices,
        connections: ctx.connections,
        deviceStates: ctx.states,
        detailTr: 'SW1 MSTI 1 için, SW2 MSTI 2 için Root Bridge olarak davranır. "show spanning-tree mst" komutunu çalıştırın.',
        detailEn: 'SW1 is root for MSTI 1, SW2 is root for MSTI 2. Use "show spanning-tree mst" to observe topology instances.',
      };
    },
  },

  // 3. EtherChannel LACP & Member Failure Recovery
  {
    id: 'test-lacp-failure-recovery',
    titleTr: 'LACP EtherChannel Bağlantı Birleştirme & Yedeklilik Testi',
    titleEn: 'LACP EtherChannel Link Aggregation & Failover Test',
    testFile: 'src/tests/lib/network/lacpFailureRecovery.test.ts',
    category: 'switching',
    tags: ['etherchannel', 'lacp', 'port-channel', 'bundle', 'failover', 'link-aggregation'],
    descTr: 'lacpFailureRecovery.test.ts dosyasından SW1 ve SW2 arasında 2x 1Gbps LACP Port-Channel1 bağı. Link kesintisinde kesintisiz iletim.',
    descEn: 'Dual-link LACP Port-Channel1 between switches from lacpFailureRecovery.test.ts. Validates bandwidth aggregation and sub-second failover.',
    objectiveTr: 'Birden fazla fiziksel portu mantıksal tek bir Port-Channel altında birleştirmek ve bağlantı dayanıklılığını test etmek.',
    objectiveEn: 'Bundle physical interfaces into a logical Port-Channel and verify automatic link recovery on port failure.',
    build: () => {
      const ctx: Ctx = newCtx();
      const { state: sw1 } = addSwitch(ctx, 'lacp_sw1', 'SW1-Distribution', MAC_POOL[6], 300, 200);
      const { state: sw2 } = addSwitch(ctx, 'lacp_sw2', 'SW2-Access', MAC_POOL[7], 600, 200);

      connect(ctx, 'c1', 'lacp_sw1', 'gi0/1', sw1, 'lacp_sw2', 'gi0/1', sw2, 'straight');
      connect(ctx, 'c2', 'lacp_sw1', 'gi0/2', sw1, 'lacp_sw2', 'gi0/2', sw2, 'straight');

      addPcToSwitch(ctx, 1, '192.168.1.10', '192.168.1.1', '192.168.1.1', 'lacp_sw1', sw1, 'fa0/1', 160, 200);
      addPcToSwitch(ctx, 2, '192.168.1.20', '192.168.1.1', '192.168.1.1', 'lacp_sw2', sw2, 'fa0/1', 740, 200);

      return {
        devices: ctx.devices,
        connections: ctx.connections,
        deviceStates: ctx.states,
        detailTr: 'Gi0/1 ve Gi0/2 portları Port-Channel 1 (LACP active) üyesidir. "show etherchannel summary" ile port durumlarını kontrol edin.',
        detailEn: 'Gi0/1 and Gi0/2 are bundled in Port-Channel 1. Check member status with "show etherchannel summary".',
      };
    },
  },

  // 4. Multi-Area OSPF & Virtual Link
  {
    id: 'test-ospf-advanced',
    titleTr: 'Çok Alanlı (Multi-Area) OSPF & Sanal Bağlantı (Virtual-Link) Testi',
    titleEn: 'Multi-Area OSPF & Virtual-Link Transit Test',
    testFile: 'src/tests/lib/network/ospfAdvanced.test.ts',
    category: 'routing',
    tags: ['ospf', 'multi-area', 'abr', 'virtual-link', 'lsa-summary', 'area-0'],
    descTr: 'ospfAdvanced.test.ts dosyasından Area 0 (Backbone), Area 1 ve Area 2 (Transit) OSPF hiyerarşik yönlendirme mimarisi.',
    descEn: 'Hierarchical OSPF topology with Area 0, Area 1, and Area 2 transit virtual link from ospfAdvanced.test.ts.',
    objectiveTr: 'Omurga alanına doğrudan bağlı olmayan OSPF alanlarının Virtual-Link ile Area 0\'a bağlanmasını doğrulamak.',
    objectiveEn: 'Verify multi-area OSPF routing tables, LSA Type-3 summarization, and virtual-link transit across areas.',
    build: () => {
      const ctx: Ctx = newCtx();
      const { state: r1 } = addRouter(ctx, 'r1_bb', 'R1-Backbone-Area0', MAC_POOL[8], 250, 160, { routerId: '1.1.1.1' });
      const { state: r2 } = addRouter(ctx, 'r2_abr1', 'R2-ABR-Area0-1', MAC_POOL[9], 480, 160, { routerId: '2.2.2.2' });
      const { state: r3 } = addRouter(ctx, 'r3_abr2', 'R3-ABR-Area1-2', MAC_POOL[10], 710, 160, { routerId: '3.3.3.3' });

      enableRouterPort(r1, 'gi0/0', '10.0.12.1', '255.255.255.252');
      enableRouterPort(r1, 'gi0/1', '192.168.1.1', '255.255.255.0');

      enableRouterPort(r2, 'gi0/0', '10.0.12.2', '255.255.255.252');
      enableRouterPort(r2, 'gi0/1', '10.0.23.1', '255.255.255.252');

      enableRouterPort(r3, 'gi0/0', '10.0.23.2', '255.255.255.252');
      enableRouterPort(r3, 'gi0/1', '172.16.1.1', '255.255.255.0');

      connect(ctx, 'c1', 'r1_bb', 'gi0/0', r1, 'r2_abr1', 'gi0/0', r2, 'crossover');
      connect(ctx, 'c2', 'r2_abr1', 'gi0/1', r2, 'r3_abr2', 'gi0/0', r3, 'crossover');

      addPcToSwitch(ctx, 1, '192.168.1.10', '192.168.1.1', '192.168.1.1', 'r1_bb', r1, 'gi0/1', 250, 320);
      addPcToSwitch(ctx, 2, '172.16.1.10', '172.16.1.1', '172.16.1.1', 'r3_abr2', r3, 'gi0/1', 710, 320);

      return {
        devices: ctx.devices,
        connections: ctx.connections,
        deviceStates: ctx.states,
        detailTr: 'R2 ve R3 ABR görevi görür. "show ip ospf neighbor" ve "show ip ospf database" ile komşuluk ve LSA tablolarını inceleyin.',
        detailEn: 'R2 and R3 act as ABRs. Use "show ip ospf neighbor" and "show ip ospf database" to verify LSAs.',
      };
    },
  },

  // 5. BGP Advanced & AS-Path Loop Prevention
  {
    id: 'test-bgp-advanced-e2e',
    titleTr: 'BGP Çoklu AS & AS-Path Döngü Engelleme Testi',
    titleEn: 'BGP Multi-AS & AS-Path Loop Prevention Test',
    testFile: 'src/tests/lib/network/e2e/bgpAdvancedE2E.test.ts',
    category: 'routing',
    tags: ['bgp', 'ebgp', 'as-path', 'loop-prevention', 'rib', 'prefix-advertising'],
    descTr: 'bgpAdvancedE2E.test.ts dosyasından eBGP komşulukları, AS 65001 & AS 65002 prefix reklamı ve AS-Path döngü koruma testi.',
    descEn: 'eBGP peering, AS 65001 & AS 65002 prefix advertisements, and AS-Path loop prevention test from bgpAdvancedE2E.test.ts.',
    objectiveTr: 'Farklı otonom sistemler arasında eBGP oturumu kurmak, AS-Path niteliklerini incelemek ve rota değişimini doğrulamak.',
    objectiveEn: 'Establish eBGP peering across autonomous systems, verify AS-Path attributes, and validate loop-free routing.',
    build: () => {
      const ctx: Ctx = newCtx();
      const { state: r1State } = addRouter(ctx, 'r1', 'R1-AS65001', MAC_POOL[11], 250, 160, {
        routerId: '10.0.12.1',
      });
      const { state: r2State } = addRouter(ctx, 'r2', 'R2-AS65002', MAC_POOL[12], 650, 160, {
        routerId: '10.0.12.2',
      });

      enableRouterPort(r1State, 'gi0/0', '10.0.12.1', '255.255.255.252');
      enableRouterPort(r1State, 'gi0/1', '192.168.1.1', '255.255.255.0');

      enableRouterPort(r2State, 'gi0/0', '10.0.12.2', '255.255.255.252');
      enableRouterPort(r2State, 'gi0/1', '172.16.1.1', '255.255.255.0');

      connect(ctx, 'c1', 'r1', 'gi0/0', r1State, 'r2', 'gi0/0', r2State, 'crossover');

      addPcToSwitch(ctx, 1, '192.168.1.10', '192.168.1.1', '192.168.1.1', 'r1', r1State, 'gi0/1', 250, 320);
      addPcToSwitch(ctx, 2, '172.16.1.10', '172.16.1.1', '172.16.1.1', 'r2', r2State, 'gi0/1', 650, 320);

      return {
        devices: ctx.devices,
        connections: ctx.connections,
        deviceStates: ctx.states,
        detailTr: 'R1 (AS 65001) ve R2 (AS 65002) eBGP oturumu kurar. "show ip bgp" ve "show ip bgp summary" komutlarıyla BGP rotalarını gözlemleyin.',
        detailEn: 'R1 (AS 65001) and R2 (AS 65002) establish eBGP session. Inspect learned prefixes with "show ip bgp".',
      };
    },
  },

  // 6. VXLAN EVPN Fabric E2E Test
  {
    id: 'test-vxlan-evpn-e2e',
    titleTr: 'VXLAN & BGP EVPN Data Center Fabric Testi',
    titleEn: 'VXLAN & BGP EVPN Data Center Fabric Test',
    testFile: 'src/tests/lib/network/e2e/vxlanEvpnE2E.test.ts',
    category: 'e2e',
    tags: ['vxlan', 'evpn', 'bgp', 'nve', 'overlay', 'spine-leaf'],
    descTr: 'vxlanEvpnE2E.test.ts dosyasından Spine-Leaf EVPN kumaşı. NVE1 (VNI 10010, VLAN 10), BGP EVPN Type-2 MAC rotaları ve UDP 4789 kapsülleme.',
    descEn: 'Spine-Leaf EVPN fabric from vxlanEvpnE2E.test.ts. NVE1 (VNI 10010, VLAN 10), BGP EVPN Type-2 MAC routes, and UDP 4789 encapsulation.',
    objectiveTr: 'Underlay IP yönlendirmesi üzerinde BGP EVPN kontrol düzlemi ve VXLAN veri düzlemi tünellemesini doğrulamak.',
    objectiveEn: 'Verify BGP EVPN control plane route reflection and VXLAN overlay tunneling across spine-leaf fabric.',
    build: () => {
      const ctx: Ctx = newCtx();
      const { state: spineState } = addRouter(ctx, 'spine', 'Spine-01-RR', MAC_POOL[13], 450, 80, {
        routerId: '10.255.0.100',
      });
      const { state: leaf1State } = addL3Switch(ctx, 'leaf1', 'Leaf-01-VTEP', MAC_POOL[14], 250, 200, { '10': 'Servers' }, {
        routerId: '10.255.0.1',
      });
      const { state: leaf2State } = addL3Switch(ctx, 'leaf2', 'Leaf-02-VTEP', MAC_POOL[15], 650, 200, { '10': 'Servers' }, {
        routerId: '10.255.0.2',
      });

      enableRouterPort(spineState, 'gi0/0', '10.0.1.1', '255.255.255.252');
      enableRouterPort(spineState, 'gi0/1', '10.0.2.1', '255.255.255.252');
      enableRouterPort(leaf1State, 'gi1/0/24', '10.0.1.2', '255.255.255.252');
      enableRouterPort(leaf2State, 'gi1/0/24', '10.0.2.2', '255.255.255.252');

      connect(ctx, 'c1', 'leaf1', 'gi1/0/24', leaf1State, 'spine', 'gi0/0', spineState, 'straight');
      connect(ctx, 'c2', 'leaf2', 'gi1/0/24', leaf2State, 'spine', 'gi0/1', spineState, 'straight');

      addPcToSwitch(ctx, 1, '192.168.10.10', '192.168.10.1', '192.168.10.1', 'leaf1', leaf1State, 'gi1/0/1', 250, 350);
      addPcToSwitch(ctx, 2, '192.168.10.20', '192.168.10.1', '192.168.10.1', 'leaf2', leaf2State, 'gi1/0/1', 650, 350);

      return {
        devices: ctx.devices,
        connections: ctx.connections,
        deviceStates: ctx.states,
        detailTr: 'Spine BGP Route Reflector görevi görür. Leaf anahtarları NVE1 arayüzü ile VNI 10010 üzerinden L2 over L3 taşır.',
        detailEn: 'Spine acts as BGP Route Reflector. Leaf switches encapsulate L2 traffic into VNI 10010 over NVE1.',
      };
    },
  },

  // 7. VRF-Lite Multi-Tenant Network Isolation
  {
    id: 'test-vrf-lite',
    titleTr: 'VRF-Lite Çoklu Kiracı (Multi-Tenant) İzolasyon Testi',
    titleEn: 'VRF-Lite Multi-Tenant Routing Isolation Test',
    testFile: 'src/tests/lib/network/vrfLite.test.ts',
    category: 'routing',
    tags: ['vrf', 'vrf-lite', 'multi-tenant', 'isolation', 'route-tables', 'customer-a-b'],
    descTr: 'vrfLite.test.ts dosyasından VRF "Red" ve VRF "Blue" yönlendirme izolasyonu. Çakışan 10.0.0.0/24 IP adreslerinin bağımsız yönlendirilmesi.',
    descEn: 'VRF-Lite isolation from vrfLite.test.ts. Overlapping subnets (10.0.0.0/24) routed independently across Customer Red & Blue.',
    objectiveTr: 'Aynı fiziksel yönlendirici üzerinde sanal yönlendirme tabloları (VRF) oluşturarak müşteri trafiğini izole etmek.',
    objectiveEn: 'Verify independent routing domains and isolated forwarding tables for multi-tenant isolation.',
    build: () => {
      const ctx: Ctx = newCtx();
      const { state: peRouter } = addRouter(ctx, 'r_pe', 'PE-Router-VRF', MAC_POOL[0], 450, 160);
      const { state: swRed } = addSwitch(ctx, 'sw_red', 'SW-Tenant-Red', MAC_POOL[1], 250, 160);
      const { state: swBlue } = addSwitch(ctx, 'sw_blue', 'SW-Tenant-Blue', MAC_POOL[2], 650, 160);

      enableRouterPort(peRouter, 'gi0/0', '10.0.0.1', '255.255.255.0');
      enableRouterPort(peRouter, 'gi0/1', '10.0.0.1', '255.255.255.0');

      connect(ctx, 'c1', 'swRed', 'fa0/24', swRed, 'r_pe', 'gi0/0', peRouter, 'straight');
      connect(ctx, 'c2', 'swBlue', 'fa0/24', swBlue, 'r_pe', 'gi0/1', peRouter, 'straight');

      addPcToSwitch(ctx, 1, '10.0.0.50', '10.0.0.1', '10.0.0.1', 'sw_red', swRed, 'fa0/1', 250, 320);
      addPcToSwitch(ctx, 2, '10.0.0.50', '10.0.0.1', '10.0.0.1', 'sw_blue', swBlue, 'fa0/1', 650, 320);

      return {
        devices: ctx.devices,
        connections: ctx.connections,
        deviceStates: ctx.states,
        detailTr: 'Red ve Blue kiracıları aynı IP adresini kullanır fakat VRF tabloları izoledir. "show ip vrf" komutunu inceleyin.',
        detailEn: 'Red and Blue tenants use overlapping IPs with dedicated VRF tables. Use "show ip vrf" to inspect VRF bindings.',
      };
    },
  },

  // 8. FHRP / HSRP / VRRP Redundancy Gateway Test
  {
    id: 'test-fhrp-redundancy',
    titleTr: 'FHRP (HSRP / VRRP) Ağ Geçidi Yedeklilik Testi',
    titleEn: 'FHRP (HSRP / VRRP) First Hop Redundancy Test',
    testFile: 'src/tests/lib/network/fhrp.test.ts',
    category: 'routing',
    tags: ['fhrp', 'hsrp', 'vrrp', 'virtual-gateway', 'failover', 'redundancy'],
    descTr: 'fhrp.test.ts dosyasından Sanal Ağ Geçidi (VIP: 192.168.1.254) ve Aktif/Beklemede (Active/Standby) yönlendirici geçiş testi.',
    descEn: 'Virtual Gateway (VIP: 192.168.1.254) failover and Active/Standby router test from fhrp.test.ts.',
    objectiveTr: 'Birincil ağ geçidi kesildiğinde sanal IP adresinin otomatik olarak yedek cihaza devredilmesini doğrulamak.',
    objectiveEn: 'Verify instant default gateway failover to standby router upon active link failure.',
    build: () => {
      const ctx: Ctx = newCtx();
      const { state: r1State } = addRouter(ctx, 'r1_active', 'R1-Active-HSRP', MAC_POOL[3], 300, 120);
      const { state: r2State } = addRouter(ctx, 'r2_standby', 'R2-Standby-HSRP', MAC_POOL[4], 600, 120);
      const { state: swState } = addSwitch(ctx, 'sw1_core', 'SW-Core-Access', MAC_POOL[5], 450, 260);

      enableRouterPort(r1State, 'gi0/1', '192.168.1.1', '255.255.255.0');
      enableRouterPort(r1State, 'gi0/0', '10.0.0.1', '255.255.255.252');

      enableRouterPort(r2State, 'gi0/1', '192.168.1.2', '255.255.255.0');
      enableRouterPort(r2State, 'gi0/0', '10.0.0.2', '255.255.255.252');

      connect(ctx, 'c1', 'r1_active', 'gi0/0', r1State, 'r2_standby', 'gi0/0', r2State, 'crossover');
      connect(ctx, 'c2', 'r1_active', 'gi0/1', r1State, 'sw1_core', 'fa0/1', swState, 'straight');
      connect(ctx, 'c3', 'r2_standby', 'gi0/1', r2State, 'sw1_core', 'fa0/2', swState, 'straight');

      addPcToSwitch(ctx, 1, '192.168.1.10', '192.168.1.254', '192.168.1.254', 'sw1_core', swState, 'fa0/10', 300, 390);
      addPcToSwitch(ctx, 2, '192.168.1.20', '192.168.1.254', '192.168.1.254', 'sw1_core', swState, 'fa0/20', 600, 390);

      return {
        devices: ctx.devices,
        connections: ctx.connections,
        deviceStates: ctx.states,
        detailTr: 'İstemciler varsayılan ağ geçidi olarak 192.168.1.254 sanal IP adresini kullanır. "show standby brief" ile HSRP durumunu denetleyin.',
        detailEn: 'Hosts point to VIP 192.168.1.254. Use "show standby brief" to inspect active/standby state.',
      };
    },
  },

  // 9. NAT / PAT Dynamic Port Address Translation
  {
    id: 'test-nat-pat-lifecycle',
    titleTr: 'Dinamik NAT / PAT & Oturum Yaşlandırma Testi',
    titleEn: 'Dynamic NAT / PAT & Session Aging Lifecycle Test',
    testFile: 'src/tests/lib/network/natPatSessionAging.test.ts',
    category: 'routing',
    tags: ['nat', 'pat', 'overload', 'inside-outside', 'translation-table', 'session-timeout'],
    descTr: 'natPatSessionAging.test.ts dosyasından Inside Local IP adreslerinin tek bir Public IP üzerine port eşlemesiyle taşınması.',
    descEn: 'Inside Local to Outside Global dynamic PAT translation and timeout lifecycle from natPatSessionAging.test.ts.',
    objectiveTr: 'Özel IP adreslerinin tek bir genel IP üzerinden internete çıkışını ve NAT oturum tablosu yönetimini test etmek.',
    objectiveEn: 'Verify dynamic PAT port multiplexing and NAT session translation table lifecycle.',
    build: () => {
      const ctx: Ctx = newCtx();
      const { state: natRouter } = addRouter(ctx, 'r_nat', 'Gateway-NAT-Router', MAC_POOL[6], 450, 160);
      const { state: swLan } = addSwitch(ctx, 'sw_lan', 'Inside-LAN-Switch', MAC_POOL[7], 200, 160);
      const { state: rIsp } = addRouter(ctx, 'r_isp', 'ISP-Public-Gateway', MAC_POOL[8], 700, 160);

      enableRouterPort(natRouter, 'gi0/1', '192.168.1.1', '255.255.255.0');
      enableRouterPort(natRouter, 'gi0/0', '203.0.113.2', '255.255.255.252');
      enableRouterPort(rIsp, 'gi0/0', '203.0.113.1', '255.255.255.252');

      connect(ctx, 'c1', 'swLan', 'fa0/24', swLan, 'r_nat', 'gi0/1', natRouter, 'straight');
      connect(ctx, 'c2', 'r_nat', 'gi0/0', natRouter, 'r_isp', 'gi0/0', rIsp, 'crossover');

      addPcToSwitch(ctx, 1, '192.168.1.10', '192.168.1.1', '192.168.1.1', 'sw_lan', swLan, 'fa0/1', 200, 320);
      addPcToSwitch(ctx, 2, '192.168.1.20', '192.168.1.1', '192.168.1.1', 'sw_lan', swLan, 'fa0/2', 360, 320);

      return {
        devices: ctx.devices,
        connections: ctx.connections,
        deviceStates: ctx.states,
        detailTr: 'PC1 ve PC2 dış dünyaya erişirken NAT tablosunu "show ip nat translations" komutuyla inceleyin.',
        detailEn: 'Observe translated flows using "show ip nat translations" on Gateway-NAT-Router.',
      };
    },
  },

  // 10. 802.1X & RADIUS Port Authentication E2E
  {
    id: 'test-dot1x-radius-e2e',
    titleTr: '802.1X & RADIUS Port Güvenliği Kimlik Doğrulama Testi',
    titleEn: '802.1X & RADIUS Port Security Authentication Test',
    testFile: 'src/tests/lib/network/e2e/dot1xRadiusE2E.test.ts',
    category: 'security',
    tags: ['dot1x', 'radius', 'port-security', 'eapol', 'authentication', 'access-control'],
    descTr: 'dot1xRadiusE2E.test.ts dosyasından EAPOL el sıkışması ve RADIUS sunucu doğrulaması. Doğrulama öncesi port bloklanır, yetkilendirme sonrası açılır.',
    descEn: '802.1X EAPOL handshake & RADIUS server validation from dot1xRadiusE2E.test.ts. Traffic blocked until authentication succeeds.',
    objectiveTr: 'Port tabanlı ağ erişim kontrolünü (802.1X) ve RADIUS kullanıcı kimlik doğrulama sürecini test etmek.',
    objectiveEn: 'Verify port-based network access control (802.1X) and RADIUS client authentication flow.',
    build: () => {
      const ctx: Ctx = newCtx();
      const { state: radiusState } = addRouter(ctx, 'radius', 'RADIUS-Auth-Server', MAC_POOL[9], 700, 100);
      const { state: sw1State } = addSwitch(ctx, 'sw1', 'Dot1x-Switch-01', MAC_POOL[10], 450, 200);

      enableRouterPort(radiusState, 'gi0/0', '192.168.10.254', '255.255.255.0');
      sw1State.dot1xSystemAuthControl = true;
      sw1State.dot1xSessions = {
        'fa0/1': { port: 'fa0/1', portControl: 'auto', state: 'unauthorized' },
        'fa0/2': { port: 'fa0/2', portControl: 'auto', state: 'unauthorized' },
      };

      connect(ctx, 'c1', 'radius', 'gi0/0', radiusState, 'sw1', 'gi0/1', sw1State, 'straight');

      addPcToSwitch(ctx, 1, '192.168.10.50', '192.168.10.1', '192.168.10.1', 'sw1', sw1State, 'fa0/1', 200, 320);
      addPcToSwitch(ctx, 2, '192.168.10.51', '192.168.10.1', '192.168.10.1', 'sw1', sw1State, 'fa0/2', 700, 320);

      return {
        devices: ctx.devices,
        connections: ctx.connections,
        deviceStates: ctx.states,
        detailTr: 'SW1 konsolunda "show dot1x" ve "show authentication sessions" komutlarıyla port durumlarını kontrol edin.',
        detailEn: 'Verify port authentication states on SW1 using "show dot1x" and "show authentication sessions".',
      };
    },
  },

  // 11. Stateful Firewall & DMZ Security Zone
  {
    id: 'test-firewall-stateful',
    titleTr: 'Durum Denetimli Güvenlik Duvarı (Stateful Firewall) & DMZ Testi',
    titleEn: 'Stateful Firewall Lifecycle & DMZ Inspection Test',
    testFile: 'src/tests/lib/network/firewallStatefulLifecycle.test.ts',
    category: 'security',
    tags: ['firewall', 'stateful-inspection', 'dmz', 'tcp-handshake', 'syn-ack', 'access-control'],
    descTr: 'firewallStatefulLifecycle.test.ts dosyasından Inside -> Outside TCP oturum izleme, DMZ Web sunucusu ve otomatik geri dönüş izni.',
    descEn: 'Stateful TCP inspection and DMZ web security policy validation from firewallStatefulLifecycle.test.ts.',
    objectiveTr: 'Giden bağlantıların otomatik durum tablosuna kaydedilerek dönüş trafiğine güvenli izin verilmesini doğrulamak.',
    objectiveEn: 'Verify stateful packet inspection, TCP 3-way handshake tracking, and DMZ isolation.',
    build: () => {
      const ctx: Ctx = newCtx();
      const { state: fwState } = addFirewall(ctx, 'fw_core', 'Enterprise-Firewall', MAC_POOL[11], 450, 160);
      const { state: swInside } = addSwitch(ctx, 'sw_inside', 'Inside-LAN', MAC_POOL[12], 200, 160);
      const { state: swDmz } = addSwitch(ctx, 'sw_dmz', 'DMZ-Servers', MAC_POOL[13], 700, 160);

      connect(ctx, 'c1', 'swInside', 'fa0/24', swInside, 'fw_core', 'gi0/0', fwState, 'straight');
      connect(ctx, 'c2', 'swDmz', 'fa0/24', swDmz, 'fw_core', 'gi0/1', fwState, 'straight');

      addPcToSwitch(ctx, 1, '10.0.1.10', '10.0.1.1', '10.0.1.1', 'sw_inside', swInside, 'fa0/1', 200, 320);
      addPcToSwitch(ctx, 2, '172.16.100.10', '172.16.100.1', '172.16.100.1', 'sw_dmz', swDmz, 'fa0/1', 700, 320);

      return {
        devices: ctx.devices,
        connections: ctx.connections,
        deviceStates: ctx.states,
        detailTr: 'Firewall üzerinde "show firewall connections" ve kural tablosunu inceleyerek TCP oturumlarını izleyin.',
        detailEn: 'Inspect active stateful connections on Firewall using "show firewall connections".',
      };
    },
  },

  // 12. IPsec VPN Site-to-Site Tunnel E2E
  {
    id: 'test-ipsec-vpn-e2e',
    titleTr: 'IPsec VPN Site-to-Site Tünel Doğrulama Testi',
    titleEn: 'IPsec VPN Site-to-Site Tunnel Verification Test',
    testFile: 'src/tests/lib/network/e2e/ipsecVpnE2E.test.ts',
    category: 'security',
    tags: ['ipsec', 'vpn', 'crypto', 'tunnel', 'site-to-site', 'encryption'],
    descTr: 'ipsecVpnE2E.test.ts dosyasından Şube (Branch) ile Merkez (HQ) arasında IKE Phase 1 / Phase 2 ve ESP şifreli IPsec tüneli.',
    descEn: 'Branch to HQ Site-to-Site IPsec VPN pipeline from ipsecVpnE2E.test.ts. Validates IKE Phase 1/2 and ESP tunnel encryption.',
    objectiveTr: 'Güvensiz WAN üzerinden şubeler arası güvenli şifreli IPsec tünel iletişimini test etmek.',
    objectiveEn: 'Verify encrypted site-to-site IPsec tunnel communication across public WAN.',
    build: () => {
      const ctx: Ctx = newCtx();
      const { state: hqState } = addRouter(ctx, 'r_hq', 'HQ-VPN-Gateway', MAC_POOL[14], 250, 160);
      const { state: ispState } = addRouter(ctx, 'r_isp', 'ISP-Internet-Core', MAC_POOL[15], 480, 160);
      const { state: branchState } = addRouter(ctx, 'r_branch', 'Branch-VPN-Gateway', MAC_POOL[0], 710, 160);

      enableRouterPort(hqState, 'gi0/1', '192.168.10.1', '255.255.255.0');
      enableRouterPort(hqState, 'gi0/0', '203.0.113.2', '255.255.255.252');

      enableRouterPort(ispState, 'gi0/0', '203.0.113.1', '255.255.255.252');
      enableRouterPort(ispState, 'gi0/1', '198.51.100.1', '255.255.255.252');

      enableRouterPort(branchState, 'gi0/0', '198.51.100.2', '255.255.255.252');
      enableRouterPort(branchState, 'gi0/1', '192.168.20.1', '255.255.255.0');

      connect(ctx, 'c2', 'r_hq', 'gi0/0', hqState, 'r_isp', 'gi0/0', ispState, 'crossover');
      connect(ctx, 'c3', 'r_isp', 'gi0/1', ispState, 'r_branch', 'gi0/0', branchState, 'crossover');

      addPcToSwitch(ctx, 1, '192.168.10.10', '192.168.10.1', '192.168.10.1', 'r_hq', hqState, 'gi0/1', 250, 320);
      addPcToSwitch(ctx, 2, '192.168.20.10', '192.168.20.1', '192.168.20.1', 'r_branch', branchState, 'gi0/1', 710, 320);

      return {
        devices: ctx.devices,
        connections: ctx.connections,
        deviceStates: ctx.states,
        detailTr: 'HQ Router üzerinde "show crypto ipsec sa" ve "show crypto isakmp sa" komutlarıyla VPN tünel durumunu inceleyin.',
        detailEn: 'Check IPsec tunnel security associations using "show crypto ipsec sa" on HQ Router.',
      };
    },
  },

  // 13. QoS Class-Map & Policy-Map E2E
  {
    id: 'test-qos-e2e',
    titleTr: 'QoS Sınıflandırma, Önceliklendirme (WFQ/PQ) Testi',
    titleEn: 'QoS Class-Map & Policy-Map Queuing Test',
    testFile: 'src/tests/lib/network/e2e/qosE2E.test.ts',
    category: 'e2e',
    tags: ['qos', 'class-map', 'policy-map', 'queuing', 'bandwidth', 'traffic-shaping'],
    descTr: 'qosE2E.test.ts dosyasından Voice/Video/Bulk trafiği için Class-Map ve Policy-Map yapılandırması. DSCP etiketleme ve kuyruk kuyruklama testi.',
    descEn: 'Class-Map and Policy-Map pipeline from qosE2E.test.ts. Tests DSCP EF/AF tagging, bandwidth reservation, and queuing priority.',
    objectiveTr: 'Ağ trafiğini servis kalitesi politikalarıyla sınıflandırmak ve kuyruk gecikmelerini önlemek.',
    objectiveEn: 'Verify traffic classification, DSCP priority queuing, and interface policy mapping.',
    build: () => {
      const ctx: Ctx = newCtx();
      const { state: edgeState } = addRouter(ctx, 'r_edge', 'Edge-Router-QoS', MAC_POOL[1], 450, 160);
      const { state: wanState } = addRouter(ctx, 'r_wan', 'WAN-Core-Router', MAC_POOL[2], 700, 160);

      enableRouterPort(edgeState, 'gi0/1', '10.1.1.1', '255.255.255.0');
      enableRouterPort(edgeState, 'gi0/2', '10.1.1.2', '255.255.255.0');
      enableRouterPort(edgeState, 'gi0/0', '198.51.100.1', '255.255.255.252');

      enableRouterPort(wanState, 'gi0/0', '198.51.100.2', '255.255.255.252');

      connect(ctx, 'c3', 'r_edge', 'gi0/0', edgeState, 'r_wan', 'gi0/0', wanState, 'crossover');

      addPcToSwitch(ctx, 1, '10.1.1.10', '10.1.1.1', '10.1.1.1', 'r_edge', edgeState, 'gi0/1', 200, 100);
      addPcToSwitch(ctx, 2, '10.1.1.20', '10.1.1.1', '10.1.1.1', 'r_edge', edgeState, 'gi0/2', 200, 240);

      return {
        devices: ctx.devices,
        connections: ctx.connections,
        deviceStates: ctx.states,
        detailTr: 'Edge Router üzerinde "show policy-map interface gi0/0" komutu ile VoIP (EF) ve Veri kuyruklarını gözlemleyin.',
        detailEn: 'Use "show policy-map interface gi0/0" on Edge Router to inspect prioritized Voice (EF) queues.',
      };
    },
  },

  // 14. IPv6 SLAAC, DHCPv6 & NDP Resolution
  {
    id: 'test-ipv6-ndp-ra',
    titleTr: 'IPv6 SLAAC, DHCPv6 & NDP Komşu Keşfi Testi',
    titleEn: 'IPv6 SLAAC, DHCPv6 & NDP Neighbor Discovery Test',
    testFile: 'src/tests/lib/network/ipv6NdRaCacheLifecycle.test.ts',
    category: 'ipv6',
    tags: ['ipv6', 'slaac', 'ndp', 'router-advertisement', 'neighbor-discovery', 'link-local'],
    descTr: 'ipv6NdRaCacheLifecycle.test.ts dosyasından Router Advertisement (RA), SLAAC otomatik adresleme ve NDP komşu önbelleği testi.',
    descEn: 'IPv6 SLAAC auto-addressing, Router Solicitations, and NDP cache lifecycle from ipv6NdRaCacheLifecycle.test.ts.',
    objectiveTr: 'IPv6 Router Advertisement paketleriyle istemcilerin otomatik yapılandırılmasını ve NDP tablosunu doğrulamak.',
    objectiveEn: 'Verify stateless IPv6 address auto-configuration and neighbor discovery table resolution.',
    build: () => {
      const ctx: Ctx = newCtx();
      const { state: rIpv6 } = addRouter(ctx, 'r_ipv6', 'IPv6-Gateway-Router', MAC_POOL[3], 450, 160);
      const { state: swIpv6 } = addSwitch(ctx, 'sw_ipv6', 'IPv6-Switch', MAC_POOL[4], 250, 160);

      enableRouterPort(rIpv6, 'gi0/0', '192.168.1.1', '255.255.255.0');
      connect(ctx, 'c1', 'swIpv6', 'fa0/24', swIpv6, 'r_ipv6', 'gi0/0', rIpv6, 'straight');

      addPcToSwitch(ctx, 1, '192.168.1.10', '192.168.1.1', '192.168.1.1', 'sw_ipv6', swIpv6, 'fa0/1', 250, 320, {
        ipv6: '2001:db8:acad:1::10',
        ipv6Prefix: '64',
      });
      addPcToSwitch(ctx, 2, '192.168.1.20', '192.168.1.1', '192.168.1.1', 'sw_ipv6', swIpv6, 'fa0/2', 450, 320, {
        ipv6: '2001:db8:acad:1::20',
        ipv6Prefix: '64',
      });

      return {
        devices: ctx.devices,
        connections: ctx.connections,
        deviceStates: ctx.states,
        detailTr: 'IPv6 istemcilerinde "ping 2001:db8:acad:1::20" ve router üzerinde "show ipv6 neighbors" komutlarını çalıştırın.',
        detailEn: 'Test IPv6 pinging across hosts and inspect neighbor table using "show ipv6 neighbors".',
      };
    },
  },

  // 15. Wireless WLC & CAPWAP Lightweight AP Test
  {
    id: 'test-wireless-capwap',
    titleTr: 'Kurumsal WLC & CAPWAP Kablosuz Ağ Doğrulama Testi',
    titleEn: 'Enterprise WLC & CAPWAP Wireless Network Test',
    testFile: 'src/tests/lib/network/capwap.test.ts',
    category: 'wireless',
    tags: ['wireless', 'wlc', 'capwap', 'access-point', 'ssid', 'mobility'],
    descTr: 'capwap.test.ts dosyasından Merkezi WLC Controller ve CAPWAP tüneli üzerinden bağlanan AP ve kablosuz istemciler.',
    descEn: 'Centralized WLC Controller and CAPWAP tunnel management for Access Points from capwap.test.ts.',
    objectiveTr: 'WLC üzerinden merkezi SSID dağıtımı ve kablosuz istemcilerin CAPWAP tüneliyle yönlendirilmesini test etmek.',
    objectiveEn: 'Verify centralized WLAN management, CAPWAP tunnel state, and client association.',
    build: () => {
      const ctx: Ctx = newCtx();
      const { state: wlcState } = addWlc(ctx, 'wlc_core', 'WLC-2504-Core', MAC_POOL[5], 450, 100);
      const { state: swDist } = addSwitch(ctx, 'sw_dist', 'SW-Distribution', MAC_POOL[6], 450, 220);
      const { state: apState } = addAccessPoint(ctx, 'ap_office', 'AP-Floor-1', MAC_POOL[7], '192.168.1.50', 250, 340, 'Corp-Secure-WiFi');

      connect(ctx, 'c1', 'wlc_core', 'gi0/0', wlcState, 'sw_dist', 'gi0/1', swDist, 'straight');
      connect(ctx, 'c2', 'ap_office', 'gi0/0', apState, 'sw_dist', 'fa0/1', swDist, 'straight');

      addPcToSwitch(ctx, 1, '192.168.1.100', '192.168.1.1', '192.168.1.1', 'sw_dist', swDist, 'fa0/10', 650, 340);

      return {
        devices: ctx.devices,
        connections: ctx.connections,
        deviceStates: ctx.states,
        detailTr: 'WLC üzerinde "show ap summary" ve "show wlan summary" komutlarıyla bağlı AP ve yayınlanan SSID listesini denetleyin.',
        detailEn: 'Check AP association and active SSIDs with "show ap summary" on WLC controller.',
      };
    },
  },

  // 16. Packet Trace & Forwarding Pipeline
  {
    id: 'test-packet-trace-diagnostics',
    titleTr: 'Uçtan Uca Paket İletim & Teşhis (Packet Pipeline) Testi',
    titleEn: 'End-to-End Packet Forwarding & Diagnostics Test',
    testFile: 'src/tests/lib/network/packetTraceDiagnostics.test.ts',
    category: 'diagnostics',
    tags: ['packet-trace', 'forwarding-pipeline', 'icmp', 'arp', 'mac-learning', 'diagnostics'],
    descTr: 'packetTraceDiagnostics.test.ts dosyasından PC1 -> SW1 -> R1 -> R2 -> PC2 tam teşhis akışı. ARP çözünürlüğü, MAC tablosu ve ICMP iletimi.',
    descEn: 'PC1 -> SW1 -> R1 -> R2 -> PC2 diagnostic pipeline from packetTraceDiagnostics.test.ts. Tests ARP resolution, MAC learning, and hop-by-hop ICMP.',
    objectiveTr: 'Katman 2 anahtarlama, Katman 3 yönlendirme, ARP önbelleği ve paket yol izleme teşhislerini uçtan uca doğrulamak.',
    objectiveEn: 'Verify Layer 2 switching, Layer 3 routing, ARP resolution, and hop-by-hop packet diagnostics.',
    build: () => {
      const ctx: Ctx = newCtx();
      const { state: sw1State } = addSwitch(ctx, 'sw1', 'SW1', MAC_POOL[8], 300, 200);
      const { state: r1State } = addRouter(ctx, 'r1', 'R1', MAC_POOL[9], 480, 200);
      const { state: r2State } = addRouter(ctx, 'r2', 'R2', MAC_POOL[10], 660, 200);

      enableRouterPort(r1State, 'gi0/0', '10.0.0.1', '255.255.255.0');
      enableRouterPort(r1State, 'gi0/1', '172.16.0.1', '255.255.255.252');

      enableRouterPort(r2State, 'gi0/0', '172.16.0.2', '255.255.255.252');
      enableRouterPort(r2State, 'gi0/1', '192.168.1.1', '255.255.255.0');

      connect(ctx, 'c2', 'sw1', 'fa0/2', sw1State, 'r1', 'gi0/0', r1State, 'straight');
      connect(ctx, 'c3', 'r1', 'gi0/1', r1State, 'r2', 'gi0/0', r2State, 'crossover');

      addPcToSwitch(ctx, 1, '10.0.0.2', '10.0.0.1', '10.0.0.1', 'sw1', sw1State, 'fa0/1', 120, 200);
      addPcToSwitch(ctx, 2, '192.168.1.2', '192.168.1.1', '192.168.1.1', 'r2', r2State, 'gi0/1', 840, 200);

      return {
        devices: ctx.devices,
        connections: ctx.connections,
        deviceStates: ctx.states,
        detailTr: 'PC1 terminalinden "ping 192.168.1.2" çalıştırarak paket animasyonunu ve yönlendirici sekmelerini izleyin.',
        detailEn: 'Run "ping 192.168.1.2" from PC1 terminal to observe packet forwarding pipeline and router hops.',
      };
    },
  },
];
