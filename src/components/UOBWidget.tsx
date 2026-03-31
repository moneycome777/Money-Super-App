import React from 'react';
import { useStore } from '../store/useStore';
import { motion } from 'motion/react';
import { CreditCard, Calendar } from 'lucide-react';

const MIN_THRESHOLD = 800; // Example threshold, adjust as needed

export const UOBWidget: React.FC = () => {
  const { getUOBCycle, getDashboardStats } = useStore();
  const cycle = getUOBCycle();
  const { uobSpent } = getDashboardStats();
  
  const progress = Math.min((uobSpent / MIN_THRESHOLD) * 100, 100);
  const gap = Math.max(MIN_THRESHOLD - uobSpent, 0);

  return (
    <div className="bg-gradient-to-br from-blue-900/40 to-blue-950/40 p-6 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] text-white relative overflow-hidden border border-blue-500/20 backdrop-blur-xl group">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl -mr-10 -mt-10 transition-opacity duration-500 group-hover:opacity-100 opacity-50" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/20 rounded-full blur-2xl -ml-10 -mb-10 transition-opacity duration-500 group-hover:opacity-100 opacity-50" />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center border border-blue-500/30">
              <CreditCard size={16} strokeWidth={1.5} className="text-blue-400" />
            </div>
            <h3 className="font-medium text-sm text-white tracking-wide">UOB One Card</h3>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-medium text-blue-200 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-full backdrop-blur-md uppercase tracking-wider">
            <Calendar size={12} strokeWidth={1.5} />
            <span>{cycle.daysRemaining} days left</span>
          </div>
        </div>

        <div className="space-y-5">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[11px] text-blue-200/60 uppercase tracking-wider mb-1.5">Current Spend</p>
              <p className="text-3xl font-semibold tracking-tight">RM {uobSpent.toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-blue-200/60 uppercase tracking-wider mb-1.5">Remaining</p>
              <p className="text-sm font-medium text-blue-400">RM {gap.toFixed(2)}</p>
            </div>
          </div>

          <div className="h-1.5 bg-blue-950/50 rounded-full overflow-hidden border border-blue-500/10">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full bg-blue-500 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.8)]"
            />
          </div>

          <div className="flex justify-between text-[10px] text-blue-200/40 font-medium uppercase tracking-wider">
            <span>{cycle.start.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
            <span>{cycle.end.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
