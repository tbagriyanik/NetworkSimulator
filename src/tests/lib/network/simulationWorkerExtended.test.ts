import { describe, it, expect } from 'vitest';
import { calculateDijkstraSpf } from '@/lib/network/workers/simulationWorker';
import { SimulationWorkerManager } from '@/lib/network/workers/simulationWorkerManager';

describe('simulationWorkerExtended (Web Worker Dijkstra SPF & Protocol Ticker Offloading)', () => {
  it('calculates deterministic Dijkstra shortest path first across mesh network', () => {
    const nodes = ['R1', 'R2', 'R3', 'R4'];
    const links = [
      { source: 'R1', target: 'R2', cost: 10 },
      { source: 'R2', target: 'R3', cost: 10 },
      { source: 'R1', target: 'R4', cost: 5 },
      { source: 'R4', target: 'R3', cost: 5 }, // R1 -> R4 -> R3 cost is 10 vs R1 -> R2 -> R3 cost is 20
    ];

    const spf = calculateDijkstraSpf(nodes, links, 'R1');

    expect(spf['R1'].distance).toBe(0);
    expect(spf['R1'].path).toEqual(['R1']);

    expect(spf['R2'].distance).toBe(10);
    expect(spf['R2'].path).toEqual(['R1', 'R2']);

    expect(spf['R4'].distance).toBe(5);
    expect(spf['R4'].path).toEqual(['R1', 'R4']);

    expect(spf['R3'].distance).toBe(10);
    expect(spf['R3'].path).toEqual(['R1', 'R4', 'R3']);
  });

  it('executes CALCULATE_SPF task via SimulationWorkerManager', async () => {
    const manager = new SimulationWorkerManager({ enableWorker: false });
    const nodes = ['A', 'B', 'C'];
    const links = [
      { source: 'A', target: 'B', cost: 1 },
      { source: 'B', target: 'C', cost: 2 },
    ];

    const result = await manager.executeTask<Record<string, { distance: number; path: string[] }>>(
      'CALCULATE_SPF',
      { nodes, links, sourceId: 'A' }
    );

    expect(result['C'].distance).toBe(3);
    expect(result['C'].path).toEqual(['A', 'B', 'C']);
  });

  it('executes TICK_PROTOCOLS task via SimulationWorkerManager', async () => {
    const manager = new SimulationWorkerManager({ enableWorker: false });
    const payload = { elapsedMs: 1000, activeDeviceCount: 15 };

    const result = await manager.executeTask<Record<string, unknown>>(
      'TICK_PROTOCOLS',
      payload
    );

    expect(result).toBeDefined();
    expect(result.elapsedMs).toBe(1000);
    expect(result.activeDeviceCount).toBe(15);
  });
});
