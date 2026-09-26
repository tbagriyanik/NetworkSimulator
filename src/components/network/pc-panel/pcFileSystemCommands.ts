import type { OutputLine, PcFile } from './PCPanel.types';
import {
  loadFs, saveFs, resolvePath, isDir, listDir, makeDir, removeDir,
  readFile, deleteFile, getNodeDetails,
  copyFile, moveNode, renameNode,
} from './pcFileSystem';

export interface HandlePcFsCommandsParams {
  deviceId: string;
  language: string;
  t: Record<string, string>;
  currentPath: string;
  setCurrentPath: React.Dispatch<React.SetStateAction<string>>;
  winPrevDirMap: Map<string, string>;
  pcLocalFiles: PcFile[];
  setPcLocalFiles: React.Dispatch<React.SetStateAction<PcFile[]>>;
  setEditingFile: React.Dispatch<React.SetStateAction<{ path: string; content: string } | null>>;
  emit: (type: OutputLine['type'], content: string, prompt?: string) => void;
}

export function handlePcFsCommand(
  cmd: string,
  args: string[],
  params: HandlePcFsCommandsParams
): boolean {
  const {
    deviceId, language, t, currentPath, setCurrentPath, winPrevDirMap,
    pcLocalFiles, setPcLocalFiles, setEditingFile, emit
  } = params;

  if (cmd === 'cd' || cmd === 'chdir') {
    const targetArg = args.join(' ').trim();
    if (targetArg === '-') {
      const prev = winPrevDirMap.get(deviceId);
      if (!prev) {
        emit('error', 'The system cannot find the previous directory path.');
        return true;
      }
      winPrevDirMap.set(deviceId, currentPath);
      setCurrentPath(prev);
      emit('output', prev);
    } else if (!targetArg || targetArg === '.') {
      emit('output', currentPath);
    } else {
      const fs = loadFs(deviceId);
      const targetPath = resolvePath(currentPath, targetArg);
      if (isDir(fs, targetPath)) {
        winPrevDirMap.set(deviceId, currentPath);
        setCurrentPath(targetPath);
      } else {
        emit('error', t.pathNotFound);
      }
    }
    return true;
  }

  if (cmd === 'md' || cmd === 'mkdir') {
    const folderName = args.join(' ').trim();
    if (!folderName) {
      emit('output', t.commandSyntaxError);
    } else {
      const fs = loadFs(deviceId);
      const targetPath = resolvePath(currentPath, folderName);
      const success = makeDir(fs, targetPath);
      if (success) {
        saveFs(deviceId, fs);
        emit('success', `Directory ${folderName} created.`);
      } else {
        emit('error', `A subdirectory or file ${folderName} already exists or path is invalid.`);
      }
    }
    return true;
  }

  if (cmd === 'rd' || cmd === 'rmdir') {
    const folderName = args.join(' ').trim();
    if (!folderName) {
      emit('output', t.commandSyntaxError);
    } else {
      const fs = loadFs(deviceId);
      const targetPath = resolvePath(currentPath, folderName);
      const success = removeDir(fs, targetPath);
      if (success) {
        saveFs(deviceId, fs);
        emit('success', `Directory ${folderName} removed.`);
      } else {
        emit('error', 'Directory not empty or cannot be found.');
      }
    }
    return true;
  }

  if (cmd === 'dir' || cmd === 'ls') {
    const fs = loadFs(deviceId);
    const flagArgs = args.filter(arg => /^[-/]/.test(arg));
    const showAll = flagArgs.some(flag => flag.toLowerCase().includes('a'));
    const targetArgs = args.filter(arg => !/^[-/]/.test(arg));
    const targetPath = targetArgs.length > 0 ? resolvePath(currentPath, targetArgs.join(' ')) : currentPath;

    if (!isDir(fs, targetPath)) {
      emit('error', t.pathNotFound);
    } else {
      const allEntries = listDir(fs, targetPath);
      const entries = allEntries.filter(name => showAll || !name.startsWith('.'));
      let totalFiles = 0;
      let totalSize = 0;
      let totalDirs = 2; // '.' and '..'
      const dirLines: string[] = [];

      const formatDate = (isoStr?: string) => {
        if (!isoStr) return '08/25/2026  08:00 AM';
        try {
          const d = new Date(isoStr);
          if (isNaN(d.getTime())) return '08/25/2026  08:00 AM';
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          const yyyy = d.getFullYear();
          let hours = d.getHours();
          const ampm = hours >= 12 ? 'PM' : 'AM';
          hours = hours % 12 || 12;
          const hh = String(hours).padStart(2, '0');
          const min = String(d.getMinutes()).padStart(2, '0');
          return `${mm}/${dd}/${yyyy}  ${hh}:${min} ${ampm}`;
        } catch {
          return '08/25/2026  08:00 AM';
        }
      };

      const rootDetails = getNodeDetails(fs, targetPath);
      const parentDetails = getNodeDetails(fs, resolvePath(targetPath, '..'));

      dirLines.push(`${formatDate(rootDetails?.modifiedAt)}    <DIR>          .`);
      dirLines.push(`${formatDate(parentDetails?.modifiedAt)}    <DIR>          ..`);

      for (const entryName of entries) {
        const fullEntryPath = resolvePath(targetPath, entryName);
        const details = getNodeDetails(fs, fullEntryPath);
        if (details) {
          const dateStr = formatDate(details.modifiedAt);
          if (details.type === 'file') {
            totalFiles++;
            totalSize += details.size;
            dirLines.push(`${dateStr}             ${details.size.toString().padStart(12)} ${entryName}`);
          } else {
            totalDirs++;
            dirLines.push(`${dateStr}    <DIR>          ${entryName}`);
          }
        }
      }

      const displayDir = targetPath.endsWith('\\') ? targetPath : `${targetPath}\\`;
      const dirOutput = ` Volume in drive C is OS\n Volume Serial Number is 1234-5678\n\n Directory of ${displayDir}\n\n${dirLines.join('\n')}\n               ${totalFiles} File(s)          ${totalSize.toLocaleString()} bytes\n               ${totalDirs} Dir(s)  100,000,000,000 bytes free`;
      emit('output', dirOutput);
    }
    return true;
  }

  if (cmd === 'type' || cmd === 'cat') {
    const fileArgs = args.filter(arg => !/^[-/]/.test(arg));
    if (fileArgs.length === 0) {
      emit('output', t.commandSyntaxError);
    } else {
      const fs = loadFs(deviceId);
      const outputs: string[] = [];
      const missing: string[] = [];
      for (const fileName of fileArgs) {
        const targetPath = resolvePath(currentPath, fileName);
        const content = readFile(fs, targetPath);
        if (content !== null) {
          outputs.push(content);
          continue;
        }
        const isRoot = currentPath === 'C:\\' || currentPath === 'C:';
        const localFile = isRoot ? pcLocalFiles.find(f => f.name.toLowerCase() === fileName.toLowerCase()) : null;
        if (localFile) {
          outputs.push(`[File ${localFile.name} (${localFile.size} bytes)]`);
        } else {
          missing.push(fileName);
        }
      }
      if (outputs.length > 0) emit('output', outputs.join('\n'));
      if (missing.length > 0) {
        emit('error', missing.length === 1 ? t.fileNotFound : `${t.fileNotFound}: ${missing.join(', ')}`);
      }
    }
    return true;
  }

  if (cmd === 'del' || cmd === 'delete' || cmd === 'rm') {
    const fileName = args.join(' ').trim();
    if (!fileName) {
      emit('output', t.commandSyntaxError);
    } else {
      const fs = loadFs(deviceId);
      const targetPath = resolvePath(currentPath, fileName);
      const deletedFS = deleteFile(fs, targetPath);
      const isRoot = currentPath === 'C:\\' || currentPath === 'C:';
      const localFileExists = isRoot && pcLocalFiles.some(f => f.name.toLowerCase() === fileName.toLowerCase());
      if (localFileExists) {
        setPcLocalFiles(prev => prev.filter(f => f.name.toLowerCase() !== fileName.toLowerCase()));
      }
      if (deletedFS || localFileExists) {
        if (deletedFS) saveFs(deviceId, fs);
        emit('success', 'File deleted successfully.');
      } else {
        emit('error', t.fileNotFound);
      }
    }
    return true;
  }

  if (cmd === 'copy') {
    if (args.length < 2) {
      emit('output', t.commandSyntaxError);
    } else {
      const fs = loadFs(deviceId);
      const srcPath = resolvePath(currentPath, args[0]);
      const destPath = resolvePath(currentPath, args[1]);
      const copied = copyFile(fs, srcPath, destPath);
      if (copied) {
        saveFs(deviceId, fs);
        emit('output', t.copySuccess);
      } else {
        emit('error', t.fileNotFound);
      }
    }
    return true;
  }

  if (cmd === 'move') {
    if (args.length < 2) {
      emit('output', t.commandSyntaxError);
    } else {
      const fs = loadFs(deviceId);
      const srcPath = resolvePath(currentPath, args[0]);
      const destPath = resolvePath(currentPath, args[1]);
      const moved = moveNode(fs, srcPath, destPath);
      if (moved) {
        saveFs(deviceId, fs);
        emit('output', t.moveSuccess);
      } else {
        emit('error', t.fileNotFound);
      }
    }
    return true;
  }

  if (cmd === 'ren' || cmd === 'rename') {
    if (args.length < 2) {
      emit('output', t.commandSyntaxError);
    } else {
      const fs = loadFs(deviceId);
      const targetPath = resolvePath(currentPath, args[0]);
      const res = renameNode(fs, targetPath, args[1]);
      if (res.success) {
        saveFs(deviceId, fs);
      } else if (res.error === 'exists') {
        emit('error', t.duplicateFileError);
      } else {
        emit('error', t.fileNotFound);
      }
    }
    return true;
  }

  if (cmd === 'edit' || cmd === 'notepad' || cmd === 'nano' || cmd === 'vim' || cmd === 'vi') {
    const rawFileName = args.join(' ').trim();
    const fileName = rawFileName || (language === 'tr' ? 'yeni_dosya.txt' : 'new_file.txt');
    const fs = loadFs(deviceId);
    const targetPath = resolvePath(currentPath, fileName);
    const existingContent = rawFileName ? (readFile(fs, targetPath) ?? '') : '';
    setEditingFile({ path: targetPath, content: existingContent });
    emit('output', rawFileName ? `Opening editor for ${fileName}...` : (language === 'tr' ? `Boş metin düzenleyicisi açılıyor (${fileName})...` : `Opening empty text editor (${fileName})...`));
    return true;
  }

  return false;
}
