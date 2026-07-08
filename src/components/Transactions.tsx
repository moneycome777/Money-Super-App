import React, { useState } from 'react';
import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { useStore } from '../store/useStore';
import { motion, AnimatePresence } from 'motion/react';
import { Expense } from '../types';
import { TransactionDetails } from './TransactionDetails';
import { ExpenseForm } from './ExpenseForm';

import { getCreditCardDueDate } from '../utils';

export const Transactions: React.FC = () => {
  const { expenses, isBalanceHidden } = useStore();
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterMonthOnly, setFilterMonthOnly] = useState(true);
  const [historyMonth, setHistoryMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const categories = ['All', ...Array.from(new Set(expenses.map(e => e.category)))];

  const filteredExpenses = [...expenses].reverse().filter(exp => {
    const date = new Date(exp.date);
    const matchesSearch = (exp.description || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (exp.category || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (exp.restaurant || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'All' || exp.category === filterCategory;
    
    let matchesMonth = true;
    if (filterMonthOnly) {
      const [year, month] = historyMonth.split('-').map(Number);
      const targetStart = startOfMonth(new Date(year, month - 1));
      const targetEnd = endOfMonth(new Date(year, month - 1));
      matchesMonth = isWithinInterval(date, { start: targetStart, end: targetEnd });
    }
    
    return matchesSearch && matchesCategory && matchesMonth;
  });

  return (
    <div className="bg-[#030303] text-white min-h-screen relative flex flex-col">
      <div className="px-6 pt-14 pb-4 border-b border-white/[0.08] flex flex-col shrink-0 relative z-10">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-3xl font-semibold text-white tracking-tight">Transactions</h2>
        </div>
        
        <div className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="Search expenses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/[0.05] border border-white/10 rounded-2xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50 transition-colors"
          />
          <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar items-center">
            <button
              onClick={() => setFilterMonthOnly(!filterMonthOnly)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filterMonthOnly 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              {filterMonthOnly ? 'Month Only' : 'All History'}
            </button>
            
            {filterMonthOnly && (
              <input 
                type="month" 
                value={historyMonth}
                onChange={(e) => setHistoryMonth(e.target.value)}
                className="bg-white/10 border border-white/10 rounded-full px-3 py-1 text-xs text-white focus:outline-none focus:border-blue-500/50 [color-scheme:dark]"
              />
            )}
            
            <div className="w-px h-6 bg-white/10 mx-1 shrink-0 self-center" />
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
      
      <div className="flex-1 overflow-y-auto p-6 pb-32">
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
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-white tracking-wide truncate">
                      {exp.category === 'Food' && exp.description ? exp.description : exp.category}
                    </p>
                    {exp.isReimbursable && (
                      <span className="text-[9px] font-medium text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">Claim</span>
                    )}
                  </div>
                  <p className="text-xs text-white/40 mt-0.5 truncate">
                    {exp.category === 'Food' && exp.restaurant ? `${exp.restaurant} • ` : ''}
                    {new Date(exp.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {exp.paymentMethod === 'UOB_ONE' && !exp.isFunded && (
                      <span className="text-[9px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        💳 Due: {getCreditCardDueDate(exp.date).dueDateStr}
                      </span>
                    )}
                    {exp.paymentMethod === 'UOB_ONE' && exp.isFunded && (
                      <span className="text-[9px] font-medium text-emerald-400/50 bg-emerald-500/5 border border-emerald-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        ✓ Funded
                      </span>
                    )}
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
                <p className="font-semibold text-white tracking-wide">-RM {isBalanceHidden ? '***.**' : exp.amount.toFixed(2)}</p>
              </div>
            </div>
          )) : (
            <div className="p-8 text-center text-white/40">
              No expenses found matching your filters.
            </div>
          )}
        </div>
      </div>

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
    </div>
  );
};
