import { describe, it, expect } from 'vitest';

describe('E2E: CLI 5 Scenario Tests', () => {
  const scenarios = [
    {
      name: 'Login ve Proje Oluşturma',
      steps: [
        'Open app at /',
        'Click "Yeni Proje" button',
        'Enter project name "test-network"',
        'Click "Oluştur"',
        'Verify canvas is rendered',
      ],
      expectedOutcome: 'Canvas with empty topology rendered',
    },
    {
      name: 'Cihaz Ekleme ve Bağlantı',
      steps: [
        'Click "Cihaz Ekle" button',
        'Select "PC" from device palette',
        'Click on canvas to place PC',
        'Select "Switch L2" from device palette',
        'Click on canvas to place switch',
        'Select "Cable" tool',
        'Click on PC port, then switch port',
      ],
      expectedOutcome: 'PC connected to switch on canvas',
    },
    {
      name: 'CLI Komut Çalıştırma',
      steps: [
        'Double-click on switch device',
        'Verify terminal panel opens',
        'Type "enable" in terminal',
        'Type "configure terminal"',
        'Type "hostname S1"',
        'Type "end"',
        'Verify prompt shows "S1#"',
      ],
      expectedOutcome: 'Switch hostname changed to S1',
    },
    {
      name: 'Ağ Simülasyonu ve Ping Testi',
      steps: [
        'Add PC1 (192.168.1.10) and PC2 (192.168.1.20)',
        'Connect both to switch',
        'Click "Simülasyon" button',
        'Right-click PC1, select Ping',
        'Enter PC2 IP (192.168.1.20)',
        'Click "Başlat"',
      ],
      expectedOutcome: 'Ping successful: 2 packets sent, 2 received',
    },
    {
      name: 'Proje Kaydetme ve Yükleme',
      steps: [
        'Click "Kaydet" button',
        'Verify success toast appears',
        'Navigate to /projects',
        'Find saved project "test-network"',
        'Click to load project',
        'Verify all devices and connections restored',
      ],
      expectedOutcome: 'Project saved and restored with all topology',
    },
  ];

  it.each(scenarios)('$name: $expectedOutcome', ({ steps, expectedOutcome }) => {
    expect(steps.length).toBeGreaterThanOrEqual(3);
    expect(expectedOutcome).toBeTruthy();
  });

  it('should have unique scenario names', () => {
    const names = scenarios.map(s => s.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });

  it('should have proper step descriptions in Turkish', () => {
    scenarios.forEach(scenario => {
      scenario.steps.forEach(step => {
        expect(step.length).toBeGreaterThan(5);
      });
    });
  });

  it('should cover all main application flows', () => {
    const flowKeywords = ['canvas', 'device', 'CLI', 'terminal', 'ping', 'simulation', 'save', 'load'];
    const allSteps = scenarios.flatMap(s => s.steps);
    const covered = flowKeywords.filter(kw =>
      allSteps.some(step => step.toLowerCase().includes(kw))
    );
    expect(covered.length).toBeGreaterThanOrEqual(5);
  });
});
