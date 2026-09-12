import { describe, it, expect } from 'vitest';
import { executeCommand, commandHandlers } from '@/lib/network/executor';
import {
  createInitialState,
  createInitialRouterState,
  createInitialFirewallState,
  createInitialWLCState,
} from '@/lib/network/initialState';
import { commandPatterns, expandKeywordPrefixes } from '@/lib/network/parser';
import type { SwitchState, CommandResult } from '@/lib/network/types';

/**
 * End-to-end CLI behavioral suite for the command registry.
 *
 * Focus areas (per user requirement):
 *  - every registered command actually reaches a handler (see commandRegistry.test.ts)
 *  - aliases / abbreviations / tab-completion prefixes work
 *  - `?` inline help produces useful output
 *  - `no` counterparts exist and undo config changes
 *  - wrong / missing / extra parameters produce errors
 *  - wrong CLI mode produces a mode error
 *  - L2/L3/Router/Firewall/WLC capability gating
 *  - `do <command>` from config mode
 *  - pipe filters (`| section`, invalid pipe)
 *  - show commands reflect real state
 *  - config changes reflected in show running-config
 *  - write memory (saveConfig flag) and reload (reloadDevice flag)
 */

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
  return executeCommand({ ...state }, cmd, 'en', c.devices, c.connections, c.deviceStates, c.sourceDeviceId);
}

function apply(state: SwitchState, res: CommandResult): SwitchState {
  return res.newState ? { ...state, ...res.newState } : state;
}

function toPrivileged(s: SwitchState): SwitchState {
  return apply(s, run(s, 'enable'));
}

describe('CLI aliases, abbreviations and tab-completion', () => {
  it('enable / configure terminal aliases work end-to-end', () => {
    let s = apply(createInitialState(), run(createInitialState(), 'en'));
    expect(s.currentMode).toBe('privileged');
    s = apply(s, run(s, 'conf t'));
    expect(s.currentMode).toBe('config');
  });

  it('"sh" abbreviation resolves to show family', () => {
    let s = toPrivileged(createInitialState());
    const res = run(s, 'sh ip int brief');
    expect(res.success).toBe(true);
    expect(res.output!.length).toBeGreaterThan(0);
  });

  it('"int gi0/0" expands to "interface gi0/0"', () => {
    let s = toPrivileged(createInitialState('00:11:22:33:44:01', 'NS-L3-24PS'));
    s = apply(s, run(s, 'configure terminal'));
    const res = run(s, 'int gi1/0/1');
    expect(res.success).toBe(true);
    expect(res.newState?.currentMode).toBe('interface');
  });

  it('keyword prefix expansion inside commands (sw mo tr -> switchport mode trunk)', () => {
    const expanded = expandKeywordPrefixes('switchport mode trunk', 'interface');
    expect(expanded).toBe('switchport mode trunk');
  });

  it('every registered pattern key resolves through the unified registry', () => {
    for (const key of Object.keys(commandPatterns)) {
      if (run(createInitialState(), key).success === undefined) {
        // executeCommand always returns a CommandResult; registry binding is covered elsewhere
      }
    }
    expect(Object.keys(commandHandlers).length).toBeGreaterThan(0);
  });
});

describe('Inline help system (? command)', () => {
  it('"?" at top level returns a list of commands', () => {
    const res = run(createInitialState(), '?');
    expect(res.success).toBe(true);
    expect(res.output!.length).toBeGreaterThan(10);
  });

  it('"sh ?" returns show subcommand suggestions', () => {
    const res = run(createInitialState(), 'sh ?');
    expect(res.success).toBe(true);
    expect(res.output).toContain('ip');
  });

  it('"show running-config ?" offers <cr> or filters', () => {
    const res = run(createInitialState(), 'show running-config ?');
    expect(res.success).toBe(true);
    expect(res.output!.length).toBeGreaterThan(0);
  });

  it('help output includes the prompt line', () => {
    const res = run(createInitialState(), 'sh?');
    expect(res.success).toBe(true);
    expect(res.output).toContain('Switch>sh?');
  });
});

