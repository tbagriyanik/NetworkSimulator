// pcPythonEvaluatorBuiltins.ts
// Handles: input, type, isinstance, super, complex, set, divmod, round, float, int, str, bool

import {
  PyComplex,
  PyClass,
  PyInstance,
  PySuper,
  PyType,
  toPyComplex,
  getPyTypeValue,
  splitOutsideQuotesAndParens,
} from './pcPythonRunnerHelpers';

export interface BuiltinResult {
  handled: boolean;
  value?: unknown;
}

export function evaluatePythonBuiltins(
  trimmed: string,
  scope: Record<string, unknown>,
  evaluateExpr: (expr: string) => unknown,
  pythonInput: (promptMsg: unknown) => string,
  isCompleteCall: (name: string) => boolean
): BuiltinResult {
  // Handle input(...)
  const inputMatch = /^input\s*\((.*)\)$/.exec(trimmed);
  if (inputMatch) {
    const promptArg = inputMatch[1].trim();
    const promptMsg = promptArg ? evaluateExpr(promptArg) : '';
    return { handled: true, value: pythonInput(promptMsg) };
  }

  // Handle type(...)
  const typeMatch = /^type\s*\((.*)\)$/.exec(trimmed);
  if (typeMatch) {
    return { handled: true, value: getPyTypeValue(evaluateExpr(typeMatch[1])) };
  }

  // Handle isinstance(...)
  const isinstanceMatch = /^isinstance\s*\((.*)\)$/.exec(trimmed);
  if (isinstanceMatch) {
    const parts = splitOutsideQuotesAndParens(isinstanceMatch[1], ',');
    const obj = evaluateExpr(parts[0]);
    const cls = evaluateExpr(parts[1]);
    if (cls instanceof PyType) {
      if (obj instanceof PyInstance) {
        let current: PyClass | undefined = obj.pyClass;
        while (current) {
          if (current.name === cls.name) return { handled: true, value: true };
          current = current.baseClasses.length > 0 ? current.baseClasses[0] : undefined;
        }
        return { handled: true, value: false };
      }
      return { handled: true, value: getPyTypeValue(obj).name === cls.name };
    }
    return { handled: true, value: false };
  }

  // Handle super()
  if (/^super\s*\(\s*\)$/.test(trimmed)) {
    const selfObj = scope['self'];
    if (selfObj instanceof PyInstance) {
      return { handled: true, value: new PySuper(selfObj) };
    }
    return { handled: true, value: null };
  }

  // Handle complex(...)
  const complexBuiltinMatch = /^complex\s*\((.*)\)$/.exec(trimmed);
  if (complexBuiltinMatch) {
    const rawArg = complexBuiltinMatch[1].trim();
    if (!rawArg) return { handled: true, value: new PyComplex(0, 0) };
    const parts = splitOutsideQuotesAndParens(rawArg, ',');
    if (parts.length === 1) {
      return { handled: true, value: toPyComplex(evaluateExpr(parts[0])) };
    }
    const real = Number(evaluateExpr(parts[0]) || 0);
    const imag = Number(evaluateExpr(parts[1]) || 0);
    return { handled: true, value: new PyComplex(real, imag) };
  }

  // Handle set(...)
  const setMatch = /^set\s*\((.*)\)$/.exec(trimmed);
  if (setMatch) {
    const val = evaluateExpr(setMatch[1]);
    if (Array.isArray(val)) return { handled: true, value: new Set(val) };
    if (typeof val === 'string') return { handled: true, value: new Set(val.split('')) };
    if (val instanceof Set) return { handled: true, value: new Set(val) };
    return { handled: true, value: new Set() };
  }

  // Handle divmod(...)
  const divmodMatch = /^divmod\s*\((.*)\)$/.exec(trimmed);
  if (divmodMatch) {
    const parts = splitOutsideQuotesAndParens(divmodMatch[1], ',').map(p => Number(evaluateExpr(p)));
    const a = parts[0] || 0;
    const b = parts[1] || 1;
    if (b === 0) throw new Error('ZeroDivisionError: integer division or modulo by zero');
    return { handled: true, value: [Math.floor(a / b), a % b] };
  }

  // Handle round(...)
  const roundMatch = /^round\s*\((.*)\)$/.exec(trimmed);
  if (roundMatch) {
    const parts = splitOutsideQuotesAndParens(roundMatch[1], ',');
    const num = Number(evaluateExpr(parts[0]) || 0);
    const decimals = parts.length > 1 ? Number(evaluateExpr(parts[1])) : 0;
    const factor = Math.pow(10, decimals);
    return { handled: true, value: Math.round(num * factor) / factor };
  }

  // Handle float(...)
  const floatMatch = /^float\s*\((?:[^()]|\([^()]*\))*\)$/.exec(trimmed);
  if (floatMatch) {
    const val = evaluateExpr(trimmed.slice(trimmed.indexOf('(') + 1, -1));
    const num = Number(val);
    if (isNaN(num)) throw new Error(`ValueError: could not convert string to float: '${String(val)}'`);
    return { handled: true, value: num };
  }

  // Handle int(...)
  const intMatch = /^int\s*\((.*)\)$/.exec(trimmed);
  if (intMatch) {
    const val = evaluateExpr(intMatch[1]);
    if (typeof val === 'boolean') return { handled: true, value: val ? 1 : 0 };
    const num = Number(val);
    if (isNaN(num)) throw new Error(`ValueError: invalid literal for int() with base 10: '${String(val)}'`);
    return { handled: true, value: Math.floor(num) };
  }

  // Handle str(...) - only a complete str(...) call
  const strMatch = isCompleteCall('str') ? /^str\s*\((.*)\)$/.exec(trimmed) : null;
  if (strMatch) {
    return { handled: true, value: String(evaluateExpr(strMatch[1])) };
  }

  // Handle bool(...)
  const boolMatch = /^bool\s*\((.*)\)$/.exec(trimmed);
  if (boolMatch) {
    const val = evaluateExpr(boolMatch[1]);
    if (val === 'False' || val === 'false' || val === '0' || val === 0 || val === false || val === null || val === undefined) {
      return { handled: true, value: false };
    }
    return { handled: true, value: Boolean(val) };
  }

  return { handled: false };
}
