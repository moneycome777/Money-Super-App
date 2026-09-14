const fs = require('fs');
let data = fs.readFileSync('src/store/useStore.ts', 'utf8');

const target1 = `  fetchWealthConfigs: () => Promise<void>;`;
const replacement1 = `  fetchWealthConfigs: () => Promise<void>;
  
  petHealth: PetHealthEntry[];
  hasFetchedPetHealth: boolean;
  fetchPetHealth: () => Promise<void>;
  updatePetHealth: (rowIndex: number, lastConsumed: string) => Promise<void>;`;

const target2 = `      hasFetchedWealthLogs: false,
      wealthConfigs: {},
      hasFetchedWealthConfigs: false,`;
const replacement2 = `      hasFetchedWealthLogs: false,
      wealthConfigs: {},
      hasFetchedWealthConfigs: false,
      petHealth: [],
      hasFetchedPetHealth: false,`;

const target3 = `} from '../types';`;
const replacement3 = `, PetHealthEntry } from '../types';`;

data = data.replace(target1, replacement1);
data = data.replace(target2, replacement2);
data = data.replace(target3, replacement3);

fs.writeFileSync('src/store/useStore.ts', data);
