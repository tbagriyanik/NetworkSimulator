// pcFileSystem.ts
// Simple in‑memory file system persisted in localStorage per PC device.

import { secureStorage } from '@/lib/storage/secureStorage';

export type FSNode =
  | { type: 'dir'; children: Record<string, FSNode>; modifiedAt?: string }
  | { type: 'file'; content: string; size?: number; modifiedAt?: string; isExecutable?: boolean };

const DEFAULT_TIMESTAMP = '2026-08-25T08:00:00.000Z';

/** Create the default file system tree for a PC device. */
export function createDefaultFs(): FSNode {
  return {
    type: 'dir',
    modifiedAt: DEFAULT_TIMESTAMP,
    children: {
      'autoexec.bat': {
        type: 'file',
        content: `@ECHO OFF
PROMPT $P$G
SET PATH=C:\\;C:\\CODE
ECHO Network PC System Initialization Complete.
ECHO Type 'help' or 'dir' for available commands.`,
        size: 142,
        modifiedAt: DEFAULT_TIMESTAMP,
      },
      'config.sys': {
        type: 'file',
        content: `FILES=30
BUFFERS=20
DOS=HIGH,UMB`,
        size: 32,
        modifiedAt: DEFAULT_TIMESTAMP,
      },
      'boot.ini': {
        type: 'file',
        content: '[boot loader]\ntimeout=5\ndefault=multi(0)disk(0)rdisk(0)partition(1)\n[operating systems]\nmulti(0)disk(0)rdisk(0)partition(1)="Network Simulator OS" /fastdetect',
        size: 184,
        modifiedAt: DEFAULT_TIMESTAMP,
      },
      'names.txt': {
        type: 'file',
        content: 'Ahmet\nMehmet\nAyse\nFatma\n',
        size: 26,
        modifiedAt: DEFAULT_TIMESTAMP,
      },
      'body.txt': {
        type: 'file',
        content: 'Sistem güncelemelerimiz tamamlanmıştır. Detaylar için iletişime geçebilirsiniz.',
        size: 80,
        modifiedAt: DEFAULT_TIMESTAMP,
      },
      'data_file.txt': {
        type: 'file',
        content: 'Python\nNetwork Simulator\nList Comprehension Demo\n',
        size: 55,
        modifiedAt: DEFAULT_TIMESTAMP,
      },
      'www': {
        type: 'dir',
        modifiedAt: '2026-08-25T09:00:00.000Z',
        children: {
          'index.html': {
            type: 'file',
            content: '<h1>Merhaba Dunya! / Hello World!</h1>\n  <p>This page is served from C:\\www\\index.html</p>',
            size: 384,
            modifiedAt: '2026-08-25T09:00:00.000Z',
          },
        },
      },
      'upload': {
        type: 'dir',
        modifiedAt: '2026-08-25T09:15:00.000Z',
        children: {
          'welcome.txt': {
            type: 'file',
            content: `Welcome to the local FTP upload directory!\nAll uploaded and downloadable FTP files are stored here.`,
            size: 98,
            modifiedAt: '2026-08-25T09:15:00.000Z',
          },
          'sample.dat': {
            type: 'file',
            content: `01010011 01000001 01001101 01010000 01001100 01000101 00100000 01000100 01000001 01000100 01000001`,
            size: 89,
            modifiedAt: '2026-08-25T09:20:00.000Z',
          },
          'backup.config': {
            type: 'file',
            content: `# System Backup Configuration File\nVERSION=2.4.0\nAUTO_BACKUP=ENABLE\nLOG_LEVEL=VERBOSE`,
            size: 82,
            modifiedAt: '2026-08-25T09:25:00.000Z',
          },
        },
      },
      'mail': {
        type: 'dir',
        modifiedAt: '2026-08-25T10:00:00.000Z',
        children: {
          'inbox': {
            type: 'dir',
            modifiedAt: '2026-08-25T10:00:00.000Z',
            children: {
              'inbox.txt': {
                type: 'file',
                content: `From: admin@local.lan
To: user@local.lan
Subject: Welcome to Local Mail System
Date: Tue, 25 Aug 2026 10:00:00 +0300

Hello User,
Your mail account is configured and ready to send/receive messages.`,
                size: 215,
                modifiedAt: '2026-08-25T10:00:00.000Z',
              },
            },
          },
          'outbox': {
            type: 'dir',
            modifiedAt: '2026-08-25T10:00:00.000Z',
            children: {
              'outbox.txt': {
                type: 'file',
                content: `# Outgoing mail queue directory`,
                size: 30,
                modifiedAt: '2026-08-25T10:00:00.000Z',
              },
            },
          },
          'inbox.txt': {
            type: 'file',
            content: `From: admin@local.lan
To: user@local.lan
Subject: Welcome to Local Mail System
Date: Tue, 25 Aug 2026 10:00:00 +0300

Hello User,
Your mail account is configured and ready to send/receive messages.`,
            size: 215,
            modifiedAt: '2026-08-25T10:00:00.000Z',
          },
          'outbox.txt': {
            type: 'file',
            content: `# Outgoing mail queue directory`,
            size: 30,
            modifiedAt: '2026-08-25T10:00:00.000Z',
          },
          'welcome.eml': {
            type: 'file',
            content: `From: support@local.lan
To: client@local.lan
Subject: Mail Service Active

Mail files stored safely in C:\\mail\\ directory.`,
            size: 125,
            modifiedAt: '2026-08-25T10:05:00.000Z',
          },
        },
      },
      'code': {
        type: 'dir',
        modifiedAt: '2026-08-25T11:00:00.000Z',
        children: {
          'hello.py': {
            type: 'file',
            content: `# Hello World Script
print("Hello from Network Simulator!")
print("Running in C:\\\\code\\\\hello.py")
`,
            size: 106,
            modifiedAt: '2026-08-25T11:00:00.000Z',
          },
          'script.sh': {
            type: 'file',
            content: `#!/bin/bash
# Network Scan & Ping Test Script
echo "Starting System & Network Check..."
whoami
pwd
for i in 1 2 3; do ping 127.0.0.$i; done
echo "Network Check Complete."`,
            size: 168,
            isExecutable: true,
            modifiedAt: '2026-08-25T11:00:00.000Z',
          },
          'backup.sh': {
            type: 'file',
            content: `#!/bin/bash
echo "Creating backup of configuration files..."
date
uptime`,
            size: 78,
            isExecutable: false,
            modifiedAt: '2026-08-25T11:02:00.000Z',
          },
          'calculator.py': {
            type: 'file',
            content: `# Simple Calculator
def add(a, b):
    return a + b

def sub(a, b):
    return a - b

def mul(a, b):
    return a * b

def div(a, b):
    if b == 0:
        return "Error: Div by zero"
    return a / b

print("Calculator demo:")
print("10 + 5 =", add(10, 5))
print("20 - 4 =", sub(20, 4))
print("6 * 7 =", mul(6, 7))
print("50 / 5 =", div(50, 5))
`,
            size: 320,
            modifiedAt: '2026-08-25T11:05:00.000Z',
          },
          'network_ping.py': {
            type: 'file',
            content: `# Simulated Ping Diagnostic Script
target = "192.168.1.1"
print("Pinging " + target + " with 32 bytes of data:")
for i in range(4):
    print("Reply from " + target + ": bytes=32 time=1ms TTL=64")
print("Ping statistics for " + target + ": Packets: Sent = 4, Received = 4, Lost = 0")
`,
            size: 310,
            modifiedAt: '2026-08-25T11:10:00.000Z',
          },
          'fibonacci.py': {
            type: 'file',
            content: `# Fibonacci Sequence Generator
def fibonacci(n):
    a, b = 0, 1
    res = []
    for _ in range(n):
        res.append(a)
        a, b = b, a + b
    return res

print("First 10 Fibonacci numbers:", fibonacci(10))
`,
            size: 240,
            modifiedAt: '2026-08-25T11:15:00.000Z',
          },
          'names.txt': {
            type: 'file',
            content: 'Ahmet\nMehmet\nAyse\nFatma\n',
            size: 26,
            modifiedAt: '2026-08-25T11:20:00.000Z',
          },
          'body.txt': {
            type: 'file',
            content: 'Sistem güncelemelerimiz tamamlanmıştır. Detaylar için iletişime geçebilirsiniz.',
            size: 80,
            modifiedAt: '2026-08-25T11:20:00.000Z',
          },
        },
      },
    },
  };
}

