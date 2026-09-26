import { SwitchState } from '../types';

/**
 * Convert subnet mask to wildcard mask (inverse)
 */
function subnetMaskToWildcard(subnetMask: string): string {
  if (!subnetMask) return '0.0.0.0';
  const octets = subnetMask.split('.').map(Number);
  const wildcardOctets = octets.map(octet => 255 - octet);
  return wildcardOctets.join('.');
}

export function buildRoutingProtocolsConfig(state: SwitchState, lines: string[]): void {
  // Dynamic Routing
  if (state.routingProtocol === 'rip') {
    lines.push('router rip');
    lines.push(' version 2');
    (state.dynamicRoutes || []).forEach(r => {
      if (r.type === 'dynamic') lines.push(`  network ${r.destination}`);
    });
    (state.redistributeRules || []).filter(r => r.targetProtocol === 'rip').forEach(r => {
      lines.push(`  redistribute ${r.sourceProtocol}${r.processId ? ' ' + r.processId : ''}${r.metric !== undefined ? ' metric ' + r.metric : ''}`);
    });
    if (state.autoSummary === false) lines.push(' no auto-summary');
    lines.push('!');
  } else if (state.routingProtocol === 'ospf') {
    lines.push(`router ospf 1`);
    (state.dynamicRoutes || []).forEach(r => {
      if (r.type === 'dynamic' && r.subnetMask) {
        const wildcardMask = subnetMaskToWildcard(r.subnetMask);
        lines.push(`  network ${r.destination} ${wildcardMask} area ${r.metric || 0}`);
      }
    });
    (state.redistributeRules || []).filter(r => r.targetProtocol === 'ospf').forEach(r => {
      lines.push(`  redistribute ${r.sourceProtocol}${r.processId ? ' ' + r.processId : ''}${r.metric !== undefined ? ' metric ' + r.metric : ''}${r.subnets ? ' subnets' : ''}`);
    });
    (state.passiveInterfaces || []).forEach(p => {
      lines.push(`  passive-interface ${p}`);
    });
    lines.push('!');
  } else if (state.routingProtocol === 'eigrp') {
    lines.push(`router eigrp ${state.eigrpAs || '1'}`);
    (state.dynamicRoutes || []).forEach(r => {
      if (r.type === 'dynamic' && r.destination && r.subnetMask) lines.push(`  network ${r.destination} ${r.subnetMask}`);
    });
    (state.redistributeRules || []).filter(r => r.targetProtocol === 'eigrp').forEach(r => {
      lines.push(`  redistribute ${r.sourceProtocol}${r.processId ? ' ' + r.processId : ''}${r.metric !== undefined ? ' metric ' + r.metric : ''}`);
    });
    if (state.autoSummary === false) lines.push(' no auto-summary');
    if (state.eigrpStub) {
      const keywords: string[] = [];
      if (state.eigrpStub.receiveOnly) keywords.push('receive-only');
      else {
        if (state.eigrpStub.connected) keywords.push('connected');
        if (state.eigrpStub.summary) keywords.push('summary');
        if (state.eigrpStub.static) keywords.push('static');
        if (state.eigrpStub.redistributed) keywords.push('redistributed');
      }
      lines.push(`  eigrp stub${keywords.length ? ' ' + keywords.join(' ') : ''}`);
    }
    lines.push('!');
  } else if (state.routingProtocol === 'bgp') {
    lines.push(`router bgp ${state.bgpAs || '65000'}`);
    // Advertised networks (network <ip> mask <mask>)
    if (state.bgpNetworks && state.bgpNetworks.length > 0) {
      state.bgpNetworks.forEach(n => {
        if (n.network && n.mask) lines.push(`  network ${n.network} mask ${n.mask}`);
      });
    }
    // Legacy: dynamic route-sourced network statements
    (state.dynamicRoutes || []).forEach(r => {
      const exists = (state.bgpNetworks || []).some(n => n.network === r.destination);
      if (r.type === 'dynamic' && r.subnetMask && !exists) lines.push(`  network ${r.destination} mask ${r.subnetMask}`);
    });
    // Neighbors with their full advanced sub-commands
    (state.bgpNeighbors || []).forEach((n: import('../types').BgpNeighbor) => {
      lines.push(`  neighbor ${n.ip} remote-as ${n.as}`);
      if (n.description) lines.push(`  neighbor ${n.ip} description ${n.description}`);
      if (n.nextHopSelf) lines.push(`  neighbor ${n.ip} next-hop-self`);
      if (n.ebgpMultihop !== undefined) lines.push(`  neighbor ${n.ip} ebgp-multihop ${n.ebgpMultihop}`);
      if (n.updateSource) lines.push(`  neighbor ${n.ip} update-source ${n.updateSource}`);
      if (n.timersKeepalive !== undefined && n.timersHoldtime !== undefined) lines.push(`  neighbor ${n.ip} timers ${n.timersKeepalive} ${n.timersHoldtime}`);
      if (n.password) lines.push(`  neighbor ${n.ip} password ${n.password}`);
      if (n.shutdown) lines.push(`  neighbor ${n.ip} shutdown`);
      if (n.defaultOriginate) lines.push(`  neighbor ${n.ip} default-originate`);
      if (n.removePrivateAs) lines.push(`  neighbor ${n.ip} remove-private-as`);
      if (n.maximumPrefix !== undefined) lines.push(`  neighbor ${n.ip} maximum-prefix ${n.maximumPrefix}`);
      if (n.allowAsIn !== undefined) lines.push(`  neighbor ${n.ip} allowas-in ${n.allowAsIn}`);
      if (n.sendCommunity) lines.push(`  neighbor ${n.ip} send-community`);
      if (n.routeReflectorClient) lines.push(`  neighbor ${n.ip} route-reflector-client`);
      if (n.asOverride) lines.push(`  neighbor ${n.ip} as-override`);
      if (n.softReconfiguration) lines.push(`  neighbor ${n.ip} soft-reconfiguration inbound`);
      if (n.routeMapIn) lines.push(`  neighbor ${n.ip} route-map ${n.routeMapIn} in`);
      if (n.routeMapOut) lines.push(`  neighbor ${n.ip} route-map ${n.routeMapOut} out`);
      if (n.weight !== undefined) lines.push(`  neighbor ${n.ip} weight ${n.weight}`);
      if (n.med !== undefined) lines.push(`  neighbor ${n.ip} med ${n.med}`);
    });
    // Global BGP knobs
    if (state.bgpMaximumPaths !== undefined && state.bgpMaximumPaths !== 1) lines.push(`  maximum-paths ${state.bgpMaximumPaths}`);
    if (state.bgpGracefulRestart) lines.push(`  bgp graceful-restart`);
    if (state.bgpClusterId) lines.push(`  bgp cluster-id ${state.bgpClusterId}`);
    if (state.bgpSynchronization) lines.push(`  synchronization`);
    if (state.bgpLocalPreference !== undefined) lines.push(`  bgp default local-preference ${state.bgpLocalPreference}`);
    if (state.bgpTimers) lines.push(`  timers bgp ${state.bgpTimers.keepalive} ${state.bgpTimers.holdtime}`);
    (state.bgpAggregateAddresses || []).forEach(agg => {
      lines.push(`  aggregate-address ${agg.network} ${agg.mask}${agg.summaryOnly ? ' summary-only' : ''}`);
    });
    (state.redistributeRules || []).filter(r => r.targetProtocol === 'bgp').forEach(r => {
      lines.push(`  redistribute ${r.sourceProtocol}${r.processId ? ' ' + r.processId : ''}${r.metric !== undefined ? ' metric ' + r.metric : ''}`);
    });
    lines.push('!');
  }

  // Default Vlan1 (if not already configured above)
  const vlan1Port = state.ports['vlan1'];
  if (!vlan1Port || !vlan1Port.ipAddress || !vlan1Port.subnetMask) {
    lines.push('interface Vlan1');
    lines.push(' no ip address');
    lines.push(' no shutdown');
    lines.push('!');
  }

  // IP default-gateway is only valid for L2/no-routing behavior
  if (state.defaultGateway && !state.ipRouting) {
    lines.push(`ip default-gateway ${state.defaultGateway}`);
    lines.push('!');
  }

  if (state.clockTimezone) {
    const minStr = state.clockTimezone.minutesOffset ? ` ${state.clockTimezone.minutesOffset}` : '';
    lines.push(`clock timezone ${state.clockTimezone.name} ${state.clockTimezone.hoursOffset >= 0 ? '+' : ''}${state.clockTimezone.hoursOffset}${minStr}`);
    lines.push('!');
  }

  // DHCP excluded addresses
  if (state.dhcpExcludedAddresses && state.dhcpExcludedAddresses.length > 0) {
    state.dhcpExcludedAddresses.forEach(exc => {
      const endStr = exc.endIp ? ` ${exc.endIp}` : '';
      lines.push(`ip dhcp excluded-address ${exc.startIp}${endStr}`);
    });
    lines.push('!');
  }

  // DHCP excluded addresses and pools (CLI-configured via ip dhcp pool)
  if (state.dhcpPools && Object.keys(state.dhcpPools).length > 0) {
    Object.entries(state.dhcpPools).forEach(([poolName, pool]) => {
      lines.push(`ip dhcp pool ${poolName}`);
      if (pool.network && pool.subnetMask) {
        lines.push(` network ${pool.network} ${pool.subnetMask}`);
      }
      if (pool.defaultRouter) {
        lines.push(` default-router ${pool.defaultRouter}`);
      }
      if (pool.dnsServer) {
        lines.push(` dns-server ${pool.dnsServer}`);
      }
      if (pool.domainName) {
        lines.push(` domain-name ${pool.domainName}`);
      }
      if (pool.leaseTime) {
        lines.push(` lease ${pool.leaseTime}`);
      }
      lines.push('!');
    });
  }

  // IPv6 DHCP pools
  if (state.ipv6DhcpPools && Object.keys(state.ipv6DhcpPools).length > 0) {
    Object.entries(state.ipv6DhcpPools).forEach(([poolName, pool]) => {
      lines.push(`ipv6 dhcp pool ${poolName}`);
      if (pool.addressPrefix) {
        lines.push(`  address prefix ${pool.addressPrefix}`);
      }
      lines.push('!');
    });
  }
}
