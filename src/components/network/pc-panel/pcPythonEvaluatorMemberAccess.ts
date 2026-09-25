// pcPythonEvaluatorMemberAccess.ts
// Handles: targetExpr.method(...) and targetExpr.prop for strings, dicts,
//          PyInstance, PyClass, and arbitrary JS objects.

import {
  PyComplex,
  PyInstance,
  PyClass,
  PySuper,
  splitOutsideQuotesAndParens,
  parseFormatArgs,
  bindPythonArguments,
  formatStringTemplate,
  findOperatorIndex,
} from './pcPythonRunnerHelpers';

export interface MemberAccessResult {
  handled: boolean;
  value?: unknown;
}

// ── String method dispatch ──────────────────────────────────────────────────
function evalStringMethod(
  obj: string,
  methodName: string,
  rawArgs: string,
  evaluateExpr: (expr: string) => unknown
): MemberAccessResult {
  if (methodName === 'format') {
    const { positional, kwargs } = parseFormatArgs(rawArgs, evaluateExpr);
    return { handled: true, value: formatStringTemplate(obj, positional, kwargs) };
  }
  const sArgs = rawArgs ? splitOutsideQuotesAndParens(rawArgs, ',').map(a => evaluateExpr(a)) : [];
  switch (methodName) {
    case 'casefold':
    case 'lower':      return { handled: true, value: obj.toLowerCase() };
    case 'upper':      return { handled: true, value: obj.toUpperCase() };
    case 'strip':      return { handled: true, value: obj.trim() };
    case 'lstrip':     return { handled: true, value: obj.trimStart() };
    case 'rstrip':     return { handled: true, value: obj.trimEnd() };
    case 'capitalize': return { handled: true, value: obj.charAt(0).toUpperCase() + obj.slice(1).toLowerCase() };
    case 'title':      return { handled: true, value: obj.replace(/\w\S*/g, (w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()) };
    case 'replace':    return { handled: true, value: obj.split(String(sArgs[0])).join(String(sArgs[1])) };
    case 'split':      return { handled: true, value: sArgs.length ? obj.split(String(sArgs[0])) : obj.split(/\s+/).filter(Boolean) };
    case 'find':       return { handled: true, value: obj.indexOf(String(sArgs[0])) };
    case 'count': {
      const sub = String(sArgs[0]);
      return { handled: true, value: sub ? obj.split(sub).length - 1 : 0 };
    }
    case 'startswith': return { handled: true, value: obj.startsWith(String(sArgs[0])) };
    case 'endswith':   return { handled: true, value: obj.endsWith(String(sArgs[0])) };
    case 'isdigit':    return { handled: true, value: /^\d+$/.test(obj) };
    case 'isalpha':    return { handled: true, value: /^[a-zA-ZçğıöşüÇĞİÖŞÜ]+$/.test(obj) };
    case 'isupper':    return { handled: true, value: obj === obj.toUpperCase() && /[A-ZÇĞİÖŞÜ]/.test(obj) };
    case 'islower':    return { handled: true, value: obj === obj.toLowerCase() && /[a-zçğıöşü]/.test(obj) };
    case 'join':
      return {
        handled: true,
        value: Array.isArray(sArgs[0])
          ? sArgs[0].map(String).join(obj)
          : sArgs[0] instanceof Set
            ? Array.from(sArgs[0]).map(String).join(obj)
            : String(sArgs[0]),
      };
    default: return { handled: false };
  }
}

// ── Dict / plain-object method dispatch ────────────────────────────────────
function evalDictMethod(
  objectValue: Record<string, unknown>,
  methodName: string,
  argList: unknown[]
): MemberAccessResult {
  switch (methodName) {
    case 'fromkeys': {
      const keysIter = argList[0];
      const defaultVal = argList.length > 1 ? argList[1] : null;
      const newDict: Record<string, unknown> = {};
      let keysArray: unknown[] = [];
      if (typeof keysIter === 'string') keysArray = keysIter.split('');
      else if (Array.isArray(keysIter)) keysArray = keysIter;
      else if (keysIter instanceof Set) keysArray = Array.from(keysIter);
      for (const k of keysArray) newDict[String(k)] = defaultVal;
      return { handled: true, value: newDict };
    }
    case 'get': {
      const key = String(argList[0]);
      const defVal = argList.length > 1 ? argList[1] : null;
      return { handled: true, value: key in objectValue ? objectValue[key] : defVal };
    }
    case 'keys':    return { handled: true, value: Object.keys(objectValue) };
    case 'values':  return { handled: true, value: Object.values(objectValue) };
    case 'items':   return { handled: true, value: Object.entries(objectValue) };
    case 'pop': {
      const key = String(argList[0]);
      const val = objectValue[key];
      delete objectValue[key];
      return { handled: true, value: val };
    }
    case 'clear': {
      for (const k of Object.keys(objectValue)) delete objectValue[k];
      return { handled: true, value: null };
    }
    case 'copy':   return { handled: true, value: { ...objectValue } };
    case 'setdefault': {
      const key = String(argList[0]);
      const defVal = argList.length > 1 ? argList[1] : null;
      if (!(key in objectValue)) objectValue[key] = defVal;
      return { handled: true, value: objectValue[key] };
    }
    case 'update': {
      const other = argList[0];
      if (other && typeof other === 'object' && !Array.isArray(other)) {
        Object.assign(objectValue, other);
      }
      return { handled: true, value: null };
    }
    default: return { handled: false };
  }
}

// ── Main member-call evaluator ─────────────────────────────────────────────
export function evaluatePythonMemberCall(
  trimmed: string,
  evaluateExpr: (expr: string) => unknown,
  dotIdx: number
): MemberAccessResult {
  if (!trimmed.endsWith(')')) return { handled: false };

  const targetStr = trimmed.slice(0, dotIdx).trim();
  const rest = trimmed.slice(dotIdx + 1).trim();
  const methodMatch = /^([a-zA-Z_][a-zA-Z0-9_]*)\s*\((.*)\)$/.exec(rest);
  if (!methodMatch) return { handled: false };

  const methodName = methodMatch[1];
  const rawArgs = methodMatch[2].trim();
  const obj = targetStr === 'dict' ? {} : evaluateExpr(targetStr);

  // String methods
  if (typeof obj === 'string') {
    return evalStringMethod(obj, methodName, rawArgs, evaluateExpr);
  }

  // Dict / plain-object methods
  const objectValue = obj as Record<string, unknown> | undefined;
  // Skip dict-style dispatch when the receiver is a real class instance that
  // defines `methodName` on its prototype (Entry.get(), StringVar.get(), ...).
  // Otherwise the dict 'get' handler below would intercept those widget and
  // variable readers and always return null instead of the stored value.
  const hasOwnMethod = !!(objectValue && typeof objectValue[methodName] === 'function');
  if (!hasOwnMethod && objectValue && typeof obj === 'object' && obj !== null && !Array.isArray(obj) && !(obj instanceof Set)) {
    const argList = rawArgs ? splitOutsideQuotesAndParens(rawArgs, ',').map(a => evaluateExpr(a)) : [];
    const dictResult = evalDictMethod(objectValue, methodName, argList);
    if (dictResult.handled) return dictResult;
  }

  // PyInstance / PySuper
  if (obj instanceof PyInstance || obj instanceof PySuper) {
    const fn = obj.getAttribute(methodName);
    if (typeof fn === 'function') {
      const argList = rawArgs ? splitOutsideQuotesAndParens(rawArgs, ',').map(a => evaluateExpr(a)) : [];
      return { handled: true, value: fn(...argList) };
    }
  }

  // PyClass static / class methods
  if (obj instanceof PyClass) {
    const method = obj.findMethod(methodName);
    if (typeof method === 'function') {
      const argList = rawArgs ? splitOutsideQuotesAndParens(rawArgs, ',').map(a => evaluateExpr(a)) : [];
      if (obj.staticMethods.has(methodName)) return { handled: true, value: method(...argList) };
      if (obj.classMethods.has(methodName)) return { handled: true, value: method(obj, ...argList) };
      return { handled: true, value: method(...argList) };
    }
  }

  // Arbitrary JS-object function call
  if (objectValue && typeof objectValue[methodName] === 'function') {
    const fn = objectValue[methodName] as (...args: unknown[]) => unknown;
    const { positional, kwargs } = rawArgs
      ? parseFormatArgs(rawArgs, evaluateExpr)
      : { positional: [], kwargs: {} as Record<string, unknown> };

    // Honour __pythonParamNames so keyword arguments reach native methods
    // (e.g. `synth.play_note("A4", duration_ms=400)`).
    const finalArgs = bindPythonArguments(fn, positional, kwargs);

    const isConstructable = fn.prototype && fn.prototype.constructor === fn && Object.getOwnPropertyNames(fn.prototype).length > 1;
    if (isConstructable) {
      try {
        const Ctor = fn as unknown as new (...args: unknown[]) => unknown;
        return { handled: true, value: new Ctor(...finalArgs) };
      } catch { /* fall through to apply */ }
    }

    try {
      return { handled: true, value: fn.apply(objectValue, finalArgs) };
    } catch (callErr: unknown) {
      if (callErr instanceof Error && callErr.message.includes("must be invoked with 'new'")) {
        const Ctor = fn as unknown as new (...args: unknown[]) => unknown;
        return { handled: true, value: new Ctor(...finalArgs) };
      }
      throw callErr;
    }
  }

  return { handled: false };
}

// ── Property access: obj.prop (no trailing paren) ──────────────────────────
export function evaluatePythonPropertyAccess(
  trimmed: string,
  evaluateExpr: (expr: string) => unknown
): MemberAccessResult {
  if (trimmed.endsWith(')')) return { handled: false };

  // Find last top-level dot
  let lastDotIdx = -1;
  let inQ = false;
  let qChar = '';
  let pDepth = 0;
  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];
    if ((char === '"' || char === "'") && (i === 0 || trimmed[i - 1] !== '\\')) {
      if (!inQ) { inQ = true; qChar = char; }
      else if (qChar === char) { inQ = false; }
    } else if (!inQ) {
      if (char === '(' || char === '[' || char === '{') pDepth++;
      else if (char === ')' || char === ']' || char === '}') pDepth--;
      else if (pDepth === 0 && char === '.') lastDotIdx = i;
    }
  }
  if (lastDotIdx === -1) return { handled: false };

  const leftExpr = trimmed.slice(0, lastDotIdx).trim();
  const attrName = trimmed.slice(lastDotIdx + 1).trim();
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(attrName)) return { handled: false };

  const curr = evaluateExpr(leftExpr);

  if (curr instanceof PyInstance) return { handled: true, value: curr.getAttribute(attrName) };
  if (curr instanceof PySuper)   return { handled: true, value: curr.getAttribute(attrName) };
  if (curr instanceof PyClass)   return { handled: true, value: curr.getAttribute(attrName) };

  if (curr instanceof PyComplex) {
    if (attrName === 'real') return { handled: true, value: Number.isInteger(curr.real) ? `${curr.real}.0` : curr.real };
    if (attrName === 'imag') return { handled: true, value: Number.isInteger(curr.imag) ? `${curr.imag}.0` : curr.imag };
  }

  if (curr && (typeof curr === 'object' || typeof curr === 'function')) {
    if (attrName in (curr as Record<string, unknown>)) {
      return { handled: true, value: (curr as Record<string, unknown>)[attrName] };
    }
  }

  return { handled: false };
}

// ── Dot-index helper (re-export for evaluator) ────────────────────────────
export { findOperatorIndex };
