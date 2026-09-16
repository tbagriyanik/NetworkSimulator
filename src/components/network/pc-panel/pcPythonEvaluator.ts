// pcPythonEvaluator.ts
// Entry point that assembles the expression evaluator from focused sub-modules.

import {
  PyComplex,
  PyClass,
  PyInstance,
  PySuper,
  PyGenerator,
  PyType,
  findOperatorIndex,
  isEnclosedInParens,
  splitOutsideQuotesAndParens,
  pythonRange,
} from './pcPythonRunnerHelpers';
import { evaluatePythonComprehensions } from './pcPythonComprehensions';
import { evaluatePythonLiteral } from './pcPythonEvaluatorLiterals';
import { evaluatePythonFunctionCall } from './pcPythonEvaluatorFunctions';
import { evaluatePythonLogicalOrComparison } from './pcPythonEvaluatorOperators';
import { evaluateSafeJavaScriptFallback } from './pcPythonEvaluatorSecurity';
import { evaluatePythonBuiltins } from './pcPythonEvaluatorBuiltins';
import { evaluatePythonCollections } from './pcPythonEvaluatorCollections';
import {
  evaluatePythonMemberCall,
  evaluatePythonPropertyAccess,
} from './pcPythonEvaluatorMemberAccess';
import { evaluatePythonArithmetic } from './pcPythonEvaluatorArithmetic';

import { setupPythonStdLib } from './pcPythonStdLib';

export function createExpressionEvaluator(
  scope: Record<string, unknown>,
  pythonInput: (promptMsg: unknown) => string,
  deviceId?: string
): (expr: string) => unknown {
  const devId = deviceId || 'pc-default';
  const cwdRef = { value: 'C:\\' };

  setupPythonStdLib(scope, devId, cwdRef);

  const evaluateExpr = (expr: string): unknown => {
    const trimmed = expr.trim();
    if (!trimmed) return undefined;

    // Comprehensions (list / dict / set / generator)
    const comprehensionResult = evaluatePythonComprehensions(trimmed, scope, evaluateExpr);
    if (comprehensionResult.handled) return comprehensionResult.value;

    // Helper: does trimmed look like a complete call to `name(...)`?
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

    // Python f-strings: f"..." or f'...'
    if ((trimmed.startsWith('f"') && trimmed.endsWith('"')) || (trimmed.startsWith("f'") && trimmed.endsWith("'"))) {
      const raw = trimmed.slice(2, -1);
      return raw.replace(/\{([^{}]+)\}/g, (_, inner) => String(evaluateExpr(inner) ?? ''));
    }

    // Built-in type conversions
    const builtinResult = evaluatePythonBuiltins(trimmed, scope, evaluateExpr, pythonInput, isCompleteCall);
    if (builtinResult.handled) return builtinResult.value;

    // Collection builtins (len, sum, list, sorted, dict, map, filter, enumerate, zip …)
    const collectionResult = evaluatePythonCollections(trimmed, evaluateExpr, isCompleteCall);
    if (collectionResult.handled) return collectionResult.value;

    // str.join(iterable)
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

    // Lambda expression: lambda x, y: expr
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

    // Literals (numbers, strings, True/False/None, list literals)
    const literalResult = evaluatePythonLiteral(trimmed, scope);
    if (literalResult.handled) return literalResult.value;

    // Member call: targetExpr.method(...)
    const dotIdx = findOperatorIndex(trimmed, '.');
    if (dotIdx !== -1 && trimmed.endsWith(')')) {
      const memberResult = evaluatePythonMemberCall(trimmed, evaluateExpr, dotIdx);
      if (memberResult.handled) return memberResult.value;
    }

    // Member property access: obj.prop
    const propResult = evaluatePythonPropertyAccess(trimmed, evaluateExpr);
    if (propResult.handled) return propResult.value;

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

    // Dict literal: {key: val, …}
    if (trimmed.startsWith('{') && trimmed.endsWith('}') && trimmed.includes(':')) {
      const inner = trimmed.slice(1, -1).trim();
      if (!inner) return {};
      const pairs = splitOutsideQuotesAndParens(inner, ',');
      const resDict: Record<string, unknown> = {};
      for (const pair of pairs) {
        const colonIdx = findOperatorIndex(pair, ':');
        if (colonIdx !== -1) {
          resDict[String(evaluateExpr(pair.slice(0, colonIdx).trim()))] = evaluateExpr(pair.slice(colonIdx + 1).trim());
        }
      }
      return resDict;
    }

    // Set literal: {1, 2, 3}
    if (trimmed.startsWith('{') && trimmed.endsWith('}') && !trimmed.includes(':')) {
      const inner = trimmed.slice(1, -1).trim();
      if (!inner) return {};
      return new Set(splitOutsideQuotesAndParens(inner, ',').map(item => evaluateExpr(item)));
    }

    // Ternary: <true> if <cond> else <false>
    const ternaryIfIdx = findOperatorIndex(trimmed, ' if ');
    const ternaryElseIdx = findOperatorIndex(trimmed, ' else ');
    if (ternaryIfIdx !== -1 && ternaryElseIdx > ternaryIfIdx) {
      const trueExpr = trimmed.slice(0, ternaryIfIdx).trim();
      const condExpr = trimmed.slice(ternaryIfIdx + 4, ternaryElseIdx).trim();
      const falseExpr = trimmed.slice(ternaryElseIdx + 6).trim();
      return evaluateExpr(condExpr) ? evaluateExpr(trueExpr) : evaluateExpr(falseExpr);
    }

    // Logical / comparison operators (not, and, or, in, not in, ==, !=, <, >, <=, >=, is)
    const logicalOrComparison = evaluatePythonLogicalOrComparison(trimmed, evaluateExpr);
    if (logicalOrComparison.handled) return logicalOrComparison.value;

    // range(...)
    const rangeMatch = /^range\((.+)\)$/.exec(trimmed);
    if (rangeMatch) {
      const args = rangeMatch[1].split(',').map(a => Number(evaluateExpr(a)));
      return pythonRange(...args);
    }

    // Arithmetic, bitwise, indexing, slicing
    const arithmeticResult = evaluatePythonArithmetic(trimmed, evaluateExpr);
    if (arithmeticResult.handled) return arithmeticResult.value;

    // User-defined / scope function call
    const functionCall = evaluatePythonFunctionCall(trimmed, scope, evaluateExpr);
    if (functionCall.handled) return functionCall.value;

    // Single identifier variable lookup
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

// Re-export types used by consumers
export type {
  PyComplex,
  PyClass,
  PyInstance,
  PySuper,
  PyGenerator,
  PyType,
};

