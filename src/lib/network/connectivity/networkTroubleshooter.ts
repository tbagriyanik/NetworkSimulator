import { CanvasDevice, CanvasConnection } from '@/components/network/NetworkTopology/types/networkTopology.types';
import { SwitchState } from '@/lib/network/types';
import { ensureDeviceStatesMap } from '@/lib/network/networkUtils';
import { isIpInSubnet, isPortShutdown } from '@/lib/network/connectivity.utils';
import { checkConnectivity } from './pathResolution/algorithm';

export interface DiagnosticIssue {
  id: string;
  category: 'physical' | 'ip' | 'gateway' | 'vlan' | 'routing' | 'security';
  severity: 'error' | 'warning' | 'info';
  title: { tr: string; en: string };
  description: { tr: string; en: string };
  suggestedFix: { tr: string; en: string };
  deviceId?: string;
  portId?: string;
}

export interface NetworkDiagnosticResult {
  canCommunicate: boolean;
  sourceDevice: CanvasDevice | null;
  targetDevice: CanvasDevice | null;
  issues: DiagnosticIssue[];
  passedChecks: { tr: string; en: string }[];
}

export function runRootCauseAnalysis(
  sourceId: string,
  targetId: string,
  devices: CanvasDevice[],
  connections: CanvasConnection[],
  deviceStates?: Map<string, SwitchState>
): NetworkDiagnosticResult {
  const safeDeviceStates = ensureDeviceStatesMap(deviceStates);
  const issues: DiagnosticIssue[] = [];
  const passedChecks: { tr: string; en: string }[] = [];

  const deviceMap = new Map<string, CanvasDevice>();
  devices.forEach(d => deviceMap.set(d.id, d));

  const source = deviceMap.get(sourceId) || null;
  const target = deviceMap.get(targetId) || null;

  if (!source || !target) {
    issues.push({
      id: 'missing-device',
      category: 'physical',
      severity: 'error',
      title: { tr: 'Cihaz BulunamadÄ±', en: 'Device Not Found' },
      description: { tr: 'Kaynak veya hedef cihaz aÄŸ topolojisinde mevcut deÄŸil.', en: 'Source or target device does not exist in topology.' },
      suggestedFix: { tr: 'CihazlarÄ± kontrol edip tekrar seÃ§in.', en: 'Check and re-select devices.' }
    });
    return { canCommunicate: false, sourceDevice: source, targetDevice: target, issues, passedChecks };
  }

  // 1. GÃ¼Ã§ KontrolÃ¼
  if (source.status === 'offline') {
    issues.push({
      id: 'source-offline',
      category: 'physical',
      severity: 'error',
      title: { tr: 'Kaynak Cihaz KapalÄ±', en: 'Source Device Offline' },
      description: { tr: `${source.name} cihazÄ±nÄ±n gÃ¼cÃ¼ kapalÄ± durumda.`, en: `${source.name} device is powered off.` },
      suggestedFix: { tr: 'CihazÄ±n gÃ¼Ã§ dÃ¼ÄŸmesine basarak aÃ§Ä±n.', en: 'Turn on the device power.' },
      deviceId: source.id
    });
  } else {
    passedChecks.push({ tr: `${source.name} cihazÄ± aÃ§Ä±k ve Ã§alÄ±ÅŸÄ±yor.`, en: `${source.name} is powered on and online.` });
  }

  if (target.status === 'offline') {
    issues.push({
      id: 'target-offline',
      category: 'physical',
      severity: 'error',
      title: { tr: 'Hedef Cihaz KapalÄ±', en: 'Target Device Offline' },
      description: { tr: `${target.name} cihazÄ±nÄ±n gÃ¼cÃ¼ kapalÄ± durumda.`, en: `${target.name} device is powered off.` },
      suggestedFix: { tr: 'Hedef cihazÄ±n gÃ¼cÃ¼nÃ¼ aÃ§Ä±n.', en: 'Turn on the target device.' },
      deviceId: target.id
    });
  } else {
    passedChecks.push({ tr: `${target.name} cihazÄ± aÃ§Ä±k ve Ã§alÄ±ÅŸÄ±yor.`, en: `${target.name} is powered on and online.` });
  }

  // 2. IP & Subnet KonfigÃ¼rasyonu
  const sourceIp = source.ip || '';
  const targetIp = target.ip || '';
  const sourceSubnet = source.subnet || '255.255.255.0';
  const targetSubnet = target.subnet || '255.255.255.0';

  if (!sourceIp) {
    issues.push({
      id: 'source-no-ip',
      category: 'ip',
      severity: 'error',
      title: { tr: 'Kaynak IP Eksik', en: 'Source IP Missing' },
      description: { tr: `${source.name} cihazÄ±na henÃ¼z bir IP adresi tanÄ±mlanmamÄ±ÅŸ.`, en: `${source.name} has no IP address configured.` },
      suggestedFix: { tr: 'Cihaz ayarlarÄ±ndan veya CLI Ã¼zerinden IP adresi atayÄ±n (veya DHCP aktif edin).', en: 'Assign an IP in device settings or CLI (or enable DHCP).' },
      deviceId: source.id
    });
  } else {
    passedChecks.push({ tr: `Kaynak IP: ${sourceIp}/${sourceSubnet}`, en: `Source IP: ${sourceIp}/${sourceSubnet}` });
  }

  if (!targetIp) {
    issues.push({
      id: 'target-no-ip',
      category: 'ip',
      severity: 'error',
      title: { tr: 'Hedef IP Eksik', en: 'Target IP Missing' },
      description: { tr: `${target.name} cihazÄ±na henÃ¼z bir IP adresi tanÄ±mlanmamÄ±ÅŸ.`, en: `${target.name} has no IP address configured.` },
      suggestedFix: { tr: 'Hedef cihaza geÃ§erli bir IP adresi verin.', en: 'Assign a valid IP address to the target device.' },
      deviceId: target.id
    });
  } else {
    passedChecks.push({ tr: `Hedef IP: ${targetIp}/${targetSubnet}`, en: `Target IP: ${targetIp}/${targetSubnet}` });
  }

  // 3. Fiziksel BaÄŸlantÄ± & Port Shutdown Kontrolleri
  const sourceConns = connections.filter(c => c.sourceDeviceId === source.id || c.targetDeviceId === source.id);
  if (sourceConns.length === 0) {
    issues.push({
      id: 'source-no-cable',
      category: 'physical',
      severity: 'error',
      title: { tr: 'Kaynak Kablosu TakÄ±lÄ± DeÄŸil', en: 'Source Cable Not Connected' },
      description: { tr: `${source.name} herhangi bir switch veya router'a baÄŸlÄ± deÄŸil.`, en: `${source.name} is not connected to any switch or router.` },
      suggestedFix: { tr: 'Kablo aracÄ±nÄ± kullanarak cihazÄ± aÄŸa baÄŸlayÄ±n.', en: 'Connect the device with a cable.' },
      deviceId: source.id
    });
  }

  // Port shutdown kontrolleri
  sourceConns.forEach(conn => {
    const port = conn.sourceDeviceId === source.id ? conn.sourcePort : conn.targetPort;
    if (isPortShutdown(source.id, port, devices, safeDeviceStates)) {
      issues.push({
        id: `port-shutdown-${source.id}-${port}`,
        category: 'physical',
        severity: 'error',
        title: { tr: `ArayÃ¼z KapalÄ±: ${port}`, en: `Interface Shutdown: ${port}` },
        description: { tr: `${source.name} Ã¼zerindeki ${port} arayÃ¼zÃ¼ admin olarak kapatÄ±lmÄ±ÅŸ (shutdown).`, en: `Interface ${port} on ${source.name} is shutdown.` },
        suggestedFix: { tr: `CLI'dan 'interface ${port}' altÄ±na girip 'no shutdown' komutunu uygulayÄ±n.`, en: `Enter 'interface ${port}' and run 'no shutdown'.` },
        deviceId: source.id,
        portId: port
      });
    }
  });

  // 4. Subnet & Default Gateway Analizi
  if (sourceIp && targetIp) {
    const isSameSubnet = isIpInSubnet(sourceIp, targetIp, sourceSubnet);
    const hasRouter = devices.some(d => d.type === 'router' || d.type === 'switchL3');

    if (!isSameSubnet) {
      if (!hasRouter) {
        issues.push({
          id: 'diff-subnet-no-router',
          category: 'routing',
          severity: 'error',
          title: { tr: 'FarklÄ± Subnet & Router Yok', en: 'Different Subnet & No Router' },
          description: {
            tr: `${source.name} (${sourceIp}) ile ${target.name} (${targetIp}) farklÄ± alt aÄŸlarda fakat topolojide yÃ¶nlendirme yapacak bir Router / L3 Switch yok.`,
            en: `${source.name} and ${target.name} are in different subnets without a Router/L3 Switch.`
          },
          suggestedFix: {
            tr: 'Ya cihazlarÄ± aynÄ± subnet iÃ§ine alÄ±n (Ã¶rn: 192.168.1.x) ya da araya bir Router ekleyin.',
            en: 'Place both in the same subnet or add a Router between them.'
          }
        });
      } else {
        // Router var, Gateway kontrolÃ¼
        if (!source.gateway) {
          issues.push({
            id: 'source-no-gateway',
            category: 'gateway',
            severity: 'error',
            title: { tr: 'VarsayÄ±lan AÄŸ GeÃ§idi (Gateway) Eksik', en: 'Missing Default Gateway' },
            description: {
              tr: `${source.name} farklÄ± bir alt aÄŸa paket gÃ¶ndermeye Ã§alÄ±ÅŸÄ±yor ancak Default Gateway adresi tanÄ±mlanmamÄ±ÅŸ.`,
              en: `${source.name} is attempting inter-subnet routing without a default gateway.`
            },
            suggestedFix: {
              tr: 'Kaynak cihaz ayarlarÄ±na baÄŸlÄ± olduÄŸu Router bacaÄŸÄ±nÄ±n IP adresini Gateway olarak girin.',
              en: 'Configure the Router interface IP as the default gateway on the source.'
            },
            deviceId: source.id
          });
        } else if (!isIpInSubnet(sourceIp, source.gateway, sourceSubnet)) {
          issues.push({
            id: 'gateway-subnet-mismatch',
            category: 'gateway',
            severity: 'error',
            title: { tr: 'Gateway Alt AÄŸ UyuÅŸmazlÄ±ÄŸÄ±', en: 'Gateway Subnet Mismatch' },
            description: {
              tr: `${source.name} cihazÄ±nÄ±n Gateway IP'si (${source.gateway}) kendi IP bloÄŸuyla (${sourceSubnet}) uyuÅŸmuyor.`,
              en: `Gateway IP (${source.gateway}) is not within the source device's local subnet.`
            },
            suggestedFix: {
              tr: `Gateway adresini ${sourceIp.split('.').slice(0, 3).join('.')}.1 gibi aynÄ± alt aÄŸdan bir adres yapÄ±n.`,
              en: `Set the gateway address within the same subnet.`
            },
            deviceId: source.id
          });
        } else {
          passedChecks.push({ tr: `Default Gateway yapÄ±landÄ±rÄ±lmÄ±ÅŸ: ${source.gateway}`, en: `Default Gateway configured: ${source.gateway}` });
        }
      }
    } else {
      passedChecks.push({ tr: 'Cihazlar aynÄ± yerel alt aÄŸda (Local Subnet).', en: 'Devices are on the same local subnet.' });
    }
  }

  // 5. VLAN UyuÅŸmazlÄ±ÄŸÄ± Analizi
  if (source.vlan && target.vlan && source.vlan !== target.vlan) {
    const hasL3 = devices.some(d => (d.type === 'router' || d.type === 'switchL3') && safeDeviceStates.get(d.id)?.ipRouting !== false);
    if (!hasL3) {
      issues.push({
        id: 'vlan-mismatch',
        category: 'vlan',
        severity: 'error',
        title: { tr: 'VLAN UyuÅŸmazlÄ±ÄŸÄ± (Inter-VLAN Gerekli)', en: 'VLAN Mismatch (Inter-VLAN Required)' },
        description: {
          tr: `${source.name} VLAN ${source.vlan} Ã¼zerinde, ${target.name} ise VLAN ${target.vlan} Ã¼zerinde. AralarÄ±nda yÃ¶nlendirme yapacak Router on a Stick veya L3 Switch bulunmuyor.`,
          en: `${source.name} is on VLAN ${source.vlan} and ${target.name} is on VLAN ${target.vlan} with no routing configured.`
        },
        suggestedFix: {
          tr: 'CihazlarÄ± aynÄ± VLAN iÃ§ine alÄ±n veya Router Ã¼zerinde sub-interface (Router-on-a-Stick) yapÄ±landÄ±rÄ±n.',
          en: 'Assign them to the same VLAN or configure Router-on-a-Stick.'
        }
      });
    }
  }

  // 6. UÃ§tan Uca BaÄŸlantÄ± DoÄŸrulama
  if (targetIp) {
    const connectivity = checkConnectivity(source.id, targetIp, devices, connections, safeDeviceStates);
    if (connectivity.success) {
      passedChecks.push({ tr: `UÃ§tan uca yol bulundu: ${connectivity.hops.join(' -> ')}`, en: `End-to-end path resolved: ${connectivity.hops.join(' -> ')}` });
    } else if (issues.length === 0) {
      issues.push({
        id: 'routing-path-missing',
        category: 'routing',
        severity: 'error',
        title: { tr: 'YÃ¶nlendirme / Anahtarlama Yolu BulunamadÄ±', en: 'No Routing/Switching Path' },
        description: { tr: connectivity.error || 'Cihazlar arasÄ±nda veri iletim yolu tamamlanamÄ±yor.', en: connectivity.error || 'Path cannot be resolved.' },
        suggestedFix: { tr: 'Switch Trunk portlarÄ±nÄ± ve Router yÃ¶nlendirme tablolarÄ±nÄ± (ip route) inceleyin.', en: 'Check switch trunking and routing tables.' }
      });
    }
  }

  return {
    canCommunicate: issues.length === 0,
    sourceDevice: source,
    targetDevice: target,
    issues,
    passedChecks
  };
}


