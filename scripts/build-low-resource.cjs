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

console.log('🚀 Starting Low-Resource Desktop Build...\n');

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
    console.log('📦 Backing up API directory...');
    copyFolderRecursiveSync(apiDir, tempDir);
    fs.rmSync(apiDir, { recursive: true, force: true });
    moved = true;
    console.log('✅ API directory backed up and removed\n');
  }

  console.log('🔨 Building Next.js with low-resource optimizations...');
  const nextBin = path.join(rootDir, 'node_modules', 'next', 'dist', 'bin', 'next');
  
  const buildEnv = {
    ...process.env,
    NEXT_EXPORT: 'true',
    NODE_ENV: 'production',
    // Low-resource optimizations
    NODE_OPTIONS: '--max-old-space-size=2048', // Limit Node.js memory to 2GB
  };

  execSync(`"${process.execPath}" "${nextBin}" build`, {
    cwd: rootDir,
    stdio: 'inherit',
    env: buildEnv,
  });
  
  console.log('\n✅ Next.js build completed successfully');

} catch (error) {
  console.error('\n❌ Build failed:', error.message);
  process.exit(1);
} finally {
  console.log('\n🔄 Restoring API directory...');
  if (moved && fs.existsSync(tempDir)) {
    if (fs.existsSync(apiDir)) {
      fs.rmSync(apiDir, { recursive: true, force: true });
    }
    copyFolderRecursiveSync(tempDir, apiDir);
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log('✅ API directory restored\n');
  }
}

console.log('🎉 Low-resource desktop build completed successfully!');
console.log('📝 Next steps:');
console.log('   - Run: npm run build:exe');
console.log('   - Output will be in: src-tauri/target/release/bundle/\n');