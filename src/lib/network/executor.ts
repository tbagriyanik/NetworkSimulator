// Network Command Executor (refactored with handler map)
import { SwitchState, CommandResult } from './types';
import { useAppStore } from '../store/appStore';
import { parseCommand, validateCommand } from './parser';
import { getDeviceCapabilities } from './capabilities';
import { applyPipeFilterOutput as applyPipeFilterOutputExternal, processCommandResult as processCommandResultExternal } from './executorResultUtils';
import { getSmartHint as getSmartHintExternal } from './executorHints';
import { ensureDeviceStatesMap } from './networkUtils';
import { CLI_ERRORS, cliModeError } from './core/cliErrors';
import { buildRunningConfig } from './core/configBuilder';
import type { CanvasDevice, CanvasConnection, DeviceType } from '@/components/network/networkTopology.types';

// Import modular components
import { getPrompt } from './executorPrompt';
import { getInlineHelp, getEstimatedSuggestions } from './executorInlineHelp';
import {
  handleConsoleConnect,
  handleTelnetConnect,
  handleSshConnect,
  handleConfigSourceInput,
  handlePasswordInput,
  handleFtpSessionCommand,
  handleMailSessionCommand
} from './executorSessionHelpers';

// Import command handlers from modular files
import { systemHandlers } from './core/systemCommands';
import { showHandlers } from './core/showCommands';
import { interfaceHandlers } from './core/interfaceCommands';
import { globalConfigHandlers } from './core/globalConfigCommands';
import { routerConfigHandlers } from './core/routerConfigCommands';
import { lineHandlers } from './core/lineCommands';
import { privilegedHandlers } from './core/privilegedCommands';
import { dhcpConfigHandlers } from './core/dhcpConfigCommands';
import { firewallHandlers } from './core/firewallCommands';
import { wirelessHandlers } from './core/wirelessCommands';

// --- Command handler types & context ---
import { CommandContext, CommandHandler } from './core/commandTypes';

