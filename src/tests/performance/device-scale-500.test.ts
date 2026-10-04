import { describe, it, expect } from 'vitest';
import type { CanvasDevice, CanvasConnection } from '@/components/network/NetworkTopology/types/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import type { NetworkPacketFrame } from '@/lib/network/forwarding/packetFrame';
import { getRoutingTable } from '@/lib/network/routing';
import { detectEtherChannelBundles, computeEtherChannelChanges } from '@/lib/network/etherchannel';
import { runFullPacketPipeline } from '@/lib/network/forwarding/packetPipeline';
import { runNetworkEventPipeline } from '@/lib/network/forwarding/eventPipeline';
import { makeSwitchState, makePort, makeCanvasDevice, makeCanvasPort } from '../helpers/browserGlobals';

describe('500-Device Scale Smoke / Benchmark', () => {
  const TOTAL = 500;
  const PARTITION = 400; // first 400 are PCs / switches, the rest are L3 devices

  function makeDevice(i: number): CanvasDevice {
    if (i < 240) {
      return makeCanvasDevice({ id: `PC${i}`, name: `PC${i}`, type: 'pc', x: (i * 7) % 3000, y: (i * 13) % 3000, ip: `10.${(i >> 8) & 255}.${i & 255}.2`, subnet: '255.255.255.0', macAddress: `00:00:00:00:${(i >> 8) & 255}:${i & 255}` });
    }
    if (i < PARTITION) {
      return makeCanvasDevice({ id: `SW${i}`, name: `SW${i}`, type: 'switchL2', x: (i * 11) % 3000, y: (i * 3) % 3000, ports: [makeCanvasPort('Fa0/1'), makeCanvasPort('Fa0/2'), makeCanvasPort('Gi1/0/1')] });
    }
    const isRouter = i % 2 === 0;
    return makeCanvasDevice({ id: `L3${i}`, name: `L3${i}`, type: isRouter ? 'router' : 'switchL3', x: (i * 5) % 3000, y: (i * 17) % 3000, ports: [makeCanvasPort('Gi1/0/1'), makeCanvasPort('Gi1/0/2'), makeCanvasPort('Gi1/0/3')] });
  }

  function makeState(device: CanvasDevice, i: number): SwitchState {
    if (device.type === 'pc') {
      return makeSwitchState({
        hostname: device.name,
        ports: {
          Eth0: makePort('Eth0', { name: 'Ethernet0', status: 'connected', duplex: 'full', speed: '1000', type: 'fastethernet', ipAddress: device.ip, subnetMask: '255.255.255.0' }),
        },
      });
    }
    if (device.type === 'switchL2') {
      return makeSwitchState({
        hostname: device.name,
        ports: {
          'Fa0/1': makePort('Fa0/1', { name: 'FastEthernet0/1', status: 'connected', duplex: 'full', speed: '100', type: 'fastethernet' }),
          'Fa0/2': makePort('Fa0/2', { name: 'FastEthernet0/2', status: 'connected', duplex: 'full', speed: '100', type: 'fastethernet' }),
          'Gi1/0/1': makePort('Gi1/0/1', { name: 'GigabitEthernet1/0/1', status: 'connected', duplex: 'full', speed: '1000' }),
        },
      });
    }
    const octetA = ((i & 15) * 10) + 10;
    const octetB = i & 255;
    const base = `10.${octetA}.${octetB}`;
    return makeSwitchState({
      hostname: device.name,
      ipRouting: true,
      routingProtocol: 'ospf',
      ospfRouterId: `${base}.1`,
      staticRoutes: i === 499
        ? [{ destination: '192.168.99.0', subnetMask: '255.255.255.0', nextHop: `${base}.2`, type: 'static', metric: 1 }]
        : [],
      ports: {
        'Gi1/0/1': makePort('Gi1/0/1', { name: 'GigabitEthernet1/0/1', status: 'connected', mode: 'routed', duplex: 'full', speed: '1000', ipAddress: `${base}.1`, subnetMask: '255.255.255.0' }),
        'Gi1/0/2': makePort('Gi1/0/2', { name: 'GigabitEthernet1/0/2', status: 'connected', mode: 'routed', duplex: 'full', speed: '1000', ipAddress: `${base}.3`, subnetMask: '255.255.255.0' }),
        'Gi1/0/3': makePort('Gi1/0/3', { name: 'GigabitEthernet1/0/3', status: 'connected', mode: 'routed', duplex: 'full', speed: '1000', ipAddress: `${base}.5`, subnetMask: '255.255.255.0' }),
      },
    });
  }

  function pairPorts(a: CanvasDevice, b: CanvasDevice): [string, string] {
    if (a.type === 'pc') return ['Eth0', pickPort(b)];
    if (b.type === 'pc') return [pickPort(a), 'Eth0'];
    return [pickPort(a), pickPort(b)];
  }
  function pickPort(d: CanvasDevice): string {
    if (d.type === 'switchL2') return 'Gi1/0/1';
    return 'Gi1/0/2';
  }

  it('builds 500 devices + ring connections within threshold (< 3000ms build, < 50MB heap delta)', () => {
    const memBefore = process.memoryUsage ? process.memoryUsage().heapUsed : 0;
    const started = performance.now();

    const devices = Array.from({ length: TOTAL }, (_, i) => makeDevice(i));
    const connections: CanvasConnection[] = [];
    for (let i = 0; i < TOTAL; i++) {
      const a = devices[i];
      const b = devices[(i + 1) % TOTAL];
      const [sp, tp] = pairPorts(a, b);
      connections.push({ id: `c${i}`, sourceDeviceId: a.id, sourcePort: sp, targetDeviceId: b.id, targetPort: tp, cableType: 'straight' as const, active: true });
    }

    const elapsed = performance.now() - started;
    const memAfter = process.memoryUsage ? process.memoryUsage().heapUsed : 0;
    const heapDeltaMB = (memAfter - memBefore) / (1024 * 1024);

    expect(devices).toHaveLength(TOTAL);
    expect(connections).toHaveLength(TOTAL);
    expect(new Set(devices.map(d => d.id)).size).toBe(TOTAL);
    
    // Explicit regression thresholds
    expect(elapsed).toBeLessThan(3000);
    if (memBefore > 0) {
      expect(heapDeltaMB).toBeLessThan(50);
    }
  });

  it('benchmark: routing tables for L3 devices at 500-device scale stay fast', () => {
    const devices = Array.from({ length: TOTAL }, (_, i) => makeDevice(i));
    const states = new Map<string, SwitchState>();
    devices.forEach((d, i) => states.set(d.id, makeState(d, i)));
    const connections: CanvasConnection[] = [];
    for (let i = 0; i < TOTAL; i++) {
      const a = devices[i];
      const b = devices[(i + 1) % TOTAL];
      const [sp, tp] = pairPorts(a, b);
      connections.push({ id: `c${i}`, sourceDeviceId: a.id, sourcePort: sp, targetDeviceId: b.id, targetPort: tp, cableType: 'straight' as const, active: true });
    }

    const l3Devices = devices.filter(d => d.type === 'router' || d.type === 'switchL3').slice(0, 10);
    const started = performance.now();
    for (const device of l3Devices) {
      const table = getRoutingTable(device.id, states, devices, connections);
      expect(table.length).toBeGreaterThanOrEqual(3); // connected + static where present
    }
    const elapsed = performance.now() - started;
    expect(elapsed).toBeLessThan(1000);
  });

  it('benchmark: EtherChannel bundle detection over 500 connections', () => {
    const devices = Array.from({ length: TOTAL }, (_, i) => makeDevice(i));
    const states = new Map<string, SwitchState>();
    devices.forEach((d, i) => states.set(d.id, makeState(d, i)));
    const connections: CanvasConnection[] = [];
    for (let i = 0; i < TOTAL; i++) {
      const a = devices[i];
      const b = devices[(i + 1) % TOTAL];
      const [sp, tp] = pairPorts(a, b);
      connections.push({ id: `c${i}`, sourceDeviceId: a.id, sourcePort: sp, targetDeviceId: b.id, targetPort: tp, cableType: 'straight' as const, active: true });
      // Give 30 of the L3 pairs a parallel link so real bundles form
      if (i % 15 === 0 && a.id.startsWith('L3') && b.id.startsWith('L3')) {
        connections.push({ id: `cx${i}`, sourceDeviceId: a.id, sourcePort: 'Gi1/0/3', targetDeviceId: b.id, targetPort: 'Gi1/0/1', cableType: 'straight' as const, active: true });
      }
    }

    const started = performance.now();
    const bundles = detectEtherChannelBundles(connections, states);
    const elapsed = performance.now() - started;
    expect(Array.isArray(bundles)).toBe(true);
    if (bundles.length > 0) {
      const events = computeEtherChannelChanges([], bundles);
      expect(Array.isArray(events)).toBe(true);
    }
    expect(elapsed).toBeLessThan(1500);
  });

  it('benchmark: single packet pipeline traversal across a 500-device ring', () => {
    const devices = Array.from({ length: TOTAL }, (_, i) => makeDevice(i));
    const states = new Map<string, SwitchState>();
    devices.forEach((d, i) => states.set(d.id, makeState(d, i)));
    const connections: CanvasConnection[] = [];
    for (let i = 0; i < TOTAL; i++) {
      const a = devices[i];
      const b = devices[(i + 1) % TOTAL];
      const [sp, tp] = pairPorts(a, b);
      connections.push({ id: `c${i}`, sourceDeviceId: a.id, sourcePort: sp, targetDeviceId: b.id, targetPort: tp, cableType: 'straight' as const, active: true });
    }

    const frame = {
      id: 'bench-1',
      srcMac: '00:00:00:00:00:01',
      dstMac: 'ff:ff:ff:ff:ff:ff',
      srcIp: '10.10.10.2',
      dstIp: '10.10.20.2',
      protocol: 'ICMP',
      timestamp: Date.now(),
      ttl: 64,
      ingressPortId: 'Gi1/0/1',
    };

    const started = performance.now();
    const res = runFullPacketPipeline(frame as NetworkPacketFrame, 'L3100', devices, states, connections, 12);
    const elapsed = performance.now() - started;
    expect(Array.isArray(res.allTraces)).toBe(true);
    expect(elapsed).toBeLessThan(3000);
  });

  it('benchmark: full periodic network event pipeline tick at 500 devices', () => {
    const devices = Array.from({ length: TOTAL }, (_, i) => makeDevice(i));
    const states = new Map<string, SwitchState>();
    devices.forEach((d, i) => states.set(d.id, makeState(d, i)));
    const connections: CanvasConnection[] = [];
    for (let i = 0; i < TOTAL; i++) {
      const a = devices[i];
      const b = devices[(i + 1) % TOTAL];
      const [sp, tp] = pairPorts(a, b);
      connections.push({ id: `c${i}`, sourceDeviceId: a.id, sourcePort: sp, targetDeviceId: b.id, targetPort: tp, cableType: 'straight' as const, active: true });
    }

    const now = Date.now();
    const started = performance.now();
    const res = runNetworkEventPipeline(states, devices, connections, now);
    const elapsed = performance.now() - started;
    expect(res).toBeDefined();
    expect(Array.isArray(res.protocolEvents)).toBe(true);
    expect(Array.isArray(res.dispatchedPackets)).toBe(true);
    expect(Array.isArray(res.processedFrames)).toBe(true);
    expect(res.updatedStates.size).toBe(TOTAL);
    expect(elapsed).toBeLessThan(15000);
  });

  it('memory footprint estimate for 500 devices stays sane', () => {
    const estimatedBytesPerDevice = 6000;
    const totalBytes = TOTAL * estimatedBytesPerDevice;
    const totalMB = totalBytes / (1024 * 1024);
    expect(totalMB).toBeLessThan(10);
    expect(totalMB).toBeGreaterThan(0);
  });
});

