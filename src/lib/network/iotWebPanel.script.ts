/**
 * IoT Web Panel Client-Side Script Module
 * Generates secure JavaScript for IoT web panel functionality
 */

export function generateIotPanelScript(): string {
  return `
    // Safe storage wrapper with fallback (prefers localStorage for persistent login)
    const safeStorage = {
      getItem: function(key) {
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            const val = window.localStorage.getItem(key);
            if (val !== null) return val;
          }
          if (typeof window !== 'undefined' && window.sessionStorage) {
            const val = window.sessionStorage.getItem(key);
            if (val !== null) return val;
          }
          return window['__iot_' + key] || null;
        } catch (e) {
          return window['__iot_' + key] || null;
        }
      },
      setItem: function(key, value) {
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(key, value);
          }
          if (typeof window !== 'undefined' && window.sessionStorage) {
            window.sessionStorage.setItem(key, value);
          }
          window['__iot_' + key] = value;
        } catch (e) {
          window['__iot_' + key] = value;
        }
      },
      removeItem: function(key) {
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.removeItem(key);
          }
          if (typeof window !== 'undefined' && window.sessionStorage) {
            window.sessionStorage.removeItem(key);
          }
          delete window['__iot_' + key];
        } catch (e) {
          delete window['__iot_' + key];
        }
      }
    };

    window.checkPassword = function(e) {
      try {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        const get = (id) => document.getElementById(id);
        const userEl = get('username');
        const pwdEl = get('password');
        const loginSection = get('loginSection');
        const deviceSection = get('deviceSection');
        const errorMessage = get('errorMessage');

        const username = userEl ? String(userEl.value || '').trim() : '';
        const password = pwdEl ? String(pwdEl.value || '').trim() : '';
        const correctUsername = 'admin';
        const correctPassword = String(safeStorage.getItem('iotPanelPassword') || 'admin').trim();

        if (username.toLowerCase() === correctUsername && password === correctPassword) {
          safeStorage.setItem('iotPanelAuthenticated', 'true');
          loginSection?.classList.add('hidden');
          deviceSection?.classList.remove('hidden');
        } else {
          if (errorMessage) errorMessage.style.display = 'block';
          if (userEl) userEl.value = '';
          if (pwdEl) pwdEl.value = '';
          try { userEl?.focus(); } catch (_) { /* ignore */ }
        }
      } catch (err) {
        console.warn('IoT panel: checkPassword failed', err);
      }
    };

    window.checkAuthentication = function() {
      try {
        const isAuthenticated = safeStorage.getItem('iotPanelAuthenticated');
        const loginSection = document.getElementById('loginSection');
        const deviceSection = document.getElementById('deviceSection');
        if (isAuthenticated === 'true') {
          loginSection?.classList.add('hidden');
          deviceSection?.classList.remove('hidden');
        } else {
          loginSection?.classList.remove('hidden');
          deviceSection?.classList.add('hidden');
        }
      } catch (err) {
        console.warn('IoT panel: checkAuthentication failed', err);
      }
    };

    window.logout = function() {
      try {
        safeStorage.removeItem('iotPanelAuthenticated');
        const loginSection = document.getElementById('loginSection');
        const deviceSection = document.getElementById('deviceSection');
        const userEl = document.getElementById('username');
        const pwdEl = document.getElementById('password');
        const errorMessage = document.getElementById('errorMessage');
        const settingsPopup = document.getElementById('settingsPopup');

        loginSection?.classList.remove('hidden');
        deviceSection?.classList.add('hidden');
        if (userEl) userEl.value = 'admin';
        if (pwdEl) pwdEl.value = '';
        if (errorMessage) errorMessage.style.display = 'none';
        settingsPopup?.classList.remove('show');
      } catch (err) {
        console.warn('IoT panel: logout failed', err);
      }
    };

    window.toggleSettingsPopup = function() {
      try {
        const popup = document.getElementById('settingsPopup');
        popup?.classList.toggle('show');
      } catch (err) {
        console.warn('IoT panel: toggleSettingsPopup failed', err);
      }
    };

    window.changePassword = function() {
      try {
        const newPasswordEl = document.getElementById('newPassword');
        const confirmPasswordEl = document.getElementById('confirmPassword');
        const successMessage = document.getElementById('passwordSuccess');
        const errorMessage = document.getElementById('passwordError');
        const settingsPopup = document.getElementById('settingsPopup');

        const newPassword = newPasswordEl ? (newPasswordEl.value || '') : '';
        const confirmPassword = confirmPasswordEl ? (confirmPasswordEl.value || '') : '';

        if (newPassword && newPassword === confirmPassword) {
          safeStorage.setItem('iotPanelPassword', newPassword);
          if (successMessage) successMessage.style.display = 'block';
          if (errorMessage) errorMessage.style.display = 'none';
          if (newPasswordEl) newPasswordEl.value = '';
          if (confirmPasswordEl) confirmPasswordEl.value = '';

          // Hide success message after 3 seconds
          setTimeout(() => {
            if (successMessage) successMessage.style.display = 'none';
          }, 3000);

          // Close popup after successful password change
          setTimeout(() => {
            settingsPopup?.classList.remove('show');
          }, 1500);
        } else {
          if (errorMessage) errorMessage.style.display = 'block';
          if (successMessage) successMessage.style.display = 'none';
        }
      } catch (err) {
        console.warn('IoT panel: changePassword failed', err);
      }
    };

    // Attach event listeners safely
    function initIotLoginForm() {
      const loginSection = document.getElementById('loginSection');
      const iotLoginBtn = document.getElementById('iotLoginButton');
      if (loginSection && !loginSection.__bound) {
        loginSection.__bound = true;
        loginSection.addEventListener('submit', function(event) {
          window.checkPassword(event);
        });
      }
      if (iotLoginBtn && !iotLoginBtn.__bound) {
        iotLoginBtn.__bound = true;
        iotLoginBtn.addEventListener('click', function(event) {
          window.checkPassword(event);
        });
      }
    }

    document.addEventListener('DOMContentLoaded', function() {
      try {
        initIotLoginForm();

        // Settings toggle
        const settingsToggle = document.getElementById('settingsToggle');
        if (settingsToggle) {
          settingsToggle.addEventListener('click', window.toggleSettingsPopup);
        }

        // Change password
        const changePasswordButton = document.getElementById('changePasswordButton');
        if (changePasswordButton) {
          changePasswordButton.addEventListener('click', window.changePassword);
        }

        // Logout
        const logoutButton = document.getElementById('logoutButton');
        if (logoutButton) {
          logoutButton.addEventListener('click', window.logout);
        }

        // Device connection buttons
        document.querySelectorAll('[data-iot-device-id]').forEach(function(button) {
          button.addEventListener('click', function() {
            const deviceId = button.getAttribute('data-iot-device-id');
            if (deviceId) window.parent.postMessage({ type: 'open-iot-device', deviceId: deviceId }, '*');
          });
        });

        // Close popup when clicking outside
        document.addEventListener('click', function(e) {
          const popup = document.getElementById('settingsPopup');
          const settingsIcon = document.querySelector('.settings-icon');
          try {
            if (popup && settingsIcon) {
              const target = e.target;
              if (target instanceof Node) {
                if (!popup.contains(target) && !settingsIcon.contains(target)) {
                  popup.classList.remove('show');
                }
              }
            }
          } catch (_) {
            // ignore
          }
        });

        // Keyboard handlers
        const pwdEl = document.getElementById('password');
        if (pwdEl && typeof pwdEl.addEventListener === 'function') {
          pwdEl.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
              try { window.checkPassword(); } catch (_) { /* ignore */ }
            }
          });
        }

        const userEl = document.getElementById('username');
        if (userEl && typeof userEl.addEventListener === 'function') {
          userEl.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
              try { document.getElementById('password')?.focus(); } catch (_) { /* ignore */ }
            }
          });
        }

        // Check authentication on page load
        window.checkAuthentication();
      } catch (err) {
        console.warn('IoT panel: failed to attach event listeners', err);
      }
    });

    // Run authentication check immediately if DOM is already ready (e.g. in srcdoc iframe)
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      try {
        initIotLoginForm();
        window.checkAuthentication();
      } catch (_) {}
    } else {
      window.addEventListener('load', function() {
        try {
          initIotLoginForm();
          window.checkAuthentication();
        } catch (_) {}
      });
    }
  `;
}