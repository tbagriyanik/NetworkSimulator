export class PythonInputRequiredException {
  constructor(public prompt: string) { }
}

export class PythonTimeoutException extends Error {
  constructor(message: string = 'TimeoutError: Script execution timed out (limit exceeded)') {
    super(message);
    this.name = 'TimeoutError';
  }
}

export class PyType {
  constructor(public name: string) { }

  get __name__(): string {
    return this.name;
  }

  toString(): string {
    return `<class '${this.name}'>`;
  }
}

/** Returns the Python type object for a runtime value (mirrors type()/isinstance). */
export function getPyTypeValue(val: unknown): PyType {
  if (val === null || val === undefined) return new PyType('NoneType');
  if (val instanceof PyType) return val;
  if (val instanceof PyInstance) return new PyType(val.pyClass.name);
  if (val instanceof PyClass) return new PyType('type');
  if (val instanceof PyGenerator) return new PyType('generator');
  if (val instanceof PyComplex) return new PyType('complex');
  if (val instanceof PyFile) return new PyType('_io.TextIOWrapper');
  if (typeof val === 'boolean') return new PyType('bool');
  if (typeof val === 'number') return Number.isInteger(val) ? new PyType('int') : new PyType('float');
  if (typeof val === 'string') return new PyType('str');
  if (Array.isArray(val)) {
    return (val as unknown as { __isTuple__?: boolean }).__isTuple__ ? new PyType('tuple') : new PyType('list');
  }
  if (val instanceof Set) return new PyType('set');
  if (typeof val === 'object') {
    const obj = val as Record<string, unknown>;
    if (obj.__name__ && typeof obj.__name__ === 'string') return new PyType(obj.__name__);
    if (obj.constructor && obj.constructor.name && obj.constructor.name !== 'Object') return new PyType(obj.constructor.name);
    return new PyType('dict');
  }
  return new PyType(typeof val);
}

export class PyComplex {
  constructor(public real: number, public imag: number) { }

  add(other: unknown): PyComplex {
    const o = toPyComplex(other);
    return new PyComplex(this.real + o.real, this.imag + o.imag);
  }

  sub(other: unknown): PyComplex {
    const o = toPyComplex(other);
    return new PyComplex(this.real - o.real, this.imag - o.imag);
  }

  mul(other: unknown): PyComplex {
    const o = toPyComplex(other);
    return new PyComplex(
      this.real * o.real - this.imag * o.imag,
      this.real * o.imag + this.imag * o.real
    );
  }

  div(other: unknown): PyComplex {
    const o = toPyComplex(other);
    const denom = o.real * o.real + o.imag * o.imag;
    if (denom === 0) return new PyComplex(NaN, NaN);
    return new PyComplex(
      (this.real * o.real + this.imag * o.imag) / denom,
      (this.imag * o.real - this.real * o.imag) / denom
    );
  }

  toString(): string {
    const r = this.real;
    const i = this.imag;
    const sign = i >= 0 ? '+' : '-';
    const absI = Math.abs(i);
    return `(${r}${sign}${absI}j)`;
  }
}

export function toPyComplex(v: unknown): PyComplex {
  if (v instanceof PyComplex) return v;
  if (typeof v === 'number') return new PyComplex(v, 0);
  if (typeof v === 'string') {
    const match = /^\(?(-?\d+(?:\.\d+)?)\s*([+-])\s*(\d+(?:\.\d+)?)j\)?$/.exec(v.trim());
    if (match) {
      const r = parseFloat(match[1]);
      const sign = match[2] === '-' ? -1 : 1;
      const i = parseFloat(match[3]) * sign;
      return new PyComplex(r, i);
    }
  }
  return new PyComplex(Number(v || 0), 0);
}

export class PyFile {
  public content: string;
  public lines: string[];
  public lineIdx = 0;
  public closed = false;

  constructor(
    public filePath: string,
    public mode: string = 'r',
    initialContent: string = '',
    private onSave?: (content: string) => void
  ) {
    this.content = initialContent;
    const split = initialContent ? initialContent.split(/\r?\n/) : [];
    if (split.length > 0 && split[split.length - 1] === '') {
      split.pop();
    }
    this.lines = split;
  }

