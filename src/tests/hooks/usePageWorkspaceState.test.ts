import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePageWorkspaceState } from '@/hooks/usePageWorkspaceState';

describe('usePageWorkspaceState', () => {
  it('exposes the workspace state and actions used by the controller', () => {
    const { result } = renderHook(() => usePageWorkspaceState());
    expect(result.current.topologyDevices).toEqual(expect.any(Array));
    expect(result.current.topologyConnections).toEqual(expect.any(Array));
    expect(result.current.topologyNotes).toEqual(expect.any(Array));
    expect(result.current.activeTab).toBeDefined();
    expect(result.current.setDevices).toEqual(expect.any(Function));
    expect(result.current.setConnections).toEqual(expect.any(Function));
    expect(result.current.setHelpLevel).toEqual(expect.any(Function));
  });
});
