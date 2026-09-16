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
  PyGenerator,
  formatPythonValue,
} from './pcPythonRunnerHelpers';
import { parseProgramLines, parseBlockAt } from './pcPythonParser';
import { createExpressionEvaluator } from './pcPythonEvaluator';
import { createPythonFormModule } from './pcPythonFormModule';
import { createPython3DModule } from './pcPython3DModule';
import { createPythonAudioModule } from './pcPythonAudioModule';
import { audioEngine } from './pcAudioPlayer';
import {
  createSyncExecutor,
} from './pcPythonExecutorCore';

export type { ExceptBranchMeta } from './pcPythonExecutorCore';
export { exceptionMatches } from './pcPythonExecutorCore';

// ── Shared scope factory ──────────────────────────────────────────────────
function buildScope(
  deviceId: string | undefined,
  scriptArgs: string[],
  outputs: string[],
  onOutput: ((line: string, isAppend?: boolean) => void) | undefined,
  userInputs: string[]
): {
  scope: Record<string, unknown>;
  evaluateExpr: (expr: string) => unknown;
  pythonInput: (promptMsg: unknown) => string;
} {
  const formModule = createPythonFormModule(deviceId || 'default');
  const scene3DModule = createPython3DModule(deviceId || 'default');
  const audioModule = createPythonAudioModule(deviceId || 'default');
  let inputIdx = 0;

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
  return { scope, evaluateExpr, pythonInput };
}

// ── Synchronous executor ───────────────────────────────────────────────────
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

  const outputs: string[] = [];
  const { scope, evaluateExpr } = buildScope(deviceId, scriptArgs, outputs, onOutput, userInputs);

  const rawLines = script.split(/\r?\n/);
  const parsedLines = parseProgramLines(rawLines);
  const { statements: programAst } = parseBlockAt(parsedLines, 0, 0);

  const execStatementsSync = createSyncExecutor(scope, evaluateExpr, outputs, onOutput, checkExecutionTimeout);

  try {
    execStatementsSync(programAst);
  } catch (err) {
    if (err instanceof PythonInputRequiredException) {
      return { output: outputs.join('\n'), waitingForInput: true, inputPrompt: err.prompt };
    }
    return { output: outputs.join('\n'), error: err instanceof Error ? err.message : String(err) };
  }
  return { output: outputs.join('\n') };
}

// ── Async executor (supports time.sleep) ─────────────────────────────────
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

  const outputs: string[] = [];
  const { scope, evaluateExpr } = buildScope(deviceId, scriptArgs, outputs, onOutput, userInputs);

  const rawLines = script.split(/\r?\n/);
  const parsedLines = parseProgramLines(rawLines);
  const { statements: programAst } = parseBlockAt(parsedLines, 0, 0);

  const execStatementsSync = createSyncExecutor(scope, evaluateExpr, outputs, onOutput, checkExecutionTimeout);

  // Pre-scan for time.sleep at top level — run those asynchronously
  const hasSleep = rawLines.some(l => /^\s*time\.sleep\s*\(/.test(l));

  if (hasSleep) {
    // Run line-by-line to honour actual async sleep delays
    for (const line of rawLines) {
      const trimmed = line.trim().replace(/;+\s*$/, '');
      if (!trimmed || trimmed.startsWith('#')) continue;
      const sleepMatch = /^time\.sleep\s*\((.*)\)$/.exec(trimmed);
      if (sleepMatch) {
        try {
          const secVal = Number(evaluateExpr(sleepMatch[1]) || 0);
          if (secVal > 0) {
            const delayMs = Math.min(secVal, 10) * 1000;
            if (Date.now() + delayMs > deadline) {
              throw new PythonTimeoutException(`TimeoutError: Execution exceeded time limit of ${timeoutMs / 1000}s`);
            }
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
        } catch (err) {
          if (err instanceof PythonInputRequiredException) {
            return { output: outputs.join('\n'), waitingForInput: true, inputPrompt: err.prompt };
          }
          return { output: outputs.join('\n'), error: err instanceof Error ? err.message : String(err) };
        }
        continue;
      }
      try {
        execStatementsSync([{ type: 'line', text: trimmed }]);
      } catch (err) {
        if (err instanceof PythonInputRequiredException) {
          return { output: outputs.join('\n'), waitingForInput: true, inputPrompt: err.prompt };
        }
        return { output: outputs.join('\n'), error: err instanceof Error ? err.message : String(err) };
      }
    }
  } else {
    try {
      execStatementsSync(programAst);
    } catch (err) {
      if (err instanceof PythonInputRequiredException) {
        return { output: outputs.join('\n'), waitingForInput: true, inputPrompt: err.prompt };
      }
      return { output: outputs.join('\n'), error: err instanceof Error ? err.message : String(err) };
    }
  }

  await Promise.resolve();
  return { output: outputs.join('\n') };
}
