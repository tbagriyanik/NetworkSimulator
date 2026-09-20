import { describe, it, expect } from 'vitest';
import { commandPatterns, parseCommand, validateCommand } from '@/lib/network/parser';
import { commandHandlers } from '@/lib/network/executor';
import { modePatterns } from '@/lib/network/parser/modePatterns';
import { routingPatterns } from '@/lib/network/parser/routingPatterns';
import { interfacePatterns } from '@/lib/network/parser/interfacePatterns';
import { lineVlanPatterns } from '@/lib/network/parser/lineVlanPatterns';
import { showPatterns } from '@/lib/network/parser/showPatterns';
import { systemPatterns } from '@/lib/network/parser/systemPatterns';
import {
  createInitialState,
  createInitialRouterState,
} from '@/lib/network/initialState';
import type { SwitchState, CommandMode } from '@/lib/network/types';
import type { CommandPattern } from '@/lib/network/parser/commandPatterns.types';

/**
 * Cross-module pattern collisions: the six parser maps are merged with an ES
 * object spread (`parser.ts`), so a key that exists in more than one module
 * silently overrides the earlier definition. These collisions are pinned here
 * so an accidental new collision fails CI instead of silently shadowing a
 * command.
 */
describe('Parser module pattern overlaps', () => {
  const maps = {
    modePatterns,
    routingPatterns,
    interfacePatterns,
    lineVlanPatterns,
    showPatterns,
    systemPatterns,
  };

  const seen = new Map<string, string[]>();
  for (const [file, map] of Object.entries(maps)) {
    for (const key of Object.keys(map)) {
      seen.set(key, [...(seen.get(key) ?? []), file]);
    }
  }
  const duplicates = [...seen.entries()]
    .filter(([, files]) => files.length > 1)
    .map(([key, files]) => ({ key, files: files.sort() }))
    .sort((a, b) => a.key.localeCompare(b.key));

  it('intentional duplicate keys are pinned and documented (later spread wins)', () => {
    const expectedKeys = [
      'name',
      'no ip helper-address',
      'no router eigrp',
      'router eigrp',
      'show ip eigrp neighbors',
    ];
    expect(duplicates.map((d) => d.key)).toEqual(expectedKeys);
  });

  it('every merged duplicate key still resolves to an actual command handler', () => {
    for (const d of duplicates) {
      expect(commandHandlers[d.key], `merged handler for "${d.key}"`).toBeDefined();
    }
  });
});

/**
 * Parse-time reachability of zero-argument commands.
 *
 * Every pattern with `minArgs === 0` represents a complete command when typed
 * bare, so it must validate to a command (not "invalid input") from a device
 * fixture that supports its capability, in one of its declared modes.
 *
 * Two allowed exceptions keep the test honest about Cisco-style prefix
 * nesting without permitting silent regressions:
 *
 *  1. FIXTURE_GAP — the fixture used cannot satisfy the pattern (e.g. the
 *     "protocol" tree only has a generic kind of device), so it reports
 *     invalid/unknown. Each entry is a documented pre-existing limitation.
 *  2. SHADOWED_BENIGN — an EARLIER pattern already handles the exact bare
 *     key with the same intended behaviour (parent regex swallows the more
 *     specific key); the dedicated key is unreachable but the command works.
 *     Each entry carries the pattern that wins.
 *
 * Anything not listed here — including a previously shadowed command that
 * suddenly starts falling through or a new metadata regression — fails CI.
 */
