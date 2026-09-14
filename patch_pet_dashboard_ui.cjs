const fs = require('fs');
let data = fs.readFileSync('src/components/PetDashboard.tsx', 'utf8');

const target = `          {/* Consumables Tracker Widget */}`;
const replacement = `          {/* Health Actions Widget */}
          {petHealth.length > 0 && (
            <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/[0.08] p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-white/50 px-1">
                <Activity size={14} className="text-pink-400" />
                <span className="text-[11px] font-medium uppercase tracking-wider">Health Actions Checklist</span>
              </div>
              <div className="space-y-2">
                {healthItems.map((item, i) => (
                  <div key={i} className="bg-white/[0.02] p-3 rounded-xl border border-white/[0.05] flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40">
                        {item.type.toLowerCase().includes('pill') || item.type.toLowerCase().includes('deworm') || item.type.toLowerCase().includes('kutu') ? <Pill size={14} /> : <Syringe size={14} />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{item.type}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className={\`text-[9px] font-medium px-1.5 py-0.5 rounded uppercase tracking-wider \${item.statusColor}\`}>
                            {item.daysUntil < 0 ? 'Overdue' : item.daysUntil <= 14 ? 'Due Soon' : 'Due'} {format(item.nextDate, 'd MMM')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 relative">
                      <button 
                        onClick={() => setShowDatePicker({ rowIndex: item.rowIndex!, date: format(new Date(), 'yyyy-MM-dd'), type: item.type })}
                        className="p-2.5 bg-white/5 rounded-full text-white/40 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors border border-white/5"
                      >
                        <CheckCircle2 size={18} strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Consumables Tracker Widget */}`;

data = data.replace(target, replacement);

const target2 = `      <AnimatePresence>
        {isAdding && <ExpenseForm initialExpense={{`;

const replacement2 = `      <AnimatePresence>
        {showDatePicker && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl"
            >
              <h3 className="text-lg font-semibold text-white mb-2">Complete Action</h3>
              <p className="text-sm text-white/50 mb-6">When did you administer {showDatePicker.type}?</p>
              
              <div className="mb-6">
                <input 
                  type="date"
                  value={showDatePicker.date}
                  onChange={(e) => setShowDatePicker({ ...showDatePicker, date: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50"
                />
              </div>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDatePicker(null)}
                  className="flex-1 py-3 px-4 rounded-xl font-medium text-white/60 bg-white/5 hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleHealthCheck(showDatePicker.rowIndex, showDatePicker.date)}
                  className="flex-1 py-3 px-4 rounded-xl font-medium text-white bg-emerald-600 hover:bg-emerald-500 transition-colors"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
        {isAdding && <ExpenseForm initialExpense={{`;

data = data.replace(target2, replacement2);
fs.writeFileSync('src/components/PetDashboard.tsx', data);
