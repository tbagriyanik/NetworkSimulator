import { useEffect, useState } from 'react';

/**
 * Hook to manage skeleton screen transitions
 * Ensures smooth fade-out of skeleton and fade-in of content
 * Prevents layout shift by maintaining consistent dimensions
 */
export function useSkeletonTransition(isLoading: boolean, minDisplayTime: number = 300) {
    const [showSkeleton, setShowSkeleton] = useState(true);
    const [isTransitioning, setIsTransitioning] = useState(false);

    useEffect(() => {
        if (isLoading) {
            setShowSkeleton(true);
            setIsTransitioning(false);
            return;
        }

        const timer = setTimeout(() => {
            setIsTransitioning(true);
            setTimeout(() => {
                setShowSkeleton(false);
                setIsTransitioning(false);
            }, 400);
        }, minDisplayTime);

        return () => clearTimeout(timer);
    }, [isLoading, minDisplayTime]);

    return {
        showSkeleton,
        isTransitioning,
        skeletonClassName: isTransitioning ? 'animate-skeleton-fade-out' : '',
        contentClassName: !showSkeleton ? 'animate-content-fade-in' : 'opacity-0 pointer-events-none'
    };
}
