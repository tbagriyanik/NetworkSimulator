// pcPython3DRenderer.ts
// Interactive WebGL 3D Scene and Standalone HTML Generator for embedded Python 3D engine

import type { Python3DSceneState } from './pcPython3DTypes';
import { colors } from '@/lib/design-tokens/colors';
import { get3DSceneStyles } from './3d-renderer/pcPython3DStyles';
import { get3DSceneScript } from './3d-renderer/pcPython3DScript';

/**
 * Escapes unsafe string values for HTML injection
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generates an interactive, standalone HTML5 3D WebGL application
 * that can run inside an iframe (PCBrowser) or saved as a .html file.
 */
export function generate3DSceneHtml(scene: Python3DSceneState, isDark: boolean = true, language: string = 'tr'): string {
  const isEn = language === 'en';
  const sceneDataJson = JSON.stringify(scene).replace(/</g, '\\u003c');
  const styles = get3DSceneStyles(isDark);
  const script = get3DSceneScript(sceneDataJson, isDark);

  const initialThemeOption = isDark
    ? `<option value="dark" selected>🌙 Dark Cyber</option>
        <option value="light">☀️ Light Clean</option>
        <option value="neon">🟣 Neon Synth</option>
        <option value="blueprint">📐 Blueprint</option>`
    : `<option value="light" selected>☀️ Light Clean</option>
        <option value="dark">🌙 Dark Cyber</option>
        <option value="neon">🟣 Neon Synth</option>
        <option value="blueprint">📐 Blueprint</option>`;

  const objLabel = isEn ? (scene.objects.length === 1 ? 'Object' : 'Objects') : 'Nesne';

  return `<!DOCTYPE html>
<html lang="${isEn ? 'en' : 'tr'}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>${escapeHtml(scene.title || (isEn ? '3D WebGL Scene' : '3D WebGL Sahne'))}</title>
  <style>${styles}</style>
</head>
<body>
  <div id="viewport-container">
    <canvas id="render-canvas"></canvas>
  </div>

  <header class="toolbar">
    <div class="toolbar-group">
      <span style="font-weight: 700; font-size: 12px; color: ${isDark ? colors.theme.accent : colors.theme.primary}; margin-right: 4px;">🧊 ${escapeHtml(scene.title || (isEn ? '3D Scene' : '3D Sahne'))}</span>
      <span class="badge" id="obj-count-badge">${scene.objects.length} ${objLabel}</span>
    </div>
    <div class="toolbar-group">
      <select class="theme-select" id="select-theme" title="${isEn ? 'WebGL Theme Selection' : 'WebGL Tema Seçimi'}">
        ${initialThemeOption}
      </select>
      <button class="btn" id="btn-wireframe" title="${isEn ? 'Wireframe Mode' : 'Tel Çerçeve Modu'}">${isEn ? '🌐 Wireframe' : '🌐 Tel Kafes'}</button>
      <button class="btn" id="btn-grid" title="${isEn ? 'Toggle Floor Grid' : 'Zemin Izgarasını Göster/Gizle'}">${isEn ? '▦ Grid' : '▦ Izgara'}</button>
      <button class="btn" id="btn-rotate" title="${isEn ? 'Toggle Auto Rotation' : 'Otomatik Dönüşü Aç/Kapat'}">${isEn ? '🔄 Rotate' : '🔄 Döndür'}</button>
      <button class="btn" id="btn-reset" title="${isEn ? 'Reset Camera' : 'Kamerayı Sıfırla'}">${isEn ? '🎯 Reset' : '🎯 Sıfırla'}</button>
    </div>
  </header>

  <footer class="footer-help">
    <span><kbd>${isEn ? 'Left Click + Drag' : 'Sol Tık + Sürükle'}</kbd> ${isEn ? 'Rotate' : 'Döndür'}</span>
    <span>•</span>
    <span><kbd>${isEn ? 'Right Click + Drag' : 'Sağ Tık + Sürükle'}</kbd> ${isEn ? 'Pan' : 'Kaydır'}</span>
    <span>•</span>
    <span><kbd>${isEn ? 'Wheel / Pinch' : 'Tekerlek / Pinch'}</kbd> ${isEn ? 'Zoom' : 'Yakınlaştır'}</span>
  </footer>

  <script>${script}</script>
</body>
</html>`;
}
