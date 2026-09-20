import type { SwitchState, Route, Port } from './types';
import type { GuidedStep } from './guidedMode.types';
import type { CanvasConnection, CanvasDevice } from '@/components/network/NetworkTopology/types/networkTopology.types';

export const checkStepCompletion = (
  step: GuidedStep,
  context: {
    lastCommand?: string;
    lastOutput?: string;
    deviceAccessed?: 'switch' | 'router' | 'pc' | null;
    deviceAccessedId?: string | null;
    deviceState?: SwitchState;
    deviceStates?: Map<string, SwitchState>;
    topologyConnections?: CanvasConnection[];
    topologyDevices?: CanvasDevice[];
  }
): boolean => {
  switch (step.checkType) {
    case 'deviceAccess':
      if (step.checkParams?.deviceType && context.deviceAccessed !== step.checkParams.deviceType) return false;
      if (step.checkParams?.targetDeviceId) {
        return context.deviceAccessedId === step.checkParams.targetDeviceId;
      }
      return true;

    case 'command': {
      if (!step.checkParams?.commandPattern || !context.lastCommand) return false;

      // Do NOT complete step if command execution resulted in an error output
      if (context.lastOutput) {
        const out = context.lastOutput.toLowerCase().trim();
        if (
          out.includes('% invalid') ||
          out.includes('% ambiguous') ||
          out.includes('% incomplete') ||
          out.includes('% unknown') ||
          out.includes('% bad') ||
          out.includes('% error') ||
          out.includes('invalid input') ||
          out.includes('ambiguous command') ||
          out.includes('incomplete command') ||
          out.includes('unknown command') ||
          out.includes('not supported') ||
          out.includes('tahmini öneriler') ||
          out.includes('did you mean')
        ) {
          return false;
        }
      }

      if (step.checkParams.targetDeviceId && context.deviceAccessedId !== step.checkParams.targetDeviceId) {
        return false;
      }

      const patterns = step.checkParams.commandPattern.split('|');
      const lastCmd = context.lastCommand.toLowerCase().trim();
      return patterns.some(pattern => {
        const pat = pattern.toLowerCase().trim();
        return lastCmd.startsWith(pat) || lastCmd.includes(pat);
      });
    }

    case 'connection': {
      if (!context.topologyConnections || !context.topologyDevices) return false;
      const conns = context.topologyConnections;

      if (step.checkParams?.connections) {
        const requiredConnections = step.checkParams.connections;
        return requiredConnections.every(required => {
          return conns.some((conn: CanvasConnection) => {
            if (!conn.active) return false;
            if (step.checkParams?.cableType) {
              const cableTypeMatch = conn.cableType === step.checkParams.cableType;
              if (!cableTypeMatch) return false;
            }
            const normalMatch = conn.sourceDeviceId === required.sourceDevice &&
              (!required.sourcePort || conn.sourcePort === required.sourcePort) &&
              conn.targetDeviceId === required.targetDevice &&
              (!required.targetPort || conn.targetPort === required.targetPort);

            const reversedMatch = conn.sourceDeviceId === required.targetDevice &&
              (!required.targetPort || conn.sourcePort === required.targetPort) &&
              conn.targetDeviceId === required.sourceDevice &&
              (!required.sourcePort || conn.targetPort === required.sourcePort);

            return normalMatch || reversedMatch;
          });
        });
      }

      if (step.checkParams?.sourceDevice && step.checkParams?.targetDevice) {
        const params = step.checkParams;
        return conns.some((conn: CanvasConnection) => {
          if (!conn.active) return false;
          if (params.cableType) {
            const cableTypeMatch = conn.cableType === params.cableType;
            if (!cableTypeMatch) return false;
          }
          const normalMatch = conn.sourceDeviceId === params.sourceDevice &&
            (!params.sourcePort || conn.sourcePort === params.sourcePort) &&
            conn.targetDeviceId === params.targetDevice &&
            (!params.targetPort || conn.targetPort === params.targetPort);

          const reversedMatch = conn.sourceDeviceId === params.targetDevice &&
            (!params.targetPort || conn.sourcePort === params.targetPort) &&
            conn.targetDeviceId === params.sourceDevice &&
            (!params.sourcePort || conn.targetPort === params.sourcePort);

          return normalMatch || reversedMatch;
        });
      }

      return context.topologyConnections.some((conn: CanvasConnection) => conn.active === true);
    }

    case 'config': {
      if (!step.checkParams?.configKey) return false;

      let targetState = context.deviceState;
      if (step.checkParams.targetDeviceId && context.deviceStates) {
        targetState = context.deviceStates.get(step.checkParams.targetDeviceId) || targetState;
      }

      if (!targetState && !step.checkParams.configKey.startsWith('pc.') &&
        !step.checkParams.configKey.startsWith('iot.') &&
        !step.checkParams.configKey.startsWith('firewall.') &&
        !step.checkParams.configKey.startsWith('services.')) {
        return false;
      }

      const configKey = step.checkParams.configKey;
      const configValue = step.checkParams.configValue;

      if (configKey === 'hostname') return targetState?.hostname === configValue;
      if (configKey === 'domainName') return targetState?.domainName === configValue;
      if (configKey === 'dnsServer') return targetState?.dnsServer === configValue;
      if (configKey === 'defaultGateway') return targetState?.defaultGateway === configValue;
      if (configKey === 'domainLookup') return targetState?.domainLookup === configValue;
      if (configKey === 'sshVersion') return Number(targetState?.sshVersion) === Number(configValue);
      if (configKey === 'sshTimeout') return Number(targetState?.sshTimeout) === Number(configValue);
      if (configKey === 'vtpMode') return targetState?.vtpMode === configValue;
      if (configKey === 'vtpDomain') return targetState?.vtpDomain === configValue;
      if (configKey === 'mlsQosEnabled') return targetState?.mlsQosEnabled === configValue;
      if (configKey === 'dhcpSnoopingEnabled') return targetState?.dhcpSnoopingEnabled === configValue;
      if (configKey === 'cdpEnabled') return targetState?.cdpEnabled === configValue;
      if (configKey === 'spanningTreeMode') return targetState?.spanningTreeMode === configValue;
      if (configKey === 'spanningTreeEnabled') return targetState?.spanningTreeEnabled === configValue;
      if (configKey === 'spanningTreePortfastDefault') return targetState?.spanningTreePortfastDefault === configValue;
      if (configKey === 'arpInspectionEnabled') return targetState?.arpInspectionEnabled === configValue;
      if (configKey === 'ipRouting') return targetState?.ipRouting === configValue;
      if (configKey === 'autoSummary') return targetState?.autoSummary === configValue;
      if (configKey === 'routerId') return targetState?.routerId === configValue;
      if (configKey === 'ospfRouterId') return targetState?.ospfRouterId === configValue;
      if (configKey === 'eigrpAs') return targetState?.eigrpAs === configValue;
      if (configKey === 'ntpServers') {
        if (Array.isArray(targetState?.ntpServers) && Array.isArray(configValue)) {
          const ntpServers = targetState.ntpServers as string[];
          return configValue.every(s => ntpServers.includes(s));
        }
        return false;
      }

      if (configKey.startsWith('interfaces.') || configKey.startsWith('ports.')) {
        const parts = configKey.split('.');
        const portId = parts[1];
        const property = parts[parts.length - 1];
        const port = targetState?.ports?.[portId] ||
          targetState?.ports?.[portId.toLowerCase()] ||
          targetState?.ports?.[portId.toUpperCase()];

        if (port) {
          if (property === 'ip' || property === 'ipAddress') return port.ipAddress === configValue;
          if (property === 'shutdown') return port.shutdown === configValue;
          if (property === 'vlan') return Number(port.vlan) === Number(configValue) || Number(port.accessVlan) === Number(configValue);
          if (property === 'mode') return port.mode === configValue;
          if (property === 'enabled' && configKey.includes('portSecurity')) return port.portSecurity?.enabled === configValue;

          if (property === 'accessGroupIn') {
            const hasAnyAclIn = Object.values(targetState?.ports || {}).some((p: Port) => !!p.accessGroupIn);
            const hasAnyAclRule = targetState?.accessLists && Object.keys(targetState.accessLists).length > 0;
            return !!port.accessGroupIn || hasAnyAclIn || !!hasAnyAclRule;
          }
          if (property === 'accessGroupOut') return port.accessGroupOut === configValue;
          if (property === 'nativeVlan') return Number(port.nativeVlan) === Number(configValue);
          if (property === 'allowedVlans') {
            if (Array.isArray(port.allowedVlans) && Array.isArray(configValue)) {
              return configValue.every(v => (port.allowedVlans as number[]).includes(Number(v)));
            }
            return String(port.allowedVlans) === String(configValue);
          }
          if (property === 'description') return port.description === configValue;
          if (property === 'speed') return port.speed === configValue;
          if (property === 'duplex') return port.duplex === configValue;
          if (property === 'nonegotiate') return port.nonegotiate === configValue;
          if (property === 'voiceVlan') return Number(port.voiceVlan) === Number(configValue);

          if (property === 'ssid' && port.wifi) return port.wifi.ssid === configValue;
          if (property === 'password' && port.wifi) return port.wifi.password === configValue;
          if (property === 'security' && port.wifi) return port.wifi.security === configValue;
        }
      }

      if (configKey.startsWith('vlans.')) {
        const vlanId = configKey.split('.')[1];
        const vlan = targetState?.vlans?.[Number(vlanId)];
        const property = configKey.split('.').pop();
        if (property === 'name') return vlan?.name === configValue;
        return !!vlan;
      }

      if (configKey === 'staticRoutes') {
        const routes = targetState?.staticRoutes || [];
        if (typeof configValue === 'object' && configValue !== null && 'destination' in configValue) {
          return routes.some((r: Route) => r.destination === configValue.destination);
        }
      }

      if (configKey.startsWith('dhcpPools.')) {
        const parts = configKey.split('.');
        const poolName = parts[1];
        const pools = targetState?.dhcpPools || {};
        const pool = pools[poolName] ||
          Object.entries(pools).find(([k]) => k.toLowerCase() === poolName.toLowerCase())?.[1] ||
          Object.values(pools)[0];
        if (!pool) return false;

        if (parts.length === 2) {
          if (typeof configValue === 'object' && configValue !== null) {
            return Object.entries(configValue).every(([k, v]) => pool[k as keyof typeof pool] === v);
          }
          return true;
        } else if (parts.length === 3) {
          const property = parts[2];
          if (property === 'defaultGateway' || property === 'defaultRouter') {
            const p = pool as Record<string, unknown>;
            return (p.defaultRouter || p.defaultGateway) === configValue;
          }
          return pool[property as keyof typeof pool] === configValue;
        }
        return false;
      }

      if (configKey === 'routingProtocol') return targetState?.routingProtocol === configValue;

      if (configKey.startsWith('services.')) {
        const parts = configKey.split('.');
        const serviceName = parts[1];
        const property = parts[2];
        const service = ((targetState?.services as Record<string, unknown>)?.[serviceName] ||
          (context.topologyDevices?.find((d: CanvasDevice) => d.id === step.checkParams?.targetDeviceId)?.services as Record<string, unknown>)?.[serviceName]) as { enabled?: boolean; records?: { domain: string; address: string }[] } | undefined;
        if (!service) return false;
        if (property === 'enabled') return service.enabled === configValue;
        if (property === 'records' && Array.isArray(configValue)) {
          return configValue.every(req =>
            service.records?.some((r: { domain: string; address: string }) => r.domain === req.domain && r.address === req.address)
          );
        }
        if ((service as Record<string, unknown>)[property] !== undefined) {
          return (service as Record<string, unknown>)[property] === configValue;
        }
      }

      if (configKey.startsWith('pc.')) {
        const parts = configKey.split('.');
        const pcId = parts[1];
        const pcDevice = context.topologyDevices?.find((d: CanvasDevice) => d.id === pcId);
        if (!pcDevice) return false;

        if (parts.length === 3) {
          const property = parts[2];
          if (property === 'ip') {
            const ipMatch = pcDevice.ip === configValue;
            if (step.checkParams.subnetMask) return ipMatch && pcDevice.subnet === step.checkParams.subnetMask;
            return ipMatch;
          }
          if (property === 'gateway') return pcDevice.gateway === configValue;
          if (property === 'dns') return pcDevice.dns === configValue;
          if (property === 'subnet') return pcDevice.subnet === configValue;
          if (property === 'ipv6') return pcDevice.ipv6 === configValue;
          if (property === 'ipConfigMode') return pcDevice.ipConfigMode === configValue;
        } else if (parts.length === 4 && parts[2] === 'wifi') {
          const property = parts[3];
          if (property === 'ssid') return pcDevice.wifi?.ssid === configValue;
          if (property === 'password') return pcDevice.wifi?.password === configValue;
          if (property === 'security') return pcDevice.wifi?.security === configValue;
        }

        return pcDevice.ip === configValue;
      }

      if (configKey.startsWith('iot.')) {
        const parts = configKey.split('.');
        const iotId = parts[1];
        const property = parts[parts.length - 1];
        const iotDevice = context.topologyDevices?.find((d: CanvasDevice) => d.id === iotId);
        if (!iotDevice) return false;
        if (property === 'ssid') return iotDevice.wifi?.ssid === configValue;
        if (property === 'ip') return iotDevice.ip === configValue;
        if (property === 'sensorType') return iotDevice.iot?.sensorType === configValue;
        if (property === 'kind') return iotDevice.iot?.kind === configValue;
        if (property === 'value') return iotDevice.iot?.value === configValue;
        return false;
      }

      if (configKey.startsWith('firewall.')) {
        const fwId = configKey.split('.')[1];
        const fwDevice = context.topologyDevices?.find((d: CanvasDevice) => d.id === fwId);
        if (!fwDevice) return false;
        const property = configKey.split('.').pop();
        if (property === 'ip') {
          if (fwDevice.ip === configValue) return true;
          const fwState = context.deviceStates?.get(fwId);
          if (fwState?.ports) {
            return Object.values(fwState.ports).some((p: Port) => p.ipAddress === configValue);
          }
          return false;
        }
        return false;
      }

      return false;
    }

    case 'ping': {
      if (!context.lastCommand || !step.checkParams?.toIp) return false;
      if (step.checkParams.fromDevice && context.deviceAccessedId !== step.checkParams.fromDevice) {
        return false;
      }

      const cmd = context.lastCommand.toLowerCase().trim();
      const isPing = cmd.startsWith('ping') && cmd.includes(step.checkParams.toIp.toLowerCase());
      if (!isPing) return false;

      if (!context.lastOutput) return false;

      const out = context.lastOutput.toLowerCase();
      if (out.includes('timed out') || out.includes('100% loss') || out.includes('unreachable') || out.includes('100% kayıp') || out.includes('success rate is 0 percent')) {
        return false;
      }
      return true;
    }

    case 'deviceCount': {
      if (!context.topologyDevices || !step.checkParams?.deviceType) return false;
      const targetType = step.checkParams.deviceType;
      const minCount = step.checkParams.minCount || 1;

      const count = context.topologyDevices.filter(d => {
        if (targetType === 'switch') return d.type === 'switchL2' || d.type === 'switchL3';
        return d.type === targetType;
      }).length;

      return count >= minCount;
    }

    case 'faultResolved': {
      if (!step.checkParams?.configKey) return false;
      const dummyStep: GuidedStep = {
        ...step,
        checkType: 'config',
        checkParams: {
          ...step.checkParams,
        }
      };
      return checkStepCompletion(dummyStep, context);
    }

    case 'routingConverged': {
      if (!context.deviceStates) return false;
      const routers = Array.from(context.deviceStates.values()).filter(s =>
        s.deviceType === 'router' || s.switchLayer === 'L3'
      );
      if (routers.length < 2) return true;
      return routers.every(r => (r.dynamicRoutes?.length || 0) > 0);
    }

    case 'showOutputMatch': {
      if (!context.lastCommand || !step.checkParams?.showCommand || !step.checkParams?.matchPattern) return false;
      const lastCmd = context.lastCommand.toLowerCase().trim();
      const targetShow = step.checkParams.showCommand.toLowerCase().trim();
      const lastOut = context.lastOutput || '';
      if (lastCmd.startsWith(targetShow)) {
        const pattern = step.checkParams.matchPattern;
        return lastOut.includes(pattern);
      }
      return false;
    }

    case 'manual':
      return true;

    default:
      return false;
  }
};

export const getNextIncompleteStep = (steps: GuidedStep[]): GuidedStep | null => {
  return steps.find(s => !s.completed) || null;
};

export const getCompletedStepsCount = (steps: GuidedStep[]): number => {
  return steps.filter(s => s.completed).length;
};

export const getProgressPercentage = (steps: GuidedStep[]): number => {
  if (steps.length === 0) return 0;
  return Math.round((getCompletedStepsCount(steps) / steps.length) * 100);
};

