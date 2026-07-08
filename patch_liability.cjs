const fs = require('fs');
let data = fs.readFileSync('src/components/CreditCardLiabilityWidget.tsx', 'utf8');

const target1 = `  if (liabilities.length === 0) return null;

  // Take the first two liabilities (upcoming and next)
  const upcoming = liabilities[0];
  const next = liabilities[1] || { dueDateStr: 'Future', amount: 0 };`;

const replacement1 = `  if (liabilities.length === 0) return null;

  const totalFunded = liabilities.reduce((sum, l) => sum + (l.fundedAmount || 0), 0);
  const totalAmount = liabilities.reduce((sum, l) => sum + (l.totalAmount || 0), 0);

  // Take the first two liabilities (upcoming and next)
  const upcoming = liabilities[0];
  const next = liabilities[1] || { dueDateStr: 'Future', amount: 0 };`;

const target2 = `        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center border border-emerald-500/30">
            <CreditCard size={16} strokeWidth={1.5} className="text-emerald-400" />
          </div>
          <h3 className="font-medium text-sm text-white tracking-wide">Credit Card Liability</h3>
        </div>`;

const replacement2 = `        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center border border-emerald-500/30">
              <CreditCard size={16} strokeWidth={1.5} className="text-emerald-400" />
            </div>
            <h3 className="font-medium text-sm text-white tracking-wide">Credit Card Liability</h3>
          </div>
          
          <div className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-200 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full backdrop-blur-md uppercase tracking-wider">
            <span>{isBalanceHidden ? '***.** / ***.**' : \`\${totalFunded.toFixed(2)} / \${totalAmount.toFixed(2)}\`}</span>
          </div>
        </div>`;

data = data.replace(target1, replacement1);
data = data.replace(target2, replacement2);
fs.writeFileSync('src/components/CreditCardLiabilityWidget.tsx', data);
