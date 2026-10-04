'use client';

import { Suspense, lazy } from 'react';
import { CableType } from '@/lib/network/types';
import { CanvasDevice, SelectedPortRef } from './NetworkTopology/types/networkTopology.types';

type PortSelectorStep = 'source' | 'target';

const PortSelectorComponent = lazy(() =>
    import('./NetworkTopologyPortSelectorModal').then((m) => ({
        default: m.NetworkTopologyPortSelectorModal,
    }))
);

interface LazyNetworkTopologyPortSelectorModalProps {
    isOpen: boolean;
    isDark: boolean;
    graphicsQuality?: 'high' | 'low';
    devices: CanvasDevice[];
    cableType: CableType;
    portSelectorStep: PortSelectorStep;
    selectedSourcePort: SelectedPortRef | null;
    onClose: () => void;
    onCableTypeChange: (nextType: CableType) => void;
    onSelectPort: (deviceId: string, portId: string) => void;
}

function PortSelectorFallback({ isDark }: { isDark: boolean }) {
    return (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-transparent" />
            <div className={`liquid-glass-light relative w-full max-w-2xl rounded-[2.5rem] border backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col transition-all duration-500 ${isDark ? 'bg-secondary-900/75 border-white/10' : 'bg-white/90 border-secondary-200'}`}>
                <div className={`px-8 py-6 border-b ${isDark ? 'border-secondary-800/50 bg-secondary-800/30' : 'border-secondary-200 bg-secondary-100/50'}`}>
                    <div className={`h-8 rounded animate-pulse mb-4 ${isDark ? 'bg-secondary-700' : 'bg-secondary-200'}`} />
                    <div className={`h-6 rounded animate-pulse ${isDark ? 'bg-secondary-700' : 'bg-secondary-200'}`} />
                </div>
                <div className="flex-1 overflow-y-auto p-8 space-y-8 max-h-[50vh]">
                    <div className={`h-32 rounded animate-pulse ${isDark ? 'bg-secondary-700' : 'bg-secondary-200'}`} />
                    <div className={`h-32 rounded animate-pulse ${isDark ? 'bg-secondary-700' : 'bg-secondary-200'}`} />
                </div>
                <div className={`px-8 py-6 border-t ${isDark ? 'border-secondary-800/50 bg-secondary-800/30' : 'border-secondary-200 bg-secondary-100/50'}`}>
                    <div className={`h-10 rounded animate-pulse w-24 ml-auto ${isDark ? 'bg-secondary-700' : 'bg-secondary-200'}`} />
                </div>
            </div>
        </div>
    );
}

export function LazyNetworkTopologyPortSelectorModal(
    props: LazyNetworkTopologyPortSelectorModalProps
) {
    if (!props.isOpen) return null;

    return (
        <Suspense fallback={<PortSelectorFallback isDark={props.isDark} />}>
            <PortSelectorComponent {...props} />
        </Suspense>
    );
}

