import { PyClass, PyInstance, bindPythonArguments, parseFormatArgs } from './pcPythonRunnerHelpers';
import { asPyConstructor, pyParamNames } from './pcPythonTags';
import type { PythonEvaluationResult } from './pcPythonEvaluatorLiterals';

/** Evaluates user-defined Python functions and class constructors. */
export function evaluatePythonFunctionCall(
  expression: string,
  scope: Record<string, unknown>,
  evaluateExpr: (expr: string) => unknown,
): PythonEvaluationResult {
  const match = /^([a-zA-Z_][a-zA-Z0-9_.]*)\s*\((.*)\)$/.exec(expression.trim());
  if (!match) return { handled: false };

  const targetName = match[1];
  let fn: unknown;
  try {
    fn = scope[targetName] !== undefined ? scope[targetName] : evaluateExpr(targetName);
  } catch {
    fn = undefined;
  }
  if (!(fn instanceof PyClass) && typeof fn !== 'function') return { handled: false };

  const { positional, kwargs } = match[2].trim() ? parseFormatArgs(match[2], evaluateExpr) : { positional: [], kwargs: {} as Record<string, unknown> };

  if (fn instanceof PyClass) {
    const instance = new PyInstance(fn);
    const initMethod = fn.findMethod('__init__');
    if (typeof initMethod === 'function') {
      const paramNames = pyParamNames(initMethod);
      const orderedArgs = paramNames ? (() => {
        const bound: unknown[] = [];
        const remaining = [...positional];
        for (const name of paramNames) {
          if (Object.prototype.hasOwnProperty.call(kwargs, name)) {
            bound.push(kwargs[name]);
            delete kwargs[name];
          } else if (remaining.length > 0) {
            bound.push(remaining.shift()!);
          }
        }
        if (remaining.length > 0) bound.push(...remaining);
        return bound;
      })() : positional;
      initMethod(instance, ...orderedArgs);
    }
    return { handled: true, value: instance };
  }

  // Check if fn is a native JavaScript class constructor (e.g. Tk, PyButton, etc.)
  const Ctor = asPyConstructor(fn);

  const orderedArgs = bindPythonArguments(fn, positional, kwargs);

  if (Ctor) {
    try {
      return { handled: true, value: new Ctor(...orderedArgs) };
    } catch {
      // Fallback to normal function call if constructor fails
    }
  }

  try {
    return { handled: true, value: (fn as (...args: unknown[]) => unknown)(...orderedArgs) };
  } catch (callErr: unknown) {
    if (callErr instanceof Error && callErr.message.includes("must be invoked with 'new'")) {
      // The engine reports this callable is a class after all, so it is
      // constructable even though asPyConstructor() could not prove it.
      const ClassCtor = Ctor ?? (fn as new (...args: unknown[]) => unknown);
      return { handled: true, value: new ClassCtor(...orderedArgs) };
    }
    throw callErr;
  }
}
