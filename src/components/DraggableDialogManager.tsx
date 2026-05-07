'use client';

import { useEffect, useRef } from 'react';

const STORAGE_PREFIX = 'draggable_position_';

export function DraggableDialogManager() {
    const dragStateRef = useRef<{
        active: boolean;
        dialogId: string | null;
        dialog: HTMLElement | null;
        startX: number;
        startY: number;
        offsetX: number;
        offsetY: number;
        animationFrameId: number | null;
    }>({
        active: false,
        dialogId: null,
        dialog: null,
        startX: 0,
        startY: 0,
        offsetX: 0,
        offsetY: 0,
        animationFrameId: null,
    });

    useEffect(() => {
        const dragState = dragStateRef.current;

        const handleMouseDown = (e: MouseEvent) => {
            // Skip if already dragging
            if (dragState.active) return;

            const dragHandle = (e.target as HTMLElement).closest('[data-drag-handle]');
            if (!dragHandle) return;

            const dialog = dragHandle.closest('[data-draggable-id]') as HTMLElement;
            if (!dialog) return;

            const dialogId = dialog.getAttribute('data-draggable-id');
            if (!dialogId) return;

            // Skip if this is a modal managed by useModalDragResize
            if (dialog.hasAttribute('data-modal-content')) return;

            e.preventDefault();
            e.stopPropagation();

            // Get current position
            const rect = dialog.getBoundingClientRect();
            dragState.active = true;
            dragState.dialogId = dialogId;
            dragState.dialog = dialog;
            dragState.startX = e.clientX;
            dragState.startY = e.clientY;
            dragState.offsetX = rect.left;
            dragState.offsetY = rect.top;

            // Set grabbing cursor on document
            document.body.classList.add('performance-mode');
            document.body.style.cursor = 'grabbing';
            document.body.style.userSelect = 'none';

            // Capture pointer for smoother dragging
            if ('setPointerCapture' in dialog && e instanceof PointerEvent) {
                try {
                    dialog.setPointerCapture((e as PointerEvent).pointerId);
                } catch (err) {
                    // Ignore if not a PointerEvent
                }
            }
        };

        const handleMouseMove = (moveEvent: MouseEvent) => {
            if (!dragState.active || !dragState.dialog) return;

            // Cancel previous animation frame
            if (dragState.animationFrameId !== null) {
                cancelAnimationFrame(dragState.animationFrameId);
            }

            dragState.animationFrameId = requestAnimationFrame(() => {
                if (!dragState.active || !dragState.dialog) return;

                const deltaX = moveEvent.clientX - dragState.startX;
                const deltaY = moveEvent.clientY - dragState.startY;

                const newX = dragState.offsetX + deltaX;
                const newY = dragState.offsetY + deltaY;

                const dialog = dragState.dialog;
                dialog.style.position = 'fixed';
                dialog.style.left = `${newX}px`;
                dialog.style.top = `${newY}px`;
                dialog.style.transform = 'none';
                dialog.style.willChange = 'left, top';
                dialog.style.transition = 'none';
            });
        };

        const handleMouseUp = () => {
            if (!dragState.active || !dragState.dialog) return;

            // Cancel animation frame
            if (dragState.animationFrameId !== null) {
                cancelAnimationFrame(dragState.animationFrameId);
                dragState.animationFrameId = null;
            }

            const dialog = dragState.dialog;
            dialog.style.willChange = '';
            dialog.style.transition = '';

            // Reset cursor
            document.body.classList.remove('performance-mode');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';

            // Save position to localStorage
            const finalLeft = parseInt(dialog.style.left) || dragState.offsetX;
            const finalTop = parseInt(dialog.style.top) || dragState.offsetY;

            if (dragState.dialogId) {
                try {
                    localStorage.setItem(
                        `${STORAGE_PREFIX}${dragState.dialogId}`,
                        JSON.stringify({ x: finalLeft, y: finalTop })
                    );
                } catch (e) {
                    // Ignore storage errors
                }
            }

            dragState.active = false;
            dragState.dialogId = null;
            dragState.dialog = null;
        };

        document.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mousemove', handleMouseMove, { passive: true });
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            if (dragState.animationFrameId !== null) {
                cancelAnimationFrame(dragState.animationFrameId);
            }
            document.removeEventListener('mousedown', handleMouseDown);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    return null;
}
