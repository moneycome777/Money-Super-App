import React from 'react';
import { motion } from 'motion/react';
import { X, Receipt, Lightbulb } from 'lucide-react';

interface ActionMenuProps {
  onClose: () => void;
  onSelectExpense: () => void;
  onSelectInsight: () => void;
}

export const ActionMenu: React.FC<ActionMenuProps> = ({ onClose, onSelectExpense, onSelectInsight }) => {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm"
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed bottom-0 left-0 right-0 z-[100] bg-[#111] border-t border-white/10 rounded-t-[32px] p-6 pb-12 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">Create New</h2>
          <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-white/50 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={onSelectInsight}
            className="flex flex-col items-center justify-center gap-3 p-6 bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.08] rounded-3xl transition-colors"
          >
            <div className="w-14 h-14 bg-yellow-500/20 rounded-full flex items-center justify-center text-yellow-400">
              <Lightbulb size={28} strokeWidth={1.5} />
            </div>
            <span className="font-medium text-white">Insight</span>
          </button>

          <button 
            onClick={onSelectExpense}
            className="flex flex-col items-center justify-center gap-3 p-6 bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.08] rounded-3xl transition-colors"
          >
            <div className="w-14 h-14 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400">
              <Receipt size={28} strokeWidth={1.5} />
            </div>
            <span className="font-medium text-white">Expense</span>
          </button>
        </div>
      </motion.div>
    </>
  );
};
