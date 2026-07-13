import { AppSkeleton } from '@/components/ui/AppSkeleton';

/**
 * Next.js route-level loading UI.
 * Shown automatically while the page chunk is being fetched / suspended.
 */
export default function Loading() {
  return <AppSkeleton />;
}
