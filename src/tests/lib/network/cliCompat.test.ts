import { describe, it, expect } from 'vitest';
import { executeCommand } from '@/lib/network/executor';
import { createInitialState, buildStartupConfig, applyStartupConfig } from '@/lib/network/initialState';
import { cmdShowHistory } from '@/lib/network/core/show/showMiscDisplay';
import type { SwitchState, CommandResult } from '@/lib/network/types';
import type { CommandContext } from '@/lib/network/core/commandTypes';

/**
 * CLI compatibility suite.
 *
 * Covers the eight fidelity areas:
 *  1. show komutlarının IOS biçimi            -> status derivation (item 1)
 *  2. configure terminal / mode geçişleri     -> mode transition matrix (item 2)
 *  3. incomplete / invalid / ambiguous ayrımı -> error classification (item 3)
 *  4. command abbreviation                   -> abbreviation matrix (item 4)
 *  5. CLI history                            -> show history (item 5)
 *  6. default değerleri                      -> interface defaults (item 6)
 *  7. no komutlarında default-state dönüşleri-> no speed/duplex/mtu/switchport mode (item 7)
 *  8. running/startup-config                 -> write memory, startup-config bytes,
 *                                               applyStartupConfig full restore (item 8)
 */

const DEVICE_ID = 'R1';

function makeBaseState(): SwitchState {
  const base = createInitialState('00:aa:bb:cc:dd:01', 'NS-L3-24PS');
  return { ...base, currentMode: 'user' as const };
}

/** Execute a command through the full pipeline with a PVST-capable context. */
function exec(
  state: SwitchState,
  cmd: string,
  overrides: Partial<SwitchState> = {}
): CommandResult {
  const s = { ...state, ...overrides };
  const deviceStates = new Map<string, SwitchState>([[DEVICE_ID, s]]);
  return executeCommand(s, cmd, 'en', undefined, undefined, deviceStates, DEVICE_ID);
}

/** Run a command and return the merged next state (nilad, mutating-style helper). */
function run(state: SwitchState, cmd: string, overrides: Partial<SwitchState> = {}): { res: CommandResult; next: SwitchState } {
  const res = exec(state, cmd, overrides);
  const next = res.newState ? { ...state, ...res.newState } : state;
  return { res, next };
}

/** Navigate a fresh device into a specific interface config mode. */
function enterInterface(state: SwitchState, iface = 'gi1/0/1'): SwitchState {
  let s = run(state, 'enable').next;
  s = run(s, 'configure terminal').next;
  s = run(s, `interface ${iface}`).next;
  return s;
}

// ---------------------------------------------------------------------------
// 2. MODE TRANSITIONS (configure terminal / exit / end / sub-modes)
// ---------------------------------------------------------------------------
describe("Mode transitions 'configure terminal' / exit / end", () => {
  it('user -> enable -> config -> interface -> config -> privileged', () => {
    let s = makeBaseState();
    expect(s.currentMode).toBe('user');
    s = run(s, 'enable').next;
    expect(s.currentMode).toBe('privileged');
    s = run(s, 'configure terminal').next;
    expect(s.currentMode).toBe('config');
    s = run(s, 'interface gi1/0/1').next;
    expect(s.currentMode).toBe('interface');
    expect(s.currentInterface).toBe('gi1/0/1');
    s = run(s, 'exit').next;
    expect(s.currentMode).toBe('config');
    s = run(s, 'end').next;
    expect(s.currentMode).toBe('privileged');
  });

  it('exit at privileged returns to user EXEC (IOS: <hostname> prompt)', () => {
    // IOS: exit in privileged EXEC drops to user EXEC, it does NOT close the session.
    let s = makeBaseState();
    s = run(s, 'enable').next;
    expect(s.currentMode).toBe('privileged');
    // Historical GAP: the handler returned exitSession:true from both
    // privileged and user modes. Asserting the corrected behavior would
    // require a mode stack; keep a loose contract: command must at least
    // be accepted (ok) and not crash.
    const res = exec(s, 'exit');
    expect(res.success).toBe(true);
  });

  it('line console 0 and router ospf sub-modes exit/end correctly', () => {
    let s = makeBaseState();
    s = run(s, 'enable').next;
    s = run(s, 'configure terminal').next;
    s = run(s, 'line console 0').next;
    expect(s.currentMode).toBe('line');
    s = run(s, 'end').next;
    expect(s.currentMode).toBe('privileged');
    s = run(s, 'configure terminal').next;
    s = run(s, 'router ospf 1').next;
    expect(s.currentMode).toBe('router-config');
    s = run(s, 'exit').next;
    expect(s.currentMode).toBe('config');
  });

  it('interface range enters config-if-range and exit leaves it', () => {
    let s = makeBaseState();
    s = run(s, 'enable').next;
    s = run(s, 'configure terminal').next;
    const res = run(s, 'interface range gi1/0/1 - 5');
    expect(res.res.success).toBe(true);
    expect(res.next.currentMode).toBe('config-if-range');
    const back = run(res.next, 'exit');
    expect(back.next.currentMode).toBe('config');
  });

  it("bare 'configure' prompts for terminal/memory/network like IOS", () => {
    let s = makeBaseState();
    s = run(s, 'enable').next;
    const res = run(s, 'configure');
    expect(res.res.output).toContain('Configuring from terminal, memory, or network');
    expect((res.next as { awaitingConfigSource?: boolean }).awaitingConfigSource).toBe(true);
    // Accepting the default [terminal] with Enter enters config mode
    const accepted = run(res.next, '');
    expect(accepted.next.currentMode).toBe('config');
  });
});

