import { describe, it, expect, afterEach } from 'vitest';
import { SimulationWorkerManager } from '@/lib/network/workers/simulationWorkerManager';

describe('SimulationWorkerManager', () => {
  let manager: SimulationWorkerManager;

  afterEach(() => {
    if (manager) {
      manager.terminate();
    }
  });

  it('should fallback gracefully to main-thread when worker is disabled', async () => {
    manager = new SimulationWorkerManager({ enableWorker: false });

    const result = await manager.executeTask<{ status: string }>('HEALTH_CHECK', {});
    expect(result.status).toBe('healthy-fallback');
  });

  it('should execute background payload tasks successfully', async () => {
    manager = new SimulationWorkerManager({ enableWorker: false });

    const payload = { sourceId: 'pc-1', targetId: 'router-1' };
    const result = await manager.executeTask<typeof payload>('CALCULATE_PATH', payload);

    expect(result).toEqual(payload);
  });
});
