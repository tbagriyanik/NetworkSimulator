'use client';

import { Suspense, lazy } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

const AboutModalComponent = lazy(() =>
    import('./AboutModal').then((m) => ({ default: m.AboutModal }))
);

interface LazyAboutModalProps {
    isOpen: boolean;
    onClose: () => void;
    onStartTour: () => void;
}

function AboutModalFallback() {
    return (
        <Dialog open={true}>
            <DialogContent className="sm:max-w-[425px] md:max-w-xl lg:max-w-2xl">
                <VisuallyHidden>
                    <DialogTitle>Loading About Modal</DialogTitle>
                </VisuallyHidden>
                <div className="space-y-4">
                    <div className="h-8 bg-secondary-200 dark:bg-secondary-700 rounded animate-pulse" />
                    <div className="h-72 bg-secondary-200 dark:bg-secondary-700 rounded animate-pulse" />
                    <div className="h-10 bg-secondary-200 dark:bg-secondary-700 rounded animate-pulse w-20 ml-auto" />
                </div>
            </DialogContent>
        </Dialog>
    );
}

export function LazyAboutModal({ isOpen, onClose, onStartTour }: LazyAboutModalProps) {
    if (!isOpen) return null;

    return (
        <Suspense fallback={<AboutModalFallback />}>
            <AboutModalComponent isOpen={isOpen} onClose={onClose} onStartTour={onStartTour} />
        </Suspense>
    );
}