/** Ensure default system folders & files exist on a given FS tree. */
export function ensureDefaultFsEntries(fs: FSNode): void {
  if (fs.type !== 'dir') return;

  const defaultTree = createDefaultFs();
  if (defaultTree.type !== 'dir') return;

  for (const [name, defaultNode] of Object.entries(defaultTree.children)) {
    if (!fs.children[name]) {
      fs.children[name] = defaultNode;
    } else if (fs.children[name].type === 'dir' && defaultNode.type === 'dir') {
      const childDir = fs.children[name];
      if (childDir.type === 'dir') {
        for (const [subName, subNode] of Object.entries(defaultNode.children)) {
          if (!childDir.children[subName]) {
            childDir.children[subName] = subNode;
          }
        }
      }
    }
  }
}

const fsStore: Record<string, FSNode> = {};

/** Load the file system for a given deviceId. */
export function loadFs(deviceId: string): FSNode {
  if (fsStore[deviceId]) {
    return fsStore[deviceId];
  }
  let fs: FSNode | null = null;
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = secureStorage.getItem(`pc_fs_${deviceId}`);
      if (raw) {
        fs = JSON.parse(raw) as FSNode;
      }
    } catch {
      // ignore corrupted data or storage restrictions
    }
  }

  if (!fs || fs.type !== 'dir') {
    fs = createDefaultFs();
    saveFs(deviceId, fs);
  } else {
    ensureDefaultFsEntries(fs);
  }

  fsStore[deviceId] = fs;
  return fs;
}

