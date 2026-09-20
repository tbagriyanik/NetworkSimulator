import { useDrag } from '@/hooks/useDrag';

export function usePageModalDrags() {
  const pcDrag = useDrag({ mode: 'drag-resize', storageKey: 'pc-modal-position', defaultSize: { width: 800, height: 600 }, disableSnap: true });
  const firewallDrag = useDrag({ mode: 'drag-resize', storageKey: 'firewall-modal-position', defaultSize: { width: 600, height: 500 }, disableSnap: true });
  const unifiedDrag = useDrag({ mode: 'drag-resize', storageKey: 'unified-modal-position', defaultSize: { width: 800, height: 600 }, disableSnap: true });
  const routerDrag = useDrag({ mode: 'drag-resize', storageKey: 'router-modal-position', defaultSize: { width: 800, height: 600 }, disableSnap: true });

  return { pcDrag, firewallDrag, unifiedDrag, routerDrag };
}

