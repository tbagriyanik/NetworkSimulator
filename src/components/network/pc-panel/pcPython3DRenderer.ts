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

function toolbarIcon(name: 'theme' | 'quality' | 'wireframe' | 'grid' | 'rotate' | 'reset'): string {
  const paths = {
    theme: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"/>',
    quality: '<path d="m12 3 2.6 5.3L20.5 9l-4.25 4.15 1 5.85L12 16.25 6.75 19l1-5.85L3.5 9l5.9-.7L12 3Z"/>',
    wireframe: '<path d="m4 6 8-3 8 3-8 3-8-3Z M4 6v12l8 3 8-3V6 M12 9v12"/>',
    grid: '<path d="M4 4h16v16H4zM4 10h16M4 16h16M10 4v16M16 4v16"/>',
    rotate: '<path d="M20 11a8 8 0 0 0-14.8-4L3 10m0 0V5m0 5h5M4 13a8 8 0 0 0 14.8 4L21 14m0 0v5m0-5h-5"/>',
    reset: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8m0-5v5h5"/>'
  };
  return `<svg class="toolbar-icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name]}</svg>`;
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
  const displayTitle = (!scene.title || scene.title === '3D Sahne' || scene.title === '3D Scene' || scene.title === 'Etkileşimli 3D Sahne' || scene.title === 'Interactive 3D Scene')
    ? (isEn ? 'Interactive 3D Scene' : 'Etkileşimli 3D Sahne')
    : scene.title;

  return `<!DOCTYPE html>
<html lang="${isEn ? 'en' : 'tr'}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>${escapeHtml(displayTitle)}</title>
  <style>${styles}</style>
</head>
<body>
  <div id="viewport-container">
    <canvas id="render-canvas"></canvas>
  </div>

  <header class="toolbar">
    <div class="toolbar-group">
      <span style="font-weight: 700; font-size: 12px; color: ${isDark ? colors.theme.accent : colors.theme.primary}; margin-right: 4px;">🧊 ${escapeHtml(displayTitle)}</span>
      <span class="badge" id="obj-count-badge">${scene.objects.length} ${objLabel}</span>
    </div>
    <div class="toolbar-group">
      <select class="theme-select" id="select-theme" title="${isEn ? 'WebGL Theme Selection' : 'WebGL Tema Seçimi'}">
        ${initialThemeOption}
      </select>
      <select class="theme-select" id="select-quality" title="${isEn ? 'Rendering Quality' : 'Görüntü Kalitesi'}">
        <option value="low">${isEn ? '🔋 Minimum Quality' : '🔋 Minimum Kalite'}</option>
        <option value="medium">${isEn ? '⚖️ Medium Quality' : '⚖️ Orta Kalite'}</option>
        <option value="high" selected>${isEn ? '⚡ Maximum Quality (Full Quality)' : '⚡ Maksimum Kalite (Tam Kalite)'}</option>
      </select>
      <button class="btn" id="btn-wireframe" title="${isEn ? 'Wireframe Mode' : 'Tel Çerçeve Modu'}">${toolbarIcon('wireframe')}${isEn ? 'Wireframe' : 'Tel Kafes'}</button>
      <button class="btn" id="btn-grid" title="${isEn ? 'Toggle Floor Grid' : 'Zemin Izgarasını Göster/Gizle'}">${toolbarIcon('grid')}${isEn ? 'Grid' : 'Izgara'}</button>
      <button class="btn" id="btn-rotate" title="${isEn ? 'Toggle Auto Rotation' : 'Otomatik Dönüşü Aç/Kapat'}">${toolbarIcon('rotate')}${isEn ? 'Rotate' : 'Döndür'}</button>
      <button class="btn" id="btn-reset" title="${isEn ? 'Reset Camera' : 'Kamerayı Sıfırla'}">${toolbarIcon('reset')}${isEn ? 'Reset' : 'Sıfırla'}</button>
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
