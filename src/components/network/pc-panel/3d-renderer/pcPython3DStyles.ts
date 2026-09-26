import { colors, withAlpha } from '@/lib/design-tokens/colors';

export function get3DSceneStyles(): string {
  return `
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
  `;
}
