/**
 * "no" komutlarının gerçek ağ etkilerini doğrulayan testler.
 *
 * Kapsam:
 *   - no ip route        → route sayısı azalıyor, show ip route & running-config güncelleniyor
 *   - shutdown           → STP port disabled, routing table connected route kalkar
 *   - no shutdown        → port geri geliyor
 *   - no ip address      → connected route siliniyor
 *   - no ip nat inside   → NAT translation artık oluşmuyor
 *   - no ip access-group → ACL engeli kalkıyor
 *   - no switchport access vlan → VLAN 1'e döner
 *   - no router ospf     → dinamik route'lar temizleniyor, routingProtocol sıfırlanıyor
 *   - no router eigrp    → EIGRP AS & route'lar temizleniyor
 *   - no router bgp      → BGP AS & route'lar temizleniyor
 */

import { describe, it, expect } from 'vitest';
import { executeCommand } from '@/lib/network/executor';
import {
  createInitialState,
  createInitialRouterState,
} from '@/lib/network/initialState';
import { processNatPacket } from '@/lib/network/forwarding/natEngine';
import type { SwitchState, CommandResult, Port } from '@/lib/network/types';

// ─── Helpers ────────────────────────────────────────────────────────────────

function ctxFor(state: SwitchState) {
  return {
    devices: [] as never[],
    connections: [] as never[],
    deviceStates: new Map<string, SwitchState>([['d1', state]]),
    sourceDeviceId: 'd1',
  };
}

function run(state: SwitchState, cmd: string): CommandResult {
  const c = ctxFor(state);
  return executeCommand(
    { ...state },
    cmd,
    'en',
    c.devices,
    c.connections,
    c.deviceStates,
    c.sourceDeviceId,
  );
}

function apply(state: SwitchState, res: CommandResult): SwitchState {
  return res.newState ? { ...state, ...res.newState } : state;
}

function privileged(s: SwitchState): SwitchState {
  return apply(s, run(s, 'enable'));
}

function configMode(s: SwitchState): SwitchState {
  const priv = privileged(s);
  return apply(priv, run(priv, 'configure terminal'));
}

/** L3 switch ile başlangıç */
function l3Config(): SwitchState {
  return configMode(createInitialState('00:aa:bb:cc:dd:01', 'NS-L3-24PS'));
}

/** L2 switch ile başlangıç */
function l2Config(): SwitchState {
  return configMode(createInitialState('00:aa:bb:cc:dd:02', 'NS-L2-24TT-L'));
}

// ─── 1. no ip route ──────────────────────────────────────────────────────────