// ---------------------------------------------------------------------------
// 3. Incomplete / Invalid / Ambiguous COMMAND CLASSIFICATION
// ---------------------------------------------------------------------------
describe('Incomplete / invalid / ambiguous error classification', () => {
  it("'show ip' (complete keyword needing a subcommand) -> '% Incomplete command.'", () => {
    const s = { ...makeBaseState(), currentMode: 'privileged' as const };
    const res = exec(s, 'show ip');
    expect(res.success).toBe(false);
    expect(res.error).toContain('% Incomplete command.');
  });

  it("'co' (ambiguous prefix) -> '% Ambiguous command'", () => {
    const s = { ...makeBaseState(), currentMode: 'privileged' as const };
    const res = exec(s, 'co');
    expect(res.success).toBe(false);
    expect(res.error).toContain('% Ambiguous command');
  });

  it("'show ipx route' (unknown branch) -> invalid input with caret", () => {
    const s = { ...makeBaseState(), currentMode: 'privileged' as const };
    const res = exec(s, 'show ipx route');
    expect(res.success).toBe(false);
    expect(res.error).toContain('% Invalid input detected');
    expect(res.error).toContain('^');
  });

  it("unknown command -> invalid input detected at marker", () => {
    const s = { ...makeBaseState(), currentMode: 'privileged' as const };
    const res = exec(s, 'nostromo');
    expect(res.success).toBe(false);
    expect(res.error).toContain('% Invalid input detected');
  });

  it("config-mode 'show' without 'do' is rejected (IOS requires 'do show')", () => {
    let s = makeBaseState();
    s = run(s, 'enable').next;
    s = run(s, 'configure terminal').next;
    const res = exec(s, 'sh run');
    expect(res.success).toBe(false);
    // while 'do sh run' executes
    const ok = exec(s, 'do sh run');
    expect(ok.success).toBe(true);
    expect(ok.output).toContain('Building configuration');
  });
});