// --- Core executor ---
export function executeCommand(
  state: SwitchState,
  input: string,
  language: 'tr' | 'en' = 'tr',
  devices?: CanvasDevice[],
  connections?: CanvasConnection[],
  deviceStates?: Map<string, SwitchState>,
  sourceDeviceId?: string,
  skipConfirm = false
): CommandResult {
  if (input === '__CANCEL__') {
    // Cancellation token - handled by useDeviceManager
    return { success: false, error: '% Command cancelled' };
  }

  if (input === '__CONSOLE_CONNECT__') {
    return handleConsoleConnect(state, language);
  }

  // Special reload control tokens from Terminal to avoid normal parsing
  if (input === '__RELOAD_CONFIRM__' || input === '__RELOAD_CANCEL__') {
    // No longer used - reload is immediate
    return { success: false, error: CLI_ERRORS.unknown };
  }

  if (input === '__TELNET_CONNECT__') {
    return handleTelnetConnect(state, language);
  }

  if (input.startsWith('__SSH_CONNECT__')) {
    const sshUser = input.includes(':') ? input.split(':').slice(1).join(':').trim() : '';
    return handleSshConnect(state, language, sshUser || undefined);
  }

  if (state.awaitingPassword) {
    if (input === '__PASSWORD_CANCELLED__') {
      // Password dialog was cancelled (ESC, back, outside click)
      return {
        success: false,
        error: language === 'tr' ? '% Erişim reddedildi' : '% Access denied',
        newState: {
          awaitingPassword: false,
          passwordContext: undefined,
          consoleAuthenticated: false,
          telnetAuthenticated: false
        }
      };
    }
    return handlePasswordInput(state, input, language);
  }

  if (state.awaitingConfigSource) {
    if (input === '__CONFIG_SOURCE_CANCEL__') {
      return {
        success: false,
        error: language === 'tr' ? '% Yapılandırma iptal edildi' : '% Configuration cancelled',
        newState: {
          awaitingConfigSource: false
        }
      };
    }
    return handleConfigSourceInput(state, input, language);
  }

  if (state.ftpSession) {
    return handleFtpSessionCommand(state, input, language, { devices, connections, deviceStates, sourceDeviceId });
  }

  if (state.mailSession) {
    return handleMailSessionCommand(state, input, language, { devices, connections, deviceStates, sourceDeviceId });
  }

  let cmdToProcess = input.trim();
  let pipeFilter: { type: 'include' | 'exclude' | 'begin' | 'section'; query: string } | null = null;

  // Unified pipe filter extraction
  // Support shortcuts: i (include), ex (exclude), b (begin), s (section)
  const pipeMatch = cmdToProcess.match(/^(.*?)\s*\|\s*(include|i|exclude|ex|begin|b|section|s)\s+(.+)$/i);
  if (pipeMatch) {
    cmdToProcess = pipeMatch[1].trim();
    const typeStr = pipeMatch[2].toLowerCase();
    let filterType: 'include' | 'exclude' | 'begin' | 'section' = 'include';

    if (typeStr.startsWith('i')) filterType = 'include';
    else if (typeStr.startsWith('ex')) filterType = 'exclude';
    else if (typeStr.startsWith('b')) filterType = 'begin';
    else if (typeStr.startsWith('s')) filterType = 'section';

    pipeFilter = {
      type: filterType,
      query: pipeMatch[3].trim(),
    };
  }

  // Special handling for enable command when no password is set
  // Direct console access (no remote session) can bypass this check
  // Remote session = telnet or SSH connection (has telnetAuthenticated flag)
  if (cmdToProcess.toLowerCase() === 'enable') {
    const isRemoteSession = state.telnetAuthenticated || state.consoleAuthenticated;
    if (isRemoteSession) {
      const hasEnablePassword = !!(state.security?.enableSecret || state.security?.enablePassword);
      if (!hasEnablePassword) {
        return {
          success: false,
          error: language === 'tr' ? '% Erişim reddedildi' : '% Access denied'
        };
      }
    }
  }

  const isHelpRequest = (cmdToProcess.endsWith('?') && cmdToProcess.length > 0) ||
    cmdToProcess.toLowerCase().trim() === 'help' ||
    cmdToProcess.toLowerCase().trim().endsWith(' help');

  if (isHelpRequest) {
    let partialInput = '';
    if (cmdToProcess.endsWith('?')) {
      partialInput = cmdToProcess.slice(0, -1);
    } else if (cmdToProcess.toLowerCase().trim().endsWith(' help')) {
      const idx = cmdToProcess.toLowerCase().trim().lastIndexOf(' help');
      partialInput = cmdToProcess.trim().substring(0, idx).trim();
    }
    const prompt = getPrompt(state);
    let helpOutput = getInlineHelp(state.currentMode, partialInput, prompt, state);

    // Add smart hint to help output if it's a general help request
    if (partialInput === '') {
      // In Exam mode, we don't show any smart hints or educational notes.
      const helpLevel = useAppStore.getState().helpLevel;
      if (helpLevel !== 'exam') {
        helpOutput += getSmartHintExternal(state, language);
      }
    }

    return {
      success: true,
      output: helpOutput
    };
  }

  const parsed = parseCommand(cmdToProcess, state.currentMode, state);

  if (!parsed) {
    return { success: true, output: '' };
  }

  const validation = validateCommand(parsed, state.currentMode, state);
  if (!validation.valid) {
    return processCommandResultExternal({
      success: false,
      error: validation.error || 'Unknown error'
    }, cmdToProcess, state.currentMode, state, language, getEstimatedSuggestions);
  }

  const commandName = validation.matchedPattern;
  if (!commandName) {
    return processCommandResultExternal({
      success: false,
      error: CLI_ERRORS.unknown
    }, cmdToProcess, state.currentMode, state, language, getEstimatedSuggestions);
  }

  const ctx: CommandContext = {
    language,
    devices,
    connections,
    deviceStates: ensureDeviceStatesMap(deviceStates),
    sourceDeviceId,
    skipConfirm,
  };

  const inferredDeviceType = state.deviceType === 'switch'
    ? (state.switchLayer === 'L3' ? 'switchL3' : 'switchL2')
    : (state.deviceType || (state.switchLayer === 'FW' ? 'firewall' : state.switchLayer === 'L3' ? 'switchL3' : 'switchL2'));
  const capabilities = getDeviceCapabilities({ type: inferredDeviceType as DeviceType } as Pick<CanvasDevice, 'type'>, state.switchModel);

  const requiresSwitching = [
    'vlan', 'no vlan', 'switchport', 'spanning-tree', 'vtp', 'show vlan',
    'show mac address-table', 'show spanning-tree', 'show port-security',
    'show interface trunk', 'show interfaces trunk', 'show etherchannel',
    'show storm-control', 'show udld'
  ];
  const requiresRouting = [
    'ip route', 'no ip route', 'router rip', 'router ospf', 'router eigrp',
    'ipv6 route', 'no ipv6 route', 'ipv6 router', 'show ip route', 'show ipv6 route',
    'show ip protocols', 'show ip ospf', 'show ip ospf neighbor', 'show ip ospf database', 'show ip ospf interface',
    'show ip eigrp', 'show ip eigrp neighbors'
  ];
  const requiresFirewall = [
    'access-group', 'object network', 'object-group', 'nat', 'same-security-traffic'
  ];

  const needsSwitching = requiresSwitching.some(prefix => commandName === prefix || commandName.startsWith(`${prefix} `));
  const needsRouting = requiresRouting.some(prefix => commandName === prefix || commandName.startsWith(`${prefix} `));
  const needsFirewall = requiresFirewall.some(prefix => commandName === prefix || commandName.startsWith(`${prefix} `));

  const isFirewall = state.deviceType === 'firewall' || state.switchLayer === 'FW' || (state.version?.modelName || '').includes('NS-FW');
  const isL3Switch = state.switchModel === 'NS-L3-24PS' ||
    (state.switchModel && (state.switchModel.includes('NS-L3') || state.switchModel.includes('NS-R'))) ||
    state.deviceType === 'switchL3' ||
    state.switchLayer === 'L3';
  const isL2Switch = !isL3Switch && (
    state.switchModel === 'NS-L2-24TT-L' ||
    (state.switchModel && state.switchModel.includes('NS-L2')) ||
    state.deviceType === 'switch' ||
    state.deviceType === 'switchL2' ||
    state.switchLayer === 'L2' ||
    capabilities.switching
  );
  const isRouter = state.deviceType === 'router' || (!isFirewall && !isL2Switch && !isL3Switch && capabilities.routing);
  const isWLC = state.deviceType === 'wlc' || state.switchModel === 'NS-WLC-2504';

  const l3OnlyCommands = [
    'show ip route', 'show ipv6 route', 'show ip protocols', 'show ip ospf', 'show ip ospf neighbor', 'show ip ospf database', 'show ip ospf interface',
    'show ip eigrp', 'show ip eigrp neighbors',
    'show mls qos', 'show sdm prefer'
  ];
  const switchOnlyCommands = [
    'show vlan', 'show vlan brief', 'show spanning-tree', 'show port-security', 'show mac address-table',
    'show interfaces trunk', 'show interface trunk', 'show vtp status', 'show etherchannel', 'show udld',
    'show storm-control', 'show errdisable recovery', 'show errdisable detect'
  ];
  const firewallOnlyCommands = ['access-group', 'nat', 'object network', 'object-group'];

  const isL3OnlyCmd = l3OnlyCommands.some(prefix => commandName === prefix || commandName.startsWith(`${prefix} `));
  const isSwitchOnlyCmd = switchOnlyCommands.some(prefix => commandName === prefix || commandName.startsWith(`${prefix} `));
  const isFirewallOnlyCmd = firewallOnlyCommands.some(prefix => commandName === prefix || commandName.startsWith(`${prefix} `));
  const wlcOnlyCommands = [
    'show ap summary', 'show ap config', 'show ap join statistics',
    'show ap join stats', 'ap', 'auth-mac', 'rf-channel', 'dot11 5ghz'
  ];
  const isWlcOnlyCmd = wlcOnlyCommands.some(prefix => commandName === prefix || commandName.startsWith(`${prefix} `));

  const deviceLabel = isFirewall
    ? 'firewall'
    : isWLC
      ? 'Wireless LAN Controller'
      : isRouter
        ? 'router'
        : isL3Switch
          ? 'Layer 3 switch'
          : 'Layer 2 switch';

  if ((needsSwitching && !capabilities.switching) ||
    (needsRouting && !capabilities.routing) ||
    (needsFirewall && !capabilities.firewall) ||
    (isL3OnlyCmd && !(isL3Switch || isRouter || isWLC)) ||
    (isSwitchOnlyCmd && !(isL2Switch || isL3Switch)) ||
    (isFirewallOnlyCmd && !isFirewall) ||
    (isWlcOnlyCmd && !isWLC)) {
    return processCommandResultExternal({
      success: false,
      error: `% Invalid input detected at '^' marker.\n${commandName} is not supported on this ${deviceLabel}.`
    }, cmdToProcess, state.currentMode, state, language, getEstimatedSuggestions);
  }

  const commandInput = parsed.resolvedInput || parsed.rawInput;
  let handler = commandHandlers[commandName];

  // Intent-first routing for SHOW family to reduce raw string-prefix coupling.
  if (!handler && parsed.intent?.family === 'show') {
    const lowered = commandInput.toLowerCase();
    const showKey = Object.keys(showHandlers).find(key => lowered === key || lowered.startsWith(`${key} `));
    if (showKey) handler = showHandlers[showKey];
  }

  if (!handler) {
    return { success: true };
  }
  let result = handler(state, commandInput, ctx);
  if (pipeFilter && result.success && typeof result.output === 'string') {
    result = { ...result, output: applyPipeFilterOutputExternal(result.output, pipeFilter) };
  }
  return processCommandResultExternal(result, cmdToProcess, state.currentMode, state, language, getEstimatedSuggestions);
}

