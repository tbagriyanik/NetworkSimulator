import { PyGenerator, findOperatorIndex } from './pcPythonRunnerHelpers';

export interface ComprehensionEvalResult {
  handled: boolean;
  value?: unknown;
}

export function evaluatePythonComprehensions(
  trimmed: string,
  scope: Record<string, unknown>,
  evaluateExpr: (expr: string) => unknown
): ComprehensionEvalResult {
  // List literal or List Comprehension: [expr for var in iter if cond]
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    const inner = trimmed.slice(1, -1).trim();
    if (!inner) return { handled: true, value: [] };

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
        return { handled: true, value: resultList };
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
    return {
      handled: true,
      value: parts.filter(p => p.trim() !== '').map(p => evaluateExpr(p))
    };
  }

  // Top-level generator expression: expr for var in iterable [if cond]
  const genExprIdx = findOperatorIndex(trimmed, ' for ');
  if (genExprIdx !== -1 && !trimmed.startsWith('{') && !trimmed.startsWith('(')) {
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
      return { handled: true, value: new PyGenerator(itemsList) };
    }
  }

  return { handled: false };
}
