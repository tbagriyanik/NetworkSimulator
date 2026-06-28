import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProtocolStatusPanel } from '@/components/network/ProtocolStatusPanel';
import { CanvasDevice } from '@/components/network/networkTopology.types';
import { SwitchState } from '@/lib/network/types';

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: {}
  })
}));

describe('ProtocolStatusPanel', () => {
  const mockDevices = [
    { id: 'r1', type: 'router', name: 'R1' },
    { id: 'sw1', type: 'switchL2', name: 'SW1' }
  ] as unknown as CanvasDevice[];

  const mockDeviceStates = new Map<string, SwitchState>();

  // Set up OSPF on R1
  mockDeviceStates.set('r1', {
    ospfAreas: { '0': {} },
    ospfNeighbors: [{ neighborId: 'r2' }],
    ports: {}
  } as unknown as SwitchState);

  // Set up STP on SW1 (Root)
  mockDeviceStates.set('sw1', {
    ports: {
      'fa0/1': { spanningTree: { role: 'designated', state: 'forwarding' } },
      'fa0/2': { spanningTree: { role: 'alternate', state: 'blocking' } }
    }
  } as unknown as SwitchState);

  it('displays correct protocol and stats', () => {
    render(<ProtocolStatusPanel devices={mockDevices} deviceStates={mockDeviceStates} isDark={true} />);

    expect(screen.getByText('OSPF')).toBeDefined();
    expect(screen.getByText('1 neighbors')).toBeDefined();

    expect(screen.getByText('STP')).toBeDefined();
    expect(screen.getByText('1 Root, 1 blocked')).toBeDefined();

    expect(screen.getByText('HSRP')).toBeDefined();
    expect(screen.getByText('EIGRP')).toBeDefined();
  });
});
