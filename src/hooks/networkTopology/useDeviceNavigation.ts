'use client';

import { useCallback, RefObject } from 'react';
import type { CanvasDevice } from '@/components/network/NetworkTopology/types/networkTopology.types';
import { isSwitchDeviceType, easeInOutCubic } from '@/components/network/NetworkTopology/utils/networkTopology.helpers';

interface UseDeviceNavigationProps {
  devices: CanvasDevice[];
  deviceMap?: Map<string, CanvasDevice>;
  onDeviceSelect: (type: CanvasDevice['type'], id: string, switchModel?: string, name?: string) => void;
  setSelectedDeviceIds: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectedNoteIds: React.Dispatch<React.SetStateAction<string[]>>;
  setPan: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  canvasRef: RefObject<HTMLDivElement | null>;
  zoomRef: React.MutableRefObject<number>;
  panRef: React.MutableRefObject<{ x: number; y: number }>;
  svgContentGroupRef: RefObject<SVGGElement | null>;
}

export function useDeviceNavigation({
  devices,
  deviceMap: _deviceMap,
  onDeviceSelect,
  setSelectedDeviceIds,
  setSelectedNoteIds,
  setPan,
  canvasRef,
  zoomRef,
  panRef,
  svgContentGroupRef,
}: UseDeviceNavigationProps) {
  const navigateToNextDevice = useCallback((currentDeviceId: string | null, shift = false) => {
    if (devices.length === 0) return;

    const orderedDevices = [...devices].sort((a, b) => {
      if (a.y !== b.y) return a.y - b.y;
      if (a.x !== b.x) return a.x - b.x;
      return a.id.localeCompare(b.id);
    });

    const currentIndex = currentDeviceId
      ? orderedDevices.findIndex((d) => d.id === currentDeviceId)
      : -1;

    const nextIndex = currentIndex >= 0
      ? (currentIndex + (shift ? -1 : 1) + orderedDevices.length) % orderedDevices.length
      : 0;

    const nextDevice = orderedDevices[nextIndex];
    if (!nextDevice) return;

    setSelectedDeviceIds([nextDevice.id]);
    setSelectedNoteIds([]);
    onDeviceSelect(nextDevice.type, nextDevice.id, isSwitchDeviceType(nextDevice.type) ? nextDevice.switchModel : undefined, nextDevice.name);

    // Smooth scroll to the next device and focus it
    const nextEl = document.querySelector<SVGGElement>(`[data-device-id="${nextDevice.id}"]`);
    if (nextEl && canvasRef.current) {
      nextEl.focus();

      // Calculate pan to center the device in viewport
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const deviceX = nextDevice.x;
      const deviceY = nextDevice.y;
      const currentZoom = zoomRef.current;

      const targetPanX = canvasRect.width / 2 - deviceX * currentZoom;
      const targetPanY = canvasRect.height / 2 - deviceY * currentZoom;

      const startPan = { ...panRef.current };
      const startTime = performance.now();
      const duration = 300; // ms

      const animatePan = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = easeInOutCubic(progress);

        panRef.current = {
          x: startPan.x + (targetPanX - startPan.x) * eased,
          y: startPan.y + (targetPanY - startPan.y) * eased,
        };

        const g = svgContentGroupRef.current;
        if (g) {
          g.style.transform = `translate3d(${panRef.current.x}px, ${panRef.current.y}px, 0px) scale(${currentZoom})`;
        }

        if (progress < 1) {
          requestAnimationFrame(animatePan);
        } else {
          setPan(panRef.current);
        }
      };

      requestAnimationFrame(animatePan);
    }
  }, [devices, onDeviceSelect, setSelectedDeviceIds, setSelectedNoteIds, setPan, canvasRef, zoomRef, panRef, svgContentGroupRef]);

  const handleDeviceKeyDown = useCallback((e: React.KeyboardEvent<SVGGElement>, device: CanvasDevice) => {
    if (e.key !== 'Tab') return;
    e.preventDefault();
    e.stopPropagation();
    navigateToNextDevice(device.id, e.shiftKey);
  }, [navigateToNextDevice]);

  return {
    navigateToNextDevice,
    handleDeviceKeyDown,
  };
}


