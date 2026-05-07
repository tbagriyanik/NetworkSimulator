import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { getActiveTabCount, clearTabData, getTabId } from '@/lib/store/tabStorage';

interface TabWarningState {
  showWarning: boolean;
  tabCount: number;
  hasAcknowledged: boolean;
}

const TAB_WARNING_KEY = 'netsim-multi-tab-warning-acknowledged';

export function useMultiTabWarning() {
  const [warningState, setWarningState] = useState<TabWarningState>({
    showWarning: false,
    tabCount: 1,
    hasAcknowledged: false,
  });
  const { toast } = useToast();

  const checkTabCount = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    try {
      const tabCount = getActiveTabCount();
      const hasAcknowledged = localStorage.getItem(TAB_WARNING_KEY) === 'true';

      setWarningState(prev => {
        const newShowWarning = tabCount > 1 && !hasAcknowledged;
        
        // Only show toast if warning state changes from false to true and we haven't shown it recently
        if (newShowWarning && !prev.showWarning && !prev.hasAcknowledged) {
          // Use setTimeout to avoid calling toast during render
          setTimeout(() => {
            toast({
              title: "Multiple Tabs Detected",
              description: `You have ${tabCount} tabs open. Each tab saves its own data independently. This is normal behavior.`,
              variant: "default",
              duration: 8000,
            });
          }, 0);
        }
        
        return {
          showWarning: newShowWarning,
          tabCount,
          hasAcknowledged,
        };
      });
    } catch (error) {
      // Silently fail to avoid breaking the app
      console.warn('Multi-tab warning check failed:', error);
    }
  }, [toast]);

  const acknowledgeWarning = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(TAB_WARNING_KEY, 'true');
      setWarningState(prev => ({
        ...prev,
        showWarning: false,
        hasAcknowledged: true,
      }));
    } catch (error) {
      console.warn('Failed to acknowledge multi-tab warning:', error);
    }
  }, []);

  const clearCurrentTabData = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    try {
      clearTabData();
      toast({
        title: "Tab Data Cleared",
        description: "Current tab data has been cleared. A fresh session will start.",
        duration: 3000,
      });
    } catch (error) {
      console.warn('Failed to clear tab data:', error);
    }
  }, [toast]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      // Initial check
      checkTabCount();

      // Set up interval to check tab count
      const interval = setInterval(checkTabCount, 3000);

      return () => {
        clearInterval(interval);
      };
    } catch (error) {
      console.warn('Multi-tab warning initialization failed:', error);
    }
  }, [checkTabCount]);

  return {
    ...warningState,
    acknowledgeWarning,
    clearCurrentTabData,
    checkTabCount,
  };
}