  read(_size?: number): string {
    if (this.closed) throw new Error('I/O operation on closed file.');
    return this.content;
  }

  readline(): string {
    if (this.closed) throw new Error('I/O operation on closed file.');
    if (this.lineIdx >= this.lines.length) return '';
    const line = this.lines[this.lineIdx++];
    return line + '\n';
  }

  readlines(): string[] {
    if (this.closed) throw new Error('I/O operation on closed file.');
    const remaining = this.lines.slice(this.lineIdx).map(l => l + '\n');
    this.lineIdx = this.lines.length;
    return remaining;
  }

  write(text: string): void {
    if (this.closed) throw new Error('I/O operation on closed file.');
    const strText = String(text);
    if (this.mode.includes('a')) {
      this.content += strText;
    } else {
      if (this.lines.length > 0 && this.content !== '' && !this.mode.includes('w')) {
        this.content += strText;
      } else {
        this.content = strText;
      }
    }
    this.lines = this.content.split(/\r?\n/);
    this.onSave?.(this.content);
  }

  writelines(seq: unknown[]): void {
    if (this.closed) throw new Error('I/O operation on closed file.');
    if (Array.isArray(seq)) {
      for (const item of seq) {
        this.write(String(item));
      }
    }
  }

  close(): void {
    this.closed = true;
  }

  seek(_offset: number = 0): void {
    this.lineIdx = 0;
  }

  tell(): number {
    return this.content.length;
  }

  __enter__(): PyFile {
    return this;
  }

  __exit__(): void {
    this.close();
  }

  [Symbol.iterator]() {
    let idx = this.lineIdx;
    const lines = this.lines;
    return {
      next: () => {
        if (idx < lines.length) {
          const l = lines[idx++];
          const val = idx < lines.length ? l + '\n' : l;
          return { value: val, done: false };
        }
        return { value: undefined as unknown, done: true };
      }
    };
  }
}

export function getPythonType(val: unknown): string {
  if (val === null || val === undefined) return "<class 'NoneType'>";
  if (val instanceof PyInstance) return `<class '${val.pyClass.name}'>`;
  if (val instanceof PyClass) return "<class 'type'>";
  if (val instanceof PyGenerator) return "<class 'generator'>";
  if (val instanceof PyComplex) return "<class 'complex'>";
  if (val instanceof PyFile) return "<class '_io.TextIOWrapper'>";
  if (typeof val === 'boolean') return "<class 'bool'>";
  if (typeof val === 'number') {
    return Number.isInteger(val) ? "<class 'int'>" : "<class 'float'>";
  }
  if (typeof val === 'string') return "<class 'str'>";
  if (Array.isArray(val)) return (val as unknown as { __isTuple__?: boolean }).__isTuple__ ? "<class 'tuple'>" : "<class 'list'>";
  if (typeof val === 'object') {
    const obj = val as Record<string, unknown>;
    if (obj.__name__ && typeof obj.__name__ === 'string') return `<class '${obj.__name__}'>`;
    if (obj.constructor && obj.constructor.name && obj.constructor.name !== 'Object') return `<class '${obj.constructor.name}'>`;
    return "<class 'dict'>";
  }
  return `<class '${typeof val}'>`;
}

