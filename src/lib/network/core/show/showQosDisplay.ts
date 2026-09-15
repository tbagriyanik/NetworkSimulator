import type { CommandContext } from '../commandTypes';
import type { SwitchState, CommandResult } from '../../types';

export function cmdShowMlsQos(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  const enabled = state.mlsQosEnabled ?? false;
  return { success: true, output: `\nQoS is ${enabled ? 'enabled' : 'disabled'}\n` };
}

export function cmdShowPolicyMap(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  const maps = state.qosPolicyMaps;
  if (!maps || Object.keys(maps).length === 0) return { success: true, output: '\n% No policy maps configured.\n' };
  let output = '';
  Object.entries(maps).forEach(([name, policy]) => {
    output += `Policy-map ${name}\n`;
    Object.entries(policy.classes || {}).forEach(([className, cls]) => {
      output += `  Class ${className}\n`;
      if (cls.setDscp) output += `    set dscp ${cls.setDscp}\n`;
      if (cls.setCos !== undefined) output += `    set cos ${cls.setCos}\n`;
      if (cls.policeRate !== undefined) output += `    police rate ${cls.policeRate}\n`;
      if (cls.bandwidthPercent !== undefined) output += `    bandwidth ${cls.bandwidthPercent}%\n`;
      if (cls.priority) output += '    priority\n';
    });
  });
  return { success: true, output };
}

export function cmdShowClassMap(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  const maps = state.qosClassMaps;
  if (!maps || Object.keys(maps).length === 0) return { success: true, output: '\n% No class maps configured.\n' };
  let output = '';
  Object.entries(maps).forEach(([name, cm]) => {
    output += `Class-map: ${name} (match-${cm.match})\n`;
  });
  return { success: true, output };
}

export function cmdShowPolicyMapInterface(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  const match = input.match(/show\s+policy-map\s+interface\s+(\S+)?/i);
  const interfaceName = match?.[1];

  let output = '';

  if (interfaceName) {
    const port = (state.ports || {})[interfaceName.toLowerCase()];
    if (!port) {
      return { success: false, error: `% Interface ${interfaceName} not found` };
    }

    if (!port.qos?.policyMap) {
      output += `\nInterface ${interfaceName}\n`;
      output += `  Service Policy output: not configured\n`;
      output += `  Service Policy input: not configured\n`;
    } else {
      output += `\nInterface ${interfaceName}\n`;
      output += `  Service Policy output: ${port.qos.policyMap}\n`;
      if (port.qos.enabled) {
        output += `    Class ${port.qos.policyMap}\n`;
        output += `      Output Queue: ${port.qos.egressQueue || 40}\n`;
        if (port.qos.shaping?.enabled) {
          output += `      Shaping rate: ${port.qos.shaping.rate} bps\n`;
        }
        if (port.qos.policing?.enabled) {
          output += `      Police rate: ${port.qos.policing.rate} bps\n`;
        }
      }
    }
  } else {
    output += '\nPolicy Map output\n';
    output += '  No configured policy maps\n';
  }

  output += '!\n';
  return { success: true, output };
}

export function cmdShowQosInterface(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  const match = input.match(/show\s+qos\s+interface\s+(\S+)?/i);
  const interfaceName = match?.[1];

  let output = '';

  if (interfaceName) {
    const port = (state.ports || {})[interfaceName.toLowerCase()];
    if (!port) {
      return { success: false, error: `% Interface ${interfaceName} not found` };
    }

    output += `\nInterface ${interfaceName}\n`;
    output += `QoS is ${port.qos?.enabled ? 'enabled' : 'disabled'}\n`;

    if (port.qos?.enabled) {
      output += `  Queue Strategy: FIFO\n`;
      output += `  Egress Queue Depth: ${port.qos.egressQueue || 40}\n`;
      output += `  Ingress Queue Depth: ${port.qos.ingressQueue || 75}\n`;

      if (port.qos.shaping?.enabled) {
        output += `  Traffic Shaping:\n`;
        output += `    Rate: ${port.qos.shaping.rate} bits/sec\n`;
      }

      if (port.qos.policing?.enabled) {
        output += `  Traffic Policing:\n`;
        output += `    Rate: ${port.qos.policing.rate} bits/sec\n`;
        output += `    Burst: ${port.qos.policing.burst} bytes\n`;
      }

      if (port.qos.priorityQueue?.enabled) {
        output += `  Priority Queue: enabled\n`;
        output += `    Limit: ${port.qos.priorityQueue.limit || 'unlimited'}\n`;
      }
    }
  } else {
    output += '\nInterface         QoS Status\n';
    output += '----------        ----------\n';
    Object.keys(state.ports || {}).forEach(portName => {
      const port = (state.ports || {})[portName];
      output += `${portName.padEnd(18)}${port.qos?.enabled ? 'enabled' : 'disabled'}\n`;
    });
  }

  output += '!\n';
  return { success: true, output };
}

export function cmdShowQueuingInterface(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  const match = input.match(/show\s+queuing\s+interface\s+(\S+)?/i);
  const interfaceName = match?.[1];

  let output = '';

  if (interfaceName) {
    const port = (state.ports || {})[interfaceName.toLowerCase()];
    if (!port) {
      return { success: false, error: `% Interface ${interfaceName} not found` };
    }

    output += `\nInterface ${interfaceName}\n`;
    output += `  Queueing Strategy: FIFO\n`;
    output += `  Output Queue: ${port.qos?.egressQueue || 40} (max threshold)\n`;
    output += `  Input Queue: ${port.qos?.ingressQueue || 75} (max threshold)\n`;

    const stats = port.statistics || {};
    output += `\nQueue Statistics:\n`;
    output += `  Enqueued: ${stats.outputPackets || 0} packets\n`;
    output += `  Dropped: ${stats.drops || 0} packets\n`;
    output += `  Overruns: ${stats.overruns || 0}\n`;

    if (port.qos?.priorityQueue?.enabled) {
      output += `\nPriority Queue:\n`;
      output += `  Status: enabled\n`;
      output += `  Limit: ${port.qos.priorityQueue.limit || 'unlimited'}\n`;
    }
  } else {
    output += '\nInterface         Queue Strategy  Threshold\n';
    output += '----------        --------------  ---------\n';
    Object.keys(state.ports || {}).forEach(portName => {
      const port = (state.ports || {})[portName];
      const threshold = port.qos?.egressQueue || 40;
      output += `${portName.padEnd(18)}FIFO             ${threshold}\n`;
    });
  }

  output += '!\n';
  return { success: true, output };
}
