'use client';

import { CanvasDevice } from './NetworkTopology/types/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import { getRouterWifiConfig } from './wifiAdminConfig';
import type { WifiAdminConfig, ConnectedIoTDevice, AvailableIoTDevice } from './wifiAdminTypes';
import { renderWifiAdminLoginTemplate } from './wifiAdminLoginTemplate';
import { renderWifiAdminIotTemplate } from './wifiAdminIotTemplate';
import { renderWifiAdminAccountTemplate } from './wifiAdminAccountTemplate';
import { renderWifiConfigFieldTemplates } from './wifiAdminConfigTemplate';
import { sanitizeHTML, safeJSONForHTML } from '@/lib/security/sanitizer';
import { getWifiControlPanelStyles } from './wifiAdminStyles';
import { colors } from '@/lib/design-tokens/colors';
import { getWifiControlPanelScripts } from './wifiAdminScripts';
import {
  WIRELESS_CHANNELS_2_4GHZ,
  WIRELESS_CHANNELS_5GHZ,
  normalizeChannel,
} from '@/lib/network/wireless';
import { isRouterAuthenticated } from '@/lib/network/adminSessionManager';

export type { ConnectedIoTDevice, AvailableIoTDevice } from './wifiAdminTypes';

interface RouterWebConfig {
  wifi: WifiAdminConfig;
  deviceName: string;
  deviceIp: string;
  deviceId?: string;
  adminPassword?: string;
  username?: string;
  password?: string;
  connectedIotDevices?: ConnectedIoTDevice[];
  availableIotDevices?: AvailableIoTDevice[];
  language?: string;
  device?: CanvasDevice;
  runtimeState?: SwitchState;
}

/**
 * Generates a WiFi Control Panel HTML for router/switch admin interface
 * Styled like a typical router web admin page (e.g., 192.168.1.1)
 */
