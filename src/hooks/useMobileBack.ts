'use client';

import { useEffect, useRef } from 'react';

export function useMobileBack() {
  const hasPushedStateRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkForOpenOverlays = () => {
      // Check for common Radix UI / shadcn overlays and custom panels
      const overlays = document.querySelectorAll(
        '[role="dialog"][data-state="open"], [role="menu"], [data-state="open"][data-radix-popper-content-wrapper]'
      );
      
      let overlayOpen = overlays.length > 0;
      
      // Check for custom panels that might not have the attributes above
      if (!overlayOpen) {
          const panels = document.querySelectorAll('.fixed.z-40, .fixed.z-50');
          for (let i = 0; i < panels.length; i++) {
              if (panels[i].getBoundingClientRect().height > 100 && panels[i].tagName !== 'HEADER' && panels[i].tagName !== 'NAV') {
                  overlayOpen = true;
                  break;
              }
          }
      }

      if (overlayOpen && !hasPushedStateRef.current) {
        window.history.pushState({ overlayOpen: true }, '');
        hasPushedStateRef.current = true;
      } else if (!overlayOpen && hasPushedStateRef.current) {
        if (window.history.state?.overlayOpen) {
          window.history.back();
        }
        hasPushedStateRef.current = false;
      }
    };

    const observer = new MutationObserver(() => {
      checkForOpenOverlays();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-state', 'class']
    });

    // Initial check
    checkForOpenOverlays();

    const handlePopState = (_e: PopStateEvent) => {
      if (hasPushedStateRef.current) {
        hasPushedStateRef.current = false;
        
        // Dispatch Escape key for standard Radix components
        const event = new KeyboardEvent('keydown', {
          key: 'Escape',
          code: 'Escape',
          keyCode: 27,
          which: 27,
          bubbles: true,
          cancelable: true
        });
        document.dispatchEvent(event);
        
        // Dispatch custom event for our custom panels
        const closeEvent = new CustomEvent('mobile-back-pressed');
        window.dispatchEvent(closeEvent);
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      observer.disconnect();
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);
}
