import { isPyTuple } from '../pcPythonTags';
import { PyClass, PyComplex, PyFile, PyGenerator, PyInstance, PyType } from './pcPythonTypes';

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
    const isTuple = isPyTuple(val);
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

export function bindPythonArguments(
  fn: unknown,
  positional: unknown[],
  kwargs: Record<string, unknown>
): unknown[] {
  if (Object.keys(kwargs).length === 0) return [...positional];

  const paramNames = (fn as { __pythonParamNames?: string[] } | null | undefined)?.__pythonParamNames;
  if (!Array.isArray(paramNames) || paramNames.length === 0) {
    return positional.length > 0 ? [...positional, kwargs] : [kwargs];
  }

  const bound: unknown[] = [];
  const remaining = [...positional];
  paramNames.forEach(name => {
    if (Object.prototype.hasOwnProperty.call(kwargs, name)) {
      bound.push(kwargs[name]);
      delete kwargs[name];
    } else if (remaining.length > 0) {
      bound.push(remaining.shift());
    } else {
      bound.push(undefined);
    }
  });
  if (remaining.length > 0) bound.push(...remaining);
  return bound;
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
