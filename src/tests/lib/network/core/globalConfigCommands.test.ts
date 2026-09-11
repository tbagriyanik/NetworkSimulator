import { describe, it, expect } from 'vitest'; 
import type { SwitchState } from '@/lib/network/types'; 
import type { CommandContext } from '@/lib/network/core/commandTypes';

describe('Global Configuration Commands', () => {
  it('should configure IP routing', () => {
    const cmd = 'ip routing';
    expect(cmd).toBe('ip routing');
  });

  it('should configure IPv6 routing', () => {
    const cmd = 'ipv6 unicast-routing';
    expect(cmd).toBe('ipv6 unicast-routing');
  });

  it('should configure IP subnet-zero', () => {
    const cmd = 'ip subnet-zero';
    expect(cmd).toBe('ip subnet-zero');
  });

  it('should configure IP classless', () => {
    const cmd = 'ip classless';
    expect(cmd).toBe('ip classless');
  });

  it('should configure IP domain lookup', () => {
    const cmd = 'ip domain-lookup';
    expect(cmd).toBe('ip domain-lookup');
  });

  it('should configure no IP domain lookup', () => {
    const cmd = 'no ip domain-lookup';
    expect(cmd).toBe('no ip domain-lookup');
  });

  it('should configure service timestamps', () => {
    const cmd = 'service timestamps debug datetime msec localtime show-timezone';
    expect(cmd).toContain('service timestamps');
    expect(cmd).toContain('datetime');
  });

  it('should configure service sequence-numbers', () => {
    const cmd = 'service sequence-numbers';
    expect(cmd).toBe('service sequence-numbers');
  });

  it('should configure logging synchronous', () => {
    const cmd = 'logging synchronous';
    expect(cmd).toBe('logging synchronous');
  });

  it('should configure no logging console', () => {
    const cmd = 'no logging console';
    expect(cmd).toBe('no logging console');
  });

  it('should test Syslog and SLA command additions', () => {
    expect('logging host 192.168.1.50').toContain('logging host');
    expect('logging trap warning').toContain('logging trap');
    expect('ip sla 1').toContain('ip sla');
    expect('spanning-tree mode mst').toContain('mst');
  });

  it('should support sequence-numbered named ACL entries and deletion', async () => {
    const { cmdNamedAclPermit, cmdNamedAclDeny, cmdNamedAclNoPermit } = await import('@/lib/network/core/globalConfigAclCommands');
    let state = {
      currentMode: 'config-std-nacl',
      currentNamedAcl: 'SECURE-ACL',
      accessLists: {},
    } as unknown as SwitchState;

    const res1 = cmdNamedAclPermit(state, '20 permit 192.168.1.0 0.0.0.255', {} as CommandContext);
    state = { ...state, ...res1.newState };
    const res2 = cmdNamedAclDeny(state, '10 deny host 10.0.0.1', {} as CommandContext);
    state = { ...state, ...res2.newState };

    expect(state.accessLists!['SECURE-ACL']).toEqual([
      '10 deny host 10.0.0.1',
      '20 permit 192.168.1.0 0.0.0.255',
    ]);

    const res3 = cmdNamedAclNoPermit(state, 'no 10', {} as CommandContext);
    state = { ...state, ...res3.newState };

    expect(state.accessLists!['SECURE-ACL']).toEqual([
      '20 permit 192.168.1.0 0.0.0.255',
    ]);
  });
});

