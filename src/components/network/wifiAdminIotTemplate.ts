import { colors } from '@/lib/design-tokens/colors';
import { GEIST_MONO_STACK } from '@/lib/design-tokens/iframeFonts';
import { sanitizeHTML, safeJSONForHTML } from '@/lib/security/sanitizer';
import type { AvailableIoTDevice, ConnectedIoTDevice } from './wifiAdminTypes';

export interface WifiAdminIotTemplateParams {
  activeTab: string;
  isTurkish: boolean;
  connectedDevices: ConnectedIoTDevice[];
  availableDevices: AvailableIoTDevice[];
}

export function renderWifiAdminIotTemplate({ activeTab, isTurkish, connectedDevices, availableDevices }: WifiAdminIotTemplateParams): string {
  const pluralize = (count: number, singular: string, plural: string) => count === 1 ? singular : plural;

  const iotIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:6px;"><path d="M16.247 7.761a6 6 0 0 1 0 8.478"/><path d="M19.075 4.933a10 10 0 0 1 0 14.134"/><path d="M4.925 19.067a10 10 0 0 1 0-14.134"/><path d="M7.753 16.239a6 6 0 0 1 0-8.478"/><circle cx="12" cy="12" r="2"/></svg>`;
  const wiredIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 2v6"/><path d="M6 8h12a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2z"/></svg>`;
  const refreshIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>`;
  const disconnectIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
  const availableIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:6px;"><path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"/></svg>`;
  const saveIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`;

  return `
    <!-- IoT Devices Tab -->
    <div id="iot-tab" class="content" style="display:${activeTab === 'iot' ? 'block' : 'none'};">
      <h2 class="panel-title" style="margin-bottom:20px;display:flex;align-items:center;">
        ${iotIcon} ${isTurkish ? 'Bağlı IoT Cihazları' : 'Connected IoT Devices'}
      </h2>
      <div class="status-card" style="margin-bottom:20px;">
        <div class="status-info">
          <h3>${isTurkish ? 'IoT Ağı' : 'IoT Network'}</h3>
          <p>${connectedDevices.length} ${isTurkish ? "cihaz bu AP'ye bağlı" : pluralize(connectedDevices.length, 'device connected to this AP', 'devices connected to this AP')}</p>
        </div>
        <span class="status-badge">${connectedDevices.filter(device => device.connected).length} ${isTurkish ? 'Aktif' : 'Active'}</span>
      </div>
      ${connectedDevices.length > 0 ? `
      <div class="iot-device-list" style="margin-bottom:25px;">
        <p style="color:var(--color-secondary-500);margin-bottom:15px;font-size:13px;">${isTurkish ? 'Bağlı IoT cihazlarını yönetin:' : 'Manage connected IoT devices:'}</p>
        ${connectedDevices.map(device => {
          const safeName = sanitizeHTML(device.name);
          const safeId = sanitizeHTML(device.id);
          const safeIp = sanitizeHTML(device.ip || '');
          const jsId = safeJSONForHTML(device.id).replace(/"/g, '&quot;');
          return `<div class="iot-device-card connected" data-device-id="${safeId}" style="display:flex;align-items:center;justify-content:space-between;padding:15px;background:${colors.neutral['50']};border-radius:10px;margin-bottom:10px;border:1px solid var(--color-secondary-200);cursor:pointer;">
            <div style="display:flex;align-items:center;gap:12px;"><div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg, ${device.isWired ? 'var(--color-success-500) 0%, var(--color-success-600) 100%' : 'var(--color-warning-400) 0%, var(--color-warning-600) 100%'});display:flex;align-items:center;justify-content:center;color:${colors.common.white};">
              ${device.isWired ? wiredIcon : iotIcon}
            </div>
              <div><div style="font-weight:600;color:var(--color-secondary-900);display:flex;align-items:center;gap:6px;">${safeName}</div><div style="font-size:12px;color:var(--color-secondary-500);">${isTurkish ? 'Sensör' : 'Sensor'}: ${sanitizeHTML(device.sensorType)} ${device.ip ? `<span style="margin-left:8px;padding:2px 6px;background:var(--color-primary-100);border-radius:4px;color:var(--color-primary-700);font-family:${GEIST_MONO_STACK};">${safeIp}</span>` : ''}</div></div>
            </div><div style="display:flex;align-items:center;gap:10px;"><span style="padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600;background:${device.connected ? colors.green['100'] : 'var(--color-warning-100)'};color:${device.connected ? 'var(--color-success-700)' : 'var(--color-warning-700)'};">${device.connected ? (isTurkish ? '● Bağlı' : '● Connected') : (isTurkish ? '○ Bağlı Değil' : '○ Disconnected')}</span>
              <button type="button" style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;padding:0;border:none;border-radius:6px;background:var(--color-primary-500);color:${colors.common.white};cursor:pointer;" onclick="event.stopPropagation();renewIotDevice(${jsId})" title="${isTurkish ? 'IP Yenile' : 'IP Renew'}" aria-label="${isTurkish ? 'IP Yenile' : 'IP Renew'}">${refreshIcon}</button>
              <button type="button" style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;padding:0;border:none;border-radius:6px;background:var(--color-error-500);color:${colors.common.white};cursor:pointer;" onclick="event.stopPropagation();disconnectIotDevice(${jsId})" title="${isTurkish ? 'Bağlantıyı Kes' : 'Disconnect'}" aria-label="${isTurkish ? 'Bağlantıyı Kes' : 'Disconnect'}">${disconnectIcon}</button></div>
          </div>`;
        }).join('')}
      </div>` : ''}
      ${availableDevices.length > 0 ? `
      <h3 class="panel-title" style="margin-top:24px;display:flex;align-items:center;">
        ${availableIcon} ${isTurkish ? 'Bağlanabilir IoT Cihazları' : 'Available IoT Devices'}
      </h3>
      <div class="available-iot-list" style="margin-bottom:20px;">${availableDevices.map(device => {
        const safeName = sanitizeHTML(device.name);
        const safeId = sanitizeHTML(device.id);
        const jsId = safeJSONForHTML(device.id).replace(/"/g, '&quot;');
        return `<div class="iot-device-card available" data-device-id="${safeId}" style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:${colors.topology.deviceText};border-radius:8px;margin-bottom:8px;border:1px solid var(--color-secondary-200);cursor:pointer;" onclick="toggleIotDeviceSelection(${jsId})"><div style="display:flex;align-items:center;gap:10px;"><input type="checkbox" class="iot-checkbox" data-device-id="${safeId}"><span style="font-weight:600;display:inline-flex;align-items:center;gap:6px;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="color:var(--color-warning-500);"><path d="M16.247 7.761a6 6 0 0 1 0 8.478"/><path d="M19.075 4.933a10 10 0 0 1 0 14.134"/><path d="M4.925 19.067a10 10 0 0 1 0-14.134"/><path d="M7.753 16.239a6 6 0 0 1 0-8.478"/><circle cx="12" cy="12" r="2"/></svg>${safeName}</span></div><span class="badge">${sanitizeHTML(device.sensorType)}</span></div>`;
      }).join('')}<div style="margin-top:12px;"><button type="button" class="btn btn-primary" id="save-iot-btn" onclick="saveSelectedIotDevices()">${saveIcon} ${isTurkish ? 'Seçili IoT Cihazlarını Bağla' : 'Connect Selected IoT Devices'}</button></div></div>` : ''}
    </div>
  `;
}
