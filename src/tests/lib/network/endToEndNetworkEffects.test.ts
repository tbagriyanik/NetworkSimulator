/**
 * CLI -> SwitchState -> Derived RIB -> Forwarding Engine -> Packet Result
 *
 * Bu test süiti; CLI komutlarının ve özellikle "no" formlarının
 * sadece state değişkenini değil, paket iletim (checkConnectivity / ping)
 * sonucunu doğrudan değiştirip değiştirmediğini uçtan uca doğrular.
 *
 * Senaryo:
 *   R1 (192.168.1.1 / 10.0.0.1) <---> R2 (10.0.0.2 / 192.168.2.1) <---> PC (192.168.2.10)
 */

import { describe, it, expect } from 'vitest';
import { executeCommand } from '@/lib/network/executor';
import { createInitialRouterState } from '@/lib/network/initialState';
import { checkConnectivity } from '@/lib/network/connectivity';
import type { SwitchState, CommandResult, Port } from '@/lib/network/types';
import type { CanvasDevice, CanvasConnection } from '@/components/network/NetworkTopology/types/networkTopology.types';

// ─── Helpers ────────────────────────────────────────────────────────────────

function runCmd(
  state: SwitchState,
  cmd: string,
  deviceStates: Map<string, SwitchState>,
  deviceId: string,
  devices: CanvasDevice[] = [],
  connections: CanvasConnection[] = []
): CommandResult {
  return executeCommand(
    { ...state },
    cmd,
    'en',
    devices,
    connections,
    deviceStates,
    deviceId,
  );
}

function applyCmd(state: SwitchState, res: CommandResult): SwitchState {
  return res.newState ? { ...state, ...res.newState } : state;
}

function execSeq(
  initialState: SwitchState,
  cmds: string[],
  deviceStates: Map<string, SwitchState>,
  deviceId: string,
  devices: CanvasDevice[] = [],
  connections: CanvasConnection[] = []
): SwitchState {
  let s = initialState;
  for (const cmd of cmds) {
    const res = runCmd(s, cmd, deviceStates, deviceId, devices, connections);
    s = applyCmd(s, res);
  }
  return s;
}

function makePort(id: string, ip?: string, mask?: string): Port {
  return {
    id,
    name: id,
    status: 'connected',
    vlan: 1,
    mode: 'routed',
    duplex: 'full',
    speed: '1000',
    shutdown: false,
    type: 'gigabitethernet',
    ipAddress: ip,
    subnetMask: mask,
  };
}

function buildTestTopology() {
  const r1Device: CanvasDevice = {
    id: 'R1',
    name: 'R1',
    type: 'router',
    ip: '',
    subnet: '255.255.255.0',
    x: 100,
    y: 100,
    status: 'online',
    ports: [
      { id: 'gi0/0', label: 'Gi0/0', status: 'connected' },
      { id: 'gi0/1', label: 'Gi0/1', status: 'connected' },
    ],
  };

  const r2Device: CanvasDevice = {
    id: 'R2',
    name: 'R2',
    type: 'router',
    ip: '',
    subnet: '255.255.255.0',
    x: 250,
    y: 100,
    status: 'online',
    ports: [
      { id: 'gi0/0', label: 'Gi0/0', status: 'connected' },
      { id: 'gi0/1', label: 'Gi0/1', status: 'connected' },
    ],
  };

  const pcDevice: CanvasDevice = {
    id: 'PC1',
    name: 'PC1',
    type: 'pc',
    ip: '192.168.2.10',
    subnet: '255.255.255.0',
    gateway: '192.168.2.1',
    x: 400,
    y: 100,
    status: 'online',
    ports: [{ id: 'eth0', label: 'Eth0', status: 'connected', ipAddress: '192.168.2.10', subnetMask: '255.255.255.0' }],
  };

  const devices = [r1Device, r2Device, pcDevice];

  const connections: CanvasConnection[] = [
    {
      id: 'c-r1-r2',
      sourceDeviceId: 'R1',
      sourcePort: 'gi0/1',
      targetDeviceId: 'R2',
      targetPort: 'gi0/0',
      cableType: 'straight',
      active: true,
    },
    {
      id: 'c-r2-pc',
      sourceDeviceId: 'R2',
      sourcePort: 'gi0/1',
      targetDeviceId: 'PC1',
      targetPort: 'eth0',
      cableType: 'straight',
      active: true,
    },
  ];

  const r1State = createInitialRouterState();
  r1State.hostname = 'R1';
  r1State.ipRouting = true;
  r1State.ports['gi0/1'] = makePort('gi0/1', '10.0.0.1', '255.255.255.0');

  const r2State = createInitialRouterState();
  r2State.hostname = 'R2';
  r2State.ipRouting = true;
  r2State.ports['gi0/0'] = makePort('gi0/0', '10.0.0.2', '255.255.255.0');
  r2State.ports['gi0/1'] = makePort('gi0/1', '192.168.2.1', '255.255.255.0');

  const pcState = {
    hostname: 'PC1',
    ports: {
      'eth0': { id: 'eth0', label: 'Eth0', status: 'connected', shutdown: false, ipAddress: '192.168.2.10', subnetMask: '255.255.255.0' }
    },
    arpCache: []
  } as unknown as SwitchState;

  const deviceStates = new Map<string, SwitchState>([
    ['R1', r1State],
    ['R2', r2State],
    ['PC1', pcState],
  ]);

  return { devices, connections, deviceStates };
}