/** Persist the file system for a given deviceId. */
export function saveFs(deviceId: string, fs: FSNode): void {
  fsStore[deviceId] = fs;
  if (typeof localStorage !== 'undefined') {
    try {
      secureStorage.setItem(`pc_fs_${deviceId}`, JSON.stringify(fs));
    } catch {
      // ignore storage errors
    }
  }
}

/** Get list of files in C:\upload directory for FTP service. */
export function getFtpFilesFromUploadDir(deviceId: string): Array<{ name: string; size: number; modifiedAt: string }> {
  const fs = loadFs(deviceId);
  const entries = listDir(fs, 'C:\\upload');
  const files: Array<{ name: string; size: number; modifiedAt: string }> = [];
  for (const entryName of entries) {
    const details = getNodeDetails(fs, `C:\\upload\\${entryName}`);
    if (details && details.type === 'file') {
      files.push({
        name: entryName,
        size: details.size,
        modifiedAt: details.modifiedAt,
      });
    }
  }
  return files;
}

/** Resolve a possibly relative path against a current working directory. */
export function resolvePath(cwd: string, input: string): string {
  if (!input) return cwd;

  // Handle ~ (home directory) in Linux paths
  let cleanInput = input;
  if (cleanInput === '~' || cleanInput.startsWith('~/') || cleanInput.startsWith('~\\')) {
    cleanInput = cleanInput === '~' ? 'C:\\' : 'C:\\' + cleanInput.slice(2);
  }

  const isAbs = /^[a-zA-Z]:[\\/]/.test(cleanInput) || cleanInput.startsWith('\\') || cleanInput.startsWith('/');
  const base = isAbs ? '' : cwd.endsWith('\\') ? cwd : cwd + '\\';
  const combined = base + cleanInput;

  const driveMatch = /^[a-zA-Z]:/.exec(combined);
  const drive = driveMatch ? driveMatch[0] : 'C:';
  const pathWithoutDrive = combined.replace(/^[a-zA-Z]:/, '');

  const parts = pathWithoutDrive.split(/[\\/]+/).filter(Boolean);
  const stack: string[] = [];
  for (const part of parts) {
    if (part === '.') continue;
    if (part === '..') {
      if (stack.length > 0) stack.pop();
    } else {
      stack.push(part);
    }
  }
  return drive + '\\' + stack.join('\\');
}

