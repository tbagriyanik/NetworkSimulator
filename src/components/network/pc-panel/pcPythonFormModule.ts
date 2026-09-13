import type { PythonFormState, FormElement, FormElementType, FormElementLayout } from './pcPythonFormTypes';
import { colors } from '@/lib/design-tokens/colors';

// Global registry of active forms per device
const activeForms = new Map<string, PythonFormState>();
// Listener callback for form updates
type FormChangeListener = (form: PythonFormState | null) => void;
const formListeners = new Map<string, Set<FormChangeListener>>();

export function subscribeToDeviceForm(deviceId: string, listener: FormChangeListener): () => void {
  let listeners = formListeners.get(deviceId);
  if (!listeners) {
    listeners = new Set();
    formListeners.set(deviceId, listeners);
  }
  listeners.add(listener);
  // Send current state
  listener(activeForms.get(deviceId) || null);

  return () => {
    listeners?.delete(listener);
    if (listeners && listeners.size === 0) {
      formListeners.delete(deviceId);
    }
  };
}

export function getActiveDeviceForm(deviceId: string): PythonFormState | null {
  return activeForms.get(deviceId) || null;
}

export function closeActiveDeviceForm(deviceId: string): void {
  activeForms.delete(deviceId);
  notifyFormChange(deviceId, null);
}

function notifyFormChange(deviceId: string, form: PythonFormState | null) {
  const listeners = formListeners.get(deviceId);
  if (listeners) {
    listeners.forEach(fn => fn(form ? { ...form, elements: [...form.elements] } : null));
  }
}

