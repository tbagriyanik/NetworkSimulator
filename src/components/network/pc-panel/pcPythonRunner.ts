// pcPythonRunner.ts
// A lightweight, safe Python script interpreter for PC CMD.

export interface PythonExecutionResult {
  output: string;
  error?: string;
  waitingForInput?: boolean;
  inputPrompt?: string;
}

import {
  PythonInputRequiredException,
  PythonTimeoutException,
  PyClass,
  PyGenerator,
  formatPythonValue,
  splitOutsideQuotesAndParens,
} from './pcPythonRunnerHelpers';
import { Statement, parseProgramLines, parseBlockAt } from './pcPythonParser';
import { createExpressionEvaluator } from './pcPythonEvaluator';
import { executeSinglePythonLine } from './pcPythonStatementParser';
import { createPythonFormModule } from './pcPythonFormModule';
import { createPython3DModule } from './pcPython3DModule';
import { createPythonAudioModule } from './pcPythonAudioModule';
import { audioEngine } from './pcAudioPlayer';

export { PyComplex, pythonRange, formatPythonValue, PyClass, PyInstance, PySuper, PyGenerator, PythonTimeoutException } from './pcPythonRunnerHelpers';

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
    if (!errName.startsWith(ex.varName)) {
      return { matches: false, alias: null };
    }
    return { matches: true, alias: ex.varName };
  }
  return { matches: true, alias: null };
}

