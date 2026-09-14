const fs = require('fs');
let data = fs.readFileSync('src/components/PetDashboard.tsx', 'utf8');

const target1 = `  const { expenses, isLoading } = useStore();
  const [isAdding, setIsAdding] = useState(false);`;

const replacement1 = `  const { expenses, isLoading, petHealth, fetchPetHealth, updatePetHealth } = useStore();
  const [isAdding, setIsAdding] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState<{rowIndex: number, date: string, type: string} | null>(null);

  useEffect(() => {
    fetchPetHealth();
  }, [fetchPetHealth]);

  const handleHealthCheck = (rowIndex: number, date: string) => {
    updatePetHealth(rowIndex, date);
    setShowDatePicker(null);
  };`;

const target2 = `  // Reminders
  const reminders = sortedPets.filter(p => p.nextDueDate && new Date(p.nextDueDate) >= new Date()).map(p => ({
    ...p,
    daysUntil: Math.ceil((new Date(p.nextDueDate!).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
  })).sort((a, b) => a.daysUntil - b.daysUntil);`;

const replacement2 = `  // Reminders
  const reminders = sortedPets.filter(p => p.nextDueDate && new Date(p.nextDueDate) >= new Date()).map(p => ({
    ...p,
    daysUntil: Math.ceil((new Date(p.nextDueDate!).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
  })).sort((a, b) => a.daysUntil - b.daysUntil);

  const healthItems = petHealth.map(item => {
    const lastDate = new Date(item.lastConsumed);
    const nextDate = new Date(lastDate);
    nextDate.setMonth(nextDate.getMonth() + item.frequencyMonths);
    const daysUntil = Math.ceil((nextDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24));
    
    let statusColor = 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    let iconColor = 'text-gray-400';
    if (daysUntil < 0) {
      statusColor = 'text-red-400 bg-red-500/10 border-red-500/20';
      iconColor = 'text-red-400';
    } else if (daysUntil <= 14) {
      statusColor = 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      iconColor = 'text-yellow-400';
    } else {
      statusColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      iconColor = 'text-emerald-400';
    }
    
    return { ...item, nextDate, daysUntil, statusColor, iconColor };
  }).sort((a, b) => a.daysUntil - b.daysUntil);`;

const target3 = `import { Heart, Activity, Calendar, Droplet, Plus, RefreshCw, ChevronRight, Syringe, Pill, Bone } from 'lucide-react';`;
const replacement3 = `import { Heart, Activity, Calendar, Droplet, Plus, RefreshCw, ChevronRight, Syringe, Pill, Bone, CheckCircle2 } from 'lucide-react';`;

data = data.replace(target1, replacement1);
data = data.replace(target2, replacement2);
data = data.replace(target3, replacement3);
fs.writeFileSync('src/components/PetDashboard.tsx', data);
