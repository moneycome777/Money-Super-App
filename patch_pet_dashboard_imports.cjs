const fs = require('fs');
let data = fs.readFileSync('src/components/PetDashboard.tsx', 'utf8');

const target = `import { Plus, Heart, AlertCircle, Calendar, RefreshCw, Syringe, Box, Clock, ChevronRight } from 'lucide-react';`;
const replacement = `import { Plus, Heart, AlertCircle, Calendar, RefreshCw, Syringe, Box, Clock, ChevronRight, Activity, Pill, CheckCircle2 } from 'lucide-react';`;

data = data.replace(target, replacement);
fs.writeFileSync('src/components/PetDashboard.tsx', data);