export function executePythonScript(
  script: string,
  userInputs: string[] = [],
  onOutput?: (line: string, isAppend?: boolean) => void,
  deviceId?: string,
  scriptArgs: string[] = ['script.py'],
  timeoutMs: number = 3000
): PythonExecutionResult {
  audioEngine.stopAll();
  const startTime = Date.now();
  const deadline = timeoutMs > 0 ? startTime + timeoutMs : Infinity;
  let opCount = 0;

  const checkExecutionTimeout = () => {
    opCount++;
    if (opCount % 128 === 0 && Date.now() > deadline) {
      throw new PythonTimeoutException(`TimeoutError: Execution exceeded time limit of ${timeoutMs / 1000}s`);
    }
  };
  const formModule = createPythonFormModule(deviceId || 'default');
  const scene3DModule = createPython3DModule(deviceId || 'default');
  const audioModule = createPythonAudioModule(deviceId || 'default');
  const scope: Record<string, unknown> = {
    PyGenerator,
    tkinter: formModule,
    ttk: formModule.ttk,
    form: formModule,
    gui: formModule,
    scene3d: scene3DModule,
    vpython: scene3DModule,
    three3d: scene3DModule,
    mesh3d: scene3DModule,
    webgl3d: scene3DModule,
    audio: audioModule,
    music: audioModule,
    sound: audioModule,
    synth: audioModule,
    winsound: audioModule.winsound,
    print: (...args: unknown[]) => {
      outputs.push(args.map(a => formatPythonValue(a)).join(' '));
    },
    sys: {
      version: '3.11.0 (simulated)',
      platform: 'win32',
      argv: scriptArgs && scriptArgs.length > 0 ? scriptArgs : ['script.py'],
      exit: (code?: unknown) => {
        throw new Error(`sys.exit(${code !== undefined ? code : 0})`);
      },
    },
  };
  const outputs: string[] = [];
  let inputIdx = 0;

  const pythonInput = (promptMsg: unknown): string => {
    const promptStr = promptMsg ? String(promptMsg) : '';
    if (inputIdx < userInputs.length) {
      const val = userInputs[inputIdx++];
      if (promptStr) {
        outputs.push(promptStr);
        onOutput?.(promptStr + val, false);
      }
      return val;
    }
    throw new PythonInputRequiredException(promptStr || 'Input required: ');
  };

  const evaluateExpr = createExpressionEvaluator(scope, pythonInput, deviceId);

  const rawLines = script.split(/\r?\n/);
  const parsedLines = parseProgramLines(rawLines);
  const { statements: programAst } = parseBlockAt(parsedLines, 0, 0);

  type ExecResult = 'normal' | 'break' | 'continue' | { type: 'return'; value: unknown };

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

  const processLineSync = (line: string): void => {
    executeSinglePythonLine(line, scope, evaluateExpr, outputs, onOutput);
  };

  const execStatementsSync = (stmts: Statement[]): ExecResult => {
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
            if (typeof decFn === 'function') {
              targetCls = decFn(targetCls);
            }
          }
        }
        scope[className] = targetCls;
      } else if (stmt.type === 'yield') {
        const retVal = evaluateExpr(stmt.expr);
        return { type: 'return', value: retVal };
      } else if (stmt.type === 'def') {
        const { funcName, paramNames, paramDefaults, body, decorators } = stmt;
        // Python evaluates default arguments once, when the function is defined.
        // Keeping these values here also preserves mutations between calls.
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
                if (idx < fnArgs.length && fnArgs[idx] !== undefined) {
                  scope[p] = fnArgs[idx];
                } else if (p in evaluatedDefaults) {
                  scope[p] = evaluatedDefaults[p];
                } else {
                  scope[p] = undefined;
                }
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
                      if (sig === 'break') {
                        brokeOut = true;
                        break;
                      }
                    }
                    if (!brokeOut && s.elseBody) {
                      yield* processGenStatements(s.elseBody);
                    }
                  } else if (s.type === 'for') {
                    const iterable = evaluateExpr(s.iterableExpr);
                    let items: unknown[] = [];
                    if (Array.isArray(iterable)) items = iterable;
                    else if (typeof iterable === 'string') items = iterable.split('');
                    else if (iterable instanceof Set) items = Array.from(iterable);
                    else if (typeof iterable === 'object' && iterable !== null) {
                      if (typeof (iterable as Record<string | symbol, unknown>)[Symbol.iterator] === 'function') {
                        items = Array.from(iterable as Iterable<unknown>);
                      } else {
                        items = Object.keys(iterable);
                      }
                    }
                    let brokeOut = false;
                    for (const item of items) {
                      const targets = s.varName.split(',').map(t => t.trim());
                      if (targets.length > 1 && Array.isArray(item)) {
                        targets.forEach((t, idx) => { scope[t] = item[idx]; });
                      } else {
                        scope[s.varName] = item;
                      }
                      const sig = yield* processGenStatements(s.body);
                      if (sig === 'break') {
                        brokeOut = true;
                        break;
                      }
                    }
                    if (!brokeOut && s.elseBody) {
                      yield* processGenStatements(s.elseBody);
                    }
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
              for (const k of Object.keys(captured)) {
                scope[k] = captured[k];
              }
            }
            paramNames.forEach((p, idx) => {
              if (p.startsWith('*')) {
                const varArgName = p.slice(1).trim();
                scope[varArgName] = fnArgs.slice(idx);
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
            if (typeof sig === 'object' && sig !== null && sig.type === 'return') {
              return sig.value;
            }
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
              if (typeof decFn === 'function') {
                rawFunc = decFn(rawFunc);
              }
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
            throw new PythonTimeoutException(`TimeoutError: Execution exceeded time limit or max iteration count`);
          }
          const sig = execStatementsSync(stmt.body);
          if (sig === 'break') {
            brokeOut = true;
            break;
          }
          if (sig === 'continue') continue;
          if (typeof sig === 'object' && sig !== null && sig.type === 'return') {
            return sig;
          }
        }
        if (!brokeOut && stmt.elseBody) {
          const sig = execStatementsSync(stmt.elseBody);
          if (sig !== 'normal') return sig;
        }
      } else if (stmt.type === 'for') {
        const iterable = evaluateExpr(stmt.iterableExpr);
        let items: unknown[] = [];
        if (Array.isArray(iterable)) {
          items = iterable;
        } else if (typeof iterable === 'string') {
          items = iterable.split('');
        } else if (iterable instanceof Set) {
          items = Array.from(iterable);
        } else if (typeof iterable === 'object' && iterable !== null) {
          if (typeof (iterable as Record<string | symbol, unknown>)[Symbol.iterator] === 'function') {
            items = Array.from(iterable as Iterable<unknown>);
          } else {
            items = Object.keys(iterable);
          }
        }
        let brokeOut = false;
        for (const item of items) {
          const targets = stmt.varName.split(',').map(t => t.trim());
          if (targets.length > 1 && Array.isArray(item)) {
            targets.forEach((t, idx) => { scope[t] = item[idx]; });
          } else {
            scope[stmt.varName] = item;
          }
          const sig = execStatementsSync(stmt.body);
          if (sig === 'break') {
            brokeOut = true;
            break;
          }
          if (sig === 'continue') continue;
          if (typeof sig === 'object' && sig !== null && sig.type === 'return') {
            return sig;
          }
        }
        if (!brokeOut && stmt.elseBody) {
          const sig = execStatementsSync(stmt.elseBody);
          if (sig !== 'normal') return sig;
        }
      } else if (stmt.type === 'try') {
        let brokeOrReturn: ExecResult = 'normal';
        try {
          const sig = execStatementsSync(stmt.body);
          if (sig !== 'normal') {
            brokeOrReturn = sig;
          } else if (stmt.elseBody) {
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
        if (stmt.varName) {
          scope[stmt.varName] = fileObj;
        }
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
  };

  try {
    execStatementsSync(programAst);
  } catch (err) {
    if (err instanceof PythonInputRequiredException) {
      return {
        output: outputs.join('\n'),
        waitingForInput: true,
        inputPrompt: err.prompt,
      };
    }
    return {
      output: outputs.join('\n'),
      error: err instanceof Error ? err.message : String(err),
    };
  }

  return {
    output: outputs.join('\n'),
  };
}

export async function executePythonScriptAsync(
  script: string,
  userInputs: string[] = [],
  onOutput?: (line: string, isAppend?: boolean) => void,
  deviceId?: string,
  scriptArgs: string[] = ['script.py'],
  timeoutMs: number = 3000
): Promise<PythonExecutionResult> {
  audioEngine.stopAll();
  const startTime = Date.now();
  const deadline = timeoutMs > 0 ? startTime + timeoutMs : Infinity;
  let opCount = 0;

  const checkExecutionTimeout = () => {
    opCount++;
    if (opCount % 128 === 0 && Date.now() > deadline) {
      throw new PythonTimeoutException(`TimeoutError: Execution exceeded time limit of ${timeoutMs / 1000}s`);
    }
  };
  const formModule = createPythonFormModule(deviceId || 'default');
  const scene3DModule = createPython3DModule(deviceId || 'default');
  const audioModule = createPythonAudioModule(deviceId || 'default');
  const scope: Record<string, unknown> = {
    tkinter: formModule,
    ttk: formModule.ttk,
    form: formModule,
    gui: formModule,
    scene3d: scene3DModule,
    vpython: scene3DModule,
    three3d: scene3DModule,
    mesh3d: scene3DModule,
    webgl3d: scene3DModule,
    audio: audioModule,
    music: audioModule,
    sound: audioModule,
    synth: audioModule,
    winsound: audioModule.winsound,
    print: (...args: unknown[]) => {
      outputs.push(args.map(a => formatPythonValue(a)).join(' '));
    },
    sys: {
      version: '3.11.0 (simulated)',
      platform: 'win32',
      argv: scriptArgs && scriptArgs.length > 0 ? scriptArgs : ['script.py'],
      exit: (code?: unknown) => {
        throw new Error(`sys.exit(${code !== undefined ? code : 0})`);
      },
    },
  };
  const outputs: string[] = [];
  let inputIdx = 0;

  const pythonInput = (promptMsg: unknown): string => {
    const promptStr = promptMsg ? String(promptMsg) : '';
    if (inputIdx < userInputs.length) {
      const val = userInputs[inputIdx++];
      if (promptStr) {
        outputs.push(promptStr);
        onOutput?.(promptStr + val, false);
      }
      return val;
    }
    throw new PythonInputRequiredException(promptStr || 'Input required: ');
  };

  const evaluateExpr = createExpressionEvaluator(scope, pythonInput, deviceId);

  const rawLines = script.split(/\r?\n/);
  const parsedLines = parseProgramLines(rawLines);
  const { statements: programAst } = parseBlockAt(parsedLines, 0, 0);

  type ExecResult = 'normal' | 'break' | 'continue' | { type: 'return'; value: unknown };

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

  const processLineSync = (line: string): void => {
    executeSinglePythonLine(line, scope, evaluateExpr, outputs, onOutput);
  };

  const execStatementsSync = (stmts: Statement[]): ExecResult => {
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
            if (typeof decFn === 'function') {
              targetCls = decFn(targetCls);
            }
          }
        }
        scope[className] = targetCls;
      } else if (stmt.type === 'yield') {
        const retVal = evaluateExpr(stmt.expr);
        return { type: 'return', value: retVal };
      } else if (stmt.type === 'def') {
        const { funcName, paramNames, paramDefaults, body, decorators } = stmt;

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
                if (idx < fnArgs.length && fnArgs[idx] !== undefined) {
                  scope[p] = fnArgs[idx];
                } else if (p in paramDefaults) {
                  scope[p] = evaluateExpr(paramDefaults[p]);
                } else {
                  scope[p] = undefined;
                }
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
                      if (sig === 'break') {
                        brokeOut = true;
                        break;
                      }
                    }
                    if (!brokeOut && s.elseBody) {
                      yield* processGenStatements(s.elseBody);
                    }
                  } else if (s.type === 'for') {
                    const iterable = evaluateExpr(s.iterableExpr);
                    let items: unknown[] = [];
                    if (Array.isArray(iterable)) items = iterable;
                    else if (typeof iterable === 'string') items = iterable.split('');
                    else if (iterable instanceof Set) items = Array.from(iterable);
                    else if (typeof iterable === 'object' && iterable !== null) {
                      if (typeof (iterable as Record<string | symbol, unknown>)[Symbol.iterator] === 'function') {
                        items = Array.from(iterable as Iterable<unknown>);
                      } else {
                        items = Object.keys(iterable);
                      }
                    }
                    let brokeOut = false;
                    for (const item of items) {
                      const targets = s.varName.split(',').map(t => t.trim());
                      if (targets.length > 1 && Array.isArray(item)) {
                        targets.forEach((t, idx) => { scope[t] = item[idx]; });
                      } else {
                        scope[s.varName] = item;
                      }
                      const sig = yield* processGenStatements(s.body);
                      if (sig === 'break') {
                        brokeOut = true;
                        break;
                      }
                    }
                    if (!brokeOut && s.elseBody) {
                      yield* processGenStatements(s.elseBody);
                    }
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
              for (const k of Object.keys(captured)) {
                scope[k] = captured[k];
              }
            }
            paramNames.forEach((p, idx) => {
              if (idx < fnArgs.length && fnArgs[idx] !== undefined) {
                scope[p] = fnArgs[idx];
              } else if (p in paramDefaults) {
                scope[p] = evaluateExpr(paramDefaults[p]);
              } else {
                scope[p] = undefined;
              }
            });
            const sig = execStatementsSync(body);
            Object.keys(scope).forEach(key => delete scope[key]);
            Object.assign(scope, savedScope);
            if (typeof sig === 'object' && sig !== null && sig.type === 'return') {
              return sig.value;
            }
            return undefined;
          };
        }

        if (decorators) {
          for (const dec of decorators) {
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
              if (typeof decFn === 'function') {
                rawFunc = decFn(rawFunc);
              }
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
        while (evalCondition(stmt.condition) && iterLimit-- > 0) {
          const sig = execStatementsSync(stmt.body);
          if (sig === 'break') {
            brokeOut = true;
            break;
          }
          if (sig === 'continue') continue;
          if (typeof sig === 'object' && sig !== null && sig.type === 'return') {
            return sig;
          }
        }
        if (!brokeOut && stmt.elseBody) {
          const sig = execStatementsSync(stmt.elseBody);
          if (sig !== 'normal') return sig;
        }
      } else if (stmt.type === 'for') {
        const iterable = evaluateExpr(stmt.iterableExpr);
        let items: unknown[] = [];
        if (Array.isArray(iterable)) {
          items = iterable;
        } else if (typeof iterable === 'string') {
          items = iterable.split('');
        } else if (iterable instanceof Set) {
          items = Array.from(iterable);
        } else if (typeof iterable === 'object' && iterable !== null) {
          if (typeof (iterable as Record<string | symbol, unknown>)[Symbol.iterator] === 'function') {
            items = Array.from(iterable as Iterable<unknown>);
          } else {
            items = Object.keys(iterable);
          }
        }
        let brokeOut = false;
        for (const item of items) {
          const targets = stmt.varName.split(',').map(t => t.trim());
          if (targets.length > 1 && Array.isArray(item)) {
            targets.forEach((t, idx) => { scope[t] = item[idx]; });
          } else {
            scope[stmt.varName] = item;
          }
          const sig = execStatementsSync(stmt.body);
          if (sig === 'break') {
            brokeOut = true;
            break;
          }
          if (sig === 'continue') continue;
          if (typeof sig === 'object' && sig !== null && sig.type === 'return') {
            return sig;
          }
        }
        if (!brokeOut && stmt.elseBody) {
          const sig = execStatementsSync(stmt.elseBody);
          if (sig !== 'normal') return sig;
        }
      } else if (stmt.type === 'try') {
        let brokeOrReturn: ExecResult = 'normal';
        try {
          const sig = execStatementsSync(stmt.body);
          if (sig !== 'normal') {
            brokeOrReturn = sig;
          } else if (stmt.elseBody) {
            const elseSig = execStatementsSync(stmt.elseBody);
            if (elseSig !== 'normal') brokeOrReturn = elseSig;
          }
        } catch (err) {
          if (err instanceof PythonInputRequiredException) throw err;
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
        if (stmt.varName) {
          scope[stmt.varName] = fileObj;
        }
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
  };

  const processLine = async (line: string): Promise<void> => {
    const trimmed = line.trim().replace(/;+\s*$/, '');
    if (!trimmed || trimmed.startsWith('#')) return;

    const sleepMatch = /^time\.sleep\s*\((.*)\)$/.exec(trimmed);
    if (sleepMatch) {
      const secVal = Number(evaluateExpr(sleepMatch[1]) || 0);
      if (secVal > 0) {
        const delayMs = Math.min(secVal, 10) * 1000;
        if (Date.now() + delayMs > deadline) {
          throw new PythonTimeoutException(`TimeoutError: Execution exceeded time limit of ${timeoutMs / 1000}s`);
        }
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
      return;
    }

    processLineSync(trimmed);
  };

  const execStatements = async (stmts: Statement[]): Promise<ExecResult> => {
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
        await processLine(stmt.text);
      } else if (stmt.type === 'def') {
        const { funcName, paramNames, paramDefaults, body } = stmt;
        scope[funcName] = (...fnArgs: unknown[]) => {
          const savedScope = { ...scope };
          paramNames.forEach((p, idx) => {
            if (idx < fnArgs.length && fnArgs[idx] !== undefined) {
              scope[p] = fnArgs[idx];
            } else if (p in paramDefaults) {
              scope[p] = evaluateExpr(paramDefaults[p]);
            } else {
              scope[p] = undefined;
            }
          });

          const sig = execStatementsSync(body);

          Object.keys(scope).forEach(key => delete scope[key]);
          Object.assign(scope, savedScope);

          if (typeof sig === 'object' && sig !== null && sig.type === 'return') {
            return sig.value;
          }
          return undefined;
        };
      } else if (stmt.type === 'if') {
        let branchToExec: Statement[] | null = null;
        for (const branch of stmt.branches) {
          if (branch.condition === null || evalCondition(branch.condition)) {
            branchToExec = branch.body;
            break;
          }
        }
        if (branchToExec) {
          const sig = await execStatements(branchToExec);
          if (sig !== 'normal') return sig;
        }
      } else if (stmt.type === 'while') {
        let iterLimit = 10000;
        let brokeOut = false;
        while (evalCondition(stmt.condition)) {
          checkExecutionTimeout();
          if (--iterLimit <= 0) {
            throw new PythonTimeoutException(`TimeoutError: Execution exceeded time limit or max iteration count`);
          }
          const sig = await execStatements(stmt.body);
          if (sig === 'break') {
            brokeOut = true;
            break;
          }
          if (sig === 'continue') continue;
          if (typeof sig === 'object' && sig !== null && sig.type === 'return') {
            return sig;
          }
        }
        if (!brokeOut && stmt.elseBody) {
          const sig = await execStatements(stmt.elseBody);
          if (sig !== 'normal') return sig;
        }
      } else if (stmt.type === 'for') {
        const iterable = evaluateExpr(stmt.iterableExpr);
        let items: unknown[] = [];
        if (Array.isArray(iterable)) {
          items = iterable;
        } else if (typeof iterable === 'string') {
          items = iterable.split('');
        } else if (iterable instanceof Set) {
          items = Array.from(iterable);
        } else if (typeof iterable === 'object' && iterable !== null) {
          items = Object.keys(iterable);
        }
        let brokeOut = false;
        for (const item of items) {
          const targets = stmt.varName.split(',').map(t => t.trim());
          if (targets.length > 1 && Array.isArray(item)) {
            targets.forEach((t, idx) => { scope[t] = item[idx]; });
          } else {
            scope[stmt.varName] = item;
          }
          const sig = await execStatements(stmt.body);
          if (sig === 'break') {
            brokeOut = true;
            break;
          }
          if (sig === 'continue') continue;
          if (typeof sig === 'object' && sig !== null && sig.type === 'return') {
            return sig;
          }
        }
        if (!brokeOut && stmt.elseBody) {
          const sig = await execStatements(stmt.elseBody);
          if (sig !== 'normal') return sig;
        }
      } else if (stmt.type === 'try') {
        let brokeOrReturn: ExecResult = 'normal';
        try {
          const sig = await execStatements(stmt.body);
          if (sig !== 'normal') {
            brokeOrReturn = sig;
          } else if (stmt.elseBody) {
            const elseSig = await execStatements(stmt.elseBody);
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
                const exSig = await execStatements(ex.body);
                if (exSig !== 'normal') brokeOrReturn = exSig;
                break;
              }
            }
          }
        } finally {
          if (stmt.finallyBody) {
            const finSig = await execStatements(stmt.finallyBody);
            if (finSig !== 'normal') brokeOrReturn = finSig;
          }
        }
        if (brokeOrReturn !== 'normal') return brokeOrReturn;
      }
    }
    return 'normal';
  };

  try {
    await execStatements(programAst);
  } catch (err) {
    if (err instanceof PythonInputRequiredException) {
      return {
        output: outputs.join('\n'),
        waitingForInput: true,
        inputPrompt: err.prompt,
      };
    }
    return {
      output: outputs.join('\n'),
      error: err instanceof Error ? err.message : String(err),
    };
  }

  return {
    output: outputs.join('\n'),
  };
}
