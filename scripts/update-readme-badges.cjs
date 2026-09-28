const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const PACKAGE_PATH = path.join(ROOT_DIR, 'package.json');
const README_PATH = path.join(ROOT_DIR, 'README.md');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const DOC_DIR = path.join(ROOT_DIR, 'doc');
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.mjs', '.cjs']);

function countLines(dir) {
  let total = 0;
  let files = 0;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
        const sub = countLines(fullPath);
        total += sub.total;
        files += sub.files;
      } else if (entry.isFile() && EXTENSIONS.has(path.extname(entry.name))) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        total += content.split('\n').length;
        files++;
      }
    }
  } catch { /* ignore */ }
  return { total, files };
}

function countDocFiles(dir) {
  let files = 0;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        files += countDocFiles(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files++;
      }
    }
  } catch { /* ignore */ }
  return files;
}

const pkg = JSON.parse(fs.readFileSync(PACKAGE_PATH, 'utf-8'));
const version = pkg.version || '6.8.0';

const { total, files } = countLines(SRC_DIR);
const docFiles = countDocFiles(DOC_DIR);
const formatted = total.toLocaleString('en-US');

let readme = fs.readFileSync(README_PATH, 'utf-8');

console.log(`Synchronizing README from package.json (v${version}): ${files} src files, ${docFiles} doc files, ${formatted} lines`);

// 1. Match version badge: ![Version](https://img.shields.io/badge/version-6.8.0-blue)
const versionBadgeRegex = /(img\.shields\.io\/badge\/version-)[^-\s")]+(-blue)/;
if (versionBadgeRegex.test(readme)) {
  readme = readme.replace(versionBadgeRegex, `$1${version}$2`);
}

// 2. Match total lines badge: ![Total Lines](https://img.shields.io/badge/total--lines-~230k-lightgrey)
const badgeRegex = /(total--lines-)[^-\s")]+/;
if (badgeRegex.test(readme)) {
  readme = readme.replace(badgeRegex, `$1~${Math.round(total / 1000)}k`);
}

// 3. Match Version in Markdown Table: | Version / Sürüm | 6.8.0 |
const versionTableRegex = /(\|\s*Version[^|]*\|\s*)[^|\r\n]+(?=\|)/i;
if (versionTableRegex.test(readme)) {
  readme = readme.replace(versionTableRegex, `$1${version} `);
}

// 4. Match Total Lines in Markdown Table: | Total Lines / Toplam Satır (`src/`) | ~229,738 |
const tableRegex = /(\|\s*Total Lines[^|]*\|\s*)[^|\r\n]+(?=\|)/i;
if (tableRegex.test(readme)) {
  readme = readme.replace(tableRegex, `$1~${formatted} `);
}

// 5. Match Source Files in Markdown Table: | Source Files / Kaynak Dosya | 1113 |
const sourceFilesRegex = /(\|\s*Source Files[^|]*\|\s*)[^|\r\n]+(?=\|)/i;
if (sourceFilesRegex.test(readme)) {
  readme = readme.replace(sourceFilesRegex, `$1${files} `);
}

// 6. Match Documentation Files in Markdown Table: | Documentation Files / Dokümantasyon Dosya | 30 |
const docFilesRegex = /(\|\s*Documentation Files[^|]*\|\s*)[^|\r\n]+(?=\|)/i;
if (docFilesRegex.test(readme)) {
  readme = readme.replace(docFilesRegex, `$1${docFiles} `);
}

fs.writeFileSync(README_PATH, readme, 'utf-8');
console.log('README status and badges successfully synchronized.');