import { SwitchState } from '../types';

export function buildInterfacesConfig(state: SwitchState, lines: string[]): void {
  const modelName = (state.version?.modelName || '').toLowerCase();
  const isRouterLike = state.deviceType === 'router' || modelName.includes('router');

  // VLANs (id 2-1001)
  Object.values(state.vlans || {}).forEach(vlan => {
    if (vlan.id >= 2 && vlan.id <= 1001) {
      lines.push(`vlan ${vlan.id}`);
      lines.push(` name ${vlan.name}`);
      lines.push('!');
    }
  });

  // Physical interfaces (non-VLAN ports)
  Object.entries(state.ports || {}).forEach(([portKey, port]) => {
    const portId = (port.id || portKey || '').toString();
    if (!portId) {
      return;
    }

    const normalizedPortId = portId.toLowerCase();
    if (normalizedPortId.startsWith('vlan') || normalizedPortId === 'console') {
      return;
    }

    const isSerial = port.type === 'serial';
    const isWlan = normalizedPortId.startsWith('wlan');
    const isPortChannel = normalizedPortId.startsWith('po') && /^po\d+$/i.test(normalizedPortId);
    let portUpper: string;
    if (isPortChannel) {
      portUpper = `Port-channel${normalizedPortId.slice(2)}`;
    } else if (isSerial) {
      portUpper = portId.toUpperCase().replace(/^S(\d+)\/(\d+)\/(\d+)$/, 'Serial$1/$2/$3');
    } else if (isWlan) {
      portUpper = portId.toUpperCase();
    } else {
      portUpper = portId.toUpperCase().replace('FA', 'FastEthernet').replace('GI', 'GigabitEthernet');
    }

    lines.push(`interface ${portUpper}`);

    const portDescription = port.description || port.name;
    if (portDescription) {
      lines.push(` description ${portDescription}`);
    }

    if (isWlan) {
      // WLAN interface: only wifi-specific commands, no switchport
      if (port.wifi) {
        if (port.wifi.ssid) {
          lines.push(` ssid ${port.wifi.ssid}`);
        }
        if (port.wifi.security && port.wifi.security !== 'open') {
          lines.push(` encryption ${port.wifi.security}`);
        }
      }
      if (!port.shutdown) {
        lines.push(' no shutdown');
      } else {
        lines.push(' shutdown');
      }
    } else if (isSerial) {
      // Serial interface config
      const serialEnc = port.serialEncapsulation || 'hdlc';
      lines.push(` encapsulation ${serialEnc}`);
      if (port.clockRate && port.dce) {
        lines.push(` clock rate ${port.clockRate}`);
      }
      if (serialEnc === 'ppp' && port.pppAuth && port.pppAuth !== 'none') {
        lines.push(` ppp authentication ${port.pppAuth}`);
        if (port.pppPapUsername && port.pppPapPassword) {
          lines.push(` ppp pap sent-username ${port.pppPapUsername} password 0 ${port.pppPapPassword}`);
        }
      }
      if (port.bandwidth) {
        lines.push(` bandwidth ${port.bandwidth}`);
      }
      const isPoRouted = port.mode === 'routed' || port.isRoutedPort;
      if (isPoRouted) {
        lines.push(' no switchport');
      }
      if (port.ipAddress && port.subnetMask) {
        lines.push(` ip address ${port.ipAddress} ${port.subnetMask}`);
      }
      if (!port.shutdown) {
        lines.push(' no shutdown');
      } else {
        lines.push(' shutdown');
      }
    } else {
      // Regular (Ethernet) interface
      const isRoutedPort = port.mode === 'routed' || port.isRoutedPort;
      const isRouterInterface = isRouterLike;
      if (isRoutedPort) {
        lines.push(' no switchport');
      }
      if (isRoutedPort || isRouterInterface) {
        lines.push(` duplex ${port.duplex || 'auto'}`);
        lines.push(` speed ${port.speed || 'auto'}`);
      } else {
        if (port.speed !== 'auto') {
          lines.push(` speed ${port.speed}`);
        }
        if (port.duplex !== 'auto') {
          lines.push(` duplex ${port.duplex}`);
        }
      }
      if (port.stpCost !== undefined) {
        lines.push(` spanning-tree cost ${port.stpCost}`);
      }
      if (port.stpPriority !== undefined) {
        lines.push(` spanning-tree priority ${port.stpPriority}`);
      }
      if (port.spanningTree?.portfast) {
        lines.push(' spanning-tree portfast');
      }
      if (port.spanningTree?.bpduguard) {
        lines.push(' spanning-tree bpduguard enable');
      }
      if (port.spanningTree?.bpdufilter) {
        lines.push(' spanning-tree bpdufilter enable');
      }
      if (port.spanningTree?.guardRoot) {
        lines.push(' spanning-tree guard root');
      }
      if (port.pvlanMode === 'promiscuous') {
        lines.push(' switchport mode private-vlan promiscuous');
      } else if (port.pvlanMode === 'host') {
        lines.push(' switchport mode private-vlan host');
        if (port.pvlanHostAssociation) {
          lines.push(` switchport private-vlan host-association ${port.pvlanHostAssociation.primary} ${port.pvlanHostAssociation.secondary}`);
        }
      }
      if (port.flexLinkBackup) {
        lines.push(` switchport backup interface ${port.flexLinkBackup}`);
      }
      if (!isRouterLike) {
        if (port.mode === 'trunk') {
          if (modelName.includes('NS-L3') || modelName.includes('ns-l3')) {
            lines.push(' switchport trunk encapsulation dot1q');
          }
          lines.push(' switchport mode trunk');
        } else if (port.mode === 'dynamic-auto') {
          lines.push(' switchport mode dynamic auto');
        } else if (port.mode === 'dynamic-desirable') {
          lines.push(' switchport mode dynamic desirable');
        } else if (port.mode === 'dot1q-tunnel') {
          lines.push(' switchport mode dot1q-tunnel');
        } else if (port.mode === 'access') {
          lines.push(' switchport mode access');
          const vlanId = Number(port.accessVlan || port.vlan || 1);
          if (vlanId !== 1) {
            lines.push(` switchport access vlan ${vlanId}`);
          }
        }
      }
      // Port Security
      if (port.portSecurity?.enabled) {
        lines.push(' switchport port-security');
        if (port.portSecurity.maxAddresses) {
          lines.push(` switchport port-security maximum ${port.portSecurity.maxAddresses}`);
        }
        if (port.portSecurity.violationAction) {
          lines.push(` switchport port-security violation ${port.portSecurity.violationAction}`);
        }
        if (port.portSecurity.sticky) {
          lines.push(' switchport port-security mac-address sticky');
        }
        if (port.portSecurity.aging?.enabled) {
          if (port.portSecurity.aging.time) {
            lines.push(` switchport port-security aging time ${port.portSecurity.aging.time}`);
          }
          if (port.portSecurity.aging.type) {
            lines.push(` switchport port-security aging type ${port.portSecurity.aging.type}`);
          }
        }
        if (port.staticMacs && port.staticMacs.length > 0) {
          port.staticMacs.forEach((mac: string) => {
            lines.push(` switchport port-security mac-address ${mac}`);
          });
        }
      }

      if (port.macAccessGroupIn) {
        lines.push(` mac access-group ${port.macAccessGroupIn} in`);
      }
      if (port.macAccessGroupOut) {
        lines.push(` mac access-group ${port.macAccessGroupOut} out`);
      }
      if (port.accessGroupIn) {
        lines.push(` ip access-group ${port.accessGroupIn} in`);
      }
      if (port.accessGroupOut) {
        lines.push(` ip access-group ${port.accessGroupOut} out`);
      }

      if (port.ipAddress && port.subnetMask) {
        lines.push(` ip address ${port.ipAddress} ${port.subnetMask}`);
      } else if (isRouterInterface) {
        lines.push(' no ip address');
      }
      if (port.ospfEnabled && port.ospfProcessId && port.ospfArea !== undefined) {
        lines.push(` ip ospf ${port.ospfProcessId} area ${port.ospfArea}`);
        if (port.ospfAuthType === 'md5') {
          lines.push(' ip ospf authentication message-digest');
          if (port.ospfMd5KeyId !== undefined && port.ospfAuthKey) {
            lines.push(` ip ospf message-digest-key ${port.ospfMd5KeyId} md5 ${port.ospfAuthKey}`);
          }
        } else if (port.ospfAuthType === 'simple' && port.ospfAuthKey) {
          lines.push(' ip ospf authentication');
          lines.push(` ip ospf authentication-key ${port.ospfAuthKey}`);
        }
        if (port.ospfCost !== undefined) lines.push(` ip ospf cost ${port.ospfCost}`);
        if (port.ospfHelloInterval !== undefined) lines.push(` ip ospf hello-interval ${port.ospfHelloInterval}`);
        if (port.ospfDeadInterval !== undefined) lines.push(` ip ospf dead-interval ${port.ospfDeadInterval}`);
        if (port.ospfPriority !== undefined) lines.push(` ip ospf priority ${port.ospfPriority}`);
      }
      if (port.ipv6Address && port.ipv6Prefix) {
        lines.push(` ipv6 address ${port.ipv6Address}/${port.ipv6Prefix}`);
      }
      if (port.ipv6Rip?.enabled) {
        lines.push(` ipv6 rip ${port.ipv6Rip.processName} enable`);
      }
      if (port.ipv6Ospf?.enabled) {
        lines.push(` ipv6 ospf ${port.ipv6Ospf.processId} area ${port.ipv6Ospf.area}`);
      }
      if (port.ipv6DhcpServer) {
        lines.push(` ipv6 dhcp server ${port.ipv6DhcpServer}`);
      }
      // PBR (Policy-Based Routing)
      if (port.policyRouteMap) {
        lines.push(` ip policy route-map ${port.policyRouteMap}`);
      }
      // HSRP (Standby)
      if (port.hsrp?.groups) {
        Object.entries(port.hsrp.groups).forEach(([group, config]: [string, { virtualIp?: string; ipv6VirtualIp?: string; priority?: number; preempt?: boolean; state?: string }]) => {
          if (config.virtualIp) {
            lines.push(` standby ${group} ip ${config.virtualIp}`);
          }
          if (config.ipv6VirtualIp) {
            lines.push(` standby ${group} ipv6 ${config.ipv6VirtualIp}`);
          }
          if (config.priority !== undefined) {
            lines.push(` standby ${group} priority ${config.priority}`);
          }
          if (config.preempt) {
            lines.push(` standby ${group} preempt`);
          }
        });
      }
      if (port.ipv6Eigrp?.enabled) {
        lines.push(` ipv6 eigrp ${port.ipv6Eigrp.as}`);
      }
      if (port.glbp?.groups) {
        Object.entries(port.glbp.groups).forEach(([group, config]) => {
          if (config.virtualIp) lines.push(` glbp ${group} ip ${config.virtualIp}`);
          if (config.priority !== undefined) lines.push(` glbp ${group} priority ${config.priority}`);
          if (config.preempt) lines.push(` glbp ${group} preempt`);
          if (config.loadBalancing) lines.push(` glbp ${group} load-balancing ${config.loadBalancing}`);
        });
      }
      if (port.spanningTree?.loopguard === 'enable') {
        lines.push(' spanning-tree guard loop');
      } else if (port.spanningTree?.loopguard === 'disable') {
        lines.push(' spanning-tree guard none');
      }
      if (port.netflowIngress) lines.push(' ip flow ingress');
      if (port.netflowEgress) lines.push(' ip flow egress');
      if (port.flowMonitor) lines.push(` ip flow monitor ${port.flowMonitor}`);
      if (port.qos?.enabled) {
        if (port.qos.egressQueue) lines.push(` queue-set ${port.qos.egressQueue}`);
        if (port.qos.ingressQueue) lines.push(` tx-queue ${port.qos.ingressQueue}`);
        if (port.qos.priorityQueue?.enabled) lines.push(' priority-queue out');
      }
      if (port.qosDscp) lines.push(` set dscp ${port.qosDscp}`);
      if (port.qosTrust) lines.push(` mls qos trust ${port.qosTrust}`);
      if (port.qosCos !== undefined) lines.push(` mls qos cos ${port.qosCos}`);
      if (port.stormControl?.broadcast?.enabled) {
        const bc = port.stormControl.broadcast;
        lines.push(` storm-control broadcast level ${bc.threshold ?? ''}`);
      }
      if (port.stormControl?.multicast?.enabled) {
        const mc = port.stormControl.multicast;
        lines.push(` storm-control multicast level ${mc.threshold ?? ''}`);
      }
      if (port.stormControl?.unicast?.enabled) {
        const uc = port.stormControl.unicast;
        lines.push(` storm-control unicast level ${uc.threshold ?? ''}`);
      }
      const svcPolicy = state.qosServicePolicies?.[portKey];
      if (svcPolicy) lines.push(` service-policy ${svcPolicy.direction} ${svcPolicy.policy}`);

      if (port.pimMode) {
        lines.push(` ip pim ${port.pimMode}`);
      }
      if (port.igmpGroups && port.igmpGroups.length > 0) {
        port.igmpGroups.forEach(g => {
          lines.push(` ip igmp join-group ${g}`);
        });
      }
      if (port.igmpVersion) {
        lines.push(` ip igmp version ${port.igmpVersion}`);
      }

      if (port.shutdown) {
        lines.push(' shutdown');
      } else if (!isRoutedPort) {
        lines.push(' no shutdown');
      }
    }

    lines.push('!');
  });

  // VLAN SVI interfaces (ports starting with 'vlan')
  Object.keys(state.ports || {}).forEach(portName => {
    if (portName.toLowerCase().startsWith('vlan')) {
      const port = state.ports[portName];
      const vlanNum = portName.toLowerCase().replace('vlan', '');

      // Skip Vlan1 if it doesn't have an IP address - handled at the end
      if (vlanNum === '1' && (!port.ipAddress || !port.subnetMask)) {
        return;
      }

      lines.push(`interface Vlan${vlanNum}`);
      if (port.ipAddress && port.subnetMask) {
        lines.push(` ip address ${port.ipAddress} ${port.subnetMask}`);
      }
      if (!port.shutdown) {
        lines.push(' no shutdown');
      } else {
        lines.push(' shutdown');
      }
      lines.push('!');
    }
  });
}