// --- Placeholder command handlers map ---
// Combine all handler maps into one unified command registry
const commandHandlers: Record<string, CommandHandler> = {
  // System commands
  ...systemHandlers,

  // Firewall commands
  ...firewallHandlers,

  // Show commands
  ...showHandlers,

  // Interface commands
  ...interfaceHandlers,

  // Privileged commands (for "do" commands in config mode)
  ...privilegedHandlers,

  // Global configuration commands - AFTER privileged so these take precedence for overlapping commands
  ...Object.fromEntries(Object.entries(globalConfigHandlers).filter(([k]) =>
    k !== 'no spanning-tree' && k !== 'spanning-tree portfast' && k !== 'ip default-gateway' && k !== 'no ip default-gateway'
      && k !== 'set dscp' && k !== 'set cos'
  )),

  // Router configuration commands (OSPF/RIP)
  ...routerConfigHandlers,

  // Line commands
  ...lineHandlers,

  // Wireless commands
  ...wirelessHandlers,

  // DHCP pool sub-commands (exclude generic 'network'/'no network' to avoid shadowing router versions)
  ...Object.fromEntries(Object.entries(dhcpConfigHandlers).filter(([k]) => k !== 'network' && k !== 'no network')),
  'network': (state, input, ctx) => {
    if (state.currentMode === 'dhcp-config') return dhcpConfigHandlers['network'](state, input, ctx);
    if (state.currentMode === 'router-config') return routerConfigHandlers['network'](state, input, ctx);
    return { success: false, error: cliModeError() };
  },
  'no network': (state, input, ctx) => {
    if (state.currentMode === 'dhcp-config') return dhcpConfigHandlers['no network'](state, input, ctx);
    if (state.currentMode === 'router-config') return routerConfigHandlers['no network'](state, input, ctx);
    return { success: false, error: cliModeError() };
  },
  // Interface/global dual-mode dispatchers
  'no spanning-tree': (state, input, ctx) => {
    if (state.currentMode === 'interface' || state.currentMode === 'config-if-range') return interfaceHandlers['no spanning-tree'](state, input, ctx);
    return globalConfigHandlers['no spanning-tree'](state, input, ctx);
  },
  'spanning-tree portfast': (state, input, ctx) => {
    if (state.currentMode === 'interface' || state.currentMode === 'config-if-range') return interfaceHandlers['spanning-tree portfast'](state, input, ctx);
    return globalConfigHandlers['spanning-tree portfast'](state, input, ctx);
  },
  'ip default-gateway': (state, input, ctx) => {
    if (state.currentMode === 'interface' || state.currentMode === 'config-if-range') return interfaceHandlers['ip default-gateway'](state, input, ctx);
    return globalConfigHandlers['ip default-gateway'](state, input, ctx);
  },
  'no ip default-gateway': (state, input, ctx) => {
    if (state.currentMode === 'interface' || state.currentMode === 'config-if-range') return interfaceHandlers['no ip default-gateway'](state, input, ctx);
    return globalConfigHandlers['no ip default-gateway'](state, input, ctx);
  },
  'set dscp': (state, input, ctx) => {
    if (state.currentMode === 'interface' || state.currentMode === 'config-if-range') return interfaceHandlers['set dscp'](state, input, ctx);
    return globalConfigHandlers['set dscp'](state, input, ctx);
  },
  'set cos': (state, input, ctx) => {
    if (state.currentMode === 'interface' || state.currentMode === 'config-if-range') return interfaceHandlers['set cos']?.(state, input, ctx) ?? { success: false, error: cliModeError() };
    return globalConfigHandlers['set cos'](state, input, ctx);
  },
  'match': (state, input, _ctx) => {
    if (state.currentMode !== 'config-route-map' || !state.currentRouteMap) return { success: false, error: cliModeError() };
    const [mapName, seqStr] = state.currentRouteMap.split(':');
    const seq = parseInt(seqStr, 10);
    const existing = { ...state.routeMaps };
    const clauses = [...(existing[mapName] || [])];
    const clauseIdx = clauses.findIndex(c => c.seq === seq);
    if (clauseIdx === -1) return { success: false, error: '% Route-map clause not found' };

    const matchRules = { ...clauses[clauseIdx].matchRules };
    const matchPrefixList = input.match(/^match\s+(?:ip|ipv6)\s+address\s+prefix-list\s+(\S+)/i);
    const matchAcl = input.match(/^match\s+ip\s+address\s+(\S+)/i);
    const matchIntf = input.match(/^match\s+interface\s+(\S+)/i);

    if (matchPrefixList) {
      matchRules['prefixList'] = matchPrefixList[1];
    } else if (matchAcl) {
      matchRules['acl'] = matchAcl[1];
    } else if (matchIntf) {
      matchRules['interface'] = matchIntf[1];
    } else {
      return { success: false, error: '% Invalid match command' };
    }

    clauses[clauseIdx] = { ...clauses[clauseIdx], matchRules };
    existing[mapName] = clauses;
    const newState = { routeMaps: existing, currentMode: state.currentMode, currentRouteMap: state.currentRouteMap };
    return { success: true, output: '', newState: { ...newState, runningConfig: buildRunningConfig({ ...state, ...newState }) } };
  },
  'set': (state, input, _ctx) => {
    if (state.currentMode !== 'config-route-map' || !state.currentRouteMap) return { success: false, error: cliModeError() };
    const [mapName, seqStr] = state.currentRouteMap.split(':');
    const seq = parseInt(seqStr, 10);
    const existing = { ...state.routeMaps };
    const clauses = [...(existing[mapName] || [])];
    const clauseIdx = clauses.findIndex(c => c.seq === seq);
    if (clauseIdx === -1) return { success: false, error: '% Route-map clause not found' };

    const setRules = { ...clauses[clauseIdx].setRules };
    const setMetric = input.match(/^set\s+metric\s+(\d+)/i);
    const setNextHop = input.match(/^set\s+(?:ip|ipv6)\s+next-hop\s+(\S+)/i);
    const setLocalPref = input.match(/^set\s+local-preference\s+(\d+)/i);

    if (setMetric) {
      setRules['metric'] = parseInt(setMetric[1], 10);
    } else if (setNextHop) {
      setRules['nextHop'] = setNextHop[1];
    } else if (setLocalPref) {
      setRules['localPreference'] = parseInt(setLocalPref[1], 10);
    } else {
      return { success: false, error: '% Invalid set command' };
    }

    clauses[clauseIdx] = { ...clauses[clauseIdx], setRules };
    existing[mapName] = clauses;
    const newState = { routeMaps: existing, currentMode: state.currentMode, currentRouteMap: state.currentRouteMap };
    return { success: true, output: '', newState: { ...newState, runningConfig: buildRunningConfig({ ...state, ...newState }) } };
  }
};

// Re-export getPrompt and commandHelp for backward compatibility
export { getPrompt } from './executorPrompt';
export { commandHelp, commandDescriptions } from './executorCommandHelp';

