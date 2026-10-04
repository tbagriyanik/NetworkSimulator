import { colors, withAlpha } from '@/lib/design-tokens/colors';
import type { CanvasDevice } from '@/components/network/NetworkTopology/types/networkTopology.types';

export function generatePrinterWebPanelContent(device: CanvasDevice, language: string, isDark: boolean = true): string {
  const isTr = language === 'tr';
  const name = device.name || 'Network Printer Server';
  const ip = device.ip || '192.168.1.50';
  const mac = device.macAddress || '0050.56C0.0001';
  const subnet = device.subnet || '255.255.255.0';
  const gateway = device.gateway || '192.168.1.1';
  const dns = device.dns || '8.8.8.8';
  const mode = device.ipConfigMode === 'dhcp' ? 'DHCP' : 'Static';
  const wifiSsid = device.wifi?.ssid || '';

  // Design token colors
  const themeColors = {
    bg: isDark ? colors.topology.bg : colors.common.white,
    canvasBg: isDark ? colors.topology.canvasBg : colors.slate['50'],
    gridLine: isDark ? colors.topology.gridLine : colors.slate['200'],
    deviceText: isDark ? colors.slate['100'] : colors.topology.canvasBg,
    subText: isDark ? colors.topology.subText : colors.slate['500'],
    noteText: isDark ? colors.topology.noteText : colors.slate['600'],
    deviceBorder: isDark ? colors.slate['600'] : colors.slate['300'],
    deviceSelectedBorder: isDark ? colors.sky['500'] : colors.blue['600'],
    pinkBg: isDark ? withAlpha(colors.pink['500'], 0.15) : withAlpha(colors.pink['500'], 0.1),
    pinkBorder: isDark ? withAlpha(colors.pink['500'], 0.3) : withAlpha(colors.pink['500'], 0.4),
    serialColor: isDark ? colors.pink['400'] : colors.pink['600'],
    consoleColor: isDark ? colors.purple['500'] : colors.purple['600'],
    onlineBg: isDark ? withAlpha(colors.status.active, 0.2) : withAlpha(colors.status.active, 0.15),
    onlineColor: isDark ? colors.status.active : colors.green['600'],
    offlineBg: isDark ? withAlpha(colors.status.offline, 0.2) : withAlpha(colors.status.offline, 0.15),
    offlineColor: isDark ? colors.status.offline : colors.red['600'],
    terminalOutput: isDark ? colors.topology.subText : colors.slate['600'],
    purple500: isDark ? colors.purple['500'] : colors.purple['600'],
    purple400: isDark ? colors.purple['400'] : colors.purple['500'],
    warningColor: isDark ? colors.amber['500'] : colors.amber['600'],
    cyanBg: isDark ? withAlpha(colors.cyan['500'], 0.8) : withAlpha(colors.cyan['500'], 0.15),
    cyanBorder: isDark ? withAlpha(colors.cyan['500'], 0.8) : withAlpha(colors.cyan['500'], 0.4),
    cyanColor: isDark ? colors.cyan['400'] : colors.cyan['600'],
    roseBg: isDark ? withAlpha(colors.rose['500'], 0.8) : withAlpha(colors.rose['500'], 0.15),
    roseBorder: isDark ? withAlpha(colors.rose['500'], 0.8) : withAlpha(colors.rose['500'], 0.4),
    roseColor: isDark ? colors.rose['400'] : colors.rose['600'],
    amberBg: isDark ? withAlpha(colors.amber['500'], 0.4) : withAlpha(colors.amber['500'], 0.2),
    amberBorder: isDark ? withAlpha(colors.amber['500'], 0.8) : withAlpha(colors.amber['500'], 0.4),
    amber200: colors.amber['200'],
    amber400: isDark ? colors.amber['400'] : colors.amber['500'],
    amber700: colors.amber['700'],
    rose500: isDark ? withAlpha(colors.rose['500'], 0.2) : withAlpha(colors.rose['500'], 0.15),
    rose500Border: isDark ? withAlpha(colors.rose['500'], 0.4) : withAlpha(colors.rose['500'], 0.3),
  };

  const printerSvgIcon = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z"/></svg>`;
  const suppliesSvgIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:6px;"><path d="m7.5 4.27 9 5.15M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/></svg>`;
  const settingsSvgIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:6px;"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`;
  const queueSvgIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:6px;"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>`;
  const trashSvgIcon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;
  const docSvgIcon = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>`;
  const wifiSvgIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"/></svg>`;
  const pcSvgIcon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z"/></svg>`;

  const onlineBorderOpacity = isDark ? '0.4' : '0.3';
  const offlineBorderOpacity = isDark ? '0.4' : '0.3';

  return `
    <div style="font-family:'Inria Sans',sans-serif;background:${themeColors.bg};color:${themeColors.deviceText};padding:24px;min-height:100%;box-sizing:border-box;">
      <div style="max-width:800px;margin:0 auto;background:${themeColors.canvasBg};border:1px solid ${themeColors.gridLine};border-radius:16px;padding:24px;box-shadow:0 20px 25px -5px ${withAlpha(colors.common.black, 0.5)};">
        
        <!-- Header -->
        <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid ${themeColors.gridLine};padding-bottom:16px;margin-bottom:20px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:48px;height:48px;border-radius:12px;background:${themeColors.pinkBg};border:1px solid ${themeColors.pinkBorder};display:flex;align-items:center;justify-content:center;color:${themeColors.serialColor};">
              ${printerSvgIcon}
            </div>
            <div>
              <h1 style="margin:0;font-size:18px;font-weight:700;color:${themeColors.deviceText};">${name}</h1>
              <div style="font-size:12px;color:${themeColors.subText};margin-top:2px;">Embedded Print Server Web Management</div>
            </div>
          </div>
          <div style="text-align:right;display:flex;align-items:center;gap:10px;">
            <span style="display:inline-block;padding:4px 12px;border-radius:9999px;background:${device.status === 'offline' ? themeColors.offlineBg : themeColors.onlineBg};color:${device.status === 'offline' ? themeColors.offlineColor : themeColors.onlineColor};font-size:12px;font-weight:600;">
              ● ${device.status === 'offline' ? (isTr ? 'Çevrimdışı / Kapalı' : 'Offline / Disabled') : (isTr ? 'Çevrimiçi / Hazır' : 'Online / Ready')}
            </span>
            <button type="button"
              onclick="if(window.parent) window.parent.postMessage({type:'TOGGLE_PRINTER_WIFI',deviceId:'${device.id}'},'*')"
              style="background:${device.wifi?.enabled !== false ? themeColors.offlineBg : themeColors.onlineBg};border:1px solid ${device.wifi?.enabled !== false ? themeColors.offlineBg.replace('0.2', offlineBorderOpacity) : themeColors.onlineBg.replace('0.2', onlineBorderOpacity)};color:${device.wifi?.enabled !== false ? themeColors.offlineColor : themeColors.onlineColor};padding:6px 12px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;gap:6px;"
              onmouseover="this.style.opacity='0.8'"
              onmouseout="this.style.opacity='1'"
            >
              ${isTr ? (device.wifi?.enabled !== false ? 'Bağlantıyı Kapat' : 'Bağlantıyı Aç') : (device.wifi?.enabled !== false ? 'Disconnect Network' : 'Connect Network')}
            </button>
          </div>
        </div>

        <!-- Network Info Grid -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:24px;">
          <div style="background:${themeColors.bg};border:1px solid ${themeColors.gridLine};border-radius:10px;padding:12px;">
            <div style="font-size:11px;color:${themeColors.consoleColor};text-transform:uppercase;font-weight:600;">IP Address (${mode})</div>
            <div style="font-family:'Geist Mono','Courier New',monospace;font-size:14px;color:${themeColors.deviceSelectedBorder};margin-top:4px;font-weight:600;">${ip}</div>
          </div>
          <div style="background:${themeColors.bg};border:1px solid ${themeColors.gridLine};border-radius:10px;padding:12px;">
            <div style="font-size:11px;color:${themeColors.consoleColor};text-transform:uppercase;font-weight:600;">Subnet / Gateway</div>
            <div style="font-family:'Geist Mono','Courier New',monospace;font-size:12px;color:${themeColors.terminalOutput};margin-top:4px;">${subnet} / ${gateway}</div>
          </div>
          <div style="background:${themeColors.bg};border:1px solid ${themeColors.gridLine};border-radius:10px;padding:12px;display:flex;flex-direction:column;justify-content:space-between;">
            <div>
              <div style="font-size:11px;color:${themeColors.consoleColor};text-transform:uppercase;font-weight:600;">Wi-Fi Network (SSID)</div>
              <div style="font-family:'Geist Mono','Courier New',monospace;font-size:14px;color:${device.wifi?.enabled !== false ? themeColors.purple500 : themeColors.subText};margin-top:4px;font-weight:600;display:flex;align-items:center;">
                ${wifiSvgIcon} ${wifiSsid || (isTr ? '(Devre Dışı)' : '(Disabled)')}
              </div>
            </div>
            <button type="button"
              onclick="if(window.parent) window.parent.postMessage({type:'TOGGLE_PRINTER_WIFI',deviceId:'${device.id}'},'*')"
              style="margin-top:8px;background:${device.wifi?.enabled !== false ? themeColors.offlineBg : themeColors.onlineBg};border:1px solid ${device.wifi?.enabled !== false ? themeColors.offlineBg.replace('0.2', offlineBorderOpacity) : themeColors.onlineBg.replace('0.2', onlineBorderOpacity)};color:${device.wifi?.enabled !== false ? themeColors.offlineColor : themeColors.onlineColor};padding:5px 10px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;transition:all 0.2s;width:100%;text-align:center;"
              onmouseover="this.style.opacity='0.8'"
              onmouseout="this.style.opacity='1'"
            >
              ${isTr ? (device.wifi?.enabled !== false ? 'Wi-Fi (SSID) Kapat' : 'Wi-Fi (SSID) Aç') : (device.wifi?.enabled !== false ? 'Disable Wi-Fi SSID' : 'Enable Wi-Fi SSID')}
            </button>
          </div>
          <div style="background:${themeColors.bg};border:1px solid ${themeColors.gridLine};border-radius:10px;padding:12px;">
            <div style="font-size:11px;color:${themeColors.consoleColor};text-transform:uppercase;font-weight:600;">MAC / DNS</div>
            <div style="font-family:'Geist Mono','Courier New',monospace;font-size:12px;color:${themeColors.terminalOutput};margin-top:4px;">${mac} • ${dns}</div>
          </div>
        </div>

        <!-- Supplies Status -->
        <div style="background:${themeColors.bg};border:1px solid ${themeColors.gridLine};border-radius:12px;padding:16px;margin-bottom:24px;">
          <h2 style="margin:0 0 12px 0;font-size:14px;font-weight:600;color:${themeColors.noteText};display:flex;align-items:center;">
            ${suppliesSvgIcon} ${isTr ? 'Toner & Sarf Malzeme Durumu' : 'Toner & Cartridge Status'}
          </h2>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;text-align:center;font-family:'Geist Mono','Courier New',monospace;font-size:11px;">
            <div style="background:${themeColors.canvasBg};border:1px solid ${themeColors.deviceBorder};border-radius:8px;padding:10px;color:${themeColors.deviceText};">
              <div style="font-weight:700;">BLACK</div>
              <div style="color:${themeColors.onlineColor};margin-top:4px;font-weight:700;">98%</div>
            </div>
            <div style="background:${themeColors.cyanBg};border:1px solid ${themeColors.cyanBorder};border-radius:8px;padding:10px;color:${themeColors.cyanColor};">
              <div style="font-weight:700;">CYAN</div>
              <div style="color:${themeColors.cyanColor};margin-top:4px;font-weight:700;">92%</div>
            </div>
            <div style="background:${themeColors.roseBg};border:1px solid ${themeColors.roseBorder};border-radius:8px;padding:10px;color:${themeColors.roseColor};">
              <div style="font-weight:700;">MAGENTA</div>
              <div style="color:${themeColors.roseColor};margin-top:4px;font-weight:700;">95%</div>
            </div>
            <div style="background:${themeColors.amberBg};border:1px solid ${themeColors.amberBorder};border-radius:8px;padding:10px;color:${themeColors.amber200};">
              <div style="font-weight:700;">YELLOW</div>
              <div style="color:${themeColors.amber400};margin-top:4px;font-weight:700;">90%</div>
            </div>
          </div>
        </div>

        <!-- Print Server Settings & Configuration -->
        <div style="background:${themeColors.bg};border:1px solid ${themeColors.gridLine};border-radius:12px;padding:16px;margin-bottom:24px;">
          <h2 style="margin:0 0 12px 0;font-size:14px;font-weight:600;color:${themeColors.noteText};display:flex;align-items:center;">
            ${settingsSvgIcon} ${isTr ? 'Yazıcı Sunucusu Yapılandırması & Ayarlar' : 'Print Server Configuration & Settings'}
          </h2>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;font-size:12px;">
            <div style="background:${themeColors.canvasBg};border:1px solid ${themeColors.gridLine};border-radius:8px;padding:12px;">
              <div style="font-weight:600;color:${themeColors.subText};margin-bottom:4px;">${isTr ? 'Ağ Protokolleri' : 'Network Protocols'}</div>
              <div style="display:flex;flex-direction:column;gap:4px;color:${themeColors.terminalOutput};font-size:11px;">
                <span>• LPD / LPR Spooler: <strong style="color:${themeColors.onlineColor};">Enabled (Port 515)</strong></span>
                <span>• Raw IP Printing (JetDirect): <strong style="color:${themeColors.onlineColor};">Enabled (Port 9100)</strong></span>
                <span>• IPP / IPPS Protocol: <strong style="color:${themeColors.onlineColor};">Enabled (Port 631)</strong></span>
                <span>• AirPrint / Bonjour Broadcast: <strong style="color:${themeColors.onlineColor};">Active</strong></span>
              </div>
            </div>
            <div style="background:${themeColors.canvasBg};border:1px solid ${themeColors.gridLine};border-radius:8px;padding:12px;">
              <div style="font-weight:600;color:${themeColors.subText};margin-bottom:4px;">${isTr ? 'Güvenlik & Yönetim' : 'Security & Management'}</div>
              <div style="display:flex;flex-direction:column;gap:4px;color:${themeColors.terminalOutput};font-size:11px;">
                <span>• SNMP v1/v2c Monitoring: <strong style="color:${themeColors.deviceSelectedBorder};">Public Community</strong></span>
                <span>• HTTPS Web Admin: <strong style="color:${themeColors.onlineColor};">TLS v1.3 Encrypted</strong></span>
                <span>• Wi-Fi Interface: <strong style="color:${themeColors.purple500};">${wifiSsid} (WPA2-PSK)</strong></span>
                <span>• Access Control: <strong style="color:${themeColors.warningColor};">Allow All Subnets</strong></span>
              </div>
            </div>
          </div>
        </div>

        <!-- Print Queue -->
        <div style="background:${themeColors.bg};border:1px solid ${themeColors.gridLine};border-radius:12px;padding:16px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
            <h2 style="margin:0;font-size:14px;font-weight:600;color:${themeColors.noteText};display:flex;align-items:center;">
              ${queueSvgIcon} ${isTr ? 'Yazdırma Kuyruğu & Gelen Belgeler' : 'Print Queue & Received Documents'}
            </h2>
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:11px;color:${themeColors.purple500};font-family:'Geist Mono','Courier New',monospace;font-weight:600;">${(device.printJobs || []).length} ${isTr ? 'Aktif Görev / Belge' : 'Active Jobs'}</span>
              ${(device.printJobs || []).length > 0 ? `
                <button
                  type="button"
                  onclick="if(window.parent) window.parent.postMessage({type:'CLEAR_PRINTER_QUEUE',deviceId:'${device.id}'},'*')"
                  style="background:${themeColors.rose500};border:1px solid ${themeColors.rose500Border};color:${themeColors.roseColor};padding:4px 10px;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:4px;transition:all 0.2s;"
                  onmouseover="this.style.background='${themeColors.rose500.replace('0.15', '0.25')}'"
                  onmouseout="this.style.background='${themeColors.rose500}'"
                >
                  ${trashSvgIcon} ${isTr ? 'Kuyruğu Temizle' : 'Clear Queue'}
                </button>
              ` : ''}
            </div>
          </div>
          ${(!device.printJobs || device.printJobs.length === 0) ? `
            <div style="font-size:12px;color:${themeColors.consoleColor};font-style:italic;">
              ${isTr ? 'Kuyrukta bekleyen yazdırma görevi yok. Sistem yazdırmaya hazır.' : 'No active jobs in print spooler. Ready to process network print jobs.'}
            </div>
          ` : `
            <div style="display:flex;flex-direction:column;gap:8px;margin-top:12px;">
              ${device.printJobs.map(j => `
                <div style="background:${themeColors.canvasBg};border:1px solid ${themeColors.gridLine};border-radius:8px;padding:10px;display:flex;justify-content:space-between;align-items:center;font-size:12px;">
                  <div>
                    <div style="font-weight:700;color:${themeColors.purple400};display:flex;align-items:center;">${docSvgIcon} ${j.documentTitle}</div>
                    <div style="font-size:10px;color:${themeColors.subText};font-family:'Geist Mono','Courier New',monospace;margin-top:2px;display:flex;align-items:center;">Sender: <span style="display:inline-flex;align-items:center;margin-left:4px;">${pcSvgIcon}${j.senderName}</span> • ${j.pages} page(s)</div>
                  </div>
                  <div style="text-align:right;">
                    <span style="display:inline-block;padding:2px 8px;border-radius:4px;background:${themeColors.onlineBg};color:${themeColors.onlineColor};font-size:10px;font-weight:600;font-family:'Geist Mono','Courier New',monospace;">
                      COMPLETED
                    </span>
                    <div style="font-size:10px;color:${themeColors.consoleColor};font-family:'Geist Mono','Courier New',monospace;margin-top:2px;">${j.timestamp}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>

      </div>
    </div>
  `;
}