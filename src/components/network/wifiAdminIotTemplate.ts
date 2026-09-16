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
  return `
    <!-- IoT Devices Tab -->
    <div id="iot-tab" class="content" style="display:${activeTab === 'iot' ? 'block' : 'none'};">
      <h2 class="panel-title" style="margin-bottom:20px;">🛜 ${isTurkish ? 'Bağlı IoT Cihazları' : 'Connected IoT Devices'}</h2>
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
            <div style="display:flex;align-items:center;gap:12px;"><div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg, ${device.isWired ? 'var(--color-success-500) 0%, var(--color-success-600) 100%' : 'var(--color-warning-400) 0%, var(--color-warning-600) 100%'});display:flex;align-items:center;justify-content:center;color:${colors.common.white};font-size:18px;">${device.isWired ? '🔌' : '🛜'}</div>
              <div><div style="font-weight:600;color:var(--color-secondary-900);">${safeName}</div><div style="font-size:12px;color:var(--color-secondary-500);">${isTurkish ? 'Sensör' : 'Sensor'}: ${sanitizeHTML(device.sensorType)} ${device.ip ? `<span style="margin-left:8px;padding:2px 6px;background:var(--color-primary-100);border-radius:4px;color:var(--color-primary-700);font-family:${GEIST_MONO_STACK};">${safeIp}</span>` : ''}</div></div>
            </div><div style="display:flex;align-items:center;gap:10px;"><span style="padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600;background:${device.connected ? colors.green['100'] : 'var(--color-warning-100)'};color:${device.connected ? 'var(--color-success-700)' : 'var(--color-warning-700)'};">${device.connected ? (isTurkish ? '● Bağlı' : '● Connected') : (isTurkish ? '○ Bağlı Değil' : '○ Disconnected')}</span>
              <button type="button" style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;padding:0;border:none;border-radius:6px;background:var(--color-primary-500);color:${colors.common.white};cursor:pointer;" onclick="event.stopPropagation();renewIotDevice(${jsId})" title="${isTurkish ? 'IP Yenile' : 'IP Renew'}" aria-label="${isTurkish ? 'IP Yenile' : 'IP Renew'}">🔄</button>
              <button type="button" style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;padding:0;border:none;border-radius:6px;background:var(--color-error-500);color:${colors.common.white};cursor:pointer;" onclick="event.stopPropagation();disconnectIotDevice(${jsId})" title="${isTurkish ? 'Bağlantıyı Kes' : 'Disconnect'}" aria-label="${isTurkish ? 'Bağlantıyı Kes' : 'Disconnect'}">🔌</button></div>
          </div>`;
        }).join('')}
      </div>` : ''}
      ${availableDevices.length > 0 ? `
      <h3 class="panel-title" style="margin-top:24px;">📡 ${isTurkish ? 'Bağlanabilir IoT Cihazları' : 'Available IoT Devices'}</h3>
      <div class="available-iot-list" style="margin-bottom:20px;">${availableDevices.map(device => {
        const safeName = sanitizeHTML(device.name);
        const safeId = sanitizeHTML(device.id);
        const jsId = safeJSONForHTML(device.id).replace(/"/g, '&quot;');
        return `<div class="iot-device-card available" data-device-id="${safeId}" style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:${colors.topology.deviceText};border-radius:8px;margin-bottom:8px;border:1px solid var(--color-secondary-200);cursor:pointer;" onclick="toggleIotDeviceSelection(${jsId})"><div style="display:flex;align-items:center;gap:10px;"><input type="checkbox" class="iot-checkbox" data-device-id="${safeId}"><span style="font-weight:600;">${safeName}</span></div><span class="badge">${sanitizeHTML(device.sensorType)}</span></div>`;
      }).join('')}<div style="margin-top:12px;"><button type="button" class="btn btn-primary" id="save-iot-btn" onclick="saveSelectedIotDevices()">💾 ${isTurkish ? 'Seçili IoT Cihazlarını Bağla' : 'Connect Selected IoT Devices'}</button></div></div>` : ''}
    </div>
  `;
}
