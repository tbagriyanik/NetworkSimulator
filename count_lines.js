import fs from 'fs';
import path from 'path';

function countLines(dir) {
  let totalLines = 0;
  let fileCount = 0;
  
  function walkDir(currentPath) {
    const files = fs.readdirSync(currentPath);
    
    for (const file of files) {
      const filePath = path.join(currentPath, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        walkDir(filePath);
      } else if (file.match(/\.(ts|tsx|js|jsx)$/)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').length;
        totalLines += lines;
        fileCount++;
        console.log(`${filePath}: ${lines} lines`);
      }
    }
  }
  
  walkDir(dir);
  console.log(`\nTotal files: ${fileCount}`);
  console.log(`Total lines: ${totalLines}`);
  return { fileCount, totalLines };
}

countLines('src');
