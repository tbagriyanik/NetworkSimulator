import { SwitchState } from '../types';
import { encryptType7Password, encryptMd5Password } from '../crypto';

const TIMESTAMP = '2026-02-26 22:00:00';

export function buildHeaderServicesConfig(state: SwitchState, lines: string[]): void {
  const modelName = (state.version?.modelName || '').toLowerCase();
  const isRouterLike = state.deviceType === 'router' || modelName.includes('router');

  // Header
  lines.push('!');
  lines.push(`! Last configuration change at ${TIMESTAMP}`);
  lines.push('!');
  lines.push('version 15.0');
  lines.push('no service pad');
  lines.push('service timestamps debug datetime msec');
  lines.push('service timestamps log datetime msec');

  if (state.security?.servicePasswordEncryption) {
    lines.push('service password-encryption');
  }

  lines.push('!');
  lines.push(`hostname ${state.hostname}`);
  lines.push(`! base mac-address ${state.macAddress}`);
  lines.push('!');

  if (state.bannerMOTD) {
    const escapedBanner = state.bannerMOTD.replace(/\n/g, '\\n');
    lines.push(`banner motd #${escapedBanner}#`);
    lines.push('!');
  }

  if (state.security?.enableSecret) {
    lines.push(`enable secret ${state.security.enableSecret}`);
  }
  if (state.security?.enablePassword) {
    if (state.security.servicePasswordEncryption) {
      lines.push(`enable password 7 ${encryptType7Password(state.security.enablePassword)}`);
    } else {
      lines.push(`enable password ${state.security.enablePassword}`);
    }
  }
  lines.push('!');

  if (state.services?.http?.enabled) {
    lines.push('ip http server');
    lines.push('!');
  }

  (state.security?.users || []).forEach(user => {
    lines.push(`username ${user.username} privilege ${user.privilege} secret 5 ${encryptMd5Password(user.password)}`);
  });
  if ((state.security?.users?.length || 0) > 0) {
    lines.push('!');
  }

  if (state.aaaNewModel) {
    lines.push('aaa new-model');
  }
  if (state.aaaAuthentication && state.aaaAuthentication.length > 0) {
    state.aaaAuthentication.forEach(auth => {
      lines.push(`aaa authentication login ${auth}`);
    });
  }
  if (state.radiusServers && state.radiusServers.length > 0) {
    state.radiusServers.forEach(s => {
      lines.push(`radius-server host ${s.host}${s.key ? ` key ${s.key}` : ''}`);
    });
  }
  if (state.tacacsServers && state.tacacsServers.length > 0) {
    state.tacacsServers.forEach(s => {
      lines.push(`tacacs-server host ${s.host}${s.key ? ` key ${s.key}` : ''}`);
    });
  }
  if (state.radiusKey) {
    lines.push(`radius-server key ${state.radiusKey}`);
  }
  if (state.tacacsKey) {
    lines.push(`tacacs-server key ${state.tacacsKey}`);
  }
  if (state.aaaNewModel || (state.radiusServers && state.radiusServers.length > 0) || (state.tacacsServers && state.tacacsServers.length > 0)) {
    lines.push('!');
  }

  // IP Host
  if (state.services?.dns?.records && state.services.dns.records.length > 0) {
    state.services.dns.records.forEach(record => {
      lines.push(`ip host ${record.domain} ${record.address}`);
    });
    lines.push('!');
  }

  // IP Routing
  if (state.ipRouting) {
    lines.push('ip routing');
    lines.push('!');
  }

  // IP Multicast Routing
  if (state.multicastRoutingEnabled) {
    lines.push('ip multicast-routing');
    if (state.pimRpAddress) {
      lines.push(`ip pim rp-address ${state.pimRpAddress}`);
    }
    lines.push('!');
  }

  // CLI Aliases
  const execAliases = state.aliases?.exec || state.execAliases || {};
  const configAliases = state.aliases?.configure || {};
  const intfAliases = state.aliases?.interface || {};
  const lineAliases = state.aliases?.line || {};

  let hasAliases = false;
  Object.entries(execAliases).forEach(([name, target]) => {
    lines.push(`alias exec ${name} ${target}`);
    hasAliases = true;
  });
  Object.entries(configAliases).forEach(([name, target]) => {
    lines.push(`alias configure ${name} ${target}`);
    hasAliases = true;
  });
  Object.entries(intfAliases).forEach(([name, target]) => {
    lines.push(`alias interface ${name} ${target}`);
    hasAliases = true;
  });
  Object.entries(lineAliases).forEach(([name, target]) => {
    lines.push(`alias line ${name} ${target}`);
    hasAliases = true;
  });
  if (hasAliases) {
    lines.push('!');
  }

  // NTP Server
  if (state.ntpServers && state.ntpServers.length > 0) {
    state.ntpServers.forEach(server => {
      lines.push(`ntp server ${server}`);
    });
  }

  // NTP Master
  if (state.ntpMasterStratum) {
    lines.push(`ntp master ${state.ntpMasterStratum}`);
  }

  if ((state.ntpServers && state.ntpServers.length > 0) || state.ntpMasterStratum) {
    lines.push('!');
  }

  // IoT Config
  if (state.iotConfig) {
    lines.push('!');
  }

  // IPv6 Routing
  if (state.ipv6Enabled) {
    lines.push('ipv6 unicast-routing');
    lines.push('!');
  }

  // IPv6 Static Routes
  if (state.ipv6StaticRoutes && state.ipv6StaticRoutes.length > 0) {
    state.ipv6StaticRoutes.forEach(route => {
      lines.push(`ipv6 route ${route.destination}/${route.prefixLength} ${route.nextHop}${route.metric ? ` ${route.metric}` : ''}`);
    });
    lines.push('!');
  }

  // Spanning Tree (only for switches, not routers)
  if (!isRouterLike) {
    lines.push(`spanning-tree mode ${state.spanningTreeMode || 'pvst'}`);

    if (state.spanningTreeMode === 'mst' && state.mstConfig) {
      lines.push('spanning-tree mst configuration');
      if (state.mstConfig.name) lines.push(` name ${state.mstConfig.name}`);
      if (state.mstConfig.revision !== undefined) lines.push(` revision ${state.mstConfig.revision}`);
      if (state.mstConfig.instances) {
        Object.entries(state.mstConfig.instances).forEach(([instId, vlans]) => {
          lines.push(` instance ${instId} vlan ${vlans.join(',')}`);
        });
      }
      lines.push('!');
    }
    if (state.mstConfig?.instancePriorities) {
      Object.entries(state.mstConfig.instancePriorities).forEach(([instId, pri]) => {
        lines.push(`spanning-tree mst ${instId} priority ${pri}`);
      });
    }

    if (state.spanningTreePriority !== undefined) {
      lines.push(`spanning-tree priority ${state.spanningTreePriority}`);
    }

    const spanningTreeVlans = state.spanningTreeVlans || {};
    Object.keys(spanningTreeVlans)
      .sort((a, b) => Number(a) - Number(b))
      .forEach(vlanId => {
        const vlanConfig = spanningTreeVlans[vlanId];
        if (vlanConfig?.enabled === false) {
          lines.push(`no spanning-tree vlan ${vlanId}`);
          return;
        }

        if (vlanConfig?.priority !== undefined) {
          lines.push(`spanning-tree vlan ${vlanId} priority ${vlanConfig.priority}`);
        } else if (vlanConfig?.enabled) {
          lines.push(`spanning-tree vlan ${vlanId}`);
        }
      });

    if (state.loopguardDefault) {
      lines.push('spanning-tree loopguard default');
    }

    lines.push('!');
  }

  // QoS Global
  if (state.mlsQosEnabled) {
    lines.push('mls qos');
    lines.push('!');
  }
  if (state.qosClassMaps && Object.keys(state.qosClassMaps).length > 0) {
    Object.entries(state.qosClassMaps).forEach(([name, cm]) => {
      lines.push(`class-map match-${cm.match} ${name}`);
    });
    lines.push('!');
  }
  if (state.qosPolicyMaps && Object.keys(state.qosPolicyMaps).length > 0) {
    Object.entries(state.qosPolicyMaps).forEach(([name, pm]) => {
      lines.push(`policy-map ${name}`);
      Object.entries(pm.classes || {}).forEach(([className, cls]) => {
        lines.push(` class ${className}`);
        if (cls.setDscp) lines.push(`  set dscp ${cls.setDscp}`);
        if (cls.setCos !== undefined) lines.push(`  set cos ${cls.setCos}`);
        if (cls.policeRate !== undefined) lines.push(`  police rate ${cls.policeRate}`);
        if (cls.bandwidthPercent !== undefined) lines.push(`  bandwidth ${cls.bandwidthPercent}%`);
        if (cls.priority) lines.push('  priority');
      });
    });
    lines.push('!');
  }

  // EIGRPv6 Global
  if (state.eigrp6Config?.as) {
    lines.push(`ipv6 router eigrp ${state.eigrp6Config.as}`);
    if (state.eigrp6Config.routerId) lines.push(` eigrp router-id ${state.eigrp6Config.routerId}`);
    if (state.eigrp6Config.shutdown) lines.push(' shutdown');
    lines.push('!');
  }

  // IP Prefix-Lists
  if (state.prefixLists && Object.keys(state.prefixLists).length > 0) {
    Object.entries(state.prefixLists).forEach(([name, entries]) => {
      entries.forEach(e => {
        let line = `ip prefix-list ${name} seq ${e.seq} ${e.action} ${e.prefix}`;
        if (e.ge !== undefined) line += ` ge ${e.ge}`;
        if (e.le !== undefined) line += ` le ${e.le}`;
        lines.push(line);
      });
    });
    lines.push('!');
  }

  // IPv6 Prefix-Lists
  if (state.ipv6PrefixLists && Object.keys(state.ipv6PrefixLists).length > 0) {
    Object.entries(state.ipv6PrefixLists).forEach(([name, entries]) => {
      entries.forEach(e => {
        let line = `ipv6 prefix-list ${name} seq ${e.seq} ${e.action} ${e.prefix}`;
        if (e.ge !== undefined) line += ` ge ${e.ge}`;
        if (e.le !== undefined) line += ` le ${e.le}`;
        lines.push(line);
      });
    });
    lines.push('!');
  }

  // Route-Maps
  if (state.routeMaps && Object.keys(state.routeMaps).length > 0) {
    Object.entries(state.routeMaps).forEach(([name, clauses]) => {
      clauses.forEach(c => {
        lines.push(`route-map ${name} ${c.action} ${c.seq}`);
        if (c.matchRules.prefixList) lines.push(` match ip address prefix-list ${c.matchRules.prefixList}`);
        if (c.matchRules.acl) lines.push(` match ip address ${c.matchRules.acl}`);
        if (c.matchRules.interface) lines.push(` match interface ${c.matchRules.interface}`);
        if (c.setRules.metric !== undefined) lines.push(` set metric ${c.setRules.metric}`);
        if (c.setRules.nextHop) lines.push(` set ip next-hop ${c.setRules.nextHop}`);
        if (c.setRules.interface) lines.push(` set interface ${c.setRules.interface}`);
        if (c.setRules.precedence !== undefined) lines.push(` set ip precedence ${c.setRules.precedence}`);
        if (c.setRules.dscp !== undefined) lines.push(` set ip dscp ${c.setRules.dscp}`);
        if (c.setRules.localPreference !== undefined) lines.push(` set local-preference ${c.setRules.localPreference}`);
        if (c.setRules.weight !== undefined) lines.push(` set weight ${c.setRules.weight}`);
        if (Array.isArray(c.setRules.asPathPrepend) && c.setRules.asPathPrepend.length) lines.push(` set as-path prepend ${c.setRules.asPathPrepend.join(' ')}`);
      });
    });
    lines.push('!');
  }

  // LISP Configuration
  if (state.lispConfig?.enabled) {
    lines.push('router lisp');
    state.lispConfig.eidMappings.forEach((m) => {
      lines.push(` database-mapping ${m.eidPrefix} ${m.rlocIp}`);
    });
    lines.push('!');
  }

  // CoPP Configuration
  if (state.coppConfig?.enabled) {
    lines.push('control-plane');
    lines.push('!');
  }

  // Flexible NetFlow Records / Exporters / Monitors
  if (state.flowRecords) {
    Object.entries(state.flowRecords).forEach(([name, rec]) => {
      lines.push(`flow record ${name}`);
      (rec.matchFields || []).forEach(f => lines.push(` ${f}`));
      (rec.collectFields || []).forEach(f => lines.push(` ${f}`));
      lines.push('exit');
    });
    if (Object.keys(state.flowRecords).length > 0) lines.push('!');
  }
  if (state.flowExporters) {
    Object.entries(state.flowExporters).forEach(([name, exp]) => {
      lines.push(`flow exporter ${name}`);
      if (exp.destination) lines.push(` destination ${exp.destination}`);
      if (exp.transportPort) lines.push(` transport udp ${exp.transportPort}`);
      if (exp.version) lines.push(` version ${exp.version}`);
      if (exp.source) lines.push(` source ${exp.source}`);
      if (exp.templateDataTimeout) lines.push(` template data timeout ${exp.templateDataTimeout}`);
      lines.push('exit');
    });
    if (Object.keys(state.flowExporters).length > 0) lines.push('!');
  }
  if (state.flowMonitors) {
    Object.entries(state.flowMonitors).forEach(([name, mon]) => {
      lines.push(`flow monitor ${name}`);
      if (mon.record) lines.push(` record ${mon.record}`);
      if (mon.exporter) lines.push(` exporter ${mon.exporter}`);
      if (mon.cacheTimeoutActive) lines.push(` cache timeout active ${mon.cacheTimeoutActive}`);
      if (mon.cacheTimeoutInactive) lines.push(` cache timeout inactive ${mon.cacheTimeoutInactive}`);
      lines.push('exit');
    });
    if (Object.keys(state.flowMonitors).length > 0) lines.push('!');
  }

  // NetFlow Export
  if (state.netflowConfig?.exportDestination) {
    lines.push(`ip flow-export destination ${state.netflowConfig.exportDestination} ${state.netflowConfig.exportPort || 2055}`);
    if (state.netflowConfig.version) {
      lines.push(`ip flow-export version ${state.netflowConfig.version}`);
    }
    lines.push('!');
  }
}
