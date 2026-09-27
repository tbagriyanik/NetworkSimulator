export interface WifiAdminLoginTemplateParams {
  deviceName: string;
  isTurkish: boolean;
  username: string;
  isAuthenticated?: boolean;
}

export function renderWifiAdminLoginTemplate({ deviceName, isTurkish, username, isAuthenticated = false }: WifiAdminLoginTemplateParams): string {
  return `
    <div id="login-form" class="login-overlay" style="display:${isAuthenticated ? 'none' : 'flex'};">
      <div class="login-card">
        <div class="login-header">
          <div class="login-icon" style="display:flex;align-items:center;justify-content:center;">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
              <circle cx="12" cy="12" r="9"/>
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14M5 12h14M12 5l-2 2m2-2l2 2m-2 12l-2-2m2 2l2-2M5 12l2-2m-2 2l2 2M19 12l-2-2m2 2l-2 2"/>
            </svg>
          </div>
          <h2>${deviceName}</h2>
          <p>${isTurkish ? 'Yönetici Paneli Girişi' : 'Admin Panel Login'}</p>
        </div>
        <form id="router-login-form" action="javascript:void(0);">
          <div class="form-group">
            <label for="login-username">${isTurkish ? 'Kullanıcı Adı' : 'Username'}</label>
            <input type="text" id="login-username" value="${username}" placeholder="${isTurkish ? 'Kullanıcı adını girin' : 'Enter username'}" required autocomplete="off" autocapitalize="none" autocorrect="off">
          </div>
          <div class="form-group">
            <label for="login-password">${isTurkish ? 'Şifre' : 'Password'}</label>
            <div class="password-input-wrapper">
              <input type="password" id="login-password" placeholder="${isTurkish ? 'Şifrenizi girin' : 'Enter password'}" required autocapitalize="none" autocorrect="off">
              <button type="button" class="toggle-password-btn" onclick="window.togglePasswordVisibility('login-password', this, event)" aria-label="${isTurkish ? 'Şifreyi göster' : 'Show password'}" title="${isTurkish ? 'Şifreyi göster' : 'Show password'}">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
          </div>
          <div id="login-error" class="error-message" style="display:none;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>${isTurkish ? 'Hatalı kullanıcı adı veya şifre!' : 'Invalid username or password!'}
          </div>
          <button type="submit" id="btn-router-login" class="btn btn-primary btn-block"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:6px;"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>${isTurkish ? 'Giriş Yap' : 'Login'}</button>
          <span class="hint" style="display:block;text-align:center;margin-top:10px;">${isTurkish ? 'Varsayılan: admin / admin' : 'Default: admin / admin'}</span>
        </form>
      </div>
    </div>
  `;
}
