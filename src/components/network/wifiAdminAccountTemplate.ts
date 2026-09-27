import { colors } from '@/lib/design-tokens/colors';

export function renderWifiAdminAccountTemplate(activeTab: string, isTurkish: boolean, username: string): string {
  const userSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:6px;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
  const keySvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:6px;"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/></svg>`;
  const checkSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><polyline points="20 6 9 17 4 12"/></svg>`;
  const saveSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`;
  const resetSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>`;

  return `
    <!-- Admin Tab -->
    <div id="admin-tab" class="content" style="display:${activeTab === 'admin' ? 'block' : 'none'};">
      <h2 class="panel-title">${userSvg}${isTurkish ? 'Yönetici Hesabı' : 'Administrator Account'}</h2>
      <p style="color:var(--color-secondary-500);margin-bottom:20px;">${isTurkish ? 'Yönetici paneli giriş bilgilerini güncelleyin. Şifre değiştirildiğinde bir sonraki girişte yeni bilgiler istenir.' : 'Update admin panel login credentials. After changing the password, the new credentials are required on next login.'}</p>
      <div style="background:${colors.topology.deviceText};padding:20px;border-radius:10px;border:1px solid var(--color-secondary-200);max-width:520px;">
        <h3 style="margin:0 0 16px 0;font-size:15px;color:var(--color-secondary-900);">${keySvg}${isTurkish ? 'Şifre Değiştir' : 'Change Password'}</h3>
        <form id="admin-credentials-form" action="javascript:void(0);">
          <div class="form-group">
            <label for="cred-current-password">${isTurkish ? 'Mevcut Şifre (Doğrulama)' : 'Current Password (Verification)'}</label>
            <div class="password-input-wrapper">
              <input type="password" id="cred-current-password" placeholder="${isTurkish ? 'Mevcut şifrenizi girin' : 'Enter your current password'}" required autocomplete="off">
              <button type="button" class="toggle-password-btn" onclick="window.togglePasswordVisibility('cred-current-password', this, event)" aria-label="${isTurkish ? 'Şifreyi göster' : 'Show password'}" title="${isTurkish ? 'Şifreyi göster' : 'Show password'}">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
          </div>
          <div class="form-group"><label for="cred-new-username">${isTurkish ? 'Yeni Kullanıcı Adı' : 'New Username'}</label><input type="text" id="cred-new-username" value="${username}" required autocomplete="off"></div>
          <div class="grid-2">
            <div class="form-group">
              <label for="cred-new-password">${isTurkish ? 'Yeni Şifre' : 'New Password'}</label>
              <div class="password-input-wrapper">
                <input type="password" id="cred-new-password" minlength="4" placeholder="${isTurkish ? 'En az 4 karakter' : 'At least 4 characters'}" required autocomplete="new-password">
                <button type="button" class="toggle-password-btn" onclick="window.togglePasswordVisibility('cred-new-password', this, event)" aria-label="${isTurkish ? 'Şifreyi göster' : 'Show password'}" title="${isTurkish ? 'Şifreyi göster' : 'Show password'}">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
              </div>
            </div>
            <div class="form-group">
              <label for="cred-confirm-password">${isTurkish ? 'Yeni Şifre (Tekrar)' : 'Confirm New Password'}</label>
              <div class="password-input-wrapper">
                <input type="password" id="cred-confirm-password" minlength="4" placeholder="${isTurkish ? 'Şifreyi tekrar girin' : 'Repeat the password'}" required autocomplete="new-password">
                <button type="button" class="toggle-password-btn" onclick="window.togglePasswordVisibility('cred-confirm-password', this, event)" aria-label="${isTurkish ? 'Şifreyi göster' : 'Show password'}" title="${isTurkish ? 'Şifreyi göster' : 'Show password'}">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
              </div>
            </div>
          </div>
          <div id="cred-error" class="error-message" style="display:none;"></div><div id="cred-success" class="success-message" style="display:none;">${checkSvg}${isTurkish ? 'Yönetici bilgileri güncellendi!' : 'Admin credentials updated!'}</div>
          <div class="actions"><button type="submit" class="btn btn-primary">${saveSvg}${isTurkish ? 'Bilgileri Kaydet' : 'Save Credentials'}</button><button type="button" class="btn btn-secondary" onclick="resetCredentialsForm()">${resetSvg}${isTurkish ? 'Sıfırla' : 'Reset'}</button></div>
        </form>
      </div>
    </div>
  `;
}
