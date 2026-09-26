import { colors } from '@/lib/design-tokens/colors';
import { safeJSONForHTML } from '@/lib/security/sanitizer';

/**
 * Parameters for the generated router admin <script> block.
 *
 * IMPORTANT: every `js*` field MUST already be encoded with
 * `safeJSONForHTML()` by the caller (see WifiControlPanel.tsx). They are
 * interpolated verbatim into the script body, so they are expected to be
 * complete JSON literals such as `"router-1"`.
 *
 * Do NOT call `safeJSONForHTML()` on these values again inside this module:
 * that double-encodes them, and the browser then sees the literal string
 * `"\"router-1\""` instead of `router-1`, which silently breaks every
 * deviceId / credential comparison at runtime.
 *
 * The single `deviceId` field is the opposite: it is the raw value and is
 * encoded here at the point of use.
 *
 * Regression coverage: src/tests/components/network/WifiControlPanel.test.ts
 * ("wifi admin script JSON embedding").
 */
interface WifiAdminScriptParams {
  isTurkish: boolean;
  jsCurrentSsidList: string;
  jsConnectedClientsData: string;
  jsMacFilterList: string;
  jsDeviceId: string;
  jsUsername: string;
  jsPassword: string;
  isAuthenticated: boolean;
  jsSsid: string;
  jsSecurity: string;
  jsWifiPassword: string;
  jsChannel: string;
  deviceId?: string;
}

