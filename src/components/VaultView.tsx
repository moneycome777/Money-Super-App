import React from 'react';
import { useStore } from '../store/useStore';
import { motion } from 'motion/react';
import { Shield, TrendingUp, DollarSign, Landmark, Lock } from 'lucide-react';

export const VaultView: React.FC = () => {
  const { expenses, toggleStealthMode } = useStore();
  
  const investmentStats = expenses.filter(e => e.isInvestment).reduce((acc, exp) => {
    acc.totalCost += exp.amount;
    return acc;
  }, { totalCost: 0 });

  const Card = ({ label, value, icon: Icon, color }: { label: string, value: string, icon: any, color: string }) => (
    <div className="bg-white/10 backdrop-blur-xl p-6 rounded-3xl border border-white/20 shadow-2xl">
      <div className={`p-3 rounded-2xl ${color} w-fit mb-4`}>
        <Icon size={24} />
      </div>
      <p className="text-sm font-bold text-white/60 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-3xl font-black text-white tracking-tight">{value}</p>
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 z-[100] bg-black p-6 flex flex-col overflow-y-auto"
    >
      <div className="flex justify-between items-center mb-12">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white">
            <Shield size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">The Vault</h2>
            <p className="text-xs font-bold text-white/40 uppercase tracking-widest">Stealth Mode Active</p>
          </div>
        </div>
        <button 
          onClick={toggleStealthMode}
          className="p-3 bg-white/10 rounded-full text-white/60 hover:text-white transition-colors"
        >
          <Lock size={20} />
        </button>
      </div>

      <div className="space-y-6">
        <Card 
          label="Investment Cost" 
          value={`RM ${investmentStats.totalCost.toFixed(2)}`} 
          icon={TrendingUp} 
          color="bg-blue-500 text-white" 
        />
        <Card 
          label="Net Worth" 
          value={`RM ${(investmentStats.totalCost + 15000).toFixed(2)}`} // Example static base + investments
          icon={Landmark} 
          color="bg-purple-500 text-white" 
        />
      </div>

      <div className="mt-auto pt-12 text-center">
        <p className="text-white/20 text-[10px] font-mono uppercase tracking-[0.2em]">
          Encrypted & Secure Session
        </p>
      </div>
    </motion.div>
  );
};
