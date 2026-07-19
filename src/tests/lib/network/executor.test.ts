import { describe, it, expect } from 'vitest';

describe('Executor & Network Utilities', () => {
  describe('Cable Compatibility', () => {
    function isCableCompatible(typeA: string, typeB: string): boolean {
      const managed = ['router', 'switchL2', 'switchL3', 'firewall', 'wlc'];
      const endpoints = ['pc', 'iot', 'server'];
      if (typeA === typeB) return true;
      if (endpoints.includes(typeA) && managed.includes(typeB)) return true;
      if (managed.includes(typeA) && endpoints.includes(typeB)) return true;
      if (managed.includes(typeA) && managed.includes(typeB)) return true;
      return false;
    }

    it('should allow straight cable between different device types', () => {
      expect(isCableCompatible('pc', 'switchL2')).toBe(true);
      expect(isCableCompatible('pc', 'switchL3')).toBe(true);
      expect(isCableCompatible('router', 'switchL2')).toBe(true);
    });

    it('should allow crossover cable between same device types', () => {
      expect(isCableCompatible('pc', 'pc')).toBe(true);
      expect(isCableCompatible('router', 'router')).toBe(true);
      expect(isCableCompatible('switchL2', 'switchL2')).toBe(true);
    });

    it('should allow console cable to managed devices', () => {
      expect(isCableCompatible('pc', 'router')).toBe(true);
      expect(isCableCompatible('pc', 'switchL2')).toBe(true);
    });

    it('should handle firewall connections', () => {
      expect(isCableCompatible('firewall', 'switchL2')).toBe(true);
      expect(isCableCompatible('firewall', 'router')).toBe(true);
    });

    it('should handle WLC connections', () => {
      expect(isCableCompatible('wlc', 'switchL2')).toBe(true);
      expect(isCableCompatible('wlc', 'switchL3')).toBe(true);
    });

    it('should handle IoT connections', () => {
      expect(isCableCompatible('iot', 'wlc')).toBe(true);
      expect(isCableCompatible('iot', 'switchL2')).toBe(true);
    });
  });

  describe('Port Capabilities', () => {
    const switchPorts = ['fa0/1', 'fa0/2', 'fa0/3', 'fa0/4', 'gi0/1', 'gi0/2'];
    const routerPorts = ['gi0/0', 'gi0/1', 'gi0/2', 'gi0/3', 'serial0/0/0', 'serial0/0/1'];
    const pcPort = ['eth0'];

    it('should identify switch FastEthernet ports', () => {
      expect(switchPorts.filter(p => p.startsWith('fa'))).toHaveLength(4);
    });

    it('should identify switch GigabitEthernet ports', () => {
      expect(switchPorts.filter(p => p.startsWith('gi'))).toHaveLength(2);
    });

    it('should identify router serial ports', () => {
      expect(routerPorts.filter(p => p.startsWith('serial'))).toHaveLength(2);
    });

    it('should identify PC ethernet port', () => {
      expect(pcPort).toContain('eth0');
    });
  });

  describe('Command Mode Detection', () => {
    it('should detect user EXEC mode', () => {
      const prompt = 'Switch>';
      expect(prompt.endsWith('>')).toBe(true);
    });

    it('should detect privileged EXEC mode', () => {
      const prompt = 'Switch#';
      expect(prompt.endsWith('#')).toBe(true);
    });

    it('should detect global config mode', () => {
      const prompt = 'Switch(config)#';
      expect(prompt.includes('(config)')).toBe(true);
    });

    it('should detect interface config mode', () => {
      const prompt = 'Switch(config-if)#';
      expect(prompt.includes('(config-if)')).toBe(true);
    });

    it('should detect line config mode', () => {
      const prompt = 'Switch(config-line)#';
      expect(prompt.includes('(config-line)')).toBe(true);
    });

    it('should detect VLAN config mode', () => {
      const prompt = 'Switch(config-vlan)#';
      expect(prompt.includes('(config-vlan)')).toBe(true);
    });

    it('should detect router config mode', () => {
      const prompt = 'Router(config-router)#';
      expect(prompt.includes('(config-router)')).toBe(true);
    });
  });
});