export function getWifiControlPanelScripts(params: WifiAdminScriptParams): string {
  const {
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
  } = params;

  return `
  <script>
    var isTurkish = ${isTurkish ? 'true' : 'false'};
    function escH(s) { return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
    var selectedIotDevices = new Set();
    var currentSsidList = ${jsCurrentSsidList};
    window.currentSsidList = currentSsidList;

    var connectedClientsData = ${jsConnectedClientsData};
    var currentMacFilterList = ${jsMacFilterList};
    if (!Array.isArray(currentMacFilterList)) currentMacFilterList = [];
    window.currentMacFilterList = currentMacFilterList;

    window.handleProfileSecurityChange = function(val) {
      var pWrap = document.getElementById('profile-password-wrap');
      if (pWrap) pWrap.style.display = val === 'open' ? 'none' : 'block';
    };

    window.toggleMacFilterSection = function() {
      var enabled = !!document.getElementById('mac-filter-enabled')?.checked;
      var body = document.getElementById('mac-filter-body');
      if (body) body.style.display = enabled ? 'block' : 'none';
      saveAllWifiSettings();
    };

    window.renderMacFilterList = function() {
      var container = document.getElementById('mac-filter-list-container');
      var countEl = document.getElementById('mac-list-count');
      if (!container) return;

      var list = window.currentMacFilterList || [];
      if (countEl) {
        countEl.textContent = list.length + ' ' + (isTurkish ? 'adres' : 'items');
      }

      if (list.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:12px;color:var(--color-secondary-400);">' +
          (isTurkish ? 'Filtrelenmiş MAC adresi bulunmuyor.' : 'No filtered MAC addresses.') + '</div>';
        return;
      }

      container.innerHTML = list.map(function(mac, idx) {
        var safeMac = String(mac).replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        return '<div class="mono" style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:${colors.common.white};border:1px solid var(--color-secondary-200);border-radius:6px;margin-bottom:6px;font-size:13px;color:var(--color-secondary-800);">' +
          '<span>🛡️ ' + safeMac + '</span>' +
          '<button type="button" class="btn btn-danger" style="padding:2px 8px;font-size:11px;" onclick="removeMacFromFilter(' + idx + ')" title="' + (isTurkish ? 'Sil' : 'Remove') + '">🗑️</button>' +
        '</div>';
      }).join('');
    };

    window.addManualMac = function() {
      var input = document.getElementById('manual-mac-input');
      if (!input) return;
      var val = (input.value || '').trim();
      if (!val) {
        alert('❌ ' + (isTurkish ? 'Lütfen geçerli bir MAC adresi girin' : 'Please enter a valid MAC address'));
        return;
      }

      var clean = val.toLowerCase().replace(/[^0-9a-f]/g, '');
      if (clean.length === 12) {
        val = clean.match(/.{1,2}/g).join(':');
      } else if (!/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(val)) {
        alert('❌ ' + (isTurkish ? 'Geçersiz MAC adresi formatı. Örnek: 00:11:22:33:44:55' : 'Invalid MAC address format. Example: 00:11:22:33:44:55'));
        return;
      }

      if (!window.currentMacFilterList) window.currentMacFilterList = [];
      var normalizedVal = val.toLowerCase();
      var exists = window.currentMacFilterList.some(function(item) {
        return item.toLowerCase() === normalizedVal;
      });

      if (exists) {
        alert('⚠️ ' + (isTurkish ? 'Bu MAC adresi zaten listede var' : 'This MAC address is already in the list'));
        return;
      }

      window.currentMacFilterList.push(val);
      input.value = '';
      window.renderMacFilterList();
      saveAllWifiSettings();
    };

    window.removeMacFromFilter = function(index) {
      if (window.currentMacFilterList && window.currentMacFilterList[index] !== undefined) {
        window.currentMacFilterList.splice(index, 1);
        window.renderMacFilterList();
        saveAllWifiSettings();
      }
    };

    window.toggleDhcpServerSection = function() {
      var enabled = !!document.getElementById('dhcp-server-enabled')?.checked;
      var body = document.getElementById('dhcp-server-body');
      if (body) body.style.display = enabled ? 'block' : 'none';
      saveAllWifiSettings();
    };

    window.saveMacFilterSettings = function() {
      saveAllWifiSettings();
      alert('✅ ' + (isTurkish ? 'Gelişmiş kablosuz MAC filtreleme ve DHCP ayarları kaydedildi.' : 'Advanced wireless MAC filtering and DHCP settings saved.'));
    };

    function showTab(tabId) {
      const tabs = ['wireless', 'status', 'advanced', 'iot', 'admin'];
      tabs.forEach(id => {
        const el = document.getElementById(id + '-tab');
        if (el) el.style.display = id === tabId ? 'block' : 'none';
      });
      document.querySelectorAll('.nav-tab').forEach(tab => {
        if (tab.getAttribute('data-tab') === tabId) {
          tab.classList.add('active');
        } else {
          tab.classList.remove('active');
        }
      });
      try { window.parent.postMessage({ type: 'router-admin-tab-change', tab: tabId }, '*'); } catch {}
    }

    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', function() {
        showTab(this.getAttribute('data-tab') || 'wireless');
      });
    });

    window.toggleIotDeviceSelection = function(deviceId) {
      const checkbox = document.querySelector('.iot-checkbox[data-device-id="' + deviceId + '"]');
      const card = document.querySelector('.iot-device-card[data-device-id="' + deviceId + '"]');
      if (selectedIotDevices.has(deviceId)) {
        selectedIotDevices.delete(deviceId);
        if (checkbox) checkbox.checked = false;
        if (card) {
          card.style.borderColor = 'var(--color-secondary-200)';
          card.style.background = '${colors.topology.deviceText}';
        }
      } else {
        selectedIotDevices.add(deviceId);
        if (checkbox) checkbox.checked = true;
        if (card) {
          card.style.borderColor = 'var(--color-primary-500)';
          card.style.background = '${colors.sky['50']}';
        }
      }
    };

    window.disconnectIotDevice = function(deviceId) {
      if (!confirm('⚠️ ' + (isTurkish ? 'Bu cihazın kablosuz bağlantısını kesmek istediğinizden emin misiniz?' : 'Are you sure you want to disconnect this device from the network?'))) return;
      try {
        window.parent.postMessage({
          type: 'router-admin-disconnect-iot',
          deviceId: ${jsDeviceId},
          payload: { iotDeviceId: deviceId }
        }, '*');
      } catch(err) {
        console.warn('Could not disconnect device:', err);
      }
    };

    window.renewIotDevice = function(deviceId) {
      try {
        window.parent.postMessage({
          type: 'router-admin-renew-iot',
          deviceId: ${jsDeviceId},
          payload: { iotDeviceId: deviceId }
        }, '*');
      } catch(err) {
        console.warn('Could not renew device IP:', err);
      }
    };

    window.clearIotSelection = function() {
      selectedIotDevices.clear();
      document.querySelectorAll('.iot-checkbox').forEach(cb => cb.checked = false);
      document.querySelectorAll('.iot-device-card.available').forEach(card => {
        card.style.borderColor = 'var(--color-secondary-200)';
        card.style.background = '${colors.topology.deviceText}';
      });
    };

    window.saveSelectedIotDevices = function() {
      const deviceIds = Array.from(selectedIotDevices);
      if (deviceIds.length === 0) {
        alert('❌ ' + (isTurkish ? 'Lütfen en az bir cihaz seçin' : 'Please select at least one device'));
        return;
      }
      
      const btn = document.getElementById('save-iot-btn');
      if (btn) {
        btn.innerHTML = '💾 ' + (isTurkish ? 'Bağlanıyor...' : 'Connecting...');
        btn.disabled = true;
      }

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
            }, '*');
          } catch (err) {}
        }, index * 100);
      });
    };

    var currentDeviceId = ${jsDeviceId};
    var currentAdminUser = ${jsUsername};
    var currentAdminPass = ${jsPassword};
    window.__router_auth_state = ${isAuthenticated ? 'true' : 'false'};
    if (window.__router_auth_state) {
      window['__router_admin_auth_' + currentDeviceId] = 'true';
    }

    window.handleLogin = function(event) {
      try {
        if (event) {
          event.preventDefault();
          if (typeof event.stopPropagation === 'function') event.stopPropagation();
        }
        const get = (id) => document.getElementById(id);
        const usernameEl = get('login-username');
        const passwordEl = get('login-password');
        const loginForm = get('login-form');
        const mainContent = get('main-content');
        const loginError = get('login-error');
        const usernameInput = usernameEl ? String(usernameEl.value || '').trim() : '';
        const passwordInput = passwordEl ? String(passwordEl.value || '').trim() : '';

        if (usernameInput.toLowerCase() === String(currentAdminUser || '').trim().toLowerCase() && passwordInput === String(currentAdminPass || '').trim()) {
          window.__router_auth_state = true;
          window['__router_admin_auth_' + currentDeviceId] = 'true';
          try {
            window.parent.postMessage({ type: 'router-admin-auth-success', deviceId: currentDeviceId }, '*');
          } catch (_) {}
          try {
            if (typeof sessionStorage !== 'undefined' && sessionStorage) {
              sessionStorage.setItem('router_admin_auth_' + currentDeviceId, 'true');
            }
          } catch (_) {}
          try {
            if (typeof localStorage !== 'undefined' && localStorage) {
              localStorage.setItem('router_admin_auth_' + currentDeviceId, 'true');
            }
          } catch (_) {}
          if (loginForm) loginForm.style.display = 'none';
          if (mainContent) mainContent.style.display = 'block';
        } else {
          if (loginError) loginError.style.display = 'block';
        }
      } catch (err) {
        console.warn('Router admin handleLogin error:', err);
      }
      return false;
    };

    window.handleLogout = function() {
      window.__router_auth_state = false;
      window['__router_admin_auth_' + currentDeviceId] = null;
      try {
        window.parent.postMessage({ type: 'router-admin-logout', deviceId: currentDeviceId }, '*');
      } catch (_) {}
      try {
        if (typeof sessionStorage !== 'undefined' && sessionStorage) {
          sessionStorage.removeItem('router_admin_auth_' + currentDeviceId);
        }
      } catch (_) {}
      try {
        if (typeof localStorage !== 'undefined' && localStorage) {
          localStorage.removeItem('router_admin_auth_' + currentDeviceId);
        }
      } catch (_) {}
      var loginForm = document.getElementById('login-form');
      var mainContent = document.getElementById('main-content');
      var loginError = document.getElementById('login-error');
      if (loginError) loginError.style.display = 'none';
      if (mainContent) mainContent.style.display = 'none';
      if (loginForm) loginForm.style.display = 'flex';
      var uInput = document.getElementById('login-username');
      var pInput = document.getElementById('login-password');
      if (uInput) uInput.value = '';
      if (pInput) pInput.value = '';
    };

    window.resetCredentialsForm = function() {
      const get = (id) => document.getElementById(id);
      if (get('cred-current-password')) get('cred-current-password').value = '';
      if (get('cred-new-username')) get('cred-new-username').value = currentAdminUser;
      if (get('cred-new-password')) get('cred-new-password').value = '';
      if (get('cred-confirm-password')) get('cred-confirm-password').value = '';
      if (get('cred-error')) get('cred-error').style.display = 'none';
      if (get('cred-success')) get('cred-success').style.display = 'none';
    };

    window.handleSavePrimarySettings = function(event) {
      if (event) event.preventDefault();
      saveAllWifiSettings();
      alert('✅ ' + (isTurkish ? 'Ana kablosuz ayarlar kaydedildi.' : 'Primary wireless settings saved.'));
      return false;
    };

    window.handleSaveCredentials = function(event) {
      try {
        event.preventDefault();
        const get = (id) => document.getElementById(id);
        const errorEl = get('cred-error');
        const successEl = get('cred-success');
        if (errorEl) errorEl.style.display = 'none';
        if (successEl) successEl.style.display = 'none';

        const currentPass = (get('cred-current-password') ? get('cred-current-password').value : '') || '';
        const newUsername = ((get('cred-new-username') ? get('cred-new-username').value : '') || '').trim();
        const newPass = (get('cred-new-password') ? get('cred-new-password').value : '') || '';
        const confirmPass = (get('cred-confirm-password') ? get('cred-confirm-password').value : '') || '';

        const showCredError = (msgTr, msgEn) => {
          if (errorEl) { errorEl.textContent = '❌ ' + (isTurkish ? msgTr : msgEn); errorEl.style.display = 'block'; }
        };

        if (currentPass !== currentAdminPass) { showCredError('Mevcut şifre hatalı!', 'Current password is incorrect!'); return; }
        if (!newUsername) { showCredError('Kullanıcı adı boş olamaz.', 'Username cannot be empty.'); return; }
        if (newPass.length < 4) { showCredError('Yeni şifre en az 4 karakter olmalı.', 'New password must be at least 4 characters.'); return; }
        if (newPass !== confirmPass) { showCredError('Yeni şifreler eşleşmiyor!', 'New passwords do not match!'); return; }

        currentAdminUser = newUsername;
        currentAdminPass = newPass;

        try {
          window.parent.postMessage({
            type: 'router-admin-save-credentials',
            deviceId: ${safeJSONForHTML(deviceId || '')},
            payload: { username: newUsername, password: newPass }
          }, '*');
        } catch {}

        if (successEl) successEl.style.display = 'block';
      } catch (err) {}
    };

    // --- Multi-SSID Management Functions ---
    window.renderSsidList = function() {
      var container = document.getElementById('ssid-profiles-container');
      if (!container) return;

      if (!currentSsidList || currentSsidList.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:16px;color:var(--color-secondary-400);">' +
          (isTurkish ? 'Yapılandırılmış ek SSID profili yok.' : 'No configured SSID profiles.') + '</div>';
        return;
      }

      container.innerHTML = currentSsidList.map(function(item, idx) {
        var isPrimary = idx === 0;
        var bandText = item.band === '5GHz' ? '5 GHz' : (item.band === '2.4GHz' ? '2.4 GHz' : (isTurkish ? 'Çift Bant' : 'Dual Band'));
        var secText = (item.security || 'open').toUpperCase();
        var statusBadge = item.enabled
          ? '<span class="status-badge" style="background:var(--color-success-500);">' + (isTurkish ? '● Etkin' : '● Active') + '</span>'
          : '<span class="status-badge" style="background:var(--color-secondary-400);">' + (isTurkish ? '○ Pasif' : '○ Disabled') + '</span>';

        var safeDisplayName = escH(item.name || item.ssid);
        var safeSsid = escH(item.ssid);
        var safeSecText = escH(secText);
        var safeBandText = escH(bandText);

        return '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:${colors.common.white};border:1px solid var(--color-secondary-200);border-radius:8px;margin-bottom:8px;gap:12px;">' +
          '<div style="min-w-0;">' +
            '<div style="font-weight:600;font-size:14px;color:var(--color-secondary-900);display:flex;align-items:center;gap:8px;">' +
              '<span>📶 ' + safeDisplayName + '</span>' +
              (isPrimary ? '<span class="badge badge-primary">' + (isTurkish ? 'Ana Yayın' : 'Primary') + '</span>' : '') +
              (item.hidden ? '<span class="badge badge-warning">🙈 ' + (isTurkish ? 'Gizli' : 'Hidden') + '</span>' : '') +
            '</div>' +
            '<div style="font-size:12px;color:var(--color-secondary-500);margin-top:2px;">' +
              'SSID: <strong style="color:var(--color-primary-600);">' + safeSsid + '</strong> · ' +
              (isTurkish ? 'Güvenlik' : 'Security') + ': <strong>' + safeSecText + '</strong> · ' +
              (isTurkish ? 'Bant' : 'Band') + ': <strong>' + safeBandText + '</strong>' +
            '</div>' +
          '</div>' +
          '<div style="display:flex;align-items:center;gap:6px;shrink:0;">' +
            statusBadge +
            '<button type="button" class="btn btn-secondary" style="padding:4px 10px;font-size:12px;" onclick="editSsidProfile(' + idx + ')">✏️ ' + (isTurkish ? 'Düzenle' : 'Edit') + '</button>' +
            '<button type="button" class="btn btn-secondary" style="padding:4px 10px;font-size:12px;" title="' + (isTurkish ? 'Etkinleştir / Devre Dışı Bırak' : 'Enable / Disable') + '" aria-label="' + (isTurkish ? 'Etkinleştir / Devre Dışı Bırak: ' : 'Enable / Disable: ') + safeSsid + '" onclick="toggleSsidProfile(' + idx + ')">⚡</button>' +
            (!isPrimary ? '<button type="button" class="btn btn-danger" style="padding:4px 10px;font-size:12px;" title="' + (isTurkish ? 'Sil' : 'Delete') + '" aria-label="' + (isTurkish ? 'Sil: ' : 'Delete: ') + safeSsid + '" onclick="deleteSsidProfile(' + idx + ')">🗑️</button>' : '') +
          '</div>' +
        '</div>';
      }).join('');
    };

    window.saveSsidProfile = function() {
      var editId = document.getElementById('edit-ssid-id').value;
      var name = (document.getElementById('profile-name').value || '').trim();
      var ssid = (document.getElementById('profile-ssid').value || '').trim();
      var band = document.getElementById('profile-band').value || 'both';
      var security = document.getElementById('profile-security').value || 'wpa2';
      var password = (document.getElementById('profile-password').value || '').trim();
      var enabled = !!document.getElementById('profile-enabled').checked;
      var hidden = !!document.getElementById('profile-hidden').checked;

      if (!name || !ssid) {
        alert('❌ ' + (isTurkish ? 'Lütfen Profil Adı ve SSID girin' : 'Please enter Profile Name and SSID'));
        return;
      }

      if (security !== 'open' && password.length < 8) {
        alert('❌ ' + (isTurkish ? 'Şifre en az 8 karakter olmalıdır' : 'Password must be at least 8 characters'));
        return;
      }

      if (editId !== '') {
        var idx = parseInt(editId, 10);
        if (!isNaN(idx) && currentSsidList[idx]) {
          currentSsidList[idx] = {
            id: currentSsidList[idx].id,
            name: name,
            ssid: ssid,
            security: security,
            password: password,
            band: band,
            enabled: enabled,
            hidden: hidden
          };
        }
      } else {
        var newProfile = {
          id: 'ssid-' + (Date.now()),
          name: name,
          ssid: ssid,
          security: security,
          password: password,
          band: band,
          enabled: enabled,
          hidden: hidden
        };
        currentSsidList.push(newProfile);
      }

      if (currentSsidList[0]) {
        var mainSsidEl = document.getElementById('wifi-ssid');
        if (mainSsidEl) mainSsidEl.value = currentSsidList[0].ssid;
      }

      resetSsidForm();
      renderSsidList();
      saveAllWifiSettings();
    };

    window.editSsidProfile = function(idx) {
      var profile = currentSsidList[idx];
      if (!profile) return;
      document.getElementById('edit-ssid-id').value = idx;
      document.getElementById('profile-name').value = profile.name || '';
      document.getElementById('profile-ssid').value = profile.ssid || '';
      document.getElementById('profile-band').value = profile.band || 'both';
      document.getElementById('profile-security').value = profile.security || 'wpa2';
      document.getElementById('profile-password').value = profile.password || '';
      document.getElementById('profile-enabled').checked = profile.enabled !== false;
      document.getElementById('profile-hidden').checked = !!profile.hidden;

      var pWrap = document.getElementById('profile-password-wrap');
      if (pWrap) pWrap.style.display = profile.security === 'open' ? 'none' : 'block';

      document.getElementById('ssid-form-title').innerHTML = '✏️ ' + (isTurkish ? 'SSID Profilini Düzenle' : 'Edit SSID Profile');
    };

    window.toggleSsidProfile = function(idx) {
      if (currentSsidList[idx]) {
        currentSsidList[idx].enabled = !currentSsidList[idx].enabled;
        renderSsidList();
        saveAllWifiSettings();
      }
    };

    window.deleteSsidProfile = function(idx) {
      if (idx === 0) {
        alert('❌ ' + (isTurkish ? 'Ana SSID profili silinemez' : 'Primary SSID profile cannot be deleted'));
        return;
      }
      if (confirm('⚠️ ' + (isTurkish ? 'Bu SSID profilini silmek istediğinizden emin misiniz?' : 'Are you sure you want to delete this SSID profile?'))) {
        currentSsidList.splice(idx, 1);
        renderSsidList();
        saveAllWifiSettings();
      }
    };

    window.resetSsidForm = function() {
      document.getElementById('edit-ssid-id').value = '';
      document.getElementById('profile-name').value = '';
      document.getElementById('profile-ssid').value = '';
      document.getElementById('profile-band').value = 'both';
      document.getElementById('profile-security').value = 'wpa2';
      document.getElementById('profile-password').value = 'password123';
      document.getElementById('profile-enabled').checked = true;
      document.getElementById('profile-hidden').checked = false;
      document.getElementById('ssid-form-title').innerHTML = '➕ ' + (isTurkish ? 'Yeni SSID Profili Ekle' : 'Add New SSID Profile');
    };

    // --- Connected Wireless Clients Table Handler ---
    window.renderConnectedWirelessClients = function() {
      var container = document.getElementById('connected-wireless-clients-container');
      var countEl = document.getElementById('status-connected-count');
      var totalBadge = document.getElementById('status-total-badge');

      var totalCount = connectedClientsData ? connectedClientsData.length : 0;
      if (countEl) {
        countEl.innerHTML = totalCount + ' ' + (isTurkish ? 'cihaz bağlı' : (totalCount === 1 ? 'device connected' : 'devices connected'));
      }
      if (totalBadge) {
        totalBadge.innerHTML = totalCount + ' ' + (isTurkish ? 'Toplam' : 'Total');
      }

      if (!container) return;

      if (!connectedClientsData || connectedClientsData.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:24px;background:${colors.topology.deviceText};border-radius:8px;border:1px solid var(--color-secondary-200);color:var(--color-secondary-500);">' +
          '<div style="font-size:36px;margin-bottom:8px;">📶</div>' +
          '<div>' + (isTurkish ? 'Şu anda bu erişim noktasına bağlı aktif kablosuz istemci yok.' : 'No active wireless clients currently connected to this AP.') + '</div>' +
        '</div>';
        return;
      }

      container.innerHTML = connectedClientsData.map(function(client) {
        var isSensor = client.sensorType === 'temperature' || client.sensorType === 'humidity' || client.sensorType === 'motion' || client.sensorType === 'light' || client.sensorType === 'sound';
        var icon = client.isWired ? '🔌' : (isSensor ? '🛜' : '💻');
        var ipDisplay = client.ip || (isTurkish ? 'Dinamik / DHCP' : 'Dynamic / DHCP');
        var macDisplay = client.mac || 'Auto';
        var clientSsid = client.ssid || ${jsSsid} || 'WiFi';
        var jsId = JSON.stringify(client.id || '').replace(/"/g, '&quot;');
        function escH(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

        var sigPct = typeof client.signalPercent === 'number' ? client.signalPercent : 90;
        var sigDbm = typeof client.rssiDbm === 'number' ? client.rssiDbm : Math.round(-95 + (sigPct * 0.65));
        var sigBadgeClass = client.isWired ? 'badge-success' : (sigPct > 60 ? 'badge-success' : (sigPct > 30 ? 'badge-warning' : 'badge-danger'));
        var sigDisplay = client.isWired ? '🔌 1 Gbps' : ('📶 ' + sigDbm + ' dBm (%' + sigPct + ')');

        return '<div class="client-card">' +
          '<div style="display:flex;align-items:center;gap:12px;min-width:0;">' +
            '<div class="client-icon">' + icon + '</div>' +
            '<div class="client-details">' +
              '<div class="client-title">' +
                '<span>' + escH(client.name) + '</span>' +
                '<span class="badge badge-primary">SSID: ' + escH(clientSsid) + '</span>' +
              '</div>' +
              '<div class="client-sub">IP: ' + escH(ipDisplay) + ' · MAC: ' + escH(macDisplay) + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="client-badges">' +
            '<span class="badge ' + sigBadgeClass + '">' + sigDisplay + '</span>' +
            '<span class="badge ' + (client.connected ? 'badge-success"' : 'badge-danger"') + '>' + (client.connected ? (isTurkish ? '● Bağlı' : '● Connected') : (isTurkish ? '● Bağlı Değil' : '● Disconnected')) + '</span>' +
            '<button type="button" class="btn btn-secondary" style="padding:4px 8px;font-size:11px;" onclick="renewIotDevice(' + jsId + ')" title="' + (isTurkish ? 'IP Yenile' : 'Renew IP') + '">🔄</button>' +
            '<button type="button" class="btn btn-danger" style="padding:4px 8px;font-size:11px;" onclick="disconnectIotDevice(' + jsId + ')" title="' + (isTurkish ? 'Bağlantıyı Kes' : 'Disconnect') + '">🔌</button>' +
          '</div>' +
        '</div>';
      }).join('');
    };

    function saveAllWifiSettings() {
      var enabled = !!document.getElementById('wifi-enabled')?.checked;
      var ssid = document.getElementById('wifi-ssid') ? (document.getElementById('wifi-ssid').value || '') : '';
      var security = document.getElementById('wifi-security') ? (document.getElementById('wifi-security').value || '') : '';
      var channel = document.getElementById('wifi-channel') ? (document.getElementById('wifi-channel').value || '') : '';
      var mode = document.getElementById('wifi-mode') ? (document.getElementById('wifi-mode').value || '') : '';
      var hidden = document.getElementById('wifi-hidden') ? !!document.getElementById('wifi-hidden').checked : false;
      var maxClients = document.getElementById('max-clients') ? (document.getElementById('max-clients').value || 32) : 32;
      var password = document.getElementById('wifi-password') ? (document.getElementById('wifi-password').value || '') : '';

      var macFilterEnabled = !!document.getElementById('mac-filter-enabled')?.checked;
      var macFilterMode = document.querySelector('input[name="macFilterMode"]:checked')?.value || 'allow';
      var macFilterList = Array.isArray(window.currentMacFilterList) ? window.currentMacFilterList.slice() : [];

      var dhcpEnabled = !!document.getElementById('dhcp-server-enabled')?.checked;
      var dhcpStartIp = document.getElementById('dhcp-start-ip') ? (document.getElementById('dhcp-start-ip').value || '192.168.1.100') : '192.168.1.100';
      var dhcpEndIp = document.getElementById('dhcp-end-ip') ? (document.getElementById('dhcp-end-ip').value || '192.168.1.200') : '192.168.1.200';
      var dhcpGateway = document.getElementById('dhcp-gateway') ? (document.getElementById('dhcp-gateway').value || '192.168.1.1') : '192.168.1.1';
      var dhcpSubnet = document.getElementById('dhcp-subnet') ? (document.getElementById('dhcp-subnet').value || '255.255.255.0') : '255.255.255.0';
      var dhcpDns = document.getElementById('dhcp-dns') ? (document.getElementById('dhcp-dns').value || '192.168.1.1') : '192.168.1.1';
      var dhcpLeaseTime = document.getElementById('dhcp-lease') ? (document.getElementById('dhcp-lease').value || '24') : '24';

      try {
        window.parent.postMessage({
          type: 'router-admin-save-wifi',
          deviceId: ${jsDeviceId},
          payload: {
            enabled: enabled,
            ssid: ssid,
            security: security,
            channel: channel,
            mode: mode,
            hidden: hidden,
            maxClients: Number(maxClients),
            password: password,
            macFilterEnabled: macFilterEnabled,
            macFilterMode: macFilterMode,
            macFilterList: macFilterList,
            ssids: currentSsidList,
            dhcp: {
              enabled: dhcpEnabled,
              startIp: dhcpStartIp,
              endIp: dhcpEndIp,
              gateway: dhcpGateway,
              subnet: dhcpSubnet,
              dns: dhcpDns,
              leaseTime: Number(dhcpLeaseTime)
            }
          }
        }, '*');
      } catch(err) {}
    }

    function checkRouterAuth() {
      try {
        var localAuth = null;
        var sessionAuth = null;
        var memoryAuth = window['__router_admin_auth_' + currentDeviceId];
        try {
          if (typeof sessionStorage !== 'undefined' && sessionStorage) {
            sessionAuth = sessionStorage.getItem('router_admin_auth_' + currentDeviceId);
          }
        } catch (_) {}
        try {
          if (typeof localStorage !== 'undefined' && localStorage) {
            localAuth = localStorage.getItem('router_admin_auth_' + currentDeviceId);
          }
        } catch (_) {}
        if (memoryAuth === 'true' || sessionAuth === 'true' || localAuth === 'true' || window.__router_auth_state === true) {
          var loginForm = document.getElementById('login-form');
          var mainContent = document.getElementById('main-content');
          if (loginForm) loginForm.style.display = 'none';
          if (mainContent) mainContent.style.display = 'block';
        }
      } catch(err) {}
    }

    function initRouterLoginForm() {
      var rForm = document.getElementById('router-login-form');
      var rBtn = document.getElementById('btn-router-login');
      if (rForm && !rForm.__bound) {
        rForm.__bound = true;
        rForm.addEventListener('submit', function(e) {
          window.handleLogin(e);
        });
      }
      if (rBtn && !rBtn.__bound) {
        rBtn.__bound = true;
        rBtn.addEventListener('click', function(e) {
          window.handleLogin(e);
        });
      }
      var wForm = document.getElementById('wifi-form');
      if (wForm && !wForm.__bound) {
        wForm.__bound = true;
        wForm.addEventListener('submit', function(e) {
          window.handleSavePrimarySettings(e);
        });
      }
      var aForm = document.getElementById('admin-credentials-form');
      if (aForm && !aForm.__bound) {
        aForm.__bound = true;
        aForm.addEventListener('submit', function(e) {
          window.handleSaveCredentials(e);
        });
      }
    }

    function initWifiControlPanelBindings() {
      var clickTargets = [
        ['btn-logout', function() { window.handleLogout(); }],
        ['btn-reset-primary', function() { location.reload(); }],
        ['btn-save-ssid-profile', function() { window.saveSsidProfile(); }],
        ['btn-reset-ssid-form', function() { window.resetSsidForm(); }],
        ['btn-add-manual-mac', function() { window.addManualMac(); }],
        ['save-advanced-btn', function() { window.saveMacFilterSettings(); }]
      ];
      clickTargets.forEach(function(pair) {
        var el = document.getElementById(pair[0]);
        if (el && !el.__bound) {
          el.__bound = true;
          el.addEventListener('click', pair[1]);
        }
      });

      var changeTargets = [
        ['profile-security', function(el) { window.handleProfileSecurityChange(el.value); }],
        ['mac-filter-enabled', function() { window.toggleMacFilterSection(); }],
        ['dhcp-server-enabled', function() { window.toggleDhcpServerSection(); }]
      ];
      changeTargets.forEach(function(pair) {
        var el = document.getElementById(pair[0]);
        if (el && !el.__bound) {
          el.__bound = true;
          el.addEventListener('change', function() { pair[1](el); });
        }
      });
    }

    // Initialize lists & session state on document ready
    renderSsidList();
    renderConnectedWirelessClients();
    renderMacFilterList();
    initRouterLoginForm();
    initWifiControlPanelBindings();
    checkRouterAuth();

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      initRouterLoginForm();
      initWifiControlPanelBindings();
      checkRouterAuth();
    } else {
      window.addEventListener('load', function() {
        initRouterLoginForm();
        initWifiControlPanelBindings();
        checkRouterAuth();
      });
      document.addEventListener('DOMContentLoaded', function() {
        initRouterLoginForm();
        initWifiControlPanelBindings();
        checkRouterAuth();
      });
    }
  </script>
  `;
}
