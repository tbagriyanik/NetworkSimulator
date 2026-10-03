/**
 * Shared Vitest bootstrap. Runs before every test module.
 *
 * Three pieces of run-wide noise are handled here so individual test files do
 * not have to (and so the noise stops printing between `✓` lines):
 *
 *  1. `EXAM_HMAC_KEY` / `CERTIFICATE_SECRET` — Vitest does not read
 *     `.env.local`, so the crypto modules would otherwise fall back to their
 *     deliberately loud insecure-development warnings.
 *  2. ExperimentalWarning for Node's built-in experimental `localStorage` —
 *     in the jsdom environment `globalThis.localStorage` resolves to Node's
 *     getter rather than jsdom's, and it warns the moment anything probes it.
 *     Node emits that warning on the microtask queue, so it escapes the
 *     worker's own suppression; handling the process `warning` event is what
 *     actually stops it.
 *  3. `HTMLCanvasElement.prototype.getContext` — jsdom logs "Not implemented"
 *     for every call when the native `canvas` package is absent. Tests that
 *     need a live context (the WebGL probes) stub it on their own instance.
 */

// ── 1. Environment secrets ────────────────────────────────────────────────
process.env.EXAM_HMAC_KEY ??= 'test-exam-hmac-key';
process.env.CERTIFICATE_SECRET ??= 'test-certificate-secret';

// ── 2. Node's experimental localStorage warning ───────────────────────────
// Node delivers process warnings on the microtask queue, which is why Vitest's
// per-file suppression does not catch them. Filtering the event here does.
process.on('warning', (warning: Error) => {
  if (warning.name === 'ExperimentalWarning') return;
  console.warn(warning.message);
});

// Defining the property also short-circuits Node's getter entirely. jsdom does
// not expose storage globals, so this never shadows a real implementation.
if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: undefined,
    configurable: true,
    writable: true,
  });
}

// ── 3. Canvas context stub ────────────────────────────────────────────────
if (typeof window !== 'undefined' && typeof window.HTMLCanvasElement !== 'undefined') {
  window.HTMLCanvasElement.prototype.getContext = (() => null) as HTMLCanvasElement['getContext'];
}
