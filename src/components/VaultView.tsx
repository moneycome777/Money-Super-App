import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Lock, Plus, Search, ChevronDown, ChevronUp, CheckCircle2, Target, Calendar, DollarSign, X, PieChart as PieChartIcon } from 'lucide-react';
import { format, differenceInDays, parseISO, isValid } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6'];

export const VaultView: React.FC = () => {
  const { appPin, vaultPin, setVaultPin, toggleStealthMode, vaultEntries, fetchVaultEntries, hasFetchedVaultEntries } = useStore();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const isSettingPin = !vaultPin;
  const [error, setError] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingTarget, setIsAddingTarget] = useState(false);
  const [isAddingDeposit, setIsAddingDeposit] = useState<string | null>(null); // goalName
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);

  // Form states
  const [targetName, setTargetName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [targetMonthlyContribution, setTargetMonthlyContribution] = useState('');
  
  const [depositAmount, setDepositAmount] = useState('');
  const [depositDate, setDepositDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isUnlocked && !hasFetchedVaultEntries) {
      fetchVaultEntries();
    }
  }, [isUnlocked, hasFetchedVaultEntries, fetchVaultEntries]);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSettingPin) {
      if (pinInput.length < 4) {
        setError('PIN must be at least 4 digits');
        return;
      }
      if (pinInput !== confirmPinInput) {
        setError('PINs do not match');
        return;
      }
      setVaultPin(pinInput);
      setIsUnlocked(true);
      setError('');
    } else {
      if (pinInput === vaultPin) {
        setIsUnlocked(true);
        setError('');
      } else {
        setError('Invalid PIN');
        setPinInput('');
      }
    }
  };

  const handleAddTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetName) return;
    
    setIsSubmitting(true);
    try {
      const timestamp = new Date().toISOString();
      const values = [[timestamp, 'TARGET', targetName, targetAmount || '0', targetDate || '', targetMonthlyContribution || '0']];
      
      const response = await fetch('/api/vault', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-app-pin': appPin!
        },
        body: JSON.stringify({ values })
      });
      
      if (response.ok) {
        await fetchVaultEntries();
        setIsAddingTarget(false);
        setTargetName('');
        setTargetAmount('');
        setTargetDate('');
        setTargetMonthlyContribution('');
      }
    } catch (err) {
      console.error('Failed to add target', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAddingDeposit || !depositAmount || !depositDate) return;
    
    setIsSubmitting(true);
    try {
      const timestamp = new Date().toISOString();
      const values = [[timestamp, 'DEPOSIT', isAddingDeposit, depositAmount, depositDate]]; // Using depositDate in Due_Date column for deposit date
      
      const response = await fetch('/api/vault', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-app-pin': appPin!
        },
        body: JSON.stringify({ values })
      });
      
      if (response.ok) {
        await fetchVaultEntries();
        setIsAddingDeposit(null);
        setDepositAmount('');
        setDepositDate(format(new Date(), 'yyyy-MM-dd'));
      }
    } catch (err) {
      console.error('Failed to add deposit', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const goals = useMemo(() => {
    const targets = vaultEntries.filter(e => e.type === 'TARGET');
    const deposits = vaultEntries.filter(e => e.type === 'DEPOSIT');
    
    return targets.map(target => {
      const goalDeposits = deposits.filter(d => d.goalName === target.goalName);
      const totalSaved = goalDeposits.reduce((sum, d) => sum + d.amount, 0);
      
      const hasTarget = target.amount > 0;
      const progress = hasTarget ? Math.min(1, totalSaved / target.amount) : 0;
      const isCompleted = hasTarget && totalSaved >= target.amount;
      
      let monthsRemaining = 0;
      if (target.dueDate) {
        const due = parseISO(target.dueDate);
        if (isValid(due)) {
          monthsRemaining = Math.max(1, Math.ceil(differenceInDays(due, new Date()) / 30));
        }
      }
      
      const requiredMonthly = (isCompleted || !hasTarget || monthsRemaining === 0) ? 0 : (target.amount - totalSaved) / monthsRemaining;
      const monthlyContribution = target.monthlyContribution || 0;
      
      return {
        ...target,
        totalSaved,
        progress,
        isCompleted,
        hasTarget,
        monthsRemaining,
        requiredMonthly,
        monthlyContribution,
        history: goalDeposits.sort((a, b) => new Date(b.dueDate || b.timestamp).getTime() - new Date(a.dueDate || a.timestamp).getTime())
      };
    });
  }, [vaultEntries]);

  const filteredGoals = useMemo(() => {
    if (!searchQuery) return goals;
    const lowerQuery = searchQuery.toLowerCase();
    return goals.filter(g => g.goalName.toLowerCase().includes(lowerQuery));
  }, [goals, searchQuery]);

  const activeGoals = filteredGoals.filter(g => !g.isCompleted).sort((a, b) => {
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });
  
  const completedGoals = filteredGoals.filter(g => g.isCompleted);

  const totalWealth = goals.reduce((sum, g) => sum + g.totalSaved, 0);
  const nextGoalDue = activeGoals.filter(g => g.dueDate).length > 0 ? activeGoals.filter(g => g.dueDate)[0] : null;

  const chartData = useMemo(() => {
    return goals.filter(g => g.totalSaved > 0).map(g => ({
      name: g.goalName,
      value: g.totalSaved
    }));
  }, [goals]);

  if (!isUnlocked) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed inset-0 z-[200] bg-[#030303] p-6 flex flex-col items-center justify-center"
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 w-full max-w-xs">
          <div className="w-20 h-20 bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl rounded-3xl flex items-center justify-center text-purple-500 mx-auto mb-8 shadow-2xl">
            <Shield size={36} strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl font-semibold text-white tracking-tight mb-2 text-center">Stealth Vault</h1>
          <p className="text-sm text-white/50 mb-10 font-medium text-center">
            {isSettingPin ? 'Create a new PIN for your Vault' : 'Enter PIN to access secure savings'}
          </p>
          
          <form onSubmit={handlePinSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="relative">
                <input 
                  type="password" 
                  pattern="[0-9]*"
                  inputMode="numeric"
                  placeholder="••••••"
                  value={pinInput}
                  onChange={e => setPinInput(e.target.value)}
                  autoFocus
                  className="w-full py-5 bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl rounded-2xl outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 text-center text-3xl tracking-[0.5em] font-medium text-white transition-all placeholder:text-white/20"
                />
              </div>
              {isSettingPin && (
                <div className="relative">
                  <input 
                    type="password" 
                    pattern="[0-9]*"
                    inputMode="numeric"
                    placeholder="Confirm PIN"
                    value={confirmPinInput}
                    onChange={e => setConfirmPinInput(e.target.value)}
                    className="w-full py-5 bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl rounded-2xl outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 text-center text-3xl tracking-[0.5em] font-medium text-white transition-all placeholder:text-white/20"
                  />
                </div>
              )}
            </div>
            {error && <p className="text-red-400 text-sm font-medium text-center">{error}</p>}
            <button 
              type="submit"
              disabled={!pinInput || (isSettingPin && !confirmPinInput)}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white py-4 rounded-2xl font-medium text-lg active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:bg-purple-600 shadow-[0_0_40px_-10px_rgba(147,51,234,0.5)]"
            >
              {isSettingPin ? 'Set Vault PIN' : 'Unlock Vault'}
            </button>
            <button 
              type="button"
              onClick={toggleStealthMode}
              className="w-full py-4 text-white/50 hover:text-white transition-colors text-sm font-medium"
            >
              Cancel
            </button>
          </form>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 z-[200] bg-[#030303] flex flex-col"
    >
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none z-0" />
      
      {/* Header */}
      <div className="px-6 pt-14 pb-4 relative z-10 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center text-purple-400">
            <Shield size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Stealth Vault</h2>
            <p className="text-[10px] font-bold text-purple-400/60 uppercase tracking-widest">Encrypted Session</p>
          </div>
        </div>
        <button 
          onClick={toggleStealthMode}
          className="w-10 h-10 bg-white/[0.03] border border-white/[0.08] backdrop-blur-md rounded-full flex items-center justify-center text-white/60 hover:text-white transition-colors"
        >
          <Lock size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-24 relative z-10 space-y-6">
        {/* Top Summary Card */}
        <div className="bg-gradient-to-br from-purple-900/40 to-purple-600/10 border border-purple-500/20 rounded-3xl p-6 shadow-[0_0_40px_-10px_rgba(147,51,234,0.2)]">
          <p className="text-sm font-medium text-purple-200/60 uppercase tracking-wider mb-1">Total Wealth</p>
          <div className="flex items-baseline gap-1 mb-6">
            <span className="text-2xl font-medium text-purple-200/40">RM</span>
            <h1 className="text-5xl font-semibold text-white tracking-tight">{totalWealth.toFixed(2)}</h1>
          </div>
          
          {chartData.length > 0 && (
            <div className="h-48 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`RM ${value.toFixed(2)}`, 'Saved']}
                    contentStyle={{ backgroundColor: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {nextGoalDue && (
            <div className="bg-black/20 rounded-2xl p-4 border border-white/5 flex items-center gap-4">
              <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400 shrink-0">
                <Target size={18} />
              </div>
              <div>
                <p className="text-xs text-white/50 mb-0.5">Next Goal Due</p>
                <p className="text-sm font-medium text-white">{nextGoalDue.goalName}</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-xs text-white/50 mb-0.5">{nextGoalDue.dueDate ? format(parseISO(nextGoalDue.dueDate), 'MMM yyyy') : 'No Date'}</p>
                <p className="text-sm font-medium text-purple-400">{nextGoalDue.monthsRemaining} months left</p>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
            <input 
              type="text"
              placeholder="Search goals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl py-3 pl-11 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50"
            />
          </div>
          <button 
            onClick={() => setIsAddingTarget(true)}
            className="bg-purple-600 hover:bg-purple-500 text-white px-5 rounded-2xl font-medium flex items-center gap-2 transition-colors"
          >
            <Plus size={18} />
            <span>New Goal</span>
          </button>
        </div>

        {/* Active Goals */}
        <div className="space-y-4">
          {activeGoals.map(goal => (
            <div key={goal.goalName} className="bg-white/[0.03] border border-white/[0.08] rounded-3xl p-5">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">{goal.goalName}</h3>
                  <p className="text-xs text-white/50 flex items-center gap-1.5">
                    <Calendar size={12} />
                    {goal.dueDate ? format(parseISO(goal.dueDate), 'dd MMM yyyy') : 'No Due Date'}
                  </p>
                </div>
                <button 
                  onClick={() => setIsAddingDeposit(goal.goalName)}
                  className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1 transition-colors"
                >
                  <Plus size={14} /> RM
                </button>
              </div>
              
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-white/60">RM {goal.totalSaved.toFixed(2)}</span>
                  {goal.hasTarget && <span className="text-white font-medium">RM {goal.amount.toFixed(2)}</span>}
                </div>
                {goal.hasTarget && (
                  <>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${goal.progress * 100}%` }}
                        className="h-full bg-purple-500 rounded-full"
                      />
                    </div>
                    <div className="flex justify-between mt-2 text-[10px] text-white/40 uppercase tracking-wider">
                      <span>{(goal.progress * 100).toFixed(1)}% Complete</span>
                      {goal.monthlyContribution > 0 ? (
                        <span>Target: RM {goal.monthlyContribution.toFixed(0)} / month</span>
                      ) : goal.requiredMonthly > 0 ? (
                        <span>RM {goal.requiredMonthly.toFixed(0)} / month needed</span>
                      ) : null}
                    </div>
                  </>
                )}
              </div>

              {goal.history.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/5">
                  <button 
                    onClick={() => setExpandedHistory(expandedHistory === goal.goalName ? null : goal.goalName)}
                    className="w-full flex items-center justify-between text-xs text-white/50 hover:text-white/80 transition-colors"
                  >
                    <span>View All Deposits ({goal.history.length})</span>
                    {expandedHistory === goal.goalName ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  
                  <AnimatePresence>
                    {expandedHistory === goal.goalName && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-3 space-y-2">
                          {goal.history.map((dep, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-black/20 rounded-lg p-2.5">
                              <span className="text-xs text-white/60">
                                {dep.dueDate ? format(parseISO(dep.dueDate), 'dd MMM yyyy') : format(parseISO(dep.timestamp), 'dd MMM yyyy')}
                              </span>
                              <span className="text-sm font-medium text-green-400">+ RM {dep.amount.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Completed Goals */}
        {completedGoals.length > 0 && (
          <div className="pt-6">
            <h3 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-4 flex items-center gap-2">
              <CheckCircle2 size={16} /> Completed Goals
            </h3>
            <div className="space-y-4">
              {completedGoals.map(goal => (
                <div key={goal.goalName} className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-5 opacity-70">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-semibold text-white line-through decoration-white/30">{goal.goalName}</h3>
                    <span className="text-green-400 font-medium text-sm">RM {goal.amount.toFixed(2)}</span>
                  </div>
                  <div className="h-1.5 bg-green-500/20 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 w-full rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Target Modal */}
      <AnimatePresence>
        {isAddingTarget && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
          >
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full sm:max-w-md bg-[#111] border border-white/10 rounded-t-3xl sm:rounded-3xl p-6"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-white">New Savings Goal</h3>
                <button onClick={() => setIsAddingTarget(false)} className="text-white/40 hover:text-white">
                  <X size={24} />
                </button>
              </div>
              
              <form onSubmit={handleAddTarget} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2">Goal Name</label>
                  <input 
                    type="text"
                    required
                    value={targetName}
                    onChange={e => setTargetName(e.target.value)}
                    placeholder="e.g., Emergency Fund"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2">Target Amount (RM) <span className="text-white/30 lowercase">(Optional)</span></label>
                  <input 
                    type="number"
                    min="0"
                    step="0.01"
                    value={targetAmount}
                    onChange={e => setTargetAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2">Due Date <span className="text-white/30 lowercase">(Optional)</span></label>
                  <input 
                    type="date"
                    value={targetDate}
                    onChange={e => setTargetDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2">Monthly Contribution (RM) <span className="text-white/30 lowercase">(Optional)</span></label>
                  <input 
                    type="number"
                    min="0"
                    step="0.01"
                    value={targetMonthlyContribution}
                    onChange={e => setTargetMonthlyContribution(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500"
                  />
                </div>
                
                <button 
                  type="submit"
                  disabled={isSubmitting || !targetName}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white py-4 rounded-xl font-medium mt-6 disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? 'Saving...' : 'Create Goal'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Deposit Modal */}
      <AnimatePresence>
        {isAddingDeposit && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
          >
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full sm:max-w-md bg-[#111] border border-white/10 rounded-t-3xl sm:rounded-3xl p-6"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-white">Log Savings</h3>
                  <p className="text-sm text-purple-400">{isAddingDeposit}</p>
                </div>
                <button onClick={() => setIsAddingDeposit(null)} className="text-white/40 hover:text-white">
                  <X size={24} />
                </button>
              </div>
              
              <form onSubmit={handleAddDeposit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2">Amount (RM)</label>
                  <input 
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={depositAmount}
                    onChange={e => setDepositAmount(e.target.value)}
                    placeholder="0.00"
                    autoFocus
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500 text-2xl font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2">Date</label>
                  <input 
                    type="date"
                    required
                    value={depositDate}
                    onChange={e => setDepositDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 [color-scheme:dark]"
                  />
                </div>
                
                <button 
                  type="submit"
                  disabled={isSubmitting || !depositAmount || !depositDate}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white py-4 rounded-xl font-medium mt-6 disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? 'Saving...' : 'Add to Vault'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
