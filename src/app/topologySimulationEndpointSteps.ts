import type { CanvasDevice } from '@/components/network/NetworkTopology/types/networkTopology.types';
import { useMultiWindowStore } from '@/hooks/useMultiWindowStore';
import type { SimulationContext } from './topologySimulationTypes';

export function buildEndpointSteps(ctx: SimulationContext) {
  const {
    devices,
    addStep,
    moveCursor,
    updateProgress,
    getElementCoords,
    setDevices,
    isTr,
  } = ctx;

  const wlcDevices = devices.filter((d) => d.type === 'wlc');
  const pcDevices = devices.filter((d) => d.type === 'pc');
  const wifiDevices = devices.filter((d) => d.type === 'mobile' || (d.type !== 'pc' && !!d.wifi));
  const printerDevices = devices.filter((d) => d.type === 'printer');
  const iotDevices = devices.filter((d) => d.type === 'iot');

  // PHASE 5: WLC / ACCESS POINT CONFIGURATION
  wlcDevices.forEach((wlcDev) => {
    const wlcIp = wlcDev.ip || '192.168.1.250';
    const wlanSsid = wlcDev.wifi?.ssid || 'Enterprise-Corp';

    addStep(() => {
      const step = ctx.incrementStep();
      updateProgress(step, isTr ? `${wlcDev.name} WLC Yönetim Paneli Açılıyor` : `Opening ${wlcDev.name} WLC Management Panel`);
      const devCoords = getElementCoords(`[data-device-id="${wlcDev.id}"]`, wlcDev.x + 80, wlcDev.y + 120);
      moveCursor(devCoords.x, devCoords.y, isTr ? `${wlcDev.name} Yönetim Aç` : `Open ${wlcDev.name} Management`, true);
      useMultiWindowStore.getState().openDeviceWindow(wlcDev.id, wlcDev.type, 'wireless');
    }, 900);

    addStep(() => {
      const step = ctx.incrementStep();
      updateProgress(step, isTr ? `${wlcDev.name} WLAN '${wlanSsid}' ve Yönetim IP'si (${wlcIp}) Yapılandırılıyor` : `${wlcDev.name} Configuring WLAN '${wlanSsid}' & IP (${wlcIp})`);
      const winCoords = getElementCoords(`[data-modal-id="${wlcDev.id}"]`, window.innerWidth / 2, window.innerHeight / 2 - 10);
      moveCursor(winCoords.x, winCoords.y, `WLAN: ${wlanSsid} (WPA2-Enterprise)`, false);

      const updated = ctx.simulatedDevices.map((d) =>
        d.id === wlcDev.id
          ? {
            ...d,
            name: wlcDev.name,
            ip: wlcIp,
            wifi: d.wifi ? { ...d.wifi, enabled: true, ssid: wlanSsid } : { enabled: true, ssid: wlanSsid, mode: 'ap' as const },
          }
          : d
      );
      ctx.simulatedDevices = updated;
      setDevices(updated);

      window.dispatchEvent(
        new CustomEvent('commit-action-event', {
          detail: {
            action: isTr
              ? `${wlcDev.name} WLC: WLAN '${wlanSsid}' & CAPWAP Aktif (IP: ${wlcIp})`
              : `${wlcDev.name} WLC: WLAN '${wlanSsid}' & CAPWAP Active (IP: ${wlcIp})`,
          },
        })
      );
    }, 1200);

    addStep(() => {
      const closeBtn = getElementCoords(`[data-window-close="${wlcDev.id}"], [data-modal-id="${wlcDev.id}"] [data-window-close]`, window.innerWidth / 2 + 200, window.innerHeight / 2 - 200);
      moveCursor(closeBtn.x, closeBtn.y, isTr ? `${wlcDev.name} Kapat ✕` : `Close ${wlcDev.name} ✕`, true);
      useMultiWindowStore.getState().closeDeviceWindow(wlcDev.id);
    }, 500);
  });

  // PHASE 6: PC & ENDPOINT CONFIGURATION
  pcDevices.forEach((pc) => {
    const targetName = pc.name;
    const targetIp = pc.ip || '192.168.1.10';
    const targetSubnet = pc.subnet || '255.255.255.0';
    const targetGateway = pc.gateway || '';
    const targetDns = pc.dns || '';

    addStep(() => {
      const step = ctx.incrementStep();
      updateProgress(step, isTr ? `${targetName} Ayar Paneli Açılıyor` : `Opening ${targetName} Settings`);
      const devCoords = getElementCoords(`[data-device-id="${pc.id}"]`, pc.x + 80, pc.y + 120);
      moveCursor(devCoords.x, devCoords.y, isTr ? `${targetName} Ayarları Aç` : `Open ${targetName} Settings`, true);
      useMultiWindowStore.getState().openDeviceWindow(pc.id, 'pc', 'settings');
    }, 900);

    addStep(() => {
      const step = ctx.incrementStep();
      updateProgress(step, `${targetName} IP: ${targetIp}`);
      const ipCoords = getElementCoords(`[data-modal-id="${pc.id}"] input[placeholder*="192."], [data-modal-id="${pc.id}"] input[name="ip"], [data-modal-id="${pc.id}"] input`, window.innerWidth / 2 - 100, window.innerHeight / 2 - 40);
      moveCursor(ipCoords.x, ipCoords.y, `${targetName} IP: ${targetIp}`, false, targetIp);

      const updated = ctx.simulatedDevices.map((d) => (d.id === pc.id ? { ...d, name: targetName, ip: targetIp } : d));
      ctx.simulatedDevices = updated;
      setDevices(updated);

      const ipEl = (document.querySelector(`[data-modal-id="${pc.id}"] input[placeholder*="192."]`) ||
        document.querySelector(`[data-modal-id="${pc.id}"] input[name="ip"]`) ||
        document.querySelector('input[placeholder*="192.168.1.100"]')) as HTMLInputElement | null;
      if (ipEl) {
        ipEl.focus();
        ipEl.value = targetIp;
        ipEl.dispatchEvent(new Event('input', { bubbles: true }));
        ipEl.dispatchEvent(new Event('change', { bubbles: true }));
      }

      window.dispatchEvent(
        new CustomEvent('commit-action-event', {
          detail: { action: isTr ? `${targetName} IP: ${targetIp} ayarlandı` : `Set ${targetName} IP: ${targetIp}` },
        })
      );
    }, 1100);

    addStep(() => {
      const step = ctx.incrementStep();
      updateProgress(step, `${targetName} Alt Ağ Maskesi: ${targetSubnet}`);
      const subnetCoords = getElementCoords(`[data-modal-id="${pc.id}"] input[placeholder*="255."], [data-modal-id="${pc.id}"] input[name="subnet"]`, window.innerWidth / 2 + 100, window.innerHeight / 2 - 40);
      moveCursor(subnetCoords.x, subnetCoords.y, `${targetName} Mask: ${targetSubnet}`, false, targetSubnet);

      const updated = ctx.simulatedDevices.map((d) => (d.id === pc.id ? { ...d, name: targetName, ip: targetIp, subnet: targetSubnet } : d));
      ctx.simulatedDevices = updated;
      setDevices(updated);

      const subnetEl = (document.querySelector(`[data-modal-id="${pc.id}"] input[placeholder*="255."]`) ||
        document.querySelector(`[data-modal-id="${pc.id}"] input[name="subnet"]`) ||
        document.querySelector('input[placeholder*="255.255.255.0"]')) as HTMLInputElement | null;
      if (subnetEl) {
        subnetEl.focus();
        subnetEl.value = targetSubnet;
        subnetEl.dispatchEvent(new Event('input', { bubbles: true }));
        subnetEl.dispatchEvent(new Event('change', { bubbles: true }));
      }

      window.dispatchEvent(
        new CustomEvent('commit-action-event', {
          detail: { action: isTr ? `${targetName} Maske: ${targetSubnet} ayarlandı` : `Set ${targetName} Mask: ${targetSubnet}` },
        })
      );
    }, 1100);

    if (targetGateway) {
      addStep(() => {
        const step = ctx.incrementStep();
        updateProgress(step, `${targetName} Varsayılan Ağ Geçidi: ${targetGateway}`);
        const gwCoords = getElementCoords(`[data-modal-id="${pc.id}"] input[placeholder*="Gateway"], [data-modal-id="${pc.id}"] input[name="gateway"]`, window.innerWidth / 2 - 100, window.innerHeight / 2 + 20);
        moveCursor(gwCoords.x, gwCoords.y, `Gateway: ${targetGateway}`, false, targetGateway);

        const updated = ctx.simulatedDevices.map((d) => (d.id === pc.id ? { ...d, gateway: targetGateway } : d));
        ctx.simulatedDevices = updated;
        setDevices(updated);

        window.dispatchEvent(
          new CustomEvent('commit-action-event', {
            detail: { action: isTr ? `${targetName} Ağ Geçidi: ${targetGateway} ayarlandı` : `Set ${targetName} Gateway: ${targetGateway}` },
          })
        );
      }, 1000);
    }

    if (targetDns) {
      addStep(() => {
        const step = ctx.incrementStep();
        updateProgress(step, `${targetName} DNS Sunucusu: ${targetDns}`);
        const dnsCoords = getElementCoords(`[data-modal-id="${pc.id}"] input[placeholder*="DNS"], [data-modal-id="${pc.id}"] input[name="dns"]`, window.innerWidth / 2 + 100, window.innerHeight / 2 + 20);
        moveCursor(dnsCoords.x, dnsCoords.y, `DNS: ${targetDns}`, false, targetDns);

        const updated = ctx.simulatedDevices.map((d) => (d.id === pc.id ? { ...d, dns: targetDns } : d));
        ctx.simulatedDevices = updated;
        setDevices(updated);

        window.dispatchEvent(
          new CustomEvent('commit-action-event', {
            detail: { action: isTr ? `${targetName} DNS: ${targetDns} ayarlandı` : `Set ${targetName} DNS: ${targetDns}` },
          })
        );
      }, 1000);
    }

    if (pc.wifi) {
      const ssid = pc.wifi.ssid || 'NetSim-WiFi';
      const pass = pc.wifi.password || 'password123';
      addStep(() => {
        const step = ctx.incrementStep();
        updateProgress(step, `${targetName} Wi-Fi Bağlantısı: '${ssid}'`);
        const wifiCoords = getElementCoords(`[data-modal-id="${pc.id}"]`, window.innerWidth / 2, window.innerHeight / 2 + 60);
        moveCursor(wifiCoords.x, wifiCoords.y, `Wi-Fi: ${ssid}`, false);

        const updated = ctx.simulatedDevices.map((d) =>
          d.id === pc.id ? { ...d, wifi: { ...pc.wifi, enabled: true, ssid, password: pass, mode: pc.wifi?.mode || 'client' } } : d
        );
        ctx.simulatedDevices = updated;
        setDevices(updated);

        window.dispatchEvent(
          new CustomEvent('commit-action-event', {
            detail: { action: isTr ? `${targetName} Wi-Fi Bağlandı: '${ssid}'` : `${targetName} Connected Wi-Fi: '${ssid}'` },
          })
        );
      }, 1000);
    }

    addStep(() => {
      const closeBtn = getElementCoords(`[data-window-close="${pc.id}"], [data-modal-id="${pc.id}"] [data-window-close]`, window.innerWidth / 2 + 220, window.innerHeight / 2 - 180);
      moveCursor(closeBtn.x, closeBtn.y, isTr ? `${targetName} Kapat ✕` : `Close ${targetName} ✕`, true);
      useMultiWindowStore.getState().closeDeviceWindow(pc.id);
    }, 500);
  });

  // PHASE 7: MOBILE / WIRELESS CLIENTS
  wifiDevices.forEach((wifiDev) => {
    const ssid = wifiDev.wifi?.ssid || 'NetSim-WiFi';
    const pass = wifiDev.wifi?.password || 'password123';

    addStep(() => {
      const step = ctx.incrementStep();
      updateProgress(step, isTr ? `${wifiDev.name} Wi-Fi Ayarları Açılıyor` : `Opening ${wifiDev.name} Wi-Fi Settings`);
      const devCoords = getElementCoords(`[data-device-id="${wifiDev.id}"]`, wifiDev.x + 80, wifiDev.y + 120);
      moveCursor(devCoords.x, devCoords.y, isTr ? `${wifiDev.name} Wi-Fi Aç` : `Open ${wifiDev.name} Wi-Fi`, true);
      useMultiWindowStore.getState().openDeviceWindow(wifiDev.id, wifiDev.type, 'wireless');
    }, 900);

    addStep(() => {
      const step = ctx.incrementStep();
      updateProgress(step, isTr ? `${wifiDev.name} Wi-Fi: '${ssid}' Ağına Bağlanıyor` : `${wifiDev.name} Connecting to Wi-Fi '${ssid}'`);
      const ssidCoords = getElementCoords(`[data-modal-id="${wifiDev.id}"] input[placeholder*="SSID"], [data-modal-id="${wifiDev.id}"] input[name="ssid"]`, window.innerWidth / 2, window.innerHeight / 2 - 20);
      moveCursor(ssidCoords.x, ssidCoords.y, `SSID: ${ssid}`, false, ssid);

      const updated = ctx.simulatedDevices.map((d) =>
        d.id === wifiDev.id
          ? {
            ...d,
            name: wifiDev.name,
            wifi: d.wifi ? { ...d.wifi, enabled: true, ssid, password: pass, mode: d.wifi.mode || 'client' } : { enabled: true, ssid, password: pass, mode: 'client' as const },
          }
          : d
      );
      ctx.simulatedDevices = updated;
      setDevices(updated);

      window.dispatchEvent(
        new CustomEvent('commit-action-event', {
          detail: { action: isTr ? `${wifiDev.name} Wi-Fi Bağlandı: SSID '${ssid}'` : `Connected ${wifiDev.name} to Wi-Fi: '${ssid}'` },
        })
      );
    }, 1100);

    addStep(() => {
      const closeBtn = getElementCoords(`[data-window-close="${wifiDev.id}"], [data-modal-id="${wifiDev.id}"] [data-window-close]`, window.innerWidth / 2 + 200, window.innerHeight / 2 - 200);
      moveCursor(closeBtn.x, closeBtn.y, isTr ? `${wifiDev.name} Kapat ✕` : `Close ${wifiDev.name} ✕`, true);
      useMultiWindowStore.getState().closeDeviceWindow(wifiDev.id);
    }, 500);
  });

  // PHASE 8: PRINTER & IOT
  printerDevices.forEach((printerDev) => {
    const printerIp = printerDev.ip || '192.168.1.20';

    addStep(() => {
      const step = ctx.incrementStep();
      updateProgress(step, isTr ? `${printerDev.name} Yazıcı Ayarları Açılıyor` : `Opening ${printerDev.name} Printer Settings`);
      const devCoords = getElementCoords(`[data-device-id="${printerDev.id}"]`, printerDev.x + 80, printerDev.y + 120);
      moveCursor(devCoords.x, devCoords.y, isTr ? `${printerDev.name} Aç` : `Open ${printerDev.name}`, true);
      useMultiWindowStore.getState().openDeviceWindow(printerDev.id, 'printer', 'console');
    }, 900);

    addStep(() => {
      const step = ctx.incrementStep();
      updateProgress(step, isTr ? `${printerDev.name} Ağ Yazıcısı Aktif (IP: ${printerIp})` : `${printerDev.name} Network Printer Ready (IP: ${printerIp})`);
      const winCoords = getElementCoords(`[data-modal-id="${printerDev.id}"]`, window.innerWidth / 2, window.innerHeight / 2 - 10);
      moveCursor(winCoords.x, winCoords.y, `IP: ${printerIp}`, false);

      const updated = ctx.simulatedDevices.map((d) => (d.id === printerDev.id ? { ...d, name: printerDev.name, ip: printerIp } : d));
      ctx.simulatedDevices = updated;
      setDevices(updated);

      window.dispatchEvent(
        new CustomEvent('commit-action-event', {
          detail: { action: isTr ? `${printerDev.name} Ağ Yazıcısı Yapılandırıldı (IP: ${printerIp})` : `Configured ${printerDev.name} (IP: ${printerIp})` },
        })
      );
    }, 1000);

    addStep(() => {
      const closeBtn = getElementCoords(`[data-window-close="${printerDev.id}"], [data-modal-id="${printerDev.id}"] [data-window-close]`, window.innerWidth / 2 + 200, window.innerHeight / 2 - 200);
      moveCursor(closeBtn.x, closeBtn.y, isTr ? `${printerDev.name} Kapat ✕` : `Close ${printerDev.name} ✕`, true);
      useMultiWindowStore.getState().closeDeviceWindow(printerDev.id);
    }, 500);
  });

  iotDevices.forEach((iotDev) => {
    const iotIp = iotDev.ip || '192.168.1.30';
    const kind = iotDev.iot?.kind || 'sensor';
    const sensorType = iotDev.iot?.sensorType || 'temperature';
    const iotLabel = kind === 'sensor' ? `${sensorType.toUpperCase()} Sensörü` : `${kind.toUpperCase()} Aktüatörü`;

    addStep(() => {
      const step = ctx.incrementStep();
      updateProgress(step, isTr ? `${iotDev.name} (${iotLabel}) Ayarları Açılıyor` : `Opening ${iotDev.name} (${iotLabel}) Settings`);
      const devCoords = getElementCoords(`[data-device-id="${iotDev.id}"]`, iotDev.x + 80, iotDev.y + 120);
      moveCursor(devCoords.x, devCoords.y, isTr ? `${iotDev.name} Aç` : `Open ${iotDev.name}`, true);
      useMultiWindowStore.getState().openDeviceWindow(iotDev.id, 'iot', 'console');
    }, 900);

    addStep(() => {
      const step = ctx.incrementStep();
      updateProgress(step, isTr ? `${iotDev.name} (${iotLabel}) Aktif (IP: ${iotIp})` : `${iotDev.name} (${iotLabel}) Active (IP: ${iotIp})`);
      const winCoords = getElementCoords(`[data-modal-id="${iotDev.id}"]`, window.innerWidth / 2, window.innerHeight / 2 - 10);
      moveCursor(winCoords.x, winCoords.y, `IP: ${iotIp}`, false);

      const updated = ctx.simulatedDevices.map((d) => (d.id === iotDev.id ? { ...d, name: iotDev.name, ip: iotIp } : d));
      ctx.simulatedDevices = updated;
      setDevices(updated);

      window.dispatchEvent(
        new CustomEvent('commit-action-event', {
          detail: { action: isTr ? `${iotDev.name} [${iotLabel}] Yapılandırıldı (IP: ${iotIp})` : `Configured ${iotDev.name} [${iotLabel}] (IP: ${iotIp})` },
        })
      );
    }, 1000);

    addStep(() => {
      const closeBtn = getElementCoords(`[data-window-close="${iotDev.id}"], [data-modal-id="${iotDev.id}"] [data-window-close]`, window.innerWidth / 2 + 200, window.innerHeight / 2 - 200);
      moveCursor(closeBtn.x, closeBtn.y, isTr ? `${iotDev.name} Kapat ✕` : `Close ${iotDev.name} ✕`, true);
      useMultiWindowStore.getState().closeDeviceWindow(iotDev.id);
    }, 500);
  });
}