/** Helper to traverse the FS tree and return the node at a given absolute path. */
export function getNode(fs: FSNode, path: string): FSNode | null {
  if (fs.type !== 'dir') return null;
  const pathWithoutDrive = path.replace(/^[a-zA-Z]:/, '');
  const parts = pathWithoutDrive.split(/[\\/]+/).filter(Boolean);
  let node: FSNode = fs;
  for (const part of parts) {
    if (node.type !== 'dir') return null;
    let child: FSNode | undefined = node.children[part];
    if (!child) {
      // Case-insensitive lookup fallback
      const partLower = part.toLowerCase();
      for (const k in node.children) {
        if (k.toLowerCase() === partLower) {
          child = node.children[k];
          break;
        }
      }
    }
    if (!child) return null;
    node = child;
  }
  return node;
}

/** Get detailed information about a node at a given path. */
export function getNodeDetails(
  fs: FSNode,
  path: string
): { type: 'dir' | 'file'; content?: string; size: number; modifiedAt: string } | null {
  const norm = path.replace(/^[a-zA-Z]:/, '');
  if (norm === '' || norm === '\\' || norm === '/') {
    return {
      type: 'dir',
      size: 0,
      modifiedAt: fs.modifiedAt || DEFAULT_TIMESTAMP,
    };
  }
  const node = getNode(fs, path);
  if (!node) return null;
  if (node.type === 'file') {
    const size = typeof node.size === 'number' ? node.size : node.content.length;
    return {
      type: 'file',
      content: node.content,
      size,
      modifiedAt: node.modifiedAt || DEFAULT_TIMESTAMP,
    };
  }
  return {
    type: 'dir',
    size: 0,
    modifiedAt: node.modifiedAt || DEFAULT_TIMESTAMP,
  };
}

/** Helper to split path into segments ignoring drive letter prefix. */
function getPathParts(p: string): string[] {
  const pathWithoutDrive = p.replace(/^[a-zA-Z]:/, '');
  return pathWithoutDrive.split(/[\\/]+/).filter(Boolean);
}

/** Check if a given path exists and is a directory. */
export function isDir(fs: FSNode, path: string): boolean {
  const norm = path.replace(/^[a-zA-Z]:/, '');
  if (norm === '' || norm === '\\' || norm === '/') return true;
  const node = getNode(fs, path);
  return node !== null && node.type === 'dir';
}

/** List directory entries (both files and folders) at the given absolute path. */
export function listDir(fs: FSNode, path: string): string[] {
  const node = getNode(fs, path);
  if (!node || node.type !== 'dir') return [];
  return Object.keys(node.children);
}

/** Create a directory at the given absolute path. */
export function makeDir(fs: FSNode, path: string): boolean {
  const parts = getPathParts(path);
  let cur: FSNode = fs;
  const now = new Date().toISOString();
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (cur.type !== 'dir') return false;
    if (!cur.children[part]) {
      cur.children[part] = { type: 'dir', children: {}, modifiedAt: now };
    } else if (cur.children[part].type !== 'dir') {
      return false; // exists as file
    }
    cur = cur.children[part];
  }
  return true;
}

