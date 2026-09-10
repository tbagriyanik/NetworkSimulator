import type { CanvasDevice } from '@/components/network/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';

export interface DiagnosticIssue {
  id: string;
  severity: 'error' | 'warning' | 'info';
  titleTr: string;
  titleEn: string;
  descriptionTr: string;
  descriptionEn: string;
  deviceId?: string;
  portId?: string;
  suggestedFixTr: string;
  suggestedFixEn: string;
}

export function runSmartDiagnostics(
  devices: CanvasDevice[],
  deviceStates: Map<string, SwitchState>
): DiagnosticIssue[] {
  const issues: DiagnosticIssue[] = [];

  if (!devices || devices.length === 0) return issues;

  // Check 1: PC without Default Gateway
  devices.forEach((dev) => {
    if (dev.type === 'pc') {
      const state = deviceStates.get(dev.id);
      const gw = state?.defaultGateway;
      const ip = state?.ip;

      if (ip && ip !== '0.0.0.0' && (!gw || gw === '0.0.0.0')) {
        issues.push({
          id: `missing-gw-${dev.id}`,
          severity: 'warning',
          titleTr: `${dev.name}: Varsayılan Ağ Geçidi Eksik`,
          titleEn: `${dev.name}: Missing Default Gateway`,
          descriptionTr: `${dev.name} bilgisayarına IP tanımlanmış fakat varsayılan ağ geçidi (Default Gateway) boş. Diğer ağlara erişilemeyebilir.`,
          descriptionEn: `${dev.name} has an IP configured but no Default Gateway. External networks will be unreachable.`,
          deviceId: dev.id,
          suggestedFixTr: 'Cihaz ayarlarına girerek yönlendirici IP adresini Varsayılan Ağ Geçidi olarak girin.',
          suggestedFixEn: 'Open device settings and specify the router IP address as Default Gateway.',
        });
      }
    }
  });

  // Check 2: Shutdown active interfaces on Routers/Switches
  deviceStates.forEach((state, devId) => {
    const dev = devices.find((d) => d.id === devId);
    if (!dev) return;

    if (state.ports) {
      Object.entries(state.ports).forEach(([ifName, port]) => {
        if (port.ipAddress && port.ipAddress !== '0.0.0.0' && port.shutdown) {
          issues.push({
            id: `interface-shutdown-${devId}-${ifName}`,
            severity: 'error',
            titleTr: `${dev.name} (${ifName}): Arayüz Kapalı (Shutdown)`,
            titleEn: `${dev.name} (${ifName}): Interface is Shutdown`,
            descriptionTr: `${dev.name} cihazındaki ${ifName} arayüzüne IP atandığı halde arayüz kapalı durumdadır.`,
            descriptionEn: `${dev.name} interface ${ifName} has an assigned IP but is currently shut down.`,
            deviceId: devId,
            portId: ifName,
            suggestedFixTr: `CLI üzerinden 'interface ${ifName}' modunda 'no shutdown' komutunu çalıştırın.`,
            suggestedFixEn: `Run 'no shutdown' under 'interface ${ifName}' in CLI mode.`,
          });
        }
      });
    }
  });

  return issues;
}
