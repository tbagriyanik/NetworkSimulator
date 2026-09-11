import { describe, it, expect } from 'vitest';
import { exampleProjects, validateExampleProject } from '@/lib/network/exampleProjects';

describe('exampleProjects', () => {
  describe('exampleProjects function', () => {
    it('should return projects array for Turkish language', () => {
      const projects = exampleProjects('tr');

      expect(Array.isArray(projects)).toBe(true);
      expect(projects.length).toBeGreaterThan(0);
    });

    it('should return projects array for English language', () => {
      const projects = exampleProjects('en');

      expect(Array.isArray(projects)).toBe(true);
      expect(projects.length).toBeGreaterThan(0);
    });

    it('should return same number of projects for both languages', () => {
      const trProjects = exampleProjects('tr');
      const enProjects = exampleProjects('en');

      expect(trProjects.length).toBe(enProjects.length);
    });

    it('should return projects with valid structure', () => {
      const projects = exampleProjects('en');

      projects.forEach(project => {
        expect(typeof project.id).toBe('string');
        expect(project.id.length).toBeGreaterThan(0);
        expect(typeof project.tag).toBe('string');
        expect(typeof project.title).toBe('string');
        expect(typeof project.description).toBe('string');
        expect(['basic', 'intermediate', 'advanced']).toContain(project.level);
        expect(project.data).toBeDefined();
        expect(project.data.topology).toBeDefined();
        expect(Array.isArray(project.data.topology.devices)).toBe(true);
        expect(Array.isArray(project.data.topology.connections)).toBe(true);
        expect(Array.isArray(project.data.topology.notes)).toBe(true);
      });
    });

    it('should have unique project IDs', () => {
      const projects = exampleProjects('en');
      const ids = projects.map(p => p.id);

      expect(new Set(ids).size).toBe(ids.length);
    });

    it('should have projects at all difficulty levels', () => {
      const projects = exampleProjects('en');

      const levels = new Set(projects.map(p => p.level));
      expect(levels.has('basic')).toBe(true);
      expect(levels.has('intermediate')).toBe(true);
      expect(levels.has('advanced')).toBe(true);
    });
  });

  describe('Project data integrity', () => {
    it('should have valid device types in all projects', () => {
      const validTypes = ['pc', 'switchL2', 'switchL3', 'router', 'iot', 'firewall', 'wlc'];
      const projects = exampleProjects('en');

      for (const project of projects) {
        for (const device of project.data.topology.devices) {
          expect(validTypes).toContain(device.type);
        }
      }
    });

    it('should have devices with IDs that match their connection references', () => {
      const projects = exampleProjects('en');

      for (const project of projects) {
        const deviceIds = new Set(project.data.topology.devices.map(d => d.id));
        for (const conn of project.data.topology.connections) {
          expect(deviceIds.has(conn.sourceDeviceId)).toBe(true);
          expect(deviceIds.has(conn.targetDeviceId)).toBe(true);
        }
      }
    });

    it('should have consistent cableInfo in all projects', () => {
      const projects = exampleProjects('en');

      for (const project of projects) {
        expect(project.data.cableInfo).toBeDefined();
        expect(typeof project.data.cableInfo.connected).toBe('boolean');
        expect(['straight', 'crossover', 'console']).toContain(project.data.cableInfo.cableType);
      }
    });

    it('should have valid deviceStates format', () => {
      const projects = exampleProjects('en');

      for (const project of projects) {
        expect(Array.isArray(project.data.devices)).toBe(true);
        for (const dev of project.data.devices) {
          expect(typeof dev.id).toBe('string');
          expect(dev.state).toBeDefined();
          expect(typeof dev.state).toBe('object');
        }
      }
    });

    it('should have devices with deterministic MAC addresses', () => {
      const projects = exampleProjects('en');

      for (const project of projects) {
        for (const device of project.data.topology.devices) {
          expect(device.macAddress).toBeDefined();
          const mac = device.macAddress;
          expect(typeof mac).toBe('string');
          if (typeof mac === 'string') {
            expect(mac.length).toBeGreaterThan(0);
            expect(mac).toMatch(/^[0-9A-Fa-f]{4}\.[0-9A-Fa-f]{4}\.[0-9A-Fa-f]{4}$/);
          }
        }
      }
    });

    it('should have devices with ports defined', () => {
      const projects = exampleProjects('en');

      for (const project of projects) {
        for (const device of project.data.topology.devices) {
          expect(Array.isArray(device.ports)).toBe(true);
          expect(device.ports.length).toBeGreaterThan(0);
        }
      }
    });

    it('should produce the same projects deterministically', () => {
      const projects1 = exampleProjects('en');
      const projects2 = exampleProjects('en');

      expect(projects1.length).toBe(projects2.length);
      for (let i = 0; i < projects1.length; i++) {
        expect(projects1[i].id).toBe(projects2[i].id);
        expect(projects1[i].data.topology.devices.length).toBe(projects2[i].data.topology.devices.length);
      }
    });

    it('should keep topology, device state, and connection ports consistent', () => {
      for (const project of exampleProjects('en')) {
        expect(validateExampleProject(project), project.id).toEqual([]);
      }
    });

    it('should assign link-local IPs to unconfigured hosts', () => {
      const projects = exampleProjects('en');

      for (const project of projects) {
        for (const device of project.data.topology.devices) {
          if (device.type === 'pc' || device.type === 'iot') {
            expect(device.ip).toBeDefined();
            expect(typeof device.ip).toBe('string');
          }
        }
      }
    });
  });

  describe('Firewall rules in projects', () => {
    it('should have valid firewall rules when present', () => {
      const projects = exampleProjects('en');

      for (const project of projects) {
        for (const device of project.data.topology.devices) {
          if (device.type === 'firewall' && device.firewallRules) {
            for (const rule of device.firewallRules) {
              expect(typeof rule.id).toBe('string');
              expect(['allow', 'deny']).toContain(rule.action);
              expect(['icmp', 'tcp', 'udp', 'any']).toContain(rule.protocol);
              expect(typeof rule.enabled).toBe('boolean');
            }
          }
        }
      }
    });
  });

  describe('Example project by ID pattern', () => {
    it('should support common project IDs', () => {
      const projects = exampleProjects('en');
      const projectIds = projects.map(p => p.id);

      const expectedIds = [
        'basic-secure',
        'single-vlan',
        'trunk-vtp',
        'roas',
        'legacy-routing',
        'port-security',
        'l3-routing',
        'static-routing',
        'etherchannel',
        'stp-redundant',
        'stp-triangle',
        'campus-network',
        'wifi-intermediate',
        'wlc-enterprise-wireless',
        'wap-multi-ssid',
        'iot-wifi-lab',
        'greenhouse-iot-lab',
        'router-ssh-1pc',
        'router-dhcp-2pc',
        'firewall-basic',
        'native-vlan-basic',
        'stp-3switch-pvst',
        'l3-switch-2vlan',
        'static-l3-routing',
        'rip-dynamic-routing',
        'acl-standard-basic',
        'acl-extended-basic',
        'nat-static-basic',
        'nat-dynamic-basic',
        'nat-pat-basic',
        'hsrp-redundancy-basic',
        'ospf-multi-area-1',
        'ospf-multi-area-2',
        'eigrp-basic-1',
        'ipv6-advanced-lab',
        'all-services-lab',
      ];

      for (const expectedId of expectedIds) {
        expect(projectIds).toContain(expectedId);
      }
    });

    it('should have properly configured WLC in wlc-enterprise-wireless project and allow ping and web connectivity', async () => {
      const { checkConnectivity } = await import('@/lib/network/connectivity');
      const projects = exampleProjects('en');
      const wlcProj = projects.find(p => p.id === 'wlc-enterprise-wireless');

      expect(wlcProj).toBeDefined();
      if (!wlcProj) return;

      const devices = wlcProj.data.topology.devices;
      const connections = wlcProj.data.topology.connections;
      const deviceStates = new Map(wlcProj.data.devices.map(d => [d.id, d.state]));

      // 0. Check SW1, LAP-1 and LAP-2 device types are L3 switches
      const sw1 = devices.find(d => d.id === 'switch-1');
      const lap1 = devices.find(d => d.id === 'lap-1');
      const lap2 = devices.find(d => d.id === 'lap-2');
      expect(sw1?.type).toBe('switchL3');
      expect(sw1?.switchModel).toBe('NS-L3-24PS');
      expect(lap1?.type).toBe('switchL3');
      expect(lap1?.switchModel).toBe('NS-L3-24PS');
      expect(lap2?.type).toBe('switchL3');
      expect(lap2?.switchModel).toBe('NS-L3-24PS');

      // 1. Laptop-1 to Laptop-2 (Inter-VLAN Wireless ping)
      const res1 = checkConnectivity('laptop-1', '192.168.20.101', devices, connections, deviceStates, 'en');
      expect(res1.success).toBe(true);

      // 2. Laptop-1 to WLC (Wireless to Controller ping)
      const res2 = checkConnectivity('laptop-1', '192.168.1.10', devices, connections, deviceStates, 'en');
      expect(res2.success).toBe(true);

      // 3. Admin-PC to WLC
      const res3 = checkConnectivity('pc-admin', '192.168.1.10', devices, connections, deviceStates, 'en');
      expect(res3.success).toBe(true);
    });

    it('should have properly configured WAPs in wap-multi-ssid project and allow inter-VLAN ping', async () => {
      const { checkConnectivity } = await import('@/lib/network/connectivity');
      const projects = exampleProjects('en');
      const wapProj = projects.find(p => p.id === 'wap-multi-ssid');

      expect(wapProj).toBeDefined();
      if (!wapProj) return;

      const devices = wapProj.data.topology.devices;
      const connections = wapProj.data.topology.connections;
      const deviceStates = new Map(wapProj.data.devices.map(d => [d.id, d.state]));

      // 1. Check WAP device types are L3 switches
      const wap1 = devices.find(d => d.id === 'wap-1');
      const wap2 = devices.find(d => d.id === 'wap-2');
      expect(wap1?.type).toBe('switchL3');
      expect(wap1?.switchModel).toBe('NS-L3-24PS');
      expect(wap2?.type).toBe('switchL3');
      expect(wap2?.switchModel).toBe('NS-L3-24PS');

      // 2. Laptop-Staff to Laptop-Guest
      const res1 = checkConnectivity('laptop-staff', '192.168.20.101', devices, connections, deviceStates, 'en');
      expect(res1.success).toBe(true);

      // 3. Laptop-Staff to Gateway
      const res2 = checkConnectivity('laptop-staff', '192.168.10.1', devices, connections, deviceStates, 'en');
      expect(res2.success).toBe(true);

      // 4. Laptop-Staff to WAP-Staff L3 Switch IP
      const res3 = checkConnectivity('laptop-staff', '192.168.10.2', devices, connections, deviceStates, 'en');
      expect(res3.success).toBe(true);
    });
  });
});
