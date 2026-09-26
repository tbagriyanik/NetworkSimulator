// pcPythonEvaluatorCollections.ts
// Handles: len, abs, bin, oct, hex, ord, chr, sum, list, min, max, next,
//          sorted, reversed, dict, map, filter, enumerate, zip

import {
  PyGenerator,
  splitOutsideQuotesAndParens,
  parseFormatArgs,
} from './pcPythonRunnerHelpers';

/** Normalise an iterable value (array / Set / string) into a plain array */
function toIterableItems(iterVal: unknown): unknown[] {
  if (Array.isArray(iterVal)) return iterVal;
  if (iterVal instanceof Set) return Array.from(iterVal);
  if (typeof iterVal === 'string') return iterVal.split('');
  return [];
}

export interface CollectionResult {
  handled: boolean;
  value?: unknown;
}

export function evaluatePythonCollections(
  trimmed: string,
  evaluateExpr: (expr: string) => unknown,
  isCompleteCall: (name: string) => boolean
): CollectionResult {
  // Handle len(...)
  const lenMatch = isCompleteCall('len') ? /^len\s*\((.*)\)$/.exec(trimmed) : null;
  if (lenMatch) {
    const val = evaluateExpr(lenMatch[1]);
    if (Array.isArray(val) || typeof val === 'string') return { handled: true, value: val.length };
    if (val instanceof Set) return { handled: true, value: val.size };
    if (typeof val === 'object' && val !== null) return { handled: true, value: Object.keys(val).length };
    return { handled: true, value: 0 };
  }

  // Handle abs(...)
  const absMatch = /^abs\s*\((.*)\)$/.exec(trimmed);
  if (absMatch) {
    return { handled: true, value: Math.abs(Number(evaluateExpr(absMatch[1]) || 0)) };
  }

  // Handle bin(...)
  const binMatch = /^bin\s*\((.*)\)$/.exec(trimmed);
  if (binMatch) {
    const num = Math.floor(Number(evaluateExpr(binMatch[1]) || 0));
    return { handled: true, value: num < 0 ? '-0b' + Math.abs(num).toString(2) : '0b' + num.toString(2) };
  }

  // Handle oct(...)
  const octMatch = /^oct\s*\((.*)\)$/.exec(trimmed);
  if (octMatch) {
    const num = Math.floor(Number(evaluateExpr(octMatch[1]) || 0));
    return { handled: true, value: num < 0 ? '-0o' + Math.abs(num).toString(8) : '0o' + num.toString(8) };
  }

  // Handle hex(...)
  const hexMatch = /^hex\s*\((.*)\)$/.exec(trimmed);
  if (hexMatch) {
    const num = Math.floor(Number(evaluateExpr(hexMatch[1]) || 0));
    return { handled: true, value: num < 0 ? '-0x' + Math.abs(num).toString(16) : '0x' + num.toString(16) };
  }

  // Handle ord(...)
  const ordMatch = /^ord\s*\((.*)\)$/.exec(trimmed);
  if (ordMatch) {
    const val = evaluateExpr(ordMatch[1]);
    const str = String(val || '');
    return { handled: true, value: str.length > 0 ? str.charCodeAt(0) : 0 };
  }

  // Handle chr(...)
  const chrMatch = /^chr\s*\((.*)\)$/.exec(trimmed);
  if (chrMatch) {
    const num = Math.floor(Number(evaluateExpr(chrMatch[1]) || 0));
    return { handled: true, value: String.fromCharCode(num) };
  }

  // Handle sum(...)
  const sumMatch = isCompleteCall('sum') ? /^sum\s*\((.*)\)$/.exec(trimmed) : null;
  if (sumMatch) {
    const parts = splitOutsideQuotesAndParens(sumMatch[1], ',');
    const val = evaluateExpr(parts[0]);
    const startVal = parts.length > 1 ? Number(evaluateExpr(parts[1])) : 0;
    let items: unknown[] = [];
    if (Array.isArray(val)) {
      items = val;
    } else if (val instanceof PyGenerator) {
      let res = val.next();
      while (!res.done) { items.push(res.value); res = val.next(); }
    } else if (val && typeof val === 'object' && typeof (val as Record<string | symbol, unknown>)[Symbol.iterator] === 'function') {
      items = Array.from(val as Iterable<unknown>);
    }
    return { handled: true, value: items.reduce((acc: number, item: unknown) => acc + Number(item || 0), startVal) };
  }

  // Handle list(...)
  const listMatch = isCompleteCall('list') ? /^list\s*\((.*)\)$/.exec(trimmed) : null;
  if (listMatch) {
    const val = evaluateExpr(listMatch[1]);
    if (Array.isArray(val)) return { handled: true, value: [...val] };
    if (typeof val === 'string') return { handled: true, value: val.split('') };
    if (val instanceof Set) return { handled: true, value: Array.from(val) };
    if (val instanceof PyGenerator) {
      const items: unknown[] = [];
      let res = val.next();
      while (!res.done) { items.push(res.value); res = val.next(); }
      return { handled: true, value: items };
    }
    if (val && typeof val === 'object' && typeof (val as Record<string | symbol, unknown>)[Symbol.iterator] === 'function') {
      return { handled: true, value: Array.from(val as Iterable<unknown>) };
    }
    return { handled: true, value: [] };
  }

  // Handle min(...)
  const minMatch = /^min\s*\((.*)\)$/.exec(trimmed);
  if (minMatch) {
    const parts = splitOutsideQuotesAndParens(minMatch[1], ',').map(p => evaluateExpr(p));
    const items = parts.length === 1 && Array.isArray(parts[0]) ? parts[0] : parts;
    return { handled: true, value: Math.min(...items.map(i => Number(i))) };
  }

  // Handle max(...)
  const maxMatch = /^max\s*\((.*)\)$/.exec(trimmed);
  if (maxMatch) {
    const parts = splitOutsideQuotesAndParens(maxMatch[1], ',').map(p => evaluateExpr(p));
    const items = parts.length === 1 && Array.isArray(parts[0]) ? parts[0] : parts;
    return { handled: true, value: Math.max(...items.map(i => Number(i))) };
  }

  // Handle next(...)
  const nextMatch = /^next\s*\((.*)\)$/.exec(trimmed);
  if (nextMatch) {
    const parts = splitOutsideQuotesAndParens(nextMatch[1], ',');
    const iterObj = evaluateExpr(parts[0]);
    if (iterObj instanceof PyGenerator) {
      const res = iterObj.next();
      if (!res.done) return { handled: true, value: res.value };
    } else if (iterObj && typeof iterObj === 'object' && typeof (iterObj as Record<string | symbol, unknown>)[Symbol.iterator] === 'function') {
      const it = (iterObj as Iterable<unknown>)[Symbol.iterator]();
      const res = it.next();
      if (!res.done) return { handled: true, value: res.value };
    }
    if (parts.length > 1) return { handled: true, value: evaluateExpr(parts[1]) };
    throw new Error('StopIteration');
  }

  // Handle sorted(...)
  const sortedMatch = isCompleteCall('sorted') ? /^sorted\s*\((.*)\)$/.exec(trimmed) : null;
  if (sortedMatch) {
    const { positional, kwargs } = parseFormatArgs(sortedMatch[1], evaluateExpr);
    const val = positional[0];
    let arr: unknown[];
    if (Array.isArray(val)) arr = [...val];
    else if (typeof val === 'string') arr = val.split('');
    else if (val instanceof Set) arr = Array.from(val);
    else return { handled: true, value: val };
    const keyFn = typeof kwargs['key'] === 'function' ? (kwargs['key'] as (x: unknown) => unknown) : null;
    const reverse = Boolean(kwargs['reverse']);
    arr.sort((a, b) => {
      const ka = keyFn ? keyFn(a) : a;
      const kb = keyFn ? keyFn(b) : b;
      let comp = 0;
      if (typeof ka === 'number' && typeof kb === 'number') comp = ka - kb;
      else comp = String(ka) < String(kb) ? -1 : String(ka) > String(kb) ? 1 : 0;
      return reverse ? -comp : comp;
    });
    return { handled: true, value: arr };
  }

  // Handle reversed(...)
  const reversedMatch = isCompleteCall('reversed') ? /^reversed\s*\((.*)\)$/.exec(trimmed) : null;
  if (reversedMatch) {
    const val = evaluateExpr(reversedMatch[1]);
    let arr: unknown[];
    if (Array.isArray(val)) arr = [...val];
    else if (typeof val === 'string') arr = val.split('');
    else if (val instanceof Set) arr = Array.from(val);
    else return { handled: true, value: val };
    return { handled: true, value: [...arr].reverse() };
  }

  // Handle dict(...)
  const dictMatch = isCompleteCall('dict') ? /^dict\s*\((.*)\)$/.exec(trimmed) : null;
  if (dictMatch) {
    const innerArg = dictMatch[1].trim();
    if (!innerArg) return { handled: true, value: {} };
    const evaluated = evaluateExpr(innerArg);
    if (Array.isArray(evaluated)) {
      const d: Record<string, unknown> = {};
      for (const pair of evaluated) {
        if (Array.isArray(pair) && pair.length >= 2) d[String(pair[0])] = pair[1];
      }
      return { handled: true, value: d };
    }
    if (typeof evaluated === 'object' && evaluated !== null) return { handled: true, value: { ...evaluated } };
    return { handled: true, value: {} };
  }

  // Handle map(func, iterable)
  const mapMatch = /^map\s*\((.*)\)$/.exec(trimmed);
  if (mapMatch) {
    const parts = splitOutsideQuotesAndParens(mapMatch[1], ',');
    if (parts.length >= 2) {
      const fnVal = evaluateExpr(parts[0]);
      const iterVal = evaluateExpr(parts[1]);
      const items = toIterableItems(iterVal);
      if (typeof fnVal === 'function') {
        return { handled: true, value: items.map(item => fnVal(item)) };
      }
    }
  }

  // Handle filter(func, iterable)
  const filterMatch = /^filter\s*\((.*)\)$/.exec(trimmed);
  if (filterMatch) {
    const parts = splitOutsideQuotesAndParens(filterMatch[1], ',');
    if (parts.length >= 2) {
      const fnVal = evaluateExpr(parts[0]);
      const iterVal = evaluateExpr(parts[1]);
      const items = toIterableItems(iterVal);
      if (typeof fnVal === 'function') {
        return { handled: true, value: items.filter(item => Boolean(fnVal(item))) };
      }
    }
  }

  // Handle enumerate(iterable, start=0)
  const enumerateMatch = /^enumerate\s*\((.*)\)$/.exec(trimmed);
  if (enumerateMatch) {
    const parts = splitOutsideQuotesAndParens(enumerateMatch[1], ',');
    if (parts.length > 0) {
      const iterVal = evaluateExpr(parts[0]);
      let startVal = 0;
      if (parts.length > 1) {
        const secondArg = parts[1].trim();
        startVal = Number(evaluateExpr(secondArg.startsWith('start=') ? secondArg.slice(6) : secondArg) || 0);
      }
      const items = Array.isArray(iterVal) ? iterVal
        : iterVal instanceof Set ? Array.from(iterVal)
        : typeof iterVal === 'string' ? iterVal.split('')
        : typeof iterVal === 'object' && iterVal !== null && typeof (iterVal as Record<string | symbol, unknown>)[Symbol.iterator] === 'function'
          ? Array.from(iterVal as Iterable<unknown>)
          : [];
      const result = items.map((item, idx) => {
        const pair: unknown[] = [startVal + idx, item];
        (pair as unknown as { __isTuple__: boolean }).__isTuple__ = true;
        return pair;
      });
      return { handled: true, value: result };
    }
    return { handled: true, value: [] };
  }

  // Handle zip(*iterables)
  const zipMatch = /^zip\s*\((.*)\)$/.exec(trimmed);
  if (zipMatch) {
    const parts = splitOutsideQuotesAndParens(zipMatch[1], ',');
    if (parts.length > 0) {
      const iterables = parts.map(p => {
        const v = evaluateExpr(p);
        if (Array.isArray(v)) return v;
        if (v instanceof Set) return Array.from(v);
        if (typeof v === 'string') return v.split('');
        if (typeof v === 'object' && v !== null && typeof (v as Record<string | symbol, unknown>)[Symbol.iterator] === 'function') {
          return Array.from(v as Iterable<unknown>);
        }
        return [];
      });
      const minLen = Math.min(...iterables.map(it => it.length));
      const zipped: unknown[][] = [];
      for (let i = 0; i < minLen; i++) {
        const tup: unknown[] = iterables.map(it => it[i]);
        (tup as unknown as { __isTuple__: boolean }).__isTuple__ = true;
        zipped.push(tup);
      }
      return { handled: true, value: zipped };
    }
    return { handled: true, value: [] };
  }

  return { handled: false };
}
