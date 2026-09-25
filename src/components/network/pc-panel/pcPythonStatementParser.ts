import { PYTHON_MODULES } from './pcPythonModules';
import {
  splitOutsideQuotesAndParens,
  parseFormatArgs,
  formatPythonValue,
  assignValueToLhs,
} from './pcPythonRunnerHelpers';

export function handleImportStatement(line: string, scope: Record<string, unknown>): boolean {
  const importMatch = /^import\s+(.+)$/.exec(line);
  if (!importMatch) return false;

  const rawMods = splitOutsideQuotesAndParens(importMatch[1], ',');
  for (const item of rawMods) {
    const parts = item.split(/\s+as\s+/i);
    const modName = parts[0].trim();
    const alias = parts[1] ? parts[1].trim() : modName;
    if (scope[modName]) {
      if (alias !== modName) scope[alias] = scope[modName];
    } else if (PYTHON_MODULES[modName]) {
      scope[alias] = PYTHON_MODULES[modName];
    } else if (modName.includes('.')) {
      const subParts = modName.split('.');
      let curr: unknown = scope[subParts[0]] || PYTHON_MODULES[subParts[0]];
      for (let i = 1; i < subParts.length && curr; i++) {
        if (curr && typeof curr === 'object') {
          curr = (curr as Record<string, unknown>)[subParts[i]];
        }
      }
      scope[alias] = curr || {};
    } else {
      scope[alias] = {};
    }
  }
  return true;
}

export function handleFromImportStatement(line: string, scope: Record<string, unknown>): boolean {
  const fromImportMatch = /^from\s+([a-zA-Z0-9_.]+)\s+import\s+(.+)$/.exec(line);
  if (!fromImportMatch) return false;

  const modName = fromImportMatch[1].trim();
  const rawItems = splitOutsideQuotesAndParens(fromImportMatch[2], ',');

  let modObj: Record<string, unknown> | undefined;
  if (scope[modName]) {
    modObj = scope[modName] as Record<string, unknown>;
  } else if (PYTHON_MODULES[modName]) {
    modObj = PYTHON_MODULES[modName];
  } else if (modName.includes('.')) {
    const subParts = modName.split('.');
    let curr: unknown = scope[subParts[0]] || PYTHON_MODULES[subParts[0]];
    for (let i = 1; i < subParts.length && curr; i++) {
      if (curr && typeof curr === 'object') {
        curr = (curr as Record<string, unknown>)[subParts[i]];
      }
    }
    if (curr && typeof curr === 'object') {
      modObj = curr as Record<string, unknown>;
    }
  }

  for (const item of rawItems) {
    const parts = item.split(/\s+as\s+/i);
    const itemName = parts[0].trim();
    const alias = parts[1] ? parts[1].trim() : itemName;
    if (itemName === '*' && modObj) {
      Object.assign(scope, modObj);
    } else if (modObj && modObj[itemName] !== undefined) {
      scope[alias] = modObj[itemName];
    }
  }
  return true;
}

