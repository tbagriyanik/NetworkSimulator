import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createDragDomCache,
  clearDragDomCache,
  collectDeviceElements,
  collectConnectionElements,
  getCachedDeviceElement,
  getCachedConnectionElements,
} from '@/hooks/networkTopology/topologyDomCache';

/**
 * The drag commit path writes SVG attributes directly for every frame of a
 * drag. It used to locate each node with `document.querySelector`, which scans
 * the whole SVG tree — O(devices + connections) per lookup, so O(n²) per frame
 * for n moved devices. These tests pin the cached behaviour and the fallbacks.
 */

function buildCanvasFixture(deviceIds: string[], connectionIds: string[]) {
  const root = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

  for (const id of deviceIds) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('data-device-id', id);
    g.classList.add('topology-device-draggable');
    const inner = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    inner.setAttribute('data-device-id', id);
    g.appendChild(inner);
    root.appendChild(g);
  }

  for (const id of connectionIds) {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('data-connection-id', id);
    group.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'path'));
    group.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'path'));
    for (let i = 0; i < 4; i++) {
      group.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'text'));
    }
    root.appendChild(group);

    const handle = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    handle.setAttribute('data-connection-handle-id', id);
    const inner = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    inner.setAttribute('data-handle-inner', 'true');
    handle.appendChild(inner);
    root.appendChild(handle);
  }

  document.body.appendChild(root);
  return root;
}

describe('topologyDomCache — device elements', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('resolves every device group in one sweep and reuses the handles', () => {
    const root = buildCanvasFixture(['d1', 'd2', 'd3'], []);
    const cache = createDragDomCache();

    collectDeviceElements(root, cache, ['d1', 'd2']);
    expect([...cache.devices.keys()].sort()).toEqual(['d1', 'd2', 'd3']);

    const first = getCachedDeviceElement(cache, 'd1');
    const second = getCachedDeviceElement(cache, 'd1');
    expect(first).toBe(second);
    expect(first?.getAttribute('data-device-id')).toBe('d1');
    expect(first?.classList.contains('topology-device-draggable')).toBe(true);
  });

  it('falls back to a targeted lookup for an unknown id and caches the result', () => {
    buildCanvasFixture(['d1'], []);
    const cache = createDragDomCache();

    const node = getCachedDeviceElement(cache, 'd1');
    expect(node).not.toBeNull();
    expect(cache.devices.get('d1')).toBe(node);
  });

  it('drops a detached node from the cache and re-resolves it', () => {
    const root = buildCanvasFixture(['d1'], []);
    const cache = createDragDomCache();
    collectDeviceElements(root, cache, ['d1']);

    const stale = cache.devices.get('d1')!;
    stale.remove();
    // Re-attach under a new node, as a re-render would.
    const fresh = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    fresh.setAttribute('data-device-id', 'd1');
    fresh.classList.add('topology-device-draggable');
    document.body.appendChild(fresh);

    const resolved = getCachedDeviceElement(cache, 'd1');
    expect(resolved).toBe(fresh);
    expect(resolved).not.toBe(stale);
  });

  it('clears every cached handle', () => {
    const root = buildCanvasFixture(['d1'], []);
    const cache = createDragDomCache();
    collectDeviceElements(root, cache, ['d1']);
    collectConnectionElements(root, cache, ['c1']);

    clearDragDomCache(cache);
    expect(cache.devices.size).toBe(0);
    expect(cache.connections.size).toBe(0);
  });
});

describe('topologyDomCache — connection elements', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('caches the paths, texts and trash handle of a connection group', () => {
    const root = buildCanvasFixture([], ['c1', 'c2']);
    const cache = createDragDomCache();

    collectConnectionElements(root, cache, ['c1']);
    const refs = cache.connections.get('c1');

    expect(refs?.paths).toHaveLength(2);
    expect(refs?.texts).toHaveLength(4);
    expect(refs?.handleInner?.getAttribute('data-handle-inner')).toBe('true');
  });

  it('resolves lazily when a connection was not pre-collected', () => {
    const root = buildCanvasFixture([], ['c1']);
    const cache = createDragDomCache();

    expect(cache.connections.size).toBe(0);
    const refs = getCachedConnectionElements(cache, 'c1', root);
    expect(refs?.paths).toHaveLength(2);
    expect(cache.connections.get('c1')).toBe(refs);
  });

  it('returns null for a connection that does not exist', () => {
    const root = buildCanvasFixture([], ['c1']);
    const cache = createDragDomCache();
    expect(getCachedConnectionElements(cache, 'nope', root)).toBeNull();
    expect(cache.connections.has('nope')).toBe(false);
  });
});

describe('topologyDomCache — per-frame DOM query budget', () => {
  const DEVICES = 400;
  const FRAMES = 10;

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('performs zero tree queries for cached devices across a whole drag', () => {
    const ids = Array.from({ length: DEVICES }, (_, i) => `d${i}`);
    const root = buildCanvasFixture(ids, []);
    const cache = createDragDomCache();

    // One sweep when the drag starts...
    collectDeviceElements(root, cache, ids);

    const querySelector = vi.spyOn(document, 'querySelector');
    const querySelectorAll = vi.spyOn(Element.prototype, 'querySelectorAll');

    // ...then every frame reuses the handles without touching the DOM tree.
    for (let frame = 0; frame < FRAMES; frame++) {
      for (const id of ids) {
        getCachedDeviceElement(cache, id)?.setAttribute('transform', `translate(${frame}, ${frame})`);
      }
    }

    expect(querySelector).not.toHaveBeenCalled();
    expect(querySelectorAll).not.toHaveBeenCalled();
  });

  it('shows the per-frame cost the cache removes: one tree query per moved device', () => {
    // Only two frames here: the point is the ratio (queries === devices x
    // frames), and running the real 10x400 sweep took long enough under a
    // parallel test run to trip the per-test timeout without proving anything
    // extra.
    const DEMO_FRAMES = 2;
    const ids = Array.from({ length: DEVICES }, (_, i) => `d${i}`);
    buildCanvasFixture(ids, []);

    const querySelector = vi.spyOn(document, 'querySelector');

    // The pre-cache drag loop did exactly this, once per device, per frame.
    for (let frame = 0; frame < DEMO_FRAMES; frame++) {
      for (const id of ids) {
        document.querySelector(`[data-device-id="${id}"]`);
      }
    }

    expect(querySelector).toHaveBeenCalledTimes(DEVICES * DEMO_FRAMES);
  });
});