export function formatPythonValue(val: unknown, inCollection: boolean = false): string {
  if (val === null || val === undefined) return 'None';
  if (val === true) return 'True';
  if (val === false) return 'False';
  if (val instanceof PyType) return `<class '${val.name}'>`;
  if (typeof val === 'string') return inCollection ? `'${val}'` : val;
  if (val instanceof PyInstance) return `<${val.pyClass.name} object>`;
  if (val instanceof PyClass) return `<class '${val.name}'>`;
  if (val instanceof PyGenerator) return `<generator object>`;
  if (val instanceof PyComplex) return val.toString();
  if (val instanceof PyFile) return `<_io.TextIOWrapper name='${val.filePath}' mode='${val.mode}' encoding='utf-8'>`;
  if (val instanceof Set) {
    const items = Array.from(val).sort((a, b) => {
      if (typeof a === 'number' && typeof b === 'number') return a - b;
      return formatPythonValue(a, true).localeCompare(formatPythonValue(b, true));
    });
    return `{${items.map(item => formatPythonValue(item, true)).join(', ')}}`;
  }
  if (Array.isArray(val)) {
    const isTuple = Boolean((val as unknown as { __isTuple__?: boolean }).__isTuple__);
    const formattedItems = val.map(item => formatPythonValue(item, true)).join(', ');
    if (isTuple) {
      return val.length === 1 ? `(${formattedItems},)` : `(${formattedItems})`;
    }
    return `[${formattedItems}]`;
  }
  if (typeof val === 'object') {
    const entries = Object.entries(val as Record<string, unknown>).map(
      ([k, v]) => `${/^-?\d+$/.test(k) ? k : `'${k}'`}: ${formatPythonValue(v, true)}`
    );
    return `{${entries.join(', ')}}`;
  }
  return String(val);
}

export function isSingleStringLiteral(str: string): boolean {
  const trimmed = str.trim();
  if (trimmed.length < 2) return false;

  if (trimmed.startsWith('"""') || trimmed.startsWith("'''")) {
    const q3 = trimmed.slice(0, 3);
    if (trimmed.length < 6 || !trimmed.endsWith(q3)) return false;
    let escaped = false;
    for (let i = 3; i < trimmed.length - 3; i++) {
      const char = trimmed[i];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (trimmed.startsWith(q3, i)) {
        return i === trimmed.length - 3;
      }
    }
    return true;
  }

  const qChar = trimmed[0];
  if (qChar !== '"' && qChar !== "'") return false;
  if (trimmed[trimmed.length - 1] !== qChar) return false;

  let escaped = false;
  for (let i = 1; i < trimmed.length; i++) {
    const char = trimmed[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === qChar) {
      return i === trimmed.length - 1;
    }
  }
  return false;
}

export function stripInlineComment(line: string): string {
  let inQuotes = false;
  let quoteChar = '';
  let i = 0;
  while (i < line.length) {
    const char = line[i];
    const isEscaped = i > 0 && line[i - 1] === '\\';
    if (!isEscaped && (line.startsWith('"""', i) || line.startsWith("'''", i))) {
      const q3 = line.slice(i, i + 3);
      if (!inQuotes) {
        inQuotes = true;
        quoteChar = q3;
        i += 3;
        continue;
      } else if (quoteChar === q3) {
        inQuotes = false;
        quoteChar = '';
        i += 3;
        continue;
      }
    }
    if (!isEscaped && (char === '"' || char === "'")) {
      if (!inQuotes) {
        inQuotes = true;
        quoteChar = char;
      } else if (quoteChar === char) {
        inQuotes = false;
        quoteChar = '';
      }
    } else if (char === '#' && !inQuotes) {
      return line.slice(0, i).trimEnd();
    }
    i++;
  }
  return line;
}

export function findOperatorIndex(str: string, op: string): number {
  let inQ = false;
  let qChar = '';
  let pDepth = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if ((char === '"' || char === "'") && (i === 0 || str[i - 1] !== '\\')) {
      if (!inQ) { inQ = true; qChar = char; }
      else if (qChar === char) { inQ = false; }
    } else if (!inQ) {
      if (char === '(' || char === '[' || char === '{') pDepth++;
      else if (char === ')' || char === ']' || char === '}') pDepth--;
      else if (pDepth === 0 && str.startsWith(op, i)) {
        return i;
      }
    }
  }
  return -1;
}

export function isEnclosedInParens(str: string): boolean {
  if (!str.startsWith('(') || !str.endsWith(')')) return false;
  let depth = 0;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === '(') depth++;
    else if (str[i] === ')') depth--;
    if (depth === 0 && i < str.length - 1) {
      return false;
    }
  }
  return depth === 0;
}

