/**
 * Per-interaction DOM element cache for the topology canvas.
 *
 * Dragging updates SVG nodes directly (bypassing React) at up to one frame per
 * 16ms. Looking elements up with `document.querySelector` on every frame scans
 * the whole SVG subtree, which is O(devices + connections) per lookup and turns
 * a drag into O(n²) work — the exact reason dragging a large topology crawls on
 * weak hardware.
 *
 * The rendered nodes are stable for the duration of a drag (React does not
 * re-render the moved devices while their positions are written straight to the
 * DOM), so resolving them once when the drag starts is both correct and much
 * cheaper. `isConnected` guards against a node that was replaced anyway.
 */

export interface DragConnectionElements {
  /** Every `path` inside the connection group — base line plus glow/trail variants. */
  paths: SVGPathElement[];
  /** Port label texts, in the order the drag loop expects (src, src, tgt, tgt). */
  texts: SVGTextElement[];
  /** Inner group of the trash handle. */
  handleInner: SVGGElement | null;
}

export interface DragDomCache {
  devices: Map<string, SVGGElement>;
  connections: Map<string, DragConnectionElements>;
}

export function createDragDomCache(): DragDomCache {
  return {
    devices: new Map<string, SVGGElement>(),
    connections: new Map<string, DragConnectionElements>(),
  };
}

export function clearDragDomCache(cache: DragDomCache): void {
  cache.devices.clear();
  cache.connections.clear();
}

/** Resolve every device group under `root` once, keyed by device id. */
export function collectDeviceElements(
  root: ParentNode | null,
  cache: DragDomCache,
  deviceIds: Iterable<string>
): void {
  cache.devices.clear();
  if (!root) return;

  // A single pass over the tree is far cheaper than one query per id when the
  // ids being moved are only a subset of a large topology.
  const nodes = root.querySelectorAll<SVGGElement>('[data-device-id]');
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const id = node.getAttribute('data-device-id');
    if (id) cache.devices.set(id, node);
  }

  // Fall back to targeted queries only for ids the sweep missed (e.g. a device
  // rendered outside the canvas root).
  for (const id of deviceIds) {
    if (cache.devices.has(id)) continue;
    const node = document.querySelector<SVGGElement>('[data-device-id="' + id + '"]');
    if (node) cache.devices.set(id, node);
  }
}

/** Resolve a connection group plus its child nodes once. */
export function collectConnectionElements(
  root: ParentNode | null,
  cache: DragDomCache,
  connectionIds: Iterable<string>
): void {
  cache.connections.clear();
  if (!root) return;

  for (const id of connectionIds) {
    if (cache.connections.has(id)) continue;

    const group =
      root.querySelector<SVGGElement>('[data-connection-id="' + id + '"]') ??
      document.querySelector<SVGGElement>('[data-connection-id="' + id + '"]');
    if (!group) continue;

    const paths = Array.from(group.querySelectorAll<SVGPathElement>('path'));
    const texts = Array.from(group.querySelectorAll<SVGTextElement>('text'));
    const handleGroup =
      root.querySelector<SVGGElement>('[data-connection-handle-id="' + id + '"]') ??
      document.querySelector<SVGGElement>('[data-connection-handle-id="' + id + '"]');
    const handleInner = handleGroup
      ? handleGroup.querySelector<SVGGElement>('[data-handle-inner="true"]')
      : null;

    cache.connections.set(id, { paths, texts, handleInner });
  }
}

export function getCachedDeviceElement(
  cache: DragDomCache,
  deviceId: string
): SVGGElement | null {
  const cached = cache.devices.get(deviceId);
  if (cached?.isConnected) return cached;

  const node = document.querySelector<SVGGElement>('[data-device-id="' + deviceId + '"]');
  if (node) cache.devices.set(deviceId, node);
  else cache.devices.delete(deviceId);
  return node;
}

export function getCachedConnectionElements(
  cache: DragDomCache,
  connectionId: string,
  root?: ParentNode | null
): DragConnectionElements | null {
  const cached = cache.connections.get(connectionId);
  // `texts.length === 0` is a valid shape, so validate against the first path.
  if (cached && (cached.paths.length === 0 || cached.paths[0].isConnected)) return cached;
  if (cached) cache.connections.delete(connectionId);

  if (root) {
    collectConnectionElements(root, cache, [connectionId]);
    return cache.connections.get(connectionId) ?? null;
  }
  return null;
}
