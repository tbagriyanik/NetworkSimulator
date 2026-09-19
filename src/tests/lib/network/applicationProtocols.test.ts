import { describe, expect, it } from 'vitest';
import { processMqtt, processCoap } from '@/lib/network/applicationProtocols';
import type { SwitchState } from '@/lib/network/types';

const state = () => ({ hostname: 'IoT-GW' } as unknown as SwitchState);

describe('MQTT and CoAP packet interaction', () => {
  it('tracks MQTT client/topic state and returns broker acknowledgements', () => {
    let result = processMqtt(state(), { type: 'CONNECT', clientId: 'sensor-1' });
    expect(result.response?.type).toBe('CONNACK');
    result = processMqtt(result.state, { type: 'PUBLISH', clientId: 'sensor-1', topic: 'lab/temp', payload: '23' });
    expect((result.state as SwitchState & { mqttTopics: Record<string, string> }).mqttTopics['lab/temp']).toBe('23');
  });

  it('serves CoAP resources through GET and PUT semantics', () => {
    let result = processCoap(state(), { type: 'CON', code: 'PUT', messageId: 7, path: '/sensor/temp', payload: '23' });
    expect(result.response.code).toBe('2.04');
    result = processCoap(result.state, { type: 'CON', code: 'GET', messageId: 8, path: '/sensor/temp' });
    expect(result.response.code).toBe('2.05');
    expect(result.response.payload).toBe('23');
  });
});
