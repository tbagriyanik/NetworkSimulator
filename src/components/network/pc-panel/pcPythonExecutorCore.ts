// pcPythonExecutorCore.ts
// Shared types, exception matching, and the synchronous statement-execution
// engine (execStatementsSync) used by both executePythonScript and
// executePythonScriptAsync.

import {
  PythonInputRequiredException,
  PythonTimeoutException,
  PyClass,
  PyGenerator,
  splitOutsideQuotesAndParens,
} from './pcPythonRunnerHelpers';
import { Statement } from './pcPythonParser';
import { executeSinglePythonLine } from './pcPythonStatementParser';

// ── Shared types ───────────────────────────────────────────────────────────
export type ExecResult = 'normal' | 'break' | 'continue' | { type: 'return'; value: unknown };

export interface ExceptBranchMeta {
  errorType: string | null;
  varName: string | null;
}

export function exceptionMatches(
  ex: ExceptBranchMeta,
  errName: string
): { matches: boolean; alias: string | null } {
  if (ex.errorType) {
    const typeName = ex.errorType;
    if (typeName !== 'Exception' && typeName !== 'BaseException' && !errName.startsWith(typeName)) {
      return { matches: false, alias: null };
    }
    return { matches: true, alias: ex.varName };
  }
  if (ex.varName) {
    const exTypeMatch = /^([a-zA-Z0-9_]+)(?:\s+as\s+([a-zA-Z0-9_]+))?$/.exec(ex.varName.trim());
    if (exTypeMatch) {
      const typeName = exTypeMatch[1];
      const alias = exTypeMatch[2] || typeName;
      if (typeName !== 'Exception' && typeName !== 'BaseException' && !errName.startsWith(typeName)) {
        return { matches: false, alias: null };
      }
      return { matches: true, alias };
    }
    if (!errName.startsWith(ex.varName)) return { matches: false, alias: null };
    return { matches: true, alias: ex.varName };
  }
  return { matches: true, alias: null };
}

// ── iterable → array helper ────────────────────────────────────────────────
export function iterableToArray(iterable: unknown): unknown[] {
  if (Array.isArray(iterable)) return iterable;
  if (typeof iterable === 'string') return iterable.split('');
  if (iterable instanceof Set) return Array.from(iterable);
  if (typeof iterable === 'object' && iterable !== null) {
    if (typeof (iterable as Record<string | symbol, unknown>)[Symbol.iterator] === 'function') {
      return Array.from(iterable as Iterable<unknown>);
    }
    return Object.keys(iterable);
  }
  return [];
}

// ── Scope-saving tuple-assign helper ─────────────────────────────────────
export function assignLoopVar(
  scope: Record<string, unknown>,
  varName: string,
  item: unknown
): void {
  const targets = varName.split(',').map(t => t.trim());
  if (targets.length > 1 && Array.isArray(item)) {
    targets.forEach((t, idx) => { scope[t] = (item as unknown[])[idx]; });
  } else {
    scope[varName] = item;
  }
}