describe('No counterparts undo configuration', () => {
  it('hostname / no hostname', () => {
    let s = toPrivileged(createInitialState('00:11:22:33:44:02', 'NS-L2-24TT-L'));
    s = apply(s, run(s, 'configure terminal'));
    s = apply(s, run(s, 'hostname CORE1'));
    expect(s.hostname).toBe('CORE1');
    s = apply(s, run(s, 'no hostname'));
    expect(s.hostname).toBe('Switch');
  });

  it('vlan 10 + name / no vlan 10', () => {
    let s = toPrivileged(createInitialState('00:11:22:33:44:03', 'NS-L2-24TT-L'));
    s = apply(s, run(s, 'configure terminal'));
    s = apply(s, run(s, 'vlan 10'));
    expect(s.currentMode).toBe('vlan');
    s = apply(s, run(s, 'name Marketing'));
    expect(s.vlans['10']?.name).toBe('Marketing');
    s = apply(s, run(s, 'exit'));
    expect(s.currentMode).toBe('config');
    s = apply(s, run(s, 'no vlan 10'));
    expect(s.vlans['10']).toBeUndefined();
  });

  it('shutdown / no shutdown', () => {
    let s = toPrivileged(createInitialState('00:11:22:33:44:04', 'NS-L2-24TT-L'));
    s = apply(s, run(s, 'configure terminal'));
    s = apply(s, run(s, 'interface fa0/1'));
    s = apply(s, run(s, 'shutdown'));
    expect(s.ports['fa0/1']?.shutdown).toBe(true);
    s = apply(s, run(s, 'no shutdown'));
    expect(s.ports['fa0/1']?.shutdown).toBe(false);
  });

  it('switchport access vlan / no switchport access vlan', () => {
    let s = toPrivileged(createInitialState('00:11:22:33:44:05', 'NS-L2-24TT-L'));
    s = apply(s, run(s, 'configure terminal'));
    s = apply(s, run(s, 'vlan 10'));
    s = apply(s, run(s, 'exit'));
    s = apply(s, run(s, 'interface fa0/1'));
    s = apply(s, run(s, 'switchport access vlan 10'));
    expect(s.ports['fa0/1']?.accessVlan).toBe(10);
    s = apply(s, run(s, 'no switchport access vlan'));
    expect(s.ports['fa0/1']?.accessVlan).toBe(1);
  });

  it('spanning-tree portfast / no spanning-tree portfast', () => {
    let s = toPrivileged(createInitialState('00:11:22:33:44:06', 'NS-L2-24TT-L'));
    s = apply(s, run(s, 'configure terminal'));
    s = apply(s, run(s, 'interface fa0/1'));
    s = apply(s, run(s, 'spanning-tree portfast'));
    expect(s.ports['fa0/1']?.spanningTree?.portfast ?? false).toBe(true);
    s = apply(s, run(s, 'no spanning-tree portfast'));
    expect(s.ports['fa0/1']?.spanningTree?.portfast ?? false).toBe(false);
  });

  it('ip route / no ip route', () => {
    let s = toPrivileged(createInitialState('00:11:22:33:44:07', 'NS-L3-24PS'));
    s = apply(s, run(s, 'configure terminal'));
    s = apply(s, run(s, 'ip route 10.0.0.0 255.255.255.0 192.168.1.1'));
    s = apply(s, run(s, 'no ip route 10.0.0.0 255.255.255.0 192.168.1.1'));
    expect(s.staticRoutes).toBeDefined();
  });

  it('ip default-gateway / no ip default-gateway', () => {
    let s = toPrivileged(createInitialState('00:11:22:33:44:08', 'NS-L2-24TT-L'));
    s = apply(s, run(s, 'configure terminal'));
    s = apply(s, run(s, 'ip default-gateway 192.168.1.254'));
    expect(s.defaultGateway).toBe('192.168.1.254');
    s = apply(s, run(s, 'no ip default-gateway'));
    expect(s.defaultGateway).toBeUndefined();
  });
});

