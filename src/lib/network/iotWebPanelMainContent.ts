import { CanvasDevice } from '@/components/network/NetworkTopology/types/networkTopology.types';
import { sanitizeHTML } from '@/lib/security/sanitizer';
import { colors, withAlpha } from '@/lib/design-tokens/colors';
import { generateIotPanelStyles } from './iotWebPanel.styles';
import { generateIotPanelScript } from './iotWebPanel.script';
import { IFRAME_FONT_FACES_CSS, GEIST_MONO_STACK } from '@/lib/design-tokens/iframeFonts';
import { isIotPanelAuthenticated } from './adminSessionManager';

export const generateIotWebPanelContent = (
  iotDevices: CanvasDevice[],
  language: string,
  routerId?: string,
  routerSsid?: string,
  topologyConnections?: { sourceDeviceId: string; targetDeviceId: string; from?: string; to?: string }[],
  isAuthenticated?: boolean,
): string => {
  const isTurkish = language === 'tr';
  const isAuth = isAuthenticated !== undefined ? isAuthenticated : isIotPanelAuthenticated();

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
      if (routerSsid && device.wifi?.ssid === routerSsid && device.wifi?.enabled && !(device.wifi?.powerDisabled ?? false)) {
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
        if (device.wifi?.enabled && !(device.wifi?.powerDisabled ?? false)) {
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
      const safeDeviceId = sanitizeHTML(device.id);

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
        <button type="button" data-iot-device-id="${safeDeviceId}" class="connect-button">
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
          ${IFRAME_FONT_FACES_CSS}
          ${generateIotPanelStyles()}
          .container {
            background-color: ${colors.common.white};
            border-radius: 8px;
            box-shadow: 0 4px 12px ${withAlpha(colors.common.black, 0.08)};
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
            border: 1px solid ${colors.neutral['400']};
            border-radius: 5px;
            box-sizing: border-box;
            font-size: 16px;
          }
          .login-button {
            background-color: var(--color-success-500);
            color: ${colors.common.white};
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
            background-color: ${colors.red['100']};
            border-color: ${colors.red.light};
            opacity: 0.7;
          }
          .iot-device-card.connected {
            background-color: ${colors.green['100']};
            border-color: ${colors.green['300']};
          }
          .iot-device-card.connected-inactive {
            background-color: ${colors.amber['100']};
            border-color: ${colors.amber['200']};
          }
          .iot-device-card.active {
            background-color: var(--color-primary-100);
            border-color: ${colors.sky['200']};
          }
          .iot-device-card.inactive {
            background-color: ${colors.neutral.soft};
            border-color: var(--color-secondary-300);
            opacity: 0.7;
          }
          .iot-device-card.offline {
            background-color: ${colors.neutral['450']};
            border-color: ${colors.neutral.medium};
            opacity: 0.6;
          }
          .iot-device-card.wifi-disabled {
            background-color: var(--color-warning-100);
            border-color: ${colors.amber.light};
          }
          .iot-device-card.powered-off.wifi-disabled {
            background-color: ${colors.neutral['450']};
            border-color: ${colors.neutral.medium};
          }
          .device-info {
            flex: 1;
          }
          .device-name {
            font-weight: 600;
            font-size: 16px;
            color: ${colors.neutral.dark};
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
            font-family: ${GEIST_MONO_STACK};
          }
          .device-rules,
          .device-rule-count {
            font-size: 12px;
            color: ${colors.green['800']};
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
            color: ${colors.green['800']};
            font-weight: 500;
          }
          .device-status.online-inactive {
            color: ${colors.amber['800']};
            font-weight: 500;
          }
          .device-status.active {
            color: ${colors.theme.primaryHover};
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
            box-shadow: 0 4px 12px ${withAlpha(colors.common.black, 0.1)};
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
            color: ${colors.neutral.dark};
          }
          .connect-button {
            background-color: var(--color-primary-500);
            color: ${colors.common.white};
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
            color: ${colors.common.white};
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
            color: ${colors.common.white};
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
            background-color: ${colors.common.white};
            border: 1px solid var(--color-secondary-200);
            border-radius: 8px;
            box-shadow: 0 4px 12px ${withAlpha(colors.common.black, 0.15)};
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
            color: ${colors.neutral.dark};
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
            border: 1px solid ${colors.neutral['400']};
            border-radius: 5px;
            box-sizing: border-box;
            font-size: 14px;
          }
          .settings-button {
            width: 100%;
            background-color: var(--color-primary-500);
            color: ${colors.common.white};
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
        </style>
      </head>
      <body>
        <div class="container">
          <h1>${isTurkish ? 'IoT Web Paneli' : 'IoT Web Panel'}</h1>
          
          <form id="loginSection" class="login-form ${isAuth ? 'hidden' : ''}" action="javascript:void(0);">
            <div class="form-group">
              <label for="username">${isTurkish ? 'Kullanıcı Adı' : 'Username'}:</label>
              <input type="text" id="username" value="admin" placeholder="${isTurkish ? 'Kullanıcı adı girin' : 'Enter username'}" autocapitalize="none" autocorrect="off" />
            </div>
            <div class="form-group">
              <label for="password">${isTurkish ? 'Parola' : 'Password'}:</label>
              <input type="password" id="password" placeholder="${isTurkish ? 'Parola girin' : 'Enter password'}" autocapitalize="none" autocorrect="off" />
            </div>
            <button type="submit" id="iotLoginButton" class="login-button">
              ${isTurkish ? 'Giriş Yap' : 'Login'}
            </button>
            <div id="errorMessage" class="error-message">
              ${isTurkish ? 'Hatalı kullanıcı adı veya parola!' : 'Incorrect username or password!'}
            </div>
          </form>

          <div id="deviceSection" class="${isAuth ? '' : 'hidden'}">
            <button type="button" class="settings-icon" id="settingsToggle" title="${isTurkish ? 'Ayarlar' : 'Settings'}" aria-label="${isTurkish ? 'Ayarları aç' : 'Open settings'}">
              ⚙️ 
            </button>
            <div id="settingsPopup" class="settings-popup">
              <div class="settings-popup-title">${isTurkish ? 'Ayarlar' : 'Settings'}</div>
              <div class="settings-option">
                <label>${isTurkish ? 'Parola Değiştir' : 'Change Password'}</label>
                <input type="password" id="newPassword" class="settings-input" placeholder="${isTurkish ? 'Yeni parola' : 'New password'}" />
                <input type="password" id="confirmPassword" class="settings-input" style="margin-top: 5px;" placeholder="${isTurkish ? 'Parolayı onayla' : 'Confirm password'}" />
                <button type="button" class="settings-button" id="changePasswordButton">
                  ${isTurkish ? 'Değiştir' : 'Change'}
                </button>
                <div id="passwordSuccess" class="password-success">${isTurkish ? 'Parola başarıyla değiştirildi!' : 'Password changed successfully!'}</div>
                <div id="passwordError" class="password-error">${isTurkish ? 'Parolalar eşleşmiyor!' : 'Passwords do not match!'}</div>
              </div>
              <div class="settings-option">
                <button type="button" class="settings-button logout" id="logoutButton">
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
          ${generateIotPanelScript(isAuth)}
        </script>
      </body>
    </html>
  `;
};