export function splitOutsideQuotesAndParens(str: string, op: string): string[] {
  const parts: string[] = [];
  let current = '';
  let inQ = false;
  let qChar = '';
  let pDepth = 0;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if ((char === '"' || char === "'") && (i === 0 || str[i - 1] !== '\\')) {
      if (!inQ) { inQ = true; qChar = char; }
      else if (qChar === char) { inQ = false; }
    } else if (!inQ) {
      if (char === '(' || char === '[' || char === '{') pDepth++;
      else if (char === ')' || char === ']' || char === '}') pDepth--;
      else if (pDepth === 0 && str.startsWith(op, i)) {
        parts.push(current);
        current = '';
        i += op.length - 1;
        continue;
      }
    }
    current += char;
  }
  if (current || parts.length > 0) parts.push(current);
  return parts.map(p => p.trim());
}

export function splitOnMultiplyOperator(str: string): string[] {
  const parts: string[] = [];
  let current = '';
  let inQ = false;
  let qChar = '';
  let pDepth = 0;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if ((char === '"' || char === "'") && (i === 0 || str[i - 1] !== '\\')) {
      if (!inQ) { inQ = true; qChar = char; }
      else if (qChar === char) { inQ = false; }
    } else if (!inQ) {
      if (char === '(' || char === '[' || char === '{') pDepth++;
      else if (char === ')' || char === ']' || char === '}') pDepth--;
      else if (pDepth === 0 && char === '*' && str[i + 1] !== '*' && str[i - 1] !== '*') {
        parts.push(current);
        current = '';
        continue;
      }
    }
    current += char;
  }
  if (current || parts.length > 0) parts.push(current);
  return parts.map(p => p.trim());
}