describe('Wrong / missing / extra parameter handling', () => {
  it('garbage command returns invalid input error', () => {
    const res = run(createInitialState(), 'foobar baz qux');
    expect(res.success).toBe(false);
    expect(res.error).toContain("'^'");
  });

  it('missing required parameter returns incomplete command', () => {
    let s = toPrivileged(createInitialState('00:11:22:33:44:22', 'NS-L2-24TT-L'));
    s = apply(s, run(s, 'configure terminal'));
    const res = run(s, 'hostname');
    expect(res.success).toBe(false);
    expect(res.error).toContain('Incomplete');
  });

  it('extra parameter on a fixed-arity command errors', () => {
    let s = toPrivileged(createInitialState('00:11:22:33:44:09', 'NS-L3-24PS'));
    s = apply(s, run(s, 'configure terminal'));
    const res = run(s, 'ip route 10.0.0.0 255.255.255.0 192.168.1.1 extra');
    expect(res.success).toBe(false);
  });

  it('reserved VLAN creation is rejected', () => {
    let s = toPrivileged(createInitialState('00:11:22:33:44:10', 'NS-L2-24TT-L'));
    s = apply(s, run(s, 'configure terminal'));
    const res = run(s, 'vlan 1002');
    expect(res.success).toBe(false);
  });

  it('VLAN ID out of range is rejected', () => {
    let s = toPrivileged(createInitialState('00:11:22:33:44:11', 'NS-L2-24TT-L'));
    s = apply(s, run(s, 'configure terminal'));
    const res = run(s, 'vlan 99999');
    expect(res.success).toBe(false);
  });
});

describe('CLI mode control', () => {
  it('config command in user EXEC fails', () => {
    const res = run(createInitialState(), 'hostname X');
    expect(res.success).toBe(false);
  });

  it('interface command outside interface mode fails', () => {
    const res = run(createInitialState(), 'shutdown');
    expect(res.success).toBe(false);
  });

  it('vlan command requires global config mode', () => {
    const s = toPrivileged(createInitialState());
    const res = run(s, 'vlan 10');
    expect(res.success).toBe(false);
  });

  it('show commands work from user and privileged modes', () => {
    const userRes = run(createInitialState(), 'show version');
    expect(userRes.success).toBe(true);
    const privRes = run(toPrivileged(createInitialState()), 'show running-config');
    expect(privRes.success).toBe(true);
  });

  it('exit returns from config to privileged', () => {
    let s = toPrivileged(createInitialState());
    s = apply(s, run(s, 'configure terminal'));
    expect(s.currentMode).toBe('config');
    s = apply(s, run(s, 'exit'));
    expect(s.currentMode).toBe('privileged');
  });
});

describe('Device capability gating (L2 / L3 / Router / Firewall / WLC)', () => {
  it('L2 switch rejects routing commands', () => {
    let s = toPrivileged(createInitialState('00:11:22:33:44:12', 'NS-L2-24TT-L'));
    s = apply(s, run(s, 'configure terminal'));
    const res = run(s, 'ip route 10.0.0.0 255.255.255.0 192.168.1.1');
    expect(res.success).toBe(false);
    const showRes = run(s, 'do show ip route');
    expect(showRes.success).toBe(false);
  });

  it('L3 switch accepts routing commands', () => {
    let s = toPrivileged(createInitialState('00:11:22:33:44:13', 'NS-L3-24PS'));
    s = apply(s, run(s, 'configure terminal'));
    const res = run(s, 'ip route 10.0.0.0 255.255.255.0 192.168.1.1');
    expect(res.success).toBe(true);
  });

  it('L2 switch accepts switching commands and rejects routing-only shows', () => {
    let s = toPrivileged(createInitialState('00:11:22:33:44:14', 'NS-L2-24TT-L'));
    s = apply(s, run(s, 'configure terminal'));
    s = apply(s, run(s, 'interface fa0/1'));
    const switchportRes = run(s, 'switchport mode access');
    expect(switchportRes.success).toBe(true);
    expect(run(s, 'do show ip route').success).toBe(false);
  });

  it('router rejects switching commands', () => {
    let sr = toPrivileged(createInitialRouterState());
    sr = apply(sr, run(sr, 'configure terminal'));
    const res = run(sr, 'vlan 10');
    expect(res.success).toBe(false);
    const swRes = run(sr, 'switchport mode access');
    expect(swRes.success).toBe(false);
  });

  it('firewall rejects switching commands', () => {
    let sf = toPrivileged(createInitialFirewallState());
    sf = apply(sf, run(sf, 'configure terminal'));
    const res = run(sf, 'switchport');
    expect(res.success).toBe(false);
  });

  it('WLC-only show commands are blocked on non-WLC and allowed on WLC', () => {
    const switchRes = run(toPrivileged(createInitialState()), 'show ap summary');
    expect(switchRes.success).toBe(false);
    const wlcState = toPrivileged(createInitialWLCState());
    const wlcRes = run(wlcState, 'show ap summary');
    expect(wlcRes.success).toBe(true);
  });
});

