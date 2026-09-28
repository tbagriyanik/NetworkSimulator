import type { CommandPattern } from './commandPatterns.types';

/**
 * Control-plane application protocol ingress (NETCONF / MQTT / CoAP).
 *
 * These exec-mode commands synthesise a control-plane frame and push it through
 * `processControlPlaneProtocols`, which is what makes `netconfSessions`,
 * `mqttClients` and `coapResources` observable at runtime. See
 * `core/controlPlaneProtocolCommands.ts` for the handler side.
 */
export const controlPlanePatterns: Record<string, CommandPattern> = {
  // --- NETCONF ---
  'netconf hello': {
    pattern: /^netconf\s+hello\s+(\S+)$/i,
    modes: ['privileged'],
    minArgs: 1,
    maxArgs: 1
  },
  'netconf get': {
    pattern: /^netconf\s+get\s+(\S+)(?:\s+(\S+))?$/i,
    modes: ['privileged'],
    minArgs: 1,
    maxArgs: 2
  },
  'netconf edit-config': {
    pattern: /^netconf\s+edit-config\s+(\S+)\s+(\S+)\s+(.+)$/i,
    modes: ['privileged'],
    minArgs: 3,
    maxArgs: 12
  },
  'netconf close-session': {
    pattern: /^netconf\s+close-session\s+(\S+)$/i,
    modes: ['privileged'],
    minArgs: 1,
    maxArgs: 1
  },

  // --- MQTT ---
  'mqtt connect': {
    pattern: /^mqtt\s+connect\s+(\S+)$/i,
    modes: ['privileged'],
    minArgs: 1,
    maxArgs: 1
  },
  'mqtt subscribe': {
    pattern: /^mqtt\s+subscribe\s+(\S+)\s+(\S+)$/i,
    modes: ['privileged'],
    minArgs: 2,
    maxArgs: 2
  },
  'mqtt publish': {
    pattern: /^mqtt\s+publish\s+(\S+)\s+(\S+)\s+(.+)$/i,
    modes: ['privileged'],
    minArgs: 3,
    maxArgs: 4
  },

  // --- CoAP ---
  'coap get': {
    pattern: /^coap\s+get\s+(\S+)$/i,
    modes: ['privileged'],
    minArgs: 1,
    maxArgs: 1
  },
  'coap put': {
    pattern: /^coap\s+(?:put|post)\s+(\S+)\s+(.+)$/i,
    modes: ['privileged'],
    minArgs: 2,
    maxArgs: 2
  },
  'coap delete': {
    pattern: /^coap\s+delete\s+(\S+)$/i,
    modes: ['privileged'],
    minArgs: 1,
    maxArgs: 1
  },

  // --- Inspection ---
  'show netconf sessions': {
    pattern: /^show\s+netconf\s+sessions$/i,
    modes: ['user', 'privileged'],
    minArgs: 0,
    maxArgs: 0
  },
  'show mqtt clients': {
    pattern: /^show\s+mqtt\s+clients$/i,
    modes: ['user', 'privileged'],
    minArgs: 0,
    maxArgs: 0
  },
  'show mqtt topics': {
    pattern: /^show\s+mqtt\s+topics$/i,
    modes: ['user', 'privileged'],
    minArgs: 0,
    maxArgs: 0
  },
  'show coap resources': {
    pattern: /^show\s+coap\s+resources$/i,
    modes: ['user', 'privileged'],
    minArgs: 0,
    maxArgs: 0
  },
};