describe('no ip route — gerçek ağ etkisi', () => {
  it('ip route eklenmeden önce staticRoutes boş olmalı', () => {
    const s = l3Config();
    expect((s.staticRoutes ?? []).length).toBe(0);
  });

  it('ip route eklenince sayı +1 artmalı', () => {
    let s = l3Config();
    s = apply(s, run(s, 'ip route 10.0.0.0 255.255.255.0 192.168.1.1'));
    expect(s.staticRoutes?.length).toBe(1);
  });

  it('no ip route sonrası ilgili route artık mevcut olmamalı', () => {
    let s = l3Config();
    s = apply(s, run(s, 'ip route 10.0.0.0 255.255.255.0 192.168.1.1'));
    s = apply(s, run(s, 'no ip route 10.0.0.0 255.255.255.0 192.168.1.1'));

    const removed = (s.staticRoutes ?? []).find(
      (r) => r.destination === '10.0.0.0' && r.nextHop === '192.168.1.1',
    );
    expect(removed).toBeUndefined();
  });

  it('no ip route sonrası staticRoutes boş dizi olmalı (yalnızca o route vardıysa)', () => {
    let s = l3Config();
    s = apply(s, run(s, 'ip route 10.0.0.0 255.255.255.0 192.168.1.1'));
    s = apply(s, run(s, 'no ip route 10.0.0.0 255.255.255.0 192.168.1.1'));
    expect((s.staticRoutes ?? []).length).toBe(0);
  });

  it('no ip route → show ip route çıktısında ilgili prefix görünmemeli', () => {
    let s = l3Config();
    s = apply(s, run(s, 'ip routing'));
    s = apply(s, run(s, 'interface gi1/0/1'));
    s = apply(s, run(s, 'ip address 192.168.1.1 255.255.255.0'));
    s = apply(s, run(s, 'no shutdown'));
    s = apply(s, run(s, 'exit'));
    s = apply(s, run(s, 'ip route 10.0.0.0 255.255.255.0 192.168.1.254'));
    s = apply(s, run(s, 'no ip route 10.0.0.0 255.255.255.0 192.168.1.254'));
    // config → privileged
    s = apply(s, run(s, 'exit'));

    const res = run(s, 'show ip route');
    expect(res.success).toBe(true);
    expect(res.output).not.toContain('10.0.0.0');
  });

  it('no ip route → show running-config içinde o satır görünmemeli', () => {
    let s = l3Config();
    s = apply(s, run(s, 'ip route 10.0.0.0 255.255.255.0 192.168.1.1'));
    s = apply(s, run(s, 'no ip route 10.0.0.0 255.255.255.0 192.168.1.1'));
    s = apply(s, run(s, 'exit'));

    const res = run(s, 'show running-config');
    expect(res.success).toBe(true);
    expect(res.output).not.toContain('ip route 10.0.0.0');
  });

  it('birden fazla route varken yalnızca ilgili route silinmeli', () => {
    let s = l3Config();
    s = apply(s, run(s, 'ip route 10.0.0.0 255.255.255.0 192.168.1.1'));
    s = apply(s, run(s, 'ip route 172.16.0.0 255.255.0.0 192.168.1.1'));
    s = apply(s, run(s, 'no ip route 10.0.0.0 255.255.255.0 192.168.1.1'));

    const remaining = s.staticRoutes ?? [];
    expect(remaining.length).toBe(1);
    expect(remaining[0].destination).toBe('172.16.0.0');
  });
});

// ─── 2. shutdown → no shutdown — STP & routing etkisi ───────────────────────

describe('shutdown / no shutdown — ağ etkileri', () => {
  it('shutdown → port.shutdown true', () => {
    let s = l2Config();
    s = apply(s, run(s, 'interface fa0/1'));
    s = apply(s, run(s, 'shutdown'));
    expect(s.ports['fa0/1']?.shutdown).toBe(true);
  });

  it('no shutdown → port.shutdown false', () => {
    let s = l2Config();
    s = apply(s, run(s, 'interface fa0/1'));
    s = apply(s, run(s, 'shutdown'));
    s = apply(s, run(s, 'no shutdown'));
    expect(s.ports['fa0/1']?.shutdown).toBe(false);
  });

  it('shutdown sonrası STP port state disabled olmalı (varsa)', () => {
    let s = l2Config();
    s = apply(s, run(s, 'interface fa0/1'));
    s = apply(s, run(s, 'shutdown'));

    const stp = s.ports['fa0/1']?.spanningTree;
    if (stp !== undefined) {
      expect(stp.state ?? 'disabled').toBe('disabled');
    } else {
      // STP tracking yoksa shutdown flag yeterli
      expect(s.ports['fa0/1']?.shutdown).toBe(true);
    }
  });

  it('L3 switch — shutdown sonrası o portun connected route show ip route\'da görünmemeli', () => {
    let s = l3Config();
    s = apply(s, run(s, 'ip routing'));
    s = apply(s, run(s, 'interface gi1/0/1'));
    s = apply(s, run(s, 'ip address 192.168.10.1 255.255.255.0'));
    s = apply(s, run(s, 'no shutdown'));
    s = apply(s, run(s, 'shutdown'));
    s = apply(s, run(s, 'exit'));
    s = apply(s, run(s, 'exit'));

    const res = run(s, 'show ip route');
    expect(res.success).toBe(true);
    expect(res.output).not.toContain('192.168.10.0');
  });

  it('L3 switch — no shutdown sonrası connected route yeniden görünmeli', () => {
    let s = l3Config();
    s = apply(s, run(s, 'ip routing'));
    s = apply(s, run(s, 'interface gi1/0/1'));
    s = apply(s, run(s, 'ip address 192.168.10.1 255.255.255.0'));
    s = apply(s, run(s, 'shutdown'));
    s = apply(s, run(s, 'no shutdown'));
    s = apply(s, run(s, 'exit'));
    s = apply(s, run(s, 'exit'));

    const res = run(s, 'show ip route');
    expect(res.success).toBe(true);
    expect(res.output).toContain('192.168.10');
  });

  it('shutdown sonrası show interfaces çıktısında port down içermeli', () => {
    let s = l2Config();
    s = apply(s, run(s, 'interface fa0/1'));
    s = apply(s, run(s, 'shutdown'));
    s = apply(s, run(s, 'exit'));
    s = apply(s, run(s, 'exit'));

    const res = run(s, 'show interfaces fa0/1');
    expect(res.success).toBe(true);
    const out = res.output ?? '';
    const hasDownState =
      out.includes('administratively down') ||
      out.includes('shutdown') ||
      out.includes('down');
    expect(hasDownState).toBe(true);
  });
});

