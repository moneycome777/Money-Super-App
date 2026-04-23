import React, { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Heart, AlertCircle, Calendar, RefreshCw, Syringe, Box, Clock, ChevronRight } from 'lucide-react';
import { ExpenseForm } from './ExpenseForm';
import { PetHistoryModal } from './PetHistoryModal';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { startOfMonth, endOfMonth, subMonths, format, startOfWeek, endOfWeek, subWeeks, isWithinInterval, differenceInDays, addDays } from 'date-fns';

export const PetDashboard: React.FC = () => {
  const { expenses, isLoading } = useStore();
  const [isAdding, setIsAdding] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [trendView, setTrendView] = useState<'monthly' | 'weekly'>('monthly');

  const pets = React.useMemo(() => expenses.filter(e => e.category === 'Pet'), [expenses]);

  const sortedPets = [...pets].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  // Calculate total spent this month
  const now = new Date();
  const currentMonthExp = sortedPets.filter(p => {
    const d = new Date(p.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const totalSpentMonth = currentMonthExp.reduce((acc, curr) => acc + curr.amount, 0);

  // Reminders
  const reminders = sortedPets.filter(p => p.nextDueDate && new Date(p.nextDueDate) >= new Date()).map(p => ({
    ...p,
    daysUntil: Math.ceil((new Date(p.nextDueDate!).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
  })).sort((a, b) => a.daysUntil - b.daysUntil);

  // Compute Trends Data
  const getStatsForInterval = (start: Date, end: Date) => {
    return pets.reduce((acc, exp) => {
      const expDate = new Date(exp.date);
      if (isWithinInterval(expDate, { start, end })) {
        acc += exp.amount;
      }
      return acc;
    }, 0);
  };

  const monthlyTrendData = Array.from({ length: 6 }).map((_, i) => {
    const d = subMonths(new Date(), 5 - i);
    const start = startOfMonth(d);
    const end = endOfMonth(d);
    return {
      label: format(d, 'MMM'),
      total: getStatsForInterval(start, end),
    };
  });

  const weeklyTrendData = Array.from({ length: 8 }).map((_, i) => {
    const d = subWeeks(new Date(), 7 - i);
    const start = startOfWeek(d, { weekStartsOn: 1 });
    const end = endOfWeek(d, { weekStartsOn: 1 });
    return {
      label: format(start, 'd MMM'),
      total: getStatsForInterval(start, end),
    };
  });

  const activeTrendData = trendView === 'monthly' ? monthlyTrendData : weeklyTrendData;

  // Process Consumables
  // We group items based purely on petCategory ('Food' or 'Pee Pads') 
  // without relying on description strings matching perfectly.
  const consumablesTracker = React.useMemo(() => {
    const consumableCategories = ['Food', 'Pee Pads'];
    
    const grouped = pets.reduce((acc, pet) => {
      const cat = pet.petCategory || 'Other';
      if (consumableCategories.includes(cat)) {
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(pet);
      }
      return acc;
    }, {} as Record<string, typeof pets>);

    const trackers = [];
    for (const [catName, entries] of Object.entries(grouped)) {
      // Get unique dates per category
      const uniqueDates = Array.from(new Set(entries.map(e => e.date)))
        .map(d => new Date(d))
        .sort((a, b) => a.getTime() - b.getTime());

      if (uniqueDates.length > 1) {
        let totalDays = 0;
        let intervals = 0;
        let lastDate = uniqueDates[uniqueDates.length - 1];
        
        for (let i = 1; i < uniqueDates.length; i++) {
          const daysDiff = differenceInDays(uniqueDates[i], uniqueDates[i - 1]);
          if (daysDiff > 0) {
            totalDays += daysDiff;
            intervals++;
          }
        }
        
        if (intervals > 0) {
          const avgDays = Math.round(totalDays / intervals);
          trackers.push({
            name: catName, 
            avgDays,
            lastDate,
            daysSinceLast: differenceInDays(new Date(), lastDate),
            estimatedRefillDate: addDays(lastDate, avgDays)
          });
        }
      }
    }
    return trackers.sort((a, b) => b.lastDate.getTime() - a.lastDate.getTime());
  }, [pets]);

  return (
    <div className="bg-[#030303] text-white min-h-screen relative flex flex-col">
      <div className="px-6 pt-14 pb-4 relative z-10 flex flex-col shrink-0">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-semibold text-white tracking-tight flex items-center gap-2">
            Pet Care <Heart className="text-pink-500 fill-pink-500/20" size={24} />
          </h2>
          <button 
            disabled={true}
            className="w-10 h-10 bg-white/[0.03] border border-white/[0.08] backdrop-blur-md rounded-full flex items-center justify-center text-white/50 opacity-50"
          >
            <RefreshCw size={18} strokeWidth={1.5} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 mb-2">
          {/* Main Stat Card */}
          <div className="bg-gradient-to-br from-pink-500/10 to-orange-500/5 border border-pink-500/20 rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Heart size={80} />
            </div>
            <p className="text-sm font-medium text-pink-400 mb-1">Total Spent This Month</p>
            <p className="text-4xl font-semibold text-white tracking-tight">RM {totalSpentMonth.toFixed(2)}</p>
          </div>

          {/* Consumables Tracker Widget */}
          <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/[0.08] p-4 flex flex-col gap-3">
            <div className="flex justify-between items-center px-1">
              <div className="flex items-center gap-2 text-white/50">
                <Box size={14} className="text-blue-400" />
                <span className="text-[11px] font-medium uppercase tracking-wider">Consumables Lifespan</span>
              </div>
            </div>
            {consumablesTracker.length > 0 ? (
              <div className="grid grid-cols-1 gap-2">
                {consumablesTracker.slice(0, 4).map((c, i) => {
                  const needsRefill = c.daysSinceLast >= c.avgDays * 0.9; // 90% threshold to warn
                  return (
                    <div key={i} className="bg-white/[0.02] p-3 rounded-xl border border-white/[0.05] flex justify-between items-center">
                      <div className="overflow-hidden pr-2">
                        <p className="text-sm font-medium text-white truncate" title={c.name}>{c.name}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Clock size={12} className="text-white/40" />
                          <span className="text-xs text-white/60">Estimated Refill: <strong className="text-white/90">{format(c.estimatedRefillDate, 'd MMM yyyy')}</strong></span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className={`text-[10px] font-medium px-2 py-0.5 rounded-full w-fit ml-auto ${needsRefill ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'}`}>
                          {needsRefill ? `Refill Soon` : `Lasts ~${c.avgDays}d`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-center border border-white/[0.05] rounded-xl border-dashed">
                <p className="text-[11px] text-white/40 leading-relaxed">Log "Food" or "Pee Pads" 2+ times on different dates to track refill schedules.</p>
              </div>
            )}
          </div>

          {/* Upcoming Reminders Widget */}
          {reminders.length > 0 && (
            <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/[0.08] p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-white/50 px-1">
                <AlertCircle size={14} className="text-orange-400" />
                <span className="text-[11px] font-medium uppercase tracking-wider">Upcoming Reminders</span>
              </div>
              {reminders.slice(0, 2).map((r, i) => (
                <div key={i} className="flex justify-between items-center bg-white/[0.02] p-3 rounded-xl border border-white/[0.05]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-400">
                      <Syringe size={14} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{r.description}</p>
                      <p className="text-xs text-white/40">{format(new Date(r.nextDueDate!), 'd MMM yyyy')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-orange-400">{r.daysUntil} days</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="px-6 mb-4 relative z-10">
        <div className="bg-white/[0.03] backdrop-blur-xl p-6 rounded-3xl border border-white/[0.08] shadow-lg">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider flex items-center gap-2">
              <RefreshCw size={12} /> Spending Trend
            </h3>
            <div className="flex bg-white/5 rounded-lg p-0.5 border border-white/10">
              <button 
                onClick={() => setTrendView('monthly')}
                className={`px-3 py-1 text-[10px] font-medium rounded-md transition-colors ${trendView === 'monthly' ? 'bg-white/10 text-white' : 'text-white/40'}`}
              >
                Monthly
              </button>
              <button 
                onClick={() => setTrendView('weekly')}
                className={`px-3 py-1 text-[10px] font-medium rounded-md transition-colors ${trendView === 'weekly' ? 'bg-white/10 text-white' : 'text-white/40'}`}
              >
                Weekly
              </button>
            </div>
          </div>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activeTrendData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="label" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis hide />
                <Tooltip 
                  formatter={(value: number) => `RM ${value.toFixed(2)}`}
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    backgroundColor: 'rgba(10, 10, 10, 0.9)',
                    backdropFilter: 'blur(10px)',
                    color: '#fff'
                  }}
                  itemStyle={{ color: '#ec4899', fontWeight: 600 }}
                  cursor={{ stroke: 'rgba(255,255,255,0.1)' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="total" 
                  stroke="#ec4899" 
                  strokeWidth={3}
                  dot={{ fill: '#ec4899', strokeWidth: 2, r: 4, stroke: '#030303' }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center px-6 mt-2 mb-2">
        <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider px-1">Log History</h3>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowHistory(true)}
            className="text-xs font-medium bg-white/[0.05] border border-white/[0.08] text-white/70 hover:text-white px-3 py-1.5 rounded-full transition-colors flex items-center gap-1"
          >
            View All <ChevronRight size={14} />
          </button>
          <button 
            onClick={() => setIsAdding(true)}
            className="text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-full transition-colors flex items-center gap-1"
          >
            <Plus size={14} /> Add Log
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-32">
        <div className="bg-white/[0.03] backdrop-blur-xl rounded-3xl border border-white/[0.08] shadow-lg overflow-hidden mb-2">
          {sortedPets.length > 0 ? sortedPets.slice(0, 5).map((log, i) => (
            <div 
              key={i} 
              className={`p-4 flex flex-col gap-2 ${i !== 0 ? 'border-t border-white/[0.05]' : ''}`}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className="px-2 py-0.5 rounded uppercase tracking-wider text-[9px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    {log.petCategory || 'Other'}
                  </div>
                  <span className="text-xs text-white/40">{format(new Date(log.date), 'd MMM')}</span>
                </div>
                <span className="font-semibold text-white tracking-wide">RM {log.amount.toFixed(2)}</span>
              </div>
              <p className="text-sm text-white/80 leading-relaxed font-medium">{log.description}</p>
              {log.nextDueDate && (
                <div className="flex items-center gap-1.5 mt-1 text-xs text-orange-400/80 bg-orange-400/10 w-fit px-2 py-0.5 rounded-full border border-orange-400/20">
                  <Calendar size={10} /> Next: {format(new Date(log.nextDueDate), 'd MMM yyyy')}
                </div>
              )}
            </div>
          )) : (
            <div className="p-8 text-center flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white/30">
                <Heart size={24} />
              </div>
              <p className="text-white/40 text-sm">No pet logs yet. Start tracking your furry friend's expenses!</p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isAdding && <ExpenseForm initialExpense={{
          date: new Date().toISOString().split('T')[0],
          amount: 0,
          category: 'Pet',
          paymentMethod: 'CASH/OTHER',
          sharedFlag: false,
          collectedAmount: 0,
          togetherFlag: false,
          isReimbursable: false,
          isNeed: false,
          description: '',
          petCategory: 'Food'
        }} onClose={() => setIsAdding(false)} />}
        {showHistory && <PetHistoryModal onClose={() => setShowHistory(false)} />}
      </AnimatePresence>
    </div>
  );
};
