import { useState, useRef, useEffect, useCallback } from 'react';

export interface ModalPosition { x: number; y: number }
export interface ModalSize { width: number; height: number }

interface DragState {
    active: boolean;
    type: 'drag' | 'resize';
    modal: 'tasks' | 'cli' | 'pc' | 'firewall';
    direction?: string;
    startX: number;
    startY: number;
    startPosX: number;
    startPosY: number;
    startW: number;
    startH: number;
}

const STORAGE_KEYS = {
    tasks: { position: 'tasks-modal-position', size: 'tasks-modal-size' },
    cli: { position: 'cli-modal-position', size: 'cli-modal-size' },
    pc: { position: 'pc-modal-position', size: 'pc-modal-size' },
    firewall: { position: 'firewall-modal-position', size: 'firewall-modal-size' },
} as const;

function loadModalLayout(modal: 'tasks' | 'cli' | 'pc' | 'firewall', defaultSize: ModalSize) {
    if (typeof window === 'undefined') return { position: null, size: defaultSize };
    const maxW = window.innerWidth - 40;
    const maxH = window.innerHeight - 40;
    const keys = STORAGE_KEYS[modal];

    let size = { ...defaultSize };
    const savedSize = localStorage.getItem(keys.size);
    if (savedSize) {
        const p = JSON.parse(savedSize);
        size = { width: Math.min(p.width, maxW), height: Math.min(p.height, maxH) };
    } else {
        size = { width: Math.min(maxW, defaultSize.width), height: Math.min(maxH, defaultSize.height) };
    }

    let position: ModalPosition | null = null;
    const savedPos = localStorage.getItem(keys.position);
    if (savedPos) {
        const p = JSON.parse(savedPos);
        position = {
            x: Math.max(0, Math.min(p.x, window.innerWidth - size.width)),
            y: Math.max(0, Math.min(p.y, window.innerHeight - size.height)),
        };
    } else {
        position = {
            x: Math.max(0, (window.innerWidth - size.width) / 2),
            y: Math.max(0, (window.innerHeight - size.height) / 2),
        };
    }

    return { position, size };
}

