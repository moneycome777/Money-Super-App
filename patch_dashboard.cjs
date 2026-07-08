const fs = require('fs');
let data = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

const target = `        {/* Recent Expenses */}`;
const replacement = `        {/* Pending Funding */}
        {unfundedExpenses.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-xs font-medium text-emerald-400/80 uppercase tracking-wider px-1">Pending Funding</h3>
            <div className="space-y-3">
              {unfundedExpenses.map((exp, i) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={\`unfunded-\${i}\`}
                  className="bg-white/[0.03] backdrop-blur-xl p-4 rounded-3xl border border-emerald-500/10 shadow-lg flex justify-between items-center"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-white">{exp.category}</p>
                      <span className="text-[9px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded uppercase tracking-wider">
                        UOB One
                      </span>
                    </div>
                    <p className="text-xs text-white/40 mt-1">{exp.description || new Date(exp.date).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="font-semibold text-white">RM {isBalanceHidden ? '***.**' : exp.amount.toFixed(2)}</p>
                    <button 
                      onClick={() => exp.rowIndex && handleFundExpense(exp.rowIndex)}
                      className="p-2.5 bg-white/5 rounded-full text-white/40 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors border border-white/5"
                    >
                      <CheckCircle2 size={18} strokeWidth={1.5} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Expenses */}`;

data = data.replace(target, replacement);
fs.writeFileSync('src/components/Dashboard.tsx', data);
