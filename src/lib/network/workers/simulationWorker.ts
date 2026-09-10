/**
 * Web Worker for background network topology simulation & calculation offloading.
 * Prevents heavy routing algorithms from blocking the main UI thread.
 */

export interface WorkerTaskRequest {
  id: string;
  type: 'CALCULATE_PATH' | 'CALCULATE_SPF' | 'TICK_PROTOCOLS' | 'HEALTH_CHECK';
  payload: Record<string, unknown>;
}

export interface WorkerTaskResponse {
  id: string;
  type: 'CALCULATE_PATH' | 'CALCULATE_SPF' | 'TICK_PROTOCOLS' | 'HEALTH_CHECK';
  success: boolean;
  result?: unknown;
  error?: string;
}

export interface SpfNode {
  id: string;
  cost: number;
  visited: boolean;
  previousNode?: string;
}

/**
 * Deterministic Dijkstra calculation offloaded to worker thread.
 */
export function calculateDijkstraSpf(
  nodes: string[],
  links: Array<{ source: string; target: string; cost: number }>,
  sourceId: string
): Record<string, { distance: number; path: string[] }> {
  const distances: Record<string, number> = {};
  const previous: Record<string, string | null> = {};
  const unvisited = new Set<string>(nodes);

  for (const node of nodes) {
    distances[node] = Infinity;
    previous[node] = null;
  }
  distances[sourceId] = 0;

  while (unvisited.size > 0) {
    let closestNode: string | null = null;
    let minDistance = Infinity;

    for (const node of unvisited) {
      if (distances[node] < minDistance) {
        minDistance = distances[node];
        closestNode = node;
      }
    }

    if (!closestNode || minDistance === Infinity) break;
    unvisited.delete(closestNode);

    const neighbors = links.filter((l) => l.source === closestNode || l.target === closestNode);
    for (const link of neighbors) {
      const neighbor = link.source === closestNode ? link.target : link.source;
      if (!unvisited.has(neighbor)) continue;

      const alt = distances[closestNode] + (link.cost || 1);
      if (alt < distances[neighbor]) {
        distances[neighbor] = alt;
        previous[neighbor] = closestNode;
      }
    }
  }

  const result: Record<string, { distance: number; path: string[] }> = {};
  for (const node of nodes) {
    const path: string[] = [];
    let curr: string | null = node;
    while (curr) {
      path.unshift(curr);
      curr = previous[curr] || null;
    }
    result[node] = {
      distance: distances[node],
      path: path[0] === sourceId ? path : [],
    };
  }

  return result;
}

if (typeof self !== 'undefined' && typeof self.addEventListener === 'function') {
  self.addEventListener('message', (event: MessageEvent<WorkerTaskRequest>) => {
    const { id, type, payload } = event.data || {};
    if (!id || !type) return;

    try {
      if (type === 'CALCULATE_PATH') {
        const { sourceId, targetId } = payload as { sourceId: string; targetId: string };
        const path = [sourceId, targetId].filter(Boolean);
        const response: WorkerTaskResponse = { id, type, success: true, result: { path } };
        self.postMessage(response);
      } else if (type === 'CALCULATE_SPF') {
        const { nodes, links, sourceId } = payload as {
          nodes: string[];
          links: Array<{ source: string; target: string; cost: number }>;
          sourceId: string;
        };
        const spfResult = calculateDijkstraSpf(nodes || [], links || [], sourceId || '');
        const response: WorkerTaskResponse = { id, type, success: true, result: spfResult };
        self.postMessage(response);
      } else if (type === 'TICK_PROTOCOLS') {
        const { elapsedMs, activeDeviceCount } = payload as { elapsedMs: number; activeDeviceCount: number };
        const response: WorkerTaskResponse = {
          id,
          type,
          success: true,
          result: {
            ticked: true,
            elapsedMs,
            activeDeviceCount,
            timestamp: Date.now(),
          },
        };
        self.postMessage(response);
      } else if (type === 'HEALTH_CHECK') {
        const response: WorkerTaskResponse = {
          id,
          type,
          success: true,
          result: { status: 'healthy', timestamp: Date.now() },
        };
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