/** Remove an empty directory at the given absolute path. */
export function removeDir(fs: FSNode, path: string): boolean {
  const parts = getPathParts(path);
  if (parts.length === 0) return false;
  const name = parts.pop()!;
  const parentPath = parts.join('\\');
  const parent = getNode(fs, parentPath);
  if (!parent || parent.type !== 'dir') return false;
  const target = parent.children[name];
  if (!target || target.type !== 'dir' || Object.keys(target.children).length > 0) return false;
  delete parent.children[name];
  return true;
}

/** Read file content at the given absolute path. */
export function readFile(fs: FSNode, path: string): string | null {
  const node = getNode(fs, path);
  return node && node.type === 'file' ? node.content : null;
}

/** Write (create or overwrite) a file at the given absolute path. */
export function writeFile(fs: FSNode, path: string, content: string): boolean {
  const parts = getPathParts(path);
  const name = parts.pop()!;
  const parentPath = parts.join('\\');
  const parent = getNode(fs, parentPath);
  if (!parent || parent.type !== 'dir') return false;
  const now = new Date().toISOString();
  const existingNode = parent.children[name];
  const existingExec = existingNode && existingNode.type === 'file' ? existingNode.isExecutable : undefined;
  parent.children[name] = {
    type: 'file',
    content,
    size: content.length,
    modifiedAt: now,
    ...(existingExec !== undefined ? { isExecutable: existingExec } : {}),
  };
  return true;
}

/** Delete a file at the given absolute path. */
export function deleteFile(fs: FSNode, path: string): boolean {
  const parts = getPathParts(path);
  const name = parts.pop()!;
  const parentPath = parts.join('\\');
  const parent = getNode(fs, parentPath);
  if (!parent || parent.type !== 'dir') return false;
  const node = parent.children[name];
  if (!node || node.type !== 'file') return false;
  delete parent.children[name];
  return true;
}

/** Copy a file from srcPath to destPath in FS. */
export function copyFile(fs: FSNode, srcPath: string, destPath: string): boolean {
  const srcNode = getNode(fs, srcPath);
  if (!srcNode || srcNode.type !== 'file') return false;

  let finalDestPath = destPath;
  if (isDir(fs, destPath)) {
    const srcName = getPathParts(srcPath).pop() || '';
    finalDestPath = resolvePath(destPath, srcName);
  }

  const parts = getPathParts(finalDestPath);
  if (parts.length === 0) return false;
  const name = parts.pop()!;
  const parentPath = parts.join('\\');
  const parent = getNode(fs, parentPath);
  if (!parent || parent.type !== 'dir') return false;

  const now = new Date().toISOString();
  parent.children[name] = {
    type: 'file',
    content: srcNode.content,
    size: srcNode.size ?? srcNode.content.length,
    modifiedAt: now,
    ...(srcNode.isExecutable !== undefined ? { isExecutable: srcNode.isExecutable } : {}),
  };
  return true;
}

/** Move a file or directory from srcPath to destPath in FS. */
export function moveNode(fs: FSNode, srcPath: string, destPath: string): boolean {
  const parts = getPathParts(srcPath);
  if (parts.length === 0) return false;
  const srcName = parts.pop()!;
  const parentPath = parts.join('\\');
  const srcParent = getNode(fs, parentPath);
  if (!srcParent || srcParent.type !== 'dir') return false;
  const targetNode = srcParent.children[srcName];
  if (!targetNode) return false;

  let finalDestPath = destPath;
  if (isDir(fs, destPath)) {
    finalDestPath = resolvePath(destPath, srcName);
  }

  const destParts = getPathParts(finalDestPath);
  if (destParts.length === 0) return false;
  const destName = destParts.pop()!;
  const destParentPath = destParts.join('\\');
  const destParent = getNode(fs, destParentPath);
  if (!destParent || destParent.type !== 'dir') return false;

  destParent.children[destName] = targetNode;
  delete srcParent.children[srcName];
  return true;
}