function generateWifiControlPanelHTML(config: RouterWebConfig, activeTab: string = 'wireless', isAuthenticated: boolean = false): string {
  const { wifi, deviceName, deviceIp, deviceId, connectedIotDevices = [], availableIotDevices = [], username, password, language = 'en', device, runtimeState } = config;
  const isTurkish = language === 'tr';
  const pluralize = (count: number, singular: string, plural: string) => (count === 1 ? singular : plural);

  // Sanitized versions for HTML display
  const safeDeviceName = sanitizeHTML(deviceName);
  const safeDeviceIp = sanitizeHTML(deviceIp);
  const safeSsid = sanitizeHTML(wifi.ssid || '');
  const safeWifiPassword = sanitizeHTML(wifi.password || '');
  const onlyIotConnectedDevices = (connectedIotDevices || []).filter(d =>
    d.sensorType !== 'Laptop/PC' &&
    !String(d.id).toLowerCase().startsWith('pc-') &&
    !String(d.id).toLowerCase().startsWith('laptop-')
  );
  const dhcpPool = device?.services?.dhcp?.pools?.[0] || runtimeState?.services?.dhcp?.pools?.[0];
  const dhcpServerEnabled = device?.services?.dhcp?.enabled ?? runtimeState?.services?.dhcp?.enabled ?? true;
  const safeStartIp = sanitizeHTML(dhcpPool?.startIp || '192.168.1.100');
  const safeEndIp = sanitizeHTML(dhcpPool?.endIp || '192.168.1.200');
  const safeGateway = sanitizeHTML(dhcpPool?.defaultGateway || deviceIp || '192.168.1.1');
  const safeSubnet = sanitizeHTML(dhcpPool?.subnetMask || device?.subnet || '255.255.255.0');
  const safeDns = sanitizeHTML(dhcpPool?.dnsServer || deviceIp || '192.168.1.1');
  const safeLeaseTime = String(dhcpPool?.maxUsers || 24);
  
  // JSON stringified versions for use in <script> blocks to prevent logic corruption and XSS
  const adminUsername = username?.trim() || 'admin';
  const adminPassword = password || 'admin';
  const jsUsername = safeJSONForHTML(adminUsername);
  const jsPassword = safeJSONForHTML(adminPassword);
  const jsDeviceId = safeJSONForHTML(deviceId || '');
  const jsSsid = safeJSONForHTML(wifi.ssid || '');
  const jsWifiPassword = safeJSONForHTML(wifi.password || '');
  const jsChannel = safeJSONForHTML(wifi.channel || '');
  const jsSecurity = safeJSONForHTML(wifi.security || '');

  const defaultSsidsList = wifi.ssids || [
    { id: 'ssid-1', name: isTurkish ? 'Ana Ağ (Primary)' : 'Primary Network', ssid: wifi.ssid || 'WiFi_Network', security: wifi.security || 'wpa2', password: wifi.password || 'password123', band: 'both', enabled: true },
    { id: 'ssid-2', name: isTurkish ? 'Misafir Ağ (Guest)' : 'Guest Network', ssid: (wifi.ssid || 'WiFi') + '_Guest', security: 'open', band: '2.4GHz', enabled: false }
  ];
  const jsCurrentSsidList = safeJSONForHTML(defaultSsidsList);
  const jsConnectedClientsData = safeJSONForHTML(connectedIotDevices || []);
  const jsMacFilterList = safeJSONForHTML(wifi.macFilterList || []);

  const securityOptions = [
    { value: 'open', label: isTurkish ? 'Açık (Güvenlik Yok)' : 'Open (No Security)' },
    { value: 'wep', label: isTurkish ? 'WEP (Wired Equivalent Privacy)' : 'WEP (Wired Equivalent Privacy)' },
    { value: 'wpa', label: isTurkish ? 'WPA Kişisel' : 'WPA Personal' },
    { value: 'wpa2', label: isTurkish ? 'WPA2 Kişisel (Önerilen)' : 'WPA2 Personal (Recommended)' },
    { value: 'wpa3', label: isTurkish ? 'WPA3 Kişisel' : 'WPA3 Personal' },
  ];

  const modeOptions = [
    { value: 'ap', label: isTurkish ? 'Erişim Noktası (AP)' : 'Access Point (AP)' },
    { value: 'client', label: isTurkish ? 'İstemci Modu' : 'Client Mode' },
  ];

  const currentNormalizedChannel = normalizeChannel(wifi.channel);
  const autoOption = `<option value="auto" ${(!wifi.channel || currentNormalizedChannel === 'auto') ? 'selected' : ''}>${isTurkish ? 'Otomatik (Auto - Önerilen)' : 'Auto (Recommended)'}</option>`;

  const optgroup24 = `
    <optgroup label="${isTurkish ? '2.4 GHz Bandı (Kanal 1 - 11)' : '2.4 GHz Band (Channels 1 - 11)'}">
      <option value="2.4GHz" ${wifi.channel === '2.4GHz' ? 'selected' : ''}>${isTurkish ? '2.4 GHz (Varsayılan)' : '2.4 GHz (Default)'}</option>
      ${WIRELESS_CHANNELS_2_4GHZ.map(opt => `<option value="${opt.value}" ${currentNormalizedChannel === opt.value ? 'selected' : ''}>${isTurkish ? opt.labelTr : opt.labelEn}</option>`).join('')}
    </optgroup>
  `;

  const optgroup5 = `
    <optgroup label="${isTurkish ? '5 GHz Bandı (Kanal 36 - 165)' : '5 GHz Band (Channels 36 - 165)'}">
      <option value="5GHz" ${wifi.channel === '5GHz' ? 'selected' : ''}>${isTurkish ? '5 GHz (Yüksek Hız)' : '5 GHz (High Speed)'}</option>
      ${WIRELESS_CHANNELS_5GHZ.map(opt => `<option value="${opt.value}" ${currentNormalizedChannel === opt.value ? 'selected' : ''}>${isTurkish ? opt.labelTr : opt.labelEn}</option>`).join('')}
    </optgroup>
  `;

  const channelSelect = `${autoOption}${optgroup24}${optgroup5}`;

  const securitySelect = securityOptions
    .map(opt => `<option value="${opt.value}" ${wifi.security === opt.value ? 'selected' : ''}>${opt.label}</option>`)
    .join('');

  const modeSelect = modeOptions
    .map(opt => `<option value="${opt.value}" ${wifi.mode === opt.value ? 'selected' : ''}>${opt.label}</option>`)
    .join('');

  const { passwordField, hiddenCheckbox, maxClientsField } = renderWifiConfigFieldTemplates(wifi, isTurkish, safeWifiPassword);

  const loginFormHTML = renderWifiAdminLoginTemplate({ deviceName: safeDeviceName, isTurkish, username: adminUsername, isAuthenticated });

  const mainContent = `
    <div id="main-content" style="display:${isAuthenticated ? 'block' : 'none'};">
  `;

  return `
<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeDeviceName} - ${isTurkish ? 'Kablosuz Ayarları' : 'Wireless Settings'}</title>
  <style>
    ${getWifiControlPanelStyles()}
  </style>
</head>
<body>
  ${loginFormHTML}
  ${mainContent}
  <div class="container">
    <div class="header" style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">
      <div>
        <h1>🔧 ${safeDeviceName}</h1>
        <div class="subtitle">${isTurkish ? 'Kablosuz Ağ Yönetimi & Çoklu SSID Kapısı' : 'Wireless Network Administration & Multi-SSID Portal'}</div>
        <div class="device-info">
          <span>📍 IP: ${safeDeviceIp}</span>
          <span>📡 WLAN Interface: wlan0</span>
        </div>
      </div>
      <button type="button" class="btn btn-secondary" onclick="handleLogout()" style="padding:8px 16px;font-size:12px;background:${colors.common.white};border:1px solid var(--color-secondary-300);color:var(--color-secondary-700);cursor:pointer;shrink:0;border-radius:6px;" title="${isTurkish ? 'Oturumu Kapat' : 'Logout'}">
        🚪 ${isTurkish ? 'Çıkış Yap' : 'Logout'}
      </button>
    </div>
    
    <div class="nav-tabs">
      <button type="button" class="nav-tab${activeTab === 'wireless' ? ' active' : ''}" data-tab="wireless">📶 ${isTurkish ? 'Kablosuz & Çoklu SSID' : 'Wireless & Multi-SSID'}</button>
      <button type="button" class="nav-tab${activeTab === 'status' ? ' active' : ''}" data-tab="status">📊 ${isTurkish ? 'Durum & Bağlı Cihazlar' : 'Status & Connected Clients'}</button>
      <button type="button" class="nav-tab${activeTab === 'advanced' ? ' active' : ''}" data-tab="advanced">⚙️ ${isTurkish ? 'Gelişmiş' : 'Advanced'}</button>
      <button type="button" class="nav-tab${activeTab === 'iot' ? ' active' : ''}" data-tab="iot">🛠️ ${isTurkish ? 'IoT Cihazları' : 'IoT Devices'}</button>
      <button type="button" class="nav-tab${activeTab === 'admin' ? ' active' : ''}" data-tab="admin">👤 ${isTurkish ? 'Yönetici' : 'Admin'}</button>
    </div>
    
    <!-- Wireless Tab -->
    <div id="wireless-tab" class="content" style="display:${activeTab === 'wireless' ? 'block' : 'none'};">
      <div class="toggle-switch">
        <div>
          <h3>${isTurkish ? 'Kablosuz Radyo (Ana Anahtar)' : 'Wireless Radio (Master Switch)'}</h3>
          <p>${isTurkish ? 'Kablosuz erişim noktasını genel olarak etkinleştirin veya devre dışı bırakın' : 'Enable or disable the wireless access point globally'}</p>
        </div>
        <label class="switch">
          <input type="checkbox" id="wifi-enabled" ${wifi.enabled ? 'checked' : ''}>
          <span class="slider"></span>
        </label>
      </div>
      
      <div class="status-card ${wifi.enabled ? '' : 'disabled'}">
        <div class="status-info">
          <h3>${isTurkish ? 'Mevcut Durum' : 'Current Status'}</h3>
          <p>${wifi.enabled ? (isTurkish ? 'WiFi aktif ve çoklu SSID yayınları açık' : 'WiFi is active and multi-SSID broadcasting is live') : (isTurkish ? 'WiFi şu anda devre dışı' : 'WiFi is currently disabled')}</p>
        </div>
        <span class="status-badge">${wifi.enabled ? (isTurkish ? '● Çevrimiçi' : '● Online') : (isTurkish ? '○ Çevrimdışı' : '○ Offline')}</span>
      </div>
      
      <h2 class="panel-title">${isTurkish ? 'Temel Kablosuz Ayarları' : 'Basic Wireless Settings (Primary SSID)'}</h2>
      
      <form id="wifi-form" action="javascript:void(0);">
        <div class="form-group">
          <label for="wifi-ssid">${isTurkish ? 'Ana Ağ Adı' : 'Primary Network Name (SSID)'}</label>
          <input type="text" id="wifi-ssid" name="ssid" value="${safeSsid}" placeholder="${isTurkish ? 'WiFi ağ adınızı girin' : 'Enter your WiFi network name'}" maxlength="32" aria-describedby="wifi-ssid-hint">
          <span class="hint" id="wifi-ssid-hint">${isTurkish ? 'Bu ad ana kablosuz yayın olarak görülecektir' : 'This name will be visible as primary wireless broadcast'}</span>
        </div>
        
        <div class="grid-2">
          <div class="form-group">
            <label for="wifi-mode">${isTurkish ? 'Çalışma Modu' : 'Operation Mode'}</label>
            <select id="wifi-mode" name="mode">
              ${modeSelect}
            </select>
          </div>
          
          <div class="form-group">
            <label for="wifi-channel">${isTurkish ? 'Yayın Kanalı (Kanal / Frekans)' : 'Broadcast Channel (Channel / Frequency)'}</label>
            <select id="wifi-channel" name="channel">
              ${channelSelect}
            </select>
          </div>
        </div>
        
        <div class="form-group">
          <label for="wifi-security">${isTurkish ? 'Güvenlik Türü' : 'Security Type'}</label>
          <select id="wifi-security" name="security">
            ${securitySelect}
          </select>
          <span class="hint">${isTurkish ? 'Çoğu ağ için WPA2 Kişisel önerilir' : 'WPA2 Personal is recommended for most networks'}</span>
        </div>
        
        <div id="wifi-password-wrap" style="${wifi.security === 'open' ? 'display:none;' : ''}">
          ${passwordField}
        </div>
        
        <div class="grid-2">
          ${hiddenCheckbox}
          ${maxClientsField}
        </div>
        
        <div class="actions">
          <button type="submit" class="btn btn-primary">💾 ${isTurkish ? 'Ana Ayarları Kaydet' : 'Save Primary Settings'}</button>
          <button type="button" class="btn btn-secondary" onclick="location.reload()">↺ ${isTurkish ? 'Sıfırla' : 'Reset'}</button>
        </div>
      </form>

      <!-- Multi-SSID Section -->
      <h2 class="panel-title" style="margin-top:32px;">🌐 ${isTurkish ? 'Çoklu SSID &amp; Misafir Ağ Profilleri' : 'Multi-SSID &amp; Guest Network Profiles'}</h2>
      <p style="color:var(--color-secondary-500);margin-bottom:16px;font-size:13px;">
        ${isTurkish ? 'Erişim noktası üzerinde ek kablosuz yayınlar (Misafir Ağı, IoT Ağı, 5G Yüksek Hız) oluşturun ve yönetin.' : 'Create and manage additional wireless broadcasts (Guest Network, IoT Network, 5G High Speed) on this Access Point.'}
      </p>

      <div id="ssid-profiles-container" style="margin-bottom:20px;"></div>

      <div style="background:${colors.common.white};padding:20px;border-radius:10px;border:1px solid var(--color-secondary-200);margin-bottom:25px;">
        <h3 style="margin:0 0 12px 0;font-size:14px;color:var(--color-secondary-900);" id="ssid-form-title">
          ➕ ${isTurkish ? 'Yeni SSID Profili Ekle' : 'Add New SSID Profile'}
        </h3>
        <input type="hidden" id="edit-ssid-id" value="">
        
        <div class="grid-2" style="margin-bottom:12px;">
          <div class="form-group" style="margin-bottom:0;">
            <label for="profile-name">${isTurkish ? 'Profil Adı' : 'Profile Name'}</label>
            <input type="text" id="profile-name" placeholder="${isTurkish ? 'örn. Misafir Ağı, IoT Ağı' : 'e.g. Guest WiFi, IoT Network'}">
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label for="profile-ssid">${isTurkish ? 'Ağ Adı (SSID)' : 'Network Name (SSID)'}</label>
            <input type="text" id="profile-ssid" placeholder="${isTurkish ? 'örn. Guest-WiFi' : 'e.g. Guest-WiFi'}">
          </div>
        </div>

        <div class="grid-2" style="margin-bottom:12px;">
          <div class="form-group" style="margin-bottom:0;">
            <label for="profile-band">${isTurkish ? 'Frekans / Bant' : 'Frequency / Band'}</label>
            <select id="profile-band">
              <option value="both">${isTurkish ? 'Çift Bant (2.4 GHz & 5 GHz)' : 'Dual Band (2.4 GHz & 5 GHz)'}</option>
              <option value="2.4GHz">2.4 GHz</option>
              <option value="5GHz">5 GHz</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label for="profile-security">${isTurkish ? 'Güvenlik Türü' : 'Security Type'}</label>
            <select id="profile-security" onchange="var pWrap = document.getElementById('profile-password-wrap'); if(pWrap) pWrap.style.display = this.value === 'open' ? 'none' : 'block';">
              <option value="wpa2">${isTurkish ? 'WPA2-PSK (Kişisel)' : 'WPA2-PSK (Personal)'}</option>
              <option value="wpa3">${isTurkish ? 'WPA3-SAE (Yüksek Güvenlik)' : 'WPA3-SAE (High Security)'}</option>
              <option value="open">${isTurkish ? 'Açık (Şifresiz)' : 'Open (No password)'}</option>
              <option value="wep">WEP</option>
            </select>
          </div>
        </div>

        <div class="form-group" id="profile-password-wrap" style="margin-bottom:12px;">
          <label for="profile-password">${isTurkish ? 'Wi-Fi Parolası' : 'Wi-Fi Password'}</label>
          <input type="password" id="profile-password" placeholder="${isTurkish ? 'En az 8 karakter' : 'Minimum 8 characters'}" value="guestpass123">
        </div>

        <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px;">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;color:var(--color-secondary-700);">
            <input type="checkbox" id="profile-enabled" checked>
            ${isTurkish ? 'Yayın Etkin (Aktif)' : 'Broadcast Enabled (Active)'}
          </label>
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;color:var(--color-secondary-700);">
            <input type="checkbox" id="profile-hidden">
            ${isTurkish ? 'Gizli SSID (SSID Gizle)' : 'Hidden SSID (Hide SSID)'}
          </label>
        </div>

        <div style="display:flex;gap:10px;">
          <button type="button" class="btn btn-primary" onclick="saveSsidProfile()" id="btn-save-ssid-profile">
            💾 ${isTurkish ? 'SSID Profilini Kaydet' : 'Save SSID Profile'}
          </button>
          <button type="button" class="btn btn-secondary" onclick="resetSsidForm()">
            ↺ ${isTurkish ? 'Formu Temizle' : 'Clear Form'}
          </button>
        </div>
      </div>
    </div>
      
    ${renderWifiAdminIotTemplate({
      activeTab,
      isTurkish,
      connectedDevices: onlyIotConnectedDevices,
      availableDevices: availableIotDevices,
    })}

    ${renderWifiAdminAccountTemplate(activeTab, isTurkish, jsUsername)}

    <!-- Status Tab -->
    <div id="status-tab" class="content" style="display:${activeTab === 'status' ? 'block' : 'none'};">
      <h2 class="panel-title">${isTurkish ? 'Ağ Durumu & Bağlı Cihazlar' : 'Network Status & Connected Devices'}</h2>
      
      <div class="grid-2" style="margin-bottom:20px;">
        <div class="status-card">
          <div class="status-info">
            <h3>${isTurkish ? 'WiFi Durumu' : 'WiFi Status'}</h3>
            <p>${wifi.enabled ? (isTurkish ? 'Aktif ve Yayın Yapıyor' : 'Active and Broadcasting') : (isTurkish ? 'Devre Dışı' : 'Disabled')}</p>
          </div>
          <span class="status-badge">${wifi.enabled ? (isTurkish ? '● Çevrimiçi' : '● Online') : (isTurkish ? '○ Çevrimdışı' : '○ Offline')}</span>
        </div>
        <div class="status-card">
          <div class="status-info">
            <h3>${isTurkish ? 'Bağlı Cihazlar (Toplam)' : 'Connected Clients (Total)'}</h3>
            <p id="status-connected-count">${connectedIotDevices.filter(d => d.connected).length} ${isTurkish ? 'cihaz bağlı' : pluralize(connectedIotDevices.filter(d => d.connected).length, 'device connected', 'devices connected')}</p>
          </div>
          <span class="status-badge" id="status-total-badge">${connectedIotDevices.length} ${isTurkish ? 'Toplam' : 'Total'}</span>
        </div>
      </div>

      <!-- Connected Wireless Clients List Section -->
      <h3 style="margin-bottom:12px;font-size:15px;color:var(--color-secondary-900);">${isTurkish ? '📶 Bağlı Kablosuz İstemciler Listesi' : '📶 Connected Wireless Clients List'}</h3>
      <p style="color:var(--color-secondary-500);margin-bottom:16px;font-size:13px;">
        ${isTurkish ? 'Bu erişim noktasına (AP/Router) bağlı tüm kablosuz istemcilerin (PC, Laptop, Akıllı Cihaz, Sensör) canlı listesi:' : 'Live list of all wireless clients (PC, Laptop, Smart Device, Sensor) currently connected to this Access Point:'}
      </p>

      <div id="connected-wireless-clients-container" style="margin-bottom:24px;"></div>

      <div style="background:${colors.common.white};padding:20px;border-radius:10px;border:1px solid var(--color-secondary-200);">
        <h3 style="margin-bottom:15px;font-size:15px;color:var(--color-secondary-900);">${isTurkish ? 'Ağ & Yayın Bilgileri' : 'Network & Broadcast Information'}</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;">
          <div><strong>SSID (Ana):</strong> ${safeSsid || (isTurkish ? 'Yapılandırılmadı' : 'Not configured')}</div>
          <div><strong>${isTurkish ? 'Güvenlik' : 'Security'}:</strong> ${sanitizeHTML(wifi.security.toUpperCase())}</div>
          <div><strong>${isTurkish ? 'Kanal' : 'Channel'}:</strong> ${sanitizeHTML(wifi.channel || 'Auto')}</div>
          <div><strong>${isTurkish ? 'Mod' : 'Mode'}:</strong> ${sanitizeHTML(wifi.mode.toUpperCase())}</div>
          <div style="grid-column: 1 / -1;"><strong>${isTurkish ? 'MAC Filtresi' : 'MAC Filter'}:</strong> ${wifi.macFilterEnabled ? (wifi.macFilterMode === 'deny' ? (isTurkish ? '● Etkin (Engelleme: ' + (wifi.macFilterList?.length || 0) + ' adres)' : '● Enabled (Deny: ' + (wifi.macFilterList?.length || 0) + ' items)') : (isTurkish ? '● Etkin (Erişim: ' + (wifi.macFilterList?.length || 0) + ' adres)' : '● Enabled (Allow: ' + (wifi.macFilterList?.length || 0) + ' items)')) : (isTurkish ? '○ Devre Dışı' : '○ Disabled')}</div>
        </div>
      </div>
    </div>

    <!-- Advanced Tab -->
    <div id="advanced-tab" class="content" style="display:${activeTab === 'advanced' ? 'block' : 'none'};">
      <h2 class="panel-title">${isTurkish ? 'Gelişmiş Kablosuz Ayarları' : 'Advanced Wireless Settings'}</h2>
      <p style="color:var(--color-secondary-500);margin-bottom:20px;">${isTurkish ? 'Kablosuz MAC adresi filtreleme ve güvenlik kurallarını yapılandırın.' : 'Configure wireless MAC address filtering and security rules.'}</p>
      
      <div style="background:${colors.common.white};border:1px solid var(--color-secondary-200);border-radius:10px;padding:20px;margin-bottom:24px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
          <div>
            <h3 style="margin:0 0 4px 0;font-size:16px;color:var(--color-secondary-900);">🛡️  ${isTurkish ? 'Kablosuz MAC Adresi Filtreleme' : 'Wireless MAC Address Filtering'}</h3>
            <p style="margin:0;font-size:13px;color:var(--color-secondary-500);">${isTurkish ? 'Kablosuz ağa yalnızca izin verilen cihazların erişmesini sağlayın veya belirli cihazları engelleyin.' : 'Allow only permitted devices to access the wireless network or block specific devices.'}</p>
          </div>
          <label class="switch">
            <input type="checkbox" id="mac-filter-enabled" ${wifi.macFilterEnabled ? 'checked' : ''} onchange="toggleMacFilterSection()">
            <span class="slider"></span>
          </label>
        </div>

        <div id="mac-filter-body" style="display:${wifi.macFilterEnabled ? 'block' : 'none'};">
          <div style="margin-bottom:16px;padding:12px;background:white;border-radius:8px;border:1px solid var(--color-secondary-200);">
            <label style="display:block;font-weight:600;font-size:13px;margin-bottom:8px;">${isTurkish ? 'Filtreleme Modu:' : 'Filtering Mode:'}</label>
            <div style="display:flex;gap:20px;">
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;">
                <input type="radio" name="macFilterMode" value="allow" ${wifi.macFilterMode !== 'deny' ? 'checked' : ''}>
                <span>✅ ${isTurkish ? 'İzin Ver (Yalnızca listedeki MAC adreslerine izin ver)' : 'Allow (Allow only MAC addresses in list)'}</span>
              </label>
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;">
                <input type="radio" name="macFilterMode" value="deny" ${wifi.macFilterMode === 'deny' ? 'checked' : ''}>
                <span>🚫 ${isTurkish ? 'Engelle (Listede olan MAC adreslerini engelle)' : 'Deny (Block MAC addresses in list)'}</span>
              </label>
            </div>
          </div>

          <div style="margin-bottom:16px;">
            <label style="display:block;font-weight:600;font-size:13px;margin-bottom:6px;">${isTurkish ? 'MAC Adresi Ekle:' : 'Add MAC Address:'}</label>
            <div style="display:flex;gap:8px;">
              <input type="text" id="manual-mac-input" placeholder="00:11:22:33:44:55">
              <button type="button" class="btn btn-secondary" onclick="addManualMac()">➕ ${isTurkish ? 'Ekle' : 'Add'}</button>
            </div>
          </div>

          <div style="margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;">
            <span style="font-weight:600;font-size:13px;">${isTurkish ? 'Filtrelenen MAC Adresleri:' : 'Filtered MAC Addresses:'}</span>
            <span id="mac-list-count" class="status-badge" style="background:var(--color-secondary-700);">${(wifi.macFilterList || []).length} ${isTurkish ? 'adres' : 'items'}</span>
          </div>

          <div id="mac-filter-list-container" style="max-height:200px;overflow-y:auto;background:var(--color-secondary-100);padding:10px;border-radius:8px;border:1px solid var(--color-secondary-200);"></div>
        </div>
      </div>

      <!-- DHCP Server Settings Section -->
      <div style="background:${colors.common.white};border:1px solid var(--color-secondary-200);border-radius:10px;padding:20px;margin-bottom:24px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
          <div>
            <h3 style="margin:0 0 4px 0;font-size:16px;color:var(--color-secondary-900);">🌐 ${isTurkish ? 'DHCP Sunucusu Ayarları' : 'DHCP Server Settings'}</h3>
            <p style="margin:0;font-size:13px;color:var(--color-secondary-500);">${isTurkish ? 'Ağa bağlanan cihazlara otomatik IP adresi dağıtımını ve ağ parametrelerini yapılandırın.' : 'Configure automatic IP assignment and network parameters for connected devices.'}</p>
          </div>
          <label class="switch">
            <input type="checkbox" id="dhcp-server-enabled" ${dhcpServerEnabled ? 'checked' : ''} onchange="toggleDhcpServerSection()">
            <span class="slider"></span>
          </label>
        </div>

        <div id="dhcp-server-body" style="display:${dhcpServerEnabled ? 'block' : 'none'};">
          <div class="grid-2" style="margin-bottom:12px;">
            <div class="form-group">
              <label for="dhcp-start-ip">${isTurkish ? 'Başlangıç IP Adresi' : 'Start IP Address'}</label>
              <input type="text" id="dhcp-start-ip" value="${safeStartIp}" placeholder="192.168.1.100">
            </div>
            <div class="form-group">
              <label for="dhcp-end-ip">${isTurkish ? 'Bitiş IP Adresi' : 'End IP Address'}</label>
              <input type="text" id="dhcp-end-ip" value="${safeEndIp}" placeholder="192.168.1.200">
            </div>
          </div>

          <div class="grid-2" style="margin-bottom:12px;">
            <div class="form-group">
              <label for="dhcp-gateway">${isTurkish ? 'Varsayılan Ağ Geçidi' : 'Default Gateway'}</label>
              <input type="text" id="dhcp-gateway" value="${safeGateway}" placeholder="192.168.1.1">
            </div>
            <div class="form-group">
              <label for="dhcp-subnet">${isTurkish ? 'Alt Ağ Maskesi' : 'Subnet Mask'}</label>
              <input type="text" id="dhcp-subnet" value="${safeSubnet}" placeholder="255.255.255.0">
            </div>
          </div>

          <div class="grid-2" style="margin-bottom:12px;">
            <div class="form-group">
              <label for="dhcp-dns">${isTurkish ? 'Birincil DNS Sunucusu' : 'Primary DNS Server'}</label>
              <input type="text" id="dhcp-dns" value="${safeDns}" placeholder="192.168.1.1">
            </div>
            <div class="form-group">
              <label for="dhcp-lease">${isTurkish ? 'Kiralama Süresi (Saat)' : 'Lease Time (Hours)'}</label>
              <input type="number" id="dhcp-lease" value="${safeLeaseTime}" min="1" max="720">
            </div>
          </div>
        </div>
      </div>

      <div class="actions">
        <button type="button" class="btn btn-primary" id="save-advanced-btn" onclick="saveMacFilterSettings()">💾 ${isTurkish ? 'Gelişmiş Ayarları Kaydet' : 'Save Advanced Settings'}</button>
      </div>
    </div>
  </div>

  ${getWifiControlPanelScripts({
    isTurkish,
    jsCurrentSsidList,
    jsConnectedClientsData,
    jsMacFilterList,
    jsDeviceId,
    jsUsername,
    jsPassword,
    isAuthenticated,
    jsSsid,
    jsSecurity,
    jsWifiPassword,
    jsChannel,
    deviceId
  })}
</body>
</html>
  `;
}

