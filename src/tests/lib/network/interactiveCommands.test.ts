import { describe, it, expect } from 'vitest';
import { executeCommand } from '../../../lib/network/executor';
import { createInitialState } from '../../../lib/network/initialState';
import { SwitchState } from '../../../lib/network/types';
import { buildRunningConfig } from '../../../lib/network/core/configBuilder';

describe('Interactive and Diagnostic CLI Commands Implementation', () => {
  const createBaseState = (): SwitchState => {
    const base = createInitialState('Router1', 'NS-L3-24PS');
    return {
      ...base,
      deviceType: 'router',
      currentMode: 'privileged',
      ipRouting: true,
      ports: {
        ...base.ports,
        'fastethernet0/1': {
          id: 'fastethernet0/1',
          name: 'FastEthernet0/1',
          status: 'connected',
          vlan: 1,
          mode: 'routed',
          duplex: 'auto',
          speed: '100',
          shutdown: false,
          type: 'fastethernet',
          ipAddress: '192.168.1.1',
          subnetMask: '255.255.255.0'
        }
      }
    };
  };

  describe('1. Multi-Mode Aliases (alias configure, alias interface, alias line, alias exec)', () => {
    it('should configure, show, serialize, and execute multi-mode aliases', () => {
      let state = createBaseState();
      state.currentMode = 'config';

      // 1. Configure aliases in different modes
      const res1 = executeCommand(state, 'alias configure sc show clock');
      expect(res1.success).toBe(true);
      state = { ...state, ...res1.newState };
      expect(state.aliases?.configure?.sc).toBe('show clock');

      const res2 = executeCommand(state, 'alias interface s show');
      expect(res2.success).toBe(true);
      state = { ...state, ...res2.newState };
      expect(state.aliases?.interface?.s).toBe('show');

      const res3 = executeCommand(state, 'alias line to exec-timeout');
      expect(res3.success).toBe(true);
      state = { ...state, ...res3.newState };
      expect(state.aliases?.line?.to).toBe('exec-timeout');

      const res4 = executeCommand(state, 'alias exec sr show running-config');
      expect(res4.success).toBe(true);
      state = { ...state, ...res4.newState };
      expect(state.aliases?.exec?.sr).toBe('show running-config');

      // 2. show alias
      state.currentMode = 'privileged';
      const showAll = executeCommand(state, 'show alias');
      expect(showAll.success).toBe(true);
      expect(showAll.output).toContain('Configure aliases:');
      expect(showAll.output).toContain('sc');
      expect(showAll.output).toContain('Interface aliases:');
      expect(showAll.output).toContain('Line aliases:');
      expect(showAll.output).toContain('Exec aliases:');
      expect(showAll.output).toContain('sh');
      expect(showAll.output).toContain('conf');
      // VRP & Comware compatibility aliases
      expect(showAll.output).toContain('system-view');
      expect(showAll.output).toContain('display saved-configuration');
      expect(showAll.output).toContain('dis cur');
      expect(showAll.output).toContain('undo <command>');

      // 3. show alias configure
      const showConfig = executeCommand(state, 'show alias configure');
      expect(showConfig.success).toBe(true);
      expect(showConfig.output).toContain('Configure aliases:');
      expect(showConfig.output).toContain('system-view');
      expect(showConfig.output).not.toContain('Interface aliases:');
      // VRP exec aliases must not leak into the configure filter
      expect(showConfig.output).not.toContain('display saved-configuration');

      // 4. Config builder serialization
      const configStr = buildRunningConfig(state);
      expect(configStr).toContain('alias configure sc show clock');
      expect(configStr).toContain('alias interface s show');
      expect(configStr).toContain('alias line to exec-timeout');
      expect(configStr).toContain('alias exec sr show running-config');

      // 5. Test alias expansion and execution in exec mode
      const execRes = executeCommand(state, 'sr');
      expect(execRes.success).toBe(true);
      expect(execRes.output).toContain('Current configuration');

      // 6. Test no alias configure
      state.currentMode = 'config';
      const noRes = executeCommand(state, 'no alias configure sc');
      expect(noRes.success).toBe(true);
      state = { ...state, ...noRes.newState };
      expect(state.aliases?.configure?.sc).toBeUndefined();
    });
  });

  describe('2. Interactive Setup Configuration Dialog Wizard', () => {
    it('should run through interactive setup wizard dialog step-by-step', () => {
      let state = createBaseState();
      state.currentMode = 'privileged';

      // Start setup
      const res0 = executeCommand(state, 'setup');
      expect(res0.success).toBe(true);
      expect(res0.output).toContain('Would you like to enter the initial configuration dialog?');
      state = { ...state, ...res0.newState };
      expect(state.setupDialog?.step).toBe('enter_dialog');

      // Step: enter_dialog -> yes
      const res1 = executeCommand(state, 'yes');
      expect(res1.success).toBe(true);
      expect(res1.output).toContain('Would you like to enter basic management setup?');
      state = { ...state, ...res1.newState };
      expect(state.setupDialog?.step).toBe('basic_mgmt');

      // Step: basic_mgmt -> yes
      const res2 = executeCommand(state, 'yes');
      expect(res2.success).toBe(true);
      expect(res2.output).toContain('Enter host name');
      state = { ...state, ...res2.newState };
      expect(state.setupDialog?.step).toBe('hostname');

      // Step: hostname -> CoreRouter
      const res3 = executeCommand(state, 'CoreRouter');
      expect(res3.success).toBe(true);
      expect(res3.output).toContain('Enter enable secret');
      state = { ...state, ...res3.newState };
      expect(state.setupDialog?.answers.hostname).toBe('CoreRouter');
      expect(state.setupDialog?.step).toBe('enable_secret');

      // Step: enable_secret -> netsim123
      const res4 = executeCommand(state, 'netsim123');
      expect(res4.success).toBe(true);
      expect(res4.output).toContain('Enter enable password');
      state = { ...state, ...res4.newState };
      expect(state.setupDialog?.step).toBe('enable_password');

      // Step: enable_password -> netsim
      const res5 = executeCommand(state, 'netsim');
      expect(res5.success).toBe(true);
      expect(res5.output).toContain('Enter virtual terminal password');
      state = { ...state, ...res5.newState };
      expect(state.setupDialog?.step).toBe('vty_password');

      // Step: vty_password -> vtypass
      const res6 = executeCommand(state, 'vtypass');
      expect(res6.success).toBe(true);
      expect(res6.output).toContain('Enter interface name');
      state = { ...state, ...res6.newState };
      expect(state.setupDialog?.step).toBe('mgmt_interface');

      // Step: mgmt_interface -> FastEthernet0/1
      const res7 = executeCommand(state, 'FastEthernet0/1');
      expect(res7.success).toBe(true);
      expect(res7.output).toContain('Configure IP on this interface?');
      state = { ...state, ...res7.newState };
      expect(state.setupDialog?.step).toBe('mgmt_ip');

      // Step: mgmt_ip -> yes
      const res8 = executeCommand(state, 'yes');
      expect(res8.success).toBe(true);
      expect(res8.output).toContain('IP address for this interface:');
      state = { ...state, ...res8.newState };
      expect(state.setupDialog?.step).toBe('mgmt_mask');

      // Step: mgmt_mask (IP input) -> 10.10.10.1
      const res9 = executeCommand(state, '10.10.10.1');
      expect(res9.success).toBe(true);
      expect(res9.output).toContain('Subnet mask for this interface');
      state = { ...state, ...res9.newState };

      // Step: mgmt_mask (Mask input) -> 255.255.255.0
      const res10 = executeCommand(state, '255.255.255.0');
      expect(res10.success).toBe(true);
      expect(res10.output).toContain('Save this configuration to nvram');
      state = { ...state, ...res10.newState };
      expect(state.setupDialog?.step).toBe('save_nvram');

      // Step: save_nvram -> 2
      const res11 = executeCommand(state, '2');
      expect(res11.success).toBe(true);
      expect(res11.output).toContain('Building configuration');
      state = { ...state, ...res11.newState };
      expect(state.setupDialog).toBeUndefined();
      expect(state.hostname).toBe('CoreRouter');
      expect(state.security.enableSecret).toBe('netsim123');
      expect(state.ports['fastethernet0/1'].ipAddress).toBe('10.10.10.1');
    });

    it('should allow aborting setup dialog cleanly', () => {
      let state = createBaseState();
      state.currentMode = 'privileged';

      const res0 = executeCommand(state, 'setup');
      state = { ...state, ...res0.newState };

      const resAbort = executeCommand(state, 'abort');
      expect(resAbort.success).toBe(true);
      expect(resAbort.output).toMatch(/Aborting setup|Kurulum sihirbazı iptal edildi/);
      state = { ...state, ...resAbort.newState };
      expect(state.setupDialog).toBeUndefined();
    });
  });

  describe('3. Remote Outgoing Sessions (suspend, resume, disconnect, show sessions)', () => {
    it('should manage background session state lifecycle', () => {
      let state = createBaseState();
      state.currentMode = 'privileged';

      // Initially no sessions
      const resShowInit = executeCommand(state, 'show sessions');
      expect(resShowInit.success).toBe(true);
      expect(resShowInit.output).toContain('% No active sessions');

      // Add mock active outgoing session
      state.activeSessions = [
        { id: 1, host: '192.168.1.10', protocol: 'telnet', status: 'active' },
        { id: 2, host: '10.0.0.5', protocol: 'ssh', status: 'suspended' }
      ];

      // Show sessions
      const resShow = executeCommand(state, 'show sessions');
      expect(resShow.success).toBe(true);
      expect(resShow.output).toContain('192.168.1.10');
      expect(resShow.output).toContain('10.0.0.5');

      // Suspend active session
      const resSuspend = executeCommand(state, 'suspend');
      expect(resSuspend.success).toBe(true);
      expect(resSuspend.output).toContain('suspended');
      state = { ...state, ...resSuspend.newState };
      expect(state.activeSessions?.find(s => s.id === 1)?.status).toBe('suspended');

      // Resume session 2
      const resResume = executeCommand(state, 'resume 2');
      expect(resResume.success).toBe(true);
      expect(resResume.output).toContain('Resuming connection 2');
      state = { ...state, ...resResume.newState };
      expect(state.activeSessions?.find(s => s.id === 2)?.status).toBe('active');

      // Disconnect session 1
      const resDisc = executeCommand(state, 'disconnect 1');
      expect(resDisc.success).toBe(true);
      expect(resDisc.output).toContain('closed');
      state = { ...state, ...resDisc.newState };
      expect(state.activeSessions?.find(s => s.id === 1)).toBeUndefined();
      expect(state.activeSessions?.length).toBe(1);
    });
  });

  describe('4. Diagnostic Testing Engine (test ...)', () => {
    it('should run various test subcommands with informative results', () => {
      const state = createBaseState();
      state.currentMode = 'privileged';

      // Usage when no arguments
      const resHelp = executeCommand(state, 'test');
      expect(resHelp.success).toBe(true);
      expect(resHelp.output).toContain('Usage: test');

      // test memory
      const resMem = executeCommand(state, 'test memory');
      expect(resMem.success).toBe(true);
      expect(resMem.output).toContain('Processor Memory: PASSED');
      expect(resMem.output).toContain('NVRAM Checksum: PASSED');

      // test interfaces
      const resIntf = executeCommand(state, 'test interfaces');
      expect(resIntf.success).toBe(true);
      expect(resIntf.output).toContain('Interface Diagnostic Test Summary');

      // test interface FastEthernet0/1
      const resIntfSingle = executeCommand(state, 'test interface FastEthernet0/1');
      expect(resIntfSingle.success).toBe(true);
      expect(resIntfSingle.output).toContain('Internal Loopback Test: PASSED');

      // test cable-diagnostics tdr interface FastEthernet0/1
      const resCable = executeCommand(state, 'test cable-diagnostics tdr interface FastEthernet0/1');
      expect(resCable.success).toBe(true);
      expect(resCable.output).toContain('TDR test completed');

      // test vlan 1
      const resVlan = executeCommand(state, 'test vlan 1');
      expect(resVlan.success).toBe(true);
      expect(resVlan.output).toContain('VLAN 1');
      expect(resVlan.output).toContain('NORMAL');
    });
  });
});