/** Rename a file or directory at targetPath to newName. */
export function renameNode(fs: FSNode, targetPath: string, newName: string): { success: boolean; error?: 'not_found' | 'exists' | 'invalid' } {
  const parts = getPathParts(targetPath);
  if (parts.length === 0) return { success: false, error: 'invalid' };
  const oldName = parts.pop()!;
  const parentPath = parts.join('\\');
  const parent = getNode(fs, parentPath);
  if (!parent || parent.type !== 'dir') return { success: false, error: 'not_found' };

  const targetNode = parent.children[oldName];
  if (!targetNode) return { success: false, error: 'not_found' };

  const cleanNewName = newName.replace(/^[a-zA-Z]:/, '').split(/[\\/]+/).filter(Boolean).pop() || newName;
  if (!cleanNewName) return { success: false, error: 'invalid' };

  if (parent.children[cleanNewName]) {
    return { success: false, error: 'exists' };
  }

  parent.children[cleanNewName] = targetNode;
  delete parent.children[oldName];
  return { success: true };
}

/** Sync HTTP Service content with C:\www\index.html */
export function syncHttpContentToFs(deviceId: string, content: string): void {
  const fs = loadFs(deviceId);
  makeDir(fs, 'C:\\www');
  writeFile(fs, 'C:\\www\\index.html', content);
  saveFs(deviceId, fs);
}

/** Sync Inbox & Sent Mail entries to C:\mail\inbox\ and C:\mail\outbox\ subfolders & files */
export function syncMailFilesToFs(
  deviceId: string,
  inbox: Array<{ from?: string; to?: string; subject: string; body: string; timestamp?: string }>,
  sent: Array<{ from?: string; to?: string; subject: string; body: string; timestamp?: string }>
): void {
  const fs = loadFs(deviceId);

  makeDir(fs, 'C:\\mail');
  makeDir(fs, 'C:\\mail\\inbox');
  makeDir(fs, 'C:\\mail\\outbox');

  const inboxText = inbox.length === 0
    ? '(No messages in Inbox)'
    : inbox.map((m, i) => `[Message #${i + 1}]\nFrom: ${m.from || 'Unknown'}\nTo: ${m.to || 'Me'}\nSubject: ${m.subject}\nDate: ${m.timestamp || new Date().toISOString()}\n\n${m.body}`).join('\n\n' + '='.repeat(40) + '\n\n');

  const sentText = sent.length === 0
    ? '(No messages in Sent/Outbox)'
    : sent.map((m, i) => `[Message #${i + 1}]\nTo: ${m.to || 'Unknown'}\nFrom: ${m.from || 'Me'}\nSubject: ${m.subject}\nDate: ${m.timestamp || new Date().toISOString()}\n\n${m.body}`).join('\n\n' + '='.repeat(40) + '\n\n');

  writeFile(fs, 'C:\\mail\\inbox.txt', inboxText);
  writeFile(fs, 'C:\\mail\\outbox.txt', sentText);
  writeFile(fs, 'C:\\mail\\inbox\\inbox.txt', inboxText);
  writeFile(fs, 'C:\\mail\\outbox\\outbox.txt', sentText);

  inbox.forEach((m, i) => {
    const fileName = `mail_${i + 1}.txt`;
    const mailContent = `From: ${m.from || 'Unknown'}\nTo: ${m.to || 'Me'}\nSubject: ${m.subject}\nDate: ${m.timestamp || new Date().toISOString()}\n\n${m.body}`;
    writeFile(fs, `C:\\mail\\inbox\\${fileName}`, mailContent);
  });

  sent.forEach((m, i) => {
    const fileName = `sent_${i + 1}.txt`;
    const mailContent = `To: ${m.to || 'Unknown'}\nFrom: ${m.from || 'Me'}\nSubject: ${m.subject}\nDate: ${m.timestamp || new Date().toISOString()}\n\n${m.body}`;
    writeFile(fs, `C:\\mail\\outbox\\${fileName}`, mailContent);
  });

  saveFs(deviceId, fs);
}

