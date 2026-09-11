import { describe, it, expect } from 'vitest';
import {
  computeConvexHull,
  generateZoneSvgPath,
  getSubnetPrefix,
  computeAreaZones,
} from '@/lib/network/areaOverlayEngine';
import type { CanvasDevice } from '@/components/network/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';

describe('Area Overlay Engine (Convex Hull & Highlighting)', () => {
  it('should correctly compute convex hull for a triangle and square set of points', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
      { x: 5, y: 5 }, // Interior point
    ];

    const hull = computeConvexHull(points);
    expect(hull.length).toBe(4);
    expect(hull.some((p) => p.x === 5 && p.y === 5)).toBe(false);
  });

  it('should generate valid SVG path for single and multiple points', () => {
    const singlePoint = [{ x: 100, y: 100 }];
    const pathSingle = generateZoneSvgPath(singlePoint);
    expect(pathSingle).toContain('M ');
    expect(pathSingle).toContain(' A ');

    const multiPoints = [
      { x: 100, y: 100 },
      { x: 200, y: 100 },
      { x: 150, y: 200 },
    ];
    const pathMulti = generateZoneSvgPath(multiPoints);
    expect(pathMulti).toContain('M ');
    expect(pathMulti).toContain('Q ');
  });

  it('should calculate subnet prefix CIDR accurately', () => {
    expect(getSubnetPrefix('192.168.1.50', '255.255.255.0')).toBe('192.168.1.0/24');
    expect(getSubnetPrefix('10.5.20.1', '255.0.0.0')).toBe('10.0.0.0/8');
    expect(getSubnetPrefix('172.16.4.1', '255.255.0.0')).toBe('172.16.0.0/16');
  });

  it('should compute zones for OSPF, VLAN, and subnets', () => {
    const devices: CanvasDevice[] = [
      {
        id: 'r1',
        type: 'router',
        name: 'R1',
        ip: '192.168.1.1',
        subnet: '255.255.255.0',
        x: 100,
        y: 100,
        status: 'online',
        ports: [],
      },
      {
        id: 'r2',
        type: 'router',
        name: 'R2',
        ip: '192.168.1.2',
        subnet: '255.255.255.0',
        x: 300,
        y: 100,
        status: 'online',
        ports: [],
      },
      {
        id: 'pc1',
        type: 'pc',
        name: 'PC1',
        ip: '10.0.0.5',
        subnet: '255.0.0.0',
        x: 100,
        y: 300,
        status: 'online',
        ports: [],
        vlan: 10,
      },
    ];

    const deviceStates = new Map<string, SwitchState>();
    deviceStates.set('r1', {
      hostname: 'R1',
      macAddress: '00:11:22:33:44:55',
      switchModel: 'NS-L2-24TT-L',
      switchLayer: 'L2',
      currentMode: 'user',
      bootTime: Date.now(),
      ipRouting: true,
      ospfAreas: [0],
      ports: {},
      vlans: {},
      security: {
        enableSecretEncrypted: false,
        servicePasswordEncryption: false,
        users: [],
        consoleLine: { login: false, transportInput: ['all'] },
        vtyLines: { login: false, transportInput: ['all'] },
      },
      runningConfig: [],
      commandHistory: [],
      historyIndex: 0,
      version: { nosVersion: '15.2', modelName: '2911', serialNumber: 'SN1', uptime: '1h' },
      macAddressTable: [],
      arpCache: [],
    });
    deviceStates.set('r2', {
      hostname: 'R2',
      macAddress: '00:11:22:33:44:66',
      switchModel: 'NS-L2-24TT-L',
      switchLayer: 'L2',
      currentMode: 'user',
      bootTime: Date.now(),
      ipRouting: true,
      ospfAreas: [0],
      ports: {},
      vlans: {},
      security: {
        enableSecretEncrypted: false,
        servicePasswordEncryption: false,
        users: [],
        consoleLine: { login: false, transportInput: ['all'] },
        vtyLines: { login: false, transportInput: ['all'] },
      },
      runningConfig: [],
      commandHistory: [],
      historyIndex: 0,
      version: { nosVersion: '15.2', modelName: '2911', serialNumber: 'SN2', uptime: '1h' },
      macAddressTable: [],
      arpCache: [],
    });

    const ospfZones = computeAreaZones(devices, deviceStates, 'ospf');
    expect(ospfZones.length).toBe(1);
    expect(ospfZones[0].badgeLabel).toBe('OSPF Area 0');
    expect(ospfZones[0].devices.length).toBe(2);

    const subnetZones = computeAreaZones(devices, deviceStates, 'subnet');
    expect(subnetZones.length).toBe(2); // 192.168.1.0/24 and 10.0.0.0/8
  });
});
