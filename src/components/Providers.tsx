'use client';

import { LanguageProvider } from '@/contexts/LanguageContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LayoutProvider } from '@/contexts/LayoutContext';
import { FeatureFlagProvider } from '@/contexts/FeatureFlagContext';
import { ModeProvider } from '@/contexts/ModeContext';
import { RoomProvider } from '@/contexts/RoomContext';
import { PromptProvider } from '@/contexts/PromptContext';
import { SidebarProvider } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { GlobalDragManager } from '@/hooks/useDrag';
import { AppErrorBoundary } from '@/components/ui/AppErrorBoundary';
import { Toaster } from '@/components/ui/toaster';
import { LangUpdater } from '@/components/LangUpdater';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AppErrorBoundary>
        <LanguageProvider>
          <LangUpdater />
          <LayoutProvider>
            <FeatureFlagProvider>
              <ModeProvider>
                <RoomProvider>
                  <PromptProvider>
                    <TooltipProvider delayDuration={0}>
                      <SidebarProvider>
                        <GlobalDragManager />
                        {children}
                        <Toaster />
                      </SidebarProvider>
                    </TooltipProvider>
                  </PromptProvider>
                </RoomProvider>
              </ModeProvider>
            </FeatureFlagProvider>
          </LayoutProvider>
        </LanguageProvider>
      </AppErrorBoundary>
    </ThemeProvider>
  );
}