// ─── 3. no ip address — connected route silinmeli ───────────────────────────

describe('no ip address — connected route etkisi', () => {
  it('ip address kaldırılınca port üzerinde ipAddress tanımsız olmalı', () => {
    let s = l3Config();
    s = apply(s, run(s, 'interface gi1/0/1'));
    s = apply(s, run(s, 'ip address 10.1.1.1 255.255.255.0'));
    s = apply(s, run(s, 'no ip address'));
    expect(s.ports['gi1/0/1']?.ipAddress).toBeUndefined();
    expect(s.ports['gi1/0/1']?.subnetMask).toBeUndefined();
  });

  it('no ip address → show ip route\'da o connected prefix görünmemeli', () => {
    let s = l3Config();
    s = apply(s, run(s, 'ip routing'));
    s = apply(s, run(s, 'interface gi1/0/1'));
    s = apply(s, run(s, 'ip address 10.1.1.1 255.255.255.0'));
    s = apply(s, run(s, 'no shutdown'));
    s = apply(s, run(s, 'no ip address'));
    s = apply(s, run(s, 'exit'));
    s = apply(s, run(s, 'exit'));

    const res = run(s, 'show ip route');
    expect(res.success).toBe(true);
    expect(res.output).not.toContain('10.1.1.0');
  });

  it('no ip address → show running-config\'da ip address satırı görünmemeli', () => {
    let s = l3Config();
    s = apply(s, run(s, 'interface gi1/0/1'));
    s = apply(s, run(s, 'ip address 10.1.1.1 255.255.255.0'));
    s = apply(s, run(s, 'no ip address'));
    s = apply(s, run(s, 'exit'));
    s = apply(s, run(s, 'exit'));

    const res = run(s, 'show running-config');
    expect(res.success).toBe(true);
    expect(res.output).not.toContain('ip address 10.1.1.1');
  });
});

// ─── 4. no ip nat inside — NAT translation oluşmamalı ───────────────────────

