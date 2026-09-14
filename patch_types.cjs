const fs = require('fs');
let data = fs.readFileSync('src/types.ts', 'utf8');

data += `\nexport interface PetHealthEntry {
  id?: string;
  rowIndex?: number;
  type: string;
  lastConsumed: string;
  frequencyMonths: number;
}\n`;

fs.writeFileSync('src/types.ts', data);
