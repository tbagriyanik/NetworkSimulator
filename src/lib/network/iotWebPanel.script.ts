/**
 * IoT Web Panel Client-Side Script Module
 * Generates secure JavaScript for IoT web panel functionality
 */

export function generateIotPanelScript(isAuthenticated: boolean = false): string {
  return `
    if (${isAuthenticated ? 'true' : 'false'}) {
      window['__iot_iotPanelAuthenticated'] = 'true';
    }

    // Safe storage wrapper with fallback (prefers memory storage for Vercel production)
    const safeStorage = {
      getItem: function(key) {
        try {
          // Prefer memory storage for Vercel production to avoid storage access issues
          if (window['__iot_' + key] !== undefined) {
            return window['__iot_' + key];
          }
          if (typeof window !== 'undefined' && window.sessionStorage) {
            const val = window.sessionStorage.getItem(key);
            if (val !== null) return val;
          }
          if (typeof window !== 'undefined' && window.localStorage) {
            const val = window.localStorage.getItem(key);
            if (val !== null) return val;
          }
          return null;
        } catch (e) {
          return window['__iot_' + key] || null;
        }
      },
      setItem: function(key, value) {
        try {
          // Store in memory first for reliability
          window['__iot_' + key] = value;
          if (typeof window !== 'undefined' && window.sessionStorage) {
            window.sessionStorage.setItem(key, value);
          }
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(key, value);
          }
        } catch (e) {
          window['__iot_' + key] = value;
        }
      },
      removeItem: function(key) {
        try {
          delete window['__iot_' + key];
          if (typeof window !== 'undefined' && window.sessionStorage) {
            window.sessionStorage.removeItem(key);
          }
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.removeItem(key);
          }
        } catch (e) {
          delete window['__iot_' + key];
        }
      }
    };

    window.togglePasswordVisibility = function(inputId, btn, evt) {
      if (evt && typeof evt.stopPropagation === 'function') {
        evt.stopPropagation();
      } else if (window.event && typeof window.event.stopPropagation === 'function') {
        window.event.stopPropagation();
      }
      var input = document.getElementById(inputId);
      if (!input) return;
      var isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      btn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
      btn.setAttribute('title', isPassword ? 'Hide password' : 'Show password');
      btn.innerHTML = isPassword
        ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499A10.75 10.75 0 0 1 2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 2.725-3.692"/><line x1="2" x2="22" y1="2" y2="22"/></svg>'
        : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z"/><circle cx="12" cy="12" r="3"/></svg>';
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
          try {
            window.parent.postMessage({ type: 'iot-panel-auth-success' }, '*');
          } catch (_) {}
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
        try {
          window.parent.postMessage({ type: 'iot-panel-logout' }, '*');
        } catch (_) {}
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
          const settingsIcon = document.getElementById('settingsToggle') || document.querySelector('.settings-icon');
          try {
            if (popup && settingsIcon) {
              if (typeof e.composedPath === 'function') {
                const path = e.composedPath();
                if (path.includes(popup) || path.includes(settingsIcon)) {
                  return;
                }
              }
              const target = e.target;
              if (target instanceof Node) {
                if (!document.contains(target)) {
                  // Element was removed/detached during click (e.g. innerHTML changed on eye toggle)
                  return;
                }
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