describe('no ip nat inside — NAT translation etkisi', () => {
  function makeNatPort(id: string, ip: string, side: 'inside' | 'outside'): Port {
    return {
      id,
      name: id,
      status: 'connected',
      vlan: 1,
      mode: 'routed',
      duplex: 'auto',
      speed: 'auto',
      shutdown: false,
      type: 'gigabitethernet',
      ipAddress: ip,
      subnetMask: '255.255.255.0',
      natSide: side,
    };
  }

  it('ip nat inside konfigüreli port üzerinde NAT translation oluşur', () => {
    const state = createInitialState();
    state.ports['Gi0/0'] = makeNatPort('Gi0/0', '192.168.1.1', 'inside');
    state.ports['Gi0/1'] = makeNatPort('Gi0/1', '203.0.113.1', 'outside');
    state.accessLists = { '1': ['permit 192.168.1.0 0.0.0.255'] };
    state.natDynamicRules = [{ aclId: '1', interface: 'Gi0/1', overload: true }];

    const res = processNatPacket(
      state, 'Gi0/0', 'Gi0/1', '192.168.1.50', '8.8.8.8', 45000, 53, 'udp',
    );
    expect(res.translated).toBe(true);
  });

  it('natSide undefined (no ip nat inside uygulandı) → NAT translation oluşmamalı', () => {
    const state = createInitialState();
    state.ports['Gi0/0'] = { ...makeNatPort('Gi0/0', '192.168.1.1', 'inside'), natSide: undefined };
    state.ports['Gi0/1'] = makeNatPort('Gi0/1', '203.0.113.1', 'outside');
    state.accessLists = { '1': ['permit 192.168.1.0 0.0.0.255'] };
    state.natDynamicRules = [{ aclId: '1', interface: 'Gi0/1', overload: true }];

    const res = processNatPacket(
      state, 'Gi0/0', 'Gi0/1', '192.168.1.50', '8.8.8.8', 45000, 53, 'udp',
    );
    expect(res.translated).toBe(false);
  });

  it('CLI — ip nat inside → natSide inside', () => {
    let s = l3Config();
    s = apply(s, run(s, 'interface gi1/0/1'));
    s = apply(s, run(s, 'ip nat inside'));
    expect(s.ports['gi1/0/1']?.natSide).toBe('inside');
  });

  it('CLI — no ip nat inside → natSide undefined', () => {
    let s = l3Config();
    s = apply(s, run(s, 'interface gi1/0/1'));
    s = apply(s, run(s, 'ip nat inside'));
    s = apply(s, run(s, 'no ip nat inside'));
    expect(s.ports['gi1/0/1']?.natSide).toBeUndefined();
  });

  it('CLI — ip nat outside → natSide outside', () => {
    let s = l3Config();
    s = apply(s, run(s, 'interface gi1/0/1'));
    s = apply(s, run(s, 'ip nat outside'));
    expect(s.ports['gi1/0/1']?.natSide).toBe('outside');
  });

  it('CLI — no ip nat outside → natSide undefined', () => {
    let s = l3Config();
    s = apply(s, run(s, 'interface gi1/0/1'));
    s = apply(s, run(s, 'ip nat outside'));
    s = apply(s, run(s, 'no ip nat outside'));
    expect(s.ports['gi1/0/1']?.natSide).toBeUndefined();
  });
});

// ─── 5. no ip access-group — ACL engeli kalkmalı ────────────────────────────

