
import { CanvasDevice } from '@/components/network/networkTopology.types';
import { sanitizeHTML, safeJSONForHTML } from '@/lib/security/sanitizer';

export type IotRule = {
  id: string;
  condition: string;
  action: string;
  enabled?: boolean;
};

export const generateIotWebPanelContent = (
  iotDevices: CanvasDevice[],
  language: string,
  routerId?: string,
  routerSsid?: string,
  topologyConnections?: { sourceDeviceId: string; targetDeviceId: string; from?: string; to?: string }[],
): string => {
  const isTurkish = language === 'tr';

  // Filter IoT devices based on router if routerId is provided
  const filteredIotDevices = routerId
    ? iotDevices.filter(device => {
        // Check if device is connected via wired connection to this router
        if (topologyConnections) {
          const isWiredConnected = topologyConnections.some(c =>
            (c.sourceDeviceId === routerId && c.targetDeviceId === device.id) ||
            (c.targetDeviceId === routerId && c.sourceDeviceId === device.id)
          );
          if (isWiredConnected) {
            return true;
          }
        }
        // Check if device is connected via WiFi to this router's SSID
        if (routerSsid && device.wifi?.ssid === routerSsid && device.wifi?.enabled) {
          return true;
        }
        // If no router-specific connection found, don't include this device
        return false;
      })
    : iotDevices;

  const iotDeviceListHtml = filteredIotDevices.length > 0
    ? filteredIotDevices.map(device => {
        const isPoweredOff = device.status === 'offline';
        const isActive = device.iot?.collaborationEnabled ?? true;
        
        // Check if device is actually connected to the network
        // If viewing from a specific router (routerSsid provided), check connection to that router
        // If viewing global IoT panel (no routerSsid), check if device has any connection
        const isConnectedToNetwork = topologyConnections?.some(conn => {
          const isWiredConnected = conn.sourceDeviceId === device.id || conn.targetDeviceId === device.id;
          if (isWiredConnected) return true;
          
          // WiFi connection check
          if (device.wifi?.enabled) {
            // If routerSsid is provided, check connection to that specific router
            if (routerSsid) {
              return device.wifi.ssid === routerSsid;
            }
            // If no routerSsid (global panel), check if device has any WiFi connection
            return !!device.wifi.ssid;
          }
          
          return false;
        });

        const cardClass = isPoweredOff ? 'powered-off' : isConnectedToNetwork ? (isActive ? 'connected' : 'connected-inactive') : (isActive ? 'active' : 'inactive');
        const statusText = isPoweredOff
          ? (isTurkish ? 'Kapalı' : 'Offline')
          : isConnectedToNetwork
            ? (isActive ? (isTurkish ? 'Çevrimiçi' : 'Online') : (isTurkish ? 'Çevrimiçi (Pasif)' : 'Online (Inactive)'))
            : (isActive ? (isTurkish ? 'Aktif' : 'Active') : (isTurkish ? 'Pasif' : 'Inactive'));
        const statusClass = isPoweredOff ? 'offline' : isConnectedToNetwork ? (isActive ? 'online' : 'online-inactive') : (isActive ? 'active' : 'inactive');

        const safeName = sanitizeHTML(device.name || device.id);
        const ruleCount = device.iot?.rules?.length ?? 0;
        const hasSimpleProgramming = ruleCount > 0;
        // Using safeJSONForHTML for JS context to prevent syntax errors and maintain data integrity.
        // We also escape double quotes for the HTML attribute context.
        const jsDeviceId = safeJSONForHTML(device.id).replace(/"/g, '&quot;');

        return `
      <div class="iot-device-card ${cardClass}">
        <div class="device-info">
          <span class="device-name">${safeName}</span>
          <div class="device-details">
            <span class="device-ip">${isTurkish ? 'IP' : 'IP'}: ${sanitizeHTML(device.ip || '-')}</span>
            <span class="device-mac">${isTurkish ? 'MAC' : 'MAC'}: ${sanitizeHTML(device.macAddress || '-')}</span>
            ${hasSimpleProgramming ? `
            <span class="device-rules">${isTurkish ? 'Basit Programlama' : 'Simple Programming'}: ${isTurkish ? 'Var' : 'Yes'}</span>
            <span class="device-rule-count">${isTurkish ? 'Kural Sayısı' : 'Rule Count'}: ${ruleCount}</span>
            ` : ''}
          </div>
          <div class="device-status ${statusClass}">${statusText}</div>
        </div>
        <button onclick="window.parent.postMessage({ type: 'open-iot-device', deviceId: ${jsDeviceId} }, '*')" class="connect-button">
          ${isTurkish ? 'Bağlan' : 'Connect'}
        </button>
      </div>
    `;
      }).join('')
    : `<p class="no-devices">${isTurkish ? 'Hiç IoT cihazı bulunamadı.' : 'No IoT devices found.'}</p>`;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${isTurkish ? 'IoT Web Paneli' : 'IoT Web Panel'}</title>
        <style>
          :root {
            --color-primary-500: #3b82f6;
            --color-primary-700: #1d4ed8;
            --color-secondary-500: #64748b;
            --color-secondary-600: #475569;
            --color-secondary-200: #e2e8f0;
            --color-secondary-300: #cbd5e1;
            --color-success-500: #22c55e;
            --color-success-600: #16a34a;
            --color-error-500: #ef4444;
            --color-error-600: #dc2626;
          }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f0f2f5;
            color: #333;
            margin: 0;
            padding: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            position: relative;
          }
          .container {
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
            padding: 30px;
            max-width: 600px;
            width: 100%;
            box-sizing: border-box;
          }
          h1 {
            color: var(--color-primary-700);
            text-align: center;
            margin-bottom: 25px;
            font-size: 24px;
            font-weight: 600;
          }
          .login-form {
            text-align: center;
          }
          .form-group {
            margin-bottom: 20px;
            text-align: left;
          }
          label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
            color: var(--color-secondary-600);
          }
          input[type="text"],
          input[type="password"] {
            width: 100%;
            padding: 10px 12px;
            border: 1px solid #ced4da;
            border-radius: 5px;
            box-sizing: border-box;
            font-size: 16px;
          }
          .login-button {
            background-color: var(--color-success-500);
            color: white;
            border: none;
            border-radius: 5px;
            padding: 12px 25px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 600;
            transition: background-color 0.2s ease;
            width: 100%;
          }
          .login-button:hover {
            background-color: var(--color-success-600);
          }
          .error-message {
            color: var(--color-error-500);
            font-size: 14px;
            margin-top: 10px;
            display: none;
          }
          .iot-device-card {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background-color: var(--color-secondary-200);
            border: 1px solid var(--color-secondary-200);
            border-radius: 6px;
            padding: 15px 20px;
            margin-bottom: 15px;
            transition: all 0.2s ease-in-out;
          }
          .device-list {
            display: grid;
            grid-template-columns: 1fr;
            gap: 12px;
          }
          .iot-device-card.powered-off {
            background-color: #f8d7da;
            border-color: #f5c6cb;
            opacity: 0.7;
          }
          .iot-device-card.connected {
            background-color: #dcfce7;
            border-color: #86efac;
          }
          .iot-device-card.connected-inactive {
            background-color: #fef3c7;
            border-color: #fde68a;
          }
          .iot-device-card.active {
            background-color: var(--color-primary-100);
            border-color: #7dd3fc;
          }
          .iot-device-card.inactive {
            background-color: #f3f4f6;
            border-color: var(--color-secondary-300);
            opacity: 0.7;
          }
          .iot-device-card.offline {
            background-color: #e2e3e5;
            border-color: #d6d8db;
            opacity: 0.6;
          }
          .iot-device-card.wifi-disabled {
            background-color: var(--color-warning-100);
            border-color: #ffeaa7;
          }
          .iot-device-card.powered-off.wifi-disabled {
            background-color: #e2e3e5;
            border-color: #d6d8db;
          }
          .device-info {
            flex: 1;
          }
          .device-name {
            font-weight: 600;
            font-size: 16px;
            color: #333;
          }
          .device-details {
            display: flex;
            flex-direction: column;
            gap: 2px;
            margin: 6px 0;
          }
          .device-ip,
          .device-mac {
            font-size: 12px;
            color: var(--color-muted-foreground);
            font-family: 'Courier New', monospace;
          }
          .device-rules,
          .device-rule-count {
            font-size: 12px;
            color: #166534;
            font-weight: 600;
          }
          .device-status {
            font-size: 13px;
            margin-top: 4px;
            color: var(--color-muted-foreground);
          }
          .device-status.offline {
            color: var(--color-error-500);
            font-weight: 500;
          }
          .device-status.online {
            color: #166534;
            font-weight: 500;
          }
          .device-status.online-inactive {
            color: #92400e;
            font-weight: 500;
          }
          .device-status.active {
            color: #0369a1;
            font-weight: 500;
          }
          .device-status.inactive {
            color: var(--color-secondary-500);
            font-weight: 500;
          }
          .device-status.disabled {
            color: var(--color-warning-700);
            font-weight: 500;
          }
          .iot-device-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          }
          @media (min-width: 768px) {
            .device-list {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }
            .iot-device-card {
              margin-bottom: 0;
            }
          }
          @media (min-width: 1200px) {
            .device-list {
              grid-template-columns: repeat(3, minmax(0, 1fr));
            }
          }
          @media (max-width: 640px) {
            .iot-device-card {
              flex-direction: column;
              align-items: flex-start;
              gap: 10px;
            }
            .connect-button {
              width: 100%;
            }
          }
          .device-name {
            font-size: 16px;
            font-weight: 500;
            color: #333;
          }
          .connect-button {
            background-color: var(--color-primary-500);
            color: white;
            border: none;
            border-radius: 5px;
            padding: 8px 15px;
            cursor: pointer;
            font-size: 14px;
            transition: background-color 0.2s ease;
          }
          .connect-button:hover {
            background-color: var(--color-primary-700);
          }
          .no-devices {
            text-align: center;
            color: var(--color-secondary-500);
            font-style: italic;
            margin-top: 20px;
          }
          .hidden {
            display: none;
          }
          .logout-button {
            position: absolute;
            top: 20px;
            right: 20px;
            background-color: var(--color-error-500);
            color: white;
            border: none;
            border-radius: 5px;
            padding: 8px 15px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: background-color 0.2s ease;
          }
          .logout-button:hover {
            background-color: var(--color-error-600);
          }
          .settings-icon {
            position: absolute;
            top: 20px;
            right: 20px;
            background-color: var(--color-secondary-500);
            color: white;
            border: none;
            border-radius: 5px;
            padding: 8px 12px;
            cursor: pointer;
            font-size: 18px;
            font-weight: 600;
            transition: background-color 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 40px;
            height: 40px;
          }
          .settings-icon:hover {
            background-color: var(--color-secondary-500);
          }
          .settings-popup {
            position: absolute;
            top: 70px;
            right: 20px;
            background-color: #ffffff;
            border: 1px solid var(--color-secondary-200);
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            padding: 15px;
            min-width: 250px;
            z-index: 1000;
            display: none;
          }
          .settings-popup.show {
            display: block;
          }
          .settings-popup-title {
            font-size: 14px;
            font-weight: 600;
            color: #333;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid var(--color-secondary-200);
          }
          .settings-option {
            margin-bottom: 15px;
          }
          .settings-option:last-child {
            margin-bottom: 0;
          }
          .settings-option label {
            display: block;
            font-size: 13px;
            font-weight: 500;
            color: var(--color-secondary-600);
            margin-bottom: 8px;
          }
          .settings-input {
            width: 100%;
            padding: 8px 10px;
            border: 1px solid #ced4da;
            border-radius: 5px;
            box-sizing: border-box;
            font-size: 14px;
          }
          .settings-button {
            width: 100%;
            background-color: var(--color-primary-500);
            color: white;
            border: none;
            border-radius: 5px;
            padding: 8px 12px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: background-color 0.2s ease;
            margin-top: 5px;
          }
          .settings-button:hover {
            background-color: var(--color-primary-700);
          }
          .settings-button.logout {
            background-color: var(--color-error-500);
          }
          .settings-button.logout:hover {
            background-color: var(--color-error-600);
          }
          .password-success {
            color: var(--color-success-500);
            font-size: 12px;
            margin-top: 5px;
            display: none;
          }
          .password-error {
            color: var(--color-error-500);
            font-size: 12px;
            margin-top: 5px;
            display: none;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>${isTurkish ? 'IoT Web Paneli' : 'IoT Web Panel'}</h1>
          
          <form id="loginSection" class="login-form" onsubmit="window.checkPassword(event); return false;">
            <div class="form-group">
              <label for="username">${isTurkish ? 'Kullanıcı Adı' : 'Username'}:</label>
              <input type="text" id="username" value="admin" placeholder="${isTurkish ? 'Kullanıcı adı girin' : 'Enter username'}" />
            </div>
            <div class="form-group">
              <label for="password">${isTurkish ? 'Parola' : 'Password'}:</label>
              <input type="password" id="password" placeholder="${isTurkish ? 'Parola girin' : 'Enter password'}" />
            </div>
            <button type="submit" class="login-button">
              ${isTurkish ? 'Giriş Yap' : 'Login'}
            </button>
            <div id="errorMessage" class="error-message">
              ${isTurkish ? 'Hatalı kullanıcı adı veya parola!' : 'Incorrect username or password!'}
            </div>
          </form>

          <div id="deviceSection" class="hidden">
            <button type="button" class="settings-icon" onclick="toggleSettingsPopup()">
              ⚙️
            </button>
            <div id="settingsPopup" class="settings-popup">
              <div class="settings-popup-title">${isTurkish ? 'Ayarlar' : 'Settings'}</div>
              <div class="settings-option">
                <label>${isTurkish ? 'Parola Değiştir' : 'Change Password'}</label>
                <input type="password" id="newPassword" class="settings-input" placeholder="${isTurkish ? 'Yeni parola' : 'New password'}" />
                <input type="password" id="confirmPassword" class="settings-input" style="margin-top: 5px;" placeholder="${isTurkish ? 'Parolayı onayla' : 'Confirm password'}" />
                <button type="button" class="settings-button" onclick="changePassword()">
                  ${isTurkish ? 'Değiştir' : 'Change'}
                </button>
                <div id="passwordSuccess" class="password-success">${isTurkish ? 'Parola başarıyla değiştirildi!' : 'Password changed successfully!'}</div>
                <div id="passwordError" class="password-error">${isTurkish ? 'Parolalar eşleşmiyor!' : 'Passwords do not match!'}</div>
              </div>
              <div class="settings-option">
                <button type="button" class="settings-button logout" onclick="logout()">
                  ${isTurkish ? 'Çıkış Yap' : 'Logout'}
                </button>
              </div>
            </div>
            <div class="device-list">
              ${iotDeviceListHtml}
            </div>
          </div>
        </div>

        <script>
          const safeStorage = {
            getItem: function(key) {
              try {
                return (typeof window !== 'undefined' && window.sessionStorage) ? window.sessionStorage.getItem(key) : (window['__iot_' + key] || null);
              } catch (e) {
                return window['__iot_' + key] || null;
              }
            },
            setItem: function(key, value) {
              try {
                if (typeof window !== 'undefined' && window.sessionStorage) {
                  window.sessionStorage.setItem(key, value);
                } else {
                  window['__iot_' + key] = value;
                }
              } catch (e) {
                window['__iot_' + key] = value;
              }
            },
            removeItem: function(key) {
              try {
                if (typeof window !== 'undefined' && window.sessionStorage) {
                  window.sessionStorage.removeItem(key);
                } else {
                  delete window['__iot_' + key];
                }
              } catch (e) {
                delete window['__iot_' + key];
              }
            }
          };

          window.checkPassword = function(e) {
            if (e) {
              e.preventDefault();
              e.stopPropagation();
            }
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const correctUsername = 'admin';
            const correctPassword = safeStorage.getItem('iotPanelPassword') || 'admin';
            
            if (username === correctUsername && password === correctPassword) {
              safeStorage.setItem('iotPanelAuthenticated', 'true');
              document.getElementById('loginSection').classList.add('hidden');
              document.getElementById('deviceSection').classList.remove('hidden');
            } else {
              const errorMessage = document.getElementById('errorMessage');
              errorMessage.style.display = 'block';
              document.getElementById('username').value = '';
              document.getElementById('password').value = '';
              document.getElementById('username').focus();
            }
          };

          window.checkAuthentication = function() {
            const isAuthenticated = safeStorage.getItem('iotPanelAuthenticated');
            if (isAuthenticated === 'true') {
              document.getElementById('loginSection').classList.add('hidden');
              document.getElementById('deviceSection').classList.remove('hidden');
            } else {
              document.getElementById('loginSection').classList.remove('hidden');
              document.getElementById('deviceSection').classList.add('hidden');
            }
          };

          window.logout = function() {
            safeStorage.removeItem('iotPanelAuthenticated');
            document.getElementById('loginSection').classList.remove('hidden');
            document.getElementById('deviceSection').classList.add('hidden');
            document.getElementById('username').value = 'admin';
            document.getElementById('password').value = '';
            document.getElementById('errorMessage').style.display = 'none';
            document.getElementById('settingsPopup').classList.remove('show');
          };

          window.toggleSettingsPopup = function() {
            const popup = document.getElementById('settingsPopup');
            popup.classList.toggle('show');
          };

          window.changePassword = function() {
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const successMessage = document.getElementById('passwordSuccess');
            const errorMessage = document.getElementById('passwordError');

            if (newPassword && newPassword === confirmPassword) {
              safeStorage.setItem('iotPanelPassword', newPassword);
              successMessage.style.display = 'block';
              errorMessage.style.display = 'none';
              document.getElementById('newPassword').value = '';
              document.getElementById('confirmPassword').value = '';
              
              // Hide success message after 3 seconds
              setTimeout(() => {
                successMessage.style.display = 'none';
              }, 3000);

              // Close popup after successful password change
              setTimeout(() => {
                document.getElementById('settingsPopup').classList.remove('show');
              }, 1500);
            } else {
              errorMessage.style.display = 'block';
              successMessage.style.display = 'none';
            }
          };

          // Close popup when clicking outside
          document.addEventListener('click', function(e) {
            const popup = document.getElementById('settingsPopup');
            const settingsIcon = document.querySelector('.settings-icon');
            if (popup && settingsIcon) {
              if (!popup.contains(e.target) && !settingsIcon.contains(e.target)) {
                popup.classList.remove('show');
              }
            }
          });

          document.getElementById('password').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
              checkPassword();
            }
          });

          document.getElementById('username').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
              document.getElementById('password').focus();
            }
          });

          // Check authentication on page load and run immediately
          window.addEventListener('load', window.checkAuthentication);
          window.checkAuthentication();
        </script>
      </body>
    </html>
  `;
};

export const generateIotDevicePageContent = (
  deviceId: string,
  deviceName: string,
  language: string,
  isActive: boolean = true,
  isPoweredOff: boolean = false,
  _kind: string = 'sensor',
  rules: IotRule[] = [],
  _sensorType: string = 'temperature',
  _iotDevices: CanvasDevice[] = [],
  _dataFlowDirection: 'input' | 'output' | 'input/output' = 'input',
  allDevices: CanvasDevice[] = []
): string => {
  const isTurkish = language === 'tr';
  const safeName = sanitizeHTML(deviceName);
  const safeId = sanitizeHTML(deviceId);
  // Use safeJSONForHTML for embedding strings in <script> blocks to prevent XSS and logic corruption.
  const jsId = safeJSONForHTML(deviceId);
  const sensorTypeLabels: Record<string, string> = {
    temperature: isTurkish ? 'Isı (Sıcaklık)' : 'Temperature',
    light: isTurkish ? 'Işık' : 'Light',
    humidity: isTurkish ? 'Nem' : 'Humidity',
    sound: isTurkish ? 'Ses' : 'Sound',
    motion: isTurkish ? 'Hareket' : 'Motion',
  };
  const topologySensorDevices = allDevices.filter(d =>
    d.type === 'iot' &&
    d.iot?.sensorType &&
    (
      d.iot?.dataFlowDirection === 'input' ||
      d.iot?.dataFlowDirection === 'input/output' ||
      d.iot?.kind === 'sensor' ||
      !d.iot?.dataFlowDirection
    )
  );
  const sensorOptionsHtml = topologySensorDevices.length > 0
    ? topologySensorDevices.map(d => {
        const sensor = d.iot?.sensorType || 'temperature';
        const label = sensorTypeLabels[sensor] || sensor;
        return `<option value="iot:${sanitizeHTML(d.id)}:${sanitizeHTML(sensor)}">${sanitizeHTML(d.name || d.id)} (${sanitizeHTML(label)})</option>`;
      }).join('')
    : Object.entries(sensorTypeLabels).map(([value, label]) => (
        `<option value="${sanitizeHTML(value)}">${sanitizeHTML(label)}</option>`
      )).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${isTurkish ? 'IoT Cihaz Yönetimi' : 'IoT Device Management'}: ${safeName}</title>
        <style>
          :root {
            --color-primary-500: #3b82f6;
            --color-primary-700: #1d4ed8;
            --color-secondary-500: #64748b;
            --color-secondary-600: #475569;
            --color-secondary-200: #e2e8f0;
            --color-secondary-300: #cbd5e1;
            --color-success-500: #22c55e;
            --color-success-600: #16a34a;
            --color-error-500: #ef4444;
            --color-error-600: #dc2626;
            --color-warning-100: #fef3c7;
            --color-warning-700: #b45309;
          }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f0f2f5;
            color: #333;
            margin: 0;
            padding: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .device-panel {
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
            padding: 30px;
            max-width: 500px;
            width: 100%;
            box-sizing: border-box;
            text-align: center;
          }
          h1 {
            color: var(--color-primary-700);
            margin-bottom: 25px;
            font-size: 22px;
            font-weight: 600;
          }
          .device-info {
            background-color: #f8f9fa;
            border-radius: 6px;
            padding: 20px;
            margin-bottom: 25px;
            text-align: left;
          }
          .device-info p {
            margin: 10px 0;
            font-size: 14px;
          }
          .device-info strong {
            color: var(--color-secondary-600);
            display: inline-block;
            width: 120px;
          }
          .toggle-section {
            margin-bottom: 25px;
          }
          .toggle-label {
            font-size: 16px;
            font-weight: 500;
            margin-bottom: 15px;
            display: block;
          }
          .toggle-switch {
            position: relative;
            display: inline-block;
            width: 60px;
            height: 34px;
          }
          .toggle-switch input {
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
            background-color: var(--color-success-500);
          }
          input:checked + .slider:before {
            transform: translateX(26px);
          }
          .status-text {
            margin-top: 10px;
            font-size: 14px;
            font-weight: 500;
          }
          .status-active {
            color: var(--color-success-500);
          }
          .status-inactive {
            color: var(--color-error-500);
          }
          .toggle-disabled {
            opacity: 0.5;
            pointer-events: none;
          }
          .power-off-message {
            background-color: var(--color-warning-100);
            border: 1px solid #ffc107;
            border-radius: 6px;
            padding: 15px;
            margin-bottom: 25px;
            text-align: center;
            color: var(--color-warning-700);
            font-size: 14px;
            font-weight: 500;
          }
          .back-button {
            background-color: var(--color-secondary-500);
            color: white;
            border: none;
            border-radius: 5px;
            padding: 12px 25px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 600;
            transition: background-color 0.2s ease;
            margin-top: 10px;
          }
          .back-button:hover {
            background-color: var(--color-secondary-500);
          }
          .programming-section {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            text-align: left;
          }
          .programming-title {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 15px;
            color: #333;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .rule-form {
            display: flex;
            flex-direction: column;
            gap: 10px;
            background: #f8f9fa;
            padding: 15px;
            border-radius: 6px;
            margin-bottom: 15px;
          }
          .rule-form select, .rule-form input {
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 13px;
          }
          .add-rule-btn {
            background: var(--color-primary-500);
            color: white;
            border: none;
            padding: 8px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 600;
          }
          .rule-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .rule-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #fff;
            border: 1px solid #eee;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 13px;
          }
          .delete-rule-btn {
            background: none;
            border: none;
            color: var(--color-error-500);
            font-size: 18px;
            cursor: pointer;
            padding: 0 5px;
          }
          .device-visual {
            font-size: 48px;
            margin-bottom: 15px;
            filter: grayscale(${isActive ? 0 : 1});
            transition: all 0.3s ease;
          }
        </style>
      </head>
      <body>
        <div class="device-panel">
          <h1>${safeName} ${isTurkish ? 'Yönetimi' : 'Management'}</h1>
          
          <div class="device-info">
            <p><strong>${isTurkish ? 'Cihaz ID' : 'Device ID'}:</strong> ${safeId}</p>
            <p><strong>${isTurkish ? 'Cihaz Adı' : 'Device Name'}:</strong> ${safeName}</p>
            <p><strong>${isTurkish ? 'Güç Durumu' : 'Power Status'}:</strong> ${isPoweredOff ? (isTurkish ? 'Kapalı' : 'Off') : (isTurkish ? 'Açık' : 'On')}</p>
            <p><strong>${isTurkish ? 'Durum' : 'Status'}:</strong> <span id="statusText" class="${isActive ? 'status-active' : 'status-inactive'}">${isActive ? (isTurkish ? 'Aktif' : 'Active') : (isTurkish ? 'Pasif' : 'Inactive')}</span></p>
          </div>

          ${isPoweredOff ? `
          <div class="power-off-message">
            ${isTurkish ? '⚠️ Cihaz kapalı. Ayarları değiştirmek için önce cihazı açın.' : '⚠️ Device is powered off. Turn on the device to change settings.'}
          </div>
          ` : ''}

          <div class="toggle-section ${isPoweredOff ? 'toggle-disabled' : ''}">
            <label class="toggle-label">${isTurkish ? 'Cihaz Durumu' : 'Device Status'}</label>
            <label class="toggle-switch">
              <input type="checkbox" id="deviceToggle" ${isActive ? 'checked' : ''} ${isPoweredOff ? 'disabled' : ''} onchange="toggleDevice()">
              <span class="slider"></span>
            </label>
            <div id="statusMessage" class="status-text ${isActive ? 'status-active' : 'status-inactive'}">
              ${isActive ? (isTurkish ? 'Cihaz aktif' : 'Device is active') : (isTurkish ? 'Cihaz pasif' : 'Device is inactive')}
            </div>
          </div>

          ${`
          <div class="programming-section ${isPoweredOff ? 'toggle-disabled' : ''}">
            <div class="programming-title">
              <span>⚙️ ${isTurkish ? 'Basit Programlama' : 'Simple Programming'}</span>
            </div>

            <div class="rule-form">
              <div style="font-size: 12px; margin-bottom: 5px; font-weight: 500;">${isTurkish ? 'Yeni Kural Ekle:' : 'Add New Rule:'}</div>
              <div style="display: flex; flex-direction: column; gap: 8px;">
                <div style="display: flex; align-items: center; gap: 5px;">
                  <span style="font-size: 12px; min-width: 35px;">${isTurkish ? 'EĞER' : 'IF'}</span>
                  <select id="sensorSelect" style="flex: 1;">
                    ${sensorOptionsHtml}
                  </select>
                  <select id="operatorSelect">
                    <option value=">">&gt;</option>
                    <option value="<">&lt;</option>
                    <option value="==">=</option>
                  </select>
                  <input type="number" id="thresholdInput" style="width: 50px;" value="25">
                </div>
                <div style="display: flex; align-items: center; gap: 5px;">
                  <span style="font-size: 12px; min-width: 35px;">${isTurkish ? 'O ZAMAN' : 'THEN'}</span>
                  <select id="targetDeviceSelect" style="flex: 1;">
                    <option value="this">${isTurkish ? 'Bu Cihaz' : 'This Device'}</option>
                    ${allDevices.filter(d => d.id !== deviceId && d.type === 'iot' && (d.iot?.dataFlowDirection === 'output' || d.iot?.dataFlowDirection === 'input/output' || d.iot?.kind === 'cooler' || d.iot?.kind === 'lamp' || d.iot?.kind === 'heater')).map(d => `
                      <option value="${sanitizeHTML(d.id)}">${sanitizeHTML(d.name || d.id)} ${d.iot?.kind ? '(' + sanitizeHTML(isTurkish ? (d.iot.kind === 'cooler' ? 'Soğutucu' : d.iot.kind === 'lamp' ? 'Lamba' : d.iot.kind === 'heater' ? 'Isıtıcı' : d.iot.kind) : d.iot.kind) + ')' : ''}</option>
                    `).join('')}
                  </select>
                  <select id="actionSelect">
                    <option value="ON">${isTurkish ? 'AÇ' : 'TURN ON'}</option>
                    <option value="OFF">${isTurkish ? 'KAPAT' : 'TURN OFF'}</option>
                  </select>
                </div>
                <button class="add-rule-btn" onclick="addRule()">${isTurkish ? 'Ekle' : 'Add Rule'}</button>
              </div>
            </div>

            <div class="rule-list" id="ruleList">
              ${(rules || []).map(rule => {
                const safeCondition = sanitizeHTML(rule.condition);
                const safeAction = sanitizeHTML(rule.action);
                const jsRuleId = safeJSONForHTML(rule.id).replace(/"/g, '&quot;');
                return `
                <div class="rule-item">
                  <span>${safeCondition} &rarr; ${safeAction}</span>
                  <button onclick="deleteRule(${jsRuleId})" class="delete-rule-btn">&times;</button>
                </div>
              `;}).join('')}
            </div>
          </div>
          `}

          <button type="button" class="back-button" onclick="goBack()" style="margin-top: 20px;">
            ${isTurkish ? 'Listeye Dön' : 'Back to List'}
          </button>
        </div>

        <script>
          const isPoweredOff = ${isPoweredOff};
          const deviceId = ${safeJSONForHTML(deviceId)};
          let rules = ${safeJSONForHTML(rules || [])};

          function escapeHtml(text) {
            if (!text) return '';
            return String(text)
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;');
          }

          function addRule() {
            if (isPoweredOff) return;

            const sensor = document.getElementById('sensorSelect').value;
            const operator = document.getElementById('operatorSelect').value;
            const threshold = document.getElementById('thresholdInput').value;
            const target = document.getElementById('targetDeviceSelect').value;
            const action = document.getElementById('actionSelect').value;

            const condition = \`\${sensor} \${operator} \${threshold}\`;
            const fullAction = target === 'this' ? action : \`\${target}:\${action}\`;

            const newRule = {
              id: Math.random().toString(36).substr(2, 9),
              condition,
              action: fullAction,
              enabled: true
            };

            rules.push(newRule);
            updateRuleList();
            saveRules();
          }

          function deleteRule(ruleId) {
            if (isPoweredOff) return;
            rules = rules.filter(r => r.id !== ruleId);
            updateRuleList();
            saveRules();
          }

          function updateRuleList() {
            const list = document.getElementById('ruleList');
            if (!list) return;
            list.textContent = '';
            rules.forEach(rule => {
              const row = document.createElement('div');
              row.className = 'rule-item';

              const label = document.createElement('span');
              label.textContent = rule.condition + ' → ' + rule.action;

              const delBtn = document.createElement('button');
              delBtn.className = 'delete-rule-btn';
              delBtn.textContent = '×';
              delBtn.addEventListener('click', function () {
                deleteRule(rule.id);
              });

              row.appendChild(label);
              row.appendChild(delBtn);
              list.appendChild(row);
            });
          }

          function toggleDevice() {
            if (isPoweredOff) return;

            const toggle = document.getElementById('deviceToggle');
            const statusText = document.getElementById('statusText');
            const statusMessage = document.getElementById('statusMessage');
            const deviceVisual = document.getElementById('deviceVisual');

            if (toggle.checked) {
              statusText.textContent = '${isTurkish ? 'Aktif' : 'Active'}';
              statusText.className = 'status-text status-active';
              statusMessage.textContent = '${isTurkish ? 'Cihaz aktif' : 'Device is active'}';
              statusMessage.className = 'status-text status-active';
              window.parent.postMessage({ type: 'toggle-iot-device', deviceId: ${jsId}, active: true }, '*');
            } else {
              statusText.textContent = '${isTurkish ? 'Pasif' : 'Inactive'}';
              statusText.className = 'status-text status-inactive';
              statusMessage.textContent = '${isTurkish ? 'Cihaz pasif' : 'Device is inactive'}';
              statusMessage.className = 'status-text status-inactive';
              window.parent.postMessage({ type: 'toggle-iot-device', deviceId: ${jsId}, active: false }, '*');
            }
            updateRuleList();
          }

          function saveRules() {
            window.parent.postMessage({ type: 'update-iot-rules', deviceId, rules }, '*');
          }

          function goBack() {
            window.parent.postMessage({ type: 'back-to-iot-list' }, '*');
          }
        </script>
      </body>
    </html>
  `;
};
