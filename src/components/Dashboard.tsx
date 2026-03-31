import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { UOBWidget } from './UOBWidget';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Heart, ChevronRight, CheckCircle2, RefreshCw, X, Target, Coffee } from 'lucide-react';
import { Expense } from '../types';
import { TransactionDetails } from './TransactionDetails';
import { ExpenseForm } from './ExpenseForm';

export const Dashboard: React.FC = () => {
  const { getDashboardStats, expenses, updateExpense, appPin, setLoading, fetchExpenses, isLoading, monthlyBudget, setMonthlyBudget } = useStore();
  const stats = getDashboardStats();
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');

  const categories = ['All', ...Array.from(new Set(expenses.map(e => e.category)))];

  const filteredExpenses = [...expenses].reverse().filter(exp => {
    const matchesSearch = (exp.description || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (exp.category || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (exp.restaurant || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'All' || exp.category === filterCategory;
    return matchesSearch && matchesCategory;
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isSettingBudget, setIsSettingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState(monthlyBudget.toString());

  const budgetProgress = monthlyBudget > 0 ? Math.min((stats.monthlySpent / monthlyBudget) * 100, 100) : 0;
  const isOverBudget = monthlyBudget > 0 && stats.monthlySpent > monthlyBudget;

  const handleClearReceivable = async (rowIndex: number, amount: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/expenses/${rowIndex}/clear`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-app-pin': appPin || ''
        },
        body: JSON.stringify({ collectedAmount: amount })
      });
      
      if (response.ok) {
        updateExpense(rowIndex, { collectedAmount: amount });
      }
    } catch (error) {
      console.error("Failed to clear receivable:", error);
    } finally {
      setLoading(false);
    }
  };

  const receivables = expenses.filter(exp => exp.sharedFlag && (exp.amount / 2) > (exp.collectedAmount || 0));

  return (
    <div className="bg-[#030303] text-white min-h-screen relative">
      {/* Header */}
      <div className="px-6 pt-14 pb-6 mb-6 relative z-10">
        <div className="flex justify-between items-center mb-8">
          <div>
            <p className="text-sm font-medium text-white/50 uppercase tracking-wider mb-1">Total Balance</p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-medium text-white/40">RM</span>
              <h1 className="text-5xl font-semibold text-white tracking-tight">
                {stats.monthlySpent.toFixed(2)}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => fetchExpenses()}
              disabled={isLoading}
              className="w-10 h-10 bg-white/[0.03] border border-white/[0.08] backdrop-blur-md rounded-full flex items-center justify-center text-white transition-colors disabled:opacity-50 active:scale-95"
            >
              <RefreshCw size={18} strokeWidth={1.5} className={isLoading ? "animate-spin" : ""} />
            </button>
            <div className="h-10 px-4 bg-white/[0.03] border border-white/[0.08] backdrop-blur-md rounded-full flex items-center justify-center text-white font-medium text-sm tracking-wide">
              {new Date().toLocaleDateString('en-GB', { month: 'short' })}
            </div>
          </div>
        </div>

        {/* Budget Progress */}
        <div 
          onClick={() => setIsSettingBudget(true)}
          className="bg-white/[0.03] backdrop-blur-xl rounded-3xl p-5 border border-white/[0.08] cursor-pointer shadow-lg relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="flex justify-between items-end mb-3 relative z-10">
            <div className="flex items-center gap-2 text-white/60">
              <Target size={16} strokeWidth={1.5} />
              <span className="text-xs font-medium uppercase tracking-wider">Monthly Budget</span>
            </div>
            <div className="text-right">
              {monthlyBudget > 0 ? (
                <span className={`text-sm font-medium ${isOverBudget ? 'text-red-400' : 'text-white'}`}>
                  RM {stats.monthlySpent.toFixed(0)} <span className="text-white/40">/ {monthlyBudget}</span>
                </span>
              ) : (
                <span className="text-xs font-medium text-blue-400">Set Budget</span>
              )}
            </div>
          </div>
          {monthlyBudget > 0 && (
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden relative z-10">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${isOverBudget ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-blue-500 shadow-[0_0_10px_rgba(37,99,235,0.5)]'}`}
                style={{ width: `${budgetProgress}%` }}
              />
            </div>
          )}
        </div>
      </div>

      <div className="px-6 space-y-6 relative z-10">
        <UOBWidget />

        {/* Needs vs Wants */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/[0.03] backdrop-blur-xl p-5 rounded-3xl border border-white/[0.08] shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10" />
            <div className="flex items-center gap-3 mb-4 relative z-10">
              <div className="w-10 h-10 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400 border border-blue-500/20">
                <Target size={18} strokeWidth={1.5} />
              </div>
              <p className="text-xs font-medium text-white/50 uppercase tracking-wider">Needs</p>
            </div>
            <p className="text-2xl font-semibold text-white tracking-tight relative z-10">RM {stats.needsSpent.toFixed(2)}</p>
            <p className="text-[10px] text-white/40 mt-1 uppercase tracking-wider relative z-10">Mandatory</p>
          </div>
          <div className="bg-white/[0.03] backdrop-blur-xl p-5 rounded-3xl border border-white/[0.08] shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl -mr-10 -mt-10" />
            <div className="flex items-center gap-3 mb-4 relative z-10">
              <div className="w-10 h-10 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-400 border border-purple-500/20">
                <Coffee size={18} strokeWidth={1.5} />
              </div>
              <p className="text-xs font-medium text-white/50 uppercase tracking-wider">Wants</p>
            </div>
            <p className="text-2xl font-semibold text-white tracking-tight relative z-10">RM {stats.wantsSpent.toFixed(2)}</p>
            <p className="text-[10px] text-white/40 mt-1 uppercase tracking-wider relative z-10">Non-Mandatory</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/[0.03] backdrop-blur-xl p-5 rounded-3xl border border-white/[0.08] shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-500/10 rounded-2xl flex items-center justify-center text-orange-400 border border-orange-500/20">
                <Users size={18} strokeWidth={1.5} />
              </div>
              <p className="text-xs font-medium text-white/50 uppercase tracking-wider">Receivable</p>
            </div>
            <p className="text-2xl font-semibold text-white tracking-tight">RM {stats.receivable.toFixed(2)}</p>
          </div>
          <div className="bg-white/[0.03] backdrop-blur-xl p-5 rounded-3xl border border-white/[0.08] shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-pink-500/10 rounded-2xl flex items-center justify-center text-pink-400 border border-pink-500/20">
                <Heart size={18} strokeWidth={1.5} />
              </div>
              <p className="text-xs font-medium text-white/50 uppercase tracking-wider">Together</p>
            </div>
            <p className="text-2xl font-semibold text-white tracking-tight">RM {stats.togetherSpent.toFixed(2)}</p>
          </div>
        </div>

        {/* Pending Receivables */}
        {receivables.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider px-1">Pending Receivables</h3>
            <div className="space-y-3">
              {receivables.map((exp, i) => {
                const owed = (exp.amount / 2) - (exp.collectedAmount || 0);
                return (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={i} 
                    className="bg-white/[0.03] backdrop-blur-xl p-4 rounded-3xl border border-white/[0.08] shadow-lg flex justify-between items-center"
                  >
                    <div>
                      <p className="font-medium text-white">{exp.category}</p>
                      <p className="text-xs text-white/40 mt-1">{exp.description || new Date(exp.date).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="font-semibold text-white">RM {owed.toFixed(2)}</p>
                      <button 
                        onClick={() => exp.rowIndex && handleClearReceivable(exp.rowIndex, exp.amount / 2)}
                        className="p-2.5 bg-white/5 rounded-full text-white/40 hover:text-green-400 hover:bg-green-500/10 transition-colors border border-white/5"
                      >
                        <CheckCircle2 size={18} strokeWidth={1.5} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Expenses */}
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider">Recent Activity</h3>
            <button 
              onClick={() => setShowAllTransactions(true)}
              className="text-[11px] font-medium text-blue-400 flex items-center gap-1 active:opacity-70 tracking-wide uppercase"
            >
              View All <ChevronRight size={14} strokeWidth={1.5} />
            </button>
          </div>
          
          <div className="bg-white/[0.03] backdrop-blur-xl rounded-3xl border border-white/[0.08] shadow-lg overflow-hidden">
            {expenses.slice(-5).reverse().map((exp, i) => (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                key={i} 
                onClick={() => setSelectedExpense(exp)}
                className={`p-4 flex justify-between items-start cursor-pointer active:bg-white/[0.02] transition-colors ${i !== 0 ? 'border-t border-white/[0.05]' : ''}`}
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 bg-white/[0.05] border border-white/10 rounded-2xl flex items-center justify-center text-white/70 font-medium text-sm shrink-0 mt-0.5">
                    {exp.category?.charAt(0) || '?'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-white tracking-wide truncate">
                      {exp.category === 'Food' && exp.description ? exp.description : exp.category}
                    </p>
                    <p className="text-xs text-white/40 mt-0.5 truncate">
                      {exp.category === 'Food' && exp.restaurant ? `${exp.restaurant} • ` : ''}
                      {new Date(exp.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {exp.tier && <span className="text-[9px] font-medium text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">{exp.tier}</span>}
                      {exp.isNeed ? (
                        <span className="text-[9px] font-medium text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Need</span>
                      ) : (
                        <span className="text-[9px] font-medium text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Want</span>
                      )}
                      {exp.sharedFlag && <span className="text-[9px] font-medium text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Shared</span>}
                      {exp.togetherFlag && <span className="text-[9px] font-medium text-pink-400 bg-pink-500/10 border border-pink-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Together</span>}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="font-semibold text-white tracking-wide">-RM {exp.amount.toFixed(2)}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* All Transactions Modal */}
      <AnimatePresence>
        {showAllTransactions && (
          <motion.div 
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-50 bg-[#030303] flex flex-col"
          >
            <div className="bg-white/[0.03] backdrop-blur-xl px-6 pt-14 pb-4 border-b border-white/[0.08] flex flex-col shrink-0">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white tracking-tight">All Transactions</h2>
                <button 
                  onClick={() => setShowAllTransactions(false)}
                  className="p-2.5 bg-white/5 rounded-full text-white/50 hover:text-white transition-colors border border-white/5"
                >
                  <X size={18} strokeWidth={1.5} />
                </button>
              </div>
              
              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  placeholder="Search expenses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/[0.05] border border-white/10 rounded-2xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50 transition-colors"
                />
                <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setFilterCategory(cat)}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                        filterCategory === cat 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-white/5 text-white/50 hover:bg-white/10'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 pb-safe">
              <div className="bg-white/[0.03] backdrop-blur-xl rounded-3xl border border-white/[0.08] shadow-lg overflow-hidden">
                {filteredExpenses.length > 0 ? filteredExpenses.map((exp, i) => (
                  <div 
                    key={i} 
                    onClick={() => setSelectedExpense(exp)}
                    className={`p-4 flex justify-between items-start cursor-pointer active:bg-white/[0.02] transition-colors ${i !== 0 ? 'border-t border-white/[0.05]' : ''}`}
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 bg-white/[0.05] border border-white/10 rounded-2xl flex items-center justify-center text-white/70 font-medium text-sm shrink-0 mt-0.5">
                        {exp.category?.charAt(0) || '?'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-white tracking-wide truncate">
                          {exp.category === 'Food' && exp.description ? exp.description : exp.category}
                        </p>
                        <p className="text-xs text-white/40 mt-0.5 truncate">
                          {exp.category === 'Food' && exp.restaurant ? `${exp.restaurant} • ` : ''}
                          {new Date(exp.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {exp.tier && <span className="text-[9px] font-medium text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">{exp.tier}</span>}
                          {exp.isNeed ? (
                            <span className="text-[9px] font-medium text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Need</span>
                          ) : (
                            <span className="text-[9px] font-medium text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Want</span>
                          )}
                          {exp.sharedFlag && <span className="text-[9px] font-medium text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Shared</span>}
                          {exp.togetherFlag && <span className="text-[9px] font-medium text-pink-400 bg-pink-500/10 border border-pink-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Together</span>}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="font-semibold text-white tracking-wide">-RM {exp.amount.toFixed(2)}</p>
                    </div>
                  </div>
                )) : (
                  <div className="p-8 text-center text-white/40">
                    No expenses found matching your filters.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {selectedExpense && !isEditing && (
          <TransactionDetails 
            expense={selectedExpense} 
            onClose={() => setSelectedExpense(null)} 
            onEdit={() => setIsEditing(true)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isEditing && selectedExpense && (
          <ExpenseForm 
            initialExpense={selectedExpense}
            onClose={() => {
              setIsEditing(false);
              setSelectedExpense(null);
            }} 
          />
        )}
      </AnimatePresence>

      {/* Budget Modal */}
      <AnimatePresence>
        {isSettingBudget && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
          >
            <div className="bg-[#0a0a0a] w-full max-w-sm rounded-[32px] p-6 shadow-2xl border border-white/[0.08] relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent pointer-events-none" />
              <div className="relative z-10">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-white tracking-tight">Set Monthly Budget</h3>
                  <button onClick={() => setIsSettingBudget(false)} className="p-2 bg-white/5 rounded-full text-white/50 hover:text-white border border-white/5">
                    <X size={16} strokeWidth={1.5} />
                  </button>
                </div>
                
                <div className="space-y-5">
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-lg font-medium text-white/40">RM</span>
                    <input 
                      type="number" 
                      value={budgetInput}
                      onChange={e => setBudgetInput(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-14 pr-5 py-5 bg-white/[0.03] rounded-2xl border border-white/[0.08] outline-none text-2xl font-semibold text-white focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-white/20"
                    />
                  </div>
                  <button 
                    onClick={() => {
                      setMonthlyBudget(parseFloat(budgetInput) || 0);
                      setIsSettingBudget(false);
                    }}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-medium text-lg active:scale-[0.98] transition-all shadow-[0_0_30px_-5px_rgba(37,99,235,0.5)]"
                  >
                    Save Budget
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
