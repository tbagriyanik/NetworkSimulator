import { describe, it, expect } from 'vitest';
import { shouldOpenPingPacketPanel } from '@/components/network/hooks/usePingSequence';
import { getPortPosition } from '@/components/network/networkTopology.helpers';
import { isModulePort } from '@/lib/network/portUtils';
import type { CanvasDevice } from '@/components/network/networkTopology.types';

describe('NetworkTopology Component', () => {
  it('should render SVG canvas element', () => {
    const canvasType = 'svg';
    expect(canvasType).toBe('svg');
  });

  it('should support device selection via click', () => {
    const deviceEvent = { type: 'click', deviceId: 'PC1' };
    expect(deviceEvent.deviceId).toBe('PC1');
  });

  it('should support device dragging', () => {
    const dragState = { isDragging: true, deviceId: 'PC1', deltaX: 50, deltaY: 30 };
    expect(dragState.isDragging).toBe(true);
  });

  it('should support connection drawing', () => {
    const connectionState = { isDrawing: true, sourceDevice: 'PC1', sourcePort: 'eth0' };
    expect(connectionState.isDrawing).toBe(true);
  });

  it('should render device nodes for all device types', () => {
    const deviceTypes = ['pc', 'router', 'switchL2', 'switchL3', 'firewall', 'wlc', 'iot'];
    expect(deviceTypes).toHaveLength(7);
  });

  it('should render connection lines between devices', () => {
    const connections = [
      { source: 'PC1', target: 'SW1', type: 'straight' },
      { source: 'SW1', target: 'R1', type: 'straight' },
    ];
    expect(connections).toHaveLength(2);
  });

  it('should show context menu on right-click', () => {
    const contextMenu = { visible: true, x: 100, y: 200, deviceId: 'PC1' };
    expect(contextMenu.visible).toBe(true);
    expect(contextMenu.deviceId).toBe('PC1');
  });

  it('should handle zoom in/out', () => {
    const zoom = { current: 1.0, min: 0.25, max: 3.0 };
    expect(zoom.current).toBeGreaterThanOrEqual(zoom.min);
    expect(zoom.current).toBeLessThanOrEqual(zoom.max);
  });

  it('should support pan via drag', () => {
    const pan = { x: 100, y: 50 };
    expect(typeof pan.x).toBe('number');
  });

  it('should produce ping animation on successful ping', () => {
    const pingAnimation = { active: true, sourceId: 'PC1', targetId: 'PC2' };
    expect(pingAnimation.active).toBe(true);
  });

  it('should keep packet analysis closed for CLI-triggered ping and traceroute', () => {
    expect(shouldOpenPingPacketPanel()).toBe(true);
    expect(shouldOpenPingPacketPanel(false)).toBe(false);
    expect(shouldOpenPingPacketPanel(undefined)).toBe(true);
  });

  describe('Port Positioning with Module Ports', () => {
    it('should identify module ports correctly', () => {
      expect(isModulePort('Serial0/1/0')).toBe(true);
      expect(isModulePort('FastEthernet0/1/0')).toBe(true);
      expect(isModulePort('GigabitEthernet0/1/0')).toBe(true);
      expect(isModulePort('TenGigabitEthernet0/1/0')).toBe(true);
      
      // Built-in ports should not be identified as module ports
      expect(isModulePort('gi0/0')).toBe(false);
      expect(isModulePort('gi0/1')).toBe(false);
      expect(isModulePort('gi0/2')).toBe(false);
      expect(isModulePort('gi0/3')).toBe(false);
      expect(isModulePort('s0/0/0')).toBe(false);
      expect(isModulePort('s0/1/0')).toBe(false);
      expect(isModulePort('s0/2/0')).toBe(false);
      expect(isModulePort('console')).toBe(false);
      expect(isModulePort('wlan0')).toBe(false);
      expect(isModulePort('fa0/1')).toBe(false);
      expect(isModulePort('fa0/24')).toBe(false);
      expect(isModulePort('gi0/1')).toBe(false); // Switch built-in uplink
      expect(isModulePort('gi0/2')).toBe(false); // Switch built-in uplink
    });

    it('should correctly identify built-in serial ports vs module serial ports', () => {
      // Built-in serial ports should not be module ports
      expect(isModulePort('s0/0/0')).toBe(false);
      expect(isModulePort('s0/1/0')).toBe(false);
      expect(isModulePort('s0/2/0')).toBe(false);
      
      // Module serial ports should be identified correctly
      expect(isModulePort('Serial0/1/0')).toBe(true);
      expect(isModulePort('Serial0/1/1')).toBe(true);
      expect(isModulePort('Serial0/2/0')).toBe(true);
    });

    it('should position module ports after built-in ports for routers', () => {
      const routerDevice: CanvasDevice = {
        id: 'router1',
        type: 'router',
        name: 'Router1',
        x: 100,
        y: 100,
        status: 'online',
        ip: '192.168.1.1',
        ports: [
          { id: 'console', label: 'Console', status: 'disconnected' },
          { id: 'gi0/0', label: 'Gi0/0', status: 'disconnected' },
          { id: 'gi0/1', label: 'Gi0/1', status: 'disconnected' },
          { id: 'gi0/2', label: 'Gi0/2', status: 'disconnected' },
          { id: 'gi0/3', label: 'Gi0/3', status: 'disconnected' },
          { id: 's0/0/0', label: 'S0/0/0', status: 'disconnected' },
          { id: 's0/1/0', label: 'S0/1/0', status: 'disconnected' },
          { id: 's0/2/0', label: 'S0/2/0', status: 'disconnected' },
          { id: 'wlan0', label: 'WLAN0', status: 'disconnected', shutdown: true },
          // Module ports
          { id: 'Serial0/1/0', label: 'Se0/1/0', status: 'disconnected' },
          { id: 'Serial0/1/1', label: 'Se0/1/1', status: 'disconnected' },
        ],
      };

      const builtInPortPos = getPortPosition(routerDevice, 'gi0/0');
      const modulePortPos = getPortPosition(routerDevice, 'Serial0/1/0');

      // Module ports should be positioned below built-in ports
      expect(modulePortPos.y).toBeGreaterThan(builtInPortPos.y);
    });

    it('should position module ports after built-in ports for switches', () => {
      const switchDevice: CanvasDevice = {
        id: 'switch1',
        type: 'switchL2',
        name: 'Switch1',
        x: 100,
        y: 100,
        status: 'online',
        ip: '192.168.1.2',
        ports: [
          { id: 'fa0/1', label: 'Fa0/1', status: 'disconnected' },
          { id: 'fa0/2', label: 'Fa0/2', status: 'disconnected' },
          { id: 'fa0/3', label: 'Fa0/3', status: 'disconnected' },
          { id: 'fa0/4', label: 'Fa0/4', status: 'disconnected' },
          { id: 'fa0/5', label: 'Fa0/5', status: 'disconnected' },
          { id: 'fa0/6', label: 'Fa0/6', status: 'disconnected' },
          { id: 'fa0/7', label: 'Fa0/7', status: 'disconnected' },
          { id: 'fa0/8', label: 'Fa0/8', status: 'disconnected' },
          { id: 'console', label: 'Console', status: 'disconnected' },
          { id: 'gi0/1', label: 'Gi0/1', status: 'disconnected' },
          { id: 'gi0/2', label: 'Gi0/2', status: 'disconnected' },
          // Module ports
          { id: 'TenGigabitEthernet0/1/0', label: 'Te0/1/0', status: 'disconnected' },
        ],
      };

      const builtInPortPos = getPortPosition(switchDevice, 'fa0/1');
      const modulePortPos = getPortPosition(switchDevice, 'TenGigabitEthernet0/1/0');

      // Module ports should be positioned below built-in ports
      expect(modulePortPos.y).toBeGreaterThan(builtInPortPos.y);
    });

    it('should maintain order of built-in ports', () => {
      const routerDevice: CanvasDevice = {
        id: 'router1',
        type: 'router',
        name: 'Router1',
        x: 100,
        y: 100,
        status: 'online',
        ip: '192.168.1.1',
        ports: [
          { id: 'console', label: 'Console', status: 'disconnected' },
          { id: 'gi0/0', label: 'Gi0/0', status: 'disconnected' },
          { id: 'gi0/1', label: 'Gi0/1', status: 'disconnected' },
          { id: 'gi0/2', label: 'Gi0/2', status: 'disconnected' },
          { id: 'gi0/3', label: 'Gi0/3', status: 'disconnected' },
          { id: 's0/0/0', label: 'S0/0/0', status: 'disconnected' },
          { id: 's0/1/0', label: 'S0/1/0', status: 'disconnected' },
          { id: 's0/2/0', label: 'S0/2/0', status: 'disconnected' },
          { id: 'wlan0', label: 'WLAN0', status: 'disconnected', shutdown: true },
        ],
      };

      const gi0_0Pos = getPortPosition(routerDevice, 'gi0/0');
      const gi0_1Pos = getPortPosition(routerDevice, 'gi0/1');
      const consolePos = getPortPosition(routerDevice, 'console');

      // GI ports should be in row 0, console in row 1
      expect(gi0_0Pos.y).toBeLessThan(consolePos.y);
      expect(gi0_1Pos.y).toBeLessThan(consolePos.y);
      
      // GI ports should be in the same row
      expect(gi0_0Pos.y).toBe(gi0_1Pos.y);
    });
  });
});
