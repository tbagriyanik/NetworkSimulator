import {
  PyFile,
  PyType,
} from './pcPythonRunnerHelpers';
import {
  loadFs,
  saveFs,
  readFile,
  writeFile,
  resolvePath,
  listDir,
  makeDir,
  deleteFile,
  isDir,
  getNode,
} from './pcFileSystem';

export function setupPythonStdLib(
  scope: Record<string, unknown>,
  devId: string,
  cwdRef: { value: string }
): void {
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
}