export function formatPrintfString(template: string, args: unknown[]): string {
  let argIndex = 0;
  return template.replace(/%([-+0 #]*)(\d+)?(?:\.(\d+))?([sdiXxfgeEG%])/g, (_match, _flags, _widthStr, precStr, type) => {
    if (type === '%') return '%';
    const val = args[argIndex++];
    if (type === 's') return formatPythonValue(val);
    if (type === 'd' || type === 'i') {
      const num = Math.floor(Number(val || 0));
      return String(num);
    }
    if (type === 'f' || type === 'F' || type === 'g' || type === 'e') {
      const num = Number(val || 0);
      const prec = precStr !== undefined ? parseInt(precStr, 10) : 6;
      return num.toFixed(prec);
    }
    return String(val ?? '');
  });
}

export function pythonRange(...args: number[]): number[] {
  let start = 0;
  let stop = 0;
  let step = 1;

  if (args.length === 1) {
    stop = args[0];
  } else if (args.length === 2) {
    start = args[0];
    stop = args[1];
  } else if (args.length >= 3) {
    start = args[0];
    stop = args[1];
    step = args[2] || 1;
  }

  const result: number[] = [];
  if (step > 0) {
    for (let i = start; i < stop; i += step) {
      result.push(i);
    }
  } else if (step < 0) {
    for (let i = start; i > stop; i += step) {
      result.push(i);
    }
  }
  return result;
}

export function parseFormatArgs(
  rawArgs: string,
  evalFn: (expr: string) => unknown
): { positional: unknown[]; kwargs: Record<string, unknown> } {
  const positional: unknown[] = [];
  const kwargs: Record<string, unknown> = {};

  const trimmedRaw = rawArgs.trim();
  if (!trimmedRaw) {
    return { positional, kwargs };
  }

  if (trimmedRaw.includes('%') && (trimmedRaw.startsWith("'") || trimmedRaw.startsWith('"'))) {
    return { positional: [evalFn(trimmedRaw)], kwargs };
  }

  const tokens: string[] = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';
  let parenDepth = 0;

  for (let i = 0; i < trimmedRaw.length; i++) {
    const char = trimmedRaw[i];
    if ((char === '"' || char === "'") && (i === 0 || rawArgs[i - 1] !== '\\')) {
      if (!inQuotes) {
        inQuotes = true;
        quoteChar = char;
      } else if (quoteChar === char) {
        inQuotes = false;
      }
    } else if (!inQuotes) {
      if (char === '(' || char === '[' || char === '{') parenDepth++;
      else if (char === ')' || char === ']' || char === '}') parenDepth--;
    }

    const hasOperators = /[|+\-*/%^&=!<>|]|\b(and|or|in|not|is)\b/.test(trimmedRaw);
    const isDelimiter = !inQuotes && parenDepth === 0 && (
      char === ',' || (!hasOperators && trimmedRaw.indexOf(',') === -1 && /\s/.test(char))
    );

    if (isDelimiter) {
      if (current.trim()) {
        tokens.push(current.trim());
      }
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) {
    tokens.push(current.trim());
  }

  for (const token of tokens) {
    if (token.startsWith('*')) {
      const spreadVal = evalFn(token.slice(1).trim());
      if (Array.isArray(spreadVal)) {
        positional.push(...spreadVal);
      } else {
        positional.push(spreadVal);
      }
      continue;
    }
    const kwMatch = /^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/.exec(token);
    if (kwMatch && !token.startsWith('"') && !token.startsWith("'")) {
      kwargs[kwMatch[1]] = evalFn(kwMatch[2]);
    } else {
      positional.push(evalFn(token));
    }
  }

  return { positional, kwargs };
}

export function formatStringTemplate(
  template: string,
  positional: unknown[],
  kwargs: Record<string, unknown>
): string {
  let autoIndex = 0;
  return template.replace(/\{([^{}]*)\}/g, (match, key: string) => {
    let cleanKey = key.trim();
    let spec = '';

    if (cleanKey.includes(':')) {
      const parts = cleanKey.split(':');
      cleanKey = parts[0].trim();
      spec = parts[1].trim();
    }

    let val: unknown;
    if (cleanKey === '') {
      val = positional[autoIndex++];
    } else if (/^\d+$/.test(cleanKey)) {
      const idx = parseInt(cleanKey, 10);
      val = positional[idx];
    } else if (cleanKey in kwargs) {
      val = kwargs[cleanKey];
    } else {
      val = match;
    }

    if (val === undefined) {
      return match;
    }

    if (spec && typeof val === 'number') {
      const floatMatch = /\.([0-9]+)f/.exec(spec);
      if (floatMatch) {
        const decimals = parseInt(floatMatch[1], 10);
        return val.toFixed(decimals);
      }
      const intMatch = /^(0)?(\d+)?d$/.exec(spec);
      if (intMatch) {
        const padZero = intMatch[1] === '0';
        const width = intMatch[2] ? parseInt(intMatch[2], 10) : 0;
        const intStr = String(Math.floor(val));
        return padZero && width > 0 ? intStr.padStart(width, '0') : intStr;
      }
    }

    return String(val);
  });
}

const FORBIDDEN_DUNDERS = new Set([
  '__class__',
  '__mro__',
  '__subclasses__',
  '__globals__',
  '__builtins__',
  '__import__',
  '__proto__',
  'constructor',
  'prototype',
]);

export function isForbiddenDunderProperty(prop: string): boolean {
  return FORBIDDEN_DUNDERS.has(prop);
}

export class PyClass {
  public name: string;
  public baseClasses: PyClass[];
  public methods: Record<string, unknown>;
  public staticProps: Record<string, unknown>;
  public staticMethods: Set<string>;
  public classMethods: Set<string>;
  public propertyGetters: Record<string, unknown>;
  public propertySetters: Record<string, unknown>;

  constructor(name: string, baseClasses: PyClass[] = [], methods: Record<string, unknown> = {}) {
    this.name = name;
    this.baseClasses = baseClasses;
    this.methods = methods;
    this.staticProps = {};
    this.staticMethods = new Set();
    this.classMethods = new Set();
    this.propertyGetters = {};
    this.propertySetters = {};
  }

  findMethod(methodName: string): unknown | undefined {
    if (this.methods[methodName] !== undefined) return this.methods[methodName];
    for (const base of this.baseClasses) {
      const found = base.findMethod(methodName);
      if (found !== undefined) return found;
    }
    return undefined;
  }

  findPropertyGetter(propName: string): unknown | undefined {
    if (this.propertyGetters[propName] !== undefined) return this.propertyGetters[propName];
    for (const base of this.baseClasses) {
      const found = base.findPropertyGetter(propName);
      if (found !== undefined) return found;
    }
    return undefined;
  }

  getAttribute(attrName: string): unknown {
    if (isForbiddenDunderProperty(attrName)) {
      throw new Error(`AttributeError: Security restriction: access to '${attrName}' is blocked.`);
    }
    if (this.staticProps[attrName] !== undefined) return this.staticProps[attrName];
    const getter = this.findPropertyGetter(attrName);
    if (getter && typeof getter === 'function') {
      return (getter as Function)(this);
    }
    const method = this.findMethod(attrName);
    if (method !== undefined) {
      if (this.classMethods.has(attrName) || (method as Record<string, unknown>).__isClassMethod) {
        return (method as Function).bind(null, this);
      }
      return method;
    }
    throw new Error(`AttributeError: type object '${this.name}' has no attribute '${attrName}'`);
  }

  setAttribute(attrName: string, value: unknown): void {
    if (isForbiddenDunderProperty(attrName)) {
      throw new Error(`AttributeError: Security restriction: access to '${attrName}' is blocked.`);
    }
    this.staticProps[attrName] = value;
  }
}

export class PyInstance {
  public pyClass: PyClass;
  public fields: Record<string, unknown>;

  constructor(pyClass: PyClass, fields: Record<string, unknown> = {}) {
    this.pyClass = pyClass;
    this.fields = fields;
  }

  getAttribute(attrName: string): unknown {
    if (isForbiddenDunderProperty(attrName)) {
      throw new Error(`AttributeError: Security restriction: access to '${attrName}' is blocked.`);
    }
    const getter = this.pyClass.findPropertyGetter(attrName);
    if (getter && typeof getter === 'function') {
      return getter(this);
    }
    if (Object.prototype.hasOwnProperty.call(this.fields, attrName)) {
      return this.fields[attrName];
    }
    const method = this.pyClass.findMethod(attrName);
    if (method !== undefined) {
      if ((method as Record<string, unknown>).__isPropertyGetter) {
        return (method as Function)(this);
      }
      if (this.pyClass.staticMethods.has(attrName) || (method as Record<string, unknown>).__isStaticMethod) {
        return method;
      }
      if (this.pyClass.classMethods.has(attrName) || (method as Record<string, unknown>).__isClassMethod) {
        return (method as Function).bind(null, this.pyClass);
      }
      if (typeof method === 'function') {
        return (...args: unknown[]) => method(this, ...args);
      }
      return method;
    }
    if (this.pyClass.staticProps[attrName] !== undefined) {
      return this.pyClass.staticProps[attrName];
    }
    throw new Error(`AttributeError: '${this.pyClass.name}' object has no attribute '${attrName}'`);
  }

  setAttribute(attrName: string, value: unknown): void {
    if (isForbiddenDunderProperty(attrName)) {
      throw new Error(`AttributeError: Security restriction: access to '${attrName}' is blocked.`);
    }
    const setter = this.pyClass.propertySetters[attrName];
    if (setter && typeof setter === 'function') {
      setter(this, value);
      return;
    }
    this.fields[attrName] = value;
  }
}

export class PySuper {
  constructor(public instance: PyInstance, public targetClass?: PyClass) { }

  getAttribute(methodName: string): unknown {
    const startBases = this.targetClass ? this.targetClass.baseClasses : this.instance.pyClass.baseClasses;
    for (const base of startBases) {
      const method = base.findMethod(methodName);
      if (method !== undefined) {
        if (typeof method === 'function') {
          return (...args: unknown[]) => method(this.instance, ...args);
        }
        return method;
      }
    }
    throw new Error(`AttributeError: 'super' object has no attribute '${methodName}'`);
  }
}

export class PyGenerator {
  private iterator: Iterator<unknown> | null = null;

  constructor(private generatorFnOrArray: (() => Iterator<unknown>) | unknown[]) { }

  [Symbol.iterator]() {
    if (!this.iterator) {
      if (typeof this.generatorFnOrArray === 'function') {
        this.iterator = this.generatorFnOrArray();
      } else if (Array.isArray(this.generatorFnOrArray)) {
        this.iterator = (this.generatorFnOrArray as unknown[])[Symbol.iterator]();
      }
    }
    return this.iterator!;
  }

  next(val?: unknown) {
    if (!this.iterator) {
      if (typeof this.generatorFnOrArray === 'function') {
        this.iterator = this.generatorFnOrArray();
      } else if (Array.isArray(this.generatorFnOrArray)) {
        this.iterator = (this.generatorFnOrArray as unknown[])[Symbol.iterator]();
      }
    }
    return this.iterator!.next(val);
  }
}

export function assignValueToLhs(
  leftSide: string,
  rhsVal: unknown,
  scope: Record<string, unknown>,
  evaluateExpr: (expr: string) => unknown
): boolean {
  const targets = splitOutsideQuotesAndParens(leftSide, ',').map(t => t.trim());
  if (targets.every(t => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(t))) {
    if (targets.length === 1) {
      scope[targets[0]] = rhsVal;
    } else {
      const rawRhsParts = Array.isArray(rhsVal) ? (rhsVal as unknown[]) : [rhsVal];
      for (let i = 0; i < targets.length; i++) {
        scope[targets[i]] = rawRhsParts[i];
      }
    }
    return true;
  } else if (leftSide.includes('.') && !leftSide.includes('[')) {
    const dotIdx = leftSide.lastIndexOf('.');
    const objExpr = leftSide.slice(0, dotIdx).trim();
    const attrName = leftSide.slice(dotIdx + 1).trim();
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(attrName)) {
      const targetObj = evaluateExpr(objExpr);
      if (targetObj instanceof PyInstance) {
        targetObj.setAttribute(attrName, rhsVal);
        return true;
      } else if (targetObj instanceof PyClass) {
        targetObj.setAttribute(attrName, rhsVal);
        return true;
      } else if (targetObj && typeof targetObj === 'object') {
        if (isForbiddenDunderProperty(attrName)) {
          throw new Error(`Security restriction: setting forbidden property '${attrName}' is blocked.`);
        }
        (targetObj as Record<string, unknown>)[attrName] = rhsVal;
        return true;
      }
    }
  } else if (leftSide.endsWith(']')) {
    const indexMatches: string[] = [];
    let varName = '';
    let k = 0;
    while (k < leftSide.length && leftSide[k] !== '[') {
      varName += leftSide[k];
      k++;
    }
    varName = varName.trim();

    if (varName && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(varName)) {
      while (k < leftSide.length) {
        if (leftSide[k] === '[') {
          let depth = 1;
          let j = k + 1;
          while (j < leftSide.length && depth > 0) {
            if (leftSide[j] === '[') depth++;
            else if (leftSide[j] === ']') depth--;
            j++;
          }
          const idxExpr = leftSide.slice(k + 1, j - 1).trim();
          indexMatches.push(idxExpr);
          k = j;
        } else {
          k++;
        }
      }

      if (indexMatches.length > 0) {
        const evaluatedIndices = indexMatches.map(idxStr => evaluateExpr(idxStr));
        let current: any = scope[varName];
        if (current !== undefined) {
          for (let m = 0; m < evaluatedIndices.length - 1; m++) {
            const idxKey = evaluatedIndices[m];
            if (current === null || typeof current !== 'object') break;
            current = current[idxKey as string | number];
          }
          if (current !== null && typeof current === 'object') {
            const lastKey = evaluatedIndices[evaluatedIndices.length - 1];
            current[lastKey as string | number] = rhsVal;
            return true;
          }
        }
      }
    }
  }
  return false;
}
