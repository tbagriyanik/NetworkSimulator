'use client';

import { CanvasDevice } from './networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import { sanitizeHTML, safeJSONForHTML } from '@/lib/security/sanitizer';

interface WifiAdminConfig {
  enabled: boolean;
  ssid: string;
  security: 'open' | 'wpa' | 'wpa2' | 'wpa3';
  password?: string;
  channel: '2.4GHz' | '5GHz';
  mode: 'ap' | 'client';
  hidden?: boolean;
  maxClients?: number;
}

export interface ConnectedIoTDevice {
  id: string;
  name: string;
  sensorType: string;
  connected: boolean;
  ip?: string;
  isWired?: boolean;
}

export interface AvailableIoTDevice {
  id: string;
  name: string;
  sensorType: string;
  currentSsid?: string;
}

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
}

/**
 * Generates a WiFi Control Panel HTML for router/switch admin interface
 * Styled like a typical router web admin page (e.g., 192.168.1.1)
 */
function generateWifiControlPanelHTML(config: RouterWebConfig, activeTab: string = 'wireless'): string {
  const { wifi, deviceName, deviceIp, deviceId, connectedIotDevices = [], availableIotDevices = [], username, password, language = 'en' } = config;
  const isTurkish = language === 'tr';
  const pluralize = (count: number, singular: string, plural: string) => (count === 1 ? singular : plural);

  // Sanitized versions for HTML display
  const safeDeviceName = sanitizeHTML(deviceName);
  const safeDeviceIp = sanitizeHTML(deviceIp);
  const safeSsid = sanitizeHTML(wifi.ssid || '');
  const safeWifiPassword = sanitizeHTML(wifi.password || '');
  // JSON stringified versions for use in <script> blocks to prevent logic corruption and XSS
  const jsUsername = safeJSONForHTML(username || '');
  const jsPassword = safeJSONForHTML(password || '');
  const jsDeviceId = safeJSONForHTML(deviceId || '');
  const jsSsid = safeJSONForHTML(wifi.ssid || '');
  const jsWifiPassword = safeJSONForHTML(wifi.password || '');
  const jsChannel = safeJSONForHTML(wifi.channel || '');
  const jsSecurity = safeJSONForHTML(wifi.security || '');

  const securityOptions = [
    { value: 'open', label: isTurkish ? 'Açık (Güvenlik Yok)' : 'Open (No Security)' },
    { value: 'wpa', label: isTurkish ? 'WPA Kişisel' : 'WPA Personal' },
    { value: 'wpa2', label: isTurkish ? 'WPA2 Kişisel (Önerilen)' : 'WPA2 Personal (Recommended)' },
    { value: 'wpa3', label: isTurkish ? 'WPA3 Kişisel' : 'WPA3 Personal' },
  ];

  const channelOptions = [
    { value: '2.4GHz', label: isTurkish ? '2.4 GHz (Daha İyi Menzil)' : '2.4 GHz (Better Range)' },
    { value: '5GHz', label: isTurkish ? '5 GHz (Daha Yüksek Hız)' : '5 GHz (Higher Speed)' },
  ];

  const modeOptions = [
    { value: 'ap', label: isTurkish ? 'Erişim Noktası (AP)' : 'Access Point (AP)' },
    { value: 'client', label: isTurkish ? 'İstemci Modu' : 'Client Mode' },
  ];

  const securitySelect = securityOptions.map(opt =>
    `<option value="${opt.value}" ${wifi.security === opt.value ? 'selected' : ''}>${opt.label}</option>`
  ).join('');

  const channelSelect = channelOptions.map(opt =>
    `<option value="${opt.value}" ${wifi.channel === opt.value ? 'selected' : ''}>${opt.label}</option>`
  ).join('');

  const modeSelect = modeOptions.map(opt =>
    `<option value="${opt.value}" ${wifi.mode === opt.value ? 'selected' : ''}>${opt.label}</option>`
  ).join('');

  const passwordField = `
    <div class="form-group">
      <label for="wifi-password">${isTurkish ? 'WiFi Parolası / Güvenlik Anahtarı' : 'WiFi Password / Security Key'}</label>
      <div style="position:relative;display:flex;align-items:center;">
        <input type="password" id="wifi-password" name="password" value="${safeWifiPassword}" placeholder="${isTurkish ? 'Parola girin (en az 8 karakter)' : 'Enter password (min 8 characters)'}" minlength="8" aria-describedby="wifi-password-hint" style="padding-right:2.2rem;width:100%;border:1px solid var(--color-secondary-300);border-radius:8px;box-sizing:border-box;">
        <button type="button" onclick="(function(btn){var inp=document.getElementById('wifi-password');if(inp.type==='password'){inp.type='text';btn.innerHTML='&var(--color-success-700);&#65039;';}else{inp.type='password';btn.innerHTML='&var(--color-success-700);';}})(this)" tabindex="-1" style="position:absolute;right:0.5rem;background:none;border:none;cursor:pointer;font-size:1rem;color:#888;padding:0;line-height:1;" title="${isTurkish ? 'Parolayı Göster/Gizle' : 'Show/Hide password'}">&var(--color-success-700);</button>
      </div>
      <span class="hint" id="wifi-password-hint">${isTurkish ? 'En az 8 karakter gereklidir' : 'Minimum 8 characters required'}</span>
    </div>
  `;

  const hiddenCheckbox = `
    <div class="form-group checkbox-group">
      <label class="checkbox-label">
        <input type="checkbox" id="wifi-hidden" name="hidden" ${wifi.hidden ? 'checked' : ''}>
        <span class="checkmark"></span>
        <span class="label-text">${isTurkish ? 'SSID\'yi Gizle (Ağ adını yayınlama)' : 'Hide SSID (Don\'t broadcast network name)'}</span>
      </label>
    </div>
  `;

  const maxClientsField = `
    <div class="form-group">
      <label for="max-clients">${isTurkish ? 'Maksimum Bağlı İstemci' : 'Maximum Connected Clients'}</label>
      <input type="number" id="max-clients" name="maxClients" value="${wifi.maxClients || 32}" min="1" max="128">
      <span class="hint">${isTurkish ? 'Aralık: 1-128 istemci' : 'Range: 1-128 clients'}</span>
    </div>
  `;

  const loginFormHTML = username && password ? `
    <div id="login-form" style="display: flex; align-items: center; justify-content: center; min-height: 100vh; background: linear-gradient(135deg, var(--color-primary-500) 0%, var(--color-purple-500) 100%); padding: 20px;">
      <div style="background: white; border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.12); padding: 40px; width: 100%; max-width: 400px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="font-size: 24px; font-weight: 600; color: #333; margin-bottom: 10px;">${safeDeviceName}</h1>
          <p style="color: var(--color-muted-foreground); font-size: 14px;">${isTurkish ? 'IoT Cihaz Yönetimi' : 'IoT Device Management'}</p>
        </div>
        <form id="auth-form" onsubmit="handleLogin(event)">
          <div style="margin-bottom: 20px;">
            <label style="display: block; font-size: 13px; font-weight: 500; color: #333; margin-bottom: 8px;">${isTurkish ? 'Kullanıcı Adı' : 'Username'}</label>
          <input type="text" id="login-username" maxlength="255" required style="width: 100%; padding: 12px; border: 1px solid var(--color-secondary-300); border-radius: 8px; font-size: 14px; box-sizing: border-box;">
          </div>
          <div style="margin-bottom: 25px;">
            <label style="display: block; font-size: 13px; font-weight: 500; color: #333; margin-bottom: 8px;">${isTurkish ? 'Parola' : 'Password'}</label>
            <input type="password" id="login-password" maxlength="255" required style="width: 100%; padding: 12px; border: 1px solid var(--color-secondary-300); border-radius: 8px; font-size: 14px; box-sizing: border-box;">
          </div>
          <button type="submit" style="width: 100%; padding: 14px; background: linear-gradient(135deg, var(--color-primary-900) 0%, var(--color-primary-800) 100%); color: white; border: none; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; transition: opacity 0.2s;">
            ${isTurkish ? 'Giriş Yap' : 'Login'}
          </button>
          <p id="login-error" style="color: var(--color-error-500); font-size: 13px; text-align: center; margin-top: 15px; display: none;">${isTurkish ? 'Hatalı kullanıcı adı veya parola' : 'Invalid username or password'}</p>
        </form>
      </div>
    </div>
  ` : '';

  const mainContent = `
    <div id="main-content" style="display: ${username && password ? 'none' : 'block'};">
  `;

  const contentEnd = `
    </div>
  `;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeDeviceName} - ${isTurkish ? 'Kablosuz Ayarları' : 'Wireless Settings'}</title>
  <style>
    :root {
      --color-primary-500: #6366f1;
      --color-purple-500: #a855f7;
      --color-primary-800: #3730a3;
      --color-primary-900: #312e81;
      --color-secondary-200: #e2e8f0;
      --color-secondary-300: #cbd5e1;
      --color-secondary-500: #64748b;
      --color-secondary-600: #475569;
      --color-secondary-900: #0f172a;
      --color-muted-foreground: #64748b;
      --color-error-500: #ef4444;
      --color-success-700: #15803d;
      --color-warning-500: #f59e0b;
      --color-warning-100: #fef3c7;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: linear-gradient(135deg, var(--color-primary-500) 0%, var(--color-purple-500) 100%);
      min-height: 100vh;
      padding: 20px;
    }
    
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.12);
      overflow: hidden;
    }
    
    .header {
      background: linear-gradient(135deg, var(--color-primary-900) 0%, var(--color-primary-800) 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    
    .header h1 {
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    
    .header .subtitle {
      font-size: 14px;
      opacity: 0.9;
    }
    
    .header .device-info {
      margin-top: 15px;
      padding-top: 15px;
      border-top: 1px solid rgba(255,255,255,0.2);
      font-size: 13px;
      display: flex;
      justify-content: center;
      gap: 30px;
    }
    
    .nav-tabs {
      display: flex;
      background: #f8f9fa;
      border-bottom: 1px solid var(--color-secondary-200);
    }
    
    .nav-tab {
      flex: 1;
      padding: 16px 20px;
      text-align: center;
      color: var(--color-secondary-500);
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      border-bottom: 3px solid transparent;
      transition: all 0.3s;
    }
    
    .nav-tab:hover {
      color: var(--color-primary-800);
      background: rgba(42,82,152,0.05);
    }
    
    .nav-tab.active {
      color: var(--color-primary-800);
      border-bottom-color: var(--color-primary-800);
      background: #fff;
    }
    
    .content {
      padding: 30px;
    }
    
    .panel-title {
      font-size: 18px;
      font-weight: 600;
      color: #333;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .panel-title::before {
      content: '📶';
      font-size: 24px;
    }
    
    .status-card {
      background: #f0f4ff;
      border: 1px solid #d0daf0;
      color: var(--color-secondary-900);
      padding: 20px;
      border-radius: 10px;
      margin-bottom: 25px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 2px 8px rgba(42, 82, 152, 0.1);
    }
    
    .status-card.disabled {
      background: #f5f5f5;
      border: 1px solid #e0e0e0;
      color: var(--color-secondary-600);
      box-shadow: none;
    }
    
    .status-info h3 {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 5px;
      color: var(--color-secondary-900);
    }
    
    .status-info p {
      font-size: 13px;
      color: #444;
    }
    
    .status-badge {
      background: var(--color-primary-800);
      color: #fff;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }
    
    .form-group {
      margin-bottom: 20px;
    }
    
    .form-group label {
      display: block;
      font-size: 14px;
      font-weight: 600;
      color: var(--color-secondary-600);
      margin-bottom: 8px;
    }
    
    .form-group input[type="text"],
    .form-group input[type="password"],
    .form-group input[type="number"],
    .form-group select {
      width: 100%;
      padding: 12px 15px;
      border: 2px solid var(--color-secondary-200);
      border-radius: 8px;
      font-size: 14px;
      transition: all 0.3s;
      background: #fff;
    }
    
    .form-group input:focus,
    .form-group select:focus {
      outline: none;
      border-color: var(--color-primary-800);
      box-shadow: 0 0 0 3px rgba(42,82,152,0.1);
    }
    
    .form-group .hint {
      display: block;
      font-size: 12px;
      color: var(--color-secondary-500);
      margin-top: 5px;
    }
    
    .checkbox-group {
      display: flex;
      align-items: center;
    }
    
    .checkbox-label {
      display: flex !important;
      align-items: center;
      cursor: pointer;
      flex-direction: row !important;
      gap: 12px;
    }
    
    .checkbox-label input {
      display: none;
    }
    
    .checkmark {
      width: 22px;
      height: 22px;
      border: 2px solid #ced4da;
      border-radius: 5px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s;
      flex-shrink: 0;
    }
    
    .checkbox-label input:checked + .checkmark {
      background: var(--color-primary-800);
      border-color: var(--color-primary-800);
    }
    
    .checkbox-label input:checked + .checkmark::after {
      content: '✓';
      color: white;
      font-size: 14px;
      font-weight: bold;
    }
    
    .label-text {
      font-size: 14px !important;
      font-weight: 500 !important;
      color: var(--color-secondary-600);
    }
    
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    
    .actions {
      display: flex;
      gap: 15px;
      margin-top: 30px;
      padding-top: 25px;
      border-top: 1px solid var(--color-secondary-200);
    }
    
    .btn {
      flex: 1;
      padding: 14px 24px;
      border: none;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
    }
    
    .btn-primary {
      background: linear-gradient(135deg, var(--color-primary-900) 0%, var(--color-primary-800) 100%);
      color: white;
    }
    
    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(42,82,152,0.15);
    }
    
    .btn-secondary {
      background: #f8f9fa;
      color: var(--color-secondary-500);
      border: 2px solid var(--color-secondary-200);
    }
    
    .btn-secondary:hover {
      background: var(--color-secondary-200);
      color: var(--color-secondary-600);
    }
    
    .toggle-switch {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 10px;
      margin-bottom: 25px;
    }
    
    .toggle-switch h3 {
      font-size: 16px;
      color: #333;
    }
    
    .toggle-switch p {
      font-size: 13px;
      color: var(--color-secondary-500);
      margin-top: 4px;
    }
    
    .switch {
      position: relative;
      width: 60px;
      height: 34px;
    }
    
    .switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    
    .slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #ccc;
      transition: .4s;
      border-radius: 34px;
    }
    
    .slider:before {
      position: absolute;
      content: "";
      height: 26px;
      width: 26px;
      left: 4px;
      bottom: 4px;
      background-color: white;
      transition: .4s;
      border-radius: 50%;
    }
    
    input:checked + .slider {
      background-color: var(--color-accent-600);
    }
    
    input:checked + .slider:before {
      transform: translateX(26px);
    }
    
    .footer {
      background: #f8f9fa;
      padding: 20px 30px;
      text-align: center;
      font-size: 12px;
      color: var(--color-secondary-500);
      border-top: 1px solid var(--color-secondary-200);
    }
    
    @media (max-width: 600px) {
      .grid-2 {
        grid-template-columns: 1fr;
      }
      
      .actions {
        flex-direction: column;
      }
      
      .device-info {
        flex-direction: column;
        gap: 10px !important;
      }
    }

    /* Custom Confirm Modal */
    .custom-confirm-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 9999; justify-content: center; align-items: center; backdrop-filter: blur(4px); }
    .custom-confirm-overlay.active { display: flex; }
    .custom-confirm-box { background: white; border-radius: 12px; padding: 24px; max-width: 400px; width: 90%; box-shadow: 0 8px 30px rgba(0,0,0,0.12); text-align: center; }
    .custom-confirm-box h3 { margin: 0 0 12px 0; font-size: 16px; color: #333; }
    .custom-confirm-box p { margin: 0 0 20px 0; font-size: 14px; color: var(--color-muted-foreground); }
    .custom-confirm-actions { display: flex; gap: 10px; justify-content: center; }
    .custom-confirm-actions button { padding: 8px 20px; border-radius: 8px; border: none; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .confirm-cancel-btn { background: var(--color-secondary-200); color: var(--color-secondary-600); }
    .confirm-cancel-btn:hover { background: var(--color-secondary-200); }
    .confirm-ok-btn { background: linear-gradient(135deg, var(--color-error-500) 0%, var(--color-error-600) 100%); color: white; }
    .confirm-ok-btn:hover { transform: translateY(-1px); box-shadow: 0 2px 8px rgba(220,53,69,0.2); }
  </style>
</head>
<body>
  ${loginFormHTML}
  ${mainContent}
  <div class="container">
    <div class="header">
      <h1>🔧 ${safeDeviceName}</h1>
      <div class="subtitle">${isTurkish ? 'Kablosuz Ağ Yönetimi' : 'Wireless Network Administration'}</div>
      <div class="device-info">
        <span>📍 IP: ${safeDeviceIp}</span>
        <span>📡 WLAN Interface: wlan0</span>
      </div>
    </div>
    
    <div class="nav-tabs">
      <div class="nav-tab${activeTab === 'wireless' ? ' active' : ''}" onclick="showTab('wireless')">📶 ${isTurkish ? 'Kablosuz' : 'Wireless'}</div>
      <div class="nav-tab${activeTab === 'iot' ? ' active' : ''}" onclick="showTab('iot')">🛜 ${isTurkish ? 'IoT Cihazları' : 'IoT Devices'}</div>
      <div class="nav-tab${activeTab === 'status' ? ' active' : ''}" onclick="showTab('status')">📊 ${isTurkish ? 'Durum' : 'Status'}</div>
      <div class="nav-tab${activeTab === 'advanced' ? ' active' : ''}" onclick="showTab('advanced')">⚙️ ${isTurkish ? 'Gelişmiş' : 'Advanced'}</div>
    </div>
    
    <!-- Wireless Tab -->
    <div id="wireless-tab" class="content" style="display:${activeTab === 'wireless' ? 'block' : 'none'};">
      <div class="toggle-switch">
        <div>
          <h3>${isTurkish ? 'Kablosuz Radyo' : 'Wireless Radio'}</h3>
          <p>${isTurkish ? 'Kablosuz erişim noktasını etkinleştirin veya devre dışı bırakın' : 'Enable or disable the wireless access point'}</p>
        </div>
        <label class="switch">
          <input type="checkbox" id="wifi-enabled" ${wifi.enabled ? 'checked' : ''}>
          <span class="slider"></span>
        </label>
      </div>
      
      <div class="status-card ${wifi.enabled ? '' : 'disabled'}">
        <div class="status-info">
          <h3>${isTurkish ? 'Mevcut Durum' : 'Current Status'}</h3>
          <p>${wifi.enabled ? (isTurkish ? 'WiFi aktif ve yayın yapıyor' : 'WiFi is active and broadcasting') : (isTurkish ? 'WiFi şu anda devre dışı' : 'WiFi is currently disabled')}</p>
        </div>
        <span class="status-badge">${wifi.enabled ? (isTurkish ? '● Çevrimiçi' : '● Online') : (isTurkish ? '○ Çevrimdışı' : '○ Offline')}</span>
      </div>
      
      <h2 class="panel-title">${isTurkish ? 'Temel Kablosuz Ayarları' : 'Basic Wireless Settings'}</h2>
      
      <form id="wifi-form">
        <div class="form-group">
          <label for="wifi-ssid">${isTurkish ? 'Ağ Adı (SSID)' : 'Network Name (SSID)'}</label>
          <input type="text" id="wifi-ssid" name="ssid" value="${safeSsid}" placeholder="${isTurkish ? 'WiFi ağ adınızı girin' : 'Enter your WiFi network name'}" maxlength="32" aria-describedby="wifi-ssid-hint">
          <span class="hint" id="wifi-ssid-hint">${isTurkish ? 'Bu ad kablosuz istemciler tarafından görülecektir (gizlenmediği sürece)' : 'This name will be visible to wireless clients (unless hidden)'}</span>
        </div>
        
        <div class="grid-2">
          <div class="form-group">
            <label for="wifi-mode">${isTurkish ? 'Çalışma Modu' : 'Operation Mode'}</label>
            <select id="wifi-mode" name="mode">
              ${modeSelect}
            </select>
          </div>
          
          <div class="form-group">
            <label for="wifi-channel">${isTurkish ? 'Frekans Bandı' : 'Frequency Band'}</label>
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
          <button type="submit" class="btn btn-primary">💾 ${isTurkish ? 'Ayarları Kaydet' : 'Save Settings'}</button>
          <button type="button" class="btn btn-secondary" onclick="location.reload()">↺ ${isTurkish ? 'Değişiklikleri Sıfırla' : 'Reset Changes'}</button>
        </div>
      </form>
    </div>
      
    <!-- IoT Devices Tab -->
      <div id="iot-tab" class="content" style="display:${activeTab === 'iot' ? 'block' : 'none'};">
        <h2 class="panel-title" style="margin-bottom:20px;">🛜 ${isTurkish ? 'Bağlı IoT Cihazları' : 'Connected IoT Devices'}</h2>
        
        <div class="status-card" style="margin-bottom:20px;">
          <div class="status-info">
            <h3>${isTurkish ? 'IoT Ağı' : 'IoT Network'}</h3>
            <p>${connectedIotDevices.length} ${isTurkish ? "cihaz bu AP'ye bağlı" : pluralize(connectedIotDevices.length, 'device connected to this AP', 'devices connected to this AP')}</p>
          </div>
          <span class="status-badge">${connectedIotDevices.filter(d => d.connected).length} ${isTurkish ? 'Aktif' : 'Active'}</span>
        </div>
        
        ${connectedIotDevices.length > 0 ? `
        <div class="iot-device-list" style="margin-bottom:25px;">
          <p style="color:var(--color-secondary-500);margin-bottom:15px;font-size:13px;">${isTurkish ? 'Bağlı IoT cihazlarını yönetin:' : 'Manage connected IoT devices:'}</p>
          ${connectedIotDevices.map(device => {
            const safeIotName = sanitizeHTML(device.name);
            const safeIotId = sanitizeHTML(device.id);
            const safeIotIp = sanitizeHTML(device.ip || '');
            const jsIotId = safeJSONForHTML(device.id).replace(/"/g, '&quot;');
            return `
            <div class="iot-device-card connected" data-device-id="${safeIotId}" style="display:flex;align-items:center;justify-content:space-between;padding:15px;background:#f8f9fa;border-radius:10px;margin-bottom:10px;border:1px solid var(--color-secondary-200);cursor:pointer;">
              <div style="display:flex;align-items:center;gap:12px;">               
                <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg, ${device.isWired ? '#22c55e 0%, #16a34a 100%' : 'var(--color-warning-400) 0%, #ea580c 100%'});display:flex;align-items:center;justify-content:center;color:white;font-size:18px;">
                  ${device.isWired ? '🔌' : '🛜'}
                </div>
                <div>
                  <div style="font-weight:600;color:#333;">${safeIotName}</div>
                  <div style="font-size:12px;color:var(--color-secondary-500);">
                    ${isTurkish ? 'Sensör' : 'Sensor'}: ${sanitizeHTML(device.sensorType)}
                    ${device.ip ? `<span style="margin-left:8px;padding:2px 6px;background:var(--color-primary-100);border-radius:4px;color:#0369a1;font-family:monospace;">${safeIotIp}</span>` : ''}
                  </div>
                </div>
              </div>
              <div style="display:flex;align-items:center;gap:10px;">
                <span style="padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600;background:${device.connected ? '#dcfce7' : '#fef3c7'};color:${device.connected ? '#166534' : '#92400e'};">
                  ${device.connected ? (isTurkish ? '● Bağlı' : '● Connected') : (isTurkish ? '○ Bağlı Değil' : '○ Disconnected')}
                </span>
                <button type="button" style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;padding:0;border:none;border-radius:6px;background:#2563eb;color:white;cursor:pointer;transition:all 0.2s;" onclick="event.stopPropagation();renewIotDevice(${jsIotId})" title="${isTurkish ? 'IP Yenile' : 'IP Renew'}" aria-label="${isTurkish ? 'IP Yenile' : 'IP Renew'}">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 0 1-15.5 6.36L3 21"></path><path d="M3 12a9 9 0 0 1 15.5-6.36L21 3"></path><path d="M3 21v-6h6"></path><path d="M21 3v6h-6"></path></svg>
                </button>
                <button type="button" style="display:flex; align-items:center; justify-content:center; width:32px; height:32px; padding:0; border:none; border-radius:6px; background:#ef4444; color:white; cursor:pointer; transition:all 0.2s;" onclick="event.stopPropagation();disconnectIotDevice(${jsIotId})" title="${isTurkish ? 'Bağlantıyı Kes' : 'Disconnect'}" aria-label="${isTurkish ? 'Bağlantıyı Kes' : 'Disconnect'}">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>               
              </div>
            </div>
          `;}).join('')}
        </div>
        ` : `
        <div style="text-align:center;padding:30px;color:var(--color-secondary-500);">
          <div style="font-size:48px;margin-bottom:15px;">📡</div>
          <p>${isTurkish ? 'Henüz bağlı IoT cihazı yok' : 'No IoT devices connected yet'}</p>
          <p style="font-size:12px;">${isTurkish ? 'Başlamak için aşağıdan yeni bir IoT cihazı ekleyin' : 'Add a new IoT device below to get started'}</p>
        </div>
        `}
        
        <h2 class="panel-title">${isTurkish ? 'IoT Cihazlarını Bağla' : 'Connect IoT Devices'}</h2>
        
        ${availableIotDevices.filter(d => !d.currentSsid).length > 0 ? `
        <div class="available-iot-list" style="margin-bottom:25px;">
          <p style="color:var(--color-secondary-500);margin-bottom:15px;font-size:13px;"><strong>${isTurkish ? 'Bağlı Olmayan Cihazlar:' : 'Unconnected Devices:'}</strong> ${isTurkish ? 'Bu ağa bağlanmak için seçin:' : 'Select to connect to this network:'}</p>
          ${availableIotDevices.filter(d => !d.currentSsid).map(device => {
            const safeIotName = sanitizeHTML(device.name);
            const safeIotId = sanitizeHTML(device.id);
            const jsIotId = safeJSONForHTML(device.id).replace(/"/g, '&quot;');
            return `
            <div class="iot-device-card available" data-device-id="${safeIotId}" style="display:flex;align-items:center;justify-content:space-between;padding:15px;background:#f8f9fa;border-radius:10px;margin-bottom:10px;border:2px solid var(--color-secondary-200);cursor:pointer;transition:all 0.3s;" onclick="event.stopPropagation(); toggleIotDeviceSelection(${jsIotId})">
              <div style="display:flex;align-items:center;gap:12px;">
                <input type="checkbox" class="iot-checkbox" data-device-id="${safeIotId}" style="width:20px;height:20px;cursor:pointer;" onclick="event.stopPropagation(); toggleIotDeviceSelection(${jsIotId})">
                <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg, var(--color-secondary-400) 0%, var(--color-secondary-500) 100%);display:flex;align-items:center;justify-content:center;color:white;font-size:18px;">
                  🛜
                </div>
                <div>
                  <div style="font-weight:600;color:#333;">${safeIotName}</div>
                  <div style="font-size:12px;color:var(--color-secondary-500);">${isTurkish ? 'Sensör' : 'Sensor'}: ${sanitizeHTML(device.sensorType)} • <strong>${isTurkish ? 'Bağlı Değil' : 'Unconnected'}</strong></div>
                </div>
              </div>
            </div>
          `;}).join('')}
        </div>
        ` : ''}
        
        ${availableIotDevices.filter(d => d.currentSsid && d.currentSsid !== wifi.ssid).length > 0 ? `
        <div class="available-iot-list" style="margin-bottom:25px;">
          <p style="color:var(--color-secondary-500);margin-bottom:15px;font-size:13px;"><strong>${isTurkish ? 'Diğer Ağlarda:' : 'On Other Networks:'}</strong> ${isTurkish ? 'Bu ağa geçmek için seçin:' : 'Select to switch to this network:'}</p>
          ${availableIotDevices.filter(d => d.currentSsid && d.currentSsid !== wifi.ssid).map(device => {
            const safeIotName = sanitizeHTML(device.name);
            const safeIotId = sanitizeHTML(device.id);
            const jsIotId = safeJSONForHTML(device.id).replace(/"/g, '&quot;');
            return `
            <div class="iot-device-card available" data-device-id="${safeIotId}" style="display:flex;align-items:center;justify-content:space-between;padding:15px;background:#f8f9fa;border-radius:10px;margin-bottom:10px;border:2px solid var(--color-secondary-200);cursor:pointer;transition:all 0.3s;" onclick="event.stopPropagation(); toggleIotDeviceSelection(${jsIotId})">
              <div style="display:flex;align-items:center;gap:12px;">
                <input type="checkbox" class="iot-checkbox" data-device-id="${safeIotId}" style="width:20px;height:20px;cursor:pointer;" onclick="event.stopPropagation(); toggleIotDeviceSelection(${jsIotId})">
                <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg, var(--color-warning-400) 0%, #ea580c 100%);display:flex;align-items:center;justify-content:center;color:white;font-size:18px;">
                  🛜
                </div>
                <div>
                  <div style="font-weight:600;color:#333;">${safeIotName}</div>
                  <div style="font-size:12px;color:var(--color-secondary-500);">${isTurkish ? 'Sensör' : 'Sensor'}: ${sanitizeHTML(device.sensorType)} • ${isTurkish ? 'Ağ' : 'On'}: ${sanitizeHTML(device.currentSsid || '')}</div>
                </div>
              </div>
            </div>
          `;}).join('')}
        </div>
        ` : ''}
        
        ${(availableIotDevices.filter(d => !d.currentSsid).length > 0 || availableIotDevices.filter(d => d.currentSsid && d.currentSsid !== wifi.ssid).length > 0) ? `
        <div class="actions" style="margin-top:20px;">
          <button type="button" class="btn btn-primary" onclick="saveSelectedIotDevices()" id="save-iot-btn">
            💾 ${isTurkish ? 'Seçili Cihazları Bağla' : 'Connect Selected Devices'}
          </button>
          <button type="button" class="btn btn-secondary" onclick="clearIotSelection()">
            ↺ ${isTurkish ? 'Seçimi Temizle' : 'Clear Selection'}
          </button>
        </div>
        ` : `
        <div style="text-align:center;padding:30px;color:var(--color-secondary-500);background:#f8f9fa;border-radius:10px;margin-bottom:20px;">
          <div style="font-size:48px;margin-bottom:15px;">📡</div>
          <p>${isTurkish ? 'Topolojide uygun IoT cihazı yok' : 'No available IoT devices in topology'}</p>
          <p style="font-size:12px;">${isTurkish ? 'Önce topolojiye IoT cihazları ekleyin, ardından buradan bağlayın' : 'Add IoT devices to the topology first, then connect them here'}</p>
        </div>
        `}
      </div>
      
      <!-- Status Tab -->
      <div id="status-tab" class="content" style="display:${activeTab === 'status' ? 'block' : 'none'};">
        <h2 class="panel-title">${isTurkish ? 'Ağ Durumu' : 'Network Status'}</h2>
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
              <h3>${isTurkish ? 'Bağlı İstemciler' : 'Connected Clients'}</h3>
              <p>${connectedIotDevices.filter(d => d.connected).length} ${isTurkish ? 'IoT cihazı' : pluralize(connectedIotDevices.filter(d => d.connected).length, 'IoT device', 'IoT devices')}</p>
            </div>
            <span class="status-badge">${connectedIotDevices.length} ${isTurkish ? 'Toplam' : 'Total'}</span>
          </div>
        </div>
        <div style="background:#f8f9fa;padding:20px;border-radius:10px;">
          <h3 style="margin-bottom:15px;font-size:16px;color:#333;">${isTurkish ? 'Ağ Bilgisi' : 'Network Information'}</h3>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;">
            <div><strong>SSID:</strong> ${safeSsid || (isTurkish ? 'Yapılandırılmadı' : 'Not configured')}</div>
            <div><strong>${isTurkish ? 'Güvenlik' : 'Security'}:</strong> ${wifi.security.toUpperCase()}</div>
            <div><strong>${isTurkish ? 'Kanal' : 'Channel'}:</strong> ${sanitizeHTML(wifi.channel)}</div>
            <div><strong>${isTurkish ? 'Mod' : 'Mode'}:</strong> ${sanitizeHTML(wifi.mode.toUpperCase())}</div>
          </div>
        </div>
      </div>
      
      <!-- Advanced Tab -->
      <div id="advanced-tab" class="content" style="display:${activeTab === 'advanced' ? 'block' : 'none'};">
        <h2 class="panel-title">${isTurkish ? 'Gelişmiş Ayarlar' : 'Advanced Settings'}</h2>
        <p style="color:var(--color-secondary-500);margin-bottom:20px;">${isTurkish ? 'İleri düzey kullanıcılar için gelişmiş yapılandırma seçenekleri.' : 'Advanced configuration options for power users.'}</p>
        <div style="background:var(--color-warning-100);padding:15px;border-radius:10px;border:1px solid #ffc107;">
          <strong>⚠️ ${isTurkish ? 'Uyarı' : 'Warning'}</strong>
          <p style="margin:10px 0 0 0;font-size:13px;">${isTurkish ? 'Gelişmiş ayarları değiştirmek ağ kararlılığını etkileyebilir. Dikkatli olun.' : 'Changing advanced settings may affect network stability. Proceed with caution.'}</p>
        </div>
      </div>
    
    <div class="footer">
      © Network Simulator Router Administration | Model: ${deviceName} | Firmware: v1.0.0
    </div>
  </div>
  
  <script>
    // Language flag (resolved from server side)
    var isTurkish = ${isTurkish};
    // Hide tooltips on mobile devices
    function hideTooltipsOnMobile() {
      if (window.innerWidth <= 600) {
        document.querySelectorAll('[title]').forEach(el => {
          el.setAttribute('data-title', el.getAttribute('title'));
          el.removeAttribute('title');
        });
      }
    }
    hideTooltipsOnMobile();
    window.addEventListener('resize', hideTooltipsOnMobile);
    
    // Form handling simulation
    document.getElementById('wifi-form').addEventListener('submit', function(e) {
      e.preventDefault();
      
      const enabled = document.getElementById('wifi-enabled').checked;
      const ssid = document.getElementById('wifi-ssid').value;
      const security = document.getElementById('wifi-security').value;
      const channel = document.getElementById('wifi-channel').value;
      const mode = document.getElementById('wifi-mode').value;
      const hidden = document.getElementById('wifi-hidden')?.checked || false;
      const maxClients = document.getElementById('max-clients')?.value || 32;
      const password = document.getElementById('wifi-password')?.value || '';
      
      if (!ssid) {
        const errorMessage = isTurkish ? 'Lütfen bir ağ adı (SSID) girin' : 'Please enter a network name (SSID)';
window.parent.postMessage({ type: 'router-admin-toast', payload: { type: 'error', message: errorMessage } }, window.parent.location.origin);
        return;
      }
      
      if (security !== 'open' && password.length < 8) {
        const errorMessage = isTurkish ? 'Parola en az 8 karakter olmalıdır' : 'Password must be at least 8 characters';
window.parent.postMessage({ type: 'router-admin-toast', payload: { type: 'error', message: errorMessage } }, window.parent.location.origin);
        return;
      }
      
      // Show success message (simulated)
      const btn = document.querySelector('.btn-primary');
      const originalText = btn.innerHTML;
      btn.innerHTML = (isTurkish ? '✓ Kaydedildi!' : '✓ Saved!');
      btn.style.background = 'linear-gradient(135deg, var(--color-accent-600) 0%, var(--color-success-500) 100%)';
      
      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.style.background = '';
        window.parent.postMessage({
          type: 'router-admin-toast',
          payload: {
            type: 'success',
            message: isTurkish ? 'Wi-Fi ayarları başarıyla kaydedildi!' : 'Wi-Fi settings saved successfully!'
          }
        }, window.parent.location.origin);
      }, 1000);

      try {
        window.parent.postMessage({
          type: 'router-admin-save-wifi',
          deviceId: ${jsDeviceId},
          payload: {
            enabled,
            ssid,
            security,
            channel,
            mode,
            hidden,
            maxClients: Number(maxClients),
            password
          }
        }, window.parent.location.origin);
      } catch (err) {
        console.warn('Could not sync router settings to parent:', err);
      }
    });
    
    // Toggle switch handler
    document.getElementById('wifi-enabled').addEventListener('change', function() {
      const statusCard = document.querySelector('.status-card');
      const statusBadge = document.querySelector('.status-badge');
      const statusInfoP = document.querySelector('.status-info p');
      
      if (this.checked) {
        statusCard.classList.remove('disabled');
        statusBadge.textContent = '${isTurkish ? '● Çevrimiçi' : '● Online'}';
        statusInfoP.textContent = '${isTurkish ? 'WiFi aktif ve yayın yapıyor' : 'WiFi is active and broadcasting'}';
      } else {
        statusCard.classList.add('disabled');
        statusBadge.textContent = '${isTurkish ? '○ Çevrimdışı' : '○ Offline'}';
        statusInfoP.textContent = '${isTurkish ? 'WiFi şu anda devre dışı' : 'WiFi is currently disabled'}';
      }
    });
    
    // Security type change handler
    document.getElementById('wifi-security').addEventListener('change', function() {
      const passwordWrap = document.getElementById('wifi-password-wrap');
      const isOpen = this.value === 'open';
      if (passwordWrap) {
        passwordWrap.style.display = isOpen ? 'none' : 'block';
      }
    });
    
    // Tab switching
    function showTab(tabName) {
      const tabs = ['wireless', 'iot', 'status', 'advanced'];
      tabs.forEach(tab => {
        const tabEl = document.getElementById(tab + '-tab');
        if (tabEl) tabEl.style.display = tab === tabName ? 'block' : 'none';
      });
      // Update nav-tab active state
      document.querySelectorAll('.nav-tab').forEach((el, idx) => {
        const tabIds = ['wireless', 'iot', 'status', 'advanced'];
        if (tabIds[idx] === tabName) {
          el.classList.add('active');
        } else {
          el.classList.remove('active');
        }
      });
      // Notify parent to remember active tab on refresh
      try { window.parent.postMessage({ type: 'router-admin-tab-change', tab: tabName }, '*'); } catch(_e) {}
    }
    window.showTab = showTab;
    
    // IoT device multi-selection tracking
    let selectedIotDevices = new Set();
    
    window.toggleIotDeviceSelection = function(deviceId) {
      const checkbox = document.querySelector('.iot-checkbox[data-device-id="' + deviceId + '"]');
      const card = document.querySelector('.iot-device-card[data-device-id="' + deviceId + '"]');

      const isChecked = checkbox ? checkbox.checked : false;

      if (isChecked) {
        selectedIotDevices.add(deviceId);
        if (card) {
          card.style.borderColor = 'var(--color-primary-800)';
          card.style.background = '#e8f0fe';
        }
      } else {
        selectedIotDevices.delete(deviceId);
        if (card) {
          card.style.borderColor = 'var(--color-secondary-200)';
          card.style.background = '#f8f9fa';
        }
      }

      // Update button text
      const saveBtn = document.getElementById('save-iot-btn');
      if (saveBtn) {
        const count = selectedIotDevices.size;
        saveBtn.innerHTML = count > 0 ? '💾 ${isTurkish ? 'Bağla' : 'Connect'} ' + count : '💾 ${isTurkish ? 'Seçili Cihazları Bağla' : 'Connect Selected Devices'}';
      }
    };
    
    // Focus device in topology
    window.focusDeviceInTopology = function(deviceId) {
      try {
        window.parent.postMessage({
          type: 'router-admin-focus-device',
          deviceId: deviceId
        }, window.parent.location.origin);
      } catch (err) {
        console.warn('Could not send focus device message:', err);
      }
    };
    
    window.disconnectIotDevice = function(deviceId) {
      if (!confirm('\u26a0\ufe0f ${isTurkish ? 'Bu IoT cihazının bağlantısını kesmek istediğinizden emin misiniz?' : 'Are you sure you want to disconnect this IoT device from the wireless network?'}')) return;
      
      try {
        window.parent.postMessage({
          type: 'router-admin-disconnect-iot',
          deviceId: deviceId,
          payload: {
            iotDeviceId: deviceId
          }
        }, window.parent.location.origin);
      } catch (err) {
        console.warn('Could not disconnect IoT device:', err);
        var errorMessage = isTurkish
          ? 'Cihaz bağlantısı kesilemedi: ' + (err && err.message ? err.message : String(err))
          : 'Failed to disconnect device: ' + (err && err.message ? err.message : String(err));
window.parent.postMessage({ type: 'router-admin-toast', payload: { type: 'error', message: errorMessage } }, window.parent.location.origin);
      }
    };

    window.renewIotDevice = function(deviceId) {
      try {
        window.parent.postMessage({
          type: 'router-admin-renew-iot',
          deviceId: deviceId,
          payload: {
            iotDeviceId: deviceId
          }
        }, window.parent.location.origin);
      } catch (err) {
        console.warn('Could not renew IoT device IP:', err);
        alert('❌ ${isTurkish ? 'IP yenilenemedi' : 'Failed to renew IoT device IP'}');
      }
    };
    
    window.clearIotSelection = function() {
      selectedIotDevices.clear();
      document.querySelectorAll('.iot-checkbox').forEach(cb => cb.checked = false);
      document.querySelectorAll('.iot-device-card.available').forEach(card => {
        card.style.borderColor = 'var(--color-secondary-200)';
        card.style.background = '#f8f9fa';
      });
      const saveBtn = document.getElementById('save-iot-btn');
      if (saveBtn) saveBtn.innerHTML = '💾 ${isTurkish ? 'Seçili Cihazları Bağla' : 'Connect Selected Devices'}';
    };
    
    window.saveSelectedIotDevices = function() {
      const deviceIds = Array.from(selectedIotDevices);
      if (deviceIds.length === 0) {
        alert('❌ ${isTurkish ? 'Lütfen en az bir IoT cihazı seçin' : 'Please select at least one IoT device'}');
        return;
      }
      
      const btn = document.getElementById('save-iot-btn');
      const originalText = btn.innerHTML;
      btn.innerHTML = '💾 ${isTurkish ? 'Bağlanıyor...' : 'Connecting...'}';
      btn.disabled = true;
      
      let successCount = 0;
      
      deviceIds.forEach((deviceId, index) => {
        setTimeout(() => {
          try {
            window.parent.postMessage({
              type: 'router-admin-connect-iot',
              deviceId: deviceId,
              payload: {
                iotDeviceId: deviceId,
                ssid: ${jsSsid},
                security: ${jsSecurity},
                password: ${jsWifiPassword},
                channel: ${jsChannel}
              }
            }, window.parent.location.origin);
            successCount++;
          } catch (err) {
            console.warn('Could not connect IoT device ' + deviceId + ':', err);
          }
        }, index * 100);
      });
      
      setTimeout(() => {
        btn.innerHTML = '✓ ' + successCount + '!';
        btn.style.background = 'linear-gradient(135deg, var(--color-accent-600) 0%, var(--color-success-500) 100%)';
        setTimeout(() => {
          btn.innerHTML = '💾 ${isTurkish ? 'Seçili Cihazları Bağla' : 'Connect Selected Devices'}';
          btn.style.background = '';
          btn.disabled = false;
          clearIotSelection();
          alert('✅ ' + successCount + ${isTurkish ? "' IoT cihazı ağa bağlandı!'" : "(successCount === 1 ? ' IoT device connected to the network!' : ' IoT devices connected to the network!')"});
        }, 1500);
      }, deviceIds.length * 100 + 500);
    };

    // Handle login form submission
    window.handleLogin = function(event) {
      event.preventDefault();
      const usernameInput = document.getElementById('login-username').value;
      const passwordInput = document.getElementById('login-password').value;
      const expectedUsername = ${jsUsername};
      const expectedPassword = ${jsPassword};

      if (usernameInput === expectedUsername && passwordInput === expectedPassword) {
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
      } else {
        document.getElementById('login-error').style.display = 'block';
      }
    };
  </script>
