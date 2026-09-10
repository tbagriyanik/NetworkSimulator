import { PyClass, PyInstance } from './pcPythonRunnerHelpers';

export function createPyInstance(cls: PyClass): PyInstance {
  return new PyInstance(cls);
}

export function isPyInstance(val: unknown): val is PyInstance {
  return val instanceof PyInstance;
}
