// pcPythonEvaluatorArithmetic.ts
// Handles: bitwise (|, &, ^), floor div (//), modulo (%), add/sub (+, -),
//          multiply/divide (*, /), power (**), and indexing/slicing ([]).

import {
  PyComplex,
  toPyComplex,
  splitOutsideQuotesAndParens,
  splitOnMultiplyOperator,
  formatPrintfString,
  findOperatorIndex,
} from './pcPythonRunnerHelpers';

export interface ArithmeticResult {
  handled: boolean;
  value?: unknown;
}

export function evaluatePythonArithmetic(
  trimmed: string,
  evaluateExpr: (expr: string) => unknown
): ArithmeticResult {
  // ── Bitwise OR | (also set union, dict merge) ───────────────────────────
  const bitOrParts = splitOutsideQuotesAndParens(trimmed, '|');
  if (bitOrParts.length > 1) {
    const parts = bitOrParts.map(p => evaluateExpr(p));
    if (parts.some(p => p instanceof Set)) {
      const res = new Set<unknown>();
      for (const p of parts) {
        if (p instanceof Set) { for (const item of p) res.add(item); }
        else if (Array.isArray(p)) { for (const item of p) res.add(item); }
        else res.add(p);
      }
      return { handled: true, value: res };
    }
    if (parts.some(p => typeof p === 'object' && p !== null && !(p instanceof Set) && !Array.isArray(p))) {
      const merged: Record<string, unknown> = {};
      for (const p of parts) {
        if (typeof p === 'object' && p !== null && !Array.isArray(p) && !(p instanceof Set)) {
          Object.assign(merged, p);
        }
      }
      return { handled: true, value: merged };
    }
    return { handled: true, value: parts.reduce((acc: number, val: unknown) => acc | Number(val || 0), 0) };
  }

  // ── Bitwise AND & (also set intersection) ──────────────────────────────
  const bitAndParts = splitOutsideQuotesAndParens(trimmed, '&');
  if (bitAndParts.length > 1) {
    const parts = bitAndParts.map(p => evaluateExpr(p));
    if (parts.some(p => p instanceof Set)) {
      let res = parts[0] instanceof Set ? new Set(parts[0] as Set<unknown>) : new Set(Array.isArray(parts[0]) ? (parts[0] as unknown[]) : [parts[0]]);
      for (let i = 1; i < parts.length; i++) {
        const nextSet = parts[i] instanceof Set ? (parts[i] as Set<unknown>) : new Set(Array.isArray(parts[i]) ? (parts[i] as unknown[]) : [parts[i]]);
        res = new Set(Array.from(res).filter(x => nextSet.has(x)));
      }
      return { handled: true, value: res };
    }
    return { handled: true, value: parts.slice(1).reduce((acc: number, val: unknown) => acc & Number(val || 0), Number(parts[0] || 0)) };
  }

  // ── Bitwise XOR ^ (also set symmetric difference) ──────────────────────
  const bitXorParts = splitOutsideQuotesAndParens(trimmed, '^');
  if (bitXorParts.length > 1) {
    const parts = bitXorParts.map(p => evaluateExpr(p));
    if (parts.some(p => p instanceof Set)) {
      let res = parts[0] instanceof Set ? new Set(parts[0] as Set<unknown>) : new Set(Array.isArray(parts[0]) ? (parts[0] as unknown[]) : [parts[0]]);
      for (let i = 1; i < parts.length; i++) {
        const nextSet = parts[i] instanceof Set ? (parts[i] as Set<unknown>) : new Set(Array.isArray(parts[i]) ? (parts[i] as unknown[]) : [parts[i]]);
        const newRes = new Set<unknown>();
        for (const x of res) { if (!nextSet.has(x)) newRes.add(x); }
        for (const x of nextSet) { if (!res.has(x)) newRes.add(x); }
        res = newRes;
      }
      return { handled: true, value: res };
    }
    return { handled: true, value: parts.slice(1).reduce((acc: number, val: unknown) => acc ^ Number(val || 0), Number(parts[0] || 0)) };
  }

  // ── Floor division // ──────────────────────────────────────────────────
  const floorDivIdx = findOperatorIndex(trimmed, '//');
  if (floorDivIdx !== -1) {
    const leftVal = Number(evaluateExpr(trimmed.slice(0, floorDivIdx).trim()));
    const rightVal = Number(evaluateExpr(trimmed.slice(floorDivIdx + 2).trim()));
    if (rightVal === 0) throw new Error('ZeroDivisionError: integer division by zero');
    return { handled: true, value: Math.floor(leftVal / rightVal) };
  }

  // ── Modulo % (also printf-style formatting) ────────────────────────────
  const percentIdx = findOperatorIndex(trimmed, '%');
  if (percentIdx !== -1) {
    const leftVal = evaluateExpr(trimmed.slice(0, percentIdx).trim());
    const rightVal = evaluateExpr(trimmed.slice(percentIdx + 1).trim());
    if (typeof leftVal === 'string') {
      const argsArray = Array.isArray(rightVal) ? rightVal : [rightVal];
      return { handled: true, value: formatPrintfString(leftVal, argsArray) };
    }
    const rightNum = Number(rightVal);
    if (rightNum === 0) throw new Error('ZeroDivisionError: integer modulo by zero');
    return { handled: true, value: Number(leftVal) % rightNum };
  }

  // ── Addition + (also string concat, list concat) ────────────────────────
  const addParts = splitOutsideQuotesAndParens(trimmed, '+');
  if (addParts.length > 1) {
    const parts = addParts.map(p => evaluateExpr(p));
    if (parts.some(p => typeof p === 'string')) {
      return { handled: true, value: parts.map(p => String(p ?? '')).join('') };
    }
    if (parts.some(p => p instanceof PyComplex)) {
      return { handled: true, value: parts.reduce((acc: unknown, val: unknown) => toPyComplex(acc).add(val), new PyComplex(0, 0)) };
    }
    return { handled: true, value: parts.reduce((acc: number, val: unknown) => acc + Number(val || 0), 0) };
  }

  // ── Subtraction - (also set difference, negation) ──────────────────────
  const subParts = splitOutsideQuotesAndParens(trimmed, '-');
  if (subParts.length > 1) {
    if (subParts[0] === '') {
      // Unary negation
      const realParts = subParts.slice(1).map(p => evaluateExpr(p));
      if (realParts.length > 0) {
        const first = realParts[0];
        const negatedFirst = first instanceof PyComplex
          ? new PyComplex(-first.real, -first.imag)
          : typeof first === 'number'
            ? -first
            : toPyComplex(first).mul(-1);
        if (realParts.length === 1) return { handled: true, value: negatedFirst };
        if (realParts.some(p => p instanceof PyComplex) || negatedFirst instanceof PyComplex) {
          return { handled: true, value: realParts.slice(1).reduce((acc: unknown, val: unknown) => toPyComplex(acc).sub(val), negatedFirst) };
        }
        return { handled: true, value: realParts.slice(1).reduce((acc: number, val: unknown) => acc - Number(val || 0), Number(negatedFirst)) };
      }
    } else {
      const parts = subParts.map(p => evaluateExpr(p));
      if (parts.some(p => p instanceof Set)) {
        let res = parts[0] instanceof Set ? new Set(parts[0] as Set<unknown>) : new Set(Array.isArray(parts[0]) ? (parts[0] as unknown[]) : [parts[0]]);
        for (let i = 1; i < parts.length; i++) {
          const nextSet = parts[i] instanceof Set ? (parts[i] as Set<unknown>) : new Set(Array.isArray(parts[i]) ? (parts[i] as unknown[]) : [parts[i]]);
          res = new Set(Array.from(res).filter(x => !nextSet.has(x)));
        }
        return { handled: true, value: res };
      }
      if (parts.some(p => p instanceof PyComplex)) {
        return { handled: true, value: parts.reduce((acc: unknown, val: unknown, idx: number) => (idx === 0 ? toPyComplex(val) : toPyComplex(acc).sub(val)), new PyComplex(0, 0)) };
      }
      return { handled: true, value: parts.reduce((acc: number, val: unknown, idx: number) => (idx === 0 ? Number(val) : acc - Number(val)), 0) };
    }
  }

  // ── Multiplication * (also string/list repetition) ──────────────────────
  const mulParts = splitOnMultiplyOperator(trimmed);
  if (mulParts.length > 1) {
    const parts = mulParts.map(p => evaluateExpr(p));
    if (parts.some(p => p instanceof PyComplex)) {
      return { handled: true, value: parts.reduce((acc: unknown, val: unknown) => toPyComplex(acc).mul(val), new PyComplex(1, 0)) };
    }
    if (parts.length === 2) {
      const [a, b] = parts;
      if (typeof a === 'string' && typeof b === 'number') return { handled: true, value: a.repeat(Math.max(0, Math.floor(b))) };
      if (typeof b === 'string' && typeof a === 'number') return { handled: true, value: b.repeat(Math.max(0, Math.floor(a))) };
      if (Array.isArray(a) && typeof b === 'number') {
        const count = Math.max(0, Math.floor(b));
        const res: unknown[] = [];
        for (let i = 0; i < count; i++) res.push(...a);
        if ((a as unknown as { __isTuple__?: boolean }).__isTuple__) (res as unknown as { __isTuple__: boolean }).__isTuple__ = true;
        return { handled: true, value: res };
      }
      if (Array.isArray(b) && typeof a === 'number') {
        const count = Math.max(0, Math.floor(a));
        const res: unknown[] = [];
        for (let i = 0; i < count; i++) res.push(...b);
        if ((b as unknown as { __isTuple__?: boolean }).__isTuple__) (res as unknown as { __isTuple__: boolean }).__isTuple__ = true;
        return { handled: true, value: res };
      }
    }
    return { handled: true, value: parts.reduce((acc: number, val: unknown) => acc * Number(val ?? 0), 1) };
  }

  // ── Division / ──────────────────────────────────────────────────────────
  const divParts = splitOutsideQuotesAndParens(trimmed, '/');
  if (divParts.length > 1) {
    const parts = divParts.map(p => evaluateExpr(p));
    if (parts.some(p => p instanceof PyComplex)) {
      return { handled: true, value: parts.reduce((acc: unknown, val: unknown, idx: number) => (idx === 0 ? toPyComplex(val) : toPyComplex(acc).div(val)), new PyComplex(1, 0)) };
    }
    return {
      handled: true,
      value: parts.reduce((acc: number, val: unknown, idx: number) => {
        if (idx === 0) return Number(val);
        const divisor = Number(val);
        if (divisor === 0) throw new Error('ZeroDivisionError: division by zero');
        return acc / divisor;
      }, 0),
    };
  }

  // ── Exponentiation ** ──────────────────────────────────────────────────
  const powIdx = findOperatorIndex(trimmed, '**');
  if (powIdx !== -1) {
    const leftVal = Number(evaluateExpr(trimmed.slice(0, powIdx).trim()));
    const rightVal = Number(evaluateExpr(trimmed.slice(powIdx + 2).trim()));
    const res = Math.pow(leftVal, rightVal);
    if (!Number.isInteger(rightVal) && Number.isInteger(res)) return { handled: true, value: `${res}.0` };
    return { handled: true, value: res };
  }

  // ── Element indexing / Chained indexing: targetExpr[idx] or slice ──────
  if (trimmed.endsWith(']') && !trimmed.startsWith('[')) {
    let bracketDepth = 0;
    let openIdx = -1;
    let inQuote: string | null = null;
    for (let i = trimmed.length - 1; i >= 0; i--) {
      const char = trimmed[i];
      if (inQuote) {
        if (char === inQuote && (i === 0 || trimmed[i - 1] !== '\\')) inQuote = null;
        continue;
      }
      if (char === '"' || char === "'") { inQuote = char; continue; }
      if (char === ']') bracketDepth++;
      else if (char === '[') {
        bracketDepth--;
        if (bracketDepth === 0) { openIdx = i; break; }
      }
    }
    if (openIdx > 0) {
      const targetExpr = trimmed.slice(0, openIdx).trim();
      const idxExpr = trimmed.slice(openIdx + 1, -1).trim();
      const targetVal = evaluateExpr(targetExpr);

      if (Array.isArray(targetVal) || typeof targetVal === 'string') {
        if (idxExpr.includes(':')) {
          const sliceParts = idxExpr.split(':');
          const rawStart = sliceParts[0].trim();
          const rawStop = sliceParts[1]?.trim() ?? '';
          const rawStep = sliceParts[2]?.trim() ?? '';
          const len = targetVal.length;
          const step = rawStep ? Number(evaluateExpr(rawStep)) : 1;

          let start: number;
          if (rawStart) {
            let parsedStart = Number(evaluateExpr(rawStart));
            if (parsedStart < 0) parsedStart += len;
            start = Math.max(0, Math.min(len, parsedStart));
          } else {
            start = step < 0 ? len - 1 : 0;
          }

          let stop: number;
          if (rawStop) {
            let parsedStop = Number(evaluateExpr(rawStop));
            if (parsedStop < 0) parsedStop += len;
            stop = Math.max(-1, Math.min(len, parsedStop));
          } else {
            stop = step < 0 ? -1 : len;
          }

          if (typeof targetVal === 'string') {
            if (step === 1) return { handled: true, value: targetVal.slice(start, stop) };
            let res = '';
            if (step > 0) { for (let i = start; i < stop; i += step) res += targetVal[i]; }
            else if (step < 0) { for (let i = start; i > stop; i += step) res += targetVal[i]; }
            return { handled: true, value: res };
          }
          if (Array.isArray(targetVal)) {
            if (step === 1) return { handled: true, value: targetVal.slice(start, stop) };
            const res: unknown[] = [];
            if (step > 0) { for (let i = start; i < stop; i += step) res.push(targetVal[i]); }
            else if (step < 0) { for (let i = start; i > stop; i += step) res.push(targetVal[i]); }
            return { handled: true, value: res };
          }
        }
        const idxVal = evaluateExpr(idxExpr);
        const idx = Number(idxVal);
        const realIdx = idx < 0 ? targetVal.length + idx : idx;
        return { handled: true, value: targetVal[realIdx] };
      }

      if (typeof targetVal === 'object' && targetVal !== null) {
        const idxVal = evaluateExpr(idxExpr);
        return { handled: true, value: (targetVal as Record<string, unknown>)[String(idxVal)] };
      }
    }
  }

  return { handled: false };
}