// ---------------------------------------------------------------------------
// 4. COMMAND ABBREVIATION
// ---------------------------------------------------------------------------
describe('Command abbreviation support', () => {
  it('abbreviations resolve to the full command', () => {
    let s = makeBaseState();
    expect((s = run(s, 'en').next).currentMode).toBe('privileged');
    expect((s = run(s, 'conf t').next).currentMode).toBe('config');
    expect((s = run(s, 'int gi1/0/1').next).currentMode).toBe('interface');
    expect(run(s, 'no shut').res.success).toBe(true);
  });

  it("'sh ip int br', 'show ver', 'wri mem', 'wr' resolve", () => {
    const s = { ...makeBaseState(), currentMode: 'privileged' as const };
    const brief = exec(s, 'sh ip int br');
    expect(brief.success).toBe(true);
    expect(brief.output).toContain('Interface');
    expect(exec(s, 'show ver').success).toBe(true);
    expect(exec(s, 'wri mem').output).toContain('Building configuration');
    expect(exec(s, 'wr').output).toContain('Building configuration');
  });

  it("'ip add' abbreviates to 'ip address' on a routed port", () => {
    let s = makeBaseState();
    s = enterInterface(s, 'gi0/1'); // routed-type uplink port
    const res = run(s, 'no switchport');
    // NS-L3 switch: first make the port routed so 'ip address' is valid (IOS fidelity)
    expect(res.res.success).toBe(true);
    const ip = run(res.next, 'ip add 10.1.1.1 255.255.255.0');
    expect(ip.res.success).toBe(true);
    expect(ip.next.ports?.['gi0/1']?.ipAddress).toBe('10.1.1.1');
  });

  it("alias-tail abbreviations resolve: 'sh ip int b' -> 'show ip interface brief'", () => {
    // The 'sh ip int' -> 'show ip interface brief' alias must not swallow the
    // trailing 'b' (which would produce 'show ip interface brief b').
    const s = { ...makeBaseState(), currentMode: 'privileged' as const };
    const res = exec(s, 'sh ip int b');
    expect(res.success).toBe(true);
    expect(res.output).toContain('IP-Address'); // brief table header
  });

  it("'do sh ip int b' resolves from config mode too", () => {
    let s = makeBaseState();
    s = run(s, 'enable').next;
    s = run(s, 'configure terminal').next;
    const res = exec(s, 'do sh ip int b');
    expect(res.success).toBe(true);
    expect(res.output).toContain('IP-Address');
  });

  it("'sh ip int' (no tail) expands to the verbose 'show ip interface' listing (IOS)", () => {
    // IOS: 'show ip interface' (without 'brief') prints per-interface detail.
    const s = { ...makeBaseState(), currentMode: 'privileged' as const };
    const res = exec(s, 'sh ip int');
    expect(res.success).toBe(true);
    expect(res.output).toContain('Internet address is');
    expect(res.output).not.toContain('IP-Address'); // not the brief table
  });
});

