const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Ensure Node.js install dir is present in PATH for child processes
if (process.platform === 'win32') {
  const nodeDir = 'C:\\Program Files\\nodejs';
  if (fs.existsSync(nodeDir) && !process.env.PATH.includes(nodeDir)) {
    process.env.PATH = `${nodeDir};${process.env.PATH}`;
  }
}

const rootDir = path.resolve(__dirname, '..');
const apiDir = path.join(rootDir, 'src', 'app', 'api');
const tempDir = path.join(rootDir, '_api_backup');

function copyFolderRecursiveSync(source, target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }
  const files = fs.readdirSync(source);
  for (const file of files) {
    const curSource = path.join(source, file);
    const curTarget = path.join(target, file);
    if (fs.lstatSync(curSource).isDirectory()) {
      copyFolderRecursiveSync(curSource, curTarget);
    } else {
      fs.copyFileSync(curSource, curTarget);
    }
  }
}

let moved = false;

try {
  if (fs.existsSync(apiDir)) {
    // 1. Copy api to backup outside of app router
    copyFolderRecursiveSync(apiDir, tempDir);
    // 2. Remove api directory so Next.js app router doesn't see it during static export
    fs.rmSync(apiDir, { recursive: true, force: true });
    moved = true;
  }

  // 3. Run static export build
  const nextBin = path.join(rootDir, 'node_modules', 'next', 'dist', 'bin', 'next');
  execSync(`"${process.execPath}" "${nextBin}" build`, {
    cwd: rootDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      NEXT_EXPORT: 'true',
    },
  });
} finally {
  // 4. Restore api directory
  if (moved && fs.existsSync(tempDir)) {
    if (fs.existsSync(apiDir)) {
      fs.rmSync(apiDir, { recursive: true, force: true });
    }
    copyFolderRecursiveSync(tempDir, apiDir);
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}
