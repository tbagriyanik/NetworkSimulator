import { CommandHandler } from '../executor';

export const firewallHandlers: Record<string, CommandHandler> = {
  'nameif': (state, input) => {
    if (state.currentInterface && state.ports[state.currentInterface]) {
      const parts = input.trim().split(/\s+/);
      const name = parts[1];
      if (!name) return { success: false, error: '% Incomplete command.' };

      const port = state.ports[state.currentInterface];
      const updatedPort = { ...port, nameif: name };

      // Auto-set security level for 'inside'
      if (name.toLowerCase() === 'inside' && port.securityLevel === undefined) {
        updatedPort.securityLevel = 100;
      } else if (port.securityLevel === undefined) {
        updatedPort.securityLevel = 0;
      }

      const newState = {
        ports: {
          ...state.ports,
          [state.currentInterface]: updatedPort
        }
      };
      return {
        success: true,
        output: `INFO: Security level for "${name}" set to ${updatedPort.securityLevel} by default.`,
        newState
      };
    }
    return { success: false, error: '% Error: No interface selected' };
  },
  'security-level': (state, input) => {
    if (state.currentInterface && state.ports[state.currentInterface]) {
      const parts = input.trim().split(/\s+/);
      const levelStr = parts[1];
      if (!levelStr) return { success: false, error: '% Incomplete command.' };

      const level = parseInt(levelStr);
      if (isNaN(level) || level < 0 || level > 100) {
        return { success: false, error: '% Error: Security level must be between 0 and 100' };
      }
      const newState = {
        ports: {
          ...state.ports,
          [state.currentInterface]: {
            ...state.ports[state.currentInterface],
            securityLevel: level
          }
        }
      };
      return { success: true, newState };
    }
    return { success: false, error: '% Error: No interface selected' };
  }
};
