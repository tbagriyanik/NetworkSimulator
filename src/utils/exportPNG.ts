import { CanvasDevice, CanvasConnection, CanvasNote } from '../components/network/networkTopology.types';
import { isCableCompatible } from '@/lib/network/types';
import { CABLE_COLORS } from '../components/network/networkTopology.constants';

export interface ExportPNGOptions {
  svgElement: SVGSVGElement;
  devices: CanvasDevice[];
  notes: CanvasNote[];
  connections: CanvasConnection[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deviceStates?: Map<string, any>;
  getPortPosition: (device: CanvasDevice, portId: string) => { x: number; y: number };
}

export function exportTopologyToPNG(options: ExportPNGOptions): void {
  const {
    svgElement: svg,
    devices,
    notes,
    connections,
    deviceStates,
    getPortPosition
  } = options;

  // Clone and clean for export
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const ns = 'http://www.w3.org/2000/svg';

  const wasDark = document.documentElement.classList.contains('dark') || document.body.classList.contains('dark');
  if (wasDark) {
    document.documentElement.classList.remove('dark');
    document.body.classList.remove('dark');
  }

  let url = '';
  let width = 800;
  let height = 600;
  const bg = '#ffffff';

  try {
    // Resolve actual app fonts from CSS custom properties
    const sansFont = getComputedStyle(document.body).getPropertyValue('--font-inria-sans').trim() || 'Inria Sans, sans-serif';

    // Determine which devices are visibile in the DOM (have full rendering)
    const domDeviceIds = new Set<string>();
    devices.forEach(d => {
      if (svg.querySelector(`[data-device-id="${d.id}"]`)) domDeviceIds.add(d.id);
    });

    // Remove interactive/UI elements
    clone.querySelectorAll('[data-export-hide="true"]').forEach(el => el.remove());
    // Remove foreignObjects (note editors/device port popups)
    clone.querySelectorAll('foreignObject').forEach(el => el.remove());
    // Remove connections (will rebuild all with proper port positions)
    clone.querySelectorAll('[data-connection-id]').forEach(el => el.remove());
    // Remove device elements not in DOM (culled ones left a stale placeholder) — keep full-rendered ones
    clone.querySelectorAll('[data-device-id]').forEach(el => {
      const id = el.getAttribute('data-device-id');
      if (id && !domDeviceIds.has(id)) el.remove();
    });

    // Build type-specific simplified SVG body for culled devices
    const addSimplifiedDevice = (device: CanvasDevice) => {
      const c = (() => {
        const map: Record<string, { fill: string; stroke: string; text: string }> = {
          pc: { fill: 'var(--color-primary-200)', stroke: 'var(--color-primary-300)', text: 'var(--color-secondary-800)' },
          iot: { fill: '#d35400', stroke: '#d35400', text: 'var(--color-secondary-800)' },
          switch: { fill: 'var(--color-accent-200)', stroke: 'var(--color-accent-300)', text: 'var(--color-secondary-800)' },
          switchL2: { fill: '#28a745', stroke: '#28a745', text: 'var(--color-secondary-800)' },
          switchL3: { fill: '#6f42c1', stroke: '#6f42c1', text: 'var(--color-secondary-800)' },
          router: { fill: '#6f42c1', stroke: '#6f42c1', text: 'var(--color-secondary-800)' },
          firewall: { fill: '#b02a37', stroke: '#b02a37', text: 'var(--color-secondary-800)' },
          wlc: { fill: '#ffc107', stroke: '#ffc107', text: 'var(--color-secondary-800)' },
        };
        return map[device.type] || map.pc;
      })();
      const dw = 100;
      const dh = device.type === 'pc' || device.type === 'iot' ? 85 : 100;
      const g = document.createElementNS(ns, 'g');
      g.setAttribute('data-device-id', device.id);
      g.setAttribute('data-simplified', 'true');

      const rect = document.createElementNS(ns, 'rect');
      rect.setAttribute('x', device.x.toString());
      rect.setAttribute('y', device.y.toString());
      rect.setAttribute('width', dw.toString());
      rect.setAttribute('height', dh.toString());
      rect.setAttribute('rx', '8');
      rect.setAttribute('fill', c.fill);
      rect.setAttribute('stroke', c.stroke);
      rect.setAttribute('stroke-width', '1.5');
      g.appendChild(rect);

      const label = document.createElementNS(ns, 'text');
      label.setAttribute('x', (device.x + dw / 2).toString());
      label.setAttribute('y', (device.y + dh / 2 - 4).toString());
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('dominant-baseline', 'auto');
      label.setAttribute('fill', c.text);
      label.setAttribute('font-size', '9');
      label.setAttribute('font-weight', 'bold');
      label.setAttribute('font-family', sansFont);
      label.textContent = device.name;
      g.appendChild(label);

      if (device.ip) {
        const ipLabel = document.createElementNS(ns, 'text');
        ipLabel.setAttribute('x', (device.x + dw / 2).toString());
        ipLabel.setAttribute('y', (device.y + dh / 2 + 10).toString());
        ipLabel.setAttribute('text-anchor', 'middle');
        ipLabel.setAttribute('fill', c.text);
        ipLabel.setAttribute('font-size', '7');
        ipLabel.setAttribute('opacity', '0.7');
        ipLabel.setAttribute('font-family', sansFont);
        ipLabel.textContent = device.ip;
        g.appendChild(ipLabel);
      }

      clone.appendChild(g);
    };

    // Set default font on SVG root so inherited text uses app sans-serif
    clone.setAttribute('font-family', sansFont);
    // Replace any generic monospace in cloned elements with the app's sans-serif font
    clone.querySelectorAll('[font-family="monospace"]').forEach(el => {
      el.setAttribute('font-family', sansFont);
    });
    // Also replace fontFamily="monospace" in SVG elements (for svg:text tags) to match app sans font
    clone.querySelectorAll('text[fontFamily="monospace"]').forEach(el => {
      el.setAttribute('font-family', sansFont);
    });

    // Keep full-rendered devices in clone, add simplified for culled ones
    devices.forEach(device => {
      if (!domDeviceIds.has(device.id)) addSimplifiedDevice(device);
    });

    // Rebuild all connections with proper port positions, colors, and labels
    connections.forEach(conn => {
      const src = devices.find(d => d.id === conn.sourceDeviceId);
      const dst = devices.find(d => d.id === conn.targetDeviceId);
      if (!src || !dst) return;

      const srcPort = getPortPosition(src, conn.sourcePort);
      const tgtPort = getPortPosition(dst, conn.targetPort);
      const midX = (srcPort.x + tgtPort.x) / 2;

      const pathD = 'M ' + srcPort.x + ' ' + srcPort.y +
        ' C ' + midX + ' ' + srcPort.y + ', ' + midX + ' ' + tgtPort.y + ', ' + tgtPort.x + ' ' + tgtPort.y;

      // Check compatibility, shutdown status, offline status, and STP blocking
      const srcPortObj = src.ports.find(p => p.id === conn.sourcePort);
      const tgtPortObj = dst.ports.find(p => p.id === conn.targetPort);
      
      const isShutdown = srcPortObj?.shutdown || tgtPortObj?.shutdown;
      const isPoweredOff = src.status === 'offline' || dst.status === 'offline';

      const srcState = deviceStates?.get(src.id);
      const tgtState = deviceStates?.get(dst.id);
      const srcSimPort = srcState?.ports?.[conn.sourcePort];
      const tgtSimPort = tgtState?.ports?.[conn.targetPort];
      const isSTPBlocking = srcSimPort?.spanningTree?.state === 'blocking' || srcSimPort?.spanningTree?.role === 'alternate' ||
                            tgtSimPort?.spanningTree?.state === 'blocking' || tgtSimPort?.spanningTree?.role === 'alternate';
      const srcVlan = src.vlan || srcSimPort?.accessVlan || srcSimPort?.vlan || 1;
      const tgtVlan = dst.vlan || tgtSimPort?.accessVlan || tgtSimPort?.vlan || 1;
      const isVlan1 = srcVlan === 1 && tgtVlan === 1;

      const isCompatible = isCableCompatible({
        connected: true,
        cableType: conn.cableType,
        sourceDevice: src.type,
        targetDevice: dst.type,
        sourcePort: conn.sourcePort,
        targetPort: conn.targetPort,
      });

      const cableColor = !isCompatible || conn.active === false
        ? 'var(--color-error-500)'
        : isShutdown || (isSTPBlocking && isVlan1)
          ? '#94a3b8' // Light-theme shutdown/STP block gray
          : isPoweredOff
            ? '#9ca3af' // Light-theme offline gray
            : CABLE_COLORS[conn.cableType]?.primary || 'var(--color-primary-500)';

      const path = document.createElementNS(ns, 'path');
      path.setAttribute('d', pathD);
      path.setAttribute('stroke', cableColor);
      path.setAttribute('stroke-width', '2.5');
      path.setAttribute('fill', 'none');
      path.setAttribute('opacity', '1.0');
      path.setAttribute('data-connection-id', conn.id);
      if (!isCompatible || conn.active === false) {
        path.setAttribute('stroke-dasharray', '6,3');
      }
      clone.appendChild(path);

      // Port labels at t=0.42 (source) and t=0.58 (target) on the bezier curve
      const bezierPoint = (t: number) => {
        const mt = 1 - t;
        return {
          x: mt * mt * mt * srcPort.x + 3 * mt * mt * t * midX + 3 * mt * t * t * midX + t * t * t * tgtPort.x,
          y: mt * mt * mt * srcPort.y + 3 * mt * mt * t * srcPort.y + 3 * mt * t * t * tgtPort.y + t * t * t * tgtPort.y,
        };
      };
      const srcLabelPos = bezierPoint(0.42);
      const tgtLabelPos = bezierPoint(0.58);
      const labelOffsetY = -10;

      const addLabel = (pos: { x: number; y: number }, text: string) => {
        const halo = document.createElementNS(ns, 'text');
        halo.setAttribute('x', pos.x.toString());
        halo.setAttribute('y', (pos.y + labelOffsetY).toString());
        halo.setAttribute('fill', '#ffffff');
        halo.setAttribute('stroke', '#ffffff');
        halo.setAttribute('stroke-width', '3');
        halo.setAttribute('stroke-linejoin', 'round');
        halo.setAttribute('font-size', '9');
        halo.setAttribute('font-weight', 'bold');
        halo.setAttribute('font-family', sansFont);
        halo.setAttribute('text-anchor', 'middle');
        halo.setAttribute('opacity', '0.85');
        halo.textContent = text;
        clone.appendChild(halo);

        const label = document.createElementNS(ns, 'text');
        label.setAttribute('x', pos.x.toString());
        label.setAttribute('y', (pos.y + labelOffsetY).toString());
        label.setAttribute('fill', cableColor);
        label.setAttribute('font-size', '9');
        label.setAttribute('font-weight', 'bold');
        label.setAttribute('font-family', sansFont);
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('opacity', '0.85');
        label.textContent = text;
        clone.appendChild(label);
      };

      addLabel(srcLabelPos, conn.sourcePort);
      addLabel(tgtLabelPos, conn.targetPort);
    });

    // Re-create notes as export-friendly SVG elements (rounded rect + text, auto-sized)
    const measureNoteHeight = (text: string, width: number, fontSize: number, font: string): number => {
      const tmp = document.createElement('div');
      tmp.style.cssText = `position:absolute;visibility:hidden;left:-9999px;width:${width - 16}px;font-size:${fontSize}px;font-family:${font};line-height:1.35;white-space:pre-wrap;word-wrap:break-word;`;
      tmp.textContent = text || ' ';
      document.body.appendChild(tmp);
      const h = tmp.scrollHeight + 24 + 16;
      document.body.removeChild(tmp);
      return Math.max(100, h);
    };
    const noteHeights = new Map<string, number>();
    notes.forEach(note => {
      noteHeights.set(note.id, measureNoteHeight(note.text, note.width, note.fontSize, note.font));

      const g = document.createElementNS(ns, 'g');
      const nh = noteHeights.get(note.id) ?? 100;

      const rect = document.createElementNS(ns, 'rect');
      rect.setAttribute('x', note.x.toString());
      rect.setAttribute('y', note.y.toString());
      rect.setAttribute('width', note.width.toString());
      rect.setAttribute('height', nh.toString());
      rect.setAttribute('rx', '8');
      rect.setAttribute('ry', '8');
      rect.setAttribute('fill', note.color);
      rect.setAttribute('opacity', note.opacity.toString());
      g.appendChild(rect);

      const fo = document.createElementNS(ns, 'foreignObject');
      const pad = 8;
      fo.setAttribute('x', (note.x + pad).toString());
      fo.setAttribute('y', (note.y + pad + 24).toString());
      fo.setAttribute('width', (note.width - pad * 2).toString());
      fo.setAttribute('height', (nh - pad * 2 - 24).toString());
      const div = document.createElement('div');
      div.textContent = note.text;
      div.style.cssText = `font-family:${note.font};font-size:${note.fontSize}px;line-height:1.35;color:#000;word-wrap:break-word;white-space:pre-wrap;width:100%;height:100%;overflow:hidden;`;
      fo.appendChild(div);
      g.appendChild(fo);

      clone.appendChild(g);
    });

    // Set background
    clone.style.backgroundColor = bg;
    clone.querySelectorAll('rect[fill="url(#canvasBgGradient)"]').forEach(el => {
      el.setAttribute('fill', bg);
    });

    // Resolve all CSS custom properties in the cloned SVG using computed styles of light mode
    const cssVarRegex = /var\((--[^)]+)\)/g;
    const computedStyle = getComputedStyle(document.documentElement);

    const resolveCSSVars = (node: Element) => {
      const attributes = ['fill', 'stroke', 'stop-color'];
      attributes.forEach(attr => {
        const val = node.getAttribute(attr);
        if (val && val.includes('var(')) {
          const resolvedVal = val.replace(cssVarRegex, (match, varName) => {
            return computedStyle.getPropertyValue(varName.trim()).trim() || match;
          });
          node.setAttribute(attr, resolvedVal);
        }
      });

      const style = node.getAttribute('style');
      if (style && style.includes('var(')) {
        const resolvedStyle = style.replace(cssVarRegex, (match, varName) => {
          return computedStyle.getPropertyValue(varName.trim()).trim() || match;
        });
        node.setAttribute('style', resolvedStyle);
      }
    };

    clone.querySelectorAll('*').forEach(resolveCSSVars);

    // Find the pan/zoom content group precisely by its data attribute
    const contentGroup = clone.querySelector('[data-content-group="true"]') as SVGGElement | null;
    if (contentGroup) {
      // Strip out the CSS pan/zoom transform - devices use their own SVG transform attributes
      contentGroup.style.transform = 'none';
      contentGroup.style.transition = 'none';
      contentGroup.style.willChange = '';

      // Re-append simplified devices inside the content group (same coordinate space as full-rendered ones)
      // (We already called addSimplifiedDevice above which appended to clone root — move them into contentGroup)
      clone.querySelectorAll('[data-device-id][data-simplified="true"]').forEach(el => {
        contentGroup.appendChild(el);
      });
    } else {
      // Fallback: reset the first group's transform (old behaviour)
      const mainGroup = clone.querySelector('g');
      if (mainGroup) {
        mainGroup.style.transform = 'none';
      }
    }

    // Bounds (use auto-sized note heights where computed)
    const padding = 50;
    const getNoteMaxY = (n: typeof notes[0]) => n.y + (noteHeights.get(n.id) ?? n.height);
    const minX = Math.min(...devices.map(d => d.x), ...notes.map(n => n.x), 0);
    const minY = Math.min(...devices.map(d => d.y), ...notes.map(n => n.y), 0);
    const maxX = Math.max(...devices.map(d => d.x + 100), ...notes.map(n => n.x + n.width), 800);
    const maxY = Math.max(...devices.map(d => d.y + 100), ...notes.map(n => getNoteMaxY(n)), 600);

    width = maxX - minX + padding * 2;
    height = maxY - minY + padding * 2;

    clone.setAttribute('viewBox', `${minX - padding} ${minY - padding} ${width} ${height}`);
    clone.setAttribute('width', width.toString());
    clone.setAttribute('height', height.toString());

    // Serialize
    const svgData = new XMLSerializer().serializeToString(clone);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    url = URL.createObjectURL(svgBlob);
  } finally {
    if (wasDark) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    }
  }

  // Render to canvas at 300 DPI
  const dpi = 300;
  const scale = dpi / 72;
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) { URL.revokeObjectURL(url); return; }
    ctx.scale(scale, scale);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);

    // Download
    canvas.toBlob((blob) => {
      if (!blob) return;
      const pngUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = pngUrl;
      link.download = `topology-${new Date().getTime()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(pngUrl);
    }, 'image/png');
  };
  img.onerror = () => { URL.revokeObjectURL(url); };
  img.src = url;
}