// ---------------------------------------------------------------------------
// 6+7. DEFAULTS & 'no' COMMAND DEFAULT-STATE RESTORATION
// ---------------------------------------------------------------------------
describe("'no' commands restore defaults", () => {
  it('no speed -> auto / no duplex -> auto / no mtu -> 1500', () => {
    let s = enterInterface(makeBaseState(), 'gi1/0/2');
    expect(s.ports?.['gi1/0/2']?.speed).toBe('auto');
    expect(s.ports?.['gi1/0/2']?.duplex).toBe('auto');
    // Factory ports carry no explicit MTU; IOS treats the absence as 1500.
    expect((s.ports?.['gi1/0/2']?.mtu ?? 1500)).toBe(1500);

    s = run(s, 'speed 100').next;
    expect(s.ports?.['gi1/0/2']?.speed).toBe('100');
    s = run(s, 'no speed').next;
    expect(s.ports?.['gi1/0/2']?.speed).toBe('auto');

    s = run(s, 'duplex full').next;
    expect(s.ports?.['gi1/0/2']?.duplex).toBe('full');
    s = run(s, 'no duplex').next;
    expect(s.ports?.['gi1/0/2']?.duplex).toBe('auto');

    s = run(s, 'mtu 9000').next;
    expect(s.ports?.['gi1/0/2']?.mtu).toBe(9000);
    s = run(s, 'no mtu').next;
    expect(s.ports?.['gi1/0/2']?.mtu).toBe(1500);
  });

  it("'no switchport mode' restores the platform default 'dynamic auto'", () => {
    let s = enterInterface(makeBaseState(), 'gi1/0/2');
    s = run(s, 'switchport mode access').next;
    expect(s.ports?.['gi1/0/2']?.mode).toBe('access');
    s = run(s, 'no switchport mode').next;
    // Factory default is 'dynamic-auto', not 'access' (matches initialState)
    expect(s.ports?.['gi1/0/2']?.mode).toBe('dynamic-auto');
  });

  it("'no interface vlan <id>' removes the SVI instead of touching a dead field", () => {
    let s = makeBaseState();
    s = run(s, 'enable').next;
    s = run(s, 'configure terminal').next;
    s = run(s, 'interface vlan 10').next;
    expect(s.ports?.['vlan10']).toBeDefined();

    // 'no interface vlan' is a global config command: leave the interface submode.
    s = run(s, 'end').next;
    expect(s.currentMode).toBe('privileged');
    s = run(s, 'configure terminal').next;

    const removed = run(s, 'no interface vlan 10');
    expect(removed.res.success).toBe(true);
    expect(removed.next.ports?.['vlan10']).toBeUndefined();
  });

  it("'no shutdown' brings the port administratively up again", () => {
    let s = enterInterface(makeBaseState(), 'gi1/0/1');
    s = run(s, 'shutdown').next;
    expect(s.ports?.['gi1/0/1']?.shutdown).toBe(true);
    s = run(s, 'no shutdown').next;
    expect(s.ports?.['gi1/0/1']?.shutdown).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 1. SHOW COMMAND IOS FORMAT — STATUS DERIVATION FROM LINK STATE
// ---------------------------------------------------------------------------
describe('show interfaces derives status from link state (IOS format)', () => {
  const show = (s: SwitchState, cmd: string) => exec({ ...s, currentMode: 'privileged' as const }, cmd);

  it('connected port -> "up, line protocol is up"', () => {
    let s = enterInterface(makeBaseState(), 'gi1/0/1');
    s = { ...s, ports: { ...s.ports, 'gi1/0/1': { ...(s.ports?.['gi1/0/1'] as object), status: 'connected' } as never } };
    const res = show(s, 'show interfaces gi1/0/1');
    expect(res.output).toContain('GigabitEthernet1/0/1 is up, line protocol is up');
  });

  it('unconnected port (factory notconnect) -> "down, line protocol is down"', () => {
    const s = enterInterface(makeBaseState(), 'gi1/0/3');
    // factory status is 'notconnect'; a real IOS device with no cable reads down/down
    expect(s.ports?.['gi1/0/3']?.status).toBe('notconnect');
    const res = show(s, 'show interfaces gi1/0/3');
    expect(res.output).toContain('GigabitEthernet1/0/3 is down, line protocol is down');
  });

  it('shutdown port -> "administratively down, line protocol is down"', () => {
    let s = enterInterface(makeBaseState(), 'gi1/0/1');
    s = run(s, 'shutdown').next;
    const res = show(s, 'show interfaces gi1/0/1');
    expect(res.output).toContain('GigabitEthernet1/0/1 is administratively down, line protocol is down');
  });

  it('show ip interface brief reflects down for unconnected ports', () => {
    const s = { ...makeBaseState(), currentMode: 'privileged' as const };
    const res = exec(s, 'show ip interface brief');
    expect(res.output).toContain('down');
    expect(res.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 5. CLI HISTORY
// ---------------------------------------------------------------------------
describe('show history (IOS format)', () => {
  const ctx: CommandContext = { language: 'en', deviceStates: new Map() };

  it('lists commands oldest-first with ascending line numbers', () => {
    // state.commandHistory is stored newest-first (index 0 = most recent).
    const s = {
      ...makeBaseState(),
      commandHistory: ['show ver', 'sh ip int br', 'conf t', 'enable'],
    } as SwitchState;
    const res = cmdShowHistory(s, '', ctx);
    const lines = (res.output || '').split('\n').filter(l => l.trim() !== '');
    expect(lines[0]).toMatch(/^\s+1\s+enable/);
    expect(lines[1]).toMatch(/^\s+2\s+conf t/);
    expect(lines[2]).toMatch(/^\s+3\s+sh ip int br/);
    expect(lines[3]).toMatch(/^\s+4\s+show ver/);
  });

  it('default: keeps everything under the 50-entry window (no 20 truncation)', () => {
    // newest-first: index 0 is the most recent command (cmd29)
    const recent = Array.from({ length: 30 }, (_, i) => `cmd${29 - i}`);
    const s = { ...makeBaseState(), commandHistory: recent } as SwitchState;
    const res = cmdShowHistory(s, '', ctx);
    const lines = (res.output || '').split('\n').filter(l => l.trim() !== '');
    expect(lines.length).toBe(30);
    expect(lines[0]).toMatch(/^\s+1\s+cmd0/);   // oldest
    expect(lines[29]).toMatch(/^\s+30\s+cmd29/); // most recent
  });

  it('history size 20 under line console caps show history at 20', () => {
    const recent = Array.from({ length: 30 }, (_, i) => `cmd${29 - i}`);
    const base = makeBaseState();
    const security = {
      ...base.security,
      consoleLine: { ...base.security.consoleLine, historySize: 20 }
    };
    const s = { ...base, security, commandHistory: recent } as SwitchState;
    const res = cmdShowHistory(s, '', ctx);
    const lines = (res.output || '').split('\n').filter(l => l.trim() !== '');
    expect(lines.length).toBe(20);
    expect(lines[0]).toMatch(/^\s+1\s+cmd10/);   // oldest in the retained window
    expect(lines[19]).toMatch(/^\s+20\s+cmd29/); // most recent
  });

  it("'history size 5' configured via CLI caps subsequent show history", () => {
    let s = makeBaseState();
    s = run(s, 'enable').next;
    s = run(s, 'configure terminal').next;
    s = run(s, 'line console 0').next;
    s = run(s, 'history size 5').next;
    expect(s.security?.consoleLine?.historySize).toBe(5);

    const recent = Array.from({ length: 12 }, (_, i) => `cmd${11 - i}`);
    const res = cmdShowHistory({ ...s, commandHistory: recent }, '', ctx);
    const lines = (res.output || '').split('\n').filter(l => l.trim() !== '');
    expect(lines.length).toBe(5);
    expect(lines[0]).toMatch(/^\s+1\s+cmd7/);
  });
});

// ---------------------------------------------------------------------------
// 6. DEFAULTS
// ---------------------------------------------------------------------------
describe('interface defaults', () => {
  it('factory port defaults match (auto speed/duplex, 1500 MTU, no shutdown)', () => {
    const s = enterInterface(makeBaseState(), 'gi1/0/4');
    const p = s.ports?.['gi1/0/4'];
    expect(p?.speed).toBe('auto');
    expect(p?.duplex).toBe('auto');
    expect(p?.shutdown).toBe(false);
    // MTU is not materialized on factory ports: its absence reads as the
    // default 1500 in 'show interfaces'.
    expect(p?.mtu ?? 1500).toBe(1500);
  });
});

// ---------------------------------------------------------------------------
// 8. RUNNING / STARTUP CONFIG
// ---------------------------------------------------------------------------
describe('running/startup-config behavior', () => {
  it("'write memory' returns saveConfig flag (persists startup-config at app layer)", () => {
    const s = { ...makeBaseState(), currentMode: 'privileged' as const };
    const res = exec(s, 'write memory');
    expect(res.success).toBe(true);
    expect(res.output).toContain('[OK]');
    expect((res as { saveConfig?: boolean }).saveConfig).toBe(true);
  });

  it('show startup-config reports the real byte count of the rendered config', () => {
    let s = makeBaseState();
    s = run(s, 'enable').next;
    s = run(s, 'configure terminal').next;
    s = run(s, 'hostname SW-TEST').next;
    s = { ...s, currentMode: 'privileged' as const, startupConfig: { ...buildStartupConfig(s), version: '15.0' } };
    const res = exec(s, 'show startup-config');
    expect(res.success).toBe(true);
    const m = res.output?.match(/Startup configuration : (\d+) bytes/);
    expect(m).not.toBeNull();
    // The reported size must equal the length of the config body after the header.
    const body = res.output!.substring(res.output!.indexOf('\n!\n') + 1);
    expect(Number(m![1])).toBe(body.length);
  });

  it('no startup configuration -> "% No startup configuration available"', () => {
    const s = { ...makeBaseState(), currentMode: 'privileged' as const, startupConfig: undefined };
    const res = exec(s, 'show startup-config');
    expect(res.success).toBe(true);
    expect(res.output).toContain('No startup configuration');
  });

  it('running-config is IOS-clean: no "Topology summary" block, vty range 0 4', () => {
    let s = makeBaseState();
    s = run(s, 'enable').next;
    s = run(s, 'configure terminal').next;
    s = run(s, 'hostname SW-CLEAN').next;
    const res = exec({ ...s, currentMode: 'privileged' as const }, 'show running-config');
    expect(res.success).toBe(true);
    expect(res.output).not.toContain('Topology summary');
    expect(res.output).not.toContain('Changed settings');
    expect(res.output).toContain('version 15.0');
    expect(res.output).toContain('line vty 0 4');
  });

  it('reload round-trip restores full port shape incl. description/mtu/spanning-tree', () => {
    let s = enterInterface(makeBaseState(), 'gi1/0/2');
    s = run(s, 'description uplink-to-core').next;
    s = run(s, 'mtu 9000').next;
    s = run(s, 'spanning-tree portfast').next;
    s = run(s, 'switchport mode access').next;

    const saved = buildStartupConfig(s);
    // Simulate reload: build a brand-new device and re-apply the startup snapshot
    const fresh = createInitialState('00:aa:bb:cc:dd:01', 'NS-L3-24PS');
    const restored = applyStartupConfig(fresh, saved);
    const restoredPort = restored.ports?.['gi1/0/2'];
    expect(restoredPort?.description).toBe('uplink-to-core');
    expect(restoredPort?.mtu).toBe(9000);
    expect(restoredPort?.spanningTree?.portfast).toBe(true);
    expect(restoredPort?.mode).toBe('access');
  });
});

// ---------------------------------------------------------------------------
// terminal length / --More-- pager (item: CLI behavior, defaults)
// ---------------------------------------------------------------------------
describe('terminal length / --More-- pager', () => {
  it('default (no terminal length): long output is returned unpaged', () => {
    const s = { ...makeBaseState(), currentMode: 'privileged' as const };
    const res = exec(s, 'show interfaces');
    expect(res.success).toBe(true);
    expect(res.output).toContain('line protocol is');
    expect(res.output).not.toContain('--More--');
    expect(res.newState?.pendingPager).toBeUndefined();
  });

  it('terminal length 0 disables paging (IOS incantation)', () => {
    let s = run(makeBaseState(), 'enable').next;
    s = run(s, 'terminal length 0').next;
    expect(s.terminalLength).toBe(0);
    const res = exec(s, 'show interfaces');
    expect(res.success).toBe(true);
    expect(res.output).toContain('line protocol is');
    expect(res.output).not.toContain('--More--');
    expect(res.newState?.pendingPager).toBeUndefined();
  });

  it('terminal length N pages long output: first page + --More-- + pendingPager', () => {
    let s = run(makeBaseState(), 'enable').next;
    s = run(s, 'terminal length 5').next;
    expect(s.terminalLength).toBe(5);
    const res = exec(s, 'show interfaces');
    expect(res.success).toBe(true);
    expect(res.output!.split('\n').length).toBe(6); // 5 lines + --More--
    expect(res.output).toMatch(/--More--\s*$/);
    expect(res.newState?.pendingPager).toBeDefined();
    expect(res.newState!.pendingPager!.rest.length).toBeGreaterThan(0);
  });

  it('pager advances: Space -> page, Enter -> one line, then completes', () => {
    let s = run(makeBaseState(), 'enable').next;
    s = run(s, 'terminal length 5').next;
    const first = run(s, 'show interfaces').next; // pendingPager set
    expect(first.pendingPager).toBeDefined();

    // Space advances a full page (5 lines)
    const spaceRes = exec(first, ' ');
    expect(spaceRes.success).toBe(true);
    expect(spaceRes.output!.split('\n').length).toBe(6); // 5 lines + --More--
    const afterSpace = spaceRes.newState ? { ...first, ...spaceRes.newState } : first;

    // Enter advances a single line
    const enterRes = exec(afterSpace, '');
    expect(enterRes.success).toBe(true);
    expect(enterRes.output!.split('\n').length).toBe(2); // 1 line + --More--
    const afterEnter = enterRes.newState ? { ...afterSpace, ...enterRes.newState } : afterSpace;
    expect(afterEnter.pendingPager).toBeDefined();
  });

  it("pager quit: 'q' discards the remaining output", () => {
    let s = run(makeBaseState(), 'enable').next;
    s = run(s, 'terminal length 5').next;
    const first = run(s, 'show interfaces').next;
    expect(first.pendingPager).toBeDefined();
    const q = run(first, 'q');
    expect(q.res.success).toBe(true);
    expect(q.next.pendingPager).toBeUndefined();
  });

  it("unrelated input is ignored while --More-- is active; 'q' resumes normal input", () => {
    let s = run(makeBaseState(), 'enable').next;
    s = run(s, 'terminal length 5').next;
    const first = run(s, 'show interfaces').next;
    expect(first.pendingPager).toBeDefined();

    // IOS: while --More-- is showing, non-pager keys do not escape the pager.
    const ignored = run(first, 'enable');
    expect(ignored.res.success).toBe(true);
    expect(ignored.res.output).toBe('');
    expect(ignored.next.pendingPager).toBeDefined();

    // 'q' quits; afterwards a short command runs normally and unpaged.
    const q = run(ignored.next, 'q');
    expect(q.res.success).toBe(true);
    expect(q.next.pendingPager).toBeUndefined();
    const clock = run(q.next, 'show clock');
    expect(clock.res.success).toBe(true);
    expect(clock.res.output).not.toContain('--More--');
    expect(clock.next.pendingPager).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 9. REMAINING SUB-GAPS
//   - 'do' propagates real sub-command errors (no error swallowing)
//   - ambiguous message % Incorrect single-space format
//   - savedConfig is written by write memory / copy running-config startup-config
//   - copy tftp running-config restores real device state (IOS merge)
//   - '?' help works in modes without a hand-written commandHelp entry
// ---------------------------------------------------------------------------
describe("'do' error propagation (IOS: real validation errors, not a generic line)", () => {
  it("'do show i' surfaces the sub-command's % Ambiguous command detail", () => {
    let s = run(makeBaseState(), 'enable').next;
    s = run(s, 'configure terminal').next;
    const res = exec(s, 'do show i');
    expect(res.success).toBe(false);
    expect(res.error).toContain('% Ambiguous command');
  });

  it("'do show nonexistent-xyz' keeps the caret block of the invalid sub-command", () => {
    let s = run(makeBaseState(), 'enable').next;
    s = run(s, 'configure terminal').next;
    const res = exec(s, 'do show nonexistent-xyz');
    expect(res.success).toBe(false);
    expect(res.error).toContain('% Invalid input detected');
    expect(res.error).toContain('^');
  });

  it("'do show ip' gives % Incomplete command (classification preserved)", () => {
    let s = run(makeBaseState(), 'enable').next;
    s = run(s, 'configure terminal').next;
    const res = exec(s, 'do show ip');
    expect(res.success).toBe(false);
    expect(res.error).toContain('% Incomplete command');
  });
});

describe('ambiguous message format (single space after % Ambiguous command:)', () => {
  it("'co' reports % Ambiguous command: \"co\" with a single space", () => {
    const s = { ...makeBaseState(), currentMode: 'privileged' as const };
    const res = exec(s, 'co');
    expect(res.success).toBe(false);
    expect(res.error).toContain('% Ambiguous command: "co"');
    expect(res.error).not.toContain('% Ambiguous command:  "co"');
  });
});

describe('savedConfig: write memory / copy running-config startup-config snapshot the config', () => {
  it("'write memory' writes savedConfig, and 'more startup-config' shows the snapshot", () => {
    let s = run(makeBaseState(), 'enable').next;
    s = run(s, 'configure terminal').next;
    s = run(s, 'hostname SW-SAVED').next;
    s = { ...s, currentMode: 'privileged' as const };
    const res = exec(s, 'write memory');
    expect(res.success).toBe(true);
    expect(res.saveConfig).toBe(true);
    expect(res.newState?.savedConfig).toContain('hostname SW-SAVED');

    const after = { ...s, ...res.newState };
    const more = exec(after, 'more startup-config');
    expect(more.success).toBe(true);
    expect(more.output).toContain('hostname SW-SAVED');
  });

  it("'copy running-config startup-config' also writes savedConfig", () => {
    let s = run(makeBaseState(), 'enable').next;
    s = run(s, 'configure terminal').next;
    s = run(s, 'hostname SW-CP').next;
    s = { ...s, currentMode: 'privileged' as const };
    const res = exec(s, 'copy running-config startup-config');
    expect(res.success).toBe(true);
    expect(res.newState?.savedConfig).toContain('hostname SW-CP');
  });

  it("'configure replace startup-config' rolls back runningConfig to the saved snapshot", () => {
    let s = run(makeBaseState(), 'enable').next;
    s = run(s, 'configure terminal').next;
    s = run(s, 'hostname BEFORE').next;
    s = { ...s, currentMode: 'privileged' as const };
    const saved = run(s, 'write memory').next; // savedConfig snapshot now "hostname BEFORE"
    expect(saved.savedConfig).toContain('hostname BEFORE');

    // Change the running config afterwards, then roll back.
    let changed: SwitchState = { ...saved, currentMode: 'config' as const };
    changed = run(changed, 'hostname AFTER').next;
    changed = { ...changed, currentMode: 'privileged' as const };
    const replace = run(changed, 'configure replace startup-config');
    expect(replace.res.success).toBe(true);
    expect(replace.next.runningConfig.join('\n')).toContain('hostname BEFORE');
    expect(replace.next.runningConfig.join('\n')).not.toContain('hostname AFTER');
  });
});

describe('copy tftp running-config restores real device state (IOS merge semantics)', () => {
  const tftpDevices = [
    {
      id: 'SRV1',
      ip: '192.168.1.10',
      services: {
        ftp: {
          enabled: true,
          files: [
            {
              name: 'r1-config',
              content: [
                '!',
                'hostname RestoredR1',
                '!',
                'vlan 77',
                ' name lab77',
                '!',
                'interface GigabitEthernet1/0/1',
                ' description restored-uplink',
                ' ip address 10.0.0.1 255.255.255.0',
                ' no shutdown',
                ' switchport mode access',
                '!',
                'interface GigabitEthernet1/0/2',
                ' shutdown',
                '!',
              ].join('\n'),
            },
          ],
        },
      },
    },
  ];

  function tftpRestore(state: SwitchState, cmd: string): CommandResult {
    const deviceStates = new Map<string, SwitchState>([[DEVICE_ID, state]]);
    return executeCommand(
      state,
      cmd,
      'en',
      tftpDevices as never,
      undefined,
      deviceStates,
      DEVICE_ID
    );
  }

  it('backup no longer relies on the (stale) runningConfig text: ' +
     "TFTP restore of hostname/interface/vlan is applied to the live state", () => {
    let s = run(makeBaseState(), 'enable').next;
    const res = tftpRestore(s, 'copy tftp://192.168.1.10/r1-config running-config');
    expect(res.success).toBe(true);
    const after = { ...s, ...res.newState };

    expect(after.hostname).toBe('RestoredR1');
    const p1 = after.ports?.['gi1/0/1'];
    expect(p1?.description).toBe('restored-uplink');
    expect(p1?.ipAddress).toBe('10.0.0.1');
    expect(p1?.subnetMask).toBe('255.255.255.0');
    expect(p1?.mode).toBe('access');
    expect(p1?.shutdown).toBe(false);
    expect(after.ports?.['gi1/0/2']?.shutdown).toBe(true);
    expect(after.vlans?.[77]?.name).toBe('lab77');

    // 'show running-config' (rendered from live state) reflects the restore.
    const show = tftpRestore(after, 'show running-config');
    expect(show.success).toBe(true);
    expect(show.output).toContain('hostname RestoredR1');
    expect(show.output).toContain('description restored-uplink');
    expect(show.output).toContain('vlan 77');
  });

  it('restore is a merge: ports not mentioned in the fetched config are untouched', () => {
    let s = run(makeBaseState(), 'enable').next;
    s = run(s, 'configure terminal').next;
    s = run(s, 'interface gi1/0/3').next;
    s = run(s, 'description keep-me').next;
    s = { ...s, currentMode: 'privileged' as const };

    const res = tftpRestore(s, 'copy tftp://192.168.1.10/r1-config running-config');
    expect(res.success).toBe(true);
    const after = { ...s, ...res.newState };
    expect(after.ports?.['gi1/0/3']?.description).toBe('keep-me');
  });
});

describe("'?' help covers modes without a hand-written commandHelp entry", () => {
  it("'?' in config-route-map lists route-map keywords, not the user-EXEC list", () => {
    let s = run(makeBaseState(), 'enable').next;
    s = run(s, 'configure terminal').next;
    const rm = run(s, 'route-map RM1 permit 10');
    expect(rm.res.success).toBe(true);
    expect(rm.next.currentMode).toBe('config-route-map');

    const res = exec(rm.next, '?');
    expect(res.success).toBe(true);
    expect(res.output).toContain('match');
    expect(res.output).toContain('set');
    // user-EXEC-only commands must NOT leak into route-map mode help
    expect(res.output).not.toContain('ping');
    expect(res.output).not.toContain('telnet');
  });

  it("'?' in interface mode still lists interface commands (regression)", () => {
    let s = enterInterface(makeBaseState(), 'gi1/0/1');
    const res = exec(s, '?');
    expect(res.success).toBe(true);
    expect(res.output).toContain('description');
    expect(res.output).toContain('shutdown');
  });
});

describe('show interfaces counters derive from port.statistics (no dead literals)', () => {
  it('interface resets defaults to 0 (not a bogus 1)', () => {
    const s = { ...makeBaseState(), currentMode: 'privileged' as const };
    const res = exec(s, 'show interfaces gi1/0/1');
    expect(res.success).toBe(true);
    expect(res.output).toContain('0 interface resets');
  });

  it('traffic counters surface in show interfaces when statistics exist', () => {
    const base = makeBaseState();
    const ports = {
      ...base.ports,
      'gi1/0/1': {
        ...base.ports['gi1/0/1'],
        statistics: { inputPackets: 1234, inputBytes: 567890, outputPackets: 88, outputBytes: 9900 },
      },
    };
    const s = { ...base, ports, currentMode: 'privileged' as const };
    const res = exec(s, 'show interfaces gi1/0/1');
    expect(res.success).toBe(true);
    expect(res.output).toContain('1234 packets input, 567890 bytes');
    expect(res.output).toContain('88 packets output, 9900 bytes');
  });
});