import React from 'react';
import { useStore } from '../store/useStore';
import { calculateCreditCardLiability } from '../utils';
import { CreditCard, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

export const CreditCardLiabilityWidget: React.FC = () => {
  const { expenses, isBalanceHidden } = useStore();
  const liabilities = calculateCreditCardLiability(expenses);

  if (liabilities.length === 0) return null;

  const totalFunded = liabilities.reduce((sum, l) => sum + (l.fundedAmount || 0), 0);
  const totalAmount = liabilities.reduce((sum, l) => sum + (l.totalAmount || 0), 0);

  // Take the first two liabilities (upcoming and next)
  const upcoming = liabilities[0];
  const next = liabilities[1] || { dueDateStr: 'Future', amount: 0 };

  return (
    <div className="bg-gradient-to-br from-emerald-900/40 to-emerald-950/40 p-6 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] text-white relative overflow-hidden border border-emerald-500/20 backdrop-blur-xl group">
      <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl -mr-10 -mt-10 transition-opacity duration-500 group-hover:opacity-100 opacity-50" />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center border border-emerald-500/30">
              <CreditCard size={16} strokeWidth={1.5} className="text-emerald-400" />
            </div>
            <h3 className="font-medium text-sm text-white tracking-wide">Credit Card Liability</h3>
          </div>
          
          <div className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-200 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full backdrop-blur-md uppercase tracking-wider">
            <span>{isBalanceHidden ? '***.** / ***.**' : `${totalFunded.toFixed(2)} / ${totalAmount.toFixed(2)}`}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
            <div className="flex justify-between items-start mb-2">
              <p className="text-[10px] text-emerald-200/60 uppercase tracking-wider font-medium">Upcoming Due</p>
              <span className="text-[9px] font-bold text-emerald-900 bg-emerald-400 px-1.5 py-0.5 rounded">{upcoming.dueDateStr}</span>
            </div>
            <p className="text-2xl font-semibold tracking-tight text-white">
              RM {isBalanceHidden ? '***.**' : upcoming.amount.toFixed(2)}
            </p>
          </div>

          {next.amount > 0 && (
            <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
              <div className="flex justify-between items-start mb-2">
                <p className="text-[10px] text-emerald-200/40 uppercase tracking-wider font-medium">Following Due</p>
                <span className="text-[9px] font-bold text-white/40 bg-white/10 px-1.5 py-0.5 rounded">{next.dueDateStr}</span>
              </div>
              <p className="text-lg font-medium tracking-tight text-white/70 mt-2">
                RM {isBalanceHidden ? '***.**' : next.amount.toFixed(2)}
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2 text-[10px] text-emerald-200/60 uppercase tracking-wider font-medium bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
          <AlertCircle size={14} className="text-emerald-400 shrink-0" />
          <p>Ensure you have this amount sitting in your flexible fund for payment.</p>
        </div>
      </div>
    </div>
  );
};
