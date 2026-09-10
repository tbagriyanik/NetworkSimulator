import { describe, it, expect } from 'vitest';
import {
  addOspfAreaRange,
  removeOspfAreaRange,
  summarizeOspfRoutes,
  OspfAreaRange,
} from '@/lib/network/ospfAreaSummarization';
import type { SwitchState, Route } from '@/lib/network/types';

describe('ospfAreaSummarization (OSPF Multi-Area ABR Summarization)', () => {
  it('should register and update OSPF area range for ABR summarization', () => {
    const mockState = {} as SwitchState;

    addOspfAreaRange(mockState, '1', '10.1.0.0', '255.255.0.0', true);

    expect(mockState.ospfAreaRanges).toHaveLength(1);
    expect(mockState.ospfAreaRanges?.[0].network).toBe('10.1.0.0');
    expect(mockState.ospfAreaRanges?.[0].mask).toBe('255.255.0.0');

    // Update existing range
    addOspfAreaRange(mockState, '1', '10.1.0.0', '255.255.0.0', false);
    expect(mockState.ospfAreaRanges).toHaveLength(1);
    expect(mockState.ospfAreaRanges?.[0].advertise).toBe(false);
  });

  it('should remove registered OSPF area range', () => {
    const mockState = {} as SwitchState;
    addOspfAreaRange(mockState, '1', '10.1.0.0', '255.255.0.0', true);

    const removed = removeOspfAreaRange(mockState, '1', '10.1.0.0');
    expect(removed).toBe(true);
    expect(mockState.ospfAreaRanges).toHaveLength(0);
  });

  it('should summarize multiple subnets into a single range route when advertise is true', () => {
    const routes: Route[] = [
      {
        destination: '10.1.1.0',
        mask: '255.255.255.0',
        nextHop: '192.168.1.1',
        interface: 'eth0',
        type: 'dynamic',
        metric: 10,
      },
      {
        destination: '10.1.2.0',
        mask: '255.255.255.0',
        nextHop: '192.168.1.1',
        interface: 'eth0',
        type: 'dynamic',
        metric: 20,
      },
      {
        destination: '172.16.1.0',
        mask: '255.255.255.0',
        nextHop: '192.168.1.2',
        interface: 'eth1',
        type: 'dynamic',
        metric: 5,
      },
    ];

    const ranges: OspfAreaRange[] = [
      { areaId: '1', network: '10.1.0.0', mask: '255.255.0.0', advertise: true },
    ];

    const summarized = summarizeOspfRoutes(routes, ranges);

    expect(summarized).toHaveLength(2);
    const summaryRoute = summarized.find((r) => r.destination === '10.1.0.0');
    expect(summaryRoute).toBeDefined();
    expect(summaryRoute?.mask).toBe('255.255.0.0');
    expect(summaryRoute?.metric).toBe(10); // Minimum metric
    expect(summarized.some((r) => r.destination === '172.16.1.0')).toBe(true);
  });

  it('should suppress matching subnets when advertise is false (not-advertise)', () => {
    const routes: Route[] = [
      {
        destination: '10.1.1.0',
        mask: '255.255.255.0',
        nextHop: '192.168.1.1',
        interface: 'eth0',
        type: 'dynamic',
      },
      {
        destination: '172.16.1.0',
        mask: '255.255.255.0',
        nextHop: '192.168.1.2',
        interface: 'eth1',
        type: 'dynamic',
      },
    ];

    const ranges: OspfAreaRange[] = [
      { areaId: '1', network: '10.1.0.0', mask: '255.255.0.0', advertise: false },
    ];

    const summarized = summarizeOspfRoutes(routes, ranges);

    expect(summarized).toHaveLength(1);
    expect(summarized[0].destination).toBe('172.16.1.0');
  });
});
