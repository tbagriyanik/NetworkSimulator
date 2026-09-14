// Flexible NetFlow configuration commands (flow record / exporter / monitor)
import { SwitchState, CommandResult } from '../types';
import { CommandContext } from './commandTypes';
import { cliModeError } from './cliErrors';
import { buildRunningConfig } from './configBuilder';

export function cmdFlowRecord(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  const match = input.match(/^flow\s+record\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Invalid flow record command syntax' };
  const name = match[1];
  const flowRecords = {
    ...state.flowRecords,
    [name]: state.flowRecords?.[name] ?? { matchFields: [] as string[], collectFields: [] as string[] }
  };
  return {
    success: true,
    output: '',
    newState: { currentMode: 'config-flow-record', currentFlowRecordName: name, currentFlowExporterName: undefined, currentFlowMonitorName: undefined, flowRecords }
  };
}

export function cmdNoFlowRecord(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  const match = input.match(/^no\s+flow\s+record\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Invalid no flow record syntax' };
  const name = match[1];
  const flowRecords = { ...state.flowRecords };
  delete flowRecords[name];
  return { success: true, output: `Flow record ${name} removed`, newState: { flowRecords, currentFlowRecordName: undefined } };
}

export function cmdFlowExporter(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  const match = input.match(/^flow\s+exporter\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Invalid flow exporter command syntax' };
  const name = match[1];
  const flowExporters = {
    ...state.flowExporters,
    [name]: state.flowExporters?.[name] ?? { transportProtocol: 'udp' as const }
  };
  return {
    success: true,
    output: '',
    newState: { currentMode: 'config-flow-exporter', currentFlowExporterName: name, currentFlowRecordName: undefined, currentFlowMonitorName: undefined, flowExporters }
  };
}

export function cmdNoFlowExporter(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  const match = input.match(/^no\s+flow\s+exporter\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Invalid no flow exporter syntax' };
  const name = match[1];
  const flowExporters = { ...state.flowExporters };
  delete flowExporters[name];
  return { success: true, output: `Flow exporter ${name} removed`, newState: { flowExporters, currentFlowExporterName: undefined } };
}

export function cmdFlowMonitor(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  const match = input.match(/^flow\s+monitor\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Invalid flow monitor command syntax' };
  const name = match[1];
  const flowMonitors = {
    ...state.flowMonitors,
    [name]: state.flowMonitors?.[name] ?? { cacheTimeoutActive: 1800, cacheTimeoutInactive: 15 }
  };
  return {
    success: true,
    output: '',
    newState: { currentMode: 'config-flow-monitor', currentFlowMonitorName: name, currentFlowRecordName: undefined, currentFlowExporterName: undefined, flowMonitors }
  };
}

export function cmdNoFlowMonitor(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  const match = input.match(/^no\s+flow\s+monitor\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Invalid no flow monitor syntax' };
  const name = match[1];
  const flowMonitors = { ...state.flowMonitors };
  delete flowMonitors[name];
  return { success: true, output: `Flow monitor ${name} removed`, newState: { flowMonitors, currentFlowMonitorName: undefined } };
}

// ── Submode handlers ─────────────────────────────────────────────────────

function withConfig(state: SwitchState, patch: Partial<SwitchState>): CommandResult {
  const merged = { ...state, ...patch };
  return { success: true, output: '', newState: { ...patch, runningConfig: buildRunningConfig(merged) } };
}

export const flowSubmodeHandlers: Record<string, (state: SwitchState, input: string, ctx: CommandContext) => CommandResult> = {
  // ── flow record submode ──
  'match ipv4 source address': (state, _input, _ctx) => {
    if (state.currentMode !== 'config-flow-record' || !state.currentFlowRecordName) return { success: false, error: cliModeError() };
    const name = state.currentFlowRecordName;
    const rec = state.flowRecords?.[name] ?? { matchFields: [], collectFields: [] };
    const matchFields = rec.matchFields?.includes('match ipv4 source address') ? [...rec.matchFields] : [...(rec.matchFields || []), 'match ipv4 source address'];
    return withConfig(state, { flowRecords: { ...state.flowRecords, [name]: { ...rec, matchFields } } });
  },
  'match ipv4 destination address': (state, _input, _ctx) => {
    if (state.currentMode !== 'config-flow-record' || !state.currentFlowRecordName) return { success: false, error: cliModeError() };
    const name = state.currentFlowRecordName;
    const rec = state.flowRecords?.[name] ?? { matchFields: [], collectFields: [] };
    const matchFields = rec.matchFields?.includes('match ipv4 destination address') ? [...rec.matchFields] : [...(rec.matchFields || []), 'match ipv4 destination address'];
    return withConfig(state, { flowRecords: { ...state.flowRecords, [name]: { ...rec, matchFields } } });
  },
  'match ipv4 protocol': (state, _input, _ctx) => {
    if (state.currentMode !== 'config-flow-record' || !state.currentFlowRecordName) return { success: false, error: cliModeError() };
    const name = state.currentFlowRecordName;
    const rec = state.flowRecords?.[name] ?? { matchFields: [], collectFields: [] };
    const matchFields = rec.matchFields?.includes('match ipv4 protocol') ? [...rec.matchFields] : [...(rec.matchFields || []), 'match ipv4 protocol'];
    return withConfig(state, { flowRecords: { ...state.flowRecords, [name]: { ...rec, matchFields } } });
  },
  'match transport source-port': (state, _input, _ctx) => {
    if (state.currentMode !== 'config-flow-record' || !state.currentFlowRecordName) return { success: false, error: cliModeError() };
    const name = state.currentFlowRecordName;
    const rec = state.flowRecords?.[name] ?? { matchFields: [], collectFields: [] };
    const matchFields = rec.matchFields?.includes('match transport source-port') ? [...rec.matchFields] : [...(rec.matchFields || []), 'match transport source-port'];
    return withConfig(state, { flowRecords: { ...state.flowRecords, [name]: { ...rec, matchFields } } });
  },
  'match transport destination-port': (state, _input, _ctx) => {
    if (state.currentMode !== 'config-flow-record' || !state.currentFlowRecordName) return { success: false, error: cliModeError() };
    const name = state.currentFlowRecordName;
    const rec = state.flowRecords?.[name] ?? { matchFields: [], collectFields: [] };
    const matchFields = rec.matchFields?.includes('match transport destination-port') ? [...rec.matchFields] : [...(rec.matchFields || []), 'match transport destination-port'];
    return withConfig(state, { flowRecords: { ...state.flowRecords, [name]: { ...rec, matchFields } } });
  },
  'collect counter bytes': (state, _input, _ctx) => {
    if (state.currentMode !== 'config-flow-record' || !state.currentFlowRecordName) return { success: false, error: cliModeError() };
    const name = state.currentFlowRecordName;
    const rec = state.flowRecords?.[name] ?? { matchFields: [], collectFields: [] };
    const collectFields = rec.collectFields?.includes('collect counter bytes') ? [...rec.collectFields] : [...(rec.collectFields || []), 'collect counter bytes'];
    return withConfig(state, { flowRecords: { ...state.flowRecords, [name]: { ...rec, collectFields } } });
  },
  'collect counter packets': (state, _input, _ctx) => {
    if (state.currentMode !== 'config-flow-record' || !state.currentFlowRecordName) return { success: false, error: cliModeError() };
    const name = state.currentFlowRecordName;
    const rec = state.flowRecords?.[name] ?? { matchFields: [], collectFields: [] };
    const collectFields = rec.collectFields?.includes('collect counter packets') ? [...rec.collectFields] : [...(rec.collectFields || []), 'collect counter packets'];
    return withConfig(state, { flowRecords: { ...state.flowRecords, [name]: { ...rec, collectFields } } });
  },
  'collect counter flows': (state, _input, _ctx) => {
    if (state.currentMode !== 'config-flow-record' || !state.currentFlowRecordName) return { success: false, error: cliModeError() };
    const name = state.currentFlowRecordName;
    const rec = state.flowRecords?.[name] ?? { matchFields: [], collectFields: [] };
    const collectFields = rec.collectFields?.includes('collect counter flows') ? [...rec.collectFields] : [...(rec.collectFields || []), 'collect counter flows'];
    return withConfig(state, { flowRecords: { ...state.flowRecords, [name]: { ...rec, collectFields } } });
  },

  // ── flow exporter submode ──
  'destination': (state, input, _ctx) => {
    if (state.currentMode !== 'config-flow-exporter' || !state.currentFlowExporterName) return { success: false, error: cliModeError() };
    const m = input.match(/^destination\s+(\S+)$/i);
    if (!m) return { success: false, error: '% Invalid destination syntax' };
    const name = state.currentFlowExporterName;
    const exp = state.flowExporters?.[name] ?? { transportProtocol: 'udp' as const };
    return withConfig(state, { flowExporters: { ...state.flowExporters, [name]: { ...exp, destination: m[1] } } });
  },
  'transport udp': (state, input, _ctx) => {
    if (state.currentMode !== 'config-flow-exporter' || !state.currentFlowExporterName) return { success: false, error: cliModeError() };
    const m = input.match(/^transport\s+udp\s+(\d+)$/i);
    if (!m) return { success: false, error: '% Invalid transport syntax' };
    const name = state.currentFlowExporterName;
    const exp = state.flowExporters?.[name] ?? { transportProtocol: 'udp' as const };
    return withConfig(state, { flowExporters: { ...state.flowExporters, [name]: { ...exp, transportPort: parseInt(m[1], 10) } } });
  },
  'version 9': (state, input, _ctx) => {
    if (state.currentMode !== 'config-flow-exporter' || !state.currentFlowExporterName) return { success: false, error: cliModeError() };
    const m = input.match(/^version\s+(5|9)$/i);
    if (!m) return { success: false, error: '% Invalid version syntax' };
    const name = state.currentFlowExporterName;
    const exp = state.flowExporters?.[name] ?? { transportProtocol: 'udp' as const };
    return withConfig(state, { flowExporters: { ...state.flowExporters, [name]: { ...exp, version: parseInt(m[1], 10) } } });
  },
  'template data timeout': (state, input, _ctx) => {
    if (state.currentMode !== 'config-flow-exporter' || !state.currentFlowExporterName) return { success: false, error: cliModeError() };
    const m = input.match(/^template\s+data\s+timeout\s+(\d+)$/i);
    if (!m) return { success: false, error: '% Invalid template data timeout syntax' };
    const name = state.currentFlowExporterName;
    const exp = state.flowExporters?.[name] ?? { transportProtocol: 'udp' as const };
    return withConfig(state, { flowExporters: { ...state.flowExporters, [name]: { ...exp, templateDataTimeout: parseInt(m[1], 10) } } });
  },
  'source': (state, input, _ctx) => {
    if (state.currentMode !== 'config-flow-exporter' || !state.currentFlowExporterName) return { success: false, error: cliModeError() };
    const m = input.match(/^source\s+(\S+)$/i);
    if (!m) return { success: false, error: '% Invalid source syntax' };
    const name = state.currentFlowExporterName;
    const exp = state.flowExporters?.[name] ?? { transportProtocol: 'udp' as const };
    return withConfig(state, { flowExporters: { ...state.flowExporters, [name]: { ...exp, source: m[1] } } });
  },

  // ── flow monitor submode ──
  'exporter': (state, input, _ctx) => {
    if (state.currentMode !== 'config-flow-monitor' || !state.currentFlowMonitorName) return { success: false, error: cliModeError() };
    const m = input.match(/^exporter\s+(\S+)$/i);
    if (!m) return { success: false, error: '% Invalid exporter syntax' };
    const name = state.currentFlowMonitorName;
    const mon = state.flowMonitors?.[name] ?? { cacheTimeoutActive: 1800, cacheTimeoutInactive: 15 };
    return withConfig(state, { flowMonitors: { ...state.flowMonitors, [name]: { ...mon, exporter: m[1] } } });
  },
  'record': (state, input, _ctx) => {
    if (state.currentMode !== 'config-flow-monitor' || !state.currentFlowMonitorName) return { success: false, error: cliModeError() };
    const m = input.match(/^record\s+(\S+)$/i);
    if (!m) return { success: false, error: '% Invalid record syntax' };
    const name = state.currentFlowMonitorName;
    const mon = state.flowMonitors?.[name] ?? { cacheTimeoutActive: 1800, cacheTimeoutInactive: 15 };
    return withConfig(state, { flowMonitors: { ...state.flowMonitors, [name]: { ...mon, record: m[1] } } });
  },
  'cache timeout active': (state, input, _ctx) => {
    if (state.currentMode !== 'config-flow-monitor' || !state.currentFlowMonitorName) return { success: false, error: cliModeError() };
    const m = input.match(/^cache\s+timeout\s+active\s+(\d+)$/i);
    if (!m) return { success: false, error: '% Invalid cache timeout active syntax' };
    const name = state.currentFlowMonitorName;
    const mon = state.flowMonitors?.[name] ?? { cacheTimeoutActive: 1800, cacheTimeoutInactive: 15 };
    return withConfig(state, { flowMonitors: { ...state.flowMonitors, [name]: { ...mon, cacheTimeoutActive: parseInt(m[1], 10) } } });
  },
  'cache timeout inactive': (state, input, _ctx) => {
    if (state.currentMode !== 'config-flow-monitor' || !state.currentFlowMonitorName) return { success: false, error: cliModeError() };
    const m = input.match(/^cache\s+timeout\s+inactive\s+(\d+)$/i);
    if (!m) return { success: false, error: '% Invalid cache timeout inactive syntax' };
    const name = state.currentFlowMonitorName;
    const mon = state.flowMonitors?.[name] ?? { cacheTimeoutActive: 1800, cacheTimeoutInactive: 15 };
    return withConfig(state, { flowMonitors: { ...state.flowMonitors, [name]: { ...mon, cacheTimeoutInactive: parseInt(m[1], 10) } } });
  },
};