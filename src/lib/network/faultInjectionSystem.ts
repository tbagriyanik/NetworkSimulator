import { SwitchState } from './types';
import { FaultType, FaultDefinition, checkFaultResolved } from './faults';

export interface ExtendedFaultDefinition extends FaultDefinition {
  severity: 'high' | 'medium' | 'low';
  category: 'l1' | 'l2' | 'l3' | 'security' | 'services';
  solutionCommand?: string;
  progressiveHints: {
    level1: { tr: string; en: string };
    level2: { tr: string; en: string };
    level3: { tr: string; en: string };
  };
}

export interface FaultInjectionParams {
  id?: string;
  deviceId: string;
  faultType: FaultType;
  portId?: string;
  faultValue?: unknown;
  correctValue?: unknown;
  configKey?: string;
  customDescription?: { tr: string; en: string };
}

/**
 * Advanced Fault Injection System Engine
 */
export class FaultInjectionEngine {
  /**
   * Generates a complete fault definition with automatic config keys, description, and progressive hints.
   */
  public static createFault(params: FaultInjectionParams): ExtendedFaultDefinition {
    const { deviceId, faultType, portId = 'Fa0/1' } = params;
    const faultId = params.id || `fault-${faultType}-${deviceId}-${Date.now()}`;

    switch (faultType) {
      case 'shutdownInterface':
        return {
          id: faultId,
          deviceId,
          faultType,
          configKey: `ports.${portId}.shutdown`,
          faultValue: true,
          correctValue: false,
          severity: 'high',
          category: 'l1',
          solutionCommand: `interface ${portId} -> no shutdown`,
          description: {
            tr: `${deviceId} cihazının ${portId} arayüzü admin kapalı (shutdown).`,
            en: `Interface ${portId} on ${deviceId} is administrative shutdown.`
          },
          progressiveHints: {
            level1: {
              tr: 'Bağlantı fiziksel katmanda kopuk olabilir.',
              en: 'Connection may be down at the physical layer.'
            },
            level2: {
              tr: `Arayüz durumunu 'show ip interface brief' ile kontrol edin.`,
              en: `Check interface status with 'show ip interface brief'.`
            },
            level3: {
              tr: `interface ${portId} altında 'no shutdown' komutunu çalıştırın.`,
              en: `Run 'no shutdown' under interface ${portId}.`
            }
          }
        };

      case 'wrongIpAddress':
        return {
          id: faultId,
          deviceId,
          faultType,
          configKey: `ports.${portId}.ipAddress`,
          faultValue: params.faultValue || '192.168.99.99',
          correctValue: params.correctValue || '192.168.1.1',
          severity: 'high',
          category: 'l3',
          solutionCommand: `interface ${portId} -> ip address ${params.correctValue || '192.168.1.1'} 255.255.255.0`,
          description: {
            tr: `${deviceId} ${portId} üzerinde yanlış IP adresi yapılandırılmış.`,
            en: `Incorrect IP address configured on ${deviceId} ${portId}.`
          },
          progressiveHints: {
            level1: {
              tr: 'Cihaz IP adresinin doğru ağ bloğunda olup olmadığını kontrol edin.',
              en: 'Verify if the device IP address is in the correct network subnet.'
            },
            level2: {
              tr: `'show ip interface brief' veya 'show running-config' çıktısını inceleyin.`,
              en: `Inspect 'show ip interface brief' or 'show running-config' output.`
            },
            level3: {
              tr: `interface ${portId} altında doğru IP adresini 'ip address ...' ile tanımlayın.`,
              en: `Configure correct IP address under interface ${portId} using 'ip address ...'.`
            }
          }
        };

      case 'wrongSubnetMask':
        return {
          id: faultId,
          deviceId,
          faultType,
          configKey: `ports.${portId}.subnetMask`,
          faultValue: params.faultValue || '255.255.255.240',
          correctValue: params.correctValue || '255.255.255.0',
          severity: 'medium',
          category: 'l3',
          solutionCommand: `interface ${portId} -> ip address <IP> ${params.correctValue || '255.255.255.0'}`,
          description: {
            tr: `${deviceId} ${portId} üzerinde alt ağ maskesi uyuşmuyor.`,
            en: `Subnet mask mismatch on ${deviceId} ${portId}.`
          },
          progressiveHints: {
            level1: {
              tr: 'Alt ağ maskesi (subnet mask) uyuşmazlığı paketlerin yerel ağ dışına yönlenmesine neden olabilir.',
              en: 'Subnet mask mismatch might cause packets to misroute.'
            },
            level2: {
              tr: 'Diğer cihazların subnet maskesi ile bu cihazın maskesini karşılaştırın.',
              en: 'Compare the subnet mask of this device with peer devices.'
            },
            level3: {
              tr: `Subnet maskesini ${params.correctValue || '255.255.255.0'} olarak düzeltin.`,
              en: `Correct the subnet mask to ${params.correctValue || '255.255.255.0'}.`
            }
          }
        };

      case 'wrongDefaultGateway':
        return {
          id: faultId,
          deviceId,
          faultType,
          configKey: 'defaultGateway',
          faultValue: params.faultValue || '192.168.1.254',
          correctValue: params.correctValue || '192.168.1.1',
          severity: 'high',
          category: 'l3',
          solutionCommand: `ip default-gateway ${params.correctValue || '192.168.1.1'}`,
          description: {
            tr: `${deviceId} cihazında varsayılan ağ geçidi (Default Gateway) yanlış.`,
            en: `Incorrect Default Gateway configured on ${deviceId}.`
          },
          progressiveHints: {
            level1: {
              tr: 'Farklı alt ağlara erişim sağlanamıyor. Gateway adresini doğrulayın.',
              en: 'Cannot reach remote subnets. Verify Gateway IP.'
            },
            level2: {
              tr: `Router IP adresi ile ${deviceId} default-gateway ayarını karşılaştırın.`,
              en: `Compare Router IP address with ${deviceId} default-gateway setting.`
            },
            level3: {
              tr: `'ip default-gateway ${params.correctValue || '192.168.1.1'}' komutu ile güncelleyin.`,
              en: `Update using 'ip default-gateway ${params.correctValue || '192.168.1.1'}'.`
            }
          }
        };

      case 'wrongVlan':
        return {
          id: faultId,
          deviceId,
          faultType,
          configKey: `ports.${portId}.vlan`,
          faultValue: params.faultValue || 99,
          correctValue: params.correctValue || 10,
          severity: 'high',
          category: 'l2',
          solutionCommand: `interface ${portId} -> switchport access vlan ${params.correctValue || 10}`,
          description: {
            tr: `${deviceId} ${portId} arayüzü yanlış VLAN'a atanmış.`,
            en: `Interface ${portId} on ${deviceId} is assigned to wrong VLAN.`
          },
          progressiveHints: {
            level1: {
              tr: 'L2 katmanında VLAN izolasyonu paket iletişimini engelliyor.',
              en: 'L2 VLAN isolation is blocking packet transmission.'
            },
            level2: {
              tr: `'show vlan brief' komutu ile port-VLAN eşleşmesini kontrol edin.`,
              en: `Check port-VLAN mapping using 'show vlan brief'.`
            },
            level3: {
              tr: `interface ${portId} altında 'switchport access vlan ${params.correctValue || 10}' uygulayın.`,
              en: `Apply 'switchport access vlan ${params.correctValue || 10}' under interface ${portId}.`
            }
          }
        };

      default:
        return {
          id: faultId,
          deviceId,
          faultType,
          configKey: params.configKey || `ports.${portId}.shutdown`,
          faultValue: params.faultValue ?? true,
          correctValue: params.correctValue ?? false,
          severity: 'medium',
          category: 'l3',
          description: params.customDescription || {
            tr: `Cihazda ${faultType} arızası mevcut.`,
            en: `Fault ${faultType} present on device.`
          },
          progressiveHints: {
            level1: { tr: 'Konfigürasyonu kontrol edin.', en: 'Check configuration.' },
            level2: { tr: 'Show komutlarını kullanarak durumu inceleyin.', en: 'Inspect status using show commands.' },
            level3: { tr: 'Komutları uygulayarak ayarları düzeltin.', en: 'Apply commands to fix settings.' }
          }
        };
    }
  }