describe('CLI -> State -> RIB -> Forwarding Engine Gerçek Ağ Etkisi Doğrulaması', () => {

  // ─── 1. shutdown -> no shutdown ─────────────────────────────────────────
  describe('Port shutdown / no shutdown ağ iletim etkisi', () => {
    it('1. shutdown yapıldığında ping başarısız olmalı, no shutdown ile geri gelmeli', () => {
      const { devices, connections, deviceStates } = buildTestTopology();

      // Başlangıç: R1 -> R2 (10.0.0.2) doğrudan bağlı ve erişilebilir
      const resInitial = checkConnectivity('R1', '10.0.0.2', devices, connections, deviceStates, 'en');
      expect(resInitial.success).toBe(true);

      // CLI: R1'de GigabitEthernet0/1 portunu kapat
      let r1 = deviceStates.get('R1')!;
      r1 = execSeq(r1, [
        'enable',
        'configure terminal',
        'interface GigabitEthernet0/1',
        'shutdown',
      ], deviceStates, 'R1');
      deviceStates.set('R1', r1);

      // Ağ Etkisi: Paket artık geçmemeli (DROP / unreachable)
      const resShut = checkConnectivity('R1', '10.0.0.2', devices, connections, deviceStates, 'en');
      expect(resShut.success).toBe(false);

      // CLI: R1'de GigabitEthernet0/1 portunu aç
      r1 = execSeq(r1, [
        'no shutdown',
      ], deviceStates, 'R1');
      deviceStates.set('R1', r1);

      // Ağ Etkisi: İletim tekrar başarılı olmalı
      const resNoShut = checkConnectivity('R1', '10.0.0.2', devices, connections, deviceStates, 'en');
      expect(resNoShut.success).toBe(true);
    });
  });

  // ─── 2. no ip address -> ip address ─────────────────────────────────────
  describe('no ip address / ip address ağ iletim etkisi', () => {
    it('2. no ip address ile IP silindiğinde ping başarısız olmalı, tekrar verildiğinde geçmeli', () => {
      const { devices, connections, deviceStates } = buildTestTopology();

      // Başlangıç: R1 -> R2 bağlı
      expect(checkConnectivity('R1', '10.0.0.2', devices, connections, deviceStates, 'en').success).toBe(true);

      // CLI: R1 Gi0/1 arayüzünden IP adresini kaldır
      let r1 = deviceStates.get('R1')!;
      r1 = execSeq(r1, [
        'enable',
        'configure terminal',
        'interface GigabitEthernet0/1',
        'no ip address',
      ], deviceStates, 'R1');
      deviceStates.set('R1', r1);

      // Ağ Etkisi: Kaynak portta geçerli IP/subnet kalmadığı için iletim düşmeli
      const resNoIp = checkConnectivity('R1', '10.0.0.2', devices, connections, deviceStates, 'en');
      expect(resNoIp.success).toBe(false);

      // CLI: R1 Gi0/1 arayüzüne IP'yi tekrar ata
      r1 = execSeq(r1, [
        'ip address 10.0.0.1 255.255.255.0',
      ], deviceStates, 'R1');
      deviceStates.set('R1', r1);

      // Ağ Etkisi: İletim tekrar başarılı olmalı
      const resWithIp = checkConnectivity('R1', '10.0.0.2', devices, connections, deviceStates, 'en');
      expect(resWithIp.success).toBe(true);
    });
  });

  // ─── 3. ip route -> no ip route ─────────────────────────────────────────
  describe('ip route / no ip route ağ iletim etkisi', () => {
    it('3. Rota olmadan uzak alt ağa ping başarısız olmalı, ip route ile geçmeli, no ip route ile düşmeli', () => {
      const { devices, connections, deviceStates } = buildTestTopology();

      // Başlangıç: R1'in PC1'in ağına (192.168.2.0/24) rotası yok -> Başarısız olmalı
      const resNoRouteInitially = checkConnectivity('R1', '192.168.2.10', devices, connections, deviceStates, 'en');
      expect(resNoRouteInitially.success).toBe(false);

      // CLI: R1'e PC1 ağı için statik rota ekle
      let r1 = deviceStates.get('R1')!;
      r1 = execSeq(r1, [
        'enable',
        'configure terminal',
        'ip route 192.168.2.0 255.255.255.0 10.0.0.2',
      ], deviceStates, 'R1');
      deviceStates.set('R1', r1);

      // Ağ Etkisi: R1 artık 192.168.2.10'a rota bildiği için paket iletilmeli
      const resRouteAdded = checkConnectivity('R1', '192.168.2.10', devices, connections, deviceStates, 'en');
      expect(resRouteAdded.success).toBe(true);

      // CLI: Statik rotayı sil
      r1 = execSeq(r1, [
        'no ip route 192.168.2.0 255.255.255.0 10.0.0.2',
      ], deviceStates, 'R1');
      deviceStates.set('R1', r1);

      // Ağ Etkisi: Rota silindiği için paket iletim motoru hedefi bulamamalı ve drop etmeli
      const resRouteRemoved = checkConnectivity('R1', '192.168.2.10', devices, connections, deviceStates, 'en');
      expect(resRouteRemoved.success).toBe(false);
    });
  });

  // ─── 4. ACL in -> no ACL in ─────────────────────────────────────────────
  describe('ip access-group / no ip access-group ağ iletim etkisi', () => {
    it('4. Gelen ACL paketi engellemeli, no ip access-group yapıldığında paket geçmeli', () => {
      const { devices, connections, deviceStates } = buildTestTopology();

      // Başlangıçta R1'den R2'ye statik rota olsun ve ping başarılı olsun
      let r1 = deviceStates.get('R1')!;
      r1 = execSeq(r1, [
        'enable',
        'configure terminal',
        'ip route 192.168.2.0 255.255.255.0 10.0.0.2',
      ], deviceStates, 'R1');
      deviceStates.set('R1', r1);
      expect(checkConnectivity('R1', '192.168.2.10', devices, connections, deviceStates, 'en').success).toBe(true);

      // CLI: R2'de R1'in IP'sini (10.0.0.1) engelleyen ACL oluştur ve Gi0/0 girişine bağla
      let r2 = deviceStates.get('R2')!;
      r2 = execSeq(r2, [
        'enable',
        'configure terminal',
        'access-list 100 deny ip host 10.0.0.1 any',
        'access-list 100 permit ip any any',
        'interface GigabitEthernet0/0',
        'ip access-group 100 in',
      ], deviceStates, 'R2');
      deviceStates.set('R2', r2);

      // Ağ Etkisi: Paket R2 ingress portunda ACL tarafından engellenmeli
      const resBlocked = checkConnectivity('R1', '192.168.2.10', devices, connections, deviceStates, 'en');
      expect(resBlocked.success).toBe(false);

      // CLI: R2'den access-group'u kaldır
      r2 = execSeq(r2, [
        'interface GigabitEthernet0/0',
        'no ip access-group 100 in',
      ], deviceStates, 'R2');
      deviceStates.set('R2', r2);

      // Ağ Etkisi: ACL engeli kalktığı için paket tekrar geçmeli
      const resUnblocked = checkConnectivity('R1', '192.168.2.10', devices, connections, deviceStates, 'en');
      expect(resUnblocked.success).toBe(true);
    });
  });

  // ─── 5. OSPF adjacency -> remote ping -> no network -> ping fail ──────
  describe('OSPF Adjacency, Dijkstra ve Forwarding E2E ağ etkisi', () => {
    it('5. İki router arasında OSPF komşuluğu kurulunca uzak PC\'ye ping atılabilmeli, no network ile rota düşüp ping fail olmalı', () => {
      const { devices, connections, deviceStates } = buildTestTopology();

      // Başlangıç: Statik rota yok, R1 -> PC1 (192.168.2.10) ping FAIL olmalı
      const resNoOspf = checkConnectivity('R1', '192.168.2.10', devices, connections, deviceStates, 'en');
      expect(resNoOspf.success).toBe(false);

      // CLI: R1 üzerinde OSPF yapılandır (Bağlantı ağı: 10.0.0.0/24)
      let r1 = deviceStates.get('R1')!;
      r1 = execSeq(r1, [
        'enable',
        'configure terminal',
        'router ospf 1',
        'network 10.0.0.0 0.0.0.255 area 0',
      ], deviceStates, 'R1');
      deviceStates.set('R1', r1);

      // CLI: R2 üzerinde OSPF yapılandır (Bağlantı ağı: 10.0.0.0/24 ve Uzak PC ağı: 192.168.2.0/24)
      let r2 = deviceStates.get('R2')!;
      r2 = execSeq(r2, [
        'enable',
        'configure terminal',
        'router ospf 1',
        'network 10.0.0.0 0.0.0.255 area 0',
        'network 192.168.2.0 0.0.0.255 area 0',
      ], deviceStates, 'R2');
      deviceStates.set('R2', r2);

      // Ağ Etkisi: OSPF LSDB & Dijkstra sayesinde R1, R2 üzerinden 192.168.2.0/24 ağını öğrenir
      // ve R1 -> PC1 (192.168.2.10) ping SUCCESS olur.
      const resOspfUp = checkConnectivity('R1', '192.168.2.10', devices, connections, deviceStates, 'en');
      expect(resOspfUp.success).toBe(true);

      // CLI: R2 üzerinde PC ağının OSPF duyurusunu kaldır (no network)
      r2 = execSeq(r2, [
        'no network 192.168.2.0',
      ], deviceStates, 'R2');
      deviceStates.set('R2', r2);

      // Ağ Etkisi: OSPF rotası tablodan düşer, paket iletimi FAIL olur.
      const resOspfDown = checkConnectivity('R1', '192.168.2.10', devices, connections, deviceStates, 'en');
      expect(resOspfDown.success).toBe(false);
    });
  });

});

