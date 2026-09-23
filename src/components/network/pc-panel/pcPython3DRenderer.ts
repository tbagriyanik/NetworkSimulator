// pcPython3DRenderer.ts
// Interactive WebGL 3D Scene and Standalone HTML Generator for embedded Python 3D engine

import type { Python3DSceneState } from './pcPython3DTypes';
import { colors, withAlpha } from '@/lib/design-tokens/colors';

/**
 * Escapes unsafe string values for HTML injection
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    // Intentional HTML entity: generated iframe HTML must not receive raw apostrophes.
    .replace(/'/g, '&#039;');
}

/**
 * Generates an interactive, standalone HTML5 3D WebGL application
 * that can run inside an iframe (PCBrowser) or saved as a .html file.
 */
export function generate3DSceneHtml(scene: Python3DSceneState): string {
  const sceneDataJson = JSON.stringify(scene).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>${escapeHtml(scene.title || '3D WebGL Sahne')}</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      user-select: none;
      -webkit-user-select: none;
    }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background-color: ${colors.terminal.bg};
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: ${colors.topology.noteText};
    }
    #viewport-container {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      touch-action: none;
    }
    canvas#render-canvas {
      width: 100%;
      height: 100%;
      display: block;
      outline: none;
    }
    /* Modern Glassmorphic Top Controls Bar */
    .toolbar {
      position: absolute;
      top: 12px;
      left: 12px;
      right: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      pointer-events: none;
      z-index: 20;
    }
    .toolbar-group {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: ${withAlpha(colors.topology.bg, 0.75)};
      border: 1px solid ${withAlpha(colors.common.white, 0.12)};
      border-radius: 12px;
      padding: 6px 10px;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      box-shadow: 0 10px 25px -5px ${withAlpha(colors.common.black, 0.5)};
      pointer-events: auto;
    }
    .btn {
      appearance: none;
      border: 1px solid ${withAlpha(colors.common.white, 0.1)};
      background: ${withAlpha(colors.common.white, 0.06)};
      color: ${colors.topology.noteText};
      padding: 5px 9px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 5px;
      transition: all 0.15s ease;
    }
    .btn:hover {
      background: ${withAlpha(colors.common.white, 0.14)};
      border-color: ${withAlpha(colors.common.white, 0.25)};
      color: ${colors.common.white};
      transform: translateY(-1px);
    }
    .btn:active {
      transform: translateY(0);
    }
    .btn.active {
      background: ${colors.theme.primary};
      border-color: ${colors.theme.accent};
      color: ${colors.common.white};
    }
    .badge {
      font-size: 10px;
      font-family: monospace;
      padding: 2px 6px;
      border-radius: 6px;
      background: ${withAlpha(colors.common.white, 0.08)};
      color: ${colors.theme.accent};
      border: 1px solid ${withAlpha(colors.sky['400'], 0.2)};
    }
    /* Floating Info & Help Footer */
    .footer-help {
      position: absolute;
      bottom: 12px;
      left: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      background: ${withAlpha(colors.topology.bg, 0.7)};
      border: 1px solid ${withAlpha(colors.common.white, 0.08)};
      border-radius: 10px;
      font-size: 10px;
      color: ${colors.topology.subText};
      backdrop-filter: blur(8px);
      pointer-events: none;
      z-index: 20;
    }
    .footer-help span {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .footer-help kbd {
      background: ${withAlpha(colors.common.white, 0.12)};
      border-radius: 4px;
      padding: 1px 4px;
      color: ${colors.terminal.fg};
      font-family: monospace;
      font-size: 9px;
    }
  </style>
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

  <script>
    const sceneData = ${sceneDataJson};

    (function() {
      const canvas = document.getElementById('render-canvas');
      const gl = canvas.getContext('webgl', {
        antialias: true,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: true
      }) || canvas.getContext('experimental-webgl', {
        powerPreference: 'high-performance'
      });
      
      let width = canvas.clientWidth;
      let height = canvas.clientHeight;
      let autoRotate = sceneData.autoRotate || false;
      let showWireframe = false;
      let showGrid = sceneData.environment && sceneData.environment.grid ? sceneData.environment.grid.enabled !== false : true;

      // Camera & Orbit State with Smooth Inertial Damping
      let camDistance = 14;
      let targetDistance = 14;
      let camTheta = Math.PI / 4;
      let targetTheta = Math.PI / 4;
      let camPhi = Math.PI / 6;
      let targetPhi = Math.PI / 6;
      let camTarget = [0, 0, 0];
      let targetPan = [0, 0, 0];
      let isDragging = false;
      let dragButton = 0;
      let lastMouseX = 0;
      let lastMouseY = 0;

      function resize() {
        if (!canvas.parentElement) return;
        width = Math.max(1, canvas.parentElement.clientWidth);
        height = Math.max(1, canvas.parentElement.clientHeight);
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        if (gl) {
          gl.viewport(0, 0, canvas.width, canvas.height);
        }
      }
      window.addEventListener('resize', resize);
      if (typeof ResizeObserver !== 'undefined' && canvas.parentElement) {
        new ResizeObserver(resize).observe(canvas.parentElement);
      }
      resize();

      // UI Button hooks
      const btnWire = document.getElementById('btn-wireframe');
      const btnGrid = document.getElementById('btn-grid');
      const btnRot = document.getElementById('btn-rotate');
      const btnReset = document.getElementById('btn-reset');

      if (btnWire) {
        btnWire.addEventListener('click', () => {
          showWireframe = !showWireframe;
          btnWire.classList.toggle('active', showWireframe);
        });
      }
      if (btnGrid) {
        btnGrid.classList.toggle('active', showGrid);
        btnGrid.addEventListener('click', () => {
          showGrid = !showGrid;
          btnGrid.classList.toggle('active', showGrid);
        });
      }
      if (btnRot) {
        btnRot.classList.toggle('active', autoRotate);
        btnRot.addEventListener('click', () => {
          autoRotate = !autoRotate;
          btnRot.classList.toggle('active', autoRotate);
        });
      }
      if (btnReset) {
        btnReset.addEventListener('click', () => {
          targetDistance = 14;
          targetTheta = Math.PI / 4;
          targetPhi = Math.PI / 6;
          targetPan = [0, 0, 0];
        });
      }

      // Pointer Capture & Smooth Orbit/Pan Controls
      canvas.addEventListener('pointerdown', (e) => {
        try { canvas.setPointerCapture(e.pointerId); } catch {}
        isDragging = true;
        dragButton = e.button;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
      });

      canvas.addEventListener('pointerup', (e) => {
        try { canvas.releasePointerCapture(e.pointerId); } catch {}
        isDragging = false;
      });

      canvas.addEventListener('pointercancel', () => {
        isDragging = false;
      });

      canvas.addEventListener('pointermove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - lastMouseX;
        const dy = e.clientY - lastMouseY;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;

        if (dragButton === 0) { // Rotate Orbit
          targetTheta -= dx * 0.006;
          targetPhi = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, targetPhi + dy * 0.006));
        } else { // Pan
          const panSpeed = targetDistance * 0.0012;
          const rightX = Math.cos(targetTheta);
          const rightZ = -Math.sin(targetTheta);
          targetPan[0] -= (rightX * dx) * panSpeed;
          targetPan[2] -= (rightZ * dx) * panSpeed;
          targetPan[1] += dy * panSpeed;
        }
      });

      canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        targetDistance = Math.max(2, Math.min(100, targetDistance * (1 + e.deltaY * 0.0012)));
      }, { passive: false });

      // Touch Pinch-to-Zoom and Dual-finger Pan
      let touchStartDist = 0;
      canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          touchStartDist = Math.hypot(dx, dy);
        }
      }, { passive: true });

      canvas.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2) {
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          const dist = Math.hypot(dx, dy);
          if (touchStartDist > 0) {
            const factor = touchStartDist / dist;
            targetDistance = Math.max(2, Math.min(100, targetDistance * factor));
            touchStartDist = dist;
          }
        }
      }, { passive: true });

      // Matrix utilities
      function mat4Create() {
        const out = new Float32Array(16);
        out[0] = 1; out[5] = 1; out[10] = 1; out[15] = 1;
        return out;
      }
      function mat4Perspective(out, fovy, aspect, near, far) {
        const f = 1.0 / Math.tan(fovy / 2);
        const nf = 1 / (near - far);
        out[0] = f / aspect; out[1] = 0; out[2] = 0; out[3] = 0;
        out[4] = 0; out[5] = f; out[6] = 0; out[7] = 0;
        out[8] = 0; out[9] = 0; out[10] = (far + near) * nf; out[11] = -1;
        out[12] = 0; out[13] = 0; out[14] = (2 * far * near) * nf; out[15] = 0;
        return out;
      }
      function mat4LookAt(out, eye, center, up) {
        let x0, x1, x2, y0, y1, y2, z0, z1, z2, len;
        let eyex = eye[0], eyey = eye[1], eyez = eye[2];
        let upx = up[0], upy = up[1], upz = up[2];
        let centerx = center[0], centery = center[1], centerz = center[2];

        z0 = eyex - centerx; z1 = eyey - centery; z2 = eyez - centerz;
        len = 1 / Math.hypot(z0, z1, z2);
        z0 *= len; z1 *= len; z2 *= len;

        x0 = upy * z2 - upz * z1;
        x1 = upz * z0 - upx * z2;
        x2 = upx * z1 - upy * z0;
        len = 1 / Math.hypot(x0, x1, x2);
        x0 *= len; x1 *= len; x2 *= len;

        y0 = z1 * x2 - z2 * x1;
        y1 = z2 * x0 - z0 * x2;
        y2 = z0 * x1 - z1 * x0;
        len = 1 / Math.hypot(y0, y1, y2);
        y0 *= len; y1 *= len; y2 *= len;

        out[0] = x0; out[1] = y0; out[2] = z0; out[3] = 0;
        out[4] = x1; out[5] = y1; out[6] = z1; out[7] = 0;
        out[8] = x2; out[9] = y2; out[10] = z2; out[11] = 0;
        out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
        out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
        out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
        out[15] = 1;
        return out;
      }
      function mat4Multiply(out, a, b) {
        const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
        const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
        const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
        const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
        let b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
        out[0] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
        out[1] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
        out[2] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
        out[3] = b0*a03 + b1*a13 + b2*a23 + b3*a33;
        b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
        out[4] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
        out[5] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
        out[6] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
        out[7] = b0*a03 + b1*a13 + b2*a23 + b3*a33;
        b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
        out[8] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
        out[9] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
        out[10] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
        out[11] = b0*a03 + b1*a13 + b2*a23 + b3*a33;
        b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
        out[12] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
        out[13] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
        out[14] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
        out[15] = b0*a03 + b1*a13 + b2*a23 + b3*a33;
        return out;
      }
      function mat4FromTranslationRotationScale(out, pos, rotDeg, scale) {
        const rx = rotDeg[0] * Math.PI / 180;
        const ry = rotDeg[1] * Math.PI / 180;
        const rz = rotDeg[2] * Math.PI / 180;

        const cx = Math.cos(rx), sx = Math.sin(rx);
        const cy = Math.cos(ry), sy = Math.sin(ry);
        const cz = Math.cos(rz), sz = Math.sin(rz);

        // Euler ZYX
        out[0] = (cy * cz) * scale[0];
        out[1] = (cy * sz) * scale[0];
        out[2] = (-sy) * scale[0];
        out[3] = 0;

        out[4] = (sx * sy * cz - cx * sz) * scale[1];
        out[5] = (sx * sy * sz + cx * cz) * scale[1];
        out[6] = (sx * cy) * scale[1];
        out[7] = 0;

        out[8] = (cx * sy * cz + sx * sz) * scale[2];
        out[9] = (cx * sy * sz - sx * cz) * scale[2];
        out[10] = (cx * cy) * scale[2];
        out[11] = 0;

        out[12] = pos[0];
        out[13] = pos[1];
        out[14] = pos[2];
        out[15] = 1;
        return out;
      }

      // Color parsing helper
      function parseColor(str) {
        if (!str) return [0.5, 0.5, 0.5, 1];
        if (str.startsWith('#')) {
          let hex = str.slice(1);
          if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
          const num = parseInt(hex, 16);
          return [(num >> 16 & 255) / 255, (num >> 8 & 255) / 255, (num & 255) / 255, 1];
        }
        const lower = str.toLowerCase();
        const map = {
          red: [0.9, 0.2, 0.2, 1],
          blue: [0.2, 0.5, 0.95, 1],
          green: [0.15, 0.8, 0.35, 1],
          yellow: [0.95, 0.85, 0.15, 1],
          cyan: [0.1, 0.8, 0.9, 1],
          orange: [0.95, 0.5, 0.1, 1],
          purple: [0.7, 0.3, 0.9, 1],
          white: [0.95, 0.95, 0.95, 1],
          gray: [0.5, 0.5, 0.5, 1],
          black: [0.1, 0.1, 0.1, 1]
        };
        return map[lower] || [0.4, 0.6, 0.8, 1];
      }

      // Geometry Generators (Plane, Cube, Sphere, Cylinder, Prism)
      function createPlaneGeometry(w = 10, h = 10) {
        const hw = w / 2, hh = h / 2;
        const positions = [
          // Top face (CCW viewed from +Y)
          -hw, 0, -hh,   -hw, 0, hh,    hw, 0, -hh,
          hw, 0, -hh,    -hw, 0, hh,    hw, 0, hh,
          // Bottom face (CCW viewed from -Y)
          -hw, 0, -hh,   hw, 0, -hh,    -hw, 0, hh,
          hw, 0, -hh,    hw, 0, hh,     -hw, 0, hh
        ];
        const normals = [
          0, 1, 0,  0, 1, 0,  0, 1, 0,
          0, 1, 0,  0, 1, 0,  0, 1, 0,
          0, -1, 0, 0, -1, 0, 0, -1, 0,
          0, -1, 0, 0, -1, 0, 0, -1, 0
        ];
        return { positions: new Float32Array(positions), normals: new Float32Array(normals), count: 12 };
      }

      function createCubeGeometry(w = 2, h = 2, d = 2) {
        const hw = w / 2, hh = h / 2, hd = d / 2;
        const pos = [];
        const nor = [];
        function addFace(p, n) {
          pos.push(...p[0], ...p[1], ...p[2], ...p[0], ...p[2], ...p[3]);
          for (let i = 0; i < 6; i++) nor.push(...n);
        }
        // Front
        addFace([[-hw, -hh, hd], [hw, -hh, hd], [hw, hh, hd], [-hw, hh, hd]], [0, 0, 1]);
        // Back
        addFace([[hw, -hh, -hd], [-hw, -hh, -hd], [-hw, hh, -hd], [hw, hh, -hd]], [0, 0, -1]);
        // Top
        addFace([[-hw, hh, hd], [hw, hh, hd], [hw, hh, -hd], [-hw, hh, -hd]], [0, 1, 0]);
        // Bottom
        addFace([[-hw, -hh, -hd], [hw, -hh, -hd], [hw, -hh, hd], [-hw, -hh, hd]], [0, -1, 0]);
        // Right
        addFace([[hw, -hh, hd], [hw, -hh, -hd], [hw, hh, -hd], [hw, hh, hd]], [1, 0, 0]);
        // Left
        addFace([[-hw, -hh, -hd], [-hw, -hh, hd], [-hw, hh, hd], [-hw, hh, -hd]], [-1, 0, 0]);
        return { positions: new Float32Array(pos), normals: new Float32Array(nor), count: pos.length / 3 };
      }

      function createSphereGeometry(radius = 1.5, seg = 24, rings = 16) {
        const pos = [];
        const nor = [];
        for (let r = 0; r < rings; r++) {
          const theta1 = (r / rings) * Math.PI;
          const theta2 = ((r + 1) / rings) * Math.PI;
          for (let s = 0; s < seg; s++) {
            const phi1 = (s / seg) * 2 * Math.PI;
            const phi2 = ((s + 1) / seg) * 2 * Math.PI;

            const p1 = [radius * Math.sin(theta1) * Math.cos(phi1), radius * Math.cos(theta1), radius * Math.sin(theta1) * Math.sin(phi1)];
            const p2 = [radius * Math.sin(theta1) * Math.cos(phi2), radius * Math.cos(theta1), radius * Math.sin(theta1) * Math.sin(phi2)];
            const p3 = [radius * Math.sin(theta2) * Math.cos(phi2), radius * Math.cos(theta2), radius * Math.sin(theta2) * Math.sin(phi2)];
            const p4 = [radius * Math.sin(theta2) * Math.cos(phi1), radius * Math.cos(theta2), radius * Math.sin(theta2) * Math.sin(phi1)];

            pos.push(...p1, ...p2, ...p3, ...p1, ...p3, ...p4);
            [p1, p2, p3, p1, p3, p4].forEach(p => {
              const len = Math.hypot(p[0], p[1], p[2]) || 1;
              nor.push(p[0] / len, p[1] / len, p[2] / len);
            });
          }
        }
        return { positions: new Float32Array(pos), normals: new Float32Array(nor), count: pos.length / 3 };
      }

      function createCylinderGeometry(radius = 1, height = 2, seg = 24) {
        const pos = [];
        const nor = [];
        const hh = height / 2;
        for (let s = 0; s < seg; s++) {
          const phi1 = (s / seg) * 2 * Math.PI;
          const phi2 = ((s + 1) / seg) * 2 * Math.PI;
          const cos1 = Math.cos(phi1), sin1 = Math.sin(phi1);
          const cos2 = Math.cos(phi2), sin2 = Math.sin(phi2);

          // Side quad (CCW outward winding)
          const p1 = [radius * cos1, -hh, radius * sin1];
          const p2 = [radius * cos2, -hh, radius * sin2];
          const p3 = [radius * cos2, hh, radius * sin2];
          const p4 = [radius * cos1, hh, radius * sin1];
          pos.push(...p1, ...p4, ...p3, ...p1, ...p3, ...p2);
          nor.push(
            cos1, 0, sin1,  cos1, 0, sin1,  cos2, 0, sin2,
            cos1, 0, sin1,  cos2, 0, sin2,  cos2, 0, sin2
          );

          // Top cap (CCW viewed from above +Y)
          pos.push(0, hh, 0, radius * cos2, hh, radius * sin2, radius * cos1, hh, radius * sin1);
          nor.push(0, 1, 0,  0, 1, 0,  0, 1, 0);

          // Bottom cap (CCW viewed from below -Y)
          pos.push(0, -hh, 0, radius * cos1, -hh, radius * sin1, radius * cos2, -hh, radius * sin2);
          nor.push(0, -1, 0,  0, -1, 0,  0, -1, 0);
        }
        return { positions: new Float32Array(pos), normals: new Float32Array(nor), count: pos.length / 3 };
      }

      function createPrismGeometry(sides = 3, radius = 1.5, height = 2) {
        const numSides = Math.max(3, Math.floor(sides));
        const pos = [];
        const nor = [];
        const hh = height / 2;
        for (let s = 0; s < numSides; s++) {
          const phi1 = (s / numSides) * 2 * Math.PI;
          const phi2 = ((s + 1) / numSides) * 2 * Math.PI;
          const midPhi = (phi1 + phi2) / 2;
          const cos1 = Math.cos(phi1), sin1 = Math.sin(phi1);
          const cos2 = Math.cos(phi2), sin2 = Math.sin(phi2);
          const nCos = Math.cos(midPhi), nSin = Math.sin(midPhi);

          // Side quad (CCW outward winding)
          const p1 = [radius * cos1, -hh, radius * sin1];
          const p2 = [radius * cos2, -hh, radius * sin2];
          const p3 = [radius * cos2, hh, radius * sin2];
          const p4 = [radius * cos1, hh, radius * sin1];
          pos.push(...p1, ...p4, ...p3, ...p1, ...p3, ...p2);
          for (let i = 0; i < 6; i++) {
            nor.push(nCos, 0, nSin);
          }

          // Top cap (CCW viewed from above +Y)
          pos.push(0, hh, 0, radius * cos2, hh, radius * sin2, radius * cos1, hh, radius * sin1);
          nor.push(0, 1, 0,  0, 1, 0,  0, 1, 0);

          // Bottom cap (CCW viewed from below -Y)
          pos.push(0, -hh, 0, radius * cos1, -hh, radius * sin1, radius * cos2, -hh, radius * sin2);
          nor.push(0, -1, 0,  0, -1, 0,  0, -1, 0);
        }
        return { positions: new Float32Array(pos), normals: new Float32Array(nor), count: pos.length / 3 };
      }

      // Grid geometry
      function createGridGeometry(size = 20, divs = 20) {
        const lines = [];
        const half = size / 2;
        const step = size / divs;
        for (let i = 0; i <= divs; i++) {
          const x = -half + i * step;
          lines.push(x, 0, -half, x, 0, half);
          lines.push(-half, 0, x, half, 0, x);
        }
        return { positions: new Float32Array(lines), count: lines.length / 3 };
      }

      // Shaders
      const vsSource = \`
        attribute vec3 aPosition;
        attribute vec3 aNormal;
        uniform mat4 uModel;
        uniform mat4 uView;
        uniform mat4 uProjection;
        varying vec3 vNormal;
        varying vec3 vFragPos;

        void main() {
          vec4 worldPos = uModel * vec4(aPosition, 1.0);
          vFragPos = worldPos.xyz;
          vNormal = normalize(mat3(uModel) * aNormal);
          gl_Position = uProjection * uView * worldPos;
        }
      \`;

      const fsSource = \`
        precision mediump float;
        varying vec3 vNormal;
        varying vec3 vFragPos;

        uniform vec4 uColor;
        uniform vec3 uSunDir;
        uniform vec3 uSunColor;
        uniform vec3 uLampPos;
        uniform vec3 uLampColor;
        uniform vec3 uAmbientColor;
        uniform float uRoughness;
        uniform float uMetalness;
        uniform bool uIsWireframe;

        void main() {
          if (uIsWireframe) {
            gl_FragColor = uColor;
            return;
          }
          vec3 N = normalize(vNormal);

          // Directional Sun Light
          vec3 Lsun = normalize(uSunDir);
          float diffSun = max(dot(N, Lsun), 0.0);
          vec3 sunContrib = uSunColor * diffSun;

          // Point Lamp Light
          vec3 Llamp = normalize(uLampPos - vFragPos);
          float dist = length(uLampPos - vFragPos);
          float atten = 1.0 / (1.0 + 0.09 * dist + 0.032 * (dist * dist));
          float diffLamp = max(dot(N, Llamp), 0.0);
          vec3 lampContrib = uLampColor * diffLamp * atten;

          // Combined Phong/PBR approximation
          vec3 diffuse = (uAmbientColor + sunContrib + lampContrib) * uColor.rgb;
          
          // Specular highlight
          vec3 viewDir = normalize(-vFragPos);
          vec3 reflectDir = reflect(-Lsun, N);
          float spec = pow(max(dot(viewDir, reflectDir), 0.0), mix(4.0, 64.0, 1.0 - uRoughness));
          vec3 specular = mix(vec3(0.04), uColor.rgb, uMetalness) * spec;

          gl_FragColor = vec4(diffuse + specular, uColor.a);
        }
      \`;

      const lineVsSource = \`
        attribute vec3 aPosition;
        uniform mat4 uView;
        uniform mat4 uProjection;
        void main() {
          gl_Position = uProjection * uView * vec4(aPosition, 1.0);
        }
      \`;
      const lineFsSource = \`
        precision mediump float;
        uniform vec4 uLineColor;
        void main() {
          gl_FragColor = uLineColor;
        }
      \`;

      function compileShader(type, src) {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
          console.error(gl.getShaderInfoLog(s));
          gl.deleteShader(s);
          return null;
        }
        return s;
      }

      function createProgram(vs, fs) {
        const p = gl.createProgram();
        gl.attachShader(p, vs);
        gl.attachShader(p, fs);
        gl.linkProgram(p);
        return p;
      }

      const prog = createProgram(compileShader(gl.VERTEX_SHADER, vsSource), compileShader(gl.FRAGMENT_SHADER, fsSource));
      const lineProg = createProgram(compileShader(gl.VERTEX_SHADER, lineVsSource), compileShader(gl.FRAGMENT_SHADER, lineFsSource));

      // Pre-cached Uniform and Attribute locations to eliminate 60 FPS string lookup overhead
      const progLoc = {
        uModel: gl.getUniformLocation(prog, 'uModel'),
        uView: gl.getUniformLocation(prog, 'uView'),
        uProjection: gl.getUniformLocation(prog, 'uProjection'),
        uColor: gl.getUniformLocation(prog, 'uColor'),
        uSunDir: gl.getUniformLocation(prog, 'uSunDir'),
        uSunColor: gl.getUniformLocation(prog, 'uSunColor'),
        uLampPos: gl.getUniformLocation(prog, 'uLampPos'),
        uLampColor: gl.getUniformLocation(prog, 'uLampColor'),
        uAmbientColor: gl.getUniformLocation(prog, 'uAmbientColor'),
        uRoughness: gl.getUniformLocation(prog, 'uRoughness'),
        uMetalness: gl.getUniformLocation(prog, 'uMetalness'),
        uIsWireframe: gl.getUniformLocation(prog, 'uIsWireframe'),
        aPosition: gl.getAttribLocation(prog, 'aPosition'),
        aNormal: gl.getAttribLocation(prog, 'aNormal'),
      };

      const lineLoc = {
        uView: gl.getUniformLocation(lineProg, 'uView'),
        uProjection: gl.getUniformLocation(lineProg, 'uProjection'),
        uLineColor: gl.getUniformLocation(lineProg, 'uLineColor'),
        aPosition: gl.getAttribLocation(lineProg, 'aPosition'),
      };

      // Buffer cache
      function makeMeshBuffers(geom) {
        const pb = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, pb);
        gl.bufferData(gl.ARRAY_BUFFER, geom.positions, gl.STATIC_DRAW);

        let nb = null;
        if (geom.normals) {
          nb = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, nb);
          gl.bufferData(gl.ARRAY_BUFFER, geom.normals, gl.STATIC_DRAW);
        }
        return { pb, nb, count: geom.count };
      }

      const gridBuffers = makeMeshBuffers(createGridGeometry(20, 20));

      // Prepare Scene Objects
      const renderables = [];
      function processObject(obj) {
        let geom;
        const p = obj.params || {};
        if (obj.type === 'cube') {
          geom = createCubeGeometry(p.width || p.size || 2, p.height || p.size || 2, p.depth || p.size || 2);
        } else if (obj.type === 'sphere') {
          geom = createSphereGeometry(p.radius || 1.5, p.segments || 24, p.rings || 16);
        } else if (obj.type === 'cylinder') {
          geom = createCylinderGeometry(p.radius || 1, p.height || 2, p.segments || 24);
        } else if (obj.type === 'prism') {
          geom = createPrismGeometry(p.sides || 3, p.radius || 1.5, p.height || 2);
        } else if (obj.type === 'plane') {
          geom = createPlaneGeometry(p.width || 10, p.height || 10);
        } else {
          geom = createCubeGeometry(1, 1, 1);
        }

        const buffers = makeMeshBuffers(geom);
        renderables.push({
          data: obj,
          buffers,
          color: parseColor(obj.material && obj.material.color ? obj.material.color : '${colors.status.info}'),
          roughness: obj.material && obj.material.roughness !== undefined ? obj.material.roughness : 0.4,
          metalness: obj.material && obj.material.metalness !== undefined ? obj.material.metalness : 0.1,
          operation: obj.operation || 'none',
        });

        // Also process children or operands if combined/subtracted
        if (obj.operands && Array.isArray(obj.operands)) {
          obj.operands.forEach(child => processObject(child));
        }
      }

      if (sceneData.objects && Array.isArray(sceneData.objects)) {
        sceneData.objects.forEach(processObject);
      }

      // Sky gradient colors
      let skyTop = [0.05, 0.08, 0.15, 1.0];
      let skyBottom = [0.02, 0.03, 0.06, 1.0];
      if (sceneData.environment && sceneData.environment.sky) {
        const sky = sceneData.environment.sky;
        if (sky.type === 'day') {
          skyTop = [0.2, 0.5, 0.9, 1.0];
          skyBottom = [0.7, 0.85, 0.95, 1.0];
        } else if (sky.type === 'sunset') {
          skyTop = [0.35, 0.15, 0.45, 1.0];
          skyBottom = [0.95, 0.45, 0.2, 1.0];
        }
      }

      // Render Loop with Delta-time & Smooth Interpolation
      const projMat = mat4Create();
      const viewMat = mat4Create();
      const modelMat = mat4Create();
      let lastTime = performance.now();

      function render() {
        const now = performance.now();
        const dt = Math.min((now - lastTime) / 1000, 0.1);
        lastTime = now;

        if (autoRotate && !isDragging) {
          targetTheta += 0.5 * dt; // 0.5 rad/s smooth constant rotation
        }

        // Smooth Exponential Damping (Lerp) for Camera Orbit, Distance & Pan
        const lerpFactor = 1.0 - Math.exp(-22 * dt);
        camTheta += (targetTheta - camTheta) * lerpFactor;
        camPhi += (targetPhi - camPhi) * lerpFactor;
        camDistance += (targetDistance - camDistance) * lerpFactor;
        camTarget[0] += (targetPan[0] - camTarget[0]) * lerpFactor;
        camTarget[1] += (targetPan[1] - camTarget[1]) * lerpFactor;
        camTarget[2] += (targetPan[2] - camTarget[2]) * lerpFactor;

        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(skyTop[0], skyTop[1], skyTop[2], 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);

        // Compute camera matrices
        const eyeX = camTarget[0] + camDistance * Math.cos(camPhi) * Math.sin(camTheta);
        const eyeY = camTarget[1] + camDistance * Math.sin(camPhi);
        const eyeZ = camTarget[2] + camDistance * Math.cos(camPhi) * Math.cos(camTheta);
        mat4LookAt(viewMat, [eyeX, eyeY, eyeZ], camTarget, [0, 1, 0]);
        mat4Perspective(projMat, Math.PI / 4, width / height, 0.1, 1000.0);

        // 1. Draw Grid
        if (showGrid) {
          gl.disable(gl.CULL_FACE);
          gl.useProgram(lineProg);
          gl.uniformMatrix4fv(lineLoc.uView, false, viewMat);
          gl.uniformMatrix4fv(lineLoc.uProjection, false, projMat);
          gl.uniform4f(lineLoc.uLineColor, 0.3, 0.4, 0.5, 0.4);

          gl.bindBuffer(gl.ARRAY_BUFFER, gridBuffers.pb);
          gl.enableVertexAttribArray(lineLoc.aPosition);
          gl.vertexAttribPointer(lineLoc.aPosition, 3, gl.FLOAT, false, 0, 0);
          gl.drawArrays(gl.LINES, 0, gridBuffers.count);
        }

        // 2. Draw 3D Objects
        gl.useProgram(prog);
        gl.uniformMatrix4fv(progLoc.uView, false, viewMat);
        gl.uniformMatrix4fv(progLoc.uProjection, false, projMat);

        // Lights (Set once per frame)
        gl.uniform3f(progLoc.uSunDir, 5.0, 10.0, 5.0);
        gl.uniform3f(progLoc.uSunColor, 0.9, 0.9, 0.95);
        gl.uniform3f(progLoc.uLampPos, 0.0, 5.0, 0.0);
        gl.uniform3f(progLoc.uLampColor, 1.0, 0.85, 0.6);
        gl.uniform3f(progLoc.uAmbientColor, 0.25, 0.28, 0.35);

        gl.enableVertexAttribArray(progLoc.aPosition);
        gl.enableVertexAttribArray(progLoc.aNormal);

        renderables.forEach(item => {
          mat4FromTranslationRotationScale(
            modelMat,
            item.data.position || [0, 0, 0],
            item.data.rotation || [0, 0, 0],
            item.data.scale || [1, 1, 1]
          );
          gl.uniformMatrix4fv(progLoc.uModel, false, modelMat);

          const isSub = item.operation === 'subtract';
          const col = isSub ? [0.95, 0.2, 0.2, 0.7] : item.color;
          const isWire = showWireframe || item.data.material?.wireframe;

          if (isWire) {
            gl.disable(gl.CULL_FACE);
          } else {
            gl.enable(gl.CULL_FACE);
            gl.cullFace(gl.BACK);
          }

          gl.uniform4fv(progLoc.uColor, col);
          gl.uniform1f(progLoc.uRoughness, item.roughness);
          gl.uniform1f(progLoc.uMetalness, item.metalness);
          gl.uniform1i(progLoc.uIsWireframe, isWire ? 1 : 0);

          gl.bindBuffer(gl.ARRAY_BUFFER, item.buffers.pb);
          gl.vertexAttribPointer(progLoc.aPosition, 3, gl.FLOAT, false, 0, 0);

          if (item.buffers.nb) {
            gl.bindBuffer(gl.ARRAY_BUFFER, item.buffers.nb);
            gl.vertexAttribPointer(progLoc.aNormal, 3, gl.FLOAT, false, 0, 0);
          }

          const mode = isWire ? gl.LINES : gl.TRIANGLES;
          gl.drawArrays(mode, 0, item.buffers.count);
        });

        requestAnimationFrame(render);
      }

      render();
    })();
  </script>
</body>
</html>`;
}
