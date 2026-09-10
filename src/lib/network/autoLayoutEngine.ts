import { CanvasDevice, CanvasConnection } from '@/components/network/networkTopology.types';

export type LayoutAlgorithm = 'hierarchical' | 'star' | 'ring' | 'grid';

export interface LayoutOptions {
  algorithm: LayoutAlgorithm;
  canvasWidth?: number;
  canvasHeight?: number;
}

/**
 * Otomatik Topoloji Düzenleme Motoru (Auto Layout Engine)
 * Cihazları rollerine ve katmanlarına göre hiyerarşik (Core/Dist/Access), yıldız, halka veya grid düzenine dizer.
 */
export function applyAutoLayout(
  devices: CanvasDevice[],
  connections: CanvasConnection[],
  options: LayoutOptions = { algorithm: 'hierarchical' }
): CanvasDevice[] {
  if (devices.length === 0) return [];

  const algorithm = options.algorithm || 'hierarchical';
  const width = options.canvasWidth || 1200;
  const height = options.canvasHeight || 700;

  switch (algorithm) {
    case 'star':
      return layoutStar(devices, connections, width, height);
    case 'ring':
      return layoutRing(devices, width, height);
    case 'grid':
      return layoutGrid(devices, width, height);
    case 'hierarchical':
    default:
      return layoutHierarchical(devices, connections, width, height);
  }
}

/**
 * 3-Tier Hiyerarşik Düzen (Core -> Distribution -> Access -> Endpoints)
 */
function layoutHierarchical(
  devices: CanvasDevice[],
  _connections: CanvasConnection[],
  width: number,
  _height: number
): CanvasDevice[] {
  const routers = devices.filter(d => d.type === 'router' || d.type === 'cloud');
  const firewalls = devices.filter(d => d.type === 'firewall');
  const switches = devices.filter(d => d.type.startsWith('switch') || d.type === 'wlc');
  const endpoints = devices.filter(d => d.type === 'pc' || d.type === 'iot' || d.type === 'mobile' || d.type === 'printer');

  const tiers: CanvasDevice[][] = [];
  if (routers.length > 0) tiers.push(routers);
  if (firewalls.length > 0) tiers.push(firewalls);
  if (switches.length > 0) tiers.push(switches);
  if (endpoints.length > 0) tiers.push(endpoints);

  if (tiers.length === 0) return devices;

  const result: CanvasDevice[] = [];
  const tierSpacingY = 160;
  const startY = 100;

  tiers.forEach((tierDevices, tierIndex) => {
    const y = startY + tierIndex * tierSpacingY;
    const count = tierDevices.length;
    const spacingX = Math.min(220, (width - 200) / Math.max(count, 1));
    const startX = Math.max(100, (width - (count - 1) * spacingX) / 2);

    tierDevices.forEach((device, index) => {
      const x = Math.round(startX + index * spacingX);
      result.push({ ...device, x, y });
    });
  });

  return result;
}

/**
 * Yıldız (Star) Topolojisi Düzenlemesi
 */
function layoutStar(
  devices: CanvasDevice[],
  connections: CanvasConnection[],
  width: number,
  height: number
): CanvasDevice[] {
  // En çok bağlantıya sahip cihazı merkez seç
  const connCounts = new Map<string, number>();
  connections.forEach(c => {
    connCounts.set(c.sourceDeviceId, (connCounts.get(c.sourceDeviceId) || 0) + 1);
    connCounts.set(c.targetDeviceId, (connCounts.get(c.targetDeviceId) || 0) + 1);
  });

  let centerId = devices[0].id;
  let maxCount = -1;
  devices.forEach(d => {
    const count = connCounts.get(d.id) || 0;
    if (count > maxCount) {
      maxCount = count;
      centerId = d.id;
    }
  });

  const centerDev = devices.find(d => d.id === centerId) || devices[0];
  const outerDevices = devices.filter(d => d.id !== centerDev.id);

  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.35;

  const result: CanvasDevice[] = [{ ...centerDev, x: Math.round(centerX), y: Math.round(centerY) }];

  const angleStep = (2 * Math.PI) / Math.max(outerDevices.length, 1);
  outerDevices.forEach((dev, i) => {
    const angle = i * angleStep;
    const x = Math.round(centerX + radius * Math.cos(angle));
    const y = Math.round(centerY + radius * Math.sin(angle));
    result.push({ ...dev, x, y });
  });

  return result;
}

/**
 * Halka (Ring) Topolojisi Düzenlemesi
 */
function layoutRing(devices: CanvasDevice[], width: number, height: number): CanvasDevice[] {
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.35;
  const angleStep = (2 * Math.PI) / Math.max(devices.length, 1);

  return devices.map((dev, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const x = Math.round(centerX + radius * Math.cos(angle));
    const y = Math.round(centerY + radius * Math.sin(angle));
    return { ...dev, x, y };
  });
}

/**
 * Grid / Matris Düzenlemesi
 */
function layoutGrid(devices: CanvasDevice[], width: number, _height: number): CanvasDevice[] {
  const cols = Math.max(1, Math.ceil(Math.sqrt(devices.length)));
  const cellWidth = 180;
  const cellHeight = 150;
  const startX = Math.max(80, (width - cols * cellWidth) / 2);
  const startY = 100;

  return devices.map((dev, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const x = Math.round(startX + col * cellWidth);
    const y = Math.round(startY + row * cellHeight);
    return { ...dev, x, y };
  });
}
