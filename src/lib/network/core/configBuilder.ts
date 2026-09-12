import { SwitchState } from '../types';
import { encryptType7Password, encryptMd5Password } from '../crypto';

const TIMESTAMP = '2026-02-26 22:00:00';

/**
 * Convert subnet mask to wildcard mask (inverse)
 */
function subnetMaskToWildcard(subnetMask: string): string {
    if (!subnetMask) return '0.0.0.0';

    const octets = subnetMask.split('.').map(Number);
    const wildcardOctets = octets.map(octet => 255 - octet);
    return wildcardOctets.join('.');
}

/**
 * Pure function that generates the running config lines for a given SwitchState.
 * Returns one config line per array entry (no \n characters).
 * Mirrors the generateConfig() logic in ConfigPanel.tsx.
 */
export function buildRunningConfig(state: SwitchState): string[] {
    const lines: string[] = [];
    const modelName = (state.version?.modelName || '').toLowerCase();
    const isRouterLike = state.deviceType === 'router' || modelName.includes('router');

    // Keep the dump useful when it is copied out of the terminal: this is a
    // compact, derived summary rather than another source of configuration.
    // Only non-default values are listed so an untouched device stays quiet.
    const changedSettings: string[] = [];
    if (state.ipRouting) changedSettings.push('ip routing');
    if (state.ipv6Enabled) changedSettings.push('IPv6 routing');
    if (state.spanningTreeMode && state.spanningTreeMode !== 'pvst') {
        changedSettings.push(`STP ${state.spanningTreeMode}`);
    }
    if (state.autoSummary === false) changedSettings.push('no auto-summary');
    if (Object.values(state.vlans || {}).some(vlan => vlan.id >= 2)) {
        changedSettings.push(`${Object.values(state.vlans || {}).filter(vlan => vlan.id >= 2).length} VLAN`);
    }
    const configuredPorts = Object.values(state.ports || {}).filter(port =>
        Boolean(port.ipAddress || port.mode === 'trunk' || port.mode === 'routed' || port.shutdown || port.description)
    ).length;
    if (configuredPorts > 0) changedSettings.push(`${configuredPorts} port configuration(s)`);

    lines.push('! Topology summary');
    lines.push(`! Device: ${state.hostname} (${state.deviceType})`);
    lines.push(`! Interfaces: ${Object.keys(state.ports || {}).length}`);
    if (changedSettings.length > 0) {
        lines.push(`! Changed settings: ${changedSettings.join(', ')}`);
    } else {
        lines.push('! Changed settings: none');
    }
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
                if (c.setRules.localPreference !== undefined) lines.push(` set local-preference ${c.setRules.localPreference}`);
            });
        });
        lines.push('!');
    }

    // NetFlow Export
    if (state.netflowConfig?.exportDestination) {
        lines.push(`ip flow-export destination ${state.netflowConfig.exportDestination} ${state.netflowConfig.exportPort || 2055}`);
        if (state.netflowConfig.version) {
            lines.push(`ip flow-export version ${state.netflowConfig.version}`);
        }
        lines.push('!');
    }

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
        });
        // Global BGP knobs
        if (state.bgpMaximumPaths !== undefined && state.bgpMaximumPaths !== 1) lines.push(`  maximum-paths ${state.bgpMaximumPaths}`);
        if (state.bgpGracefulRestart) lines.push(`  bgp graceful-restart`);
        if (state.bgpClusterId) lines.push(`  bgp cluster-id ${state.bgpClusterId}`);
        if (state.bgpSynchronization) lines.push(`  synchronization`);
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

    // line con 0
    lines.push('line con 0');
    if (state.startupConfig?.security?.consoleLine?.password) {
        if (state.startupConfig.security.servicePasswordEncryption) {
            lines.push(` password 7 ${encryptType7Password(state.startupConfig.security.consoleLine.password)}`);
        } else {
            lines.push(` password ${state.startupConfig.security.consoleLine.password}`);
        }
    } else if (state.security?.consoleLine?.password) {
        if (state.security.servicePasswordEncryption) {
            lines.push(` password 7 ${encryptType7Password(state.security.consoleLine.password)}`);
        } else {
            lines.push(` password ${state.security.consoleLine.password}`);
        }
    }
    if (state.security?.consoleLine?.login) {
        lines.push(' login');
    }
    if (state.security?.consoleLine?.execTimeout) {
        lines.push(` exec-timeout ${state.security.consoleLine.execTimeout.minutes} ${state.security.consoleLine.execTimeout.seconds}`);
    }
    lines.push('!');

    // line vty 0 15
    lines.push('line vty 0 15');
    if (state.startupConfig?.security?.vtyLines?.password) {
        if (state.startupConfig.security.servicePasswordEncryption) {
            lines.push(` password 7 ${encryptType7Password(state.startupConfig.security.vtyLines.password)}`);
        } else {
            lines.push(` password ${state.startupConfig.security.vtyLines.password}`);
        }
    } else if (state.security?.vtyLines?.password) {
        if (state.security.servicePasswordEncryption) {
            lines.push(` password 7 ${encryptType7Password(state.security.vtyLines.password)}`);
        } else {
            lines.push(` password ${state.security.vtyLines.password}`);
        }
    }
    if (state.security?.vtyLines?.login) {
        lines.push(' login');
    }
    if (
        (state.security?.vtyLines?.transportInput?.length || 0) > 0 &&
        state.security?.vtyLines?.transportInput?.[0] !== 'all'
    ) {
        lines.push(` transport input ${state.security!.vtyLines!.transportInput.join(' ')}`);
    }
    if (state.security?.vtyLines?.execTimeout) {
        lines.push(` exec-timeout ${state.security.vtyLines.execTimeout.minutes} ${state.security.vtyLines.execTimeout.seconds}`);
    }
    lines.push('!');

    // Standard and named ACLs
    if (state.accessLists && Object.keys(state.accessLists).length > 0) {
        Object.entries(state.accessLists).forEach(([aclId, rules]) => {
            const isNamed = isNaN(Number(aclId));
            if (isNamed) {
                lines.push(`ip access-list standard ${aclId}`);
                rules.forEach((rule: string) => {
                    const seqMatch = rule.match(/^(\d+)\s+(.+)$/);
                    if (seqMatch) {
                        lines.push(` ${seqMatch[2]}`);
                    } else {
                        lines.push(` ${rule}`);
                    }
                });
                lines.push('exit');
            } else {
                rules.forEach((rule: string) => {
                    lines.push(`access-list ${aclId} ${rule}`);
                });
            }
        });
        lines.push('!');
    }

    if (state.switchLayer === 'FW' && state.firewallRules && state.firewallRules.length > 0) {
        state.firewallRules.forEach((rule, index) => {
            const statusPrefix = rule.enabled === false ? 'inactive ' : '';
            const action = rule.action === 'allow' ? 'permit' : rule.action;
            const sourceIp = rule.sourceIp === '*' ? 'any' : rule.sourceIp;
            const targetIp = rule.targetIp === '*' ? 'any' : rule.targetIp;
            const protocol = (rule.protocol === 'any' ? 'ip' : (rule.protocol || 'ip')).toLowerCase();
            const hasPort = (rule.port !== '*' && rule.port !== 'any' && protocol !== 'icmp' && protocol !== 'ip' && protocol !== 'any');
            const portSuffix = hasPort ? ` eq ${rule.port}` : '';
            lines.push(
                `access-list OUTSIDE-IN line ${index + 1} extended ${statusPrefix}${action} ${protocol} ${sourceIp} ${targetIp}${portSuffix}`
            );
        });
        lines.push('!');
    }

    lines.push('end');

    return lines;
}
