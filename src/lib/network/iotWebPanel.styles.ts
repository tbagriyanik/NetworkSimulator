/**
 * IoT Web Panel Styles Module
 * Generates CSS styles for IoT web panel
 */

import { colors, withAlpha } from '@/lib/design-tokens/colors';
import { IFRAME_FONT_FACES_CSS, INRIA_SANS_STACK, GEIST_MONO_STACK } from '@/lib/design-tokens/iframeFonts';

export function generateIotPanelStyles(): string {
  return `
    ${IFRAME_FONT_FACES_CSS}
    :root {
      --color-primary-500: ${colors.status.info};
      --color-primary-700: ${colors.blue['700']};
      --color-secondary-500: ${colors.cables.console};
      --color-secondary-600: ${colors.cables.disabled};
      --color-secondary-200: ${colors.topology.noteText};
      --color-secondary-300: ${colors.terminal.output};
      --color-success-500: ${colors.status.active};
      --color-success-600: ${colors.green['600']};
      --color-warning-500: ${colors.status.warning};
      --color-warning-700: ${colors.amber['700']};
      --color-error-500: ${colors.status.offline};
      --color-error-600: ${colors.red['600']};
      --color-theme.primary: ${colors.theme.primary};
      --color-theme.primaryHover: ${colors.theme.primaryHover};
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: ${INRIA_SANS_STACK};
      background-color: ${colors.neutral['100']};
      color: ${colors.neutral.dark};
      padding: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
      touch-action: manipulation;
      box-sizing: border-box;
    }
    .container {
      background-color: ${colors.common.white};
      border-radius: 8px;
      box-shadow: 0 4px 12px ${withAlpha(colors.common.black, 0.08)};
      padding: 30px;
      max-width: 600px;
      width: 100%;
      box-sizing: border-box;
    }
    h1 {
      color: var(--color-primary-700);
      text-align: center;
      margin-bottom: 25px;
      font-size: 24px;
      font-weight: 600;
    }
    .login-form {
      text-align: center;
    }
    .form-group {
      margin-bottom: 20px;
      text-align: left;
    }
    label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
      color: var(--color-secondary-600);
    }
    input[type="text"],
    input[type="password"] {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid ${colors.neutral['400']};
      border-radius: 5px;
      box-sizing: border-box;
      font-size: 16px;
    }
    .login-button {
      background-color: var(--color-success-500);
      color: white;
      border: none;
      border-radius: 5px;
      padding: 12px 25px;
      cursor: pointer;
      font-size: 16px;
      font-weight: 600;
      transition: background-color 0.2s ease;
      width: 100%;
    }
    .login-button:hover {
      background-color: var(--color-success-600);
    }
    .error-message {
      color: var(--color-error-500);
      font-size: 14px;
      margin-top: 10px;
      display: none;
    }
    .iot-device-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background-color: var(--color-secondary-200);
      border: 1px solid var(--color-secondary-200);
      border-radius: 6px;
      padding: 15px 20px;
      margin-bottom: 15px;
      transition: all 0.2s ease-in-out;
    }
    .device-list {
      display: grid;
      grid-template-columns: 1fr;
      gap: 12px;
    }
    .iot-device-card.powered-off {
      background-color: ${colors.red['100']};
      border-color: ${colors.red.light};
      opacity: 0.7;
    }
    .iot-device-card.connected {
      background-color: ${colors.green['100']};
      border-color: ${colors.green['300']};
    }
    .iot-device-card.connected-inactive {
      background-color: ${colors.amber['100']};
      border-color: ${colors.amber['200']};
    }
    .iot-device-card.active {
      background-color: var(--color-primary-100);
      border-color: ${colors.sky['200']};
    }
    .iot-device-card.inactive {
      background-color: ${colors.neutral.soft};
      border-color: var(--color-secondary-300);
      opacity: 0.7;
    }
    .iot-device-card.offline {
      background-color: ${colors.neutral['450']};
      border-color: ${colors.neutral.medium};
      opacity: 0.6;
    }
    .iot-device-card.wifi-disabled {
      background-color: var(--color-warning-100);
      border-color: ${colors.amber.light};
    }
    .iot-device-card.powered-off.wifi-disabled {
      background-color: ${colors.neutral['450']};
      border-color: ${colors.neutral.medium};
    }
    .device-info {
      flex: 1;
    }
    .device-name {
      font-weight: 600;
      font-size: 16px;
      color: ${colors.neutral.dark};
    }
    .device-details {
      display: flex;
      flex-direction: column;
      gap: 2px;
      margin: 6px 0;
    }
    .device-ip,
    .device-mac {
      font-size: 12px;
      color: var(--color-muted-foreground);
      font-family: ${GEIST_MONO_STACK};
    }
    .device-rules,
    .device-rule-count {
      font-size: 12px;
      color: ${colors.green['800']};
      font-weight: 600;
    }
    .device-status {
      font-size: 13px;
      margin-top: 4px;
      color: var(--color-muted-foreground);
    }
    .device-status.offline {
      color: var(--color-error-500);
      font-weight: 500;
    }
    .device-status.online {
      color: ${colors.green['800']};
      font-weight: 500;
    }
    .device-status.online-inactive {
      color: ${colors.amber['800']};
      font-weight: 500;
    }
    .device-status.active {
      color: var(--color-theme.primaryHover);
      font-weight: 500;
    }
    .device-status.inactive {
      color: var(--color-secondary-500);
      font-weight: 500;
    }
    .device-status.disabled {
      color: var(--color-warning-700);
      font-weight: 500;
    }
    .iot-device-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px ${withAlpha(colors.common.black, 0.1)};
    }
    @media (min-width: 768px) {
      .device-list {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .iot-device-card {
        margin-bottom: 0;
      }
    }
    @media (min-width: 1200px) {
      .device-list {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }
    @media (max-width: 640px) {
      .iot-device-card {
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
      }
      .connect-button {
        width: 100%;
      }
    }
    .connect-button {
      background-color: var(--color-primary-500);
      color: white;
      border: none;
      border-radius: 5px;
      padding: 8px 15px;
      cursor: pointer;
      font-size: 14px;
      transition: background-color 0.2s ease;
    }
    .connect-button:hover {
      background-color: var(--color-primary-700);
    }
    .no-devices {
      text-align: center;
      color: var(--color-secondary-500);
      font-style: italic;
      margin-top: 20px;
    }
    .hidden {
      display: none;
    }
    .logout-button {
      position: absolute;
      top: 20px;
      right: 20px;
      background-color: var(--color-error-500);
      color: white;
      border: none;
      border-radius: 5px;
      padding: 8px 15px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      transition: background-color 0.2s ease;
    }
    .logout-button:hover {
      background-color: var(--color-error-600);
    }
    .settings-icon {
      position: absolute;
      top: 20px;
      right: 20px;
      background-color: var(--color-secondary-500);
      color: white;
      border: none;
      border-radius: 5px;
      padding: 8px 12px;
      cursor: pointer;
      font-size: 18px;
      font-weight: 600;
      transition: background-color 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
    }
    .settings-icon:hover {
      background-color: var(--color-secondary-500);
    }
    .settings-popup {
      position: absolute;
      top: 70px;
      right: 20px;
      background-color: ${colors.common.white};
      border: 1px solid var(--color-secondary-200);
      border-radius: 8px;
      box-shadow: 0 4px 12px ${withAlpha(colors.common.black, 0.15)};
      padding: 15px;
      min-width: 250px;
      z-index: 1000;
      display: none;
    }
    .settings-popup.show {
      display: block;
    }
    .settings-popup-title {
      font-size: 14px;
      font-weight: 600;
      color: ${colors.neutral.dark};
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--color-secondary-200);
    }
    .settings-option {
      margin-bottom: 15px;
    }
    .settings-option:last-child {
      margin-bottom: 0;
    }
    .settings-option label {
      display: block;
      font-size: 13px;
      font-weight: 500;
      color: var(--color-secondary-600);
      margin-bottom: 8px;
    }
    .settings-input {
      width: 100%;
      padding: 8px 10px;
      border: 1px solid ${colors.neutral['400']};
      border-radius: 5px;
      box-sizing: border-box;
      font-size: 14px;
    }
    .settings-button {
      width: 100%;
      background-color: var(--color-primary-500);
      color: white;
      border: none;
      border-radius: 5px;
      padding: 8px 12px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      transition: background-color 0.2s ease;
      margin-top: 5px;
    }
    .settings-button:hover {
      background-color: var(--color-primary-700);
    }
    .settings-button.logout {
      background-color: var(--color-error-500);
    }
    .settings-button.logout:hover {
      background-color: var(--color-error-600);
    }
    .password-success {
      color: var(--color-success-500);
      font-size: 12px;
      margin-top: 5px;
      display: none;
    }
    .password-error {
      color: var(--color-error-500);
      font-size: 12px;
      margin-top: 5px;
      display: none;
    }
  `;
}