// ── createSyncExecutor ─────────────────────────────────────────────────────
// Returns a synchronous execStatementsSync closure bound to the provided scope
// and evaluator. This is used by executePythonScript and, as a fallback, inside
// generator functions created by executePythonScriptAsync.
export function createSyncExecutor(
  scope: Record<string, unknown>,
  evaluateExpr: (expr: string) => unknown,
  outputs: string[],
  onOutput: ((line: string, isAppend?: boolean) => void) | undefined,
  checkExecutionTimeout: () => void
): (stmts: Statement[]) => ExecResult {
  const processLineSync = (line: string): void => {
    executeSinglePythonLine(line, scope, evaluateExpr, outputs, onOutput);
  };

  const evalCondition = (condStr: string): boolean => {
    try {
      const res = evaluateExpr(condStr);
      if (res === 'False' || res === 'false' || res === '0' || res === 0 || res === false || res === null || res === undefined) {
        return false;
      }
      return Boolean(res);
    } catch (err) {
      if (err instanceof PythonInputRequiredException) throw err;
      return false;
    }
  };

  function execStatementsSync(stmts: Statement[]): ExecResult {
    for (const stmt of stmts) {
      checkExecutionTimeout();

      if (stmt.type === 'line') {
        if (stmt.text === 'break') return 'break';
        if (stmt.text === 'continue') return 'continue';
        if (stmt.text === 'return' || stmt.text.startsWith('return ') || stmt.text.startsWith('return(')) {
          const retExpr = stmt.text.length > 6 ? stmt.text.slice(6).trim() : '';
          let retVal: unknown;
          if (retExpr) {
            const retParts = splitOutsideQuotesAndParens(retExpr, ',');
            if (retParts.length > 1) {
              retVal = retParts.map(p => evaluateExpr(p));
              (retVal as unknown as { __isTuple__?: boolean }).__isTuple__ = true;
            } else {
              retVal = evaluateExpr(retExpr);
            }
          }
          return { type: 'return', value: retVal };
        }
        processLineSync(stmt.text);

      } else if (stmt.type === 'class') {
        const { className, baseClasses: baseNames, body, decorators } = stmt;
        const baseClasses: PyClass[] = [];
        for (const b of baseNames) {
          const resolved = scope[b];
          if (resolved instanceof PyClass) baseClasses.push(resolved);
        }
        const createdMethods: Record<string, unknown> = {};
        const staticProps: Record<string, unknown> = {};
        const propertyGetters: Record<string, unknown> = {};
        const propertySetters: Record<string, unknown> = {};
        const staticMethods = new Set<string>();
        const classMethods = new Set<string>();

        const savedScope = { ...scope };
        execStatementsSync(body);
        for (const [k, v] of Object.entries(scope)) {
          if (!Object.prototype.hasOwnProperty.call(savedScope, k) || savedScope[k] !== v) {
            if (typeof v === 'function') {
              const fnObj = (v as unknown) as Record<string, unknown>;
              if (fnObj.__isPropertyGetter) {
                propertyGetters[k] = v;
              } else if (fnObj.__isPropertySetterFor) {
                propertySetters[String(fnObj.__isPropertySetterFor)] = v;
              } else {
                createdMethods[k] = v;
                if (fnObj.__isStaticMethod) staticMethods.add(k);
                if (fnObj.__isClassMethod) classMethods.add(k);
              }
            } else {
              staticProps[k] = v;
            }
          }
        }
        Object.keys(scope).forEach(k => delete scope[k]);
        Object.assign(scope, savedScope);

        const pyClass = new PyClass(className, baseClasses, createdMethods);
        pyClass.staticProps = staticProps;
        pyClass.propertyGetters = propertyGetters;
        pyClass.propertySetters = propertySetters;
        pyClass.staticMethods = staticMethods;
        pyClass.classMethods = classMethods;

        let targetCls: unknown = pyClass;
        if (decorators) {
          for (const dec of decorators) {
            const decFn = scope[dec];
            if (typeof decFn === 'function') targetCls = decFn(targetCls);
          }
        }
        scope[className] = targetCls;

      } else if (stmt.type === 'yield') {
        return { type: 'return', value: evaluateExpr(stmt.expr) };

      } else if (stmt.type === 'def') {
        const { funcName, paramNames, paramDefaults, body, decorators } = stmt;
        const evaluatedDefaults: Record<string, unknown> = {};
        for (const [param, expression] of Object.entries(paramDefaults)) {
          evaluatedDefaults[param] = evaluateExpr(expression);
        }

        const isGen = (sList: Statement[]): boolean => {
          for (const s of sList) {
            if (s.type === 'yield') return true;
            if (s.type === 'if' && s.branches.some(b => isGen(b.body))) return true;
            if (s.type === 'while' && isGen(s.body)) return true;
            if (s.type === 'for' && isGen(s.body)) return true;
            if (s.type === 'for' && s.body.some(b => b.type === 'if' && b.branches.some(bb => isGen(bb.body)))) return true;
            if (s.type === 'for' && s.body.some(b => b.type === 'while' && isGen(b.body))) return true;
            if (s.type === 'for' && s.body.some(b => b.type === 'for' && isGen(b.body))) return true;
          }
          return false;
        };

        let rawFunc: unknown;

        if (isGen(body)) {
          rawFunc = (...fnArgs: unknown[]) => {
            return new PyGenerator(function* () {
              const savedScope = { ...scope };
              paramNames.forEach((p, idx) => {
                if (idx < fnArgs.length && fnArgs[idx] !== undefined) scope[p] = fnArgs[idx];
                else if (p in evaluatedDefaults) scope[p] = evaluatedDefaults[p];
                else scope[p] = undefined;
              });

              function* processGenStatements(stmts: Statement[]): Generator<unknown, string | void, unknown> {
                for (const s of stmts) {
                  if (s.type === 'yield') {
                    yield evaluateExpr(s.expr);
                  } else if (s.type === 'line') {
                    if (s.text === 'break' || s.text === 'continue') continue;
                    processLineSync(s.text);
                  } else if (s.type === 'if') {
                    for (const branch of s.branches) {
                      if (branch.condition === null || evalCondition(branch.condition)) {
                        yield* processGenStatements(branch.body);
                        break;
                      }
                    }
                  } else if (s.type === 'while') {
                    let iterLimit = 10000;
                    let brokeOut = false;
                    while (evalCondition(s.condition) && iterLimit-- > 0) {
                      const sig = yield* processGenStatements(s.body);
                      if (sig === 'break') { brokeOut = true; break; }
                    }
                    if (!brokeOut && s.elseBody) yield* processGenStatements(s.elseBody);
                  } else if (s.type === 'for') {
                    const items = iterableToArray(evaluateExpr(s.iterableExpr));
                    let brokeOut = false;
                    for (const item of items) {
                      assignLoopVar(scope, s.varName, item);
                      const sig = yield* processGenStatements(s.body);
                      if (sig === 'break') { brokeOut = true; break; }
                    }
                    if (!brokeOut && s.elseBody) yield* processGenStatements(s.elseBody);
                  }
                }
              }

              yield* processGenStatements(body);
              Object.keys(scope).forEach(key => delete scope[key]);
              Object.assign(scope, savedScope);
            });
          };
        } else {
          rawFunc = (...fnArgs: unknown[]) => {
            const savedScope = { ...scope };
            const captured = (rawFunc as Record<string, unknown>).__capturedScope as Record<string, unknown> | undefined;
            if (captured) {
              for (const k of Object.keys(captured)) scope[k] = captured[k];
            }
            paramNames.forEach((p, idx) => {
              if (p.startsWith('*')) {
                scope[p.slice(1).trim()] = fnArgs.slice(idx);
              } else if (idx < fnArgs.length && fnArgs[idx] !== undefined) {
                scope[p] = fnArgs[idx];
              } else if (p in evaluatedDefaults) {
                scope[p] = evaluatedDefaults[p];
              } else {
                scope[p] = undefined;
              }
            });
            const sig = execStatementsSync(body);
            Object.keys(scope).forEach(key => delete scope[key]);
            Object.assign(scope, savedScope);
            if (typeof sig === 'object' && sig !== null && sig.type === 'return') return sig.value;
            return undefined;
          };
        }

        (rawFunc as Record<string, unknown>).__pythonParamNames = paramNames;
        (rawFunc as Record<string, unknown>).__pythonParamDefaults = paramDefaults;

        if (decorators) {
          for (const dec of decorators.slice().reverse()) {
            if (dec === 'property') {
              (rawFunc as Record<string, unknown>).__isPropertyGetter = true;
            } else if (dec === 'staticmethod') {
              (rawFunc as Record<string, unknown>).__isStaticMethod = true;
            } else if (dec === 'classmethod') {
              (rawFunc as Record<string, unknown>).__isClassMethod = true;
            } else if (dec.endsWith('.setter')) {
              (rawFunc as Record<string, unknown>).__isPropertySetterFor = dec.slice(0, -7).trim();
            } else {
              const decFn = scope[dec];
              if (typeof decFn === 'function') rawFunc = decFn(rawFunc);
            }
          }
        }
        if (!(rawFunc as Record<string, unknown>).__capturedScope) {
          (rawFunc as Record<string, unknown>).__capturedScope = { ...scope };
        }
        scope[funcName] = rawFunc;

      } else if (stmt.type === 'if') {
        let branchToExec: Statement[] | null = null;
        for (const branch of stmt.branches) {
          if (branch.condition === null || evalCondition(branch.condition)) {
            branchToExec = branch.body;
            break;
          }
        }
        if (branchToExec) {
          const sig = execStatementsSync(branchToExec);
          if (sig !== 'normal') return sig;
        }

      } else if (stmt.type === 'while') {
        let iterLimit = 10000;
        let brokeOut = false;
        while (evalCondition(stmt.condition)) {
          checkExecutionTimeout();
          if (--iterLimit <= 0) {
            throw new PythonTimeoutException('TimeoutError: Execution exceeded time limit or max iteration count');
          }
          const sig = execStatementsSync(stmt.body);
          if (sig === 'break') { brokeOut = true; break; }
          if (sig === 'continue') continue;
          if (typeof sig === 'object' && sig !== null && sig.type === 'return') return sig;
        }
        if (!brokeOut && stmt.elseBody) {
          const sig = execStatementsSync(stmt.elseBody);
          if (sig !== 'normal') return sig;
        }

      } else if (stmt.type === 'for') {
        const items = iterableToArray(evaluateExpr(stmt.iterableExpr));
        let brokeOut = false;
        for (const item of items) {
          assignLoopVar(scope, stmt.varName, item);
          const sig = execStatementsSync(stmt.body);
          if (sig === 'break') { brokeOut = true; break; }
          if (sig === 'continue') continue;
          if (typeof sig === 'object' && sig !== null && sig.type === 'return') return sig;
        }
        if (!brokeOut && stmt.elseBody) {
          const sig = execStatementsSync(stmt.elseBody);
          if (sig !== 'normal') return sig;
        }

      } else if (stmt.type === 'try') {
        let brokeOrReturn: ExecResult = 'normal';
        try {
          const sig = execStatementsSync(stmt.body);
          if (sig !== 'normal') brokeOrReturn = sig;
          else if (stmt.elseBody) {
            const elseSig = execStatementsSync(stmt.elseBody);
            if (elseSig !== 'normal') brokeOrReturn = elseSig;
          }
        } catch (err) {
          if (err instanceof PythonInputRequiredException || err instanceof PythonTimeoutException) throw err;
          if (stmt.exceptBranches && stmt.exceptBranches.length > 0) {
            const errName = err instanceof Error ? err.message : String(err);
            for (const ex of stmt.exceptBranches) {
              const { matches: matchesType, alias } = exceptionMatches(ex, errName);
              if (matchesType) {
                if (alias) scope[alias] = errName;
                const exSig = execStatementsSync(ex.body);
                if (exSig !== 'normal') brokeOrReturn = exSig;
                break;
              }
            }
          }
        } finally {
          if (stmt.finallyBody) {
            const finSig = execStatementsSync(stmt.finallyBody);
            if (finSig !== 'normal') brokeOrReturn = finSig;
          }
        }
        if (brokeOrReturn !== 'normal') return brokeOrReturn;

      } else if (stmt.type === 'with') {
        const fileObj = evaluateExpr(stmt.contextExpr);
        if (stmt.varName) scope[stmt.varName] = fileObj;
        try {
          const sig = execStatementsSync(stmt.body);
          if (sig !== 'normal') return sig;
        } finally {
          if (fileObj && typeof (fileObj as Record<string, unknown>).close === 'function') {
            (fileObj as { close: () => void }).close();
          }
        }
      }
    }
    return 'normal';
  }

  return execStatementsSync;
}
