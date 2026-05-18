import { describe, it, expect } from 'vitest';
import { generateExamFromProject } from './examMode';

describe('generateExamFromProject', () => {
  it('should generate an exam with tasks from project data', () => {
    const projectData = {
      devices: [
        {
          id: 'switch-1',
          state: {
            hostname: 'Test-Switch',
            vlans: {
              '10': { id: 10, name: 'VLAN10' }
            }
          }
        }
      ],
      topology: {
        devices: [
          {
            id: 'pc-1',
            type: 'pc',
            name: 'PC-1',
            ip: '192.168.1.10',
            subnet: '255.255.255.0',
            gateway: '192.168.1.1'
          }
        ],
        connections: [
          {
            sourceDeviceId: 'pc-1',
            sourcePort: 'eth0',
            targetDeviceId: 'switch-1',
            targetPort: 'fa0/1',
            cableType: 'straight'
          }
        ]
      }
    };

    const exam = generateExamFromProject(projectData, 'en');

    expect(exam.isExam).toBe(true);
    expect(exam.tasks.length).toBeGreaterThan(0);

    // Check for Hostname task
    const hostnameTask = exam.tasks.find(t => t.checkType === 'command' && t.checkParams?.commandPattern === 'hostname Test-Switch');
    expect(hostnameTask).toBeDefined();

    // Check for Connection task
    const connectionTask = exam.tasks.find(t => t.checkType === 'connection');
    expect(connectionTask).toBeDefined();
    expect(connectionTask?.checkParams?.sourceDevice).toBe('pc-1');

    // Check for PC IP task
    const ipTask = exam.tasks.find(t => t.checkType === 'config' && t.checkParams?.configKey === 'pc.pc-1.ip');
    expect(ipTask).toBeDefined();

    // Check for VLAN task
    const vlanTask = exam.tasks.find(t => t.checkType === 'command' && t.checkParams?.commandPattern === 'vlan 10');
    expect(vlanTask).toBeDefined();

    // Total weight should be 100
    const totalWeight = exam.tasks.reduce((sum, t) => sum + t.weight, 0);
    expect(totalWeight).toBe(100);
  });

  it('should extract DHCP, DNS, HTTP and WLAN tasks', () => {
    const projectData = {
      devices: [
        {
          id: 'router-1',
          state: {
            dhcpPools: {
              'LAN': { network: '192.168.1.0' }
            },
            services: {
              dns: { enabled: true, records: [{ domain: 'lab.com', address: '1.2.3.4' }] },
              http: { enabled: true }
            },
            ports: {
              'wlan0': { id: 'wlan0', wifi: { ssid: 'Guest' } }
            }
          }
        }
      ],
      topology: { devices: [], connections: [] }
    };

    const exam = generateExamFromProject(projectData, 'en');

    expect(exam.tasks.some(t => t.checkParams?.configKey === 'dhcpPools.LAN.network')).toBe(true);
    expect(exam.tasks.some(t => t.checkParams?.configKey === 'services.dns.enabled')).toBe(true);
    expect(exam.tasks.some(t => t.checkParams?.configKey === 'services.dns.records')).toBe(true);
    expect(exam.tasks.some(t => t.checkParams?.configKey === 'services.http.enabled')).toBe(true);
    expect(exam.tasks.some(t => t.checkParams?.configKey === 'ports.wlan0.wifi.ssid')).toBe(true);
  });

  it('should filter out completed tasks from the project', () => {
    const projectData = {
      tasks: [
        { id: 't1', title: { tr: 'C1', en: 'C1' }, checkType: 'connection', completed: true },
        { id: 't2', title: { tr: 'C2', en: 'C2' }, checkType: 'command', completed: true },
        { id: 't3', title: { tr: 'C3', en: 'C3' }, checkType: 'command', completed: false }
      ],
      topology: { devices: [], connections: [] }
    };

    const exam = generateExamFromProject(projectData, 'en');

    // Connection task should remain even if completed
    expect(exam.tasks.some(t => t.id === 't1')).toBe(true);
    // Completed non-connection task should be filtered out
    expect(exam.tasks.some(t => t.id === 't2')).toBe(false);
    // Incomplete task should remain
    expect(exam.tasks.some(t => t.id === 't3')).toBe(true);
  });
});
