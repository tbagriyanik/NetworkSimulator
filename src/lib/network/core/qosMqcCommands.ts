import type { CommandContext } from './commandTypes';
import type { SwitchState, CommandResult } from '../types';
import { cliModeError } from './cliErrors';

export function cmdClassMap(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  const m = input.match(/^class-map\s+(match-any|match-all)\s+(\S+)/i); if (!m) return { success: false, error: '% Invalid class-map syntax' };
  return { success: true, output: `Class-map ${m[2]} created`, newState: { qosClassMaps: { ...state.qosClassMaps, [m[2]]: { match: m[1].slice(6).toLowerCase() as 'all' | 'any', criteria: [] } } } };
}

export function cmdClass(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  const m = input.match(/^class\s+(\S+)/i); if (!m) return { success: false, error: '% Invalid class syntax' };
  const classMapName = m[1];
  if (!state.qosClassMaps?.[classMapName]) return { success: false, error: `% Class-map ${classMapName} not found` };
  if (!state.qosPolicyMaps || Object.keys(state.qosPolicyMaps).length === 0) return { success: false, error: '% Policy-map not configured' };
  const policyName = Object.keys(state.qosPolicyMaps)[0];
  const targetPolicy = state.qosPolicyMaps[policyName];
  return {
    success: true,
    output: `Class ${classMapName} added to policy`,
    newState: {
      qosPolicyMaps: {
        ...state.qosPolicyMaps,
        [policyName]: {
          classes: {
            ...targetPolicy?.classes,
            [classMapName]: { match: state.qosClassMaps[classMapName]?.match }
          }
        }
      }
    }
  };
}

export function cmdPolicyMap(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() }; const m = input.match(/^policy-map\s+(\S+)/i); if (!m) return { success: false, error: '% Invalid policy-map syntax' };
  return { success: true, output: `Policy-map ${m[1]} created`, newState: { qosPolicyMaps: { ...state.qosPolicyMaps, [m[1]]: { classes: {} } } } };
}

export function cmdSetDscp(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  const m = input.match(/^set\s+dscp\s+(\S+)$/i); if (!m) return { success: false, error: '% Invalid DSCP value' };
  if (!state.qosPolicyMaps) return { success: false, error: '% Policy-map not configured' };
  const policyName = Object.keys(state.qosPolicyMaps)[0];
  if (!policyName) return { success: false, error: '% No policy-map configured' };
  const className = Object.keys(state.qosPolicyMaps[policyName].classes)[0];
  if (!className) return { success: false, error: '% No class configured under policy' };
  return {
    success: true,
    output: `Set DSCP ${m[1]} on class ${className}`,
    newState: {
      qosPolicyMaps: {
        ...state.qosPolicyMaps,
        [policyName]: {
          classes: {
            ...state.qosPolicyMaps[policyName].classes,
            [className]: { ...state.qosPolicyMaps[policyName].classes[className], setDscp: m[1] }
          }
        }
      }
    }
  };
}

export function cmdSetCoS(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  const m = input.match(/^set\s+cos\s+(\d+)$/i); if (!m) return { success: false, error: '% Invalid COS value' };
  if (!state.qosPolicyMaps) return { success: false, error: '% Policy-map not configured' };
  const policyName = Object.keys(state.qosPolicyMaps)[0];
  if (!policyName) return { success: false, error: '% No policy-map configured' };
  const className = Object.keys(state.qosPolicyMaps[policyName].classes)[0];
  if (!className) return { success: false, error: '% No class configured under policy' };
  return {
    success: true,
    output: `Set COS ${m[1]} on class ${className}`,
    newState: {
      qosPolicyMaps: {
        ...state.qosPolicyMaps,
        [policyName]: {
          classes: {
            ...state.qosPolicyMaps[policyName].classes,
            [className]: { ...state.qosPolicyMaps[policyName].classes[className], setCos: parseInt(m[1], 10) }
          }
        }
      }
    }
  };
}

export function cmdPolice(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  const m = input.match(/^police\s+rate\s+(\d+)$/i); if (!m) return { success:false,error:'% Invalid police rate syntax. Use: police rate <bps>' };
  if (!state.qosPolicyMaps) return { success:false,error:'% Policy-map not configured' };
  const policyName = Object.keys(state.qosPolicyMaps)[0];
  if (!policyName) return { success:false,error:'% No policy-map configured' };
  const className = Object.keys(state.qosPolicyMaps[policyName].classes)[0];
  if (!className) return { success:false,error:'% No class configured under policy' };
  return {
    success:true,
    output:`Policed at ${m[1]} bps on class ${className}`,
    newState: {
      qosPolicyMaps: {
        ...state.qosPolicyMaps,
        [policyName]: {
          classes: {
            ...state.qosPolicyMaps[policyName].classes,
            [className]: { ...state.qosPolicyMaps[policyName].classes[className], policeRate: parseInt(m[1], 10) }
          }
        }
      }
    }
  };
}

export function cmdNoClassMap(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  const m = input.match(/^no\s+class-map\s+(\S+)$/i); if (!m) return { success:false,error:'% Invalid no class-map syntax' };
  const name = m[1];
  const existing = { ...state.qosClassMaps };
  delete existing[name];
  return { success:true, output:`Class-map ${name} removed`, newState:{ qosClassMaps: existing } };
}

export function cmdNoPolicyMap(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  const m = input.match(/^no\s+policy-map\s+(\S+)$/i); if (!m) return { success:false,error:'% Invalid no policy-map syntax' };
  const name = m[1];
  const existing = { ...state.qosPolicyMaps };
  delete existing[name];
  return { success:true, output:`Policy-map ${name} removed`, newState:{ qosPolicyMaps: existing } };
}
