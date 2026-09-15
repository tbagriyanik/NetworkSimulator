import type { CommandContext } from '../commandTypes';
import type { SwitchState, CommandResult } from '../../types';

export function cmdShowNtp(state: SwitchState, input: string, ctx: CommandContext): CommandResult {
  const servers = state.ntpServers || [];
  const masterStratum = state.ntpMasterStratum;
  if (servers.length === 0 && !masterStratum) {
    return { success: true, output: '\n% NTP is not enabled.\n' };
  }

  const isStatus = /status/i.test(input);
  const isAssociations = /associations/i.test(input);

  const referenceIp = servers[0];
  const matchedDevice = ctx.devices?.find((d) => d.ip === referenceIp);
  const isSync = matchedDevice !== undefined || servers.length > 0;

  if (isAssociations) {
    let output = '\n  address         ref clock       st   when   poll reach  delay  offset   disp\n';
    output += '*~' + referenceIp.padEnd(16) + '127.127.1.1     1     14     64  377     1.24   0.045   0.12\n';
    for (let i = 1; i < servers.length; i++) {
      const s = servers[i];
      output += ' +' + s.padEnd(16) + '127.127.1.1     2     28     64  377     2.10   0.112   0.24\n';
    }
    output += ' * master (synced), # master (unsynced), + selected, - candidate, ~ configured\n';
    return { success: true, output };
  }

  if (isStatus || input.trim() === 'show ntp') {
    if (masterStratum) {
      let output = '\nClock is synchronized, NTP master (stratum ' + masterStratum + ')\n';
      output += 'nominal freq is 250.0000 Hz, actual freq is 249.9998 Hz, precision is 2**18\n';
      output += 'reference time is LOCAL(0)\n';
      output += 'clock offset is 0.0000 msec, root delay is 0.00 msec\n';
      output += 'root dispersion is 0.00 msec, peer dispersion is 0.00 msec\n';
      output += 'loopfilter state is \'FREQ\' (Normal), drift is 0.00000000 s/s\n';
      output += 'system poll interval is 64 s\n';
      output += '\n  NTP servers configured as master (stratum ' + masterStratum + ')\n';
      return { success: true, output };
    }
    let output = '\nClock is synchronized, stratum 2, reference is ' + referenceIp + '\n';
    output += 'nominal freq is 250.0000 Hz, actual freq is 249.9998 Hz, precision is 2**18\n';
    output += 'reference time is E8D1A543.64D29810 (20:12:00.393 UTC Wed Sep 2 2026)\n';
    output += 'clock offset is 0.0450 msec, root delay is 1.24 msec\n';
    output += 'root dispersion is 11.23 msec, peer dispersion is 1.20 msec\n';
    output += 'loopfilter state is \'SPIK\' (Normal), drift is 0.00000123 s/s\n';
    output += 'system poll interval is 64 s, last update was 14 sec ago.\n';
    return { success: true, output };
  }

  let output = '\nClock is synchronized, stratum 2, reference is ' + referenceIp + '\n';
  output += ' actual frequency: 250.0000 Hz, precision: 2**18\n';
  output += ' reference time: ' + referenceIp + '\n';
  output += ' clock offset: 0.0450 msec, root delay: 1.24 msec\n';
  output += ' root dispersion: 11.23 msec, peer dispersion: 1.20 msec\n';
  output += ' loopfilter state: \'CTRL\' (Normal), drift: 0.00000000 s/s\n';
  output += ' system poll interval: 64 s, last update: 14 sec ago\n';
  output += `\n  NTP servers configured:\n\n`;

  for (const ip of servers) {
    const isReachable = ctx.devices?.find((d) => d.ip === ip) !== undefined || isSync;
    output += `  ${ip} ${isReachable ? '... reachable, syncing' : '... unreachable'}\n`;
  }

  output += '\n';
  return { success: true, output };
}
