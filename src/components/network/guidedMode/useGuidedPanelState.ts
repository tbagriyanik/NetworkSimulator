import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GuidedProject } from '@/lib/network/guidedMode';
import { secureStorage } from '@/lib/storage/secureStorage';

export function useGuidedPanelState(
    project: GuidedProject | null,
    currentStepIndex: number
) {
    const [showHint, setShowHint] = useState(() => {
        if (typeof window === 'undefined') return false;
        const saved = secureStorage.getItem('guided_show_hint');
        return saved === 'true';
    });

    const [showAnimation, setShowAnimation] = useState(true);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const synthRef = useRef<SpeechSynthesis | null>(null);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            synthRef.current = window.speechSynthesis;
        }
        return () => {
            if (synthRef.current) synthRef.current.cancel();
        };
    }, []);

    const [expandedSteps, setExpandedSteps] = useState<string[]>(() => {
        if (typeof window === 'undefined') return [];
        const saved = secureStorage.getItem('guided_expanded_steps');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        if (typeof window !== 'undefined') {
            secureStorage.setItem('guided_show_hint', String(showHint));
        }
    }, [showHint]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            secureStorage.setItem('guided_expanded_steps', JSON.stringify(expandedSteps));
        }
    }, [expandedSteps]);

    const [position, setPosition] = useState({ x: 0, y: 80 });

    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    useEffect(() => {
        if (!project?.startedAt) return;
        const update = () => {
            setElapsedSeconds(Math.floor((Date.now() - new Date(project.startedAt as unknown as string | number).getTime()) / 1000));
        };
        update();
        const id = setInterval(update, 1000);
        return () => clearInterval(id);
    }, [project?.startedAt]);

    useEffect(() => {
        setTimeout(() => setPosition({ x: window.innerWidth - 336, y: 80 }), 0);
    }, []);

    const [isDragging, setIsDragging] = useState(false);
    const [hasDragged, setHasDragged] = useState(false);
    const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number } | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const activeStepRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (activeStepRef.current) {
            activeStepRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        if (project && currentStepIndex < project.steps.length) {
            const step = project.steps[currentStepIndex];
            if (step.detailedInstructions && !expandedSteps.includes(step.id)) {
                setTimeout(() => setExpandedSteps(prev => [...prev, step.id]), 0);
            }
        }
    }, [currentStepIndex, project]);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (!target.closest('[data-drag-handle]')) return;

        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
        dragRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            initialX: position.x,
            initialY: position.y
        };
    }, [position]);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        const target = e.target as HTMLElement;
        if (!target.closest('[data-drag-handle]')) return;

        e.preventDefault();
        e.stopPropagation();

        const touch = e.touches[0];
        setIsDragging(true);
        dragRef.current = {
            startX: touch.clientX,
            startY: touch.clientY,
            initialX: position.x,
            initialY: position.y
        };
    }, [position]);

    useEffect(() => {
        if (isDragging) {
            const handleMouseMove = (e: MouseEvent) => {
                if (!isDragging || !dragRef.current) return;

                if (animationFrameRef.current !== null) {
                    cancelAnimationFrame(animationFrameRef.current);
                }

                animationFrameRef.current = requestAnimationFrame(() => {
                    if (!isDragging || !dragRef.current) return;

                    const dx = e.clientX - dragRef.current.startX;
                    const dy = e.clientY - dragRef.current.startY;

                    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
                        setHasDragged(true);
                    }

                    setPosition({
                        x: Math.max(0, Math.min(window.innerWidth - 320, dragRef.current.initialX + dx)),
                        y: Math.max(0, Math.min(window.innerHeight - 200, dragRef.current.initialY + dy))
                    });
                });
            };

            const handleMouseUp = () => {
                setIsDragging(false);
                dragRef.current = null;
                if (animationFrameRef.current !== null) {
                    cancelAnimationFrame(animationFrameRef.current);
                    animationFrameRef.current = null;
                }
                setTimeout(() => setHasDragged(false), 100);
            };

            const handleTouchMove = (e: TouchEvent) => {
                if (!isDragging || !dragRef.current) return;

                if (animationFrameRef.current !== null) {
                    cancelAnimationFrame(animationFrameRef.current);
                }

                animationFrameRef.current = requestAnimationFrame(() => {
                    if (!isDragging || !dragRef.current) return;

                    const touch = e.touches[0];
                    const dx = touch.clientX - dragRef.current.startX;
                    const dy = touch.clientY - dragRef.current.startY;

                    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
                        setHasDragged(true);
                    }

                    setPosition({
                        x: Math.max(0, Math.min(window.innerWidth - 320, dragRef.current.initialX + dx)),
                        y: Math.max(0, Math.min(window.innerHeight - 200, dragRef.current.initialY + dy))
                    });
                });
            };

            const handleTouchEnd = () => {
                setIsDragging(false);
                dragRef.current = null;
                if (animationFrameRef.current !== null) {
                    cancelAnimationFrame(animationFrameRef.current);
                    animationFrameRef.current = null;
                }
                setTimeout(() => setHasDragged(false), 100);
            };

            window.addEventListener('mousemove', handleMouseMove, { passive: true });
            window.addEventListener('mouseup', handleMouseUp);
            window.addEventListener('touchmove', handleTouchMove, { passive: true });
            window.addEventListener('touchend', handleTouchEnd);

            return () => {
                if (animationFrameRef.current !== null) {
                    cancelAnimationFrame(animationFrameRef.current);
                }
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
                window.removeEventListener('touchmove', handleTouchMove);
                window.removeEventListener('touchend', handleTouchEnd);
            };
        }
        return;
    }, [isDragging]);

    const toggleStepExpand = (stepId: string) => {
        setExpandedSteps(prev =>
            prev.includes(stepId)
                ? prev.filter(id => id !== stepId)
                : [...prev, stepId]
        );
    };

    return {
        showHint,
        setShowHint,
        showAnimation,
        setShowAnimation,
        isSpeaking,
        setIsSpeaking,
        synthRef,
        utteranceRef,
        expandedSteps,
        setExpandedSteps,
        position,
        setPosition,
        elapsedSeconds,
        isDragging,
        hasDragged,
        panelRef,
        activeStepRef,
        handleMouseDown,
        handleTouchStart,
        toggleStepExpand,
    };
}
