import { colors, withAlpha } from '@/lib/design-tokens/colors';

export function get3DSceneStyles(isDark: boolean = true): string {
  const bgBody = isDark ? colors.terminal.bg : colors.neutral['50'];
  const textBody = isDark ? colors.topology.noteText : colors.slate['900'];
  const bgGroup = isDark ? withAlpha(colors.topology.bg, 0.75) : 'rgba(255, 255, 255, 0.92)';
  const borderGroup = isDark ? withAlpha(colors.common.white, 0.12) : 'rgba(203, 213, 225, 0.9)';
  const shadowGroup = isDark ? withAlpha(colors.common.black, 0.5) : 'rgba(15, 23, 42, 0.12)';
  
  const bgBtn = isDark ? withAlpha(colors.common.white, 0.06) : withAlpha(colors.neutral['100'], 0.9);
  const borderBtn = isDark ? withAlpha(colors.common.white, 0.1) : withAlpha(colors.neutral['300'], 0.8);
  const textBtn = isDark ? colors.topology.noteText : colors.slate['800'];
  const bgBtnHover = isDark ? withAlpha(colors.common.white, 0.14) : colors.neutral['200'];
  
  const bgSelect = isDark ? withAlpha(colors.common.black, 0.4) : colors.common.white;
  const borderSelect = isDark ? withAlpha(colors.common.white, 0.15) : colors.neutral['400'];
  const textSelect = isDark ? colors.theme.accent : colors.theme.primary;
  
  const bgFooter = isDark ? withAlpha(colors.topology.bg, 0.7) : withAlpha(colors.common.white, 0.9);
  const borderFooter = isDark ? withAlpha(colors.common.white, 0.08) : withAlpha(colors.neutral['300'], 0.8);
  const textFooter = isDark ? colors.topology.subText : colors.neutral['500'];
  const bgKbd = isDark ? withAlpha(colors.common.white, 0.12) : colors.neutral['200'];
  const textKbd = isDark ? colors.terminal.fg : colors.slate['900'];

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
      background-color: ${bgBody};
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: ${textBody};
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
      background: ${bgGroup};
      border: 1px solid ${borderGroup};
      border-radius: 12px;
      padding: 6px 10px;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      box-shadow: 0 10px 25px -5px ${shadowGroup};
      pointer-events: auto;
    }
    .btn {
      appearance: none;
      border: 1px solid ${borderBtn};
      background: ${bgBtn};
      color: ${textBtn};
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
      background: ${bgBtnHover};
      border-color: ${isDark ? withAlpha(colors.common.white, 0.25) : colors.cables.default};
      color: ${isDark ? colors.common.white : colors.slate['900']};
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
      color: ${isDark ? colors.theme.accent : colors.theme.primary};
      border: 1px solid ${withAlpha(colors.sky['400'], 0.2)};
    }
    .theme-select {
      appearance: none;
      -webkit-appearance: none;
      border: 1px solid ${borderSelect};
      background: ${bgSelect};
      color: ${textSelect};
      padding: 4px 8px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      outline: none;
      transition: all 0.15s ease;
    }
    .theme-select:hover {
      background: ${isDark ? withAlpha(colors.common.black, 0.6) : colors.terminal.fg};
      border-color: ${colors.theme.accent};
    }
    .theme-select option {
      background: ${bgBody};
      color: ${textBody};
    }
    .footer-help {
      position: absolute;
      bottom: 12px;
      left: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      background: ${bgFooter};
      border: 1px solid ${borderFooter};
      border-radius: 10px;
      font-size: 10px;
      color: ${textFooter};
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
      background: ${bgKbd};
      border-radius: 4px;
      padding: 1px 4px;
      color: ${textKbd};
      font-family: monospace;
      font-size: 9px;
    }
  `;
}
