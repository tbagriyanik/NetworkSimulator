import type { CanvasDevice } from '@/components/network/NetworkTopology/types/networkTopology.types';
import { colors, withAlpha } from '@/lib/design-tokens/colors';

export function generatePrinterWebPanelContent(device: CanvasDevice, language: string): string {
  const isTr = language === 'tr';
  const name = device.name || 'Network Printer Server';
  const ip = device.ip || '192.168.1.50';
  const mac = device.macAddress || '0050.56C0.0001';
  const subnet = device.subnet || '255.255.255.0';
  const gateway = device.gateway || '192.168.1.1';
  const dns = device.dns || '8.8.8.8';
  const mode = device.ipConfigMode === 'dhcp' ? 'DHCP' : 'Static';
  const wifiSsid = device.wifi?.ssid || '';

  return `
    <div style="font-family:'Inria Sans',sans-serif;background:${colors.topology.bg};color:${colors.topology.deviceText};padding:24px;min-height:100%;box-sizing:border-box;">
      <div style="max-w:800px;margin:0 auto;background:${colors.topology.canvasBg};border:1px solid ${colors.topology.gridLine};border-radius:16px;padding:24px;box-shadow:0 20px 25px -5px ${withAlpha(colors.common.black, 0.5)};">
        
        <!-- Header -->
        <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid ${colors.topology.gridLine};padding-bottom:16px;margin-bottom:20px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:48px;height:48px;border-radius:12px;background:${withAlpha(colors.pink[500], 0.15)};border:1px solid ${withAlpha(colors.pink[500], 0.3)};display:flex;align-items:center;justify-content:center;color:${colors.cables.serial};font-size:24px;">
              ğŸ–¨ï¸
            </div>
            <div>
              <h1 style="margin:0;font-size:18px;font-weight:700;color:${colors.topology.deviceText};">${name}</h1>
              <div style="font-size:12px;color:${colors.topology.subText};margin-top:2px;">Embedded Print Server Web Management</div>
            </div>
          </div>
          <div style="text-align:right;display:flex;align-items:center;gap:10px;">
            <span style="display:inline-block;padding:4px 12px;border-radius:9999px;background:${device.status === 'offline' ? withAlpha(colors.status.offline, 0.2) : withAlpha(colors.status.online, 0.2)};color:${device.status === 'offline' ? colors.terminal.error : colors.status.online};font-size:12px;font-weight:600;">
              â— ${device.status === 'offline' ? (isTr ? 'Ã‡evrimdÄ±ÅŸÄ± / KapalÄ±' : 'Offline / Disabled') : (isTr ? 'Ã‡evrimiÃ§i / HazÄ±r' : 'Online / Ready')}
            </span>
            <button type="button"
              onclick="if(window.parent) window.parent.postMessage({type:'TOGGLE_PRINTER_WIFI',deviceId:'${device.id}'},'*')"
              style="background:${device.wifi?.enabled !== false ? withAlpha(colors.status.offline, 0.2) : withAlpha(colors.status.online, 0.2)};border:1px solid ${device.wifi?.enabled !== false ? withAlpha(colors.status.offline, 0.4) : withAlpha(colors.status.online, 0.4)};color:${device.wifi?.enabled !== false ? colors.terminal.error : colors.status.online};padding:6px 12px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;gap:6px;"
              onmouseover="this.style.opacity='0.8'"
              onmouseout="this.style.opacity='1'"
            >
              <span>${device.wifi?.enabled !== false ? 'ğŸ”Œ' : 'âš¡'}</span>
              ${isTr ? (device.wifi?.enabled !== false ? 'BaÄŸlantÄ±yÄ± Kapat' : 'BaÄŸlantÄ±yÄ± AÃ§') : (device.wifi?.enabled !== false ? 'Disconnect Network' : 'Connect Network')}
            </button>
          </div>
        </div>

        <!-- Network Info Grid -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:24px;">
          <div style="background:${colors.topology.bg};border:1px solid ${colors.topology.gridLine};border-radius:10px;padding:12px;">
            <div style="font-size:11px;color:${colors.cables.console};text-transform:uppercase;font-weight:600;">IP Address (${mode})</div>
            <div style="font-family:'Geist Mono','Courier New',monospace;font-size:14px;color:${colors.topology.deviceSelectedBorder};margin-top:4px;font-weight:600;">${ip}</div>
          </div>
          <div style="background:${colors.topology.bg};border:1px solid ${colors.topology.gridLine};border-radius:10px;padding:12px;">
            <div style="font-size:11px;color:${colors.cables.console};text-transform:uppercase;font-weight:600;">Subnet / Gateway</div>
            <div style="font-family:'Geist Mono','Courier New',monospace;font-size:12px;color:${colors.terminal.output};margin-top:4px;">${subnet} / ${gateway}</div>
          </div>
          <div style="background:${colors.topology.bg};border:1px solid ${colors.topology.gridLine};border-radius:10px;padding:12px;display:flex;flex-direction:column;justify-content:space-between;">
            <div>
              <div style="font-size:11px;color:${colors.cables.console};text-transform:uppercase;font-weight:600;">Wiâ€‘Fi Network (SSID)</div>
              <div style="font-family:'Geist Mono','Courier New',monospace;font-size:14px;color:${device.wifi?.enabled !== false ? colors.purple[500] : colors.topology.subText};margin-top:4px;font-weight:600;">
                ğŸ“¶ ${wifiSsid || (isTr ? '(Devre DÄ±ÅŸÄ±)' : '(Disabled)')}
              </div>
            </div>
            <button type="button"
              onclick="if(window.parent) window.parent.postMessage({type:'TOGGLE_PRINTER_WIFI',deviceId:'${device.id}'},'*')"
              style="margin-top:8px;background:${device.wifi?.enabled !== false ? withAlpha(colors.status.offline, 0.2) : withAlpha(colors.status.online, 0.2)};border:1px solid ${device.wifi?.enabled !== false ? withAlpha(colors.status.offline, 0.4) : withAlpha(colors.status.online, 0.4)};color:${device.wifi?.enabled !== false ? colors.terminal.error : colors.status.online};padding:5px 10px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;transition:all 0.2s;width:100%;text-align:center;"
              onmouseover="this.style.opacity='0.8'"
              onmouseout="this.style.opacity='1'"
            >
              ${isTr ? (device.wifi?.enabled !== false ? 'âŒ Wiâ€‘Fi (SSID) Kapat' : 'âœ… Wiâ€‘Fi (SSID) AÃ§') : (device.wifi?.enabled !== false ? 'âŒ Disable Wiâ€‘Fi SSID' : 'âœ… Enable Wiâ€‘Fi SSID')}
            </button>
          </div>
          <div style="background:${colors.topology.bg};border:1px solid ${colors.topology.gridLine};border-radius:10px;padding:12px;">
            <div style="font-size:11px;color:${colors.cables.console};text-transform:uppercase;font-weight:600;">MAC / DNS</div>
            <div style="font-family:'Geist Mono','Courier New',monospace;font-size:12px;color:${colors.terminal.output};margin-top:4px;">${mac} â€¢ ${dns}</div>
          </div>
        </div>

        <!-- Supplies Status -->
        <div style="background:${colors.topology.bg};border:1px solid ${colors.topology.gridLine};border-radius:12px;padding:16px;margin-bottom:24px;">
          <h2 style="margin:0 0 12px 0;font-size:14px;font-weight:600;color:${colors.topology.noteText};display:flex;align-items:center;gap:8px;">
            <span>ğŸ“¦</span> ${isTr ? 'Toner & Sarf Malzeme Durumu' : 'Toner & Cartridge Status'}
          </h2>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;text-align:center;font-family:'Geist Mono','Courier New',monospace;font-size:11px;">
            <div style="background:${colors.topology.canvasBg};border:1px solid ${colors.topology.deviceBorder};border-radius:8px;padding:10px;color:${colors.topology.deviceText};">
              <div style="font-weight:700;">BLACK</div>
              <div style="color:${colors.status.online};margin-top:4px;font-weight:700;">98%</div>
            </div>
            <div style="background:${withAlpha(colors.cyan[950], 0.8)};border:1px solid ${withAlpha(colors.cyan[600], 0.8)};border-radius:8px;padding:10px;color:${colors.cables.wireless};">
              <div style="font-weight:700;">CYAN</div>
              <div style="color:${colors.cables.wireless};margin-top:4px;font-weight:700;">92%</div>
            </div>
            <div style="background:${withAlpha(colors.rose[950], 0.8)};border:1px solid ${withAlpha(colors.rose[700], 0.8)};border-radius:8px;padding:10px;color:${colors.syntax.constant};">
              <div style="font-weight:700;">MAGENTA</div>
              <div style="color:${colors.syntax.constant};margin-top:4px;font-weight:700;">95%</div>
            </div>
            <div style="background:${withAlpha(colors.amber[800], 0.4)};border:1px solid ${withAlpha(colors.amber[700], 0.8)};border-radius:8px;padding:10px;color:${colors.amber[200]};">
              <div style="font-weight:700;">YELLOW</div>
              <div style="color:${colors.amber[400]};margin-top:4px;font-weight:700;">90%</div>
            </div>
          </div>
        </div>

        <!-- Print Server Settings & Configuration -->
        <div style="background:${colors.topology.bg};border:1px solid ${colors.topology.gridLine};border-radius:12px;padding:16px;margin-bottom:24px;">
          <h2 style="margin:0 0 12px 0;font-size:14px;font-weight:600;color:${colors.topology.noteText};display:flex;align-items:center;gap:8px;">
            <span>âš™ï¸</span> ${isTr ? 'YazÄ±cÄ± Sunucusu YapÄ±landÄ±rmasÄ± & Ayarlar' : 'Print Server Configuration & Settings'}
          </h2>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;font-size:12px;">
            <div style="background:${colors.topology.canvasBg};border:1px solid ${colors.topology.gridLine};border-radius:8px;padding:12px;">
              <div style="font-weight:600;color:${colors.topology.subText};margin-bottom:4px;">${isTr ? 'AÄŸ Protokolleri' : 'Network Protocols'}</div>
              <div style="display:flex;flex-direction:column;gap:4px;color:${colors.terminal.output};font-size:11px;">
                <span>â€¢ LPD / LPR Spooler: <strong style="color:${colors.status.online};">Enabled (Port 515)</strong></span>
                <span>â€¢ Raw IP Printing (JetDirect): <strong style="color:${colors.status.online};">Enabled (Port 9100)</strong></span>
                <span>â€¢ IPP / IPPS Protocol: <strong style="color:${colors.status.online};">Enabled (Port 631)</strong></span>
                <span>â€¢ AirPrint / Bonjour Broadcast: <strong style="color:${colors.status.online};">Active</strong></span>
              </div>
            </div>
            <div style="background:${colors.topology.canvasBg};border:1px solid ${colors.topology.gridLine};border-radius:8px;padding:12px;">
              <div style="font-weight:600;color:${colors.topology.subText};margin-bottom:4px;">${isTr ? 'GÃ¼venlik & YÃ¶netim' : 'Security & Management'}</div>
              <div style="display:flex;flex-direction:column;gap:4px;color:${colors.terminal.output};font-size:11px;">
                <span>â€¢ SNMP v1/v2c Monitoring: <strong style="color:${colors.topology.deviceSelectedBorder};">Public Community</strong></span>
                <span>â€¢ HTTPS Web Admin: <strong style="color:${colors.status.online};">TLS v1.3 Encrypted</strong></span>
                <span>â€¢ Wi-Fi Interface: <strong style="color:${colors.purple[500]};">${wifiSsid} (WPA2-PSK)</strong></span>
                <span>â€¢ Access Control: <strong style="color:${colors.status.warning};">Allow All Subnets</strong></span>
              </div>
            </div>
          </div>
        </div>

        <!-- Print Queue -->
        <div style="background:${colors.topology.bg};border:1px solid ${colors.topology.gridLine};border-radius:12px;padding:16px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
            <h2 style="margin:0;font-size:14px;font-weight:600;color:${colors.topology.noteText};display:flex;align-items:center;gap:8px;">
              <span>ğŸ“‘</span> ${isTr ? 'YazdÄ±rma KuyruÄŸu & Gelen Belgeler' : 'Print Queue & Received Documents'}
            </h2>
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:11px;color:${colors.purple[500]};font-family:'Geist Mono','Courier New',monospace;font-weight:600;">${(device.printJobs || []).length} ${isTr ? 'Aktif GÃ¶rev / Belge' : 'Active Jobs'}</span>
              ${(device.printJobs || []).length > 0 ? `
                <button
                  type="button"
                  onclick="if(window.parent) window.parent.postMessage({type:'CLEAR_PRINTER_QUEUE',deviceId:'${device.id}'},'*')"
                  style="background:${withAlpha(colors.rose[500], 0.2)};border:1px solid ${withAlpha(colors.rose[500], 0.4)};color:${colors.syntax.constant};padding:4px 10px;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:4px;transition:all 0.2s;"
                  onmouseover="this.style.background='${withAlpha(colors.rose[500], 0.4)}'"
                  onmouseout="this.style.background='${withAlpha(colors.rose[500], 0.2)}'"
                >
                  ğŸ—‘ï¸ ${isTr ? 'KuyruÄŸu Temizle' : 'Clear Queue'}
                </button>
              ` : ''}
            </div>
          </div>
          ${(!device.printJobs || device.printJobs.length === 0) ? `
            <div style="font-size:12px;color:${colors.cables.console};font-style:italic;">
              ${isTr ? 'Kuyrukta bekleyen yazdÄ±rma gÃ¶revi yok. Sistem yazdÄ±rmaya hazÄ±r.' : 'No active jobs in print spooler. Ready to process network print jobs.'}
            </div>
          ` : `
            <div style="display:flex;flex-direction:column;gap:8px;margin-top:12px;">
              ${device.printJobs.map(j => `
                <div style="background:${colors.topology.canvasBg};border:1px solid ${colors.topology.gridLine};border-radius:8px;padding:10px;display:flex;justify-content:space-between;align-items:center;font-size:12px;">
                  <div>
                    <div style="font-weight:700;color:${colors.purple[400]};">ğŸ“„ ${j.documentTitle}</div>
                    <div style="font-size:10px;color:${colors.topology.subText};font-family:'Geist Mono','Courier New',monospace;margin-top:2px;">Sender: ${j.senderName} â€¢ ${j.pages} page(s)</div>
                  </div>
                  <div style="text-align:right;">
                    <span style="display:inline-block;padding:2px 8px;border-radius:4px;background:${withAlpha(colors.status.online, 0.2)};color:${colors.status.online};font-size:10px;font-weight:600;font-family:'Geist Mono','Courier New',monospace;">
                      COMPLETED
                    </span>
                    <div style="font-size:10px;color:${colors.cables.console};font-family:'Geist Mono','Courier New',monospace;margin-top:2px;">${j.timestamp}</div>
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



