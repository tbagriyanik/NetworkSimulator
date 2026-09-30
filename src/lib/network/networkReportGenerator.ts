import type { SwitchState } from './types';
import type { CanvasDevice, CanvasConnection } from '@/components/network/NetworkTopology/types/networkTopology.types';
import { auditNetwork, summarizeAudit, type AuditFinding, type AuditReport } from './networkAudit';

export interface NetworkReportOptions {
  includeInventory?: boolean;
  includeIpAddresses?: boolean;
  includeVlans?: boolean;
  includeRoutes?: boolean;
  /**
   * Run the automatic validation engine and append the audit section.
   * Defaults to true: the report is a validator, not just documentation.
   */
  includeAudit?: boolean;
  /** Only list findings at or above this severity in the rendered report. */
  minAuditSeverity?: 'critical' | 'warning' | 'info';
  title?: string;
}

/**
 * Structured result for callers that want the findings without Markdown
 * (UI badges, CI gates, JSON export).
 */
export interface NetworkReport {
  markdown: string;
  audit: AuditReport;
  auditSummary: string;
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
    includeAudit = true,
    minAuditSeverity = 'info',
    title = 'Ağ Topolojisi Ve Sistem Teknik Raporu'
  } = options;

  const lines: string[] = [];
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  // The audit runs first so its summary can be part of the report header.
  const audit = auditNetwork(devices, connections, deviceStates);
  const auditSummary = summarizeAudit(audit);

  lines.push(`# ${title}`);
  lines.push(`*Oluşturulma Tarihi: ${now}*\n`);
  if (includeAudit) {
    lines.push(`> **Otomatik Doğrulama Durumu:** ${auditSummary}\n`);
  }

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

  // 6. Otomatik Doğrulama & Denetim (Validation / Audit)
  if (includeAudit) {
    const severityOrder = { critical: 0, warning: 1, info: 2 } as const;
    const threshold = severityOrder[minAuditSeverity];
    const shown = audit.findings.filter(f => severityOrder[f.severity] <= threshold);

    lines.push(`## 6. Otomatik Doğrulama ve Denetim (Audit)`);
    lines.push(`- **Sonuç:** ${audit.passed ? 'GEÇTİ (kritik hata yok)' : 'BAŞARISIZ (kritik hata var)'}`);
    lines.push(`- **Sağlık Skoru:** ${audit.score}/100`);
    lines.push(`- **Bulgular:** ${audit.counts.critical} kritik, ${audit.counts.warning} uyarı, ${audit.counts.info} bilgi\n`);

    if (shown.length === 0) {
      lines.push(`*Bu eşikte gösterilecek bulgu yok — yapılandırma doğrulamadan geçti.*\n`);
    } else {
      lines.push(`| Önem | Kod | Bulgu | Detay | Öneri |`);
      lines.push(`|---|---|---|---|---|`);
      shown.forEach(f => {
        const label = f.severity === 'critical' ? '🔴 Kritik' : f.severity === 'warning' ? '🟠 Uyarı' : '🔵 Bilgi';
        lines.push(`| ${label} | \`${f.code}\` | ${f.title} | ${f.detail} | ${f.remediation ?? '-'} |`);
      });
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Structured variant of generateNetworkReport(): returns the Markdown body
 * together with the audit findings so callers can gate builds/tests on them.
 */
export function generateNetworkReportWithAudit(
  devices: CanvasDevice[],
  connections: CanvasConnection[],
  deviceStates: Map<string, SwitchState>,
  options: NetworkReportOptions = {}
): NetworkReport {
  const audit = auditNetwork(devices, connections, deviceStates);
  return {
    markdown: generateNetworkReport(devices, connections, deviceStates, options),
    audit,
    auditSummary: summarizeAudit(audit),
  };
}

/** Convenience filter for UI badges: findings at or above a severity. */
export function filterAuditFindings(
  findings: AuditFinding[],
  minSeverity: 'critical' | 'warning' | 'info'
): AuditFinding[] {
  const severityOrder = { critical: 0, warning: 1, info: 2 } as const;
  const threshold = severityOrder[minSeverity];
  return findings.filter(f => severityOrder[f.severity] <= threshold);
}
