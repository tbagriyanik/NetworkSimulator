## 2025-05-15 - Redundant 60fps Re-renders from Mouse Position
**Learning:** The `NetworkTopology` component was re-rendering on every `mousemove` event because `setMousePos` was called unconditionally. This triggered a full React diffing cycle for a massive SVG tree at 60fps, even when only panning or hovering. The `mousePos` state is only consumed by `TempConnection` during cable drawing.
**Action:** Always wrap high-frequency state updates (like mouse positions) in the specific conditional blocks where they are needed, and throttle them with `requestAnimationFrame`.

## 2025-05-15 - Spatial Partitioner Scalability
**Learning:** `SpatialPartitioner.removeConnection` had O(Cells) complexity, which scales poorly as the canvas grows. Additionally, `assignNode` performed redundant array operations during drags when nodes moved within the same grid cell.
**Action:** Use tracking maps (e.g., `connectionCells`) to enable O(1) removals in spatial data structures, and implement early returns for intra-cell movement.