/** Generate standalone interactive HTML for displaying the form inside PCBrowser */
export function generateFormHtml(form: PythonFormState): string {
  const title = form.title || 'Python Form Application';
  return `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      --bg-color: ${colors.topology.bg};
      --card-bg: rgba(30, 41, 59, 0.85);
      --text-color: ${colors.terminal.fg};
      --text-muted: ${colors.topology.subText};
      --border-color: rgba(51, 65, 85, 0.8);
      --primary: ${colors.theme.accent};
      --primary-hover: ${colors.sky[500]};
      --primary-fg: ${colors.topology.bg};
      --input-bg: ${colors.topology.canvasBg};
      --accent: ${colors.indigo[500]};
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg-color);
      color: var(--text-color);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      padding: 24px 16px;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .form-container {
      width: 100%;
      max-width: ${form.width ? `${form.width}px` : '540px'};
      background: var(--card-bg);
      backdrop-filter: blur(12px);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4);
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .form-header {
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 12px;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .form-header h1 {
      font-size: 1.15rem;
      font-weight: 600;
      color: var(--primary);
      letter-spacing: -0.01em;
    }
    .badge {
      font-size: 0.7rem;
      background: rgba(56, 189, 248, 0.15);
      color: var(--primary);
      padding: 2px 8px;
      border-radius: 9999px;
      font-family: monospace;
    }
    .form-item {
      display: flex;
      flex-direction: column;
      gap: 6px;
      width: 100%;
    }
    .form-item-inline {
      flex-direction: row;
      align-items: center;
      gap: 10px;
    }
    label {
      font-size: 0.85rem;
      font-weight: 500;
      color: var(--text-muted);
    }
    input[type="text"], input[type="password"], textarea, select {
      width: 100%;
      background: var(--input-bg);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      padding: 8px 12px;
      color: var(--text-color);
      font-size: 0.875rem;
      font-family: inherit;
      outline: none;
      transition: all 0.2s;
    }
    input[type="text"]:focus, input[type="password"]:focus, textarea:focus, select:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.25);
    }
    textarea {
      resize: vertical;
      min-height: 70px;
    }
    .btn {
      background: var(--primary);
      color: var(--primary-fg);
      border: none;
      border-radius: 6px;
      padding: 9px 16px;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s;
      width: 100%;
    }
    .btn:hover {
      background: var(--primary-hover);
      transform: translateY(-1px);
    }
    .btn:active {
      transform: translateY(0);
    }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.08);
      color: var(--text-color);
      border: 1px solid var(--border-color);
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.15);
    }
    .separator {
      height: 1px;
      background: var(--border-color);
      margin: 8px 0;
      width: 100%;
    }
    .vr-line {
      display: inline-block;
      width: 1px;
      height: 32px;
      background: var(--border-color);
      margin: 0 8px;
      vertical-align: middle;
    }
    .listbox {
      border: 1px solid var(--border-color);
      border-radius: 6px;
      background: var(--input-bg);
      max-height: 140px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
    }
    .listbox-item {
      padding: 6px 12px;
      font-size: 0.825rem;
      color: var(--text-color);
      cursor: pointer;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      transition: background 0.15s;
    }
    .listbox-item:last-child {
      border-bottom: none;
    }
    .listbox-item:hover {
      background: rgba(255, 255, 255, 0.06);
    }
    .listbox-item.selected {
      background: rgba(56, 189, 248, 0.25);
      color: var(--primary);
      font-weight: 500;
    }
    .checkbox-label, .radio-label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-size: 0.875rem;
      color: var(--text-color);
      user-select: none;
    }
    .radio-group {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
    }
    .status-box {
      margin-top: 10px;
      padding: 10px 14px;
      border-radius: 6px;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid var(--border-color);
      font-size: 0.8rem;
      font-family: monospace;
      color: var(--primary);
      display: none;
    }
  </style>
</head>
<body>
  <div class="form-container">
    <div class="form-header">
      <h1>${escapeHtml(title)}</h1>
      <span class="badge">Python Form Web App</span>
    </div>
    <form id="pyForm" onsubmit="event.preventDefault();">
      ${form.elements.map(el => renderElementHtml(el)).join('\n')}
    </form>
    <div id="statusBox" class="status-box"></div>
  </div>

  <script>
    function triggerAction(elemId, actionType, val) {
      const box = document.getElementById('statusBox');
      box.style.display = 'block';
      box.textContent = '[' + new Date().toLocaleTimeString() + '] ' + actionType + ' -> ' + elemId + (val !== undefined ? ': ' + val : '');
    }

    function selectListItem(item, elemId, val) {
      const parent = item.parentElement;
      const items = parent.querySelectorAll('.listbox-item');
      items.forEach(i => i.classList.remove('selected'));
      item.classList.add('selected');
      triggerAction(elemId, 'select', val);
    }
  </script>
</body>
</html>`;
}

