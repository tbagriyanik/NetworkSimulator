import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePerformanceDetection } from '@/hooks/usePerformanceDetection';

describe('usePerformanceDetection sampling', () => {
    let frameCallbacks: Map<number, FrameRequestCallback>;
    let nextFrameId: number;

    beforeEach(() => {
        vi.useFakeTimers();
        frameCallbacks = new Map();
        nextFrameId = 1;
        vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
            const id = nextFrameId++;
            frameCallbacks.set(id, callback);
            return id;
        });
        vi.stubGlobal('cancelAnimationFrame', (id: number) => frameCallbacks.delete(id));
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('backs off after stable frames and resumes short samples periodically', async () => {
        const onQualityChange = vi.fn();
        const { unmount } = renderHook(() => usePerformanceDetection('high', onQualityChange));
        let timestamp = performance.now() + 16;

        act(() => {
            for (let index = 0; index < 900; index += 1) {
                const nextFrame = frameCallbacks.entries().next().value;
                expect(nextFrame).toBeDefined();
                const [id, callback] = nextFrame!;
                frameCallbacks.delete(id);
                callback(timestamp);
                timestamp += 16;
            }
        });

        expect(frameCallbacks.size).toBe(0);

        await act(async () => {
            await vi.advanceTimersByTimeAsync(5000);
        });
        expect(frameCallbacks.size).toBe(1);

        act(() => {
            for (let index = 0; index < 30; index += 1) {
                const nextFrame = frameCallbacks.entries().next().value;
                expect(nextFrame).toBeDefined();
                const [id, callback] = nextFrame!;
                frameCallbacks.delete(id);
                callback(timestamp);
                timestamp += 16;
            }
        });

        expect(frameCallbacks.size).toBe(0);
        unmount();
        await act(async () => {
            await vi.advanceTimersByTimeAsync(5000);
        });
        expect(frameCallbacks.size).toBe(0);
    });
});