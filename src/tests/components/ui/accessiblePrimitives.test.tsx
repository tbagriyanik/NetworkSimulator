import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

describe('UI Primitives (Tooltip, Tabs, ScrollArea) - Radix UI Verification', () => {
  describe('Tooltip component', () => {
    it('renders trigger properly within TooltipProvider', () => {
      render(
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button>Hover or Focus me</button>
            </TooltipTrigger>
            <TooltipContent>Helpful info</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );

      const trigger = screen.getByRole('button', { name: 'Hover or Focus me' });
      expect(trigger).toBeDefined();
      expect(trigger.getAttribute('data-state')).toBe('closed');
    });
  });

  describe('Tabs component', () => {
    it('supports tab selection and wires accessible tablist', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
            <TabsTrigger value="tab3">Tab 3</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Panel 1</TabsContent>
          <TabsContent value="tab2">Panel 2</TabsContent>
          <TabsContent value="tab3">Panel 3</TabsContent>
        </Tabs>
      );

      const t1 = screen.getByRole('tab', { name: 'Tab 1' });
      const t2 = screen.getByRole('tab', { name: 'Tab 2' });
      const t3 = screen.getByRole('tab', { name: 'Tab 3' });

      expect(t1.getAttribute('data-state')).toBe('active');
      expect(t2.getAttribute('data-state')).toBe('inactive');
      expect(t3.getAttribute('data-state')).toBe('inactive');
      expect(screen.getByText('Panel 1')).toBeDefined();

      fireEvent.mouseDown(t2, { button: 0, ctrlKey: false });
      fireEvent.click(t2);
      expect(t2.getAttribute('data-state')).toBe('active');
      expect(screen.getByText('Panel 2')).toBeDefined();
    });

    it('wires aria-controls on tab triggers', () => {
      render(
        <Tabs defaultValue="alpha">
          <TabsList>
            <TabsTrigger value="alpha">Alpha</TabsTrigger>
          </TabsList>
          <TabsContent value="alpha">Alpha Content</TabsContent>
        </Tabs>
      );

      const tab = screen.getByRole('tab', { name: 'Alpha' });
      expect(tab.getAttribute('aria-controls')).toBeTruthy();
      expect(screen.getByText('Alpha Content')).toBeDefined();
    });
  });

  describe('ScrollArea component', () => {
    it('renders Radix ScrollArea root and viewport container', () => {
      const { container } = render(
        <ScrollArea className="h-64">
          <div>Long content</div>
          <ScrollBar orientation="vertical" />
        </ScrollArea>
      );

      const viewport = container.querySelector('[data-radix-scroll-area-viewport]');
      expect(viewport).not.toBeNull();
      expect(container.textContent).toContain('Long content');
    });
  });
});

