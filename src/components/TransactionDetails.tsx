import React from 'react';
import { motion } from 'motion/react';
import { X, Edit2, Calendar, Tag, CreditCard, Users, Heart, TrendingUp, DollarSign, MapPin, Utensils } from 'lucide-react';
import { Expense } from '../types';

interface TransactionDetailsProps {
  expense: Expense;
  onClose: () => void;
  onEdit: () => void;
}

export const TransactionDetails: React.FC<TransactionDetailsProps> = ({ expense, onClose, onEdit }) => {
  return (
    <>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60]"
      />
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed bottom-0 left-0 right-0 z-[60] bg-[#0a0a0a] border-t border-white/[0.08] rounded-t-[32px] p-6 flex flex-col max-h-[90vh] shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
      >
        <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6" />
        
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white tracking-tight">Transaction Details</h2>
          <div className="flex items-center gap-3">
            <button 
              onClick={onEdit}
              className="p-2.5 bg-blue-500/10 rounded-full text-blue-400 hover:text-blue-300 transition-colors border border-blue-500/20"
            >
              <Edit2 size={18} strokeWidth={1.5} />
            </button>
            <button 
              onClick={onClose} 
              className="p-2.5 bg-white/5 rounded-full text-white/50 hover:text-white transition-colors border border-white/5"
            >
              <X size={18} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-safe">
          <div className="flex flex-col items-center justify-center py-6 mb-6 bg-white/[0.02] rounded-3xl border border-white/[0.05]">
            <div className="w-16 h-16 bg-white/[0.05] border border-white/10 rounded-full flex items-center justify-center text-white/70 font-medium text-2xl mb-4">
              {expense.category?.charAt(0) || '?'}
            </div>
            <p className="text-4xl font-semibold text-white tracking-tight mb-2">
              RM {expense.amount.toFixed(2)}
            </p>
            <p className="text-sm text-white/50 font-medium">
              {expense.category === 'Food' && expense.description ? expense.description : expense.category}
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-white/[0.03] border border-white/[0.05] rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-white/60">
                  <Calendar size={18} strokeWidth={1.5} />
                  <span className="text-sm font-medium">Date</span>
                </div>
                <span className="text-sm text-white font-medium">
                  {new Date(expense.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
              
              <div className="h-px bg-white/[0.05]" />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-white/60">
                  <Tag size={18} strokeWidth={1.5} />
                  <span className="text-sm font-medium">Category</span>
                </div>
                <span className="text-sm text-white font-medium">{expense.category}</span>
              </div>

              <div className="h-px bg-white/[0.05]" />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-white/60">
                  <CreditCard size={18} strokeWidth={1.5} />
                  <span className="text-sm font-medium">Payment</span>
                </div>
                <span className="text-sm text-white font-medium">{expense.paymentMethod}</span>
              </div>
            </div>

            {expense.category === 'Food' && (expense.description || expense.restaurant || expense.tier) && (
              <div className="bg-white/[0.03] border border-white/[0.05] rounded-2xl p-4 space-y-4">
                {expense.description && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-white/60">
                      <Utensils size={18} strokeWidth={1.5} />
                      <span className="text-sm font-medium">Food Type</span>
                    </div>
                    <span className="text-sm text-white font-medium">{expense.description}</span>
                  </div>
                )}
                
                {expense.description && expense.restaurant && <div className="h-px bg-white/[0.05]" />}
                
                {expense.restaurant && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-white/60">
                      <MapPin size={18} strokeWidth={1.5} />
                      <span className="text-sm font-medium">Restaurant</span>
                    </div>
                    <span className="text-sm text-white font-medium">{expense.restaurant}</span>
                  </div>
                )}

                {(expense.description || expense.restaurant) && expense.tier && <div className="h-px bg-white/[0.05]" />}

                {expense.tier && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-white/60">
                      <DollarSign size={18} strokeWidth={1.5} />
                      <span className="text-sm font-medium">Price Tier</span>
                    </div>
                    <span className="text-sm text-white font-medium">{expense.tier}</span>
                  </div>
                )}
              </div>
            )}

            <div className="bg-white/[0.03] border border-white/[0.05] rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-white/60">
                  <Heart size={18} strokeWidth={1.5} />
                  <span className="text-sm font-medium">Type</span>
                </div>
                {expense.isNeed ? (
                  <span className="text-[10px] font-medium text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-md uppercase tracking-wider">Need</span>
                ) : (
                  <span className="text-[10px] font-medium text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-1 rounded-md uppercase tracking-wider">Want</span>
                )}
              </div>

              <div className="h-px bg-white/[0.05]" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-white/60">
                  <Users size={18} strokeWidth={1.5} />
                  <span className="text-sm font-medium">Shared</span>
                </div>
                <span className="text-sm text-white font-medium">{expense.sharedFlag ? 'Yes' : 'No'}</span>
              </div>

              {expense.sharedFlag && expense.collectedAmount > 0 && (
                <>
                  <div className="h-px bg-white/[0.05]" />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-white/60">
                      <DollarSign size={18} strokeWidth={1.5} />
                      <span className="text-sm font-medium">Collected</span>
                    </div>
                    <span className="text-sm text-green-400 font-medium">+RM {expense.collectedAmount.toFixed(2)}</span>
                  </div>
                </>
              )}

              <div className="h-px bg-white/[0.05]" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-white/60">
                  <Users size={18} strokeWidth={1.5} />
                  <span className="text-sm font-medium">Together</span>
                </div>
                <span className="text-sm text-white font-medium">{expense.togetherFlag ? 'Yes' : 'No'}</span>
              </div>

              <div className="h-px bg-white/[0.05]" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-white/60">
                  <TrendingUp size={18} strokeWidth={1.5} />
                  <span className="text-sm font-medium">Investment</span>
                </div>
                <span className="text-sm text-white font-medium">{expense.isInvestment ? 'Yes' : 'No'}</span>
              </div>
            </div>

            {expense.category !== 'Food' && expense.description && (
              <div className="bg-white/[0.03] border border-white/[0.05] rounded-2xl p-4">
                <div className="text-sm font-medium text-white/60 mb-2">Description</div>
                <p className="text-sm text-white">{expense.description}</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
};
