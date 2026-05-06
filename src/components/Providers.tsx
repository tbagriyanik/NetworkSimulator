'use client';

import { LanguageProvider } from '@/contexts/LanguageContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LayoutProvider } from '@/contexts/LayoutContext';
import { FeatureFlagProvider } from '@/contexts/FeatureFlagContext';
import { ModeProvider } from '@/contexts/ModeContext';
import { SidebarProvider } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { DraggableDialogManager } from '@/components/DraggableDialogManager';
import { AppErrorBoundary } from '@/components/ui/AppErrorBoundary';
import { Toaster } from '@/components/ui/toaster';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          <LayoutProvider>
            <FeatureFlagProvider>
              <ModeProvider>
                <TooltipProvider delayDuration={0}>
                  <SidebarProvider>
                    <DraggableDialogManager />
                    {children}
                    <Toaster />
                  </SidebarProvider>
                </TooltipProvider>
              </ModeProvider>
            </FeatureFlagProvider>
          </LayoutProvider>
        </LanguageProvider>
      </ThemeProvider>
    </AppErrorBoundary>
  );
}