export function useModalDragResize(defaultSize: ModalSize = { width: 1200, height: 700 }, graphicsQuality: 'high' | 'low' = 'high') {
    const [tasksModalPosition, setTasksModalPosition] = useState<ModalPosition>({ x: 20, y: 20 });
    const [tasksModalSize, setTasksModalSize] = useState<ModalSize>(defaultSize);
    const [cliModalPosition, setCliModalPosition] = useState<ModalPosition>({ x: 20, y: 20 });
    const [cliModalSize, setCliModalSize] = useState<ModalSize>(defaultSize);
    const [pcModalPosition, setPcModalPosition] = useState<ModalPosition>({ x: 20, y: 20 });
    const [pcModalSize, setPcModalSize] = useState<ModalSize>({ width: 800, height: 600 });
    const [firewallModalPosition, setFirewallModalPosition] = useState<ModalPosition>({ x: 20, y: 20 });
    const [firewallModalSize, setFirewallModalSize] = useState<ModalSize>({ width: 600, height: 500 });

    // Load persisted layout after hydration
    useEffect(() => {
        const tasks = loadModalLayout('tasks', defaultSize);
        if (tasks.position) setTasksModalPosition(tasks.position);
        setTasksModalSize(tasks.size);

        const cli = loadModalLayout('cli', defaultSize);
        if (cli.position) setCliModalPosition(cli.position);
        setCliModalSize(cli.size);

        const pc = loadModalLayout('pc', { width: 800, height: 600 });
        if (pc.position) setPcModalPosition(pc.position);
        setPcModalSize(pc.size);

        const firewall = loadModalLayout('firewall', { width: 600, height: 500 });
        if (firewall.position) setFirewallModalPosition(firewall.position);
        setFirewallModalSize(firewall.size);
    }, []);

    // Persist on change - Optimized to only save occasionally or on mouse up
    // We'll move the actual saving to handlePointerUp to avoid synchronous localStorage hits during drag
    const persistLayout = useCallback((modal: 'tasks' | 'cli' | 'pc' | 'firewall', pos: ModalPosition, size: ModalSize) => {
        localStorage.setItem(STORAGE_KEYS[modal].position, JSON.stringify(pos));
        localStorage.setItem(STORAGE_KEYS[modal].size, JSON.stringify(size));
    }, []);

    // Refs to always hold latest values for drag handlers
    const dragStateRef = useRef<DragState | null>(null);
    const pendingMoveRef = useRef<{ x: number; y: number } | null>(null);
    const tasksModalPositionRef = useRef(tasksModalPosition);
    const tasksModalSizeRef = useRef(tasksModalSize);
    const cliModalPositionRef = useRef(cliModalPosition);
    const cliModalSizeRef = useRef(cliModalSize);
    const pcModalPositionRef = useRef(pcModalPosition);
    const pcModalSizeRef = useRef(pcModalSize);
    const firewallModalPositionRef = useRef(firewallModalPosition);
    const firewallModalSizeRef = useRef(firewallModalSize);
    const modalElementRef = useRef<HTMLElement | null>(null);

    useEffect(() => { tasksModalPositionRef.current = tasksModalPosition; }, [tasksModalPosition]);
    useEffect(() => { tasksModalSizeRef.current = tasksModalSize; }, [tasksModalSize]);
    useEffect(() => { cliModalPositionRef.current = cliModalPosition; }, [cliModalPosition]);
    useEffect(() => { cliModalSizeRef.current = cliModalSize; }, [cliModalSize]);
    useEffect(() => { pcModalPositionRef.current = pcModalPosition; }, [pcModalPosition]);
    useEffect(() => { pcModalSizeRef.current = pcModalSize; }, [pcModalSize]);
    useEffect(() => { firewallModalPositionRef.current = firewallModalPosition; }, [firewallModalPosition]);
    useEffect(() => { firewallModalSizeRef.current = firewallModalSize; }, [firewallModalSize]);

    const handlePointerDown = useCallback((e: React.PointerEvent, modalType: 'tasks' | 'cli' | 'pc' | 'firewall') => {
        const header = (e.target as HTMLElement).closest('[data-modal-header]');
        if (!header) return;
        if ((e.target as HTMLElement).closest('button, input, select, textarea, a')) return;

        e.preventDefault();
        e.stopPropagation();

        // Capture pointer for smoother dragging across the whole screen
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

        // Find the modal element (DialogContent)
        const modalElement = (e.currentTarget as HTMLElement).closest('[data-modal-content]') as HTMLElement;
        modalElementRef.current = modalElement;

        const pos = modalType === 'tasks' ? tasksModalPositionRef.current : modalType === 'cli' ? cliModalPositionRef.current : modalType === 'pc' ? pcModalPositionRef.current : firewallModalPositionRef.current;
        const size = modalType === 'tasks' ? tasksModalSizeRef.current : modalType === 'cli' ? cliModalSizeRef.current : modalType === 'pc' ? pcModalSizeRef.current : firewallModalSizeRef.current;

        dragStateRef.current = {
            active: true, type: 'drag', modal: modalType,
            startX: e.clientX, startY: e.clientY,
            startPosX: pos.x, startPosY: pos.y,
            startW: size.width, startH: size.height,
        };
    }, []);

    const handleResizeStart = useCallback((
        e: React.PointerEvent,
        direction: 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw',
        modalType: 'tasks' | 'cli' | 'pc' | 'firewall',
    ) => {
        e.preventDefault();
        e.stopPropagation();

        // Capture pointer
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

        // Find the modal element (DialogContent)
        const modalElement = (e.currentTarget as HTMLElement).closest('[data-modal-content]') as HTMLElement;
        modalElementRef.current = modalElement;

        const pos = modalType === 'tasks' ? tasksModalPositionRef.current : modalType === 'cli' ? cliModalPositionRef.current : modalType === 'pc' ? pcModalPositionRef.current : firewallModalPositionRef.current;
        const size = modalType === 'tasks' ? tasksModalSizeRef.current : modalType === 'cli' ? cliModalSizeRef.current : modalType === 'pc' ? pcModalSizeRef.current : firewallModalSizeRef.current;

        dragStateRef.current = {
            active: true, type: 'resize', modal: modalType, direction,
            startX: e.clientX, startY: e.clientY,
            startPosX: pos.x, startPosY: pos.y,
            startW: size.width, startH: size.height,
        };
    }, []);

    useEffect(() => {
        let animationFrameId: number | null = null;

        const handlePointerMove = (e: PointerEvent) => {
            const ds = dragStateRef.current;
            if (!ds?.active) return;

            const modalElement = modalElementRef.current;
            if (!modalElement) return;

            // Cancel previous animation frame to prevent stacking
            if (animationFrameId !== null) {
                cancelAnimationFrame(animationFrameId);
            }

            animationFrameId = requestAnimationFrame(() => {
                if (!dragStateRef.current?.active || !modalElementRef.current) return;

                const ds = dragStateRef.current;
                const modalElement = modalElementRef.current;

                // Direct DOM manipulation - no React state updates during drag/resize
                if (ds.type === 'drag') {
                    const newX = ds.startPosX + (e.clientX - ds.startX);
                    const newY = ds.startPosY + (e.clientY - ds.startY);

                    // Optimization: Use will-change to hint the browser
                    modalElement.style.willChange = 'left, top';
                    modalElement.style.left = `${newX}px`;
                    modalElement.style.top = `${newY}px`;

                    // Disable transitions during drag
                    modalElement.style.transition = 'none';
                } else if (ds.type === 'resize' && ds.direction) {
                    const dx = e.clientX - ds.startX;
                    const dy = e.clientY - ds.startY;
                    let newW = ds.startW, newH = ds.startH, newX = ds.startPosX, newY = ds.startPosY;

                    if (ds.direction.includes('e')) newW = Math.max(400, ds.startW + dx);
                    if (ds.direction.includes('s')) newH = Math.max(300, ds.startH + dy);
                    if (ds.direction.includes('w')) {
                        newW = Math.max(400, ds.startW - dx);
                        newX = ds.startPosX + (ds.startW - newW);
                    }
                    if (ds.direction.includes('n')) {
                        newH = Math.max(300, ds.startH - dy);
                        newY = ds.startPosY + (ds.startH - newH);
                    }

                    modalElement.style.willChange = 'width, height, left, top';
                    modalElement.style.width = `${newW}px`;
                    modalElement.style.height = `${newH}px`;
                    modalElement.style.left = `${newX}px`;
                    modalElement.style.top = `${newY}px`;

                    // Disable transitions during resize
                    modalElement.style.transition = 'none';
                }
            });
        };

        const handlePointerUp = (e: PointerEvent) => {
            if (animationFrameId !== null) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }

            const ds = dragStateRef.current;
            if (!ds) return;

            const modalElement = modalElementRef.current;
            if (modalElement) {
                // Read final values from DOM and update React state
                const finalLeft = parseInt(modalElement.style.left) || ds.startPosX;
                const finalTop = parseInt(modalElement.style.top) || ds.startPosY;
                const finalWidth = parseInt(modalElement.style.width) || ds.startW;
                const finalHeight = parseInt(modalElement.style.height) || ds.startH;

                const finalPos = { x: finalLeft, y: finalTop };
                const finalSize = { width: finalWidth, height: finalHeight };

                // Clean up styles
                modalElement.style.willChange = '';
                modalElement.style.transition = '';

                // Update React state only once at the end
                const setPosition = ds.modal === 'tasks' ? setTasksModalPosition : ds.modal === 'cli' ? setCliModalPosition : ds.modal === 'pc' ? setPcModalPosition : setFirewallModalPosition;
                const setSize = ds.modal === 'tasks' ? setTasksModalSize : ds.modal === 'cli' ? setCliModalSize : ds.modal === 'pc' ? setPcModalSize : setFirewallModalSize;

                setPosition(finalPos);
                setSize(finalSize);

                // Persist to localStorage
                persistLayout(ds.modal, finalPos, finalSize);
            }

            dragStateRef.current = null;
            modalElementRef.current = null;
        };

        window.addEventListener('pointermove', handlePointerMove, { passive: true });
        window.addEventListener('pointerup', handlePointerUp);
        window.addEventListener('pointercancel', handlePointerUp);

        return () => {
            if (animationFrameId !== null) {
                cancelAnimationFrame(animationFrameId);
            }
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
            window.removeEventListener('pointercancel', handlePointerUp);
        };
    }, [persistLayout]);

    return {
        tasksModalPosition,
        tasksModalSize,
        cliModalPosition,
        cliModalSize,
        pcModalPosition,
        pcModalSize,
        firewallModalPosition,
        firewallModalSize,
        setTasksModalPosition,
        setTasksModalSize,
        setCliModalPosition,
        setCliModalSize,
        setPcModalPosition,
        setPcModalSize,
        setFirewallModalPosition,
        setFirewallModalSize,
        handlePointerDown,
        handleResizeStart,
    };
}
