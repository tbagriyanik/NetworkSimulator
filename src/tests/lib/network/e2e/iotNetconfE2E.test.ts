import { describe, it, expect } from 'vitest';
import { processMqtt, processCoap } from '@/lib/network/applicationProtocols';
import { processNetconfFrame } from '@/lib/network/netconfTransport';
import type { SwitchState } from '@/lib/network/types';

describe('IoT Application Protocols & NETCONF Transport E2E Pipeline', () => {
  describe('MQTT Broker & CoAP REST Engine', () => {
    it('handles MQTT CONNECT -> SUBSCRIBE -> PUBLISH (QoS 1) -> PUBACK cycle', () => {
      let brokerState = {} as SwitchState;

      // 1. Client Connect
      const connRes = processMqtt(brokerState, { type: 'CONNECT', clientId: 'sensor-temp-01' });
      expect(connRes.response?.type).toBe('CONNACK');
      expect(connRes.response?.clientId).toBe('sensor-temp-01');
      brokerState = connRes.state;

      // 2. Subscribe to telemetry topic
      const subRes = processMqtt(brokerState, {
        type: 'SUBSCRIBE',
        clientId: 'sensor-temp-01',
        topic: 'factory/building1/temperature',
      });
      expect(subRes.response?.type).toBe('SUBACK');
      expect(subRes.response?.topic).toBe('factory/building1/temperature');
      brokerState = subRes.state;

      // 3. Publish sensor telemetry with QoS 1
      const pubRes = processMqtt(brokerState, {
        type: 'PUBLISH',
        clientId: 'sensor-temp-01',
        topic: 'factory/building1/temperature',
        payload: '{"temperature": 24.5, "unit": "C"}',
        qos: 1,
        packetId: 101,
      });

      expect(pubRes.response?.type).toBe('PUBACK');
      expect(pubRes.response?.packetId).toBe(101);
    });

    it('handles CoAP RESTful PUT -> GET (2.05 Content) -> DELETE -> GET (4.04 Not Found)', () => {
      let iotState = {} as SwitchState;

      // 1. PUT resource
      const putRes = processCoap(iotState, {
        type: 'CON',
        code: 'PUT',
        messageId: 201,
        path: '/actuator/relay1',
        payload: 'state=ON',
      });
      expect(putRes.response.code).toBe('2.04');
      iotState = putRes.state;

      // 2. GET resource
      const getRes = processCoap(iotState, {
        type: 'CON',
        code: 'GET',
        messageId: 202,
        path: '/actuator/relay1',
      });
      expect(getRes.response.code).toBe('2.05');
      expect(getRes.response.payload).toBe('state=ON');
      iotState = getRes.state;

      // 3. DELETE resource
      const delRes = processCoap(iotState, {
        type: 'CON',
        code: 'DELETE',
        messageId: 203,
        path: '/actuator/relay1',
      });
      expect(delRes.response.code).toBe('2.04');
      iotState = delRes.state;

      // 4. GET deleted resource -> 4.04 Not Found
      const notFoundRes = processCoap(iotState, {
        type: 'CON',
        code: 'GET',
        messageId: 204,
        path: '/actuator/relay1',
      });
      expect(notFoundRes.response.code).toBe('4.04');
    });
  });

  describe('NETCONF XML/YANG RPC Subsystem', () => {
    it('handles <hello>, <edit-config> data mutation, and <close-session>', () => {
      let routerState = { hostname: 'Managed-Router' } as SwitchState;

      // 1. Hello exchange
      const helloRes = processNetconfFrame(routerState, '192.168.1.50', {
        messageId: '101',
        operation: 'hello',
      });
      expect(helloRes.response.operation).toBe('hello');
      routerState = helloRes.state;

      // 2. Edit-config RPC: Mutate YANG configuration model
      const editRes = processNetconfFrame(routerState, '192.168.1.50', {
        messageId: '102',
        operation: 'edit-config',
        path: '/native/interface/GigabitEthernet[name=0/1]',
        data: {
          'ip:address': '10.10.10.1',
          'ip:netmask': '255.255.255.0',
          'shutdown': false,
        },
      });
      expect(editRes.response.operation).toBe('commit');
      routerState = editRes.state;

      const yangData = (routerState as unknown as { netconfYangData: Record<string, unknown> }).netconfYangData;
      expect(yangData?.['ip:address']).toBe('10.10.10.1');

      // 3. Close session RPC
      const closeRes = processNetconfFrame(routerState, '192.168.1.50', {
        messageId: '103',
        operation: 'close-session',
      });
      expect(closeRes.response.operation).toBe('close-session');
    });
  });
});
