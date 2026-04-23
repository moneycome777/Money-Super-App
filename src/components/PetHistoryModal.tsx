import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, Calendar, Heart, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

export const PetHistoryModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { expenses } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(''); // YYYY-MM format

  const pets = React.useMemo(() => expenses.filter(e => e.category === 'Pet'), [expenses]);

  // Getting unique months for the filter
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    pets.forEach(p => {
      const d = new Date(p.date);
      const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.add(mStr);
    });
    return Array.from(months).sort().reverse();
  }, [pets]);

  // Filter logs based on search and selected month
  const filteredLogs = useMemo(() => {
    let result = [...pets];
    
    if (selectedMonth) {
      result = result.filter(p => {
        const d = new Date(p.date);
        const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return mStr === selectedMonth;
      });
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => 
        (p.description || '').toLowerCase().includes(q) || 
        (p.petCategory || '').toLowerCase().includes(q)
      );
    }

    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [pets, selectedMonth, searchQuery]);

  return (
    <>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100]"
      />
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed inset-x-0 bottom-0 top-12 z-[100] bg-[#0a0a0a] border-t border-white/[0.08] rounded-t-[32px] p-6 flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
      >
        <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6 shrink-0" />
        
        <div className="flex justify-between items-center mb-6 shrink-0">
          <h2 className="text-2xl font-semibold text-white tracking-tight">Full Log History</h2>
          <button 
            onClick={onClose} 
            className="p-2.5 bg-white/5 rounded-full text-white/50 hover:text-white transition-colors border border-white/5"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
            <input 
              type="text"
              placeholder="Search notes or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-pink-500/50 transition-colors"
            />
          </div>
          
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-pink-500/50 transition-colors outline-none appearance-none cursor-pointer"
          >
            <option value="" className="bg-[#141414] text-white">All Months</option>
            {availableMonths.map(m => {
              const [y, mo] = m.split('-');
              const date = new Date(Number(y), Number(mo) - 1, 1);
              return (
                <option key={m} value={m} className="bg-[#141414] text-white">
                  {format(date, 'MMM yyyy')}
                </option>
              );
            })}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar -mr-2">
          {filteredLogs.length > 0 ? (
            <div className="flex flex-col gap-3">
              {filteredLogs.map((log, i) => (
                <div 
                  key={i} 
                  className="bg-white/[0.03] p-4 rounded-2xl border border-white/[0.05] hover:bg-white/[0.05] transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <div className="px-2 py-0.5 rounded uppercase tracking-wider text-[9px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {log.petCategory || 'Other'}
                      </div>
                      <span className="text-xs text-white/40">{format(new Date(log.date), 'dd MMM yyyy')}</span>
                    </div>
                    <span className="font-semibold text-white tracking-wide">RM {log.amount.toFixed(2)}</span>
                  </div>
                  <p className="text-sm text-white/80 leading-relaxed max-w-[80%]">{log.description}</p>
                  {log.nextDueDate && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-orange-400/80 bg-orange-400/10 w-fit px-2 py-1 rounded-md border border-orange-400/20">
                      <Calendar size={12} /> Next reminder: {format(new Date(log.nextDueDate), 'dd MMM yyyy')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-white/30 pb-20">
              <Search size={32} />
              <p>No matching logs found</p>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
};
