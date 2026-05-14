## 2026-05-14 - [O(1) Device Lookups in NetworkTopology]
**Learning:** The `NetworkTopology.tsx` component was performing dozens of O(n) `.find()` operations on the `devices` array during every render and inside frequent event handlers (drag, mousemove, tooltips). As the topology size grows, this leads to quadratic complexity in some render paths.
**Action:** Use a memoized `Map<string, CanvasDevice>` (deviceMap) to provide O(1) lookups by device ID. Ensure the Map is included in hook dependency arrays that previously relied on the `devices` array for lookups.