describe('Parse-time reachability of zero-argument commands', () => {
  const ROUTER_MAC = '00:50:00:00:00:01';
  const SW_MAC = '00:11:22:33:44:01';

  function withMode(state: SwitchState, mode: CommandMode, iface?: string): SwitchState {
    const next: SwitchState = { ...state, currentMode: mode };
    if (iface) next.currentInterface = iface;
    return next;
  }

  // Firewall profile: any device whose inferred type resolves to firewall.
  function firewallState(mode: CommandMode): SwitchState {
    const state = withMode(createInitialRouterState(ROUTER_MAC), mode, mode === 'interface' ? 'gi0/0' : undefined);
    state.deviceType = 'firewall';
    return state;
  }

  function stateFor(pattern: CommandPattern, mode: CommandMode): SwitchState {
    if (pattern.capability === 'firewall') return firewallState(mode);
    if (mode === 'interface' || mode === 'config-if-range') {
      // L3 switch exposes switching + routing and a switchport interface, so
      // both router- and switch-level interface commands pass the device check.
      const state = withMode(
        createInitialState(SW_MAC, 'NS-L3-24PS'),
        mode,
        'gi1/0/1',
      );
      return state;
    }
    return withMode(createInitialRouterState(ROUTER_MAC), mode);
  }

  /**
   * Documented wins by an EARLIER (parent) pattern. The parent handler already
   * reproduces the command's behaviour, so the child key is unreachable but
   * the command itself works. Format: `key [mode] -> parent-key`.
   */
  const SHADOWED_BENIGN = new Set<string>([
    'line console [config] -> line',
    'line aux [config] -> line',
    'no debug all [privileged] -> no debug',
    'show interface trunk [user] -> show interfaces trunk',
    'show interfaces backup [privileged] -> show interfaces',
    'show ip arp inspection [privileged] -> show ip arp',
    'show mac address-table static [privileged] -> show mac address-table',
    'show vlan [user] -> show vlan brief',
    'show vtp password [privileged] -> show vtp status',
    'spanning-tree bpduguard enable [interface] -> spanning-tree bpduguard',
    'spanning-tree bpduguard disable [interface] -> spanning-tree bpduguard',
  ]);

  /**
   * Patterns that still fail validation under their best-fit fixture. Fixing
   * these means either tightening `minArgs`/`maxArgs` to what the regex
   * actually requires, or choosing a more precise fixture. New entries here
   * are a regression signal, not a normal way to add commands.
   */
  const FIXTURE_GAP = new Set<string>([]);

  it('every minArgs:0 pattern validates to a command from a capability-fit fixture', () => {
    const failures: string[] = [];
    for (const [key, pattern] of Object.entries(commandPatterns)) {
      if (pattern.minArgs > 0) continue;
      const mode = pattern.modes[0] as CommandMode;
      const state = stateFor(pattern, mode);
      const parsed = parseCommand(key, mode, state);
      if (!parsed) {
        failures.push(`${key} [${mode}] -> parseCommand returned null`);
        continue;
      }
      const validation = validateCommand(parsed, mode, state);
      if (!validation.valid) {
        const tag = `${key} [${mode}] -> invalid: ${validation.error}`.replace(/\s+/g, ' ');
        if (!FIXTURE_GAP.has(tag)) failures.push(tag);
        continue;
      }
      if (validation.matchedPattern !== key) {
        const tag = `${key} [${mode}] -> ${validation.matchedPattern}`;
        if (!SHADOWED_BENIGN.has(tag)) {
          failures.push(`${key} [${mode}] -> shadowed by "${validation.matchedPattern}"`);
        }
      }
    }
    expect(failures).toEqual([]);
  });

  it('L2/L3 state fixtures expose the ports used by interface-mode reachability', () => {
    for (const model of ['NS-L2-24TT-L', 'NS-L3-24PS'] as const) {
      const state = createInitialState('00:11:22:33:44:02', model);
      const ids = Object.keys(state.ports);
      expect(ids, `${model} has some ports`).not.toHaveLength(0);
    }
  });
});

/**
 * The interface pattern source files are merged in a fixed order
 * (base -> services -> firewall -> port) inside `interfacePatterns.ts`.
 * A command defined in more than one source is silently decided by the LAST
 * spread. Historically `interfaceServicesPatterns` and
 * `interfaceFirewallPatterns` duplicated 65 identical blocks (the firewall
 * copy always won, so the services copy was dead code). The duplicates were
 * removed; this guard prevents the overlap from coming back.
 */
describe('Interface pattern source disjointness', () => {
  it('interfaceServicesPatterns and interfaceFirewallPatterns share no keys', async () => {
    const { interfaceServicesPatterns } = await import('@/lib/network/parser/interfaceServicesPatterns');
    const { interfaceFirewallPatterns } = await import('@/lib/network/parser/interfaceFirewallPatterns');
    const overlap = Object.keys(interfaceServicesPatterns).filter((k) => k in interfaceFirewallPatterns);
    expect(overlap).toEqual([]);
  });
});