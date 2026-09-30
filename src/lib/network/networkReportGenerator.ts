import type { SwitchState } from './types';
import type { CanvasDevice, CanvasConnection } from '@/components/network/NetworkTopology/types/networkTopology.types';

export interface NetworkReportOptions {
  includeInventory?: boolean;
  includeIpAddresses?: boolean;
  includeVlans?: boolean;
  includeRoutes?: boolean;
  title?: string;
}

export interface DeviceIpEntry {
  deviceId: string;
  deviceName: string;
  portId: string;
  ipAddress: string;
  netmask: string;
  vlan?: number;
  status: 'UP' | 'DOWN';
}

export interface RouteReportEntry {
  deviceId: string;
  deviceName: string;
  protocol: string;
  prefix: string;
  nextHop: string;
  interface: string;
  metric?: number;
}

/**
 * Topoloji ve Cihaz Durumlarından Otomatik Ağ Dokümantasyonu ve Rapor Üreteci
 */
export function generateNetworkReport(
  devices: CanvasDevice[],
  connections: CanvasConnection[],
  deviceStates: Map<string, SwitchState>,
  options: NetworkReportOptions = {}
): string {
  const {
    includeInventory = true,
    includeIpAddresses = true,
    includeVlans = true,
    includeRoutes = true,
    title = 'Ağ Topolojisi Ve Sistem Teknik Raporu'
  } = options;

  const lines: string[] = [];
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  lines.push(`# ${title}`);
  lines.push(`*Oluşturulma Tarihi: ${now}*\n`);

  // 1. Ağ Özet Metrikleri
  lines.push(`## 1. Ağ Özet İstatistikleri`);
  lines.push(`- **Toplam Cihaz Sayısı:** ${devices.length}`);
  lines.push(`- **Toplam Bağlantı (Kablo) Sayısı:** ${connections.length}`);
  const routerCount = devices.filter(d => d.type === 'router').length;
  const switchCount = devices.filter(d => d.type.startsWith('switch')).length;
  const pcCount = devices.filter(d => d.type === 'pc' || d.type === 'iot' || d.type === 'mobile').length;
  lines.push(`- **Yönlendirici (Router):** ${routerCount} | **Anahtar (Switch):** ${switchCount} | **Uç Cihaz (PC/IoT):** ${pcCount}\n`);

  // 2. Cihaz Envanteri
  if (includeInventory) {
    lines.push(`## 2. Cihaz Envanteri Tablosu`);
    lines.push(`| Cihaz Adı | Tür | Kimlik (ID) | Konum (X, Y) |`);
    lines.push(`|---|---|---|---|`);
    devices.forEach(d => {
      lines.push(`| ${d.name} | ${d.type} | \`${d.id}\` | (${d.x}, ${d.y}) |`);
    });
    lines.push('');
  }

  // 3. IP Adresleme Tablosu
  if (includeIpAddresses) {
    const ipEntries: DeviceIpEntry[] = [];
    devices.forEach(d => {
      const state = deviceStates.get(d.id);
      if (!state || !state.ports) return;
      Object.entries(state.ports).forEach(([portId, p]) => {
        if (p.ipAddress) {
          ipEntries.push({
            deviceId: d.id,
            deviceName: d.name,
            portId,
            ipAddress: p.ipAddress,
            netmask: p.subnetMask || '255.255.255.0',
            vlan: p.vlan,
            status: p.shutdown ? 'DOWN' : 'UP'
          });
        }
      });
    });

    lines.push(`## 3. IP Adresleme Matrixi`);
    if (ipEntries.length === 0) {
      lines.push(`*Yapılandırılmış IP adresi bulunamadı.*\n`);
    } else {
      lines.push(`| Cihaz | Arayüz | IP Adresi | Ağ Maskesi | VLAN | Durum |`);
      lines.push(`|---|---|---|---|---|---|`);
      ipEntries.forEach(e => {
        lines.push(`| ${e.deviceName} | ${e.portId} | \`${e.ipAddress}\` | \`${e.netmask}\` | ${e.vlan ?? '-'} | ${e.status} |`);
      });
      lines.push('');
    }
  }

  // 4. VLAN Listesi
  if (includeVlans) {
    lines.push(`## 4. Konfigüre Edilmiş VLAN Listesi`);
    const vlanMap = new Map<number, string[]>();
    deviceStates.forEach((state, deviceId) => {
      const deviceName = devices.find(d => d.id === deviceId)?.name || deviceId;
      if (state.vlans) {
        Object.keys(state.vlans).forEach(vlanStr => {
          const vNum = parseInt(vlanStr, 10);
          if (!vlanMap.has(vNum)) vlanMap.set(vNum, []);
          vlanMap.get(vNum)?.push(deviceName);
        });
      }
    });

    if (vlanMap.size === 0) {
      lines.push(`*Özel VLAN bulunmamaktadır (Sadece varsayılan VLAN 1 mevcut).*\n`);
    } else {
      lines.push(`| VLAN ID | Tanımlı Cihazlar |`);
      lines.push(`|---|---|`);
      Array.from(vlanMap.keys()).sort((a, b) => a - b).forEach(vId => {
        const devs = vlanMap.get(vId)?.join(', ') || '';
        lines.push(`| VLAN ${vId} | ${devs} |`);
      });
      lines.push('');
    }
  }

  // 5. Dinamik & Statik Rota Tablosu Özeti
  if (includeRoutes) {
    const routeEntries: RouteReportEntry[] = [];
    devices.forEach(d => {
      const state = deviceStates.get(d.id);
      if (!state) return;

      // Statik Rotalar
      if (state.staticRoutes) {
        state.staticRoutes.forEach(r => {
          routeEntries.push({
            deviceId: d.id,
            deviceName: d.name,
            protocol: 'Static',
            prefix: `${r.network || r.destination}/${r.mask || r.subnetMask || '24'}`,
            nextHop: r.nextHop,
            interface: r.interface || 'Auto',
            metric: r.metric ?? r.administrativeDistance ?? 1
          });
        });
      }

      // OSPF Rotaları
      if (state.ospfNetworks) {
        state.ospfNetworks.forEach(net => {
          routeEntries.push({
            deviceId: d.id,
            deviceName: d.name,
            protocol: 'OSPF',
            prefix: `${net.network} (Area ${net.area})`,
            nextHop: 'OSPF Neighbor',
            interface: 'Multi-access',
            metric: 10
          });
        });
      }
    });

    lines.push(`## 5. Yönlendirme (Routing) Özeti`);
    if (routeEntries.length === 0) {
      lines.push(`*Aktif statik veya dinamik yönlendirme kaydı bulunamadı.*\n`);
    } else {
      lines.push(`| Cihaz | Protokol | Hedef Prefix | Sonraki Sıçrama (Next-Hop) | Metrik |`);
      lines.push(`|---|---|---|---|---|`);
      routeEntries.forEach(r => {
        lines.push(`| ${r.deviceName} | ${r.protocol} | \`${r.prefix}\` | \`${r.nextHop}\` | ${r.metric ?? '-'} |`);
      });
      lines.push('');
    }
  }

  return lines.join('\n');
}
