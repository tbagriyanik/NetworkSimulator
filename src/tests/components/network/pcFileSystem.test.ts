import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadFs,
  saveFs,
  resolvePath,
  isDir,
  listDir,
  makeDir,
  removeDir,
  readFile,
  writeFile,
  deleteFile,
  copyFile,
  moveNode,
  renameNode,
} from '../../../components/network/pc-panel/pcFileSystem';

const mockStorage: Record<string, string> = {};

if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as unknown as { localStorage: unknown }).localStorage = {
    getItem: (key: string) => mockStorage[key] || null,
    setItem: (key: string, val: string) => { mockStorage[key] = val; },
    clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); },
    removeItem: (key: string) => { delete mockStorage[key]; },
    length: 0,
    key: () => null,
  };
}

describe('pcFileSystem tests', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined' && localStorage.clear) {
      localStorage.clear();
    }
  });

  it('should resolve relative and absolute paths correctly', () => {
    expect(resolvePath('C:\\', 'test')).toBe('C:\\test');
    expect(resolvePath('C:\\folder', '..')).toBe('C:\\');
    expect(resolvePath('C:\\folder', '.')).toBe('C:\\folder');
    expect(resolvePath('C:\\folder', 'C:\\other')).toBe('C:\\other');
  });

  it('should create and list directories in FS', () => {
    const fs = loadFs('pc-1');
    expect(listDir(fs, 'C:\\')).toEqual(['autoexec.bat', 'config.sys', 'boot.ini', 'names.txt', 'body.txt', 'data_file.txt', 'www', 'upload', 'mail', 'code']);

    makeDir(fs, 'C:\\myfolder');
    expect(listDir(fs, 'C:\\')).toContain('myfolder');
    expect(isDir(fs, 'C:\\myfolder')).toBe(true);

    removeDir(fs, 'C:\\myfolder');
    expect(listDir(fs, 'C:\\')).not.toContain('myfolder');
    expect(isDir(fs, 'C:\\myfolder')).toBe(false);
  });

  it('should write, read, and delete files in FS', () => {
    const fs = loadFs('pc-1');
    writeFile(fs, 'C:\\kod.py', 'print("Hello from PC")');
    saveFs('pc-1', fs);

    const loaded = loadFs('pc-1');
    expect(readFile(loaded, 'C:\\kod.py')).toBe('print("Hello from PC")');

    deleteFile(loaded, 'C:\\kod.py');
    expect(readFile(loaded, 'C:\\kod.py')).toBeNull();
  });

  it('should copy, move, and rename files/directories correctly', () => {
    const fs = loadFs('pc-test-fs');
    writeFile(fs, 'C:\\autoexec.bat', '@echo off\necho Test Boot');

    // Test copyFile
    const copied = copyFile(fs, 'C:\\autoexec.bat', 'C:\\autoexec.bak');
    expect(copied).toBe(true);
    expect(readFile(fs, 'C:\\autoexec.bak')).toBe('@echo off\necho Test Boot');

    // Test copyFile into directory
    const copyDir = copyFile(fs, 'C:\\autoexec.bat', 'C:\\code');
    expect(copyDir).toBe(true);
    expect(readFile(fs, 'C:\\code\\autoexec.bat')).toBe('@echo off\necho Test Boot');

    // Test moveNode
    const moved = moveNode(fs, 'C:\\autoexec.bak', 'C:\\code\\autoexec.ren');
    expect(moved).toBe(true);
    expect(readFile(fs, 'C:\\autoexec.bak')).toBeNull();
    expect(readFile(fs, 'C:\\code\\autoexec.ren')).toBe('@echo off\necho Test Boot');

    // Test renameNode
    const renamed = renameNode(fs, 'C:\\code\\autoexec.ren', 'boot.old');
    expect(renamed.success).toBe(true);
    expect(readFile(fs, 'C:\\code\\autoexec.ren')).toBeNull();
    expect(readFile(fs, 'C:\\code\\boot.old')).toBe('@echo off\necho Test Boot');
  });
});

