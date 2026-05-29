## 2025-05-22 - Optimizing topology synchronization loop
**Learning:** Found an O(N*M*K) bottleneck in the `NetworkTopology` synchronization `useEffect`. The code was iterating over all devices (D) and all ports (P), and for each port, it was scanning the entire connections (C) array using `.some()`. For large topologies, this resulted in thousands of redundant scans per synchronization cycle.
**Action:** Use pre-calculated `Set` or `Map` lookups (index building) before entering nested loops. Building a `Set` of connected ports takes O(C) time and allows O(1) lookups inside the O(D*P) loop, reducing total complexity to O(C + D*P).

## 2025-05-23 - Eliminating (C^2)$ in Connection Rendering
**Learning:** The render loop for connections in `NetworkTopology.tsx` was performing a full scan of all connections for *every* connection rendered to calculate parallel cable offsets. This led to (C^2)$ complexity on every frame during dragging or panning.
**Action:** Implement (C)$ pre-calculation of connection metadata (offsets and totals) using `useMemo` and a `Map`. Combine this with viewport culling (using spatial partitioning results) to ensure the render loop only processes visible connections with (1)$ metadata lookups.
