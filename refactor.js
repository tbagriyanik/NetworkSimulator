import fs from 'fs';

const path = 'f:/netsim2026/networksim/src/components/network/PCPanel.tsx';
let content = fs.readFileSync(path, 'utf8');

// The block to extract starts with "const parts = command.split(' ');"
// and ends right before "} else {\n      // Console (terminal) tab"

const startStr = "const parts = command.split(' ');";
const endStr = "} else {\n      // Console (terminal) tab";

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr);

if (startIndex === -1 || endIndex === -1) {
  console.log("Could not find start or end index.");
  process.exit(1);
}