/**
 * Generate router/switch/WLC admin page content for HTTP access
 */
export function generateRouterAdminPage(
  device: CanvasDevice,
  language: string,
  state?: SwitchState,
  connectedIotDevices?: ConnectedIoTDevice[],
  availableIotDevices?: AvailableIoTDevice[],
  username?: string,
  password?: string,
  activeTab?: string,
  isAuthenticated?: boolean
): string {
  const interfaceIp = state?.ports ? Object.values(state.ports).find((p) => p?.ipAddress && !p.shutdown)?.ipAddress : undefined;
  const persistedUsername = state?.services?.http?.username ?? device.services?.http?.username;
  const persistedPassword = state?.services?.http?.password ?? device.services?.http?.password;
  const isAuth = isAuthenticated !== undefined ? isAuthenticated : isRouterAuthenticated(device.id);
  const config: RouterWebConfig = {
    wifi: getRouterWifiConfig(device, state),
    deviceName: device.name,
    deviceIp: interfaceIp || device.ip || '192.168.1.1',
    deviceId: device.id,
    adminPassword: 'admin',
    username: username ?? persistedUsername,
    password: password ?? persistedPassword,
    connectedIotDevices: connectedIotDevices || [],
    availableIotDevices: availableIotDevices || [],
    language: language,
    device: device,
    runtimeState: state,
  };

  return generateWifiControlPanelHTML(config, activeTab, isAuth);
}

export function isRouterDevice(device: CanvasDevice): boolean {
  return device.type === 'router' || device.type === 'wlc' || device.type === 'switchL3';
}

