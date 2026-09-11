export interface WifiAdminLoginTemplateParams {
  deviceName: string;
  isTurkish: boolean;
  username: string;
}

export function renderWifiAdminLoginTemplate({ deviceName, isTurkish, username }: WifiAdminLoginTemplateParams): string {
  return `
    <div id="login-form" class="login-overlay" style="display:flex;">
      <div class="login-card">
        <div class="login-header">
          <div class="login-icon">🔒</div>
          <h2>${deviceName}</h2>
          <p>${isTurkish ? 'Yönetici Paneli Girişi' : 'Admin Panel Login'}</p>
        </div>
        <form onsubmit="handleLogin(event)">
          <div class="form-group">
            <label for="login-username">${isTurkish ? 'Kullanıcı Adı' : 'Username'}</label>
            <input type="text" id="login-username" value="${username}" placeholder="${isTurkish ? 'Kullanıcı adını girin' : 'Enter username'}" required autocomplete="off">
          </div>
          <div class="form-group">
            <label for="login-password">${isTurkish ? 'Şifre' : 'Password'}</label>
            <input type="password" id="login-password" placeholder="${isTurkish ? 'Şifrenizi girin' : 'Enter password'}" required>
          </div>
          <div id="login-error" class="error-message" style="display:none;">
            ❌ ${isTurkish ? 'Hatalı kullanıcı adı veya şifre!' : 'Invalid username or password!'}
          </div>
          <button type="submit" onclick="handleLogin(event)" class="btn btn-primary btn-block">🔓 ${isTurkish ? 'Giriş Yap' : 'Login'}</button>
          <span class="hint" style="display:block;text-align:center;margin-top:10px;">${isTurkish ? 'Varsayılan: admin / admin' : 'Default: admin / admin'}</span>
        </form>
      </div>
    </div>
  `;
}
