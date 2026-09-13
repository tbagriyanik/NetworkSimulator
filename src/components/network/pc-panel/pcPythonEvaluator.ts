import {
  PyComplex,
  PyFile,
  PyClass,
  PyInstance,
  PySuper,
  PyGenerator,
  PyType,
  toPyComplex,
  getPyTypeValue,
  findOperatorIndex,
  isEnclosedInParens,
  splitOutsideQuotesAndParens,
  splitOnMultiplyOperator,
  formatPrintfString,
  pythonRange,
  parseFormatArgs,
  formatStringTemplate,
} from './pcPythonRunnerHelpers';
import { loadFs, saveFs, readFile, writeFile, resolvePath, listDir, makeDir, deleteFile, isDir, getNode } from './pcFileSystem';
import { evaluatePythonLiteral } from './pcPythonEvaluatorLiterals';
import { evaluatePythonFunctionCall } from './pcPythonEvaluatorFunctions';
import { evaluatePythonLogicalOrComparison } from './pcPythonEvaluatorOperators';
import { evaluateSafeJavaScriptFallback } from './pcPythonEvaluatorSecurity';

export function createExpressionEvaluator(
  scope: Record<string, unknown>,
  pythonInput: (promptMsg: unknown) => string,
  deviceId?: string
): (expr: string) => unknown {
  const devId = deviceId || 'pc-default';
  const cwdRef = { value: 'C:\\' };

  scope['os'] = {
    name: 'nt',
    getcwd: () => cwdRef.value,
    chdir: (dirPath: unknown) => {
      const fs = loadFs(devId);
      const target = resolvePath(cwdRef.value, String(dirPath || ''));
      if (isDir(fs, target)) {
        cwdRef.value = target;
      } else {
        throw new Error(`FileNotFoundError: [WinError 2] The system cannot find the file specified: '${dirPath}'`);
      }
    },
    listdir: (dirPath?: unknown) => {
      const fs = loadFs(devId);
      const target = resolvePath(cwdRef.value, dirPath !== undefined ? String(dirPath) : '.');
      return listDir(fs, target);
    },
    mkdir: (dirPath: unknown) => {
      const fs = loadFs(devId);
      const target = resolvePath(cwdRef.value, String(dirPath || ''));
      makeDir(fs, target);
      saveFs(devId, fs);
    },
    remove: (filePath: unknown) => {
      const fs = loadFs(devId);
      const target = resolvePath(cwdRef.value, String(filePath || ''));
      deleteFile(fs, target);
      saveFs(devId, fs);
    },
    path: {
      join: (...args: unknown[]) => args.map(String).join('\\'),
      exists: (p: unknown) => getNode(loadFs(devId), resolvePath(cwdRef.value, String(p || ''))) !== null,
      isfile: (p: unknown) => {
        const node = getNode(loadFs(devId), resolvePath(cwdRef.value, String(p || '')));
        return node !== null && node.type === 'file';
      },
      isdir: (p: unknown) => isDir(loadFs(devId), resolvePath(cwdRef.value, String(p || ''))),
      basename: (p: unknown) => String(p || '').split(/[\\/]/).pop() || '',
      dirname: (p: unknown) => String(p || '').split(/[\\/]/).slice(0, -1).join('\\') || cwdRef.value,
    },
  };

  scope['glob'] = {
    glob: (patternVal: unknown) => {
      const pattern = String(patternVal || '*');
      const fs = loadFs(devId);
      let searchDir = cwdRef.value;
      let filePattern = pattern;

      const lastSep = Math.max(pattern.lastIndexOf('/'), pattern.lastIndexOf('\\'));
      if (lastSep !== -1) {
        const dirPart = pattern.slice(0, lastSep);
        filePattern = pattern.slice(lastSep + 1);
        searchDir = resolvePath(cwdRef.value, dirPart);
      }

      const files = listDir(fs, searchDir);
      const regexStr = '^' + filePattern
        .replace(/\\/g, '\\\\')
        .replace(/[.+^${}()|[\]]/g, '\\$&')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.') + '$';
      const regex = new RegExp(regexStr);

      const matched = files.filter(f => regex.test(f));
      if (lastSep !== -1) {
        const dirPrefix = pattern.slice(0, lastSep + 1);
        return matched.map(f => dirPrefix + f);
      }
      return matched;
    },
  };

  scope['open'] = (filePathVal: unknown, modeVal: unknown = 'r') => {
    const filePath = String(filePathVal || '');
    const mode = String(modeVal || 'r');
    const fs = loadFs(devId);
    const resolvedPath = resolvePath(cwdRef.value, filePath);

    let initialContent = '';
    if (mode.includes('r') || mode.includes('+') || mode.includes('a')) {
      const content = readFile(fs, resolvedPath) ?? readFile(fs, `C:\\${filePath}`) ?? readFile(fs, `C:\\code\\${filePath}`);
      if (content === null || content === undefined) {
        if (!mode.includes('w') && !mode.includes('a') && !mode.includes('+')) {
          throw new Error(`FileNotFoundError: [Errno 2] No such file or directory: '${filePath}'`);
        }
      } else {
        initialContent = content;
      }
    }

    const onSave = (newContent: string) => {
      const updatedFs = loadFs(devId);
      writeFile(updatedFs, resolvedPath, newContent);
      saveFs(devId, updatedFs);
    };

    return new PyFile(filePath, mode, initialContent, onSave);
  };

  // Built-in Python type objects used by type()/isinstance()/subclass checks.
  scope['int'] = new PyType('int');
  scope['float'] = new PyType('float');
  scope['str'] = new PyType('str');
  scope['bool'] = new PyType('bool');
  scope['list'] = new PyType('list');
  scope['dict'] = new PyType('dict');
  scope['tuple'] = new PyType('tuple');
  scope['set'] = new PyType('set');
  scope['object'] = new PyType('object');
  scope['Exception'] = new PyType('Exception');
  scope['ValueError'] = new PyType('ValueError');
  scope['BaseException'] = new PyType('BaseException');
  const evaluateExpr = (expr: string): unknown => {
    const trimmed = expr.trim();
    if (!trimmed) return undefined;

    // List literal or List Comprehension: [expr for var in iter if cond]
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      const inner = trimmed.slice(1, -1).trim();
      if (!inner) return [];

      let itemExprPart = inner;
      let ifCondExpr: string | null = null;
      const ifIdx = findOperatorIndex(inner, ' if ');
      if (ifIdx !== -1) {
        ifCondExpr = inner.slice(ifIdx + 4).trim();
        itemExprPart = inner.slice(0, ifIdx).trim();
      }

      const firstForIdx = findOperatorIndex(itemExprPart, ' for ');
      if (firstForIdx !== -1) {
        const itemExpr = itemExprPart.slice(0, firstForIdx).trim();
        const forPartsStr = itemExprPart.slice(firstForIdx).trim();
        const forMatches: Array<{ varStr: string; iterExpr: string }> = [];
        const forRegex = /\bfor\s+(.+?)\s+in\s+((?:(?!\bfor\b).)+)/gi;
        let fm: RegExpExecArray | null;
        while ((fm = forRegex.exec(forPartsStr)) !== null) {
          forMatches.push({ varStr: fm[1].trim(), iterExpr: fm[2].trim() });
        }

        if (forMatches.length > 0) {
          const resultList: unknown[] = [];
          const evaluateNestedFor = (depth: number) => {
            if (depth === forMatches.length) {
              let shouldInclude = true;
              if (ifCondExpr) {
                shouldInclude = Boolean(evaluateExpr(ifCondExpr));
              }
              if (shouldInclude) {
                resultList.push(evaluateExpr(itemExpr));
              }
              return;
            }

            const { varStr, iterExpr } = forMatches[depth];
            const rawIterable = evaluateExpr(iterExpr);
            let items: unknown[] = [];
            if (Array.isArray(rawIterable)) items = rawIterable;
            else if (typeof rawIterable === 'string') items = rawIterable.split('');
            else if (rawIterable instanceof Set) items = Array.from(rawIterable);
            else if (typeof rawIterable === 'object' && rawIterable !== null) {
              if (typeof (rawIterable as Record<string | symbol, unknown>)[Symbol.iterator] === 'function') {
                items = Array.from(rawIterable as Iterable<unknown>);
              } else {
                items = Object.keys(rawIterable);
              }
            }

            const targets = varStr.split(',').map(t => t.trim());
            for (const item of items) {
              const savedValues: Record<string, unknown> = {};
              if (targets.length > 1 && Array.isArray(item)) {
                targets.forEach((t, idx) => {
                  savedValues[t] = scope[t];
                  scope[t] = item[idx];
                });
              } else {
                savedValues[varStr] = scope[varStr];
                scope[varStr] = item;
              }

              evaluateNestedFor(depth + 1);

              if (targets.length > 1 && Array.isArray(item)) {
                targets.forEach(t => {
                  if (savedValues[t] !== undefined) scope[t] = savedValues[t];
                  else delete scope[t];
                });
              } else {
                if (savedValues[varStr] !== undefined) scope[varStr] = savedValues[varStr];
                else delete scope[varStr];
              }
            }
          };

          evaluateNestedFor(0);
          return resultList;
        }
      }

      const genExprIdx = findOperatorIndex(trimmed, ' for ');
      if (genExprIdx !== -1 && !trimmed.startsWith('[') && !trimmed.startsWith('{')) {
        const itemExprPart = trimmed;
        const firstForIdx = findOperatorIndex(itemExprPart, ' for ');
        if (firstForIdx !== -1) {
          const itemExpr = itemExprPart.slice(0, firstForIdx).trim();
          const forPartsStr = itemExprPart.slice(firstForIdx).trim();
          const forMatches: Array<{ varStr: string; iterExpr: string }> = [];
          const forRegex = /\bfor\s+(.+?)\s+in\s+((?:(?!\bfor\b).)+)/gi;
          let fm: RegExpExecArray | null;
          while ((fm = forRegex.exec(forPartsStr)) !== null) {
            forMatches.push({ varStr: fm[1].trim(), iterExpr: fm[2].trim() });
          }
          if (forMatches.length > 0) {
            const itemsList: unknown[] = [];
            const evaluateNestedFor = (depth: number) => {
              if (depth === forMatches.length) {
                itemsList.push(evaluateExpr(itemExpr));
                return;
              }
              const { varStr, iterExpr } = forMatches[depth];
              const rawIterable = evaluateExpr(iterExpr);
              let items: unknown[] = [];
              if (Array.isArray(rawIterable)) items = rawIterable;
              else if (typeof rawIterable === 'string') items = rawIterable.split('');
              else if (rawIterable instanceof Set) items = Array.from(rawIterable);
              const targets = varStr.split(',').map(t => t.trim());
              for (const item of items) {
                const savedValues: Record<string, unknown> = {};
                if (targets.length > 1 && Array.isArray(item)) {
                  targets.forEach((t, idx) => { savedValues[t] = scope[t]; scope[t] = item[idx]; });
                } else {
                  savedValues[varStr] = scope[varStr]; scope[varStr] = item;
                }
                evaluateNestedFor(depth + 1);
                if (targets.length > 1 && Array.isArray(item)) {
                  targets.forEach(t => { if (savedValues[t] !== undefined) scope[t] = savedValues[t]; else delete scope[t]; });
                } else {
                  if (savedValues[varStr] !== undefined) scope[varStr] = savedValues[varStr]; else delete scope[varStr];
                }
              }
            };
            evaluateNestedFor(0);
            return new PyGenerator(itemsList);
          }
        }
      }

      const parts: string[] = [];
      let current = '';
      let inQ = false;
      let qChar = '';
      let pDepth = 0;
      for (let i = 0; i < inner.length; i++) {
        const char = inner[i];
        if ((char === '"' || char === "'") && (i === 0 || inner[i - 1] !== '\\')) {
          if (!inQ) { inQ = true; qChar = char; }
          else if (qChar === char) { inQ = false; }
        } else if (!inQ) {
          if (char === '(' || char === '[' || char === '{') pDepth++;
          else if (char === ')' || char === ']' || char === '}') pDepth--;
        }
        if (char === ',' && !inQ && pDepth === 0) {
          parts.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      if (current.trim()) parts.push(current.trim());
      return parts.filter(p => p.trim() !== '').map(p => evaluateExpr(p));
    }

    // Top-level generator expression: expr for var in iterable [if cond]
    // (outside brackets; list/set comprehensions are handled above)
    {
      const genExprIdx = findOperatorIndex(trimmed, ' for ');
      if (genExprIdx !== -1 && !trimmed.startsWith('[') && !trimmed.startsWith('{') && !trimmed.startsWith('(')) {
        const itemExpr = trimmed.slice(0, genExprIdx).trim();
        const forPartsStr = trimmed.slice(genExprIdx).trim();
        const forRegex = /\bfor\s+(.+?)\s+in\s+((?:(?!\bfor\b).)+)/gi;
        const forMatches: Array<{ varStr: string; iterExpr: string }> = [];
        let fm: RegExpExecArray | null;
        while ((fm = forRegex.exec(forPartsStr)) !== null) {
          forMatches.push({ varStr: fm[1].trim(), iterExpr: fm[2].trim() });
        }
        if (forMatches.length > 0) {
          let ifCondExpr: string | null = null;
          const lastIter = forMatches[forMatches.length - 1].iterExpr;
          const ifAt = findOperatorIndex(lastIter, ' if ');
          if (ifAt !== -1) {
            ifCondExpr = lastIter.slice(ifAt + 4).trim();
            forMatches[forMatches.length - 1].iterExpr = lastIter.slice(0, ifAt).trim();
          }
          const itemsList: unknown[] = [];
          const evaluateNestedFor = (depth: number): void => {
            if (depth === forMatches.length) {
              let shouldInclude = true;
              if (ifCondExpr) shouldInclude = Boolean(evaluateExpr(ifCondExpr));
              if (shouldInclude) itemsList.push(evaluateExpr(itemExpr));
              return;
            }
            const { varStr, iterExpr } = forMatches[depth];
            const rawIterable = evaluateExpr(iterExpr);
            let items: unknown[] = [];
            if (Array.isArray(rawIterable)) items = rawIterable;
            else if (typeof rawIterable === 'string') items = rawIterable.split('');
            else if (rawIterable instanceof Set) items = Array.from(rawIterable);
            else if (typeof rawIterable === 'object' && rawIterable !== null) {
              if (typeof (rawIterable as Record<string | symbol, unknown>)[Symbol.iterator] === 'function') {
                items = Array.from(rawIterable as Iterable<unknown>);
              } else {
                items = Object.keys(rawIterable);
              }
            }
            const targets = varStr.split(',').map(t => t.trim());
            for (const item of items) {
              const savedValues: Record<string, unknown> = {};
              if (targets.length > 1 && Array.isArray(item)) {
                targets.forEach((t, idx) => { savedValues[t] = scope[t]; scope[t] = item[idx]; });
              } else {
                savedValues[varStr] = scope[varStr]; scope[varStr] = item;
              }
              evaluateNestedFor(depth + 1);
              if (targets.length > 1 && Array.isArray(item)) {
                targets.forEach(t => { if (savedValues[t] !== undefined) scope[t] = savedValues[t]; else delete scope[t]; });
              } else {
                if (savedValues[varStr] !== undefined) scope[varStr] = savedValues[varStr]; else delete scope[varStr];
              }
            }
          };
          evaluateNestedFor(0);
          return new PyGenerator(itemsList);
        }
      }
    }

    const isCompleteCall = (name: string): boolean => {
      const prefix = new RegExp(`^${name}\\s*\\(`).exec(trimmed);
      if (!prefix) return false;
      let depth = 0;
      let inQuote = '';
      for (let i = prefix[0].length - 1; i < trimmed.length; i++) {
        const ch = trimmed[i];
        if (inQuote) {
          if (ch === inQuote && trimmed[i - 1] !== '\\') inQuote = '';
        } else if (ch === '"' || ch === "'") {
          inQuote = ch;
        } else if (ch === '(') {
          depth++;
        } else if (ch === ')' && --depth === 0) {
          return i === trimmed.length - 1;
        }
      }
      return false;
    };

    // Handle Python string .join(...) method: sep.join(iterable)
    const joinIdx = trimmed.lastIndexOf('.join(');
    if (joinIdx !== -1 && trimmed.endsWith(')')) {
      const sepStrExpr = trimmed.slice(0, joinIdx).trim();
      const rawJoinArg = trimmed.slice(joinIdx + 6, -1).trim();
      const sepVal = evaluateExpr(sepStrExpr);
      const iterVal = evaluateExpr(rawJoinArg);
      if (typeof sepVal === 'string') {
        const items = Array.isArray(iterVal)
          ? iterVal
          : iterVal instanceof Set
            ? Array.from(iterVal)
            : typeof iterVal === 'string'
              ? iterVal.split('')
              : [];
        return items.map(item => String(item ?? '')).join(sepVal);
      }
    }

    // Handle Python f-strings: f"..." or f'...'
    if ((trimmed.startsWith('f"') && trimmed.endsWith('"')) || (trimmed.startsWith("f'") && trimmed.endsWith("'"))) {
      const raw = trimmed.slice(2, -1);
      return raw.replace(/\{([^{}]+)\}/g, (_, inner) => String(evaluateExpr(inner) ?? ''));
    }

    // Handle input(...)
    const inputMatch = /^input\s*\((.*)\)$/.exec(trimmed);
    if (inputMatch) {
      const promptArg = inputMatch[1].trim();
      const promptMsg = promptArg ? evaluateExpr(promptArg) : '';
      return pythonInput(promptMsg);
    }

    // Handle type(...)
    const typeMatch = /^type\s*\((.*)\)$/.exec(trimmed);
    if (typeMatch) {
      const val = evaluateExpr(typeMatch[1]);
      return getPyTypeValue(val);
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
            if (current.name === cls.name) return true;
            current = current.baseClasses.length > 0 ? current.baseClasses[0] : undefined;
          }
          return false;
        }
        return getPyTypeValue(obj).name === cls.name;
      }
      return false;
    }

    // Handle super()
    if (/^super\s*\(\s*\)$/.test(trimmed)) {
      const selfObj = scope['self'];
      if (selfObj instanceof PyInstance) {
        return new PySuper(selfObj);
      }
      return null;
    }

    // Handle complex(...)
    const complexBuiltinMatch = /^complex\s*\((.*)\)$/.exec(trimmed);
    if (complexBuiltinMatch) {
      const rawArg = complexBuiltinMatch[1].trim();
      if (!rawArg) return new PyComplex(0, 0);
      const parts = splitOutsideQuotesAndParens(rawArg, ',');
      if (parts.length === 1) {
        const val = evaluateExpr(parts[0]);
        return toPyComplex(val);
      }
      const real = Number(evaluateExpr(parts[0]) || 0);
      const imag = Number(evaluateExpr(parts[1]) || 0);
      return new PyComplex(real, imag);
    }

    // Handle set(...)
    const setMatch = /^set\s*\((.*)\)$/.exec(trimmed);
    if (setMatch) {
      const val = evaluateExpr(setMatch[1]);
      if (Array.isArray(val)) return new Set(val);
      if (typeof val === 'string') return new Set(val.split(''));
      if (val instanceof Set) return new Set(val);
      return new Set();
    }

    // Handle divmod(...)
    const divmodMatch = /^divmod\s*\((.*)\)$/.exec(trimmed);
    if (divmodMatch) {
      const parts = splitOutsideQuotesAndParens(divmodMatch[1], ',').map(p => Number(evaluateExpr(p)));
      const a = parts[0] || 0;
      const b = parts[1] || 1;
      if (b === 0) throw new Error('ZeroDivisionError: integer division or modulo by zero');
      return [Math.floor(a / b), a % b];
    }

    // Handle round(...)
    const roundMatch = /^round\s*\((.*)\)$/.exec(trimmed);
    if (roundMatch) {
      const parts = splitOutsideQuotesAndParens(roundMatch[1], ',');
      const num = Number(evaluateExpr(parts[0]) || 0);
      const decimals = parts.length > 1 ? Number(evaluateExpr(parts[1])) : 0;
      const factor = Math.pow(10, decimals);
      return Math.round(num * factor) / factor;
    }

    // Handle float(...)
    const floatMatch = /^float\s*\((?:[^()]|\([^()]*\))*\)$/.exec(trimmed);
    if (floatMatch) {
      const val = evaluateExpr(trimmed.slice(trimmed.indexOf('(') + 1, -1));
      const num = Number(val);
      if (isNaN(num)) throw new Error(`ValueError: could not convert string to float: '${val}'`);
      return num;
    }

    // Handle int(...)
    const intMatch = /^int\s*\((.*)\)$/.exec(trimmed);
    if (intMatch) {
      const val = evaluateExpr(intMatch[1]);
      if (typeof val === 'boolean') return val ? 1 : 0;
      const num = Number(val);
      if (isNaN(num)) throw new Error(`ValueError: invalid literal for int() with base 10: '${val}'`);
      return Math.floor(num);
    }

    // Handle str(...)
    // Match only a complete str(...) call. The greedy form also matched
    // expressions such as `str(a) + str(b)` as one call and swallowed the
    // concatenation operators.
    const strMatch = isCompleteCall('str') ? /^str\s*\((.*)\)$/.exec(trimmed) : null;
    if (strMatch) {
      const val = evaluateExpr(strMatch[1]);
      return String(val);
    }

    // Handle bool(...)
    const boolMatch = /^bool\s*\((.*)\)$/.exec(trimmed);
    if (boolMatch) {
      const val = evaluateExpr(boolMatch[1]);
      if (val === 'False' || val === 'false' || val === '0' || val === 0 || val === false || val === null || val === undefined) return false;
      return Boolean(val);
    }

    // Handle len(...)
    const lenMatch = isCompleteCall('len') ? /^len\s*\((.*)\)$/.exec(trimmed) : null;
    if (lenMatch) {
      const val = evaluateExpr(lenMatch[1]);
      if (Array.isArray(val) || typeof val === 'string') return val.length;
      if (val instanceof Set) return val.size;
      if (typeof val === 'object' && val !== null) return Object.keys(val).length;
      return 0;
    }

    // Handle abs(...)
    const absMatch = /^abs\s*\((.*)\)$/.exec(trimmed);
    if (absMatch) {
      const val = evaluateExpr(absMatch[1]);
      return Math.abs(Number(val || 0));
    }

    // Handle bin(...)
    const binMatch = /^bin\s*\((.*)\)$/.exec(trimmed);
    if (binMatch) {
      const num = Math.floor(Number(evaluateExpr(binMatch[1]) || 0));
      return num < 0 ? '-0b' + Math.abs(num).toString(2) : '0b' + num.toString(2);
    }

    // Handle oct(...)
    const octMatch = /^oct\s*\((.*)\)$/.exec(trimmed);
    if (octMatch) {
      const num = Math.floor(Number(evaluateExpr(octMatch[1]) || 0));
      return num < 0 ? '-0o' + Math.abs(num).toString(8) : '0o' + num.toString(8);
    }

    // Handle hex(...)
    const hexMatch = /^hex\s*\((.*)\)$/.exec(trimmed);
    if (hexMatch) {
      const num = Math.floor(Number(evaluateExpr(hexMatch[1]) || 0));
      return num < 0 ? '-0x' + Math.abs(num).toString(16) : '0x' + num.toString(16);
    }

    // Handle ord(...)
    const ordMatch = /^ord\s*\((.*)\)$/.exec(trimmed);
    if (ordMatch) {
      const val = evaluateExpr(ordMatch[1]);
      const str = String(val || '');
      return str.length > 0 ? str.charCodeAt(0) : 0;
    }

    // Handle chr(...)
    const chrMatch = /^chr\s*\((.*)\)$/.exec(trimmed);
    if (chrMatch) {
      const val = evaluateExpr(chrMatch[1]);
      const num = Math.floor(Number(val || 0));
      return String.fromCharCode(num);
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
        while (!res.done) {
          items.push(res.value);
          res = val.next();
        }
      } else if (val && typeof val === 'object' && typeof (val as Record<string | symbol, unknown>)[Symbol.iterator] === 'function') {
        items = Array.from(val as Iterable<unknown>);
      }
      return items.reduce((acc: number, item: unknown) => acc + Number(item || 0), startVal);
    }

    // Handle list(...)
    const listMatch = isCompleteCall('list') ? /^list\s*\((.*)\)$/.exec(trimmed) : null;
    if (listMatch) {
      const val = evaluateExpr(listMatch[1]);
      if (Array.isArray(val)) return [...val];
      if (typeof val === 'string') return val.split('');
      if (val instanceof Set) return Array.from(val);
      if (val instanceof PyGenerator) {
        const items: unknown[] = [];
        let res = val.next();
        while (!res.done) {
          items.push(res.value);
          res = val.next();
        }
        return items;
      }
      if (val && typeof val === 'object' && typeof (val as Record<string | symbol, unknown>)[Symbol.iterator] === 'function') {
        return Array.from(val as Iterable<unknown>);
      }
      return [];
    }

    // Handle min(...)
    const minMatch = /^min\s*\((.*)\)$/.exec(trimmed);
    if (minMatch) {
      const parts = splitOutsideQuotesAndParens(minMatch[1], ',').map(p => evaluateExpr(p));
      const items = parts.length === 1 && Array.isArray(parts[0]) ? parts[0] : parts;
      const nums = items.map(i => Number(i));
      return Math.min(...nums);
    }

    // Handle max(...)
    const maxMatch = /^max\s*\((.*)\)$/.exec(trimmed);
    if (maxMatch) {
      const parts = splitOutsideQuotesAndParens(maxMatch[1], ',').map(p => evaluateExpr(p));
      const items = parts.length === 1 && Array.isArray(parts[0]) ? parts[0] : parts;
      const nums = items.map(i => Number(i));
      return Math.max(...nums);
    }

    // Handle next(...)
    const nextMatch = /^next\s*\((.*)\)$/.exec(trimmed);
    if (nextMatch) {
      const parts = splitOutsideQuotesAndParens(nextMatch[1], ',');
      const iterObj = evaluateExpr(parts[0]);
      if (iterObj instanceof PyGenerator) {
        const res = iterObj.next();
        if (!res.done) return res.value;
      } else if (iterObj && typeof iterObj === 'object' && typeof (iterObj as Record<string | symbol, unknown>)[Symbol.iterator] === 'function') {
        const it = (iterObj as Iterable<unknown>)[Symbol.iterator]();
        const res = it.next();
        if (!res.done) return res.value;
      }
      if (parts.length > 1) return evaluateExpr(parts[1]);
      throw new Error('StopIteration');
    }

    // Handle sorted(...)
    const sortedMatch = isCompleteCall('sorted') ? /^sorted\s*\((.*)\)$/.exec(trimmed) : null;
    if (sortedMatch) {
      const { positional, kwargs } = parseFormatArgs(sortedMatch[1], evaluateExpr);
      const val = positional[0];
      let arr: unknown[];
      if (Array.isArray(val)) {
        arr = [...val];
      } else if (typeof val === 'string') {
        arr = val.split('');
      } else if (val instanceof Set) {
        arr = Array.from(val);
      } else {
        return val;
      }
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
      return arr;
    }

    // Handle reversed(...)
    const reversedMatch = isCompleteCall('reversed') ? /^reversed\s*\((.*)\)$/.exec(trimmed) : null;
    if (reversedMatch) {
      const val = evaluateExpr(reversedMatch[1]);
      let arr: unknown[];
      if (Array.isArray(val)) {
        arr = [...val];
      } else if (typeof val === 'string') {
        arr = val.split('');
      } else if (val instanceof Set) {
        arr = Array.from(val);
      } else {
        return val;
      }
      return [...arr].reverse();
    }



    // Handle dict(...)
    const dictMatch = isCompleteCall('dict') ? /^dict\s*\((.*)\)$/.exec(trimmed) : null;
    if (dictMatch) {
      const innerArg = dictMatch[1].trim();
      if (!innerArg) return {};
      const evaluated = evaluateExpr(innerArg);
      if (Array.isArray(evaluated)) {
        const d: Record<string, unknown> = {};
        for (const pair of evaluated) {
          if (Array.isArray(pair) && pair.length >= 2) {
            d[String(pair[0])] = pair[1];
          }
        }
        return d;
      }
      if (typeof evaluated === 'object' && evaluated !== null) {
        return { ...evaluated };
      }
      return {};
    }

    // Dict literal: {key1: val1, key2: val2, ...}
    if (trimmed.startsWith('{') && trimmed.endsWith('}') && trimmed.includes(':')) {
      const inner = trimmed.slice(1, -1).trim();
      if (!inner) return {};
      const pairs = splitOutsideQuotesAndParens(inner, ',');
      const resDict: Record<string, unknown> = {};
      for (const pair of pairs) {
        const colonIdx = findOperatorIndex(pair, ':');
        if (colonIdx !== -1) {
          const kExpr = pair.slice(0, colonIdx).trim();
          const vExpr = pair.slice(colonIdx + 1).trim();
          const kVal = evaluateExpr(kExpr);
          const vVal = evaluateExpr(vExpr);
          resDict[String(kVal)] = vVal;
        }
      }
      return resDict;
    }

    // Set or Dict literal: {1, 2, 3} or {}
    if (trimmed.startsWith('{') && trimmed.endsWith('}') && !trimmed.includes(':')) {
      const inner = trimmed.slice(1, -1).trim();
      if (!inner) return {};
      return new Set(splitOutsideQuotesAndParens(inner, ',').map(item => evaluateExpr(item)));
    }

    // Handle map(func, iterable)
    const mapMatch = /^map\s*\((.*)\)$/.exec(trimmed);
    if (mapMatch) {
      const parts = splitOutsideQuotesAndParens(mapMatch[1], ',');
      if (parts.length >= 2) {
        const fnVal = evaluateExpr(parts[0]);
        const iterVal = evaluateExpr(parts[1]);
        const items = Array.isArray(iterVal)
          ? iterVal
          : iterVal instanceof Set
            ? Array.from(iterVal)
            : typeof iterVal === 'string'
              ? iterVal.split('')
              : [];
        if (typeof fnVal === 'function') {
          return items.map(item => fnVal(item));
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
        const items = Array.isArray(iterVal)
          ? iterVal
          : iterVal instanceof Set
            ? Array.from(iterVal)
            : typeof iterVal === 'string'
              ? iterVal.split('')
              : [];
        if (typeof fnVal === 'function') {
          return items.filter(item => Boolean(fnVal(item)));
        }
      }
    }

    // Handle enumerate(iterable, start=0)
    const enumerateMatch = /^enumerate\s*\((.*)\)$/.exec(trimmed);
    if (enumerateMatch) {
      const rawArgs = enumerateMatch[1];
      const parts = splitOutsideQuotesAndParens(rawArgs, ',');
      if (parts.length > 0) {
        const iterVal = evaluateExpr(parts[0]);
        let startVal = 0;
        if (parts.length > 1) {
          const secondArg = parts[1].trim();
          if (secondArg.startsWith('start=')) {
            startVal = Number(evaluateExpr(secondArg.slice(6)) || 0);
          } else {
            startVal = Number(evaluateExpr(secondArg) || 0);
          }
        }
        const items = Array.isArray(iterVal)
          ? iterVal
          : iterVal instanceof Set
            ? Array.from(iterVal)
            : typeof iterVal === 'string'
              ? iterVal.split('')
              : typeof iterVal === 'object' && iterVal !== null && typeof (iterVal as Record<string | symbol, unknown>)[Symbol.iterator] === 'function'
                ? Array.from(iterVal as Iterable<unknown>)
                : [];
        return items.map((item, idx) => {
          const pair: unknown[] = [startVal + idx, item];
          (pair as unknown as { __isTuple__: boolean }).__isTuple__ = true;
          return pair;
        });
      }
      return [];
    }

    // Handle zip(*iterables)
    const zipMatch = /^zip\s*\((.*)\)$/.exec(trimmed);
    if (zipMatch) {
      const rawArgs = zipMatch[1];
      const parts = splitOutsideQuotesAndParens(rawArgs, ',');
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
        return zipped;
      }
      return [];
    }

    // Handle lambda expression: lambda x, y: expr
    const lambdaMatch = /^lambda\s*([^:]*)\s*:\s*(.+)$/.exec(trimmed);
    if (lambdaMatch) {
      const paramNames = lambdaMatch[1].split(',').map(p => p.trim()).filter(Boolean);
      const bodyExpr = lambdaMatch[2].trim();
      return (...fnArgs: unknown[]) => {
        const savedValues: Record<string, unknown> = {};
        paramNames.forEach((p, idx) => {
          savedValues[p] = scope[p];
          scope[p] = fnArgs[idx];
        });
        const res = evaluateExpr(bodyExpr);
        paramNames.forEach(p => {
          if (savedValues[p] !== undefined) scope[p] = savedValues[p];
          else delete scope[p];
        });
        return res;
      };
    }



    // List method pop(...) as expression
    const popExprMatch = /^([a-zA-Z_][a-zA-Z0-9_]*)\s*\.\s*pop\s*\((.*)\)$/.exec(trimmed);
    if (popExprMatch) {
      const listVar = popExprMatch[1];
      const listObj = scope[listVar];
      if (Array.isArray(listObj)) {
        const argStr = popExprMatch[2].trim();
        const idx = argStr ? Number(evaluateExpr(argStr)) : listObj.length - 1;
        const removed = listObj.splice(idx, 1);
        return removed[0];
      }
    }

    const literalResult = evaluatePythonLiteral(trimmed, scope);
    if (literalResult.handled) return literalResult.value;

    // Member call: targetExpr.method(...) (supports string literals, variables, etc.)
    const dotIdx = findOperatorIndex(trimmed, '.');
    if (dotIdx !== -1 && trimmed.endsWith(')')) {
      const targetStr = trimmed.slice(0, dotIdx).trim();
      const rest = trimmed.slice(dotIdx + 1).trim();
      const methodMatch = /^([a-zA-Z_][a-zA-Z0-9_]*)\s*\((.*)\)$/.exec(rest);
      if (methodMatch) {
        const methodName = methodMatch[1];
        const rawArgs = methodMatch[2].trim();
        const obj = targetStr === 'dict' ? {} : evaluateExpr(targetStr);

        if (typeof obj === 'string') {
          if (methodName === 'format') {
            const { positional, kwargs } = parseFormatArgs(rawArgs, evaluateExpr);
            return formatStringTemplate(obj, positional, kwargs);
          }
          const sArgs = rawArgs ? splitOutsideQuotesAndParens(rawArgs, ',').map(a => evaluateExpr(a)) : [];
          switch (methodName) {
            case 'casefold':
            case 'lower':
              return obj.toLowerCase();
            case 'upper':
              return obj.toUpperCase();
            case 'strip':
              return obj.trim();
            case 'lstrip':
              return obj.trimStart();
            case 'rstrip':
              return obj.trimEnd();
            case 'capitalize':
              return obj.charAt(0).toUpperCase() + obj.slice(1).toLowerCase();
            case 'title':
              return obj.replace(/\w\S*/g, (w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
            case 'replace':
              return obj.split(String(sArgs[0])).join(String(sArgs[1]));
            case 'split':
              return sArgs.length ? obj.split(String(sArgs[0])) : obj.split(/\s+/).filter(Boolean);
            case 'find':
              return obj.indexOf(String(sArgs[0]));
            case 'count': {
              const sub = String(sArgs[0]);
              return sub ? obj.split(sub).length - 1 : 0;
            }
            case 'startswith':
              return obj.startsWith(String(sArgs[0]));
            case 'endswith':
              return obj.endsWith(String(sArgs[0]));
            case 'isdigit':
              return /^\d+$/.test(obj);
            case 'isalpha':
              return /^[a-zA-ZçğıöşüÇĞİÖŞÜ]+$/.test(obj);
            case 'isupper':
              return obj === obj.toUpperCase() && /[A-ZÇĞİÖŞÜ]/.test(obj);
            case 'islower':
              return obj === obj.toLowerCase() && /[a-zçğıöşü]/.test(obj);
            case 'join':
              return Array.isArray(sArgs[0])
                ? sArgs[0].map(String).join(obj)
                : sArgs[0] instanceof Set
                  ? Array.from(sArgs[0]).map(String).join(obj)
                  : String(sArgs[0]);
            default:
              break;
          }
        }

        const objectValue = obj as Record<string, unknown> | undefined;
        if (objectValue && typeof obj === 'object' && obj !== null && !Array.isArray(obj) && !(obj instanceof Set)) {
          const argList = rawArgs ? splitOutsideQuotesAndParens(rawArgs, ',').map(a => evaluateExpr(a)) : [];
          switch (methodName) {
            case 'fromkeys': {
              const keysIter = argList[0];
              const defaultVal = argList.length > 1 ? argList[1] : null;
              const newDict: Record<string, unknown> = {};
              let keysArray: unknown[] = [];
              if (typeof keysIter === 'string') {
                keysArray = keysIter.split('');
              } else if (Array.isArray(keysIter)) {
                keysArray = keysIter;
              } else if (keysIter instanceof Set) {
                keysArray = Array.from(keysIter);
              }
              for (const k of keysArray) {
                newDict[String(k)] = defaultVal;
              }
              return newDict;
            }
            case 'get': {
              const key = String(argList[0]);
              const defVal = argList.length > 1 ? argList[1] : null;
              return key in objectValue ? objectValue[key] : defVal;
            }
            case 'keys': {
              return Object.keys(objectValue);
            }
            case 'values': {
              return Object.values(objectValue);
            }
            case 'items': {
              return Object.entries(objectValue);
            }
            case 'pop': {
              const key = String(argList[0]);
              const val = objectValue[key];
              delete objectValue[key];
              return val;
            }
            case 'clear': {
              for (const k of Object.keys(objectValue)) {
                delete objectValue[k];
              }
              return null;
            }
            case 'copy': {
              return { ...objectValue };
            }
            case 'setdefault': {
              const key = String(argList[0]);
              const defVal = argList.length > 1 ? argList[1] : null;
              if (!(key in objectValue)) {
                objectValue[key] = defVal;
              }
              return objectValue[key];
            }
            case 'update': {
              const other = argList[0];
              if (other && typeof other === 'object' && !Array.isArray(other)) {
                Object.assign(objectValue, other);
              }
              return null;
            }
            default:
              break;
          }
        }

        if (obj instanceof PyInstance || obj instanceof PySuper) {
          const fn = obj.getAttribute(methodName);
          if (typeof fn === 'function') {
            const argList = rawArgs ? splitOutsideQuotesAndParens(rawArgs, ',').map(a => evaluateExpr(a)) : [];
            return fn(...argList);
          }
        }

        if (obj instanceof PyClass) {
          const method = obj.findMethod(methodName);
          if (typeof method === 'function') {
            const argList = rawArgs ? splitOutsideQuotesAndParens(rawArgs, ',').map(a => evaluateExpr(a)) : [];
            if (obj.staticMethods.has(methodName)) {
              return method(...argList);
            }
            if (obj.classMethods.has(methodName)) {
              return method(obj, ...argList);
            }
            return method(...argList);
          }
        }

        if (objectValue && typeof objectValue[methodName] === 'function') {
          const fn = objectValue[methodName] as (...args: unknown[]) => unknown;
          const { positional, kwargs } = rawArgs
            ? parseFormatArgs(rawArgs, evaluateExpr)
            : { positional: [], kwargs: {} as Record<string, unknown> };

          const finalArgs = Object.keys(kwargs).length > 0 && positional.length === 1 && typeof positional[0] !== 'object'
            ? [...positional, kwargs]
            : Object.keys(kwargs).length > 0 && positional.length === 0
              ? [null, kwargs]
              : Object.keys(kwargs).length > 0
                ? [...positional, kwargs]
                : positional;

          const isConstructable = (
            fn.prototype && fn.prototype.constructor === fn && Object.getOwnPropertyNames(fn.prototype).length > 1
          );

          if (isConstructable) {
            try {
              const Ctor = fn as unknown as new (...args: unknown[]) => unknown;
              return new Ctor(...finalArgs);
            } catch {
              // Fallback to normal method call
            }
          }

          try {
            return fn.apply(objectValue, finalArgs);
          } catch (callErr: unknown) {
            if (callErr instanceof Error && callErr.message.includes("must be invoked with 'new'")) {
              const Ctor = fn as unknown as new (...args: unknown[]) => unknown;
              return new Ctor(...finalArgs);
            }
            throw callErr;
          }
        }
      }
    }

    // Member property access: obj.prop or obj.sub.prop or (3+4j).real
    let lastDotIdx = -1;
    {
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
    }
    if (lastDotIdx !== -1 && !trimmed.endsWith(')')) {
      const leftExpr = trimmed.slice(0, lastDotIdx).trim();
      const attrName = trimmed.slice(lastDotIdx + 1).trim();
      if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(attrName)) {
        let curr: unknown = evaluateExpr(leftExpr);
        if (curr instanceof PyInstance) {
          return curr.getAttribute(attrName);
        }
        if (curr instanceof PySuper) {
          return curr.getAttribute(attrName);
        }
        if (curr instanceof PyClass) {
          return curr.getAttribute(attrName);
        }
        if (curr instanceof PyComplex) {
          if (attrName === 'real') return Number.isInteger(curr.real) ? `${curr.real}.0` : curr.real;
          if (attrName === 'imag') return Number.isInteger(curr.imag) ? `${curr.imag}.0` : curr.imag;
        }
        if (curr && (typeof curr === 'object' || typeof curr === 'function')) {
          if (attrName in (curr as Record<string, unknown>)) {
            return (curr as Record<string, unknown>)[attrName];
          }
        }
      }
    }

    // Parenthesized expression or Tuple: (a, b, c) or (expr)
    if (isEnclosedInParens(trimmed)) {
      const inner = trimmed.slice(1, -1).trim();
      if (!inner) return [];
      const parts: string[] = [];
      let current = '';
      let inQ = false;
      let qChar = '';
      let pDepth = 0;
      for (let i = 0; i < inner.length; i++) {
        const char = inner[i];
        if ((char === '"' || char === "'") && (i === 0 || inner[i - 1] !== '\\')) {
          if (!inQ) { inQ = true; qChar = char; }
          else if (qChar === char) { inQ = false; }
        } else if (!inQ) {
          if (char === '(' || char === '[' || char === '{') pDepth++;
          else if (char === ')' || char === ']' || char === '}') pDepth--;
        }
        if (char === ',' && !inQ && pDepth === 0) {
          parts.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      if (current.trim()) parts.push(current.trim());
      if (parts.length > 1) {
        const tupleArr = parts.map(p => evaluateExpr(p));
        (tupleArr as unknown as { __isTuple__: boolean }).__isTuple__ = true;
        return tupleArr;
      } else if (parts.length === 1) {
        if (inner.endsWith(',')) {
          const tupleArr = [evaluateExpr(parts[0])];
          (tupleArr as unknown as { __isTuple__: boolean }).__isTuple__ = true;
          return tupleArr;
        }
        return evaluateExpr(parts[0]);
      }
    }

    // Handle Python ternary expression: <true_expr> if <cond> else <false_expr>
    const ternaryIfIdx = findOperatorIndex(trimmed, ' if ');
    const ternaryElseIdx = findOperatorIndex(trimmed, ' else ');
    if (ternaryIfIdx !== -1 && ternaryElseIdx > ternaryIfIdx) {
      const trueExpr = trimmed.slice(0, ternaryIfIdx).trim();
      const condExpr = trimmed.slice(ternaryIfIdx + 4, ternaryElseIdx).trim();
      const falseExpr = trimmed.slice(ternaryElseIdx + 6).trim();
      const condVal = evaluateExpr(condExpr);
      return condVal ? evaluateExpr(trueExpr) : evaluateExpr(falseExpr);
    }

    const logicalOrComparison = evaluatePythonLogicalOrComparison(trimmed, evaluateExpr);
    if (logicalOrComparison.handled) return logicalOrComparison.value;

    // Handle range(n) or range(start, stop) or range(start, stop, step)
    const rangeMatch = /^range\((.+)\)$/.exec(trimmed);
    if (rangeMatch) {
      const args = rangeMatch[1].split(',').map(a => Number(evaluateExpr(a)));
      return pythonRange(...args);
    }

    // Handle Set and Dict Operators: |, &, ^
    const bitOrParts = splitOutsideQuotesAndParens(trimmed, '|');
    if (bitOrParts.length > 1) {
      const parts = bitOrParts.map(p => evaluateExpr(p));
      if (parts.some(p => p instanceof Set)) {
        const res = new Set<unknown>();
        for (const p of parts) {
          if (p instanceof Set) {
            for (const item of p) res.add(item);
          } else if (Array.isArray(p)) {
            for (const item of p) res.add(item);
          } else {
            res.add(p);
          }
        }
        return res;
      }
      if (parts.some(p => typeof p === 'object' && p !== null && !(p instanceof Set) && !Array.isArray(p))) {
        const merged: Record<string, unknown> = {};
        for (const p of parts) {
          if (typeof p === 'object' && p !== null && !Array.isArray(p) && !(p instanceof Set)) {
            Object.assign(merged, p);
          }
        }
        return merged;
      }
      return parts.reduce((acc: number, val: unknown) => acc | Number(val || 0), 0);
    }

    const bitAndParts = splitOutsideQuotesAndParens(trimmed, '&');
    if (bitAndParts.length > 1) {
      const parts = bitAndParts.map(p => evaluateExpr(p));
      if (parts.some(p => p instanceof Set)) {
        let res = parts[0] instanceof Set ? new Set(parts[0] as Set<unknown>) : new Set(Array.isArray(parts[0]) ? (parts[0] as unknown[]) : [parts[0]]);
        for (let i = 1; i < parts.length; i++) {
          const nextSet = parts[i] instanceof Set ? (parts[i] as Set<unknown>) : new Set(Array.isArray(parts[i]) ? (parts[i] as unknown[]) : [parts[i]]);
          res = new Set(Array.from(res).filter(x => nextSet.has(x)));
        }
        return res;
      }
      return parts.slice(1).reduce((acc: number, val: unknown) => acc & Number(val || 0), Number(parts[0] || 0));
    }

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
        return res;
      }
      return parts.slice(1).reduce((acc: number, val: unknown) => acc ^ Number(val || 0), Number(parts[0] || 0));
    }

    const floorDivIdx = findOperatorIndex(trimmed, '//');
    if (floorDivIdx !== -1) {
      const leftExpr = trimmed.slice(0, floorDivIdx).trim();
      const rightExpr = trimmed.slice(floorDivIdx + 2).trim();
      const leftVal = Number(evaluateExpr(leftExpr));
      const rightVal = Number(evaluateExpr(rightExpr));
      if (rightVal === 0) throw new Error('ZeroDivisionError: integer division by zero');
      return Math.floor(leftVal / rightVal);
    }

    const percentIdx = findOperatorIndex(trimmed, '%');
    if (percentIdx !== -1) {
      const leftExpr = trimmed.slice(0, percentIdx).trim();
      const rightExpr = trimmed.slice(percentIdx + 1).trim();
      const leftVal = evaluateExpr(leftExpr);
      const rightVal = evaluateExpr(rightExpr);
      if (typeof leftVal === 'string') {
        const argsArray = Array.isArray(rightVal) ? rightVal : [rightVal];
        return formatPrintfString(leftVal, argsArray);
      } else {
        const rightNum = Number(rightVal);
        if (rightNum === 0) throw new Error('ZeroDivisionError: integer modulo by zero');
        return Number(leftVal) % rightNum;
      }
    }

    // 1. Addition and Subtraction (+, -)
    const addParts = splitOutsideQuotesAndParens(trimmed, '+');
    if (addParts.length > 1) {
      const parts = addParts.map(p => evaluateExpr(p));
      if (parts.some(p => typeof p === 'string')) {
        return parts.map(p => String(p ?? '')).join('');
      }
      if (parts.some(p => p instanceof PyComplex)) {
        return parts.reduce((acc: unknown, val: unknown) => toPyComplex(acc).add(val), new PyComplex(0, 0));
      }
      return parts.reduce((acc: number, val: unknown) => acc + Number(val || 0), 0);
    }

    const subParts = splitOutsideQuotesAndParens(trimmed, '-');
    if (subParts.length > 1) {
      if (subParts[0] === '') {
        const realParts = subParts.slice(1).map(p => evaluateExpr(p));
        if (realParts.length > 0) {
          const first = realParts[0];
          const negatedFirst = first instanceof PyComplex
            ? new PyComplex(-first.real, -first.imag)
            : typeof first === 'number'
              ? -first
              : toPyComplex(first).mul(-1);

          if (realParts.length === 1) {
            return negatedFirst;
          }
          if (realParts.some(p => p instanceof PyComplex) || negatedFirst instanceof PyComplex) {
            return realParts.slice(1).reduce((acc: unknown, val: unknown) => toPyComplex(acc).sub(val), negatedFirst);
          }
          return realParts.slice(1).reduce((acc: number, val: unknown) => acc - Number(val || 0), Number(negatedFirst));
        }
      } else {
        const parts = subParts.map(p => evaluateExpr(p));
        if (parts.some(p => p instanceof Set)) {
          let res = parts[0] instanceof Set ? new Set(parts[0] as Set<unknown>) : new Set(Array.isArray(parts[0]) ? (parts[0] as unknown[]) : [parts[0]]);
          for (let i = 1; i < parts.length; i++) {
            const nextSet = parts[i] instanceof Set ? (parts[i] as Set<unknown>) : new Set(Array.isArray(parts[i]) ? (parts[i] as unknown[]) : [parts[i]]);
            res = new Set(Array.from(res).filter(x => !nextSet.has(x)));
          }
          return res;
        }
        if (parts.some(p => p instanceof PyComplex)) {
          return parts.reduce((acc: unknown, val: unknown, idx: number) => (idx === 0 ? toPyComplex(val) : toPyComplex(acc).sub(val)), new PyComplex(0, 0));
        }
        return parts.reduce((acc: number, val: unknown, idx: number) => (idx === 0 ? Number(val) : acc - Number(val)), 0);
      }
    }

    // 2. Multiplication, Division, Modulo (*, /, //, %)
    const mulParts = splitOnMultiplyOperator(trimmed);
    if (mulParts.length > 1) {
      const parts = mulParts.map(p => evaluateExpr(p));
      if (parts.some(p => p instanceof PyComplex)) {
        return parts.reduce((acc: unknown, val: unknown) => toPyComplex(acc).mul(val), new PyComplex(1, 0));
      }
      // String repetition ("abc" * 3 or 3 * "abc") or List repetition ([0] * 5 or 5 * [0])
      if (parts.length === 2) {
        const [a, b] = parts;
        if (typeof a === 'string' && typeof b === 'number') {
          return a.repeat(Math.max(0, Math.floor(b)));
        }
        if (typeof b === 'string' && typeof a === 'number') {
          return b.repeat(Math.max(0, Math.floor(a)));
        }
        if (Array.isArray(a) && typeof b === 'number') {
          const count = Math.max(0, Math.floor(b));
          const res: unknown[] = [];
          for (let i = 0; i < count; i++) res.push(...a);
          if ((a as unknown as { __isTuple__?: boolean }).__isTuple__) (res as unknown as { __isTuple__: boolean }).__isTuple__ = true;
          return res;
        }
        if (Array.isArray(b) && typeof a === 'number') {
          const count = Math.max(0, Math.floor(a));
          const res: unknown[] = [];
          for (let i = 0; i < count; i++) res.push(...b);
          if ((b as unknown as { __isTuple__?: boolean }).__isTuple__) (res as unknown as { __isTuple__: boolean }).__isTuple__ = true;
          return res;
        }
      }
      return parts.reduce((acc: number, val: unknown) => acc * Number(val ?? 0), 1);
    }

    const divParts = splitOutsideQuotesAndParens(trimmed, '/');
    if (divParts.length > 1) {
      const parts = divParts.map(p => evaluateExpr(p));
      if (parts.some(p => p instanceof PyComplex)) {
        return parts.reduce((acc: unknown, val: unknown, idx: number) => (idx === 0 ? toPyComplex(val) : toPyComplex(acc).div(val)), new PyComplex(1, 0));
      }
      return parts.reduce((acc: number, val: unknown, idx: number) => {
        if (idx === 0) return Number(val);
        const divisor = Number(val);
        if (divisor === 0) throw new Error('ZeroDivisionError: division by zero');
        return acc / divisor;
      }, 0);
    }

    // 3. Exponentiation (**)
    const powIdx = findOperatorIndex(trimmed, '**');
    if (powIdx !== -1) {
      const leftExpr = trimmed.slice(0, powIdx).trim();
      const rightExpr = trimmed.slice(powIdx + 2).trim();
      const leftVal = Number(evaluateExpr(leftExpr));
      const rightVal = Number(evaluateExpr(rightExpr));
      const res = Math.pow(leftVal, rightVal);
      if (!Number.isInteger(rightVal) && Number.isInteger(res)) {
        return `${res}.0`;
      }
      return res;
    }

    // Element indexing / Chained indexing: targetExpr[idxExpr] (e.g. deck[i][0], matrix[r][c], arr[0], str[1:])
    if (trimmed.endsWith(']') && !trimmed.startsWith('[')) {
      let bracketDepth = 0;
      let openIdx = -1;
      let inQuote: string | null = null;
      for (let i = trimmed.length - 1; i >= 0; i--) {
        const char = trimmed[i];
        if (inQuote) {
          if (char === inQuote && (i === 0 || trimmed[i - 1] !== '\\')) {
            inQuote = null;
          }
          continue;
        }
        if (char === '"' || char === "'") {
          inQuote = char;
          continue;
        }
        if (char === ']') {
          bracketDepth++;
        } else if (char === '[') {
          bracketDepth--;
          if (bracketDepth === 0) {
            openIdx = i;
            break;
          }
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
              if (step === 1) {
                return targetVal.slice(start, stop);
              }
              let res = '';
              if (step > 0) {
                for (let i = start; i < stop; i += step) res += targetVal[i];
              } else if (step < 0) {
                for (let i = start; i > stop; i += step) res += targetVal[i];
              }
              return res;
            }

            if (Array.isArray(targetVal)) {
              if (step === 1) {
                return targetVal.slice(start, stop);
              }
              const res: unknown[] = [];
              if (step > 0) {
                for (let i = start; i < stop; i += step) res.push(targetVal[i]);
              } else if (step < 0) {
                for (let i = start; i > stop; i += step) res.push(targetVal[i]);
              }
              return res;
            }
          }
          const idxVal = evaluateExpr(idxExpr);
          const idx = Number(idxVal);
          const realIdx = idx < 0 ? targetVal.length + idx : idx;
          return targetVal[realIdx];
        }
        if (typeof targetVal === 'object' && targetVal !== null) {
          const idxVal = evaluateExpr(idxExpr);
          return (targetVal as Record<string, unknown>)[String(idxVal)];
        }
      }
    }

    const functionCall = evaluatePythonFunctionCall(trimmed, scope, evaluateExpr);
    if (functionCall.handled) return functionCall.value;

    // Single Identifier variable lookup
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmed)) {
      if (trimmed in scope) return scope[trimmed];
      if (trimmed === 'True' || trimmed === 'true') return true;
      if (trimmed === 'False' || trimmed === 'false') return false;
      if (trimmed === 'None' || trimmed === 'none' || trimmed === 'null') return null;
      throw new Error(`NameError: name '${trimmed}' is not defined`);
    }

    return evaluateSafeJavaScriptFallback(trimmed, scope).value;
  };

  return evaluateExpr;
}
