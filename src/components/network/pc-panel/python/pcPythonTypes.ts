import { isPyTuple } from '../pcPythonTags';

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
      return (getter as (target: unknown) => unknown)(this);
    }
    const method = this.findMethod(attrName);
    if (method !== undefined) {
      if (this.classMethods.has(attrName) || (method as Record<string, unknown>).__isClassMethod) {
        return (method as (...args: unknown[]) => unknown).bind(null, this);
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
      return (getter as (target: unknown) => unknown)(this);
    }
    if (Object.prototype.hasOwnProperty.call(this.fields, attrName)) {
      return this.fields[attrName];
    }
    const method = this.pyClass.findMethod(attrName);
    if (method !== undefined) {
      if ((method as Record<string, unknown>).__isPropertyGetter) {
        return (method as (target: unknown) => unknown)(this);
      }
      if (this.pyClass.staticMethods.has(attrName) || (method as Record<string, unknown>).__isStaticMethod) {
        return method;
      }
      if (this.pyClass.classMethods.has(attrName) || (method as Record<string, unknown>).__isClassMethod) {
        return (method as (...args: unknown[]) => unknown).bind(null, this.pyClass);
      }
      if (typeof method === 'function') {
        return (...args: unknown[]) => (method as (...args: unknown[]) => unknown)(this, ...args);
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
      (setter as (target: unknown, val: unknown) => void)(this, value);
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
          return (...args: unknown[]) => (method as (...args: unknown[]) => unknown)(this.instance, ...args);
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
    return isPyTuple(val) ? new PyType('tuple') : new PyType('list');
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
  if (Array.isArray(val)) return isPyTuple(val) ? "<class 'tuple'>" : "<class 'list'>";
  if (typeof val === 'object') {
    const obj = val as Record<string, unknown>;
    if (obj.__name__ && typeof obj.__name__ === 'string') return `<class '${obj.__name__}'>`;
    if (obj.constructor && obj.constructor.name && obj.constructor.name !== 'Object') return `<class '${obj.constructor.name}'>`;
    return "<class 'dict'>";
  }
  return `<class '${typeof val}'>`;
}
