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
export function generate3DSceneHtml(scene: Python3DSceneState): string {
  const sceneDataJson = JSON.stringify(scene).replace(/</g, '\\u003c');
  const styles = get3DSceneStyles();
  const script = get3DSceneScript(sceneDataJson);

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>${escapeHtml(scene.title || '3D WebGL Sahne')}</title>
  <style>${styles}</style>
</head>
<body>
  <div id="viewport-container">
    <canvas id="render-canvas"></canvas>
  </div>

  <header class="toolbar">
    <div class="toolbar-group">
      <span style="font-weight: 700; font-size: 12px; color: ${colors.theme.accent}; margin-right: 4px;">🧊 ${escapeHtml(scene.title || '3D Sahne')}</span>
      <span class="badge" id="obj-count-badge">${scene.objects.length} Nesne</span>
    </div>
    <div class="toolbar-group">
      <button class="btn" id="btn-wireframe" title="Tel Çerçeve Modu">🌐 Tel Kafes</button>
      <button class="btn" id="btn-grid" title="Zemin Izgarasını Göster/Gizle">▦ Izgara</button>
      <button class="btn" id="btn-rotate" title="Otomatik Dönüşü Aç/Kapat">🔄 Döndür</button>
      <button class="btn" id="btn-reset" title="Kamerayı Sıfırla">🎯 Sıfırla</button>
    </div>
  </header>

  <footer class="footer-help">
    <span><kbd>Sol Tık + Sürükle</kbd> Döndür</span>
    <span>•</span>
    <span><kbd>Sağ Tık + Sürükle</kbd> Kaydır</span>
    <span>•</span>
    <span><kbd>Tekerlek / Pinch</kbd> Yakınlaştır</span>
  </footer>

  <script>${script}</script>
</body>
</html>`;
}
