import type { CanvasDevice } from '@/components/network/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';

export type OverlayMode = 'none' | 'ospf' | 'vlan' | 'bgp' | 'subnet';

export interface Point2D {
  x: number;
  y: number;
}

export interface AreaZone {
  id: string;
  name: string;
  category: OverlayMode;
  color: string;
  devices: CanvasDevice[];
  center: Point2D;
  pathData: string;
  badgeLabel: string;
}

const PALETTES = {
  ospf: [
    '#06b6d4', // cyan-500 (Area 0 - Backbone)
    '#10b981', // emerald-500 (Area 1)
    '#f59e0b', // amber-500 (Area 2)
    '#a855f7', // purple-500 (Area 3)
    '#ec4899', // pink-500
    '#3b82f6', // blue-500
  ],
  vlan: [
    '#3b82f6', // blue (VLAN 1)
    '#10b981', // emerald (VLAN 10)
    '#f97316', // orange (VLAN 20)
    '#8b5cf6', // violet (VLAN 30)
    '#ec4899', // pink (VLAN 40)
    '#06b6d4', // cyan (VLAN 50)
    '#eab308', // yellow (VLAN 100)
  ],
  bgp: [
    '#14b8a6', // teal-500
    '#f43f5e', // rose-500
    '#6366f1', // indigo-500
    '#84cc16', // lime-500
  ],
  subnet: [
    '#0ea5e9', // sky-500
    '#8b5cf6', // violet-500
    '#10b981', // emerald-500
    '#f59e0b', // amber-500
  ],
};

const DEVICE_CENTER_OFFSET_X = 40;
const DEVICE_CENTER_OFFSET_Y = 30;
const PADDING = 60;

/**
 * Computes 2D Cross Product of OA and OB vectors = (A.x - O.x)*(B.y - O.y) - (A.y - O.y)*(B.x - O.x)
 */
function cross(o: Point2D, a: Point2D, b: Point2D): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

/**
 * 2D Convex Hull algorithm (Andrew's Monotone Chain algorithm)
 */
export function computeConvexHull(points: Point2D[]): Point2D[] {
  if (points.length <= 2) return [...points];

  const sorted = [...points].sort((a, b) => a.x === b.x ? a.y - b.y : a.x - b.x);
  const n = sorted.length;

  const lower: Point2D[] = [];
  for (let i = 0; i < n; i++) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], sorted[i]) <= 0) {
      lower.pop();
    }
    lower.push(sorted[i]);
  }

  const upper: Point2D[] = [];
  for (let i = n - 1; i >= 0; i--) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], sorted[i]) <= 0) {
      upper.pop();
    }
    upper.push(sorted[i]);
  }

  // Remove duplicate last points
  lower.pop();
  upper.pop();

  return lower.concat(upper);
}

/**
 * Generates an SVG path string for a zone encompassing the points with padding and smooth corners
 */
export function generateZoneSvgPath(points: Point2D[], padding = PADDING): string {
  if (points.length === 0) return '';

  if (points.length === 1) {
    const p = points[0];
    const r = padding + 15;
    return `M ${p.x - r} ${p.y} A ${r} ${r} 0 1 0 ${p.x + r} ${p.y} A ${r} ${r} 0 1 0 ${p.x - r} ${p.y} Z`;
  }

  if (points.length === 2) {
    const [p1, p2] = points;
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1e-3) return generateZoneSvgPath([p1], padding);

    const nx = -dy / dist * padding;
    const ny = dx / dist * padding;

    return `M ${p1.x + nx} ${p1.y + ny} ` +
      `L ${p2.x + nx} ${p2.y + ny} ` +
      `A ${padding} ${padding} 0 0 1 ${p2.x - nx} ${p2.y - ny} ` +
      `L ${p1.x - nx} ${p1.y - ny} ` +
      `A ${padding} ${padding} 0 0 1 ${p1.x + nx} ${p1.y + ny} Z`;
  }

  const hull = computeConvexHull(points);
  if (hull.length < 3) return generateZoneSvgPath(hull, padding);

  // Compute center of hull
  const cx = hull.reduce((sum, p) => sum + p.x, 0) / hull.length;
  const cy = hull.reduce((sum, p) => sum + p.y, 0) / hull.length;

  // Expand each vertex outward from centroid
  const expanded = hull.map((p) => {
    const vx = p.x - cx;
    const vy = p.y - cy;
    const len = Math.sqrt(vx * vx + vy * vy);
    if (len < 1e-3) return p;
    const scale = (len + padding) / len;
    return {
      x: cx + vx * scale,
      y: cy + vy * scale,
    };
  });

  // Build smooth closed spline path
  let path = `M ${expanded[0].x} ${expanded[0].y} `;
  const count = expanded.length;

  for (let i = 0; i < count; i++) {
    const curr = expanded[i];
    const next = expanded[(i + 1) % count];
    const midX = (curr.x + next.x) / 2;
    const midY = (curr.y + next.y) / 2;
    path += `Q ${curr.x} ${curr.y} ${midX} ${midY} `;
  }

  const firstMidX = (expanded[0].x + expanded[1].x) / 2;
  const firstMidY = (expanded[0].y + expanded[1].y) / 2;
  path += `L ${firstMidX} ${firstMidY} Z`;

  return path;
}

