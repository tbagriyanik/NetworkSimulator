import type { CommandHandler } from './commandTypes';
import {
    cmdPing,
    cmdTelnet,
    cmdSsh,
    cmdTraceroute,
    cmdPingTcp,
    cmdPingUdp
} from './privilegedConnectivity';
import {
    cmdWriteMemory,
    cmdCopyRunningStartup,
    cmdCopyRunningFlash,
    cmdCopyFlashStartup,
    cmdEraseStartupConfig,
    cmdEraseNvram,
    cmdCopyTftp,
    cmdCopyStartupRunning,
    cmdDeleteVlanDat
} from './privilegedConfig';
import {
    cmdDebug,
    cmdUndebugAll,
    cmdUndebug
} from './privilegedDebug';
import {
    cmdClearArpCache,
    cmdClearIpv6Neighbors,
    cmdClearMacAddressTable,
    cmdClearCounters,
    cmdClearLine,
    cmdClearInterface,
    cmdClearIpOspfProcess,
    cmdClearIpBgp,
    cmdClearIpNatTranslation
} from './privilegedClear';
import {
    cmdReload,
    cmdClockSet,
    cmdTerminal,
    cmdHelp,
    cmdSetup,
    cmdTest,
    cmdMore,
    cmdDisconnect,
    cmdResume,
    cmdSuspend
} from './privilegedSystem';

// Privileged EXEC komutları (ping, telnet, write, copy, erase, reload, debug, vs.)

export const privilegedHandlers: Record<string, CommandHandler> = {
    'ping': cmdPing,
    'telnet': cmdTelnet,
    'ssh': cmdSsh,
    'traceroute': cmdTraceroute,
    'write memory': cmdWriteMemory,
    'copy running-config startup-config': cmdCopyRunningStartup,
    'copy running-config flash': cmdCopyRunningFlash,
    'copy flash startup-config': cmdCopyFlashStartup,
    'erase startup-config': cmdEraseStartupConfig,
    'erase nvram': cmdEraseNvram,
    'reload': cmdReload,
    'debug': cmdDebug,
    'undebug all': cmdUndebugAll,
    'delete flash:vlan.dat': cmdDeleteVlanDat,
    'setup': cmdSetup,
    'test': cmdTest,
    'more': cmdMore,
    'disconnect': cmdDisconnect,
    'resume': cmdResume,
    'suspend': cmdSuspend,
    'copy running-config tftp': cmdCopyTftp,
    'copy tftp running-config': cmdCopyTftp,
    'copy startup-config running-config': cmdCopyStartupRunning,
    'delete nvram': cmdEraseNvram,
    'clear line': cmdClearLine,
    'clear interface': cmdClearInterface,
    'clear ip ospf process': cmdClearIpOspfProcess,
    'terminal': cmdTerminal,
    'terminal length': cmdTerminal,
    'terminal width': cmdTerminal,
    'terminal monitor': cmdTerminal,
    'terminal no monitor': cmdTerminal,
    'clear arp-cache': cmdClearArpCache,
    'clear ipv6 neighbors': cmdClearIpv6Neighbors,
    'clear mac address-table': cmdClearMacAddressTable,
    'clear counters': cmdClearCounters,
    'undebug': cmdUndebug,
    'clock set': cmdClockSet,
    'no debug all': cmdUndebugAll,
    'help': cmdHelp,
    'clear ip bgp': cmdClearIpBgp,
    'clear ip nat translation': cmdClearIpNatTranslation,
    'write erase': cmdEraseStartupConfig,
    'ping tcp': cmdPingTcp,
    'ping udp': cmdPingUdp,
};
