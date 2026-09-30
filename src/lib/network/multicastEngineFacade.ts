// © Network Simulator – multicast engine façade (v7.1)
// ------------------------------------------------------------
// Provides a stable public API for unit tests and external callers.
// The implementation lives in the mock module `src/lib/network/engine/multicastEngineMock`.
// This facade simply re‑export the mock implementation and its types.

// No imports needed; we re‑export the mock implementation directly
export * from './engine/multicastEngineMock';
