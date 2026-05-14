
import { describe, it, expect } from 'vitest';
import { generateIotDevicePageContent } from './iotWebPanel';

describe('iotWebPanel XSS Regression Tests', () => {
  const xssPayload = '"><img src=x onerror=alert(1)>';

  it('should sanitize sensorType labels in generateIotDevicePageContent', () => {
    const allDevices = [
      {
        id: 'malicious-sensor',
        name: 'Malicious Sensor',
        type: 'iot',
        iot: {
          sensorType: xssPayload,
          dataFlowDirection: 'input'
        }
      } as any
    ];

    const html = generateIotDevicePageContent('dev1', 'Device 1', 'en', true, false, 'sensor', [], 'temperature', [], 'input', allDevices);

    // The payload should be sanitized in the option label
    expect(html).not.toContain(xssPayload);
    expect(html).toContain('&quot;&gt;&lt;img src=x onerror=alert(1)&gt;');
  });

  it('should sanitize device kind in targetDeviceSelect', () => {
    const allDevices = [
      {
        id: 'target-dev',
        name: 'Target Device',
        type: 'iot',
        iot: {
          kind: xssPayload,
          dataFlowDirection: 'output'
        }
      } as any
    ];

    const html = generateIotDevicePageContent('dev1', 'Device 1', 'en', true, false, 'sensor', [], 'temperature', [], 'input', allDevices);

    // The payload should be sanitized in the option text
    expect(html).not.toContain(xssPayload);
    expect(html).toContain('&quot;&gt;&lt;img src=x onerror=alert(1)&gt;');
  });
});
