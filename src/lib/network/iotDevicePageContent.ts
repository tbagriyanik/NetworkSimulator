import { CanvasDevice } from '@/components/network/NetworkTopology/types/networkTopology.types';
import { sanitizeHTML, safeJSONForHTML } from '@/lib/security/sanitizer';
import { colors, withAlpha } from '@/lib/design-tokens/colors';
import { IotRule } from './iotWebPanel.types';
import { IFRAME_FONT_FACES_CSS, INRIA_SANS_STACK } from '@/lib/design-tokens/iframeFonts';

export const generateIotDevicePageContent = (
  deviceId: string,
  deviceName: string,
  language: string,
  isActive: boolean = true,
  isPoweredOff: boolean = false,
  _kind: string = 'sensor',
  rules: IotRule[] = [],
  _sensorType: string = 'temperature',
  _iotDevices: CanvasDevice[] = [],
  _dataFlowDirection: 'input' | 'output' | 'input/output' = 'input',
  allDevices: CanvasDevice[] = []
): string => {
  const isTurkish = language === 'tr';
  const safeName = sanitizeHTML(deviceName);
  const safeId = sanitizeHTML(deviceId);
  // Use safeJSONForHTML for embedding strings in <script> blocks to prevent XSS and logic corruption.
  const jsId = safeJSONForHTML(deviceId);
  const sensorTypeLabels: Record<string, string> = {
    temperature: isTurkish ? 'Isı (Sıcaklık)' : 'Temperature',
    light: isTurkish ? 'Işık' : 'Light',
    humidity: isTurkish ? 'Nem' : 'Humidity',
    sound: isTurkish ? 'Ses' : 'Sound',
    motion: isTurkish ? 'Hareket' : 'Motion',
  };
  const topologySensorDevices = allDevices.filter(d =>
    d.type === 'iot' &&
    d.iot?.sensorType &&
    (
      d.iot?.dataFlowDirection === 'input' ||
      d.iot?.dataFlowDirection === 'input/output' ||
      d.iot?.kind === 'sensor' ||
      !d.iot?.dataFlowDirection
    )
  );
  const sensorOptionsHtml = topologySensorDevices.length > 0
    ? topologySensorDevices.map(d => {
      const sensor = d.iot?.sensorType || 'temperature';
      const label = sensorTypeLabels[sensor] || sensor;
      return `<option value="iot:${sanitizeHTML(d.id)}:${sanitizeHTML(sensor)}">${sanitizeHTML(d.name || d.id)} (${sanitizeHTML(label)})</option>`;
    }).join('')
    : Object.entries(sensorTypeLabels).map(([value, label]) => (
      `<option value="${sanitizeHTML(value)}">${sanitizeHTML(label)}</option>`
    )).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${isTurkish ? 'IoT Cihaz Yönetimi' : 'IoT Device Management'}: ${safeName}</title>
        <style>
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
            --color-error-500: ${colors.status.offline};
            --color-error-600: ${colors.red['600']};
            --color-warning-100: ${colors.amber['100']};
            --color-warning-700: ${colors.amber['700']};
          }
          html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            min-height: 100%;
            overflow-y: auto;
            overflow-x: auto;
          }
          body {
            font-family: ${INRIA_SANS_STACK};
            background-color: ${colors.neutral['100']};
            color: ${colors.neutral.dark};
            padding: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            box-sizing: border-box;
          }
          .device-panel {
            background-color: ${colors.common.white};
            border-radius: 8px;
            box-shadow: 0 4px 12px ${withAlpha(colors.common.black, 0.08)};
            padding: 30px;
            max-width: 500px;
            width: 100%;
            box-sizing: border-box;
            text-align: center;
          }
          h1 {
            color: var(--color-primary-700);
            margin-bottom: 25px;
            font-size: 22px;
            font-weight: 600;
          }
          .device-info {
            background-color: ${colors.neutral['50']};
            border-radius: 6px;
            padding: 20px;
            margin-bottom: 25px;
            text-align: left;
          }
          .device-info p {
            margin: 10px 0;
            font-size: 14px;
          }
          .device-info strong {
            color: var(--color-secondary-600);
            display: inline-block;
            width: 120px;
          }
          .toggle-section {
            margin-bottom: 25px;
          }
          .toggle-label {
            font-size: 16px;
            font-weight: 500;
            margin-bottom: 15px;
            display: block;
          }
          .toggle-switch {
            position: relative;
            display: inline-block;
            width: 60px;
            height: 34px;
          }
          .toggle-switch input {
            opacity: 0;
            width: 0;
            height: 0;
          }
          .slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: ${colors.neutral.muted};
            transition: .4s;
            border-radius: 34px;
          }
          .slider:before {
            position: absolute;
            content: "";
            height: 26px;
            width: 26px;
            left: 4px;
            bottom: 4px;
            background-color: ${colors.common.white};
            transition: .4s;
            border-radius: 50%;
          }
          input:checked + .slider {
            background-color: var(--color-success-500);
          }
          input:checked + .slider:before {
            transform: translateX(26px);
          }
          .status-text {
            margin-top: 10px;
            font-size: 14px;
            font-weight: 500;
          }
          .status-active {
            color: var(--color-success-500);
          }
          .status-inactive {
            color: var(--color-error-500);
          }
          .toggle-disabled {
            opacity: 0.5;
            pointer-events: none;
          }
          .power-off-message {
            background-color: var(--color-warning-100);
            border: 1px solid ${colors.amber['400']};
            border-radius: 6px;
            padding: 15px;
            margin-bottom: 25px;
            text-align: center;
            color: var(--color-warning-700);
            font-size: 14px;
            font-weight: 500;
          }
          .back-button {
            background-color: var(--color-secondary-500);
            color: ${colors.common.white};
            border: none;
            border-radius: 5px;
            padding: 12px 25px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 600;
            transition: background-color 0.2s ease;
            margin-top: 10px;
          }
          .back-button:hover {
            background-color: var(--color-secondary-500);
          }
          .programming-section {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid ${colors.neutral.light};
            text-align: left;
          }
          .programming-title {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 15px;
            color: ${colors.neutral.dark};
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .rule-form {
            display: flex;
            flex-direction: column;
            gap: 10px;
            background: ${colors.neutral['50']};
            padding: 15px;
            border-radius: 6px;
            margin-bottom: 15px;
          }
          .rule-form select, .rule-form input {
            padding: 8px;
            border: 1px solid ${colors.neutral.lighter};
            border-radius: 4px;
            font-size: 13px;
          }
          .add-rule-btn {
            background: var(--color-primary-500);
            color: ${colors.common.white};
            border: none;
            padding: 8px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 600;
          }
          .rule-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .rule-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: ${colors.common.white};
            border: 1px solid ${colors.neutral.light};
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 13px;
          }
          .delete-rule-btn {
            background: none;
            border: none;
            color: var(--color-error-500);
            font-size: 18px;
            cursor: pointer;
            padding: 0 5px;
          }
          .device-visual {
            font-size: 48px;
            margin-bottom: 15px;
            filter: grayscale(${isActive ? 0 : 1});
            transition: all 0.3s ease;
          }
        </style>
      </head>
      <body>
        <div class="device-panel">
          <h1>${safeName} ${isTurkish ? 'Yönetimi' : 'Management'}</h1>
          
          <div class="device-info">
            <p><strong>${isTurkish ? 'Cihaz ID' : 'Device ID'}:</strong> ${safeId}</p>
            <p><strong>${isTurkish ? 'Cihaz Adı' : 'Device Name'}:</strong> ${safeName}</p>
            <p><strong>${isTurkish ? 'Güç Durumu' : 'Power Status'}:</strong> ${isPoweredOff ? (isTurkish ? 'Kapalı' : 'Off') : (isTurkish ? 'Açık' : 'On')}</p>
            <p><strong>${isTurkish ? 'Durum' : 'Status'}:</strong> <span id="statusText" class="${isActive ? 'status-active' : 'status-inactive'}">${isActive ? (isTurkish ? 'Aktif' : 'Active') : (isTurkish ? 'Pasif' : 'Inactive')}</span></p>
          </div>

          ${isPoweredOff ? `
          <div class="power-off-message">
            ${isTurkish ? '⚠️  Cihaz kapalı. Ayarları değiştirmek için önce cihazı açın.' : '⚠️  Device is powered off. Turn on the device to change settings.'}
          </div>
          ` : ''}

          <div class="toggle-section ${isPoweredOff ? 'toggle-disabled' : ''}">
            <label class="toggle-label">${isTurkish ? 'Cihaz Durumu' : 'Device Status'}</label>
            <label class="toggle-switch">
              <input type="checkbox" id="deviceToggle" ${isActive ? 'checked' : ''} ${isPoweredOff ? 'disabled' : ''} onchange="toggleDevice()">
              <span class="slider"></span>
            </label>
            <div id="statusMessage" class="status-text ${isActive ? 'status-active' : 'status-inactive'}">
              ${isActive ? (isTurkish ? 'Cihaz aktif' : 'Device is active') : (isTurkish ? 'Cihaz pasif' : 'Device is inactive')}
            </div>
          </div>

          ${`
          <div class="programming-section ${isPoweredOff ? 'toggle-disabled' : ''}">
            <div class="programming-title">
              <span>⚙️ ${isTurkish ? 'Basit Programlama' : 'Simple Programming'}</span>
            </div>

            <div class="rule-form">
              <div style="font-size: 12px; margin-bottom: 5px; font-weight: 500;">${isTurkish ? 'Yeni Kural Ekle:' : 'Add New Rule:'}</div>
              <div style="display: flex; flex-direction: column; gap: 8px;">
                <div style="display: flex; align-items: center; gap: 5px;">
                  <span style="font-size: 12px; min-width: 35px;">${isTurkish ? 'EĞER' : 'IF'}</span>
                  <select id="sensorSelect" style="flex: 1;">
                    ${sensorOptionsHtml}
                  </select>
                  <select id="operatorSelect">
                    <option value=">">&gt;</option>
                    <option value="<">&lt;</option>
                    <option value="==">=</option>
                  </select>
                  <input type="number" id="thresholdInput" style="width: 50px;" value="25">
                </div>
                <div style="display: flex; align-items: center; gap: 5px;">
                  <span style="font-size: 12px; min-width: 35px;">${isTurkish ? 'O ZAMAN' : 'THEN'}</span>
                  <select id="targetDeviceSelect" style="flex: 1;">
                    <option value="this">${isTurkish ? 'Bu Cihaz' : 'This Device'}</option>
                    ${allDevices.filter(d => d.id !== deviceId && d.type === 'iot' && (d.iot?.dataFlowDirection === 'output' || d.iot?.dataFlowDirection === 'input/output' || d.iot?.kind === 'cooler' || d.iot?.kind === 'lamp' || d.iot?.kind === 'heater')).map(d => `
                      <option value="${sanitizeHTML(d.id)}">${sanitizeHTML(d.name || d.id)} ${d.iot?.kind ? '(' + sanitizeHTML(isTurkish ? (d.iot.kind === 'cooler' ? 'Soğutucu' : d.iot.kind === 'lamp' ? 'Lamba' : d.iot.kind === 'heater' ? 'Isıtıcı' : d.iot.kind) : d.iot.kind) + ')' : ''}</option>
                    `).join('')}
                  </select>
                  <select id="actionSelect">
                    <option value="ON">${isTurkish ? 'AÇ' : 'TURN ON'}</option>
                    <option value="OFF">${isTurkish ? 'KAPAT' : 'TURN OFF'}</option>
                  </select>
                </div>
                <button class="add-rule-btn" onclick="addRule()">${isTurkish ? 'Ekle' : 'Add Rule'}</button>
              </div>
            </div>

            <div class="rule-list" id="ruleList">
              ${(rules || []).map(rule => {
    const safeCondition = sanitizeHTML(rule.condition);
    const safeAction = sanitizeHTML(rule.action);
    const jsRuleId = safeJSONForHTML(rule.id).replace(/"/g, '&quot;');
    return `
                <div class="rule-item">
                  <span>${safeCondition} &rarr; ${safeAction}</span>
                  <button onclick="deleteRule(${jsRuleId})" class="delete-rule-btn" title="${isTurkish ? 'Kuralı sil' : 'Delete rule'}" aria-label="${isTurkish ? 'Kuralı sil: ' : 'Delete rule: '}${safeCondition}"><span aria-hidden="true">&times;</span></button>
                </div>
              `;
  }).join('')}
            </div>
          </div>
          `}

          <button type="button" class="back-button" onclick="goBack()" style="margin-top: 20px;">
            ${isTurkish ? 'Listeye Dön' : 'Back to List'}
          </button>
        </div>

        <script>
          const isPoweredOff = ${isPoweredOff};
          const deviceId = ${safeJSONForHTML(deviceId)};
          let rules = ${safeJSONForHTML(rules || [])};

          function escapeHtml(text) {
            if (!text) return '';
            return String(text)
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&${colors.common.navy};');
          }

          function addRule() {
            if (isPoweredOff) return;

            const sensor = document.getElementById('sensorSelect').value;
            const operator = document.getElementById('operatorSelect').value;
            const threshold = document.getElementById('thresholdInput').value;
            const target = document.getElementById('targetDeviceSelect').value;
            const action = document.getElementById('actionSelect').value;

            const condition = \`\${sensor} \${operator} \${threshold}\`;
            const fullAction = target === 'this' ? action : \`\${target}:\${action}\`;

            const newRule = {
              id: 'rule-' + Date.now().toString(36) + '-' + (rules.length + 1),
              condition,
              action: fullAction,
              enabled: true
            };

            rules.push(newRule);
            updateRuleList();
            saveRules();
          }

          function deleteRule(ruleId) {
            if (isPoweredOff) return;
            rules = rules.filter(r => r.id !== ruleId);
            updateRuleList();
            saveRules();
          }

          function updateRuleList() {
            const list = document.getElementById('ruleList');
            if (!list) return;
            list.textContent = '';
            rules.forEach(rule => {
              const row = document.createElement('div');
              row.className = 'rule-item';

              const label = document.createElement('span');
              label.textContent = rule.condition + ' → ' + rule.action;

              const delBtn = document.createElement('button');
              delBtn.className = 'delete-rule-btn';
              delBtn.textContent = '×';
              delBtn.addEventListener('click', function () {
                deleteRule(rule.id);
              });

              row.appendChild(label);
              row.appendChild(delBtn);
              list.appendChild(row);
            });
          }

          function toggleDevice() {
            if (isPoweredOff) return;

            const toggle = document.getElementById('deviceToggle');
            const statusText = document.getElementById('statusText');
            const statusMessage = document.getElementById('statusMessage');
            const deviceVisual = document.getElementById('deviceVisual');

            if (toggle.checked) {
              statusText.textContent = '${isTurkish ? 'Aktif' : 'Active'}';
              statusText.className = 'status-text status-active';
              statusMessage.textContent = '${isTurkish ? 'Cihaz aktif' : 'Device is active'}';
              statusMessage.className = 'status-text status-active';
              window.parent.postMessage({ type: 'toggle-iot-device', deviceId: ${jsId}, active: true }, '*');
            } else {
              statusText.textContent = '${isTurkish ? 'Pasif' : 'Inactive'}';
              statusText.className = 'status-text status-inactive';
              statusMessage.textContent = '${isTurkish ? 'Cihaz pasif' : 'Device is inactive'}';
              statusMessage.className = 'status-text status-inactive';
              window.parent.postMessage({ type: 'toggle-iot-device', deviceId: ${jsId}, active: false }, '*');
            }
            updateRuleList();
          }

          function saveRules() {
            window.parent.postMessage({ type: 'update-iot-rules', deviceId, rules }, '*');
          }

          function goBack() {
            window.parent.postMessage({ type: 'back-to-iot-list' }, '*');
          }
        </script>
      </body>
    </html>
  `;
};
