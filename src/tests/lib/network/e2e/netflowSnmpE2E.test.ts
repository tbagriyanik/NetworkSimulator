import { describe, it, expect } from 'vitest';
import {
  captureNetFlow,
  buildNetflowExportFrame,
  interfaceTracksFlows,
} from '@/lib/network/forwarding/netflowEngine';
import {
  processSnmpPacket,
  getDeviceSnmpOids,
  SnmpPacket,
} from '@/lib/network/snmp';
import type { SwitchState } from '@/lib/network/types';
import type { NetworkPacketFrame } from '@/lib/network/forwarding/packetFrame';

describe('NetFlow & SNMP Telemetry E2E Pipeline', () => {
  describe('NetFlow Data Plane Accounting & Export', () => {
    it('captures routed IP flow into cache and produces NetFlow v5/v9 UDP 2055 export packets', () => {
      const routerState = {
        hostname: 'Border-Router',
        macAddress: '00:11:22:33:44:00',
        flowMonitors: {
          'FLOW-MON-WAN': {
            record: 'NETFLOW-ORIGINAL',
            exporter: 'FLOW-EXP-COLLECTOR',
            cacheTimeoutActive: 1800,
            cacheTimeoutInactive: 15,
          },
        },
        flowExporters: {
          'FLOW-EXP-COLLECTOR': {
            destination: '192.168.10.50:2055',
            transportUdp: 2055,
          },
        },
        ports: {
          'GigabitEthernet0/0': {
            id: 'GigabitEthernet0/0',
            ipAddress: '10.0.0.1',
            flowMonitor: 'FLOW-MON-WAN',
            status: 'connected',
            shutdown: false,
          },
        },
      } as unknown as SwitchState;

      // 1. Verify interface tracking
      const port = routerState.ports['GigabitEthernet0/0'];
      expect(interfaceTracksFlows(port).ingress).toBe(true);

      // 2. Data Plane Packet Traversal
      const frame: NetworkPacketFrame = {
        id: 'flow-pkt-1',
        protocol: 'TCP',
        timestamp: Date.now(),
        etherType: '0800',
        srcMac: '00:11:22:33:44:55',
        dstMac: '00:aa:bb:cc:dd:ee',
        srcIp: '10.0.0.5',
        dstIp: '172.16.1.100',
        srcPort: 49152,
        dstPort: 443,
        ipProtocol: 6, // TCP
        length: 1460,
        info: 'HTTPS TCP SYN',
        ingressPortId: 'GigabitEthernet0/0',
        egressPortId: 'GigabitEthernet0/1',
      };

      captureNetFlow(routerState, frame, 'GigabitEthernet0/0', ['GigabitEthernet0/1']);

      // 3. Cache verification
      expect(routerState.netflowCache).toBeDefined();
      expect(routerState.netflowCache!.length).toBe(1);
      const cacheEntry = routerState.netflowCache![0];
      expect(cacheEntry.srcIp).toBe('10.0.0.5');
      expect(cacheEntry.dstIp).toBe('172.16.1.100');
      expect(cacheEntry.srcPort).toBe(49152);
      expect(cacheEntry.dstPort).toBe(443);
      expect(cacheEntry.pkts).toBe(1);
      expect(cacheEntry.bytes).toBe(1460);

      // 4. Exporter packet generation
      const exportFrame = buildNetflowExportFrame(routerState, '192.168.10.50:2055', 9);
      expect(exportFrame.protocol).toBe('UDP');
      expect(exportFrame.dstIp).toBe('192.168.10.50');
      expect(exportFrame.dstPort).toBe(2055);
      expect(exportFrame.info).toContain('NetFlow v9 export');
    });
  });

  describe('SNMP Query / Trap Engine', () => {
    it('authenticates SNMP community, walks MIB tree (sysDescr, sysUpTime, ifTable), and returns valid varBinds', () => {
      const switchState = {
        hostname: 'CoreSwitch01',
        version: { modelName: 'Enterprise Switch 3650', nosVersion: '16.9.4' },
        snmpCommunities: {
          public: 'RO',
          private: 'RW',
        },
        ports: {
          'Fa0/1': { id: 'Fa0/1', name: 'FastEthernet0/1', status: 'connected', ipAddress: '192.168.1.1' },
        },
      } as unknown as SwitchState;

      const deviceMap = new Map<string, SwitchState>([['sw-1', switchState]]);

      // 1. SNMP GET Request for sysDescr (.1.3.6.1.2.1.1.1.0)
      const getPacket: SnmpPacket = {
        version: '2c',
        pdu: 'GET',
        community: 'public',
        requestId: 1001,
        oids: ['.1.3.6.1.2.1.1.1.0'],
      };

      const getRes = processSnmpPacket('sw-1', getPacket, deviceMap);
      expect(getRes.error).toBe('none');
      expect(getRes.varBinds.length).toBe(1);
      expect(getRes.varBinds[0].name).toBe('sysDescr');
      expect(getRes.varBinds[0].value).toContain('Enterprise Switch 3650');

      // 2. Reject unauthorized community string
      const badPacket: SnmpPacket = {
        version: '2c',
        pdu: 'GET',
        community: 'invalidCommunity',
        requestId: 1002,
        oids: ['.1.3.6.1.2.1.1.1.0'],
      };
      const badRes = processSnmpPacket('sw-1', badPacket, deviceMap);
      expect(badRes.error).toBe('authorizationError');
      expect(badRes.varBinds).toEqual([]);

      // 3. Complete OID tree inspection
      const allOids = getDeviceSnmpOids('sw-1', deviceMap);
      expect(allOids.length).toBeGreaterThanOrEqual(4);
      expect(allOids.some((o) => o.name === 'sysName')).toBe(true);
      expect(allOids.some((o) => o.name === 'sysUpTime')).toBe(true);
    });
  });
});
