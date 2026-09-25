'use client';

import { useEffect, useRef } from 'react';
import type { CanvasDevice, CanvasConnection } from '@/components/network/NetworkTopology/types/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import { dispatchCapturedPackets } from '@/utils/packetCapture';
import { runNetworkEventPipeline } from '@/lib/network/forwarding/eventPipeline';
import { checkConnectivity } from '@/lib/network/connectivity/pathResolution';
import { useAppStore } from '@/lib/store/appStore';

/**
 * Protocol engines write their per-device feature flags onto the shared
 * `SwitchState` at runtime, but those fields are not declared on it. The
 * periodic probes below assert the extension shape once, here, instead of
 * casting each expression through `unknown` — the same `SwitchState & { ... }`
 * pattern already used in `src/lib/network/snmp.ts`.
 *
 * `routingProtocol`, `ospfProcessId` and `eigrpAs` are declared on
 * `SwitchState` and so are not repeated. `ospfEnabled` / `ospfArea` are
 * declared on the per-port type in `src/lib/network/types/ports.ts`, which is
 * a different object from the device state probed here.
 */
type ProtocolProbeState = SwitchState & {
  ospfEnabled?: boolean;
  ospfArea?: string;
  mqttClients?: Record<string, { connected: boolean }>;
  coapResources?: Record<string, string>;
  snmpv3Users?: Record<string, unknown>;
  netconfSessions?: Record<string, { established: boolean }>;
};

interface UsePeriodicNetworkPacketsOptions {
  devices: CanvasDevice[];
  connections: CanvasConnection[];
  deviceStates?: Map<string, SwitchState>;
  onDeviceStatesChange?: (updater: (previous: Map<string, SwitchState>) => Map<string, SwitchState>) => void;
}

