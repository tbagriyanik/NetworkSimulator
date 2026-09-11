import { colors } from '@/lib/design-tokens/colors';

export function renderWifiAdminAccountTemplate(activeTab: string, isTurkish: boolean, username: string): string {
  return `
    <!-- Admin Tab -->
    <div id="admin-tab" class="content" style="display:${activeTab === 'admin' ? 'block' : 'none'};">
      <h2 class="panel-title">👤 ${isTurkish ? 'Yönetici Hesabı' : 'Administrator Account'}</h2>
      <p style="color:var(--color-secondary-500);margin-bottom:20px;">${isTurkish ? 'Yönetici paneli giriş bilgilerini güncelleyin. Şifre değiştirildiğinde bir sonraki girişte yeni bilgiler istenir.' : 'Update admin panel login credentials. After changing the password, the new credentials are required on next login.'}</p>
      <div style="background:${colors.topology.deviceText};padding:20px;border-radius:10px;border:1px solid var(--color-secondary-200);max-width:520px;">
        <h3 style="margin:0 0 16px 0;font-size:15px;color:var(--color-secondary-900);">🔑 ${isTurkish ? 'Şifre Değiştir' : 'Change Password'}</h3>
        <form id="admin-credentials-form" action="javascript:void(0);">
          <div class="form-group"><label for="cred-current-password">${isTurkish ? 'Mevcut Şifre (Doğrulama)' : 'Current Password (Verification)'}</label><input type="password" id="cred-current-password" placeholder="${isTurkish ? 'Mevcut şifrenizi girin' : 'Enter your current password'}" required autocomplete="off"></div>
          <div class="form-group"><label for="cred-new-username">${isTurkish ? 'Yeni Kullanıcı Adı' : 'New Username'}</label><input type="text" id="cred-new-username" value="${username}" required autocomplete="off"></div>
          <div class="grid-2"><div class="form-group"><label for="cred-new-password">${isTurkish ? 'Yeni Şifre' : 'New Password'}</label><input type="password" id="cred-new-password" minlength="4" placeholder="${isTurkish ? 'En az 4 karakter' : 'At least 4 characters'}" required autocomplete="new-password"></div><div class="form-group"><label for="cred-confirm-password">${isTurkish ? 'Yeni Şifre (Tekrar)' : 'Confirm New Password'}</label><input type="password" id="cred-confirm-password" minlength="4" placeholder="${isTurkish ? 'Şifreyi tekrar girin' : 'Repeat the password'}" required autocomplete="new-password"></div></div>
          <div id="cred-error" class="error-message" style="display:none;"></div><div id="cred-success" class="success-message" style="display:none;">✅ ${isTurkish ? 'Yönetici bilgileri güncellendi!' : 'Admin credentials updated!'}</div>
          <div class="actions"><button type="submit" class="btn btn-primary">💾 ${isTurkish ? 'Bilgileri Kaydet' : 'Save Credentials'}</button><button type="button" class="btn btn-secondary" onclick="resetCredentialsForm()">↺ ${isTurkish ? 'Sıfırla' : 'Reset'}</button></div>
        </form>
      </div>
    </div>
  `;
}