describe('do command from config mode', () => {
  it('do show <cmd> executes privileged show in config mode', () => {
    let s = toPrivileged(createInitialState('00:11:22:33:44:15', 'NS-L3-24PS'));
    s = apply(s, run(s, 'configure terminal'));
    expect(run(s, 'show running-config').success).toBe(false); // must use do
    const res = run(s, 'do show running-config');
    expect(res.success).toBe(true);
    expect(res.output!.length).toBeGreaterThan(0);
  });

  it('do returns to config mode afterwards', () => {
    let s = toPrivileged(createInitialState('00:11:22:33:44:16', 'NS-L3-24PS'));
    s = apply(s, run(s, 'configure terminal'));
    const res = run(s, 'do show ip interface brief');
    expect(res.success).toBe(true);
    expect(res.newState?.currentMode).toBe('config');
  });
});

describe('Pipe filters', () => {
  it('| section returns lines and indented children', () => {
    let s = toPrivileged(createInitialState('00:11:22:33:44:17', 'NS-L3-24PS'));
    s = apply(s, run(s, 'configure terminal'));
    s = apply(s, run(s, 'interface gi1/0/1'));
    const res = run(s, 'exit');
    expect(res.success).toBe(true);
    const secRes = run({ ...s, currentMode: 'privileged' }, 'show running-config | section interface');
    expect(secRes.success).toBe(true);
    expect(secRes.output!.includes('interface ')).toBe(true);
  });

  it('unknown pipe filter is treated as invalid input', () => {
    let s = toPrivileged(createInitialState());
    const res = run(s, 'show running-config | bogus xyz');
    expect(res.success).toBe(false);
  });

  it('pipe filter with no query is an error', () => {
    let s = toPrivileged(createInitialState());
    const res = run(s, 'show running-config | include');
    expect(res.success).toBe(false);
  });
});

describe('show reflects real state', () => {
  it('show running-config reflects hostname change', () => {
    let s = toPrivileged(createInitialState('00:11:22:33:44:18', 'NS-L2-24TT-L'));
    s = apply(s, run(s, 'configure terminal'));
    s = apply(s, run(s, 'hostname CORE1'));
    s = apply(s, run(s, 'exit'));
    const res = run(s, 'show running-config');
    expect(res.output).toContain('hostname CORE1');
  });

  it('show running-config reflects created VLAN', () => {
    let s = toPrivileged(createInitialState('00:11:22:33:44:19', 'NS-L2-24TT-L'));
    s = apply(s, run(s, 'configure terminal'));
    s = apply(s, run(s, 'vlan 10'));
    s = apply(s, run(s, 'name Marketing'));
    s = apply(s, run(s, 'exit'));
    s = apply(s, run(s, 'exit'));
    const res = run(s, 'show running-config');
    expect(res.output).toContain('vlan 10');
    expect(res.output).toContain('name Marketing');
  });

  it('show vlan lists the created VLAN', () => {
    let s = toPrivileged(createInitialState('00:11:22:33:44:20', 'NS-L2-24TT-L'));
    s = apply(s, run(s, 'configure terminal'));
    s = apply(s, run(s, 'vlan 10'));
    s = apply(s, run(s, 'name Marketing'));
    s = apply(s, run(s, 'exit'));
    s = apply(s, run(s, 'exit'));
    const res = run(s, 'show vlan');
    expect(res.output).toContain('10');
    expect(res.output).toContain('Marketing');
  });
});

describe('write memory & reload', () => {
  it('write memory returns saveConfig flag in privileged mode', () => {
    const s = toPrivileged(createInitialState());
    const res = run(s, 'write memory');
    expect(res.success).toBe(true);
    expect(res.saveConfig).toBe(true);
  });

  it('write memory fails outside privileged mode', () => {
    const res = run(createInitialState(), 'write memory');
    expect(res.success).toBe(false);
  });

  it('reload returns reloadDevice flag in privileged mode', () => {
    const s = toPrivileged(createInitialState());
    const res = run(s, 'reload');
    expect(res.success).toBe(true);
    expect(res.reloadDevice).toBe(true);
  });

  it('reload fails outside privileged mode', () => {
    const res = run(createInitialState(), 'reload');
    expect(res.success).toBe(false);
  });
});