/**
 * Extracts subnet prefix string e.g. "192.168.1.0/24" from IP and mask
 */
export function getSubnetPrefix(ip?: string, subnet = '255.255.255.0'): string {
  if (!ip || !ip.includes('.')) return 'Unknown';
  const ipParts = ip.split('.').map(Number);
  const maskParts = subnet.split('.').map(Number);
  if (ipParts.length !== 4 || maskParts.length !== 4) return 'Unknown';

  const netParts = ipParts.map((b, i) => b & maskParts[i]);
  const cidr = maskParts.reduce((acc, octet) => {
    return acc + (octet.toString(2).match(/1/g) || []).length;
  }, 0);

  return `${netParts.join('.')}/${cidr}`;
}

/**
 * Computes all active area zones based on the current overlay mode.
 */
export function computeAreaZones(
  devices: CanvasDevice[],
  deviceStates: Map<string, SwitchState> | undefined,
  mode: OverlayMode
): AreaZone[] {
  if (mode === 'none' || devices.length === 0) return [];

  const groups = new Map<string, { label: string; badge: string; colorIndex: number; devices: CanvasDevice[] }>();

  if (mode === 'ospf') {
    devices.forEach((d) => {
      const state = deviceStates?.get(d.id);
      const isRouter = d.type === 'router' || d.type === 'switchL3';
      if (!isRouter) return;

      const areaId = state?.ospfAreas?.[0] !== undefined ? String(state.ospfAreas[0]) : '0';
      const key = `ospf-area-${areaId}`;
      const group = groups.get(key) || {
        label: `OSPF Area ${areaId}${areaId === '0' ? ' (Backbone)' : ''}`,
        badge: `OSPF Area ${areaId}`,
        colorIndex: parseInt(areaId, 10) || 0,
        devices: [],
      };
      group.devices.push(d);
      groups.set(key, group);
    });
  } else if (mode === 'vlan') {
    devices.forEach((d) => {
      const state = deviceStates?.get(d.id);
      // Check device default VLAN or port VLANs
      const vlanId = d.vlan || state?.currentVlan || 1;
      const key = `vlan-${vlanId}`;
      const group = groups.get(key) || {
        label: `VLAN ${vlanId}`,
        badge: `VLAN ${vlanId}`,
        colorIndex: vlanId % PALETTES.vlan.length,
        devices: [],
      };
      group.devices.push(d);
      groups.set(key, group);
    });
  } else if (mode === 'bgp') {
    devices.forEach((d) => {
      const state = deviceStates?.get(d.id);
      const bgpAs = state?.bgpAs;
      if (!bgpAs) return;

      const asNum = typeof bgpAs === 'number' ? bgpAs : parseInt(String(bgpAs), 10) || 0;
      const key = `bgp-as-${bgpAs}`;
      const group = groups.get(key) || {
        label: `Autonomous System AS ${bgpAs}`,
        badge: `AS ${bgpAs}`,
        colorIndex: asNum % PALETTES.bgp.length,
        devices: [],
      };
      group.devices.push(d);
      groups.set(key, group);
    });
  } else if (mode === 'subnet') {
    devices.forEach((d) => {
      if (!d.ip) return;
      const subnet = getSubnetPrefix(d.ip, d.subnet);
      const key = `subnet-${subnet}`;
      const group = groups.get(key) || {
        label: `Subnet ${subnet}`,
        badge: subnet,
        colorIndex: groups.size % PALETTES.subnet.length,
        devices: [],
      };
      group.devices.push(d);
      groups.set(key, group);
    });
  }

  const result: AreaZone[] = [];
  const palette = PALETTES[mode] || PALETTES.ospf;

  groups.forEach((group, key) => {
    if (group.devices.length === 0) return;

    const points: Point2D[] = group.devices.map((d) => ({
      x: d.x + DEVICE_CENTER_OFFSET_X,
      y: d.y + DEVICE_CENTER_OFFSET_Y,
    }));

    const center: Point2D = {
      x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
      y: Math.min(...points.map((p) => p.y)) - 45, // Top edge for badge
    };

    const color = palette[group.colorIndex % palette.length];
    const pathData = generateZoneSvgPath(points);

    result.push({
      id: key,
      name: group.label,
      category: mode,
      color,
      devices: group.devices,
      center,
      pathData,
      badgeLabel: group.badge,
    });
  });

  return result;
}