export function usePeriodicNetworkPackets({
  devices,
  connections,
  deviceStates,
  onDeviceStatesChange,
}: UsePeriodicNetworkPacketsOptions) {
  const devicesRef = useRef(devices);
  const connectionsRef = useRef(connections);
  const deviceStatesRef = useRef(deviceStates);

  useEffect(() => {
    devicesRef.current = devices;
    connectionsRef.current = connections;
    deviceStatesRef.current = deviceStates;
  }, [devices, connections, deviceStates]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Periodic timer every 2 seconds for active VoIP call connectivity validation and 10 seconds for protocols
    const interval = setInterval(() => {
      const executePeriodicPass = () => {
        const currentDevices = devicesRef.current;
        const currentConnections = connectionsRef.current;
        const currentStates = deviceStatesRef.current;

        if (!currentDevices.length) return;

      // 1. Audit all activeVoipCalls across topology devices: if network connectivity is broken, clear activeVoipCall on BOTH sides
      const devicesToDisconnect = new Set<string>();
      currentDevices.forEach(dev => {
        if (dev.activeVoipCall) {
          const activeVoip = dev.activeVoipCall;
          const callerId = activeVoip.callerId;
          const peerDev = currentDevices.find(d =>
            d.id !== dev.id && (
              d.id === callerId ||
              d.activeVoipCall?.callerId === dev.id ||
              (d.activeVoipCall && d.activeVoipCall.callerId === callerId)
            )
          );

          if (!peerDev || dev.status === 'offline' || peerDev.status === 'offline') {
            devicesToDisconnect.add(dev.id);
            if (peerDev) devicesToDisconnect.add(peerDev.id);
          } else {
            const targetIp = peerDev.ip || activeVoip.callerIp;
            if (targetIp) {
              const res = checkConnectivity(
                dev.id,
                targetIp,
                currentDevices,
                currentConnections,
                currentStates,
                'tr',
                { protocol: 'udp', port: '5060' }
              );
              if (!res.success) {
                devicesToDisconnect.add(dev.id);
                devicesToDisconnect.add(peerDev.id);
              }
            }
          }
        }
      });

      if (devicesToDisconnect.size > 0) {
        const setDevices = useAppStore.getState().setDevices;
        setDevices(
          currentDevices.map(d => {
            if (devicesToDisconnect.has(d.id)) {
              return {
                ...d,
                activeVoipCall: undefined
              };
            }
            return d;
          })
        );
      }

      const packetsToDispatch: Array<{
        connectionId: string;
        sourceIp: string;
        targetIp: string;
        protocol: string;
        length: number;
        info: string;
      }> = [];

      let updatedStates: Map<string, SwitchState> | undefined;

      // Run Unified Network Event Pipeline (STP, ARP, DHCP, OSPF, EIGRP, IP SLA)
      if (currentStates) {
        const pipelineRes = runNetworkEventPipeline(currentStates, currentDevices, currentConnections);
        updatedStates = pipelineRes.updatedStates;
        packetsToDispatch.push(...pipelineRes.dispatchedPackets);

        const pendingLogs: Array<{ level: 'info' | 'warning' | 'error'; category: string; message: string; detail?: string }> = [];

        // Surface OSPF/EIGRP adjacency state changes into the Network Event Log timeline
        if (pipelineRes.protocolEvents && pipelineRes.protocolEvents.length > 0) {
          for (const ev of pipelineRes.protocolEvents) {
            pendingLogs.push({
              level: ev.level,
              category: ev.protocol,
              message: ev.message,
              detail: `${ev.deviceId} | neighbor ${ev.neighbor}`,
            });
          }
        }

        // Surface real-time ARP/MAC aging events (entries timed out) into the timeline
        if (pipelineRes.agingEvents && pipelineRes.agingEvents.length > 0) {
          for (const ev of pipelineRes.agingEvents) {
            pendingLogs.push({
              level: ev.level,
              category: ev.category,
              message: ev.message,
              detail: ev.detail,
            });
          }
        }

        if (pendingLogs.length > 0) {
          useAppStore.getState().addNetworkEventLogs(pendingLogs);
        }
      }



      if (updatedStates && onDeviceStatesChange) {
        onDeviceStatesChange(previous => {
          const next = new Map(previous);
          updatedStates!.forEach((updatedState, deviceId) => next.set(deviceId, updatedState));
          return next;
        });
      }

      currentConnections.forEach(conn => {
        if (conn.active === false) return;
        const connId = conn.id || `${conn.sourceDeviceId}-${conn.targetDeviceId}`;
        const devA = currentDevices.find(d => d.id === conn.sourceDeviceId);
        const devB = currentDevices.find(d => d.id === conn.targetDeviceId);

        if (!devA || !devB || devA.status === 'offline' || devB.status === 'offline') return;

        const stateA = currentStates?.get(devA.id);
        const stateB = currentStates?.get(devB.id);

        // Hub L1 Flood: When a hub is involved in a connection, signal is repeated
        // on ALL other hub ports. Emit a flood packet on every sibling hub connection.
        const hubDevice = devA.type === 'hub' ? devA : devB.type === 'hub' ? devB : null;
        const nonHubDevice = hubDevice === devA ? devB : hubDevice === devB ? devA : null;
        if (hubDevice && nonHubDevice) {
          // Find all other connections of this hub (sibling ports)
          currentConnections.forEach(sibConn => {
            if (sibConn.active === false) return;
            if (sibConn.id === connId) return; // Skip the ingress connection itself
            const sibIsSource = sibConn.sourceDeviceId === hubDevice.id;
            const sibIsTarget = sibConn.targetDeviceId === hubDevice.id;
            if (!sibIsSource && !sibIsTarget) return;
            const sibConnId = sibConn.id || `${sibConn.sourceDeviceId}-${sibConn.targetDeviceId}`;
            const sibNeighborId = sibIsSource ? sibConn.targetDeviceId : sibConn.sourceDeviceId;
            const sibNeighbor = currentDevices.find(d => d.id === sibNeighborId);
            if (!sibNeighbor || sibNeighbor.status === 'offline') return;
            packetsToDispatch.push({
              connectionId: sibConnId,
              sourceIp: nonHubDevice.ip || nonHubDevice.macAddress || nonHubDevice.name,
              targetIp: 'FF:FF:FF:FF:FF:FF',
              protocol: 'ETH',
              length: 64,
              info: `Hub L1 Flood: Signal from ${nonHubDevice.name} repeated on all ports`,
            });
          });
        }

        // 1. CDP / LLDP Periodic Packets (Switch/Router every 10s)
        if (
          (devA.type === 'switchL2' || devA.type === 'switchL3' || devA.type === 'router') &&
          stateA?.cdpEnabled !== false
        ) {
          packetsToDispatch.push({
            connectionId: connId,
            sourceIp: devA.ip || stateA?.hostname || devA.name,
            targetIp: '01:00:0C:CC:CC:CC',
            protocol: 'CDP',
            length: 180,
            info: `CDP Announcement: Device ${devA.name} Port ${conn.sourcePort}`,
          });
        }

        if (
          (devB.type === 'switchL2' || devB.type === 'switchL3' || devB.type === 'router') &&
          stateB?.cdpEnabled !== false
        ) {
          packetsToDispatch.push({
            connectionId: connId,
            sourceIp: devB.ip || stateB?.hostname || devB.name,
            targetIp: '01:00:0C:CC:CC:CC',
            protocol: 'CDP',
            length: 180,
            info: `CDP Announcement: Device ${devB.name} Port ${conn.targetPort}`,
          });
        }

        // LLDP
        if (
          (devA.type === 'switchL2' || devA.type === 'switchL3' || devA.type === 'router') &&
          stateA?.lldpEnabled === true
        ) {
          packetsToDispatch.push({
            connectionId: connId,
            sourceIp: devA.ip || stateA?.hostname || devA.name,
            targetIp: '01:80:C2:00:00:0E',
            protocol: 'LLDP',
            length: 150,
            info: `LLDP Announcement: Device ${devA.name} Port ${conn.sourcePort}${stateA?.lldpMed ? ` MED TLVs: ${Object.keys(stateA.lldpMed).filter(k => stateA.lldpMed?.[k as keyof NonNullable<typeof stateA.lldpMed>]).join(', ')}` : ''}`,
          });
        }

        if (
          (devB.type === 'switchL2' || devB.type === 'switchL3' || devB.type === 'router') &&
          stateB?.lldpEnabled === true
        ) {
          packetsToDispatch.push({
            connectionId: connId,
            sourceIp: devB.ip || stateB?.hostname || devB.name,
            targetIp: '01:80:C2:00:00:0E',
            protocol: 'LLDP',
            length: 150,
            info: `LLDP Announcement: Device ${devB.name} Port ${conn.targetPort}${stateB?.lldpMed ? ` MED TLVs: ${Object.keys(stateB.lldpMed).filter(k => stateB.lldpMed?.[k as keyof NonNullable<typeof stateB.lldpMed>]).join(', ')}` : ''}`,
          });
        }

        // 2. OSPF Hello Periodic Packets (Router/SwitchL3 with OSPF enabled)
        const stA = stateA as ProtocolProbeState | undefined;
        const stB = stateB as ProtocolProbeState | undefined;

        const isOspfA = (devA.type === 'router' || devA.type === 'switchL3') && (stA?.ospfEnabled || stA?.routingProtocol === 'ospf');
        if (isOspfA) {
          packetsToDispatch.push({
            connectionId: connId,
            sourceIp: devA.ip || '192.168.1.1',
            targetIp: '224.0.0.5',
            protocol: 'OSPF',
            length: 64,
            info: `OSPF Hello: Router ${devA.name} Process ${stA?.ospfProcessId || '1'} Area ${stA?.ospfArea || '0'}`,
          });
        }

        const isOspfB = (devB.type === 'router' || devB.type === 'switchL3') && (stB?.ospfEnabled || stB?.routingProtocol === 'ospf');
        if (isOspfB) {
          packetsToDispatch.push({
            connectionId: connId,
            sourceIp: devB.ip || '192.168.1.2',
            targetIp: '224.0.0.5',
            protocol: 'OSPF',
            length: 64,
            info: `OSPF Hello: Router ${devB.name} Process ${stB?.ospfProcessId || '1'} Area ${stB?.ospfArea || '0'}`,
          });
        }

        // 3. EIGRP / RIP Periodic Updates
        if (stateA?.routingProtocol === 'rip') {
          packetsToDispatch.push({
            connectionId: connId,
            sourceIp: devA.ip || '192.168.1.1',
            targetIp: '224.0.0.9',
            protocol: 'RIP',
            length: 52,
            info: `RIPv2 Update: Router ${devA.name} routing table broadcast`,
          });
        }
        if (stateA?.routingProtocol === 'eigrp') {
          const eigrpAsNum = (stateA as ProtocolProbeState | undefined)?.eigrpAs || '100';
          packetsToDispatch.push({
            connectionId: connId,
            sourceIp: devA.ip || '192.168.1.1',
            targetIp: '224.0.0.10',
            protocol: 'EIGRP',
            length: 60,
            info: `EIGRP Hello: AS ${eigrpAsNum} from ${devA.name}`,
          });
        }

        // 4. WLAN / Access Point Beacon Frame Periodic Packets
        if (devA.type === 'wlc') {
          packetsToDispatch.push({
            connectionId: connId,
            sourceIp: devA.macAddress || devA.name,
            targetIp: 'FF:FF:FF:FF:FF:FF',
            protocol: 'UDP',
            length: 128,
            info: `WLAN Beacon: SSID "${devA.name}-WiFi" Channel 6`,
          });
        }

        // 5. MQTT: Broker keepalive PINGREQ/PINGRESP for IoT devices
        const mqttStateA = stateA as ProtocolProbeState | undefined;
        const mqttStateB = stateB as ProtocolProbeState | undefined;
        if (mqttStateA?.mqttClients && Object.values(mqttStateA.mqttClients).some(c => c.connected)) {
          packetsToDispatch.push({
            connectionId: connId,
            sourceIp: devA.ip || devA.name,
            targetIp: devB.ip || devB.name,
            protocol: 'TCP',
            length: 2,
            info: `MQTT PINGREQ: Client keepalive from ${devA.name} → broker (TCP/1883)`,
          });
          packetsToDispatch.push({
            connectionId: connId,
            sourceIp: devB.ip || devB.name,
            targetIp: devA.ip || devA.name,
            protocol: 'TCP',
            length: 2,
            info: `MQTT PINGRESP: Broker ${devB.name} → client keepalive ACK (TCP/1883)`,
          });
        }
        if (mqttStateB?.mqttClients && Object.values(mqttStateB.mqttClients).some(c => c.connected)) {
          packetsToDispatch.push({
            connectionId: connId,
            sourceIp: devB.ip || devB.name,
            targetIp: devA.ip || devA.name,
            protocol: 'TCP',
            length: 2,
            info: `MQTT PINGREQ: Client keepalive from ${devB.name} → broker (TCP/1883)`,
          });
        }

        // 6. CoAP: Confirmable ping for IoT resource polling
        const coapStateA = stateA as ProtocolProbeState | undefined;
        const coapStateB = stateB as ProtocolProbeState | undefined;
        if (coapStateA?.coapResources && Object.keys(coapStateA.coapResources).length > 0) {
          const resource = Object.keys(coapStateA.coapResources)[0];
          packetsToDispatch.push({
            connectionId: connId,
            sourceIp: devA.ip || devA.name,
            targetIp: devB.ip || devB.name,
            protocol: 'UDP',
            length: 12,
            info: `CoAP CON GET ${resource}: ${devA.name} → server ${devB.name} (UDP/5683)`,
          });
        }
        if (coapStateB?.coapResources && Object.keys(coapStateB.coapResources).length > 0) {
          const resource = Object.keys(coapStateB.coapResources)[0];
          packetsToDispatch.push({
            connectionId: connId,
            sourceIp: devB.ip || devB.name,
            targetIp: devA.ip || devA.name,
            protocol: 'UDP',
            length: 12,
            info: `CoAP CON GET ${resource}: ${devB.name} → server ${devA.name} (UDP/5683)`,
          });
        }

        // 7. SNMP: Periodic polling if SNMP communities configured
        if (stateA?.snmpCommunities && Object.keys(stateA.snmpCommunities).length > 0) {
          const community = Object.keys(stateA.snmpCommunities)[0];
          packetsToDispatch.push({
            connectionId: connId,
            sourceIp: devB.ip || devB.name,
            targetIp: devA.ip || devA.name,
            protocol: 'UDP',
            length: 40,
            info: `SNMPv2c GET: community "${community}" OID .1.3.6.1.2.1.1.3.0 (sysUpTime) → ${devA.name}`,
          });
          packetsToDispatch.push({
            connectionId: connId,
            sourceIp: devA.ip || devA.name,
            targetIp: devB.ip || devB.name,
            protocol: 'UDP',
            length: 56,
            info: `SNMPv2c RESPONSE: ${devA.name} sysUpTime reply (UDP/161)`,
          });
        }
        const snmpv3StateA = stateA as ProtocolProbeState | undefined;
        if (snmpv3StateA?.snmpv3Users && Object.keys(snmpv3StateA.snmpv3Users).length > 0) {
          const user = Object.keys(snmpv3StateA.snmpv3Users)[0];
          packetsToDispatch.push({
            connectionId: connId,
            sourceIp: devB.ip || devB.name,
            targetIp: devA.ip || devA.name,
            protocol: 'UDP',
            length: 88,
            info: `SNMPv3 authPriv GET: user "${user}" OID .1.3.6.1.2.1.1.5.0 (sysName) → ${devA.name}`,
          });
        }

        // 8. NETCONF: Session keepalive / RPC heartbeat
        const netconfStateA = stateA as ProtocolProbeState | undefined;
        const netconfStateB = stateB as ProtocolProbeState | undefined;
        const activeSessionA = Object.entries(netconfStateA?.netconfSessions || {}).find(([, s]) => s.established);
        if (activeSessionA) {
          packetsToDispatch.push({
            connectionId: connId,
            sourceIp: activeSessionA[0],
            targetIp: devA.ip || devA.name,
            protocol: 'TCP',
            length: 60,
            info: `NETCONF RPC: <get> session active on ${devA.name} from ${activeSessionA[0]} (TCP/830)`,
          });
        }
        const activeSessionB = Object.entries(netconfStateB?.netconfSessions || {}).find(([, s]) => s.established);
        if (activeSessionB) {
          packetsToDispatch.push({
            connectionId: connId,
            sourceIp: activeSessionB[0],
            targetIp: devB.ip || devB.name,
            protocol: 'TCP',
            length: 60,
            info: `NETCONF RPC: <get> session active on ${devB.name} from ${activeSessionB[0]} (TCP/830)`,
          });
        }

        // 9. IPsec IKE Phase 1 Negotiation / Maintenance
        if (stateA?.cryptoIsakmpPolicies && Object.keys(stateA.cryptoIsakmpPolicies).length > 0) {
          const peerIp = Object.keys(stateA.cryptoIsakmpKeys || {})[0];
          if (peerIp) {
            packetsToDispatch.push({
              connectionId: connId,
              sourceIp: devA.ip || devA.name,
              targetIp: peerIp,
              protocol: 'UDP',
              length: 228,
              info: `IKE Phase 1: ISAKMP Main Mode from ${devA.name} → peer ${peerIp} (UDP/500)`,
            });
          }
        }

        // 10. BGP OPEN / KEEPALIVE on established peers
        if (stateA?.bgpNeighbors && stateA.bgpNeighbors.length > 0) {
          for (const nbr of stateA.bgpNeighbors) {
            const nbrState = stateA.bgpNeighborState?.[nbr.ip] || nbr.state;
            if (!nbrState || nbrState !== 'Established') continue;
            packetsToDispatch.push({
              connectionId: connId,
              sourceIp: devA.ip || devA.name,
              targetIp: nbr.ip,
              protocol: 'TCP',
              length: 19,
              info: `BGP KEEPALIVE: AS${stateA.bgpAs} → neighbor ${nbr.ip} (AS${nbr.remoteAs ?? nbr.as}) (TCP/179)`,
            });
          }
        }
      });

      if (packetsToDispatch.length > 0) {
        dispatchCapturedPackets(packetsToDispatch);
      }
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      window.requestIdleCallback(() => executePeriodicPass(), { timeout: 1000 });
    } else {
      setTimeout(executePeriodicPass, 0);
    }
  }, 10000);


    return () => clearInterval(interval);
  }, [onDeviceStatesChange]);
}