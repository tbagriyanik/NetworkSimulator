import { CanvasDevice, CanvasConnection } from '@/components/network/NetworkTopology/types/networkTopology.types';
import { SwitchState } from '@/lib/network/types';
import { ensureDeviceStatesMap } from '@/lib/network/networkUtils';
import { isIpInSubnet, isPortShutdown, isConnectionCableCompatible } from '@/lib/network/connectivity.utils';
import { checkConnectivity } from './pathResolution/algorithm';
import { checkDeviceConnectivity } from './pingDiagnostics';
import { buildImplicitWirelessConnections } from '@/lib/network/wireless';

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
      title: { tr: 'Cihaz Bulunamadı', en: 'Device Not Found' },
      description: { tr: 'Kaynak veya hedef cihaz ağ topolojisinde mevcut değil.', en: 'Source or target device does not exist in topology.' },
      suggestedFix: { tr: 'Cihazları kontrol edip tekrar seçin.', en: 'Check and re-select devices.' }
    });
    return { canCommunicate: false, sourceDevice: source, targetDevice: target, issues, passedChecks };
  }

  // Implicit wireless (WiFi) bağlantılarını da dahil et
  const implicitWirelessConns = buildImplicitWirelessConnections(devices, safeDeviceStates, 'diag-wireless');
  const allConnections = [...connections, ...implicitWirelessConns];

  // 1. Güç Kontrolü
  if (source.status === 'offline') {
    issues.push({
      id: 'source-offline',
      category: 'physical',
      severity: 'error',
      title: { tr: 'Kaynak Cihaz Kapalı', en: 'Source Device Offline' },
      description: { tr: `${source.name} cihazının gücü kapalı durumda.`, en: `${source.name} device is powered off.` },
      suggestedFix: { tr: 'Cihazın güç düğmesine basarak açın.', en: 'Turn on the device power.' },
      deviceId: source.id
    });
  } else {
    passedChecks.push({ tr: `${source.name} cihazı açık ve çalışıyor.`, en: `${source.name} is powered on and online.` });
  }

  if (target.status === 'offline') {
    issues.push({
      id: 'target-offline',
      category: 'physical',
      severity: 'error',
      title: { tr: 'Hedef Cihaz Kapalı', en: 'Target Device Offline' },
      description: { tr: `${target.name} cihazının gücü kapalı durumda.`, en: `${target.name} device is powered off.` },
      suggestedFix: { tr: 'Hedef cihazın gücünü açın.', en: 'Turn on the target device.' },
      deviceId: target.id
    });
  } else {
    passedChecks.push({ tr: `${target.name} cihazı açık ve çalışıyor.`, en: `${target.name} is powered on and online.` });
  }

  // Helper: Cihazın IP adresi yapılandırması gerektirip gerektirmediğini belirle (Hub, L2 Switch, Bulut IP istemez)
  const requiresIpAddress = (device: CanvasDevice): boolean => {
    if (device.type === 'hub' || device.type === 'switchL2' || device.type === 'cloud') {
      return false;
    }
    return true;
  };

  // 2. IP & Subnet Konfigürasyonu
  const sourceIp = source.ip || '';
  const targetIp = target.ip || '';
  const sourceSubnet = source.subnet || '255.255.255.0';
  const targetSubnet = target.subnet || '255.255.255.0';

  if (!sourceIp) {
    if (requiresIpAddress(source)) {
      issues.push({
        id: 'source-no-ip',
        category: 'ip',
        severity: 'error',
        title: { tr: 'Kaynak IP Eksik', en: 'Source IP Missing' },
        description: { tr: `${source.name} cihazına henüz bir IP adresi tanımlanmamış.`, en: `${source.name} has no IP address configured.` },
        suggestedFix: { tr: 'Cihaz ayarlarından veya CLI üzerinden IP adresi atayın (veya DHCP aktif edin).', en: 'Assign an IP in device settings or CLI (or enable DHCP).' },
        deviceId: source.id
      });
    } else {
      const label = source.type === 'hub' ? 'Hub' : source.type === 'switchL2' ? 'L2 Switch' : 'Bulut';
      passedChecks.push({ tr: `${source.name} (${label}) IP adresi yapılandırması gerektirmez.`, en: `${source.name} (${label}) does not require IP configuration.` });
    }
  } else {
    passedChecks.push({ tr: `Kaynak IP: ${sourceIp}/${sourceSubnet}`, en: `Source IP: ${sourceIp}/${sourceSubnet}` });
  }

  if (!targetIp) {
    if (requiresIpAddress(target)) {
      issues.push({
        id: 'target-no-ip',
        category: 'ip',
        severity: 'error',
        title: { tr: 'Hedef IP Eksik', en: 'Target IP Missing' },
        description: { tr: `${target.name} cihazına henüz bir IP adresi tanımlanmamış.`, en: `${target.name} has no IP address configured.` },
        suggestedFix: { tr: 'Hedef cihaza geçerli bir IP adresi verin.', en: 'Assign a valid IP address to the target device.' },
        deviceId: target.id
      });
    } else {
      const label = target.type === 'hub' ? 'Hub' : target.type === 'switchL2' ? 'L2 Switch' : 'Bulut';
      passedChecks.push({ tr: `${target.name} (${label}) IP adresi yapılandırması gerektirmez.`, en: `${target.name} (${label}) does not require IP configuration.` });
    }
  } else {
    passedChecks.push({ tr: `Hedef IP: ${targetIp}/${targetSubnet}`, en: `Target IP: ${targetIp}/${targetSubnet}` });
  }

  // Helper: Determine if a device primarily expects a WiFi connection when un-cabled
  const isExpectsWireless = (device: CanvasDevice): boolean => {
    if (device.type === 'mobile') return true;
    if (device.wifi && (device.wifi.enabled === true || (device.wifi.ssid && device.wifi.ssid.trim() !== ''))) {
      return true;
    }
    return false;
  };

  // 3. Fiziksel / Kablosuz (WiFi), Serial, Gigabit & Ethernet Bağlantı Kontrolleri
  const sourceConns = allConnections.filter(c => c.sourceDeviceId === source.id || c.targetDeviceId === source.id);
  const isSourceWirelessConnected = sourceConns.some(c => c.cableType === 'wireless' || c.sourcePort === 'wlan0' || c.targetPort === 'wlan0');

  if (sourceConns.length === 0) {
    if (isExpectsWireless(source)) {
      issues.push({
        id: 'source-no-wifi-conn',
        category: 'physical',
        severity: 'error',
        title: { tr: 'Kablosuz (WiFi) Bağlantısı Kurulamadı', en: 'Wireless (WiFi) Connection Failed' },
        description: { tr: `${source.name} kapsama alanında bir Erişim Noktası (AP / Router / WLC) bulamadı veya WiFi şifre/SSID ayarları uyuşmuyor.`, en: `${source.name} could not associate with any Access Point (check SSID, password, channel or distance).` },
        suggestedFix: { tr: 'SSID ve WPA2/WEP şifresinin hedef AP ile aynı olduğunu ve cihazın sinyal alanında bulunduğunu kontrol edin.', en: 'Ensure SSID and security key match the AP and client is in coverage range.' },
        deviceId: source.id
      });
    } else {
      issues.push({
        id: 'source-no-cable',
        category: 'physical',
        severity: 'error',
        title: { tr: 'Kaynak Kablosu Takılı Değil', en: 'Source Cable Not Connected' },
        description: { tr: `${source.name} herhangi bir switch, router veya cihaza bağlı değil.`, en: `${source.name} is not connected to any switch or router.` },
        suggestedFix: { tr: 'Kablo aracını kullanarak cihazı ağa bağlayın (veya kablosuz kullanılıyorsa WiFi ayarlarını aktif edin).', en: 'Connect the device with a cable (or configure WiFi settings if using wireless).' },
        deviceId: source.id
      });
    }
  } else {
    if (isSourceWirelessConnected) {
      passedChecks.push({ tr: `${source.name} kablosuz (WiFi) ağa başarıyla bağlı.`, en: `${source.name} is connected via Wireless (WiFi).` });
    } else {
      const serialConn = sourceConns.find(c => c.cableType === 'serial' || c.sourcePort.toLowerCase().startsWith('se') || c.targetPort.toLowerCase().startsWith('se'));
      const fiberConn = sourceConns.find(c => c.cableType === 'fiber');
      const gigabitConn = sourceConns.find(c => c.sourcePort.toLowerCase().startsWith('gi') || c.sourcePort.toLowerCase().startsWith('te') || c.targetPort.toLowerCase().startsWith('gi') || c.targetPort.toLowerCase().startsWith('te'));
      const consoleConn = sourceConns.find(c => c.cableType === 'console');

      if (serialConn) {
        passedChecks.push({ tr: `${source.name} Seri (Serial) WAN bağlantısı ile bağlı.`, en: `${source.name} is connected via Serial WAN interface.` });
      } else if (fiberConn) {
        passedChecks.push({ tr: `${source.name} Fiber Optik kablo ile bağlı.`, en: `${source.name} is connected via Fiber Optic link.` });
      } else if (gigabitConn) {
        passedChecks.push({ tr: `${source.name} Gigabit / 10G Ethernet bağlantısı ile bağlı.`, en: `${source.name} is connected via Gigabit/10G Ethernet interface.` });
      } else if (consoleConn) {
        passedChecks.push({ tr: `${source.name} Konsol (Console) seri yönetim hattı ile bağlı.`, en: `${source.name} is connected via Console management line.` });
      } else {
        passedChecks.push({ tr: `${source.name} Ethernet / FastEthernet kablosu ile bağlı.`, en: `${source.name} is connected via Ethernet cable.` });
      }
    }
  }

  const targetConns = allConnections.filter(c => c.sourceDeviceId === target.id || c.targetDeviceId === target.id);
  const isTargetWirelessConnected = targetConns.some(c => c.cableType === 'wireless' || c.sourcePort === 'wlan0' || c.targetPort === 'wlan0');

  if (targetConns.length === 0) {
    if (isExpectsWireless(target)) {
      issues.push({
        id: 'target-no-wifi-conn',
        category: 'physical',
        severity: 'error',
        title: { tr: 'Hedef Kablosuz (WiFi) Bağlantısı Kurulamadı', en: 'Target Wireless (WiFi) Connection Failed' },
        description: { tr: `${target.name} kapsama alanında bir Erişim Noktasına (AP / Router / WLC) bağlanamadı.`, en: `${target.name} could not associate with any Access Point.` },
        suggestedFix: { tr: 'Hedef cihazın WiFi SSID ve şifre yapılandırmasını kontrol edin.', en: 'Check target device WiFi SSID and security configuration.' },
        deviceId: target.id
      });
    } else {
      issues.push({
        id: 'target-no-cable',
        category: 'physical',
        severity: 'error',
        title: { tr: 'Hedef Kablosu Takılı Değil', en: 'Target Cable Not Connected' },
        description: { tr: `${target.name} herhangi bir switch, router veya cihaza bağlı değil.`, en: `${target.name} is not connected to any switch or router.` },
        suggestedFix: { tr: 'Kablo aracını kullanarak hedef cihazı ağa bağlayın (veya kablosuz kullanılıyorsa WiFi ayarlarını aktif edin).', en: 'Connect target device with a cable (or configure WiFi settings if using wireless).' },
        deviceId: target.id
      });
    }
  } else if (isTargetWirelessConnected) {
    passedChecks.push({ tr: `${target.name} kablosuz (WiFi) ağa başarıyla bağlı.`, en: `${target.name} is connected via Wireless (WiFi).` });
  } else {
    const serialConn = targetConns.find(c => c.cableType === 'serial' || c.sourcePort.toLowerCase().startsWith('se') || c.targetPort.toLowerCase().startsWith('se'));
    const fiberConn = targetConns.find(c => c.cableType === 'fiber');
    const gigabitConn = targetConns.find(c => c.sourcePort.toLowerCase().startsWith('gi') || c.sourcePort.toLowerCase().startsWith('te') || c.targetPort.toLowerCase().startsWith('gi') || c.targetPort.toLowerCase().startsWith('te'));
    const consoleConn = targetConns.find(c => c.cableType === 'console');

    if (serialConn) {
      passedChecks.push({ tr: `${target.name} Seri (Serial) WAN bağlantısı ile bağlı.`, en: `${target.name} is connected via Serial WAN interface.` });
    } else if (fiberConn) {
      passedChecks.push({ tr: `${target.name} Fiber Optik kablo ile bağlı.`, en: `${target.name} is connected via Fiber Optic link.` });
    } else if (gigabitConn) {
      passedChecks.push({ tr: `${target.name} Gigabit / 10G Ethernet bağlantısı ile bağlı.`, en: `${target.name} is connected via Gigabit/10G Ethernet interface.` });
    } else if (consoleConn) {
      passedChecks.push({ tr: `${target.name} Konsol (Console) seri yönetim hattı ile bağlı.`, en: `${target.name} is connected via Console management line.` });
    } else {
      passedChecks.push({ tr: `${target.name} Ethernet / FastEthernet kablosu ile bağlı.`, en: `${target.name} is connected via Ethernet cable.` });
    }
  }

  // Kablo Uyumluluğu & Port Shutdown Kontrolleri
  sourceConns.forEach(conn => {
    const port = conn.sourceDeviceId === source.id ? conn.sourcePort : conn.targetPort;
    const targetDevId = conn.sourceDeviceId === source.id ? conn.targetDeviceId : conn.sourceDeviceId;
    const targetDev = deviceMap.get(targetDevId);

    if (conn.cableType !== 'wireless' && targetDev) {
      const compatible = isConnectionCableCompatible(conn, source, targetDev);
      if (!compatible) {
        issues.push({
          id: `incompatible-cable-${source.id}-${port}`,
          category: 'physical',
          severity: 'error',
          title: { tr: `Uyumsuz Kablo Tipi: ${conn.cableType}`, en: `Incompatible Cable Type: ${conn.cableType}` },
          description: { tr: `${source.name} (${port}) ve ${targetDev.name} arasında kullanılan kablo tipi uyumsuz.`, en: `Incompatible cable used between ${source.name} and ${targetDev.name}.` },
          suggestedFix: { tr: 'Cihaz tiplerine uygun kabloyu seçin (örn: PC-Switch için Düz Kablo, PC-PC için Çapraz Kablo, Router-Router için Seri Kablo).', en: 'Use appropriate cable (e.g. Straight-through, Crossover, or Serial cable).' },
          deviceId: source.id,
          portId: port
        });
      }
    }

    if (isPortShutdown(source.id, port, devices, safeDeviceStates)) {
      issues.push({
        id: `port-shutdown-${source.id}-${port}`,
        category: 'physical',
        severity: 'error',
        title: { tr: `Arayüz Kapalı: ${port}`, en: `Interface Shutdown: ${port}` },
        description: { tr: `${source.name} üzerindeki ${port} arayüzü admin olarak kapatılmış (shutdown).`, en: `Interface ${port} on ${source.name} is shutdown.` },
        suggestedFix: { tr: `CLI'dan 'interface ${port}' altına girip 'no shutdown' komutunu uygulayın.`, en: `Enter 'interface ${port}' and run 'no shutdown'.` },
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
          title: { tr: 'Farklı Subnet & Router Yok', en: 'Different Subnet & No Router' },
          description: {
            tr: `${source.name} (${sourceIp}) ile ${target.name} (${targetIp}) farklı alt ağlarda fakat topolojide yönlendirme yapacak bir Router / L3 Switch yok.`,
            en: `${source.name} and ${target.name} are in different subnets without a Router/L3 Switch.`
          },
          suggestedFix: {
            tr: 'Ya cihazları aynı subnet içine alın (örn: 192.168.1.x) ya da araya bir Router ekleyin.',
            en: 'Place both in the same subnet or add a Router between them.'
          }
        });
      } else {
        // Router var, Gateway kontrolü
        if (!source.gateway) {
          issues.push({
            id: 'source-no-gateway',
            category: 'gateway',
            severity: 'error',
            title: { tr: 'Varsayılan Ağ Geçidi (Gateway) Eksik', en: 'Missing Default Gateway' },
            description: {
              tr: `${source.name} farklı bir alt ağa paket göndermeye çalışıyor ancak Default Gateway adresi tanımlanmamış.`,
              en: `${source.name} is attempting inter-subnet routing without a default gateway.`
            },
            suggestedFix: {
              tr: 'Kaynak cihaz ayarlarına bağlı olduğu Router bacağının IP adresini Gateway olarak girin.',
              en: 'Configure the Router interface IP as the default gateway on the source.'
            },
            deviceId: source.id
          });
        } else if (!isIpInSubnet(sourceIp, source.gateway, sourceSubnet)) {
          issues.push({
            id: 'gateway-subnet-mismatch',
            category: 'gateway',
            severity: 'error',
            title: { tr: 'Gateway Alt Ağ Uyuşmazlığı', en: 'Gateway Subnet Mismatch' },
            description: {
              tr: `${source.name} cihazının Gateway IP'si (${source.gateway}) kendi IP bloğuyla (${sourceSubnet}) uyuşmuyor.`,
              en: `Gateway IP (${source.gateway}) is not within the source device's local subnet.`
            },
            suggestedFix: {
              tr: `Gateway adresini ${sourceIp.split('.').slice(0, 3).join('.')}.1 gibi aynı alt ağdan bir adres yapın.`,
              en: `Set the gateway address within the same subnet.`
            },
            deviceId: source.id
          });
        } else {
          passedChecks.push({ tr: `Default Gateway yapılandırılmış: ${source.gateway}`, en: `Default Gateway configured: ${source.gateway}` });
        }
      }
    } else {
      passedChecks.push({ tr: 'Cihazlar aynı yerel alt ağda (Local Subnet).', en: 'Devices are on the same local subnet.' });
    }
  }

  // 5. VLAN Uyuşmazlığı Analizi
  if (source.vlan && target.vlan && source.vlan !== target.vlan) {
    const hasL3 = devices.some(d => (d.type === 'router' || d.type === 'switchL3') && safeDeviceStates.get(d.id)?.ipRouting !== false);
    if (!hasL3) {
      issues.push({
        id: 'vlan-mismatch',
        category: 'vlan',
        severity: 'error',
        title: { tr: 'VLAN Uyuşmazlığı (Inter-VLAN Gerekli)', en: 'VLAN Mismatch (Inter-VLAN Required)' },
        description: {
          tr: `${source.name} VLAN ${source.vlan} üzerinde, ${target.name} ise VLAN ${target.vlan} üzerinde. Aralarında yönlendirme yapacak Router on a Stick veya L3 Switch bulunmuyor.`,
          en: `${source.name} is on VLAN ${source.vlan} and ${target.name} is on VLAN ${target.vlan} with no routing configured.`
        },
        suggestedFix: {
          tr: 'Cihazları aynı VLAN içine alın veya Router üzerinde sub-interface (Router-on-a-Stick) yapılandırın.',
          en: 'Assign them to the same VLAN or configure Router-on-a-Stick.'
        }
      });
    }
  }

  // 6. Uçtan Uca Bağlantı Doğrulama
  if (source.type === 'hub' || target.type === 'hub' || !targetIp || !sourceIp) {
    const connectivity = checkDeviceConnectivity(source.id, target.id, devices, allConnections, safeDeviceStates);
    if (connectivity.success) {
      passedChecks.push({ tr: `Fiziksel bağlantı / L1-L2 yolu bulundu: ${connectivity.hops.join(' -> ')}`, en: `Physical/L1-L2 path resolved: ${connectivity.hops.join(' -> ')}` });
    } else if (issues.length === 0) {
      issues.push({
        id: 'physical-path-missing',
        category: 'physical',
        severity: 'error',
        title: { tr: 'Fiziksel Bağlantı Yolu Bulunamadı', en: 'No Physical Connection Path' },
        description: { tr: `${source.name} ile ${target.name} arasında fiziksel bir bağlantı yolu bulunamadı.`, en: `No physical connection path found between ${source.name} and ${target.name}.` },
        suggestedFix: { tr: 'Cihazlar arasındaki kablo bağlantılarını ve port durumlarını kontrol edin.', en: 'Check cable connections and port statuses between devices.' }
      });
    }
  } else if (targetIp) {
    const connectivity = checkConnectivity(source.id, targetIp, devices, allConnections, safeDeviceStates);
    if (connectivity.success) {
      passedChecks.push({ tr: `Uçtan uca yol bulundu: ${connectivity.hops.join(' -> ')}`, en: `End-to-end path resolved: ${connectivity.hops.join(' -> ')}` });
    } else if (issues.length === 0) {
      issues.push({
        id: 'routing-path-missing',
        category: 'routing',
        severity: 'error',
        title: { tr: 'Yönlendirme / Anahtarlama Yolu Bulunamadı', en: 'No Routing/Switching Path' },
        description: { tr: connectivity.error || 'Cihazlar arasında veri iletim yolu tamamlanamıyor.', en: connectivity.error || 'Path cannot be resolved.' },
        suggestedFix: { tr: 'Switch Trunk portlarını ve Router yönlendirme tablolarını (ip route) inceleyin.', en: 'Check switch trunking and routing tables.' }
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


