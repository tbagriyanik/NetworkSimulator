import { describe, expect, it } from 'vitest';
import { generateTopology } from '@/components/network/topology/scenarioGenerators';
import { SCENARIOS } from '@/components/network/topology/topologyScenarios';

describe('topology generator scenarios', () => {
  it('generates a valid device/state/port graph for every scenario', () => {
    for (const scenario of SCENARIOS) {
      const topology = generateTopology(scenario.id, 4);
      const ids = new Set(topology.devices.map(d => d.id));
      expect(ids.size, `${scenario.id}: duplicate device id`).toBe(topology.devices.length);
      const addresses = topology.devices.map(d => d.ip).filter(Boolean);
      expect(new Set(addresses).size, `${scenario.id}: duplicate IP`).toBe(addresses.length);
      expect(topology.devices.length, scenario.id).toBeGreaterThan(0);
      const managedDevices = topology.devices.filter(d => d.type !== 'pc' && d.type !== 'iot' && d.type !== 'mobile' && d.type !== 'printer');
      expect(topology.deviceStates.size, scenario.id).toBe(managedDevices.length);
      for (const connection of topology.connections) {
        expect(ids.has(connection.sourceDeviceId), `${scenario.id}: source`).toBe(true);
        expect(ids.has(connection.targetDeviceId), `${scenario.id}: target`).toBe(true);
        const source = topology.devices.find(d => d.id === connection.sourceDeviceId)!;
        const target = topology.devices.find(d => d.id === connection.targetDeviceId)!;
        expect(source.ports.some(p => p.id === connection.sourcePort), `${scenario.id}: source port`).toBe(true);
        expect(target.ports.some(p => p.id === connection.targetPort), `${scenario.id}: target port`).toBe(true);
      }
    }
  });
});