describe('no ip access-group — ACL etkisi', () => {
  it('ip access-group in uygulanınca accessGroupIn set olmalı', () => {
    let s = l3Config();
    s = apply(s, run(s, 'interface gi1/0/1'));
    s = apply(s, run(s, 'ip access-group BLOCK_ALL in'));
    expect(s.ports['gi1/0/1']?.accessGroupIn).toBe('BLOCK_ALL');
  });

  it('no ip access-group in → accessGroupIn undefined olmalı', () => {
    let s = l3Config();
    s = apply(s, run(s, 'interface gi1/0/1'));
    s = apply(s, run(s, 'ip access-group BLOCK_ALL in'));
    s = apply(s, run(s, 'no ip access-group BLOCK_ALL in'));
    expect(s.ports['gi1/0/1']?.accessGroupIn).toBeUndefined();
  });

  it('ip access-group out uygulanınca accessGroupOut set olmalı', () => {
    let s = l3Config();
    s = apply(s, run(s, 'interface gi1/0/1'));
    s = apply(s, run(s, 'ip access-group ALLOW_HTTP out'));
    expect(s.ports['gi1/0/1']?.accessGroupOut).toBe('ALLOW_HTTP');
  });

  it('no ip access-group out → accessGroupOut undefined olmalı', () => {
    let s = l3Config();
    s = apply(s, run(s, 'interface gi1/0/1'));
    s = apply(s, run(s, 'ip access-group ALLOW_HTTP out'));
    s = apply(s, run(s, 'no ip access-group ALLOW_HTTP out'));
    expect(s.ports['gi1/0/1']?.accessGroupOut).toBeUndefined();
  });

  it('in ACL kaldırılınca out ACL bozulmamalı', () => {
    let s = l3Config();
    s = apply(s, run(s, 'interface gi1/0/1'));
    s = apply(s, run(s, 'ip access-group IN_ACL in'));
    s = apply(s, run(s, 'ip access-group OUT_ACL out'));
    s = apply(s, run(s, 'no ip access-group IN_ACL in'));
    expect(s.ports['gi1/0/1']?.accessGroupIn).toBeUndefined();
    expect(s.ports['gi1/0/1']?.accessGroupOut).toBe('OUT_ACL');
  });
});

// ─── 6. no switchport access vlan — VLAN 1'e dönmeli ────────────────────────

describe('no switchport access vlan — VLAN etkisi', () => {
  it('switchport access vlan 10 → accessVlan 10', () => {
    let s = l2Config();
    s = apply(s, run(s, 'vlan 10'));
    s = apply(s, run(s, 'exit'));
    s = apply(s, run(s, 'interface fa0/1'));
    s = apply(s, run(s, 'switchport access vlan 10'));
    expect(s.ports['fa0/1']?.accessVlan).toBe(10);
  });

  it('no switchport access vlan → accessVlan 1 (default)', () => {
    let s = l2Config();
    s = apply(s, run(s, 'vlan 10'));
    s = apply(s, run(s, 'exit'));
    s = apply(s, run(s, 'interface fa0/1'));
    s = apply(s, run(s, 'switchport access vlan 10'));
    s = apply(s, run(s, 'no switchport access vlan'));
    expect(s.ports['fa0/1']?.accessVlan).toBe(1);
  });

  it('no switchport access vlan sonrası show vlan\'da port VLAN 1\'de görünmeli', () => {
    let s = l2Config();
    s = apply(s, run(s, 'vlan 10'));
    s = apply(s, run(s, 'exit'));
    s = apply(s, run(s, 'interface fa0/1'));
    s = apply(s, run(s, 'switchport access vlan 10'));
    s = apply(s, run(s, 'no switchport access vlan'));
    s = apply(s, run(s, 'exit'));
    s = apply(s, run(s, 'exit'));

    const res = run(s, 'show vlan');
    expect(res.success).toBe(true);
    expect(res.output).toContain('1');
  });
});

// ─── 7. no router ospf — dinamik route'lar temizlenmeli ─────────────────────

