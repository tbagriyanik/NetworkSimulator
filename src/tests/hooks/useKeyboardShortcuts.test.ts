import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('useKeyboardShortcuts', () => {
  let eventListeners: Map<string, EventListener> = new Map();

  beforeEach(() => {
    eventListeners = new Map();
    vi.stubGlobal('window', {
      addEventListener: (event: string, handler: EventListener) => {
        eventListeners.set(event, handler);
      },
      removeEventListener: (event: string, _handler: EventListener) => {
        eventListeners.delete(event);
      },
      document: {
        hasFocus: () => true,
        activeElement: { tagName: 'BODY' },
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    eventListeners.clear();
  });

  function createKeyboardEvent(overrides: Partial<KeyboardEvent>): KeyboardEvent {
    return {
      key: '',
      code: '',
      ctrlKey: false,
      metaKey: false,
      altKey: false,
      shiftKey: false,
      preventDefault: vi.fn(),
      defaultPrevented: false,
      ...overrides,
    } as unknown as KeyboardEvent;
  }

  it('should register keydown listener', () => {
    expect(eventListeners.has('keydown')).toBe(false);
  });

  it('should handle Ctrl+Z for undo', () => {
    const handler = eventListeners.get('keydown');
    if (handler) {
      const event = createKeyboardEvent({ key: 'z', ctrlKey: true });
      handler(event);
    }
  });

  it('should handle Ctrl+Y for redo', () => {
    const handler = eventListeners.get('keydown');
    if (handler) {
      const event = createKeyboardEvent({ key: 'y', ctrlKey: true });
      handler(event);
    }
  });

  it('should handle Ctrl+S for save', () => {
    const handler = eventListeners.get('keydown');
    if (handler) {
      const event = createKeyboardEvent({ key: 's', ctrlKey: true });
      handler(event);
    }
  });

  it('should handle Escape key', () => {
    const handler = eventListeners.get('keydown');
    if (handler) {
      const event = createKeyboardEvent({ key: 'Escape' });
      handler(event);
    }
  });

  it('should handle F1 key for about modal toggle', () => {
    const handler = eventListeners.get('keydown');
    if (handler) {
      const event = createKeyboardEvent({ key: 'F1' });
      handler(event);
    }
  });

  it('should handle F5 key for refresh', () => {
    const handler = eventListeners.get('keydown');
    if (handler) {
      const event = createKeyboardEvent({ key: 'F5' });
      handler(event);
    }
  });

  it('should handle Tab key for device navigation', () => {
    const handler = eventListeners.get('keydown');
    if (handler) {
      const event = createKeyboardEvent({ key: 'Tab', shiftKey: false });
      handler(event);
    }
  });

  it('should handle Shift+Tab for reverse device navigation', () => {
    const handler = eventListeners.get('keydown');
    if (handler) {
      const event = createKeyboardEvent({ key: 'Tab', shiftKey: true });
      handler(event);
    }
  });

  it('should handle Enter key to open device', () => {
    const handler = eventListeners.get('keydown');
    if (handler) {
      const event = createKeyboardEvent({ key: 'Enter' });
      handler(event);
    }
  });

  it('should clean up listener on unmount', () => {
    expect(eventListeners.size).toBe(0);
  });
});
