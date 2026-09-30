'use client';

import { useCallback, useEffect, RefObject } from 'react';
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
  const orderDevices = useCallback(() => {
    return [...devices].sort((a, b) => {
      if (a.y !== b.y) return a.y - b.y;
      if (a.x !== b.x) return a.x - b.x;
      return a.id.localeCompare(b.id);
    });
  }, [devices]);

  // Select a device and smoothly scroll it to the viewport center
  const focusDevice = useCallback((device: CanvasDevice) => {
    setSelectedDeviceIds([device.id]);
    setSelectedNoteIds([]);
    onDeviceSelect(device.type, device.id, isSwitchDeviceType(device.type) ? device.switchModel : undefined, device.name);

    const nextEl = document.querySelector<SVGGElement>(`[data-device-id="${device.id}"]`);
    if (nextEl && canvasRef.current) {
      nextEl.focus();

      // Calculate pan to center the device in viewport
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const targetPanX = canvasRect.width / 2 - device.x * zoomRef.current;
      const targetPanY = canvasRect.height / 2 - device.y * zoomRef.current;

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
          g.style.transform = `translate3d(${panRef.current.x}px, ${panRef.current.y}px, 0px) scale(${zoomRef.current})`;
        }

        if (progress < 1) {
          requestAnimationFrame(animatePan);
        } else {
          setPan(panRef.current);
        }
      };

      requestAnimationFrame(animatePan);
    }
  }, [setSelectedDeviceIds, setSelectedNoteIds, onDeviceSelect, canvasRef, zoomRef, panRef, svgContentGroupRef, setPan]);

  const navigateToNextDevice = useCallback((currentDeviceId: string | null, shift = false) => {
    if (devices.length === 0) return;

    const orderedDevices = orderDevices();

    const currentIndex = currentDeviceId
      ? orderedDevices.findIndex((d) => d.id === currentDeviceId)
      : -1;

    const nextIndex = currentIndex >= 0
      ? (currentIndex + (shift ? -1 : 1) + orderedDevices.length) % orderedDevices.length
      : 0;

    const nextDevice = orderedDevices[nextIndex];
    if (nextDevice) focusDevice(nextDevice);
  }, [devices, orderDevices, focusDevice]);

  // End key: jump to the last device (same focus + camera-center behaviour as Tab)
  const focusLastDevice = useCallback(() => {
    const orderedDevices = orderDevices();
    const lastDevice = orderedDevices[orderedDevices.length - 1];
    if (lastDevice) focusDevice(lastDevice);
  }, [orderDevices, focusDevice]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'End' || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      if (devices.length === 0) return;

      const target = e.target as HTMLElement | null;
      if (target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable ||
        target.closest('[data-note-id], textarea, input, select, [contenteditable="true"], [data-modal-content], [data-slot="dialog-content"], [role="dialog"], [data-terminal-input], [data-code-editor]')
      )) {
        return;
      }

      e.preventDefault();
      focusLastDevice();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [devices.length, focusLastDevice]);

  const handleDeviceKeyDown = useCallback((e: React.KeyboardEvent<SVGGElement>, device: CanvasDevice) => {
    if (e.key !== 'Tab') return;
    e.preventDefault();
    e.stopPropagation();
    navigateToNextDevice(device.id, e.shiftKey);
  }, [navigateToNextDevice]);

  return {
    navigateToNextDevice,
    focusLastDevice,
    handleDeviceKeyDown,
  };
}


