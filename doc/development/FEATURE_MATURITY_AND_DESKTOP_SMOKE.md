# Feature Maturity and Desktop Smoke Checklist

This page records the boundary between an educational simulation and an external
protocol implementation. It is also the release checklist for packaged desktop
builds.

## Control-plane maturity

The following commands update simulator state and may create synthetic frames,
but do not open external sockets or require a real server:

| Area | CLI hint | Current boundary |
| --- | --- | --- |
| NETCONF / RESTCONF / YANG | `[sim-only] netconf ...` / `[sim-only] restconf ...` | In-memory datastore and request/response modelling; no external NETCONF client or HTTP controller daemon. |
| MQTT | `[sim-only] mqtt ...` | In-process broker/client state and telemetry frames; no external broker connection. |
| CoAP | `[sim-only] coap ...` | Simulated resource transactions; no UDP socket or external endpoint. |
| NetFlow / sFlow | `[sim-only] show ip cache flow` and export configuration | Flow records and export state are simulator data; no collector interoperability guarantee. |

When a CLI help or command table names one of these features, the `sim-only`
label is part of the feature contract. A successful command proves parser,
state, and simulator-path behaviour only; it does not prove wire compatibility.

## Evidence matrix for v7.0 features

Before calling a feature complete, verify all applicable layers:

| Evidence layer | What to verify |
| --- | --- |
| CLI | Positive command, validation/error path, and matching `no` command. |
| State / `show` | Configuration persists and operational output reflects it. |
| Packet / pipeline | A packet, synthetic frame, or explicit drop reason is observable. |
| Regression | A focused test covers the positive and negative path. |

Not every v7.0 feature currently has all four proofs. README feature lists
must therefore be read together with the maturity table above and the focused
tests in `src/tests/`.

## Packaged desktop smoke checklist

Run this checklist on the actual target platform after producing an artifact.

### Windows, macOS, and Linux

- [ ] Application opens from a clean install or extracted artifact.
- [ ] A sample topology opens without console errors.
- [ ] Add, move, and delete a device; save and reload the project.
- [ ] Add and remove a cable; verify port/link state updates.
- [ ] Open CLI and run a basic `show` command.
- [ ] Create a note and verify it remains attached after zoom/pan.
- [ ] Export a PNG and verify dimensions, devices, cables, and notes.
- [ ] Close and reopen the application without a corrupted project or crash.

### Linux `.AppImage`

- [ ] Mark the file executable and launch it on the supported distribution.
- [ ] Verify WebKitGTK dependencies are present and the first window renders.
- [ ] Complete the common checklist above.

### macOS `.dmg`

- [ ] Install by copying the app from the mounted image.
- [ ] Launch it on the supported macOS version and approve the expected security prompt.
- [ ] Complete the common checklist above.

## Low-resource parity

The low-resource build changes rendering and packaging defaults, not simulator
semantics. The following capabilities must remain available and are smoke-tested
against the standard desktop build:

| Capability | Standard | Low-resource |
| --- | :---: | :---: |
| Topology editing and project save/load | Yes | Yes |
| CLI, `show`, and `no` commands | Yes | Yes |
| Packet capture / inspection | Yes | Yes |
| Device and cable interactions | Yes | Yes |
| Notes, zoom, and pan | Yes | Yes |
| PNG export | Yes | Yes |
| High-quality visual effects | Yes | Reduced/disabled |
| External protocol sockets | No | No |

Any future low-resource-only restriction must be added to this table and to the
release notes before shipping.

## Regression evidence currently present

The repository currently includes dedicated suites for the previously recurring
coverage gaps:

| Area | Evidence |
| --- | --- |
| Story mode and guided verification | `StoryModePanel.test.ts` and `guidedModeVerifier.test.ts`; transition, choice, reset, error, config, connection, and progress checks |
| Multicast | `multicastEngine.test.ts`; join/leave, RP fallback/failover, shared/source-tree changes, malformed input, pruning, and burst handling |
| SDN controller | `sdnController.test.ts`; YANG parsing, datastore access, inventory, path trace, intent policy, flow priority, and NETCONF RPC validation |
| Performance | Explicit thresholds in `device-scale-500.test.ts`, `render-profiling.test.ts`, `memory-leak.test.ts`, `device-limit.test.ts`, and `baseline.test.ts` |

The performance contract includes, among others, 500-device construction below
3 seconds, under 50 MB heap delta where measurable, render budgets of 16.67 ms
for a frame, and heap growth below 15 MB across the memory-leak scenario. These
are regression budgets, not hardware-independent product guarantees.