function renderElementHtml(el: FormElement): string {
  switch (el.type) {
    case 'button':
      return `
      <div class="form-item" style="margin-top: 4px;">
        <button type="button" class="btn" id="${el.id}" onclick="triggerAction('${el.id}', 'click')">
          ${escapeHtml(el.text || 'Düğme')}
        </button>
      </div>`;

    case 'label':
      return `
      <div class="form-item">
        <label id="${el.id}" style="color: var(--text-color); font-size: 0.95rem;">${escapeHtml(el.text || '')}</label>
      </div>`;

    case 'entry':
      return `
      <div class="form-item">
        ${el.text ? `<label for="${el.id}">${escapeHtml(el.text)}</label>` : ''}
        <input type="text" id="${el.id}" value="${escapeHtml(String(el.value || ''))}" placeholder="${escapeHtml(el.placeholder || '')}" oninput="triggerAction('${el.id}', 'change', this.value)" />
      </div>`;

    case 'textarea':
      return `
      <div class="form-item">
        ${el.text ? `<label for="${el.id}">${escapeHtml(el.text)}</label>` : ''}
        <textarea id="${el.id}" placeholder="${escapeHtml(el.placeholder || '')}" oninput="triggerAction('${el.id}', 'change', this.value)">${escapeHtml(String(el.value || ''))}</textarea>
      </div>`;

    case 'combobox':
      return `
      <div class="form-item">
        ${el.text ? `<label for="${el.id}">${escapeHtml(el.text)}</label>` : ''}
        <select id="${el.id}" onchange="triggerAction('${el.id}', 'change', this.value)">
          ${(el.values || []).map(v => `<option value="${escapeHtml(v)}" ${String(el.value) === v ? 'selected' : ''}>${escapeHtml(v)}</option>`).join('')}
        </select>
      </div>`;

    case 'listbox':
      return `
      <div class="form-item">
        ${el.text ? `<label>${escapeHtml(el.text)}</label>` : ''}
        <div class="listbox" id="${el.id}">
          ${(el.values || []).map((v, idx) => `
            <div class="listbox-item ${idx === 0 ? 'selected' : ''}" onclick="selectListItem(this, '${el.id}', '${escapeHtml(v)}')">
              ${escapeHtml(v)}
            </div>
          `).join('')}
        </div>
      </div>`;

    case 'checkbox':
      return `
      <div class="form-item form-item-inline">
        <label class="checkbox-label" for="${el.id}">
          <input type="checkbox" id="${el.id}" ${el.checked ? 'checked' : ''} onchange="triggerAction('${el.id}', 'change', this.checked)" />
          <span>${escapeHtml(el.text || '')}</span>
        </label>
      </div>`;

    case 'radiobutton':
      return `
      <div class="form-item form-item-inline">
        <label class="radio-label" for="${el.id}">
          <input type="radio" id="${el.id}" name="${escapeHtml(el.group || 'default_radio_group')}" value="${escapeHtml(String(el.value || ''))}" ${el.checked ? 'checked' : ''} onchange="triggerAction('${el.id}', 'change', this.value)" />
          <span>${escapeHtml(el.text || '')}</span>
        </label>
      </div>`;

    case 'separator_h':
      return `<hr class="hr-line" />`;

    case 'separator_v':
      return `<span class="vr-line"></span>`;

    default:
      return '';
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Creates the Python tkinter/form module factory for a given PC device.
 */
export function createPythonFormModule(
  deviceId: string,
  openInBrowser?: (htmlContent: string, title?: string) => void
): Record<string, unknown> {
  let formState: PythonFormState = {
    id: `form_${Date.now()}`,
    deviceId,
    title: 'Python Form Window',
    width: 480,
    height: 420,
    mode: 'window',
    elements: [],
    callbacks: {},
    variables: {},
  };

  let elementCounter = 0;

  class BaseWidget {
    public id: string;
    public element: FormElement;

    constructor(type: FormElementType, text?: string) {
      this.id = `elem_${++elementCounter}`;
      this.element = {
        id: this.id,
        type,
        text,
        layout: { type: 'pack', side: 'top', pady: 4 },
      };
      formState.elements.push(this.element);
      notifyFormChange(deviceId, formState);
    }

    pack(options?: Record<string, unknown>) {
      this.element.layout = {
        type: 'pack',
        side: (options?.side as FormElementLayout['side']) || 'top',
        fill: (options?.fill as FormElementLayout['fill']) || 'none',
        padx: typeof options?.padx === 'number' ? options.padx : 0,
        pady: typeof options?.pady === 'number' ? options.pady : 4,
      };
      notifyFormChange(deviceId, formState);
      return this;
    }

    grid(options?: Record<string, unknown>) {
      this.element.layout = {
        type: 'grid',
        row: typeof options?.row === 'number' ? options.row : 0,
        column: typeof options?.column === 'number' ? options.column : 0,
        rowspan: typeof options?.rowspan === 'number' ? options.rowspan : 1,
        columnspan: typeof options?.columnspan === 'number' ? options.columnspan : 1,
        padx: typeof options?.padx === 'number' ? options.padx : 2,
        pady: typeof options?.pady === 'number' ? options.pady : 2,
        sticky: typeof options?.sticky === 'string' ? options.sticky : undefined,
      };
      notifyFormChange(deviceId, formState);
      return this;
    }

    place(options?: Record<string, unknown>) {
      this.element.layout = {
        type: 'place',
        x: typeof options?.x === 'number' ? options.x : 0,
        y: typeof options?.y === 'number' ? options.y : 0,
        width: typeof options?.width === 'number' ? options.width : undefined,
        height: typeof options?.height === 'number' ? options.height : undefined,
      };
      notifyFormChange(deviceId, formState);
      return this;
    }

    config(options: Record<string, unknown>) {
      if (options.text !== undefined) this.element.text = String(options.text);
      if (options.state !== undefined) this.element.disabled = options.state === 'disabled';
      if (options.command !== undefined && typeof options.command === 'function') {
        formState.callbacks[this.id] = options.command as (args?: unknown[]) => void;
      }
      notifyFormChange(deviceId, formState);
    }
  }

  // Tk Root / Form container
  class Tk {
    constructor() {
      formState = {
        id: `form_${Date.now()}`,
        deviceId,
        title: 'Python Form Window',
        width: 480,
        height: 420,
        mode: 'window',
        elements: [],
        callbacks: {},
        variables: {},
      };
      activeForms.set(deviceId, formState);
      notifyFormChange(deviceId, formState);
    }

    title(t: string) {
      formState.title = String(t);
      notifyFormChange(deviceId, formState);
    }

    geometry(geom: string) {
      const match = /^(\d+)x(\d+)/.exec(String(geom));
      if (match) {
        formState.width = parseInt(match[1], 10);
        formState.height = parseInt(match[2], 10);
        notifyFormChange(deviceId, formState);
      }
    }

    destroy() {
      closeActiveDeviceForm(deviceId);
    }

    mainloop(modeOrOptions?: unknown) {
      let targetMode: 'window' | 'browser' = 'window';
      if (typeof modeOrOptions === 'string' && modeOrOptions.toLowerCase() === 'browser') {
        targetMode = 'browser';
      } else if (typeof modeOrOptions === 'object' && modeOrOptions !== null) {
        const opt = modeOrOptions as Record<string, unknown>;
        if (opt.mode === 'browser' || opt.target === 'browser') targetMode = 'browser';
      }

      formState.mode = targetMode;
      activeForms.set(deviceId, formState);
      notifyFormChange(deviceId, formState);

      if (targetMode === 'browser') {
        const html = generateFormHtml(formState);
        if (openInBrowser) {
          openInBrowser(html, formState.title);
        }
      }
    }

    render_browser() {
      formState.mode = 'browser';
      const html = generateFormHtml(formState);
      if (openInBrowser) {
        openInBrowser(html, formState.title);
      }
      return html;
    }
  }

  // Button
  class PyButton extends BaseWidget {
    constructor(_parent: unknown, options?: Record<string, unknown>) {
      const text = typeof options?.text === 'string' ? options.text : 'Button';
      super('button', text);
      if (options?.command && typeof options.command === 'function') {
        formState.callbacks[this.id] = options.command as (args?: unknown[]) => void;
      }
    }
  }

  // Label
  class PyLabel extends BaseWidget {
    constructor(_parent: unknown, options?: Record<string, unknown>) {
      const text = typeof options?.text === 'string' ? options.text : '';
      super('label', text);
    }

    set(text: unknown) {
      this.element.text = String(text);
      notifyFormChange(deviceId, formState);
    }
  }

  // Entry (Single line text input)
  class PyEntry extends BaseWidget {
    constructor(_parent: unknown, options?: Record<string, unknown>) {
      super('entry');
      if (options?.textvariable && typeof options.textvariable === 'object') {
        const v = options.textvariable as { id: string; get: () => unknown; set: (val: unknown) => void };
        this.element.value = String(v.get() || '');
      } else if (options?.text !== undefined) {
        this.element.value = String(options.text);
      }
      if (options?.placeholder) {
        this.element.placeholder = String(options.placeholder);
      }
    }

    get() {
      return String(this.element.value || '');
    }

    insert(_index: unknown, text: unknown) {
      this.element.value = String(text);
      notifyFormChange(deviceId, formState);
    }

    delete(_first: unknown, _last?: unknown) {
      this.element.value = '';
      notifyFormChange(deviceId, formState);
    }
  }

  // Text (Multi-line text area)
  class PyText extends BaseWidget {
    constructor(_parent: unknown, options?: Record<string, unknown>) {
      super('textarea');
      if (options?.height && typeof options.height === 'number') {
        this.element.height = options.height * 20;
      }
      if (options?.width && typeof options.width === 'number') {
        this.element.width = options.width * 10;
      }
    }

    get(_start?: unknown, _end?: unknown) {
      return String(this.element.value || '');
    }

    insert(_index: unknown, text: unknown) {
      const current = String(this.element.value || '');
      this.element.value = current + String(text);
      notifyFormChange(deviceId, formState);
    }

    delete(_start?: unknown, _end?: unknown) {
      this.element.value = '';
      notifyFormChange(deviceId, formState);
    }
  }

  // Listbox
  class PyListbox extends BaseWidget {
    private selectedIndex: number = 0;

    constructor(_parent: unknown, _options?: Record<string, unknown>) {
      super('listbox');
      this.element.values = [];
    }

    insert(_index: unknown, ...items: unknown[]) {
      if (!this.element.values) this.element.values = [];
      const stringItems = items.map(String);
      this.element.values.push(...stringItems);
      notifyFormChange(deviceId, formState);
    }

    get(index: unknown) {
      const idx = Number(index || 0);
      return this.element.values?.[idx] ?? '';
    }

    size() {
      return this.element.values?.length || 0;
    }

    curselection() {
      const sel = [this.selectedIndex];
      (sel as unknown as { __isTuple__: boolean }).__isTuple__ = true;
      return sel;
    }

    delete(_first: unknown, _last?: unknown) {
      this.element.values = [];
      notifyFormChange(deviceId, formState);
    }
  }

  // Combobox
  class PyCombobox extends BaseWidget {
    constructor(_parent: unknown, options?: Record<string, unknown>) {
      super('combobox');
      if (Array.isArray(options?.values)) {
        this.element.values = options.values.map(String);
        this.element.value = this.element.values[0] || '';
      }
    }

    get() {
      return String(this.element.value || '');
    }

    set(val: unknown) {
      this.element.value = String(val);
      notifyFormChange(deviceId, formState);
    }

    current(idx?: unknown) {
      if (idx !== undefined && this.element.values) {
        this.element.value = this.element.values[Number(idx)] || '';
        notifyFormChange(deviceId, formState);
      }
      return this.element.values?.indexOf(String(this.element.value)) ?? -1;
    }
  }

  // Checkbutton / Checkbox
  class PyCheckbutton extends BaseWidget {
    constructor(_parent: unknown, options?: Record<string, unknown>) {
      const text = typeof options?.text === 'string' ? options.text : '';
      super('checkbox', text);
      this.element.checked = Boolean(options?.checked ?? false);
      if (options?.variable && typeof options.variable === 'object') {
        const v = options.variable as { get: () => unknown; set: (val: unknown) => void };
        this.element.checked = Boolean(v.get());
      }
    }

    select() {
      this.element.checked = true;
      notifyFormChange(deviceId, formState);
    }

    deselect() {
      this.element.checked = false;
      notifyFormChange(deviceId, formState);
    }

    toggle() {
      this.element.checked = !this.element.checked;
      notifyFormChange(deviceId, formState);
    }
  }

  // Radiobutton
  class PyRadiobutton extends BaseWidget {
    constructor(_parent: unknown, options?: Record<string, unknown>) {
      const text = typeof options?.text === 'string' ? options.text : '';
      super('radiobutton', text);
      this.element.value = options?.value !== undefined ? String(options.value) : '';
      this.element.group = typeof options?.variable === 'object' && options.variable !== null
        ? String((options.variable as { id?: string }).id || 'default_group')
        : 'default_group';
    }

    select() {
      this.element.checked = true;
      notifyFormChange(deviceId, formState);
    }
  }

  // Separator (Horizontal and Vertical)
  class PySeparator extends BaseWidget {
    constructor(_parent: unknown, options?: Record<string, unknown>) {
      const orient = String(options?.orient || 'horizontal').toLowerCase();
      super(orient === 'vertical' ? 'separator_v' : 'separator_h');
    }
  }

  // Variables
  class PyStringVar {
    public id: string;
    private val: string;

    constructor(value: unknown = '') {
      this.id = `var_${++elementCounter}`;
      this.val = String(value || '');
      formState.variables[this.id] = this.val;
    }

    get() {
      return String(formState.variables[this.id] ?? this.val);
    }

    set(v: unknown) {
      this.val = String(v ?? '');
      formState.variables[this.id] = this.val;
      notifyFormChange(deviceId, formState);
    }
  }

  class PyIntVar {
    public id: string;
    private val: number;

    constructor(value: unknown = 0) {
      this.id = `var_${++elementCounter}`;
      this.val = Number(value || 0);
      formState.variables[this.id] = this.val;
    }

    get() {
      return Number(formState.variables[this.id] ?? this.val);
    }

    set(v: unknown) {
      this.val = Number(v || 0);
      formState.variables[this.id] = this.val;
      notifyFormChange(deviceId, formState);
    }
  }

  class PyBooleanVar {
    public id: string;
    private val: boolean;

    constructor(value: unknown = false) {
      this.id = `var_${++elementCounter}`;
      this.val = Boolean(value);
      formState.variables[this.id] = this.val;
    }

    get() {
      return Boolean(formState.variables[this.id] ?? this.val);
    }

    set(v: unknown) {
      this.val = Boolean(v);
      formState.variables[this.id] = this.val;
      notifyFormChange(deviceId, formState);
    }
  }

  // Helper to allow calling either as `new Cls(...)` or `Cls(...)`
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const callable = (Cls: new (...args: any[]) => any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fn = (...args: any[]) => new Cls(...args);
    fn.prototype = Cls.prototype;
    return fn;
  };

  // TTK Sub-namespace
  const ttk = {
    Button: callable(PyButton),
    Label: callable(PyLabel),
    Entry: callable(PyEntry),
    Combobox: callable(PyCombobox),
    Checkbutton: callable(PyCheckbutton),
    Radiobutton: callable(PyRadiobutton),
    Separator: callable(PySeparator),
    HR: () => new PySeparator(null, { orient: 'horizontal' }),
    VR: () => new PySeparator(null, { orient: 'vertical' }),
  };

  return {
    Tk: callable(Tk),
    Form: callable(Tk),
    Button: callable(PyButton),
    Label: callable(PyLabel),
    Entry: callable(PyEntry),
    Text: callable(PyText),
    TextArea: callable(PyText),
    Listbox: callable(PyListbox),
    List: callable(PyListbox),
    Combobox: callable(PyCombobox),
    Checkbutton: callable(PyCheckbutton),
    Checkbox: callable(PyCheckbutton),
    Radiobutton: callable(PyRadiobutton),
    RadioGroup: callable(PyRadiobutton),
    Separator: callable(PySeparator),
    HR: () => new PySeparator(null, { orient: 'horizontal' }),
    VR: () => new PySeparator(null, { orient: 'vertical' }),
    StringVar: callable(PyStringVar),
    IntVar: callable(PyIntVar),
    BooleanVar: callable(PyBooleanVar),
    ttk,
  };
}