${contentEnd}
</body>
</html>
  `.trim();
}

/**
 * Check if a device is a router/switch that should show WiFi admin panel
 */
export function isRouterDevice(device: CanvasDevice): boolean {
  return device.type === 'router' || device.type === 'switchL2' || device.type === 'switchL3';
}

/**
 * Get default WiFi configuration for a router
 */
function getDefaultWifiConfig(device: CanvasDevice): WifiAdminConfig {
  return {
    enabled: device.wifi?.enabled ?? false,
    ssid: device.wifi?.ssid || `${device.name}_WiFi`,
    security: device.wifi?.security || 'wpa2',
    password: device.wifi?.password || 'password123',
    channel: device.wifi?.channel || '2.4GHz',
    mode: device.wifi?.mode || 'ap',
    hidden: false,
    maxClients: 32,
  };
}

function getRouterWifiConfig(device: CanvasDevice, state?: SwitchState): WifiAdminConfig {
  const wlan = state?.ports?.['wlan0'];
  const wlanWifi = wlan?.wifi;
  const base = getDefaultWifiConfig(device);

  if (!wlanWifi) return base;

  return {
    enabled: !wlan?.shutdown && wlanWifi.mode !== 'disabled',
    ssid: wlanWifi.ssid || base.ssid,
    security: wlanWifi.security || base.security,
    password: wlanWifi.password || base.password,
    channel: (wlanWifi.channel as '2.4GHz' | '5GHz') || base.channel,
    mode: (wlanWifi.mode === 'client' ? 'client' : 'ap'),
    hidden: base.hidden,
    maxClients: base.maxClients,
  };
}

/**
 * Generate router admin page content for HTTP access
 */
export function generateRouterAdminPage(device: CanvasDevice, language: string, state?: SwitchState, connectedIotDevices?: ConnectedIoTDevice[], availableIotDevices?: AvailableIoTDevice[], username?: string, password?: string, activeTab?: string): string {
  const interfaceIp = state?.ports ? Object.values(state.ports).find((p) => p?.ipAddress && !p.shutdown)?.ipAddress : undefined;
  const config: RouterWebConfig = {
    wifi: getRouterWifiConfig(device, state),
    deviceName: device.name,
    deviceIp: interfaceIp || device.ip || '192.168.1.1',
    deviceId: device.id,
    adminPassword: 'admin',
    username: username,
    password: password,
    connectedIotDevices: connectedIotDevices || [],
    availableIotDevices: availableIotDevices || [],
    language: language,
  };

  return generateWifiControlPanelHTML(config, activeTab);
}
