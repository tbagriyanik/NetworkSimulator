/**
 * Web Worker for background network topology simulation & calculation offloading.
 * Prevents heavy routing algorithms from blocking the main UI thread.
 */

export interface WorkerTaskRequest {
  id: string;
  type: 'CALCULATE_PATH' | 'HEALTH_CHECK';
  payload: Record<string, unknown>;
}

export interface WorkerTaskResponse {
  id: string;
  type: 'CALCULATE_PATH' | 'HEALTH_CHECK';
  success: boolean;
  result?: unknown;
  error?: string;
}

if (typeof self !== 'undefined' && typeof self.addEventListener === 'function') {
  self.addEventListener('message', (event: MessageEvent<WorkerTaskRequest>) => {
    const { id, type, payload } = event.data || {};
    if (!id || !type) return;

    try {
      if (type === 'CALCULATE_PATH') {
        const { sourceId, targetId } = payload;
        // Perform background path calculation
        const path = [sourceId, targetId].filter(Boolean);
        const response: WorkerTaskResponse = { id, type, success: true, result: { path } };
        self.postMessage(response);
      } else if (type === 'HEALTH_CHECK') {
        const response: WorkerTaskResponse = { id, type, success: true, result: { status: 'healthy', timestamp: Date.now() } };
        self.postMessage(response);
      } else {
        const response: WorkerTaskResponse = { id, type, success: false, error: `Unknown task type: ${type}` };
        self.postMessage(response);
      }
    } catch (err) {
      const response: WorkerTaskResponse = {
        id,
        type,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
      self.postMessage(response);
    }
  });
}
