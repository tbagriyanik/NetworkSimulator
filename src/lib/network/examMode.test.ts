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
});
