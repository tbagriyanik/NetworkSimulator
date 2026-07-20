'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Loader2, RefreshCw, Layers, Compass, Server, Monitor, Wand2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { CanvasDevice, CanvasConnection } from '../networkTopology.types';
import { SwitchState } from '@/lib/network/types';
import { generateSwitchPorts, generateRouterPorts } from '../networkTopology.portGenerators';

interface TopologyGeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (data: {
    devices: CanvasDevice[];
    connections: CanvasConnection[];
    deviceStates: Map<string, SwitchState>;
  }) => void;
}

export function TopologyGeneratorDialog({
  open,
  onOpenChange,
  onGenerate,
}: TopologyGeneratorDialogProps) {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const isTr = language === 'tr';

  const [scenario, setScenario] = useState<'soho' | 'routing' | 'roas' | 'ospf'>('soho');
  const [pcCount, setPcCount] = useState<number>(2);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = () => {
    setIsLoading(true);

    setTimeout(() => {
      try {
        const getPortType = (id: string): 'serial' | 'fastethernet' | 'gigabitethernet' => {
          if (id.startsWith('s')) return 'serial';
          if (id.startsWith('gi')) return 'gigabitethernet';
          return 'fastethernet';
        };

        const generatedDevices: CanvasDevice[] = [];
        const generatedConnections: CanvasConnection[] = [];
        const generatedDeviceStates = new Map<string, SwitchState>();

        const MAC_POOL = [
          '0011.2233.4455',
          '0011.2233.4466',
          '0011.2233.4477',
          '0011.2233.4488',
          '0011.2233.4499',
          '0011.2233.44AA',
          '0011.2233.44BB',
          '0011.2233.44CC',
        ];

        if (scenario === 'soho') {
          // 1 Router, 1 Switch, N PCs (DHCP Configured)
          // Router coordinates: centered at top
          const rX = 350;
          const rY = 60;
          const sX = 350;
          const sY = 200;

          // Add Router
          const routerId = 'router-1';
          const router: CanvasDevice = {
            id: routerId,
            type: 'router',
            name: 'R1',
            macAddress: '0011.2233.9901',
            ip: '',
            x: rX,
            y: rY,
            status: 'online',
            ports: generateRouterPorts(),
          };
          generatedDevices.push(router);

          // Router state
          const routerState = {
            deviceType: 'router',
            hostname: 'R1',
            macAddress: '0011.2233.9901',
            switchModel: 'WS-C3650-24PS',
            switchLayer: 'L3',
            currentMode: 'user',
            commandHistory: [],
            vlanDatabase: {},
            ports: {},
            ipRouting: true,
            dhcpPools: {
              'LAN-POOL': {
                network: '192.168.1.0',
                subnetMask: '255.255.255.0',
                defaultRouter: '192.168.1.1',
                dnsServer: '8.8.8.8',
              },
            },
          } as any;
          // Initialize ports on state
          router.ports.forEach(p => {
            routerState.ports[p.id] = {
              id: p.id,
              type: getPortType(p.id),
              status: 'notconnect',
              shutdown: p.id === 'gi0/0' ? false : true, // Enable gi0/0 by default
              accessVlan: 1,
              mode: 'routed',
              ipAddress: p.id === 'gi0/0' ? '192.168.1.1' : undefined,
              subnetMask: p.id === 'gi0/0' ? '255.255.255.0' : undefined,
            };
          });
          generatedDeviceStates.set(routerId, routerState);

          // Add Switch
          const switchId = 'switch-1';
          const sw: CanvasDevice = {
            id: switchId,
            type: 'switchL2',
            name: 'SW1',
            macAddress: '0011.2233.8801',
            ip: '',
            x: sX,
            y: sY,
            status: 'online',
            switchModel: 'WS-C2960-24TT-L',
            ports: generateSwitchPorts(),
          };
          generatedDevices.push(sw);

          // Switch state
          const swState = {
            deviceType: 'switchL2',
            hostname: 'SW1',
            macAddress: '0011.2233.8801',
            switchModel: 'WS-C2960-24TT-L',
            switchLayer: 'L2',
            currentMode: 'user',
            commandHistory: [],
            vlanDatabase: { '1': 'default' },
            ports: {},
          } as any;
          sw.ports.forEach(p => {
            swState.ports[p.id] = {
              id: p.id,
              type: getPortType(p.id),
              status: 'notconnect',
              shutdown: false,
              accessVlan: 1,
              mode: 'access',
            };
          });
          generatedDeviceStates.set(switchId, swState);

          // Connect Router gi0/0 to Switch fa0/1
          generatedConnections.push({
            id: 'conn-r1-sw1',
            sourceDeviceId: routerId,
            sourcePort: 'gi0/0',
            targetDeviceId: switchId,
            targetPort: 'fa0/1',
            cableType: 'straight',
            active: true,
          });
          routerState.ports['gi0/0'].status = 'connected';
          swState.ports['fa0/1'].status = 'connected';

          // Add PCs
          const startX = 350 - ((pcCount - 1) * 120) / 2;
          for (let i = 0; i < pcCount; i++) {
            const pcId = `pc-${i + 1}`;
            const pc: CanvasDevice = {
              id: pcId,
              type: 'pc',
              name: `PC-${i + 1}`,
              macAddress: MAC_POOL[i % MAC_POOL.length],
              ip: `192.168.1.10${i}`,
              subnet: '255.255.255.0',
              gateway: '192.168.1.1',
              dns: '8.8.8.8',
              ipConfigMode: 'dhcp',
              x: startX + i * 120,
              y: 350,
              status: 'online',
              ports: [
                { id: 'eth0', label: 'Eth0', status: 'connected' },
                { id: 'com1', label: 'COM1', status: 'disconnected' },
              ],
            };
            generatedDevices.push(pc);

            // Connect PC to Switch (starting from fa0/2)
            const swPort = `fa0/${i + 2}`;
            generatedConnections.push({
              id: `conn-pc-${i + 1}`,
              sourceDeviceId: pcId,
              sourcePort: 'eth0',
              targetDeviceId: switchId,
              targetPort: swPort,
              cableType: 'straight',
              active: true,
            });
            swState.ports[swPort].status = 'connected';
          }
        } else if (scenario === 'routing') {
          // 2 Routers, 2 Switches, N PCs (Static Routing)
          // Layout:
          // R1 (250, 80) -- (Serial) -- R2 (550, 80)
          // |                           |
          // SW1 (250, 200)              SW2 (550, 200)
          // |                           |
          // PCs (150, 350)              PCs (550, 350)

          const r1Id = 'router-1';
          const r2Id = 'router-2';
          const sw1Id = 'switch-1';
          const sw2Id = 'switch-2';

          // Add R1
          const r1: CanvasDevice = {
            id: r1Id,
            type: 'router',
            name: 'R1',
            macAddress: '0011.2233.9901',
            ip: '',
            x: 250,
            y: 80,
            status: 'online',
            ports: generateRouterPorts(),
          };
          generatedDevices.push(r1);

          const r1State = {
            deviceType: 'router',
            hostname: 'R1',
            macAddress: '0011.2233.9901',
            switchModel: 'WS-C3650-24PS',
            switchLayer: 'L3',
            currentMode: 'user',
            commandHistory: [],
            vlanDatabase: {},
            ports: {},
            ipRouting: true,
            staticRoutes: [
              { destination: '192.168.2.0', subnetMask: '255.255.255.0', nextHop: '10.0.0.2' },
            ],
          } as any;
          r1.ports.forEach(p => {
            r1State.ports[p.id] = {
              id: p.id,
              type: getPortType(p.id),
              status: 'notconnect',
              shutdown: (p.id === 'gi0/0' || p.id === 's0/0/0') ? false : true,
              accessVlan: 1,
              mode: 'routed',
              ipAddress: p.id === 'gi0/0' ? '192.168.1.1' : p.id === 's0/0/0' ? '10.0.0.1' : undefined,
              subnetMask: p.id === 'gi0/0' ? '255.255.255.0' : p.id === 's0/0/0' ? '255.255.255.252' : undefined,
            };
          });
          generatedDeviceStates.set(r1Id, r1State);

          // Add R2
          const r2: CanvasDevice = {
            id: r2Id,
            type: 'router',
            name: 'R2',
            macAddress: '0011.2233.9902',
            ip: '',
            x: 550,
            y: 80,
            status: 'online',
            ports: generateRouterPorts(),
          };
          generatedDevices.push(r2);

          const r2State = {
            deviceType: 'router',
            hostname: 'R2',
            macAddress: '0011.2233.9902',
            switchModel: 'WS-C3650-24PS',
            switchLayer: 'L3',
            currentMode: 'user',
            commandHistory: [],
            vlanDatabase: {},
            ports: {},
            ipRouting: true,
            staticRoutes: [
              { destination: '192.168.1.0', subnetMask: '255.255.255.0', nextHop: '10.0.0.1' },
            ],
          } as any;
          r2.ports.forEach(p => {
            r2State.ports[p.id] = {
              id: p.id,
              type: getPortType(p.id),
              status: 'notconnect',
              shutdown: (p.id === 'gi0/0' || p.id === 's0/0/0') ? false : true,
              accessVlan: 1,
              mode: 'routed',
              ipAddress: p.id === 'gi0/0' ? '192.168.2.1' : p.id === 's0/0/0' ? '10.0.0.2' : undefined,
              subnetMask: p.id === 'gi0/0' ? '255.255.255.0' : p.id === 's0/0/0' ? '255.255.255.252' : undefined,
            };
          });
          generatedDeviceStates.set(r2Id, r2State);

          // Serial Connection between R1 and R2
          generatedConnections.push({
            id: 'conn-r1-r2-serial',
            sourceDeviceId: r1Id,
            sourcePort: 's0/0/0',
            targetDeviceId: r2Id,
            targetPort: 's0/0/0',
            cableType: 'serial',
            active: true,
          });
          r1State.ports['s0/0/0'].status = 'connected';
          r2State.ports['s0/0/0'].status = 'connected';

          // Add SW1 & SW2
          const sw1: CanvasDevice = {
            id: sw1Id,
            type: 'switchL2',
            name: 'SW1',
            macAddress: '0011.2233.8801',
            ip: '',
            x: 250,
            y: 200,
            status: 'online',
            switchModel: 'WS-C2960-24TT-L',
            ports: generateSwitchPorts(),
          };
          const sw2: CanvasDevice = {
            id: sw2Id,
            type: 'switchL2',
            name: 'SW2',
            macAddress: '0011.2233.8802',
            ip: '',
            x: 550,
            y: 200,
            status: 'online',
            switchModel: 'WS-C2960-24TT-L',
            ports: generateSwitchPorts(),
          };
          generatedDevices.push(sw1, sw2);

          const sw1State = {
            deviceType: 'switchL2', hostname: 'SW1', macAddress: '0011.2233.8801',
            switchModel: 'WS-C2960-24TT-L', switchLayer: 'L2',
            currentMode: 'user', commandHistory: [], vlanDatabase: { '1': 'default' }, ports: {}
          } as any;
          const sw2State = {
            deviceType: 'switchL2', hostname: 'SW2', macAddress: '0011.2233.8802',
            switchModel: 'WS-C2960-24TT-L', switchLayer: 'L2',
            currentMode: 'user', commandHistory: [], vlanDatabase: { '1': 'default' }, ports: {}
          } as any;

          sw1.ports.forEach(p => { sw1State.ports[p.id] = { id: p.id, type: getPortType(p.id), status: 'notconnect', shutdown: false, accessVlan: 1, mode: 'access' }; });
          sw2.ports.forEach(p => { sw2State.ports[p.id] = { id: p.id, type: getPortType(p.id), status: 'notconnect', shutdown: false, accessVlan: 1, mode: 'access' }; });

          generatedDeviceStates.set(sw1Id, sw1State);
          generatedDeviceStates.set(sw2Id, sw2State);

          // Connect Routers to Switches
          generatedConnections.push({
            id: 'conn-r1-sw1', sourceDeviceId: r1Id, sourcePort: 'gi0/0', targetDeviceId: sw1Id, targetPort: 'fa0/1', cableType: 'straight', active: true
          });
          r1State.ports['gi0/0'].status = 'connected';
          sw1State.ports['fa0/1'].status = 'connected';

          generatedConnections.push({
            id: 'conn-r2-sw2', sourceDeviceId: r2Id, sourcePort: 'gi0/0', targetDeviceId: sw2Id, targetPort: 'fa0/1', cableType: 'straight', active: true
          });
          r2State.ports['gi0/0'].status = 'connected';
          sw2State.ports['fa0/1'].status = 'connected';

          // Add PCs for R1/SW1 (VLAN 1, subnet 192.168.1.0/24)
          for (let i = 0; i < Math.max(1, Math.floor(pcCount / 2)); i++) {
            const pcId = `pc-${i + 1}`;
            const pc: CanvasDevice = {
              id: pcId,
              type: 'pc',
              name: `PC-${i + 1}`,
              macAddress: MAC_POOL[i % MAC_POOL.length],
              ip: `192.168.1.1${i + 0}`,
              subnet: '255.255.255.0',
              gateway: '192.168.1.1',
              dns: '8.8.8.8',
              ipConfigMode: 'static',
              x: 100 + i * 120,
              y: 350,
              status: 'online',
              ports: [{ id: 'eth0', label: 'Eth0', status: 'connected' }],
            };
            generatedDevices.push(pc);

            const swPort = `fa0/${i + 2}`;
            generatedConnections.push({
              id: `conn-pc-${i + 1}`, sourceDeviceId: pcId, sourcePort: 'eth0', targetDeviceId: sw1Id, targetPort: swPort, cableType: 'straight', active: true
            });
            sw1State.ports[swPort].status = 'connected';
          }

          // Add PCs for R2/SW2 (VLAN 1, subnet 192.168.2.0/24)
          const offset = Math.max(1, Math.floor(pcCount / 2));
          for (let i = 0; i < Math.max(1, Math.ceil(pcCount / 2)); i++) {
            const pcId = `pc-${offset + i + 1}`;
            const pc: CanvasDevice = {
              id: pcId,
              type: 'pc',
              name: `PC-${offset + i + 1}`,
              macAddress: MAC_POOL[(offset + i) % MAC_POOL.length],
              ip: `192.168.2.1${i + 0}`,
              subnet: '255.255.255.0',
              gateway: '192.168.2.1',
              dns: '8.8.8.8',
              ipConfigMode: 'static',
              x: 500 + i * 120,
              y: 350,
              status: 'online',
              ports: [{ id: 'eth0', label: 'Eth0', status: 'connected' }],
            };
            generatedDevices.push(pc);

            const swPort = `fa0/${i + 2}`;
            generatedConnections.push({
              id: `conn-pc-${offset + i + 1}`, sourceDeviceId: pcId, sourcePort: 'eth0', targetDeviceId: sw2Id, targetPort: swPort, cableType: 'straight', active: true
            });
            sw2State.ports[swPort].status = 'connected';
          }
        } else if (scenario === 'roas') {
          // Router-on-a-Stick: 1 Router, 1 Switch, 2 VLANs, 2 PCs
          const rX = 350;
          const rY = 60;
          const sX = 350;
          const sY = 200;

          // Add Router with subinterfaces
          const routerId = 'router-1';
          const router: CanvasDevice = {
            id: routerId,
            type: 'router',
            name: 'R1',
            macAddress: '0011.2233.9901',
            ip: '',
            x: rX,
            y: rY,
            status: 'online',
            ports: generateRouterPorts(),
          };
          generatedDevices.push(router);

          const routerState = {
            deviceType: 'router',
            hostname: 'R1',
            macAddress: '0011.2233.9901',
            switchModel: 'WS-C3650-24PS',
            switchLayer: 'L3',
            currentMode: 'user',
            commandHistory: [],
            vlanDatabase: {},
            ports: {},
            ipRouting: true,
          } as any;
          router.ports.forEach(p => {
            routerState.ports[p.id] = {
              id: p.id,
              type: getPortType(p.id),
              status: 'notconnect',
              shutdown: p.id === 'gi0/0' ? false : true,
              accessVlan: 1,
              mode: 'routed',
            };
          });
          // Add subinterfaces for VLAN 10 and 20
          routerState.ports['gi0/0.10'] = {
            id: 'gi0/0.10',
            type: getPortType('gi0/0.10'),
            status: 'connected',
            shutdown: false,
            accessVlan: 10,
            mode: 'routed',
            ipAddress: '192.168.10.1',
            subnetMask: '255.255.255.0',
          };
          routerState.ports['gi0/0.20'] = {
            id: 'gi0/0.20',
            type: getPortType('gi0/0.20'),
            status: 'connected',
            shutdown: false,
            accessVlan: 20,
            mode: 'routed',
            ipAddress: '192.168.20.1',
            subnetMask: '255.255.255.0',
          };
          generatedDeviceStates.set(routerId, routerState);

          // Add Switch
          const switchId = 'switch-1';
          const sw: CanvasDevice = {
            id: switchId,
            type: 'switchL2',
            name: 'SW1',
            macAddress: '0011.2233.8801',
            ip: '',
            x: sX,
            y: sY,
            status: 'online',
            switchModel: 'WS-C2960-24TT-L',
            ports: generateSwitchPorts(),
          };
          generatedDevices.push(sw);

          const swState = {
            deviceType: 'switchL2',
            hostname: 'SW1',
            macAddress: '0011.2233.8801',
            switchModel: 'WS-C2960-24TT-L',
            switchLayer: 'L2',
            currentMode: 'user',
            commandHistory: [],
            vlanDatabase: { '1': 'default', '10': 'Sales', '20': 'Marketing' },
            ports: {},
          } as any;
          sw.ports.forEach(p => {
            swState.ports[p.id] = {
              id: p.id,
              type: getPortType(p.id),
              status: 'notconnect',
              shutdown: false,
              accessVlan: p.id === 'fa0/2' ? 10 : p.id === 'fa0/3' ? 20 : 1,
              mode: p.id === 'fa0/1' ? 'trunk' : 'access',
            };
          });
          generatedDeviceStates.set(switchId, swState);

          // Connect Router to Switch (Trunk link)
          generatedConnections.push({
            id: 'conn-r1-sw1',
            sourceDeviceId: routerId,
            sourcePort: 'gi0/0',
            targetDeviceId: switchId,
            targetPort: 'fa0/1',
            cableType: 'straight',
            active: true,
          });
          routerState.ports['gi0/0'].status = 'connected';
          swState.ports['fa0/1'].status = 'connected';

          // Add PC 1 (VLAN 10)
          const pc1Id = 'pc-1';
          const pc1: CanvasDevice = {
            id: pc1Id,
            type: 'pc',
            name: 'PC-1',
            macAddress: '0011.2233.1111',
            ip: '192.168.10.10',
            subnet: '255.255.255.0',
            gateway: '192.168.10.1',
            dns: '8.8.8.8',
            ipConfigMode: 'static',
            vlan: 10,
            x: 200,
            y: 350,
            status: 'online',
            ports: [{ id: 'eth0', label: 'Eth0', status: 'connected' }],
          };
          generatedDevices.push(pc1);

          generatedConnections.push({
            id: 'conn-pc1',
            sourceDeviceId: pc1Id,
            sourcePort: 'eth0',
            targetDeviceId: switchId,
            targetPort: 'fa0/2',
            cableType: 'straight',
            active: true,
          });
          swState.ports['fa0/2'].status = 'connected';

          // Add PC 2 (VLAN 20)
          const pc2Id = 'pc-2';
          const pc2: CanvasDevice = {
            id: pc2Id,
            type: 'pc',
            name: 'PC-2',
            macAddress: '0011.2233.2222',
            ip: '192.168.20.10',
            subnet: '255.255.255.0',
            gateway: '192.168.20.1',
            dns: '8.8.8.8',
            ipConfigMode: 'static',
            vlan: 20,
            x: 500,
            y: 350,
            status: 'online',
            ports: [{ id: 'eth0', label: 'Eth0', status: 'connected' }],
          };
          generatedDevices.push(pc2);

          generatedConnections.push({
            id: 'conn-pc2',
            sourceDeviceId: pc2Id,
            sourcePort: 'eth0',
            targetDeviceId: switchId,
            targetPort: 'fa0/3',
            cableType: 'straight',
            active: true,
          });
          swState.ports['fa0/3'].status = 'connected';
        } else if (scenario === 'ospf') {
          // OSPF Dynamic Routing: 2 Routers, 2 LANs
          const r1Id = 'router-1';
          const r2Id = 'router-2';
          const sw1Id = 'switch-1';
          const sw2Id = 'switch-2';

          // R1
          const r1: CanvasDevice = {
            id: r1Id,
            type: 'router',
            name: 'R1',
            macAddress: '0011.2233.9901',
            ip: '',
            x: 250,
            y: 80,
            status: 'online',
            ports: generateRouterPorts(),
          };
          generatedDevices.push(r1);

          const r1State = {
            deviceType: 'router',
            hostname: 'R1',
            macAddress: '0011.2233.9901',
            switchModel: 'WS-C3650-24PS',
            switchLayer: 'L3',
            currentMode: 'user',
            commandHistory: [],
            vlanDatabase: {},
            ports: {},
            ipRouting: true,
            routingProtocol: 'ospf',
            ospfProcessId: '1',
            routerId: '1.1.1.1',
            dynamicRoutes: [
              { destination: '192.168.1.0', subnetMask: '0.0.0.255', area: 0 },
              { destination: '10.0.0.0', subnetMask: '0.0.0.3', area: 0 },
            ],
          } as any;
          r1.ports.forEach(p => {
            r1State.ports[p.id] = {
              id: p.id,
              type: getPortType(p.id),
              status: 'notconnect',
              shutdown: (p.id === 'gi0/0' || p.id === 's0/0/0') ? false : true,
              accessVlan: 1,
              mode: 'routed',
              ipAddress: p.id === 'gi0/0' ? '192.168.1.1' : p.id === 's0/0/0' ? '10.0.0.1' : undefined,
              subnetMask: p.id === 'gi0/0' ? '255.255.255.0' : p.id === 's0/0/0' ? '255.255.255.252' : undefined,
            };
          });
          generatedDeviceStates.set(r1Id, r1State);

          // R2
          const r2: CanvasDevice = {
            id: r2Id,
            type: 'router',
            name: 'R2',
            macAddress: '0011.2233.9902',
            ip: '',
            x: 550,
            y: 80,
            status: 'online',
            ports: generateRouterPorts(),
          };
          generatedDevices.push(r2);

          const r2State = {
            deviceType: 'router',
            hostname: 'R2',
            macAddress: '0011.2233.9902',
            switchModel: 'WS-C3650-24PS',
            switchLayer: 'L3',
            currentMode: 'user',
            commandHistory: [],
            vlanDatabase: {},
            ports: {},
            ipRouting: true,
            routingProtocol: 'ospf',
            ospfProcessId: '1',
            routerId: '2.2.2.2',
            dynamicRoutes: [
              { destination: '192.168.2.0', subnetMask: '0.0.0.255', area: 0 },
              { destination: '10.0.0.0', subnetMask: '0.0.0.3', area: 0 },
            ],
          } as any;
          r2.ports.forEach(p => {
            r2State.ports[p.id] = {
              id: p.id,
              type: getPortType(p.id),
              status: 'notconnect',
              shutdown: (p.id === 'gi0/0' || p.id === 's0/0/0') ? false : true,
              accessVlan: 1,
              mode: 'routed',
              ipAddress: p.id === 'gi0/0' ? '192.168.2.1' : p.id === 's0/0/0' ? '10.0.0.2' : undefined,
              subnetMask: p.id === 'gi0/0' ? '255.255.255.0' : p.id === 's0/0/0' ? '255.255.255.252' : undefined,
            };
          });
          generatedDeviceStates.set(r2Id, r2State);

          // Serial Connection
          generatedConnections.push({
            id: 'conn-r1-r2-serial',
            sourceDeviceId: r1Id,
            sourcePort: 's0/0/0',
            targetDeviceId: r2Id,
            targetPort: 's0/0/0',
            cableType: 'serial',
            active: true,
          });
          r1State.ports['s0/0/0'].status = 'connected';
          r2State.ports['s0/0/0'].status = 'connected';

          // Add SW1 & SW2
          const sw1: CanvasDevice = {
            id: sw1Id,
            type: 'switchL2',
            name: 'SW1',
            macAddress: '0011.2233.8801',
            ip: '',
            x: 250,
            y: 200,
            status: 'online',
            switchModel: 'WS-C2960-24TT-L',
            ports: generateSwitchPorts(),
          };
          const sw2: CanvasDevice = {
            id: sw2Id,
            type: 'switchL2',
            name: 'SW2',
            macAddress: '0011.2233.8802',
            ip: '',
            x: 550,
            y: 200,
            status: 'online',
            switchModel: 'WS-C2960-24TT-L',
            ports: generateSwitchPorts(),
          };
          generatedDevices.push(sw1, sw2);

          const sw1State = {
            deviceType: 'switchL2', hostname: 'SW1', macAddress: '0011.2233.8801',
            switchModel: 'WS-C2960-24TT-L', switchLayer: 'L2',
            currentMode: 'user', commandHistory: [], vlanDatabase: { '1': 'default' }, ports: {}
          } as any;
          const sw2State = {
            deviceType: 'switchL2', hostname: 'SW2', macAddress: '0011.2233.8802',
            switchModel: 'WS-C2960-24TT-L', switchLayer: 'L2',
            currentMode: 'user', commandHistory: [], vlanDatabase: { '1': 'default' }, ports: {}
          } as any;

          sw1.ports.forEach(p => { sw1State.ports[p.id] = { id: p.id, type: getPortType(p.id), status: 'notconnect', shutdown: false, accessVlan: 1, mode: 'access' }; });
          sw2.ports.forEach(p => { sw2State.ports[p.id] = { id: p.id, type: getPortType(p.id), status: 'notconnect', shutdown: false, accessVlan: 1, mode: 'access' }; });

          generatedDeviceStates.set(sw1Id, sw1State);
          generatedDeviceStates.set(sw2Id, sw2State);

          // Connect R1 -> SW1 & R2 -> SW2
          generatedConnections.push({
            id: 'conn-r1-sw1', sourceDeviceId: r1Id, sourcePort: 'gi0/0', targetDeviceId: sw1Id, targetPort: 'fa0/1', cableType: 'straight', active: true
          });
          r1State.ports['gi0/0'].status = 'connected';
          sw1State.ports['fa0/1'].status = 'connected';

          generatedConnections.push({
            id: 'conn-r2-sw2', sourceDeviceId: r2Id, sourcePort: 'gi0/0', targetDeviceId: sw2Id, targetPort: 'fa0/1', cableType: 'straight', active: true
          });
          r2State.ports['gi0/0'].status = 'connected';
          sw2State.ports['fa0/1'].status = 'connected';

          // Add PCs (VLAN 1, subnet 192.168.1.0/24 & 192.168.2.0/24)
          for (let i = 0; i < Math.max(1, Math.floor(pcCount / 2)); i++) {
            const pcId = `pc-${i + 1}`;
            const pc: CanvasDevice = {
              id: pcId,
              type: 'pc',
              name: `PC-${i + 1}`,
              macAddress: MAC_POOL[i % MAC_POOL.length],
              ip: `192.168.1.1${i}`,
              subnet: '255.255.255.0',
              gateway: '192.168.1.1',
              dns: '8.8.8.8',
              ipConfigMode: 'static',
              x: 100 + i * 120,
              y: 350,
              status: 'online',
              ports: [{ id: 'eth0', label: 'Eth0', status: 'connected' }],
            };
            generatedDevices.push(pc);

            const swPort = `fa0/${i + 2}`;
            generatedConnections.push({
              id: `conn-pc-${i + 1}`, sourceDeviceId: pcId, sourcePort: 'eth0', targetDeviceId: sw1Id, targetPort: swPort, cableType: 'straight', active: true
            });
            sw1State.ports[swPort].status = 'connected';
          }

          const offset = Math.max(1, Math.floor(pcCount / 2));
          for (let i = 0; i < Math.max(1, Math.ceil(pcCount / 2)); i++) {
            const pcId = `pc-${offset + i + 1}`;
            const pc: CanvasDevice = {
              id: pcId,
              type: 'pc',
              name: `PC-${offset + i + 1}`,
              macAddress: MAC_POOL[(offset + i) % MAC_POOL.length],
              ip: `192.168.2.1${i}`,
              subnet: '255.255.255.0',
              gateway: '192.168.2.1',
              dns: '8.8.8.8',
              ipConfigMode: 'static',
              x: 500 + i * 120,
              y: 350,
              status: 'online',
              ports: [{ id: 'eth0', label: 'Eth0', status: 'connected' }],
            };
            generatedDevices.push(pc);

            const swPort = `fa0/${i + 2}`;
            generatedConnections.push({
              id: `conn-pc-${offset + i + 1}`, sourceDeviceId: pcId, sourcePort: 'eth0', targetDeviceId: sw2Id, targetPort: swPort, cableType: 'straight', active: true
            });
            sw2State.ports[swPort].status = 'connected';
          }
        }

        onGenerate({
          devices: generatedDevices,
          connections: generatedConnections,
          deviceStates: generatedDeviceStates,
        });

        toast({
          title: isTr ? 'Topoloji Üretildi! 🚀' : 'Topology Generated! 🚀',
          description: isTr
            ? 'Topoloji başarıyla oluşturuldu ve özet notu eklendi.'
            : 'Topology successfully generated and summary note added.',
        });

        onOpenChange(false);
      } catch (err) {
        toast({
          title: isTr ? 'Hata' : 'Error',
          description: String(err),
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }, 400);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${isDark ? 'bg-secondary-900 border-success-500/30 text-white' : 'bg-white border-success-500 text-secondary-900'} sm:max-w-md rounded-none md:rounded-3xl shadow-2xl`}>
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-purple-500 animate-pulse" />
            {isTr ? 'Otomatik Topoloji Üretici' : 'Automatic Topology Generator'}
          </DialogTitle>
          <DialogDescription className={isDark ? 'text-secondary-400' : 'text-secondary-500'}>
            {isTr
              ? 'Rastgele veya parametrik olarak hazır ağ senaryoları ve cihaz yapılandırmaları oluşturun.'
              : 'Parametrically generate complete network topologies and active device configurations.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {/* Scenario Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">{isTr ? 'Ağ Senaryosu' : 'Network Scenario'}</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={scenario === 'soho' ? 'default' : 'outline'}
                className="h-10 text-xs flex items-center gap-1.5"
                onClick={() => setScenario('soho')}
              >
                <Server className="w-3.5 h-3.5" />
                <span>SOHO (DHCP)</span>
              </Button>
              <Button
                variant={scenario === 'routing' ? 'default' : 'outline'}
                className="h-10 text-xs flex items-center gap-1.5"
                onClick={() => setScenario('routing')}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>{isTr ? 'Statik Yönlendirme' : 'Static Routing'}</span>
              </Button>
              <Button
                variant={scenario === 'roas' ? 'default' : 'outline'}
                className="h-10 text-xs flex items-center gap-1.5"
                onClick={() => setScenario('roas')}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>ROAS (Inter-VLAN)</span>
              </Button>
              <Button
                variant={scenario === 'ospf' ? 'default' : 'outline'}
                className="h-10 text-xs flex items-center gap-1.5"
                onClick={() => setScenario('ospf')}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>OSPF (Dynamic)</span>
              </Button>
            </div>
          </div>

          {/* PC Count */}
          {scenario !== 'roas' && (
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">{isTr ? 'PC Sayısı' : 'PC Count'}</Label>
              <div className="flex gap-2">
                {[1, 2, 4].map(num => (
                  <Button
                    key={num}
                    variant={pcCount === num ? 'default' : 'outline'}
                    className="flex-1 h-9 text-xs"
                    onClick={() => setPcCount(num)}
                  >
                    <Monitor className="w-3.5 h-3.5 mr-1" />
                    {num} PC
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end mt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isLoading}>
            {t.cancel}
          </Button>
          <Button onClick={handleGenerate} className="bg-purple-600 hover:bg-purple-700 text-white font-bold" disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Wand2 className="w-4 h-4 mr-1" />}
            {isTr ? 'Üret' : 'Generate'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
