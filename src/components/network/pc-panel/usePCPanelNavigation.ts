'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PCActiveTab } from './PCPanel.types';

type PCPanelNavigationOptions = {
    deviceId: string;
    isVisible: boolean;
    isPoweredOn: boolean;
    initialTab?: PCActiveTab;
    onNavigate?: (tab: PCActiveTab) => void;
};

export function usePCPanelNavigation({
    deviceId,
    isVisible,
    isPoweredOn,
    initialTab,
    onNavigate,
}: PCPanelNavigationOptions) {
    const [activeTab, setActiveTab] = useState<PCActiveTab>(initialTab || 'home');
    const activeTabRef = useRef<PCActiveTab>(activeTab);
    const tabletHistoryRef = useRef<PCActiveTab[]>(['home']);
    const tabletHistoryIndexRef = useRef(0);
    const isInternalTabletNavRef = useRef(false);

    const onNavigateRef = useRef(onNavigate);
    useEffect(() => {
        onNavigateRef.current = onNavigate;
    }, [onNavigate]);

    useEffect(() => {
        activeTabRef.current = activeTab;
    }, [activeTab]);

    useEffect(() => {
        if (isVisible && typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('pc-tab-changed', {
                detail: { deviceId, activeTab }
            }));
        }
    }, [activeTab, deviceId, isVisible]);

    const goHome = useCallback(() => {
        setActiveTab('home');
        tabletHistoryRef.current = ['home'];
        tabletHistoryIndexRef.current = 0;
        onNavigateRef.current?.('home');
    }, []);

    const navigateToProgram = useCallback((program: PCActiveTab) => {
        if (program === 'home') {
            if (tabletHistoryIndexRef.current > 0) {
                tabletHistoryIndexRef.current--;
                isInternalTabletNavRef.current = true;
                setActiveTab(tabletHistoryRef.current[tabletHistoryIndexRef.current]);
                onNavigateRef.current?.('home');
            } else {
                setActiveTab('home');
                onNavigateRef.current?.('home');
            }
        } else {
            tabletHistoryRef.current = tabletHistoryRef.current.slice(0, tabletHistoryIndexRef.current + 1);
            tabletHistoryRef.current.push(program);
            tabletHistoryIndexRef.current = tabletHistoryRef.current.length - 1;
            setActiveTab(program);
            onNavigateRef.current?.(program);
        }
    }, []);

    useEffect(() => {
        const handleTabletPopState = (event: CustomEvent) => {
            const { program } = event.detail || {};
            if (program === 'home' && tabletHistoryIndexRef.current > 0) {
                tabletHistoryIndexRef.current--;
                isInternalTabletNavRef.current = true;
                setActiveTab(tabletHistoryRef.current[tabletHistoryIndexRef.current]);
            }
        };
        window.addEventListener('tablet-back', handleTabletPopState as EventListener);
        return () => window.removeEventListener('tablet-back', handleTabletPopState as EventListener);
    }, []);

    useEffect(() => {
        if (isVisible && isPoweredOn) {
            const targetTab = initialTab || 'home';
            setActiveTab(targetTab);
            tabletHistoryRef.current = [targetTab];
            tabletHistoryIndexRef.current = 0;
        }
    }, [initialTab, isPoweredOn, isVisible]);

    return { activeTab, setActiveTab, activeTabRef, goHome, navigateToProgram };
}
