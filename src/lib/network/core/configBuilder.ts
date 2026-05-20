import { SwitchState } from '../types';

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

    // Header
    lines.push('!');
    lines.push(`! Last configuration change at ${TIMESTAMP}`);
    lines.push('!');
    lines.push('version 15.0');
    lines.push('no service pad');
    lines.push('service timestamps debug datetime msec');
    lines.push('service timestamps log datetime msec');

    if (state.security.servicePasswordEncryption) {
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

    if (state.security.enableSecret) {
        lines.push(`enable secret ${state.security.enableSecret}`);
    }
    if (state.security.enablePassword) {
        if (state.security.servicePasswordEncryption) {
            lines.push(`enable password 7 ${state.security.enablePassword}`);
        } else {
            lines.push(`enable password ${state.security.enablePassword}`);
        }
    }
    lines.push('!');

    if (state.services?.http?.enabled) {
        lines.push('ip http server');
        lines.push('!');
    }

    state.security.users.forEach(user => {
        if (state.security.servicePasswordEncryption) {
            lines.push(`username ${user.username} privilege ${user.privilege} secret 7 ********`);
        } else {
            lines.push(`username ${user.username} privilege ${user.privilege} secret ${user.password}`);
        }
    });
    if (state.security.users.length > 0) {
        lines.push('!');
    }

    // IP Routing
    if (state.ipRouting) {
        lines.push('ip routing');
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

        lines.push('!');
    }

    // VLANs (id 2-1001)
    Object.values(state.vlans).forEach(vlan => {
        if (vlan.id >= 2 && vlan.id <= 1001) {
            lines.push(`vlan ${vlan.id}`);
            lines.push(` name ${vlan.name}`);
            lines.push('!');
        }
    });

    // Physical interfaces (non-VLAN ports)
    Object.entries(state.ports).forEach(([portKey, port]) => {
        const portId = (port.id || portKey || '').toString();
        if (!portId) {
            return;
        }

        const normalizedPortId = portId.toLowerCase();
        if (normalizedPortId.startsWith('vlan') || normalizedPortId === 'console') {
            return;
        }

        const isWlan = normalizedPortId.startsWith('wlan');
        const portUpper = isWlan
            ? portId.toUpperCase()
            : portId.toUpperCase().replace('FA', 'FastEthernet').replace('GI', 'GigabitEthernet');

        lines.push(`interface ${portUpper}`);

        const portDescription = port.description || port.name;
        if (portDescription) {
            lines.push(` description ${portDescription}`);
        }

        if (isWlan) {
            // WLAN interface: only wifi-specific commands, no switchport
            if (port.wifi) {
                const wifiMode = port.wifi.mode === 'disabled'
                    ? 'disabled'
                    : port.wifi.mode === 'client'
                        ? 'client'
                        : 'ap';
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
        } else {
            // Regular (Ethernet) interface
            const isRoutedPort = port.mode === 'routed' || (port as any).isRoutedPort;
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
            if ((port as any).stpCost !== undefined) {
                lines.push(` spanning-tree cost ${(port as any).stpCost}`);
            }
            if ((port as any).stpPriority !== undefined) {
                lines.push(` spanning-tree priority ${(port as any).stpPriority}`);
            }
            if (port.spanningTree?.portfast) {
                lines.push(' spanning-tree portfast');
            }
            if (port.spanningTree?.bpduguard) {
                lines.push(' spanning-tree bpduguard enable');
            }
            if (!isRouterLike) {
                if (port.mode === 'trunk') {
                    lines.push(' switchport mode trunk');
                } else if (port.mode === 'dynamic-auto') {
                    lines.push(' switchport mode dynamic auto');
                } else if (port.mode === 'dynamic-desirable') {
                    lines.push(' switchport mode dynamic desirable');
                } else if (port.mode === 'dot1q-tunnel') {
                    lines.push(' switchport mode dot1q-tunnel');
                } else if (port.mode === 'access') {
                    lines.push(' switchport mode access');
                    const vlanId = Number((port as any).accessVlan || port.vlan || 1);
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

            if (port.ipAddress && port.subnetMask) {
                lines.push(` ip address ${port.ipAddress} ${port.subnetMask}`);
            } else if (isRouterInterface) {
                lines.push(' no ip address');
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
        lines.push('!');
    } else if (state.routingProtocol === 'bgp') {
        lines.push(`router bgp ${state.bgpAs || '65000'}`);
        (state.dynamicRoutes || []).forEach(r => {
            if (r.type === 'dynamic') lines.push(`  network ${r.destination} mask ${r.subnetMask}`);
        });
        ((state as any).bgpNeighbors || []).forEach((n: any) => {
            lines.push(`  neighbor ${n.ip} remote-as ${n.as}`);
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
    if (state.security.consoleLine.password) {
        if (state.security.servicePasswordEncryption) {
            lines.push(` password 7 ********`);
        } else {
            lines.push(` password ${state.security.consoleLine.password}`);
        }
    }
    if (state.security.consoleLine.login) {
        lines.push(' login');
    }
    lines.push('!');

    // line vty 0 15
    lines.push('line vty 0 15');
    if (state.security.vtyLines.password) {
        if (state.security.servicePasswordEncryption) {
            lines.push(` password 7 ********`);
        } else {
            lines.push(` password ${state.security.vtyLines.password}`);
        }
    }
    if (state.security.vtyLines.login) {
        lines.push(' login');
    }
    if (
        state.security.vtyLines.transportInput.length > 0 &&
        state.security.vtyLines.transportInput[0] !== 'all'
    ) {
        lines.push(` transport input ${state.security.vtyLines.transportInput.join(' ')}`);
    }
    lines.push('!');

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