export function buildVerificationSteps(ctx: SimulationContext) {
  const {
    devices,
    deviceStates,
    addStep,
    moveCursor,
    updateProgress,
    getElementCoords,
    isTr,
  } = ctx;

  const pcDevices = devices.filter((d) => d.type === 'pc');
  const routerDevices = devices.filter((d) => d.type === 'router');
  const printerDevices = devices.filter((d) => d.type === 'printer');

  let pingSrcDev: CanvasDevice | undefined;
  let pingTargetIp: string | undefined;

  if (pcDevices.length >= 2) {
    pingSrcDev = pcDevices[0];
    pingTargetIp = pcDevices[1].ip || '192.168.1.11';
  } else if (pcDevices.length >= 1 && routerDevices.length >= 1) {
    pingSrcDev = pcDevices[0];
    const rState = deviceStates.get(routerDevices[0].id);
    const rPort = rState?.ports ? Object.values(rState.ports).find((p) => p.ipAddress) : undefined;
    pingTargetIp = rPort?.ipAddress || pcDevices[0].gateway || '192.168.1.1';
  } else if (pcDevices.length >= 1 && printerDevices.length >= 1) {
    pingSrcDev = pcDevices[0];
    pingTargetIp = printerDevices[0].ip || '192.168.1.20';
  }

  if (pingSrcDev && pingTargetIp) {
    const src = pingSrcDev;
    const targetIp = pingTargetIp;
    const pingCmd = `ping ${targetIp}`;

    addStep(() => {
      const step = ctx.incrementStep();
      updateProgress(
        step,
        isTr
          ? `Tüm Cihazlar Yapılandırıldı! Test Doğrulaması: ${src.name} CMD Terminali Açılıyor`
          : `All Devices Configured! Verification Test: Opening ${src.name} CMD Terminal`
      );
      moveCursor(src.x + 80, src.y + 120, isTr ? `${src.name} CMD Aç (Ping Testi)` : `Open ${src.name} CMD (Ping Test)`, true);
      useMultiWindowStore.getState().openDeviceWindow(src.id, 'pc', 'desktop');
    }, 1000);

    addStep(() => {
      const step = ctx.incrementStep();
      updateProgress(step, isTr ? `Uçtan Uca Ağ Doğrulaması: ${pingCmd}` : `End-to-End Verification: ${pingCmd}`);
      const termCoords = getElementCoords('input[placeholder*="ping"], .custom-scrollbar input, [data-modal-content="true"] input', window.innerWidth / 2, window.innerHeight / 2 + 100);
      moveCursor(termCoords.x, termCoords.y, isTr ? `Komut: ${pingCmd}` : `Command: ${pingCmd}`, false);
      window.dispatchEvent(
        new CustomEvent('pc-auto-type', {
          detail: { deviceId: src.id, command: pingCmd },
        })
      );
    }, Math.max(1000, pingCmd.length * 70 + 300));

    addStep(() => {
      const termCoords = getElementCoords('input[placeholder*="ping"], .custom-scrollbar input, [data-modal-content="true"] input', window.innerWidth / 2, window.innerHeight / 2 + 100);
      moveCursor(termCoords.x + 35, termCoords.y, `Enter ↵ (${pingCmd})`, true, pingCmd);
      window.dispatchEvent(
        new CustomEvent('commit-action-event', {
          detail: { action: `${src.name} CMD: ${pingCmd}` },
        })
      );
    }, 800);

    addStep(() => {
      const step = ctx.incrementStep();
      updateProgress(
        step,
        isTr
          ? `Ağ İletişimi Başarılı! Paketler İletildi (Reply from ${targetIp}) ✓`
          : `Network Communication Verified! Packets Delivered (Reply from ${targetIp}) ✓`
      );
      moveCursor(
        window.innerWidth / 2,
        window.innerHeight / 2 + 30,
        isTr ? `İletişim Başarılı! (Reply from ${targetIp}: bytes=32 time=1ms TTL=128)` : `Communication Succeeded! (Reply from ${targetIp}: bytes=32 time=1ms TTL=128)`,
        false
      );
      window.dispatchEvent(
        new CustomEvent('commit-action-event', {
          detail: { action: isTr ? `${src.name} ➔ ${targetIp} Ping Başarılı (4/4 Paket İletildi)` : `Ping ${src.name} ➔ ${targetIp} Succeeded (4/4 Packets Delivered)` },
        })
      );
    }, 2500);

    addStep(() => {
      const closeBtn = getElementCoords(`[data-window-close="${src.id}"]`, window.innerWidth / 2 + 220, window.innerHeight / 2 - 200);
      moveCursor(closeBtn.x, closeBtn.y, isTr ? `${src.name} CMD Kapat ✕` : `Close ${src.name} CMD ✕`, true);
      useMultiWindowStore.getState().closeDeviceWindow(src.id);
    }, 500);
  }
}
