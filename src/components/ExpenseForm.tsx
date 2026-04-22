import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Expense } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, X, CreditCard, Users, Heart, TrendingUp, DollarSign, Settings, Trash2, Target } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const ExpenseForm: React.FC<{ onClose: () => void, initialExpense?: Expense }> = ({ onClose, initialExpense }) => {
  const { addExpense, updateExpense, setLoading, appPin, categories, addCategory, removeCategory, foodTypes, restaurants, addFoodMaster, fetchExpenses } = useStore();
  const [isManagingCategories, setIsManagingCategories] = useState(false);
  const [isAddingNewFoodType, setIsAddingNewFoodType] = useState(false);
  const [isAddingNewRestaurant, setIsAddingNewRestaurant] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  
  const newFoodTypeRef = useRef<HTMLInputElement>(null);
  const newRestaurantRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAddingNewFoodType) {
      setTimeout(() => newFoodTypeRef.current?.focus(), 300);
    }
  }, [isAddingNewFoodType]);

  useEffect(() => {
    if (isAddingNewRestaurant) {
      setTimeout(() => newRestaurantRef.current?.focus(), 300);
    }
  }, [isAddingNewRestaurant]);

  const getLocalDateString = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  };

  const [formData, setFormData] = useState<Expense>(initialExpense || {
    date: getLocalDateString(),
    amount: 0,
    category: 'Food',
    paymentMethod: 'CASH/OTHER',
    sharedFlag: false,
    collectedAmount: 0,
    togetherFlag: false,
    isInvestment: false,
    isNeed: false,
    description: ''
  });

  const normalize = (str: string) => {
    return str.trim().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    let finalDescription = formData.description || '';
    let finalRestaurant = '';
    let finalTier = '';

    if (formData.category === 'Food') {
      finalDescription = normalize(finalDescription);
      finalRestaurant = normalize(formData.restaurant || '');
      
      const ppp = formData.sharedFlag ? formData.amount / 2 : formData.amount;
      finalTier = ppp > 50 ? '💰💰💰' : ppp >= 15 ? '💰💰' : '💰';

      if (isAddingNewFoodType && finalDescription) {
        await addFoodMaster('Food', finalDescription);
      }
      if (isAddingNewRestaurant && finalRestaurant) {
        await addFoodMaster('Restaurant', finalRestaurant);
      }
    }

    try {
      const payload = {
        values: [[
          formData.date,
          formData.amount,
          formData.category,
          formData.paymentMethod,
          formData.sharedFlag,
          formData.collectedAmount,
          formData.togetherFlag,
          formData.isInvestment,
          formData.isNeed,
          finalDescription,
          finalRestaurant,
          finalTier
        ]]
      };

      let response;
      if (initialExpense && initialExpense.rowIndex) {
        response = await fetch(`/api/expenses/${initialExpense.rowIndex}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'x-app-pin': appPin || ''
          },
          body: JSON.stringify(payload)
        });
      } else {
        response = await fetch('/api/expenses', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-app-pin': appPin || ''
          },
          body: JSON.stringify(payload)
        });
      }
      
      if (response.ok) {
        const finalExpense = {
          ...formData,
          description: finalDescription,
          restaurant: finalRestaurant,
          tier: finalTier
        };
        
        if (initialExpense && initialExpense.rowIndex) {
          updateExpense(initialExpense.rowIndex, finalExpense);
        } else {
          addExpense(finalExpense);
        }
        onClose();
        fetchExpenses();
      }
    } catch (error) {
      console.error("Save error:", error);
    } finally {
      setLoading(false);
    }
  };

  const Toggle = ({ 
    active, 
    onClick, 
    icon: Icon, 
    label 
  }: { 
    active: boolean, 
    onClick: () => void, 
    icon: any, 
    label: string 
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center p-3.5 rounded-2xl border transition-all duration-200 gap-2",
        active 
          ? "bg-blue-600 border-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]" 
          : "bg-white/[0.03] border-white/[0.08] text-white/50 hover:bg-white/[0.05] hover:text-white/80"
      )}
    >
      <Icon size={20} strokeWidth={1.5} />
      <span className="text-[10px] font-medium tracking-wide uppercase">{label}</span>
    </button>
  );

  return (
    <>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-md z-[70]"
      />
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.2}
        onDragEnd={(_, info) => {
          if (info.offset.y > 100) {
            onClose();
          }
        }}
        className="fixed bottom-0 left-0 right-0 z-[70] bg-[#0a0a0a] border-t border-white/[0.08] rounded-t-[32px] p-6 flex flex-col max-h-[90vh] shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
      >
        <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6" />
        
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white tracking-tight">{initialExpense ? 'Edit Expense' : 'Add Expense'}</h2>
          <button onClick={onClose} className="p-2.5 bg-white/5 rounded-full text-white/50 hover:text-white transition-colors border border-white/5">
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-5 overflow-y-auto pb-32">
          <div className="space-y-2">
            <label className="text-[11px] font-medium text-white/50 uppercase tracking-wider">Amount</label>
            <div className="relative">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-xl font-medium text-white/40">RM</span>
              <input
                type="tel"
                required
                className="w-full pl-14 pr-5 py-5 bg-white/[0.03] rounded-2xl border border-white/[0.08] text-3xl font-semibold text-white focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 outline-none transition-all placeholder:text-white/20"
                placeholder="0.00"
                value={formData.amount === 0 ? '' : formData.amount.toFixed(2)}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  if (!val) {
                    setFormData({ ...formData, amount: 0 });
                    return;
                  }
                  const amount = parseInt(val) / 100;
                  setFormData({ ...formData, amount });
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-medium text-white/50 uppercase tracking-wider">Category</label>
                <button 
                  type="button" 
                  onClick={() => setIsManagingCategories(true)}
                  className="text-[10px] font-medium text-blue-400 flex items-center gap-1 uppercase tracking-wider"
                >
                  <Settings size={12} strokeWidth={1.5} /> Manage
                </button>
              </div>
              <select
                className="w-full p-4 bg-white/[0.03] rounded-2xl border border-white/[0.08] outline-none font-medium text-white focus:border-blue-500/50 transition-all appearance-none"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                {[...categories].sort((a, b) => a === 'Food' ? -1 : b === 'Food' ? 1 : a.localeCompare(b)).map(cat => (
                  <option key={cat} value={cat} className="bg-[#141414] text-white">{cat}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-medium text-white/50 uppercase tracking-wider">Date</label>
              <input
                type="date"
                className="w-full p-4 bg-white/[0.03] rounded-2xl border border-white/[0.08] outline-none font-medium text-white focus:border-blue-500/50 transition-all [color-scheme:dark]"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
          </div>

          {formData.category === 'Food' ? (
            <>
              <div className="space-y-2">
                <label className="text-[11px] font-medium text-white/50 uppercase tracking-wider">Food Type</label>
                {isAddingNewFoodType ? (
                  <div className="flex gap-2">
                    <input
                      ref={newFoodTypeRef}
                      type="text"
                      className="flex-1 p-4 bg-white/[0.03] rounded-2xl border border-white/[0.08] outline-none font-medium text-white focus:border-blue-500/50 transition-all placeholder:text-white/20"
                      placeholder="e.g. Sushi, Thai..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                    <button 
                      type="button"
                      onClick={() => {
                        setIsAddingNewFoodType(false);
                        setFormData({ ...formData, description: '' });
                      }}
                      className="p-4 bg-white/[0.03] rounded-2xl border border-white/[0.08] text-white/50 hover:text-white"
                    >
                      <X size={20} />
                    </button>
                  </div>
                ) : (
                  <select
                    className="w-full p-4 bg-white/[0.03] rounded-2xl border border-white/[0.08] outline-none font-medium text-white focus:border-blue-500/50 transition-all appearance-none"
                    value={formData.description}
                    onChange={(e) => {
                      if (e.target.value === 'ADD_NEW') {
                        setIsAddingNewFoodType(true);
                        setFormData({ ...formData, description: '' });
                      } else {
                        setFormData({ ...formData, description: e.target.value });
                      }
                    }}
                  >
                    <option value="" disabled className="bg-[#141414] text-white/50">Select Food Type...</option>
                    <option value="ADD_NEW" className="bg-[#141414] text-blue-400 font-medium">+ Add New Food Type</option>
                    {[...foodTypes].sort((a, b) => a.localeCompare(b)).map(ft => (
                      <option key={ft} value={ft} className="bg-[#141414] text-white">{ft}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-medium text-white/50 uppercase tracking-wider">Restaurant</label>
                {isAddingNewRestaurant ? (
                  <div className="flex gap-2">
                    <input
                      ref={newRestaurantRef}
                      type="text"
                      className="flex-1 p-4 bg-white/[0.03] rounded-2xl border border-white/[0.08] outline-none font-medium text-white focus:border-blue-500/50 transition-all placeholder:text-white/20"
                      placeholder="e.g. Sushizanmai..."
                      value={formData.restaurant || ''}
                      onChange={(e) => setFormData({ ...formData, restaurant: e.target.value })}
                    />
                    <button 
                      type="button"
                      onClick={() => {
                        setIsAddingNewRestaurant(false);
                        setFormData({ ...formData, restaurant: '' });
                      }}
                      className="p-4 bg-white/[0.03] rounded-2xl border border-white/[0.08] text-white/50 hover:text-white"
                    >
                      <X size={20} />
                    </button>
                  </div>
                ) : (
                  <select
                    className="w-full p-4 bg-white/[0.03] rounded-2xl border border-white/[0.08] outline-none font-medium text-white focus:border-blue-500/50 transition-all appearance-none"
                    value={formData.restaurant || ''}
                    onChange={(e) => {
                      if (e.target.value === 'ADD_NEW') {
                        setIsAddingNewRestaurant(true);
                        setFormData({ ...formData, restaurant: '' });
                      } else {
                        setFormData({ ...formData, restaurant: e.target.value });
                      }
                    }}
                  >
                    <option value="" disabled className="bg-[#141414] text-white/50">Select Restaurant...</option>
                    <option value="ADD_NEW" className="bg-[#141414] text-blue-400 font-medium">+ Add New Restaurant</option>
                    {[...restaurants].sort((a, b) => a.localeCompare(b)).map(r => (
                      <option key={r} value={r} className="bg-[#141414] text-white">{r}</option>
                    ))}
                  </select>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <label className="text-[11px] font-medium text-white/50 uppercase tracking-wider">Description</label>
              <input
                type="text"
                className="w-full p-4 bg-white/[0.03] rounded-2xl border border-white/[0.08] outline-none font-medium text-white focus:border-blue-500/50 transition-all placeholder:text-white/20"
                placeholder="What was this for?"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          )}

          <div className="grid grid-cols-5 gap-2 mt-2">
            <Toggle 
              label="Need"
              active={formData.isNeed}
              onClick={() => setFormData({ ...formData, isNeed: !formData.isNeed })}
              icon={Target}
            />
            <Toggle 
              label="UOB One"
              active={formData.paymentMethod === 'UOB_ONE'}
              onClick={() => setFormData({ ...formData, paymentMethod: formData.paymentMethod === 'UOB_ONE' ? 'CASH/OTHER' : 'UOB_ONE' })}
              icon={CreditCard}
            />
            <Toggle 
              label="Shared"
              active={formData.sharedFlag}
              onClick={() => setFormData({ ...formData, sharedFlag: !formData.sharedFlag })}
              icon={Users}
            />
            <Toggle 
              label="Together"
              active={formData.togetherFlag}
              onClick={() => setFormData({ ...formData, togetherFlag: !formData.togetherFlag })}
              icon={Heart}
            />
            <Toggle 
              label="Invest"
              active={formData.isInvestment}
              onClick={() => setFormData({ ...formData, isInvestment: !formData.isInvestment })}
              icon={TrendingUp}
            />
          </div>

          <button
            type="submit"
            className="mt-6 w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-medium text-lg active:scale-[0.98] transition-all shadow-[0_0_30px_-5px_rgba(37,99,235,0.5)]"
          >
            {initialExpense ? 'Save Changes' : 'Save Expense'}
          </button>
        </form>
      </motion.div>
      <AnimatePresence>
        {isManagingCategories && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[80] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
          >
            <div className="bg-[#0a0a0a] w-full max-w-sm rounded-[32px] p-6 shadow-2xl border border-white/[0.08] relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent pointer-events-none" />
              <div className="relative z-10">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-white tracking-tight">Categories</h3>
                  <button type="button" onClick={() => setIsManagingCategories(false)} className="p-2.5 bg-white/5 rounded-full text-white/50 hover:text-white border border-white/5">
                    <X size={16} strokeWidth={1.5} />
                  </button>
                </div>
                
                <div className="space-y-3 mb-6 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                  {categories.map(cat => (
                    <div key={cat} className="flex justify-between items-center p-3.5 bg-white/[0.03] rounded-2xl border border-white/[0.08]">
                      <span className="font-medium text-white tracking-wide">{cat}</span>
                      <button 
                        type="button"
                        onClick={() => removeCategory(cat)}
                        className="text-red-400 p-2 hover:bg-red-500/10 rounded-xl transition-colors"
                      >
                        <Trash2 size={16} strokeWidth={1.5} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <input 
                    type="text" 
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                    placeholder="New category..."
                    className="flex-1 p-4 bg-white/[0.03] rounded-2xl border border-white/[0.08] outline-none font-medium text-white focus:border-blue-500/50 transition-all placeholder:text-white/20"
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      if (newCategory.trim()) {
                        addCategory(newCategory.trim());
                        setFormData({ ...formData, category: newCategory.trim() });
                        setNewCategory('');
                      }
                    }}
                    className="px-6 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-medium active:scale-95 transition-all shadow-[0_0_20px_-5px_rgba(37,99,235,0.5)]"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
