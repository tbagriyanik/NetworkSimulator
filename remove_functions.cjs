const fs = require('fs');
const file = 'src/components/network/NetworkTopology.tsx';
let lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);

const rangesToDelete = [
  [928, 947],
  [2661, 2780],
  [2836, 2863],
  [3259, 3264],
  [3329, 3343]
];

const linesToKeep = [];
for (let i = 0; i < lines.length; i++) {
  const lineNum = i + 1;
  let keep = true;
  for (const range of rangesToDelete) {
    if (lineNum >= range[0] && lineNum <= range[1]) {
      keep = false;
      break;
    }
  }
  if (keep) {
    linesToKeep.push(lines[i]);
  }
}

fs.writeFileSync(file, linesToKeep.join('\n'), 'utf8');
