import { isForbiddenDunderProperty, PyClass, PyInstance } from './pcPythonTypes';
import { splitOutsideQuotesAndParens } from './pcPythonStringHelpers';

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
        let current: unknown = scope[varName];
        if (current !== undefined) {
          for (let m = 0; m < evaluatedIndices.length - 1; m++) {
            const idxKey = evaluatedIndices[m];
            if (current === null || typeof current !== 'object') break;
            current = (current as Record<string | number, unknown>)[idxKey as string | number];
          }
          if (current !== null && typeof current === 'object') {
            const lastKey = evaluatedIndices[evaluatedIndices.length - 1];
            (current as Record<string | number, unknown>)[lastKey as string | number] = rhsVal;
            return true;
          }
        }
      }
    }
  }
  return false;
}