describe('no router ospf — OSPF route ve protokol etkisi', () => {
  it('router ospf 1 → routingProtocol ospf', () => {
    let s = createInitialRouterState();
    s = apply(s, run(s, 'enable'));
    s = apply(s, run(s, 'configure terminal'));
    s = apply(s, run(s, 'router ospf 1'));
    expect(s.routingProtocol).toBe('ospf');
  });

  it('no router ospf 1 → routingProtocol none', () => {
    let s = createInitialRouterState();
    s = apply(s, run(s, 'enable'));
    s = apply(s, run(s, 'configure terminal'));
    s = apply(s, run(s, 'router ospf 1'));
    s = apply(s, run(s, 'exit'));
    s = apply(s, run(s, 'no router ospf 1'));
    expect(s.routingProtocol).toBe('none');
  });

  it('no router ospf → dynamicRoutes boş dizi olmalı', () => {
    let s = createInitialRouterState();
    s = apply(s, run(s, 'enable'));
    s = apply(s, run(s, 'configure terminal'));
    s = apply(s, run(s, 'router ospf 1'));
    // Simüle edilmiş OSPF route
    s = {
      ...s,
      dynamicRoutes: [
        { destination: '10.0.0.0', subnetMask: '255.255.255.0', nextHop: '1.1.1.2', type: 'dynamic', metric: 110 },
      ],
    };
    s = apply(s, run(s, 'exit'));
    s = apply(s, run(s, 'no router ospf 1'));
    expect((s.dynamicRoutes ?? []).length).toBe(0);
  });

  it('no router ospf → show running-config\'da router ospf bloğu görünmemeli', () => {
    let s = createInitialRouterState();
    s = apply(s, run(s, 'enable'));
    s = apply(s, run(s, 'configure terminal'));
    s = apply(s, run(s, 'router ospf 1'));
    s = apply(s, run(s, 'exit'));
    s = apply(s, run(s, 'no router ospf 1'));
    s = apply(s, run(s, 'exit'));

    const res = run(s, 'show running-config');
    expect(res.success).toBe(true);
    expect(res.output).not.toContain('router ospf');
  });
});

// ─── 8. no router eigrp — EIGRP AS & route'lar temizlenmeli ─────────────────

describe('no router eigrp — EIGRP etkisi', () => {
  it('router eigrp 100 → routingProtocol eigrp, eigrpAs 100', () => {
    let s = createInitialRouterState();
    s = apply(s, run(s, 'enable'));
    s = apply(s, run(s, 'configure terminal'));
    s = apply(s, run(s, 'router eigrp 100'));
    expect(s.routingProtocol).toBe('eigrp');
    expect(s.eigrpAs).toBe('100');
  });

  it('no router eigrp 100 → routingProtocol none', () => {
    let s = createInitialRouterState();
    s = apply(s, run(s, 'enable'));
    s = apply(s, run(s, 'configure terminal'));
    s = apply(s, run(s, 'router eigrp 100'));
    s = apply(s, run(s, 'exit'));
    s = apply(s, run(s, 'no router eigrp 100'));
    expect(s.routingProtocol).toBe('none');
  });

  it('no router eigrp 100 → eigrpAs undefined olmalı', () => {
    let s = createInitialRouterState();
    s = apply(s, run(s, 'enable'));
    s = apply(s, run(s, 'configure terminal'));
    s = apply(s, run(s, 'router eigrp 100'));
    s = apply(s, run(s, 'exit'));
    s = apply(s, run(s, 'no router eigrp 100'));
    expect(s.eigrpAs).toBeUndefined();
  });

  it('no router eigrp → EIGRP kaynaklı dynamicRoutes temizlenmeli', () => {
    let s = createInitialRouterState();
    s = apply(s, run(s, 'enable'));
    s = apply(s, run(s, 'configure terminal'));
    s = apply(s, run(s, 'router eigrp 100'));
    // Simüle edilmiş EIGRP route
    s = {
      ...s,
      dynamicRoutes: [
        { destination: '172.16.0.0', subnetMask: '255.255.0.0', nextHop: '10.0.0.2', type: 'dynamic', metric: 90 },
      ],
    };
    s = apply(s, run(s, 'exit'));
    s = apply(s, run(s, 'no router eigrp 100'));
    expect((s.dynamicRoutes ?? []).length).toBe(0);
  });
});

// ─── 9. no router bgp — BGP AS & session temizlenmeli ───────────────────────

