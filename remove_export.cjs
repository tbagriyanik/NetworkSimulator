const fs = require('fs');
const file = 'src/components/network/NetworkTopology.tsx';
let lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);

const linesToKeep = [];
for (let i = 0; i < lines.length; i++) {
  const lineNum = i + 1;
  if (lineNum >= 2681 && lineNum <= 3040) {
    continue;
  }
  linesToKeep.push(lines[i]);
}

fs.writeFileSync(file, linesToKeep.join('\n'), 'utf8');
