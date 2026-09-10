import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTopologySnapshots } from '@/hooks/useTopologySnapshots';
import type { CanvasDevice, CanvasConnection } from '@/components/network/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';

describe('useTopologySnapshots hook', () => {
  it('should take a snapshot and restore state accurately', () => {
    const initialDevices: CanvasDevice[] = [
      { id: 'pc-1', name: 'PC1', type: 'pc', x: 100, y: 100, status: 'online', ip: '192.168.1.10', ports: [] },
    ];
    const initialConnections: CanvasConnection[] = [];
    const initialStates = new Map<string, SwitchState>();

    const onRestore = vi.fn();

    const { result } = renderHook(() =>
      useTopologySnapshots(initialDevices, initialConnections, initialStates, onRestore)
    );

    let createdSnapId = '';
    act(() => {
      const snap = result.current.takeSnapshot('Checkpoint 1');
      createdSnapId = snap.id;
    });

    expect(result.current.snapshots).toHaveLength(1);
    expect(result.current.snapshots[0].name).toBe('Checkpoint 1');

    act(() => {
      const success = result.current.restoreSnapshot(createdSnapId);
      expect(success).toBe(true);
    });

    expect(onRestore).toHaveBeenCalledTimes(1);
  });
});