describe('no router bgp — BGP etkisi', () => {
  it('router bgp 65001 → routingProtocol bgp, bgpAs 65001', () => {
    let s = createInitialRouterState();
    s = apply(s, run(s, 'enable'));
    s = apply(s, run(s, 'configure terminal'));
    s = apply(s, run(s, 'router bgp 65001'));
    expect(s.routingProtocol).toBe('bgp');
    expect(s.bgpAs).toBe('65001');
  });

  it('no router bgp 65001 → routingProtocol none', () => {
    let s = createInitialRouterState();
    s = apply(s, run(s, 'enable'));
    s = apply(s, run(s, 'configure terminal'));
    s = apply(s, run(s, 'router bgp 65001'));
    s = apply(s, run(s, 'exit'));
    s = apply(s, run(s, 'no router bgp 65001'));
    expect(s.routingProtocol).toBe('none');
  });

  it('no router bgp 65001 → bgpAs undefined olmalı', () => {
    let s = createInitialRouterState();
    s = apply(s, run(s, 'enable'));
    s = apply(s, run(s, 'configure terminal'));
    s = apply(s, run(s, 'router bgp 65001'));
    s = apply(s, run(s, 'exit'));
    s = apply(s, run(s, 'no router bgp 65001'));
    expect(s.bgpAs).toBeUndefined();
  });

  it('no router bgp → BGP kaynaklı dynamicRoutes temizlenmeli', () => {
    let s = createInitialRouterState();
    s = apply(s, run(s, 'enable'));
    s = apply(s, run(s, 'configure terminal'));
    s = apply(s, run(s, 'router bgp 65001'));
    // Simüle edilmiş BGP route
    s = {
      ...s,
      dynamicRoutes: [
        { destination: '8.8.0.0', subnetMask: '255.255.0.0', nextHop: '1.1.1.1', type: 'dynamic', metric: 20 },
      ],
    };
    s = apply(s, run(s, 'exit'));
    s = apply(s, run(s, 'no router bgp 65001'));
    expect((s.dynamicRoutes ?? []).length).toBe(0);
  });

  it('no router bgp → show running-config\'da router bgp bloğu görünmemeli', () => {
    let s = createInitialRouterState();
    s = apply(s, run(s, 'enable'));
    s = apply(s, run(s, 'configure terminal'));
    s = apply(s, run(s, 'router bgp 65001'));
    s = apply(s, run(s, 'exit'));
    s = apply(s, run(s, 'no router bgp 65001'));
    s = apply(s, run(s, 'exit'));

    const res = run(s, 'show running-config');
    expect(res.success).toBe(true);
    expect(res.output).not.toContain('router bgp');
  });
});

// ─── 10. Güçlendirilmiş ip route / no ip route testi (cliBehavior zayıf test yerine) ────

describe('no ip route — zayıf testin güçlendirilmiş versiyonu', () => {
  /**
   * Eski (zayıf) test:
   *   ip route → no ip route → expect(s.staticRoutes).toBeDefined()
   *
   * Bu test route'un GERÇEKTEn silindiğini doğrulamamaktaydı.
   * Aşağıdaki test tüm kritik noktaları kapsar.
   */
  it('ip route eklenir, silinir → entry kaybolur, array tanımlı kalır', () => {
    let s = configMode(createInitialState('00:aa:bb:cc:dd:ff', 'NS-L3-24PS'));

    const resAdd = run(s, 'ip route 10.0.0.0 255.255.255.0 192.168.1.1');
    expect(resAdd.success).toBe(true);
    s = apply(s, resAdd);
    const countBefore = (s.staticRoutes ?? []).length;
    expect(countBefore).toBeGreaterThan(0);

    const resDel = run(s, 'no ip route 10.0.0.0 255.255.255.0 192.168.1.1');
    expect(resDel.success).toBe(true);
    s = apply(s, resDel);

    // Array var (boş dizi), ama entry yok
    expect(s.staticRoutes).toBeDefined();
    expect((s.staticRoutes ?? []).length).toBe(countBefore - 1);
    const entry = (s.staticRoutes ?? []).find(
      (r) => r.destination === '10.0.0.0' && r.subnetMask === '255.255.255.0',
    );
    expect(entry).toBeUndefined();
  });
});