  /**
   * Applies a fault to the given SwitchState, returning the mutated state.
   */
  public static injectFault(state: SwitchState, fault: ExtendedFaultDefinition): SwitchState {
    const nextState = JSON.parse(JSON.stringify(state)) as SwitchState;
    const parts = fault.configKey.split('.');

    let current: Record<string, unknown> = nextState as unknown as Record<string, unknown>;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      const matchKey = Object.keys(current).find(k => k.toLowerCase() === part.toLowerCase()) || part;
      if (!current[matchKey] || typeof current[matchKey] !== 'object') {
        current[matchKey] = {};
      }
      current = current[matchKey] as Record<string, unknown>;
    }

    const lastPart = parts[parts.length - 1];
    const lastKey = Object.keys(current).find(k => k.toLowerCase() === lastPart.toLowerCase()) || lastPart;
    current[lastKey] = fault.faultValue;

    return nextState;
  }

  /**
   * Checks if a fault is resolved on the device state.
   */
  public static isResolved(state: SwitchState, fault: ExtendedFaultDefinition): boolean {
    return checkFaultResolved(state, fault);
  }

  /**
   * Retrieves hint for a fault according to requested detail level (1, 2, or 3).
   */
  public static getHint(fault: ExtendedFaultDefinition, level: 1 | 2 | 3, lang: 'tr' | 'en' = 'tr'): string {
    if (level === 1) return fault.progressiveHints.level1[lang];
    if (level === 2) return fault.progressiveHints.level2[lang];
    return fault.progressiveHints.level3[lang];
  }
}
