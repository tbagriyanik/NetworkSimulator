import { colors } from '@/lib/design-tokens/colors';
import { IFRAME_FONT_FACES_CSS, INRIA_SANS_STACK, GEIST_MONO_STACK } from '@/lib/design-tokens/iframeFonts';

export function getWifiControlPanelStyles(): string {
  return `
    ${IFRAME_FONT_FACES_CSS}
    :root {
      --color-primary-500: ${colors.status.info};
      --color-primary-600: ${colors.blue['600']};
      --color-primary-700: ${colors.blue['700']};
      --color-primary-100: ${colors.blue['100']};
      --color-secondary-100: ${colors.terminal.fg};
      --color-secondary-200: ${colors.topology.noteText};
      --color-secondary-300: ${colors.terminal.output};
      --color-secondary-400: ${colors.cables.default};
      --color-secondary-500: ${colors.cables.console};
      --color-secondary-700: ${colors.topology.gridLine};
      --color-secondary-900: ${colors.topology.bg};
      --color-success-500: ${colors.status.active};
      --color-success-600: ${colors.green['600']};
      --color-warning-500: ${colors.packet.http};
      --color-warning-600: ${colors.yellow['600']};
      --color-error-500: ${colors.status.offline};
      --color-error-600: ${colors.red['600']};
      --color-accent-600: ${colors.teal['600']};
    }
    
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    html, body {
      width: 100%;
      min-height: 100%;
      overflow-y: auto;
      overflow-x: auto;
    }
    
    body {
      font-family: ${INRIA_SANS_STACK};
      background: ${colors.topology.deviceText};
      color: var(--color-secondary-900);
      line-height: 1.5;
      padding: 20px;
      font-size: 14px;
    }
    
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: ${colors.common.white};
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      overflow: hidden;
    }
    
    .header {
      background: linear-gradient(135deg, var(--color-secondary-900) 0%, ${colors.topology.canvasBg} 100%);
      color: ${colors.common.white};
      padding: 24px;
    }
    
    .header h1 { font-size: 22px; font-weight: 700; margin-bottom: 4px; display: flex; align-items: center; gap: 8px; }
    .header .subtitle { color: var(--color-secondary-400); font-size: 13px; }
    .header .device-info { display: flex; gap: 16px; margin-top: 12px; font-size: 12px; color: var(--color-secondary-300); }
    
    .nav-tabs { display: flex; background: var(--color-secondary-100); border-bottom: 1px solid var(--color-secondary-200); padding: 0 16px; overflow-x: auto; }
    .nav-tab { padding: 14px 20px; font-weight: 600; font-size: 13px; color: var(--color-secondary-500); cursor: pointer; border: none; background: none; border-bottom: 2px solid transparent; transition: all 0.2s; white-space: nowrap; }
    .nav-tab:hover { color: var(--color-primary-600); }
    .nav-tab.active { color: var(--color-primary-600); border-bottom-color: var(--color-primary-600); }
    
    .content { padding: 24px; }
    .panel-title { font-size: 16px; font-weight: 700; margin-bottom: 16px; color: var(--color-secondary-900); display: flex; align-items: center; justify-content: space-between; }
    
    .status-card { display: flex; align-items: center; justify-content: space-between; background: linear-gradient(135deg, ${colors.sky['50']} 0%, ${colors.sky['50']} 100%); border: 1px solid ${colors.sky['100']}; border-radius: 8px; padding: 16px; margin-bottom: 20px; }
    .status-card.disabled { background: var(--color-secondary-100); border-color: var(--color-secondary-200); }
    .status-info h3 { font-size: 14px; font-weight: 600; }
    .status-info p { font-size: 12px; color: var(--color-secondary-500); }
    .status-badge { padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; background: var(--color-success-500); color: ${colors.common.white}; }
    .status-card.disabled .status-badge { background: var(--color-secondary-400); }
    
    .form-group { margin-bottom: 18px; }
    .form-group label { display: block; font-weight: 600; margin-bottom: 6px; font-size: 13px; }
    .form-group input[type="text"], .form-group input[type="password"], .form-group input[type="number"], .form-group select {
      width: 100%; padding: 10px 12px; border: 1px solid var(--color-secondary-300); border-radius: 6px; font-size: 13px; font-family: ${INRIA_SANS_STACK}; transition: border-color 0.2s; background-color: var(--color-common-white, ${colors.common.white}); color: var(--color-secondary-900);
    }
    .form-group select option {
      font-size: 13px; font-family: ${INRIA_SANS_STACK}; padding: 6px; background-color: var(--color-white); color: var(--color-secondary-900);
    }
    .form-group input:focus, .form-group select:focus { outline: none; border-color: var(--color-primary-500); box-shadow: 0 0 0 3px rgba(59,130,246,0.15); }
    .hint { display: block; font-size: 11px; color: var(--color-secondary-500); margin-top: 4px; }
    
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    
    .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 20px; font-weight: 600; border-radius: 6px; border: none; cursor: pointer; transition: all 0.2s; font-size: 13px; }
    .btn-primary { background: var(--color-primary-600); color: ${colors.common.white}; }
    .btn-primary:hover { background: var(--color-primary-700); }
    .btn-secondary { background: var(--color-secondary-200); color: var(--color-secondary-700); }
    .btn-secondary:hover { background: var(--color-secondary-300); }
    .btn-danger { background: var(--color-error-500); color: ${colors.common.white}; }
    .btn-danger:hover { background: var(--color-error-600); }
    .btn-block { width: 100%; }
    
    .actions { display: flex; gap: 12px; margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--color-secondary-200); }
    
    .toggle-switch { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: ${colors.topology.deviceText}; border-radius: 8px; border: 1px solid var(--color-secondary-200); margin-bottom: 20px; }
    .switch { position: relative; display: inline-block; width: 44px; height: 24px; }
    .switch input { opacity: 0; width: 0; height: 0; }
    .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: var(--color-secondary-300); transition: .3s; border-radius: 24px; }
    .slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .3s; border-radius: 50%; }
    input:checked + .slider { background-color: var(--color-success-500); }
    input:checked + .slider:before { transform: translateX(20px); }
    
    .login-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15,23,42,0.8); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; overflow-y: auto; box-sizing: border-box; }
    .login-card { background: ${colors.common.white}; border-radius: 12px; width: 100%; max-width: 400px; padding: 32px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); }
    .login-header { text-align: center; margin-bottom: 24px; }
    .login-icon { font-size: 40px; margin-bottom: 8px; }
    .error-message { background: ${colors.red['50']}; border: 1px solid ${colors.red['200']}; color: var(--color-error-600); padding: 10px; border-radius: 6px; font-size: 12px; margin-bottom: 16px; text-align: center; }
    .success-message { background: ${colors.green['50']}; border: 1px solid ${colors.green['200']}; color: var(--color-success-700, ${colors.green['700']}); padding: 10px; border-radius: 6px; font-size: 12px; margin-bottom: 16px; text-align: center; }

    /* Client list table styles */
    .client-card { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: ${colors.topology.deviceText}; border: 1px solid var(--color-secondary-200); border-radius: 8px; margin-bottom: 8px; transition: all 0.2s; }
    .client-card:hover { border-color: var(--color-primary-500); background: ${colors.common.white}; }
    .client-icon { width: 36px; height: 36px; border-radius: 8px; background: var(--color-primary-100); display: flex; align-items: center; justify-content: center; font-size: 18px; color: var(--color-primary-600); shrink: 0; }
    .client-details { display: flex; flex-direction: column; min-width: 0; }
    .client-title { font-weight: 600; color: var(--color-secondary-900); font-size: 13px; display: flex; align-items: center; gap: 8px; }
    .client-sub { font-size: 11px; color: var(--color-secondary-500); font-family: ${GEIST_MONO_STACK}; }
    .mono { font-family: ${GEIST_MONO_STACK}; }
    .client-badges { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .badge { padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; background: var(--color-secondary-100); color: var(--color-secondary-700); }
    .badge-primary { background: ${colors.blue['100']}; color: ${colors.blue['700']}; }
    .badge-success { background: ${colors.green['100']}; color: ${colors.green['700']}; }
    .badge-warning { background: ${colors.yellow['100']}; color: ${colors.yellow['700']}; }

    @media (max-width: 600px) {
      body { padding: 10px; }
      .grid-2 { grid-template-columns: 1fr; gap: 0; }
      .actions { flex-direction: column; }
      .btn { width: 100%; }
      .status-card { flex-direction: column; align-items: flex-start; gap: 10px; }
      .client-card { flex-direction: column; align-items: flex-start; gap: 10px; }
    }
  `;
}
