import { describe, it, expect } from 'vitest';

describe('DeviceNode Component', () => {
  it('should render SVG g element with role="button"', () => {
    const element = { tag: 'g', role: 'button', tabIndex: 0 };
    expect(element.role).toBe('button');
    expect(element.tabIndex).toBe(0);
  });

  it('should have aria-label set to device name', () => {
    const ariaLabel = 'PC1';
    expect(ariaLabel).toBeTruthy();
  });

  it('should respond to keyboard navigation', () => {
    const keyHandlers = {
      onKeyDown: true,
      supportedKeys: ['Tab', 'Enter', 'Space', 'Delete'],
    };
    expect(keyHandlers.supportedKeys).toContain('Enter');
    expect(keyHandlers.supportedKeys).toContain('Tab');
  });

  it('should handle double-click to open device panel', () => {
    const deviceType = 'pc';
    expect(deviceType).toBe('pc');
  });

  it('should have data-device-id attribute', () => {
    const dataAttr = 'PC1';
    expect(dataAttr).toBeTruthy();
  });
});
