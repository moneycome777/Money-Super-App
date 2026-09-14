const fs = require('fs');
let data = fs.readFileSync('src/components/PetDashboard.tsx', 'utf8');

const target1 = `  const { expenses, isLoading, petHealth, fetchPetHealth, updatePetHealth } = useStore();`;
const replacement1 = `  const { expenses, isLoading, petHealth, fetchPetHealth, updatePetHealth, fetchExpenses } = useStore();`;

const target2 = `          <button 
            disabled={true}
            className="w-10 h-10 bg-white/[0.03] border border-white/[0.08] backdrop-blur-md rounded-full flex items-center justify-center text-white/50 opacity-50"
          >
            <RefreshCw size={18} strokeWidth={1.5} />
          </button>`;
const replacement2 = `          <button 
            onClick={() => {
              fetchExpenses();
              fetchPetHealth();
            }}
            disabled={isLoading}
            className={\`w-10 h-10 bg-white/[0.03] border border-white/[0.08] backdrop-blur-md rounded-full flex items-center justify-center transition-colors \${isLoading ? 'text-white/30' : 'text-white/70 hover:text-white hover:bg-white/10'}\`}
          >
            <RefreshCw size={18} strokeWidth={1.5} className={isLoading ? 'animate-spin' : ''} />
          </button>`;

data = data.replace(target1, replacement1);
data = data.replace(target2, replacement2);

fs.writeFileSync('src/components/PetDashboard.tsx', data);
