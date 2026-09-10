/**
 * Web Worker Manager & Client API.
 * Manages background simulation workers with automatic main-thread fallback.
 */

import type { WorkerTaskRequest, WorkerTaskResponse } from './simulationWorker';

export interface SimulationWorkerManagerOptions {
  timeoutMs?: number;
  enableWorker?: boolean;
}

export class SimulationWorkerManager {
  private worker: Worker | null = null;
  private pendingRequests = new Map<string, { resolve: (res: unknown) => void; reject: (err: Error) => void; timer: NodeJS.Timeout }>();
  private timeoutMs: number;
  private isSupported: boolean;

  constructor(options: SimulationWorkerManagerOptions = {}) {
    this.timeoutMs = options.timeoutMs || 3000;
    this.isSupported = typeof window !== 'undefined' && typeof window.Worker !== 'undefined' && (options.enableWorker ?? true);

    if (this.isSupported) {
      this.initWorker();
    }
  }

  private initWorker() {
    try {
      // In Next.js / webpack environment, initialize worker or blob fallback
      const workerCode = `
        self.addEventListener('message', (e) => {
          const { id, type, payload } = e.data || {};
          if (type === 'HEALTH_CHECK') {
            self.postMessage({ id, type, success: true, result: { status: 'healthy' } });
          } else {
            self.postMessage({ id, type, success: true, result: payload });
          }
        });
      `;
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      this.worker = new Worker(workerUrl);

      this.worker.onmessage = (event: MessageEvent<WorkerTaskResponse>) => {
        const { id, success, result, error } = event.data || {};
        const pending = this.pendingRequests.get(id);
        if (pending) {
          clearTimeout(pending.timer);
          this.pendingRequests.delete(id);
          if (success) {
            pending.resolve(result);
          } else {
            pending.reject(new Error(error || 'Worker calculation failed'));
          }
        }
      };

      this.worker.onerror = (err) => {
        console.warn('SimulationWorker background error:', err);
      };
    } catch {
      this.isSupported = false;
      this.worker = null;
    }
  }

  public executeTask<T>(type: 'CALCULATE_PATH' | 'HEALTH_CHECK', payload: Record<string, unknown>): Promise<T> {
    const id = `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    if (!this.isSupported || !this.worker) {
      // Synchronous Main-Thread Fallback
      return this.fallbackExecution<T>(type, payload);
    }

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        // Fallback to main thread execution on worker timeout
        this.fallbackExecution<T>(type, payload).then(resolve).catch(reject);
      }, this.timeoutMs);

      this.pendingRequests.set(id, { resolve: resolve as (res: unknown) => void, reject, timer });

      const request: WorkerTaskRequest = { id, type, payload };
      this.worker?.postMessage(request);
    });
  }

  private async fallbackExecution<T>(type: string, payload: Record<string, unknown>): Promise<T> {
    if (type === 'HEALTH_CHECK') {
      return { status: 'healthy-fallback' } as unknown as T;
    }
    return payload as unknown as T;
  }

  public terminate() {
    this.pendingRequests.forEach((p) => clearTimeout(p.timer));
    this.pendingRequests.clear();
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}

// Global instance helper
export const globalSimulationWorkerManager = new SimulationWorkerManager();