export function executeSinglePythonLine(
  line: string,
  scope: Record<string, unknown>,
  evaluateExpr: (expr: string) => unknown,
  outputs: string[],
  onOutput?: (line: string, isAppend?: boolean) => void
): void {
  let trimmed = line.trim();
  if (trimmed.endsWith(';')) {
    trimmed = trimmed.replace(/;+$/, '').trim();
  }
  if (!trimmed || trimmed.startsWith('#') || trimmed === 'pass') return;

  if (/^time\.sleep\s*\((.*)\)$/.test(trimmed)) return;

  if (handleImportStatement(trimmed, scope)) return;
  if (handleFromImportStatement(trimmed, scope)) return;

  const printMatch = /^print\s*\((.*)\)$/.exec(trimmed);
  if (printMatch) {
    const rawArgs = printMatch[1];
    if (!rawArgs.trim()) {
      outputs.push('');
      onOutput?.('', false);
      return;
    }

    const { positional, kwargs } = parseFormatArgs(rawArgs, evaluateExpr);
    if (
      positional.length === 1 &&
      positional[0] === undefined &&
      /^[a-zA-Z_][a-zA-Z0-9_]*\s*\(.*\)$/.test(rawArgs.trim())
    ) {
      return;
    }
    const endArg = kwargs['end'] !== undefined ? String(kwargs['end']) : '\n';
    const sepArg = kwargs['sep'] !== undefined ? String(kwargs['sep']) : ' ';

    const formattedArgs = positional.map(a => formatPythonValue(a));
    const lineStr = formattedArgs.join(sepArg);

    if (endArg === '\r') {
      if (outputs.length > 0) {
        outputs[outputs.length - 1] = lineStr;
      } else {
        outputs.push(lineStr);
      }
      onOutput?.(outputs[outputs.length - 1], true);
    } else if (endArg === '' || endArg === ' ') {
      if (outputs.length > 0) {
        outputs[outputs.length - 1] += endArg + lineStr;
      } else {
        outputs.push(lineStr);
      }
      onOutput?.(outputs[outputs.length - 1], true);
    } else {
      outputs.push(lineStr);
      onOutput?.(lineStr, false);
    }
    return;
  }

  const appendMatch = /^([a-zA-Z_][a-zA-Z0-9_]*)\s*\.\s*append\s*\((.*)\)$/.exec(trimmed);
  if (appendMatch) {
    const listVar = appendMatch[1];
    const val = evaluateExpr(appendMatch[2]);
    if (Array.isArray(scope[listVar])) {
      (scope[listVar] as unknown[]).push(val);
    } else {
      scope[listVar] = [val];
    }
    return;
  }

  // List-mutator helpers below only claim the statement when the receiver is a
  // real list. Otherwise (Entry/Text/Listbox .insert(), dict .clear()/.pop(),
  // ...) we fall through to the generic member-call evaluation so the actual
  // method on the object is invoked instead of silently doing nothing.
  const removeMatch = /^([a-zA-Z_][a-zA-Z0-9_]*)\s*\.\s*remove\s*\((.*)\)$/.exec(trimmed);
  if (removeMatch) {
    const listVar = removeMatch[1];
    const arr = scope[listVar];
    if (Array.isArray(arr)) {
      const val = evaluateExpr(removeMatch[2]);
      const idx = arr.indexOf(val);
      if (idx !== -1) arr.splice(idx, 1);
      return;
    }
  }

  const popMatch = /^([a-zA-Z_][a-zA-Z0-9_]*)\s*\.\s*pop\s*\((.*)\)$/.exec(trimmed);
  if (popMatch) {
    const listVar = popMatch[1];
    const arr = scope[listVar];
    if (Array.isArray(arr)) {
      const argStr = popMatch[2].trim();
      const idx = argStr ? Number(evaluateExpr(argStr)) : arr.length - 1;
      arr.splice(idx, 1);
      return;
    }
  }

  const extendMatch = /^([a-zA-Z_][a-zA-Z0-9_]*)\s*\.\s*extend\s*\((.*)\)$/.exec(trimmed);
  if (extendMatch) {
    const listVar = extendMatch[1];
    const arr = scope[listVar];
    if (Array.isArray(arr)) {
      const val = evaluateExpr(extendMatch[2]);
      const items = Array.isArray(val)
        ? val
        : val instanceof Set
          ? Array.from(val)
          : typeof val === 'string'
            ? val.split('')
            : [];
      arr.push(...items);
      return;
    }
  }

  const insertMatch = /^([a-zA-Z_][a-zA-Z0-9_]*)\s*\.\s*insert\s*\((.*)\)$/.exec(trimmed);
  if (insertMatch) {
    const listVar = insertMatch[1];
    const arr = scope[listVar];
    if (Array.isArray(arr)) {
      const parts = splitOutsideQuotesAndParens(insertMatch[2], ',');
      if (parts.length >= 2) {
        const idx = Number(evaluateExpr(parts[0]));
        const val = evaluateExpr(parts[1]);
        arr.splice(idx, 0, val);
      }
      return;
    }
  }

  const clearMatch = /^([a-zA-Z_][a-zA-Z0-9_]*)\s*\.\s*clear\s*\(\s*\)$/.exec(trimmed);
  if (clearMatch) {
    const listVar = clearMatch[1];
    const arr = scope[listVar];
    if (Array.isArray(arr)) {
      arr.length = 0;
      return;
    }
  }

  const sortMatch = /^([a-zA-Z_][a-zA-Z0-9_]*)\s*\.\s*sort\s*\((.*)\)$/.exec(trimmed);
  if (sortMatch) {
    const listVar = sortMatch[1];
    const arr = scope[listVar];
    if (Array.isArray(arr)) {
      const rawArg = sortMatch[2].trim();
      const reverse = rawArg.includes('reverse=True');
      arr.sort((a, b) => {
        if (typeof a === 'number' && typeof b === 'number') {
          return reverse ? b - a : a - b;
        }
        const sA = String(a);
        const sB = String(b);
        return reverse ? sB.localeCompare(sA) : sA.localeCompare(sB);
      });
      return;
    }
  }

  const reverseMatch = /^([a-zA-Z_][a-zA-Z0-9_]*)\s*\.\s*reverse\s*\((.*)\)$/.exec(trimmed);
  if (reverseMatch) {
    const listVar = reverseMatch[1];
    const arr = scope[listVar];
    if (Array.isArray(arr)) {
      arr.reverse();
      return;
    }
  }

  const indexedSwapSyncMatch = /^([a-zA-Z_][a-zA-Z0-9_]*)\s*\[(.+)\]\s*,\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\[(.+)\]\s*=\s*(.+)$/.exec(trimmed);
  if (indexedSwapSyncMatch) {
    const [, firstName, firstIndexExpr, secondName, secondIndexExpr, rhsExpr] = indexedSwapSyncMatch;
    const firstList = scope[firstName];
    const secondList = scope[secondName];
    if (Array.isArray(firstList) && Array.isArray(secondList)) {
      const firstIndex = Number(evaluateExpr(firstIndexExpr));
      const secondIndex = Number(evaluateExpr(secondIndexExpr));
      const rhs = evaluateExpr(rhsExpr);
      const rhsValues = Array.isArray(rhs)
        ? rhs
        : splitOutsideQuotesAndParens(rhsExpr, ',').map(item => evaluateExpr(item));
      if (rhsValues.length >= 2) {
        firstList[firstIndex] = rhsValues[0];
        secondList[secondIndex] = rhsValues[1];
      }
    }
    return;
  }

  const augMatch = /^(.+?)\s*(\/\/=|\*\*=|[-+/*%|&=]=)\s*(.+)$/.exec(trimmed);
  if (augMatch) {
    const lhsStr = augMatch[1].trim();
    const op = augMatch[2];
    const rhsStr = augMatch[3].trim();
    let newVal: unknown;
    if (op === '//=') {
      const lNum = Number(evaluateExpr(lhsStr) || 0);
      const rNum = Number(evaluateExpr(rhsStr) || 1);
      newVal = Math.floor(lNum / rNum);
    } else if (op === '**=') {
      const lNum = Number(evaluateExpr(lhsStr) || 0);
      const rNum = Number(evaluateExpr(rhsStr) || 1);
      newVal = Math.pow(lNum, rNum);
    } else {
      const singleOp = op[0];
      newVal = evaluateExpr(`${lhsStr} ${singleOp} (${rhsStr})`);
    }
    if (assignValueToLhs(lhsStr, newVal, scope, evaluateExpr)) {
      return;
    }
  }

  const eqIdx = trimmed.indexOf('=');
  if (eqIdx !== -1) {
    const prevChar = trimmed[eqIdx - 1];
    const nextChar = trimmed[eqIdx + 1];
    if (prevChar !== '=' && prevChar !== '!' && prevChar !== '<' && prevChar !== '>' && nextChar !== '=') {
      const leftSide = trimmed.slice(0, eqIdx).trim();
      const rightSide = trimmed.slice(eqIdx + 1).trim();
      const rawRhsParts = splitOutsideQuotesAndParens(rightSide, ',');
      let rhsVal: unknown;
      if (rawRhsParts.length > 1) {
        rhsVal = rawRhsParts.map(p => evaluateExpr(p));
      } else {
        rhsVal = evaluateExpr(rightSide);
      }
      if (assignValueToLhs(leftSide, rhsVal, scope, evaluateExpr)) {
        return;
      }
    }
  }

  evaluateExpr(trimmed);
}
