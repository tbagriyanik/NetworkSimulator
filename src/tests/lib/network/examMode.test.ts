import { describe, it, expect } from 'vitest';
import { generateExamFromProject, ProjectData } from '@/lib/network/examMode';

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

    const exam = generateExamFromProject(projectData as unknown as ProjectData, 'en');

    expect(exam.isExam).toBe(true);
    expect(exam.tasks.length).toBeGreaterThan(0);

    // Check for Hostname task
    const hostnameTask = exam.tasks.find(t => t.checkType === 'command' && t.checkParams?.commandPattern === 'hostname Test-Switch');
    expect(hostnameTask).toBeDefined();

    // Check for Connection task
    const connectionTask = exam.tasks.find(t => t.checkType === 'connection');
    expect(connectionTask).toBeDefined();
    expect(connectionTask?.checkParams?.sourceDevice).toBe('pc-1');

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

    const exam = generateExamFromProject(projectData as unknown as ProjectData, 'en');

    expect(exam.tasks.some(t => t.checkParams?.configKey === 'dhcpPools.LAN.network')).toBe(true);
    expect(exam.tasks.some(t => t.checkParams?.configKey === 'services.dns.enabled')).toBe(true);
    expect(exam.tasks.some(t => t.checkParams?.configKey === 'services.dns.records')).toBe(true);
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

    const exam = generateExamFromProject(projectData as unknown as ProjectData, 'en');

    // Completed non-connection task should be filtered out
    expect(exam.tasks.some(t => t.id === 't2')).toBe(false);
    // Incomplete task should remain
    expect(exam.tasks.some(t => t.id === 't3')).toBe(true);
  });

  it('should skip connection tasks for already-active cables', () => {
    const projectData = {
      topology: {
        devices: [
          {
            id: 'pc-1',
            type: 'pc',
            name: 'PC-1',
            ip: '192.168.1.10',
            subnet: '255.255.255.0',
            gateway: '192.168.1.1'
          },
          {
            id: 'switch-1',
            type: 'switchL2',
            name: 'SW1',
            x: 400,
            y: 200
          }
        ],
        connections: [
          // Active connection - should NOT create a task
          {
            sourceDeviceId: 'pc-1',
            sourcePort: 'eth0',
            targetDeviceId: 'switch-1',
            targetPort: 'fa0/1',
            cableType: 'straight',
            active: true
          },
          // Inactive connection - SHOULD create a task
          {
            sourceDeviceId: 'pc-1',
            sourcePort: 'eth0',
            targetDeviceId: 'switch-1',
            targetPort: 'fa0/2',
            cableType: 'straight'
          }
        ]
      }
    };

    const exam = generateExamFromProject(projectData as unknown as ProjectData, 'en');

    // Should only have one connection task (for the inactive connection)
    const connectionTasks = exam.tasks.filter(t => t.checkType === 'connection');
    expect(connectionTasks.length).toBe(1);
    expect(connectionTasks[0].checkParams?.targetPort).toBe('fa0/2');
  });

  it('should extract CLI commands from note text', () => {
    const projectData = {
      topology: {
        devices: [],
        connections: [],
        notes: [
          {
            id: 'note-1',
            text: '📝 SINAV KOMUTLARI\n\nenable\nconfigure terminal\nhostname Switch1\nvlan 10\nname MUHASEBE\ninterface fa0/1\nswitchport mode access\nswitchport access vlan 10\nend',
            x: 100, y: 100, width: 300, height: 200,
            color: '#ef4444', font: 'verdana', fontSize: 12, opacity: 0.75
          }
        ]
      }
    };

    const exam = generateExamFromProject(projectData as unknown as ProjectData, 'en');

    // Should have extracted CLI commands from notes
    const commandTasks = exam.tasks.filter(t => t.checkType === 'command' && t.id.startsWith('task-note-cmd'));
    expect(commandTasks.length).toBeGreaterThan(0);

    // Check for specific commands
    const hostnameTask = commandTasks.find(t => t.checkParams?.commandPattern === 'hostname Switch1');
    expect(hostnameTask).toBeDefined();
    const vlanTask = commandTasks.find(t => t.checkParams?.commandPattern === 'vlan 10');
    expect(vlanTask).toBeDefined();
  });

  it('should extract comprehensive device CLI configurations', () => {
    const projectData = {
      devices: [
        {
          id: 'switch-1',
          state: {
            hostname: 'SW1',
            security: {
              enableSecret: 'class',
              consoleLine: { password: 'console', login: true },
              vtyLines: { password: 'vty123', login: true, transportInput: ['ssh'] },
              servicePasswordEncryption: true,
              users: [{ username: 'admin', password: 'admin123', privilege: 15 }]
            },
            ipRouting: true,
            vtp: { mode: 'server', domain: 'LAB' },
            ports: {
              'fa0/1': { id: 'fa0/1', mode: 'trunk', vlan: 1, description: 'To SW2' },
              'fa0/2': { id: 'fa0/2', mode: 'access', vlan: 10 },
              'fa0/3': { id: 'fa0/3', mode: 'access', vlan: 1, portSecurity: { enabled: true } }
            },
            staticRoutes: [
              { destination: '10.0.0.0', prefixLength: 24, nextHop: '192.168.1.1' }
            ]
          }
        }
      ],
      topology: { devices: [], connections: [] }
    };

    const exam = generateExamFromProject(projectData as unknown as ProjectData, 'en');

    // Security tasks
    expect(exam.tasks.some(t => t.checkParams?.commandPattern === 'enable secret')).toBe(true);
    expect(exam.tasks.some(t => t.checkParams?.commandPattern === 'line con 0')).toBe(true);
    expect(exam.tasks.some(t => t.checkParams?.commandPattern === 'line vty')).toBe(true);
    expect(exam.tasks.some(t => t.checkParams?.commandPattern === 'service password-encryption')).toBe(true);
    expect(exam.tasks.some(t => t.checkParams?.commandPattern === 'username admin')).toBe(true);

    // Routing task
    expect(exam.tasks.some(t => t.checkParams?.commandPattern === 'ip routing')).toBe(true);

    // Static route task
    expect(exam.tasks.some(t => t.checkParams?.commandPattern === 'ip route 10.0.0.0')).toBe(true);

    // Port tasks
    expect(exam.tasks.some(t => t.checkParams?.commandPattern === 'switchport mode trunk')).toBe(true);
    expect(exam.tasks.some(t => t.checkParams?.commandPattern === 'switchport access vlan 10')).toBe(true);
    expect(exam.tasks.some(t => t.checkParams?.commandPattern === 'switchport port-security')).toBe(true);

    // VTP task
    expect(exam.tasks.some(t => t.checkParams?.commandPattern === 'vtp mode server')).toBe(true);

    // Total weight should be 100
    const totalWeight = exam.tasks.reduce((sum, t) => sum + t.weight, 0);
    expect(totalWeight).toBe(100);
  });

  it('should not extract non-command text from notes', () => {
    const projectData = {
      topology: {
        devices: [],
        connections: [],
        notes: [
          {
            id: 'note-1',
            text: '📝 GENEL TALİMATLAR\n\nBu projede switch yapılandırması yapacaksınız.\nTüm adımları sırayla uygulayın.\n\nBaşarılar!',
            x: 100, y: 100, width: 300, height: 200,
            color: '#ef4444', font: 'verdana', fontSize: 12, opacity: 0.75
          }
        ]
      }
    };

    const exam = generateExamFromProject(projectData as unknown as ProjectData, 'en');

    // Turkish instruction text should not be extracted as commands
    const commandTasks = exam.tasks.filter(t => t.checkType === 'command' && t.id.startsWith('task-note-cmd'));
    expect(commandTasks.length).toBe(0);
  });

  it('should create PC IP config tasks from topology device data', () => {
    const projectData = {
      devices: [],
      topology: {
        devices: [
          {
            id: 'pc-1',
            type: 'pc',
            name: 'PC-1',
            ip: '192.168.1.10',
            subnet: '255.255.255.0',
            gateway: '192.168.1.1'
          },
          {
            id: 'pc-2',
            type: 'pc',
            name: 'PC-2',
            ip: '192.168.1.20',
            subnet: '255.255.255.0',
            gateway: '192.168.1.1'
          }
        ],
        connections: []
      }
    };

    const exam = generateExamFromProject(projectData as unknown as ProjectData, 'en');

    const pc1ConfigTask = exam.tasks.find(t => t.checkParams?.configKey === 'pc.pc-1.ip');
    expect(pc1ConfigTask).toBeDefined();
    expect(pc1ConfigTask?.checkParams?.configValue).toBe('192.168.1.10');

    const pc2ConfigTask = exam.tasks.find(t => t.checkParams?.configKey === 'pc.pc-2.ip');
    expect(pc2ConfigTask).toBeDefined();
    expect(pc2ConfigTask?.checkParams?.configValue).toBe('192.168.1.20');

    const totalWeight = exam.tasks.reduce((sum, t) => sum + t.weight, 0);
    expect(totalWeight).toBe(100);
  });

  it('should extract PC config info and connections from note text', () => {
    const projectData = {
      devices: [],
      topology: {
        devices: [],
        connections: [],
        notes: [
          {
            id: 'note-1',
            text: 'Proje Yapımı:\n1) PC-1: IP 192.168.1.10, Subnet 255.255.255.0\n2) PC-2: IP 192.168.1.20, Subnet 255.255.255.0\n3) PC-1 (eth0) ile Switch-1 (fa0/1) arasını bağlayın',
            x: 100, y: 100, width: 300, height: 200,
            color: '#fee2e2', font: 'Arial', fontSize: 16, opacity: 1
          }
        ]
      }
    };

    const exam = generateExamFromProject(projectData as unknown as ProjectData, 'en');

    // Should create PC IP config tasks from notes
    const pc1Task = exam.tasks.find(t => t.checkParams?.configKey === 'pc.pc-1.ip');
    expect(pc1Task).toBeDefined();
    expect(pc1Task?.checkParams?.configValue).toBe('192.168.1.10');

    // Should create connection tasks from notes
    const connTasks = exam.tasks.filter(t => t.checkType === 'connection');
    expect(connTasks.length).toBeGreaterThanOrEqual(1);

    const totalWeight = exam.tasks.reduce((sum, t) => sum + t.weight, 0);
    expect(totalWeight).toBe(100);
  });

  it('should give higher weight to complex tasks like routing and security', () => {
    const projectData = {
      devices: [
        {
          id: 'router-1',
          state: {
            hostname: 'Router-Main',
            ipRouting: true,
            staticRoutes: [
              { destination: '10.0.0.0', prefixLength: 24, nextHop: '192.168.1.1' }
            ],
            security: {
              enableSecret: 'class',
              servicePasswordEncryption: true,
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
            subnet: '255.255.255.0'
          }
        ],
        connections: []
      }
    };

    const exam = generateExamFromProject(projectData as unknown as ProjectData, 'en');

    // High priority tasks (routing, security) should have higher weight than simple hostname tasks
    const routingTask = exam.tasks.find(t => t.checkParams?.commandPattern === 'ip routing');
    const staticRouteTask = exam.tasks.find(t => t.checkParams?.commandPattern?.startsWith('ip route'));
    const secretTask = exam.tasks.find(t => t.checkParams?.commandPattern === 'enable secret');
    const encryptionTask = exam.tasks.find(t => t.checkParams?.commandPattern === 'service password-encryption');
    const hostnameTask = exam.tasks.find(t => t.checkParams?.commandPattern?.startsWith('hostname'));

    // Hostname is a simple task and should have lower or equal weight compared to complex tasks
    const highPriorityTasks = [routingTask, staticRouteTask, secretTask, encryptionTask].filter(Boolean);
    if (hostnameTask && highPriorityTasks.length > 0) {
      highPriorityTasks.forEach(hpTask => {
        expect((hpTask as NonNullable<typeof hpTask>).weight).toBeGreaterThanOrEqual(hostnameTask.weight);
      });
    }

    const totalWeight = exam.tasks.reduce((sum, t) => sum + t.weight, 0);
    expect(totalWeight).toBe(100);
  });
});
