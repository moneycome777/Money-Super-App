import React, { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Heart, AlertCircle, Calendar, RefreshCw, Syringe, Box, Clock, ChevronRight, Activity, Pill, CheckCircle2, Scissors } from 'lucide-react';
import { ExpenseForm } from './ExpenseForm';
import { PetHistoryModal } from './PetHistoryModal';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { startOfMonth, endOfMonth, subMonths, format, startOfWeek, endOfWeek, subWeeks, isWithinInterval, differenceInDays, addDays, addWeeks, addMonths, isValid } from 'date-fns';

import { safeParseDate } from '../utils';

function safeFormat(date: Date | null, fmt: string, fallback = ''): string {
  if (!date || !isValid(date)) return fallback;
  try {
    return format(date, fmt);
  } catch {
    return fallback;
  }
}

export const PetDashboard: React.FC = () => {
  const { expenses = [], isLoading, petHealth = [], fetchPetHealth, updatePetHealth, fetchExpenses } = useStore();
  const [isAdding, setIsAdding] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState<{rowIndex: number, date: string, type: string} | null>(null);

  useEffect(() => {
    fetchPetHealth();
  }, [fetchPetHealth]);

  const handleHealthCheck = (rowIndex: number, date: string) => {
    updatePetHealth(rowIndex, date);
    setShowDatePicker(null);
  };
  const [showHistory, setShowHistory] = useState(false);
  const [trendView, setTrendView] = useState<'monthly' | 'weekly'>('monthly');

  const pets = React.useMemo(() => (Array.isArray(expenses) ? expenses : []).filter(e => e && e.category === 'Pet'), [expenses]);

  const sortedPets = React.useMemo(() => {
    return [...pets].sort((a, b) => {
      const da = safeParseDate(a.date)?.getTime() || 0;
      const db = safeParseDate(b.date)?.getTime() || 0;
      return db - da;
    });
  }, [pets]);
  
  // Calculate total spent this month
  const now = new Date();
  const currentMonthExp = sortedPets.filter(p => {
    const d = safeParseDate(p.date);
    return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const totalSpentMonth = currentMonthExp.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  // Reminders
  const reminders = sortedPets.filter(p => {
    if (!p.nextDueDate) return false;
    const d = safeParseDate(p.nextDueDate);
    return d !== null && isValid(d) && d >= new Date();
  }).map(p => {
    const d = safeParseDate(p.nextDueDate) || new Date();
    return {
      ...p,
      parsedNextDate: d,
      daysUntil: Math.ceil((d.getTime() - new Date().getTime()) / (1000 * 3600 * 24))
    };
  }).sort((a, b) => (a.daysUntil ?? 999) - (b.daysUntil ?? 999));

  const healthItems = (Array.isArray(petHealth) ? petHealth : []).map(item => {
    const rawType = item.type || 'Treatment';
    const isGrooming = rawType.toLowerCase().includes('grooming');
    const isBasicGrooming = rawType.toLowerCase().includes('basic grooming');
    const isFullGrooming = rawType.toLowerCase().includes('full grooming');

    // Label for recurrence interval
    let frequencyLabel = 'Recurring';
    if (isBasicGrooming) {
      frequencyLabel = 'Every 3 weeks';
    } else if (isFullGrooming) {
      frequencyLabel = 'Every 3 months';
    } else if (item.frequency && typeof item.frequency === 'string' && item.frequency.toLowerCase().includes('week')) {
      frequencyLabel = `Every ${item.frequency}`;
    } else if (item.frequencyMonths === 12) {
      frequencyLabel = 'Every year';
    } else if (item.frequencyMonths === 1) {
      frequencyLabel = 'Every month';
    } else if (item.frequencyMonths) {
      frequencyLabel = `Every ${item.frequencyMonths} months`;
    }

    const lastDate = safeParseDate(item.lastConsumed);

    if (!lastDate) {
      return {
        ...item,
        type: rawType,
        isGrooming,
        lastDate: null,
        nextDate: null,
        daysUntil: 9999,
        frequencyLabel,
        statusColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
        iconColor: 'text-amber-400',
        statusText: 'Needs Date'
      };
    }

    let nextDate: Date;
    try {
      if (isBasicGrooming) {
        nextDate = addWeeks(lastDate, 3);
      } else if (isFullGrooming) {
        nextDate = addMonths(lastDate, 3);
      } else if (item.frequency && typeof item.frequency === 'string' && item.frequency.toLowerCase().includes('week')) {
        const weeks = parseFloat(item.frequency) || 1;
        nextDate = addWeeks(lastDate, weeks);
      } else if (item.frequency && typeof item.frequency === 'string' && item.frequency.toLowerCase().includes('day')) {
        const days = parseFloat(item.frequency) || 1;
        nextDate = addDays(lastDate, days);
      } else {
        const months = item.frequencyMonths || (rawType.toLowerCase().includes('vaccine') ? 12 : rawType.toLowerCase().includes('deworm') ? 3 : 1);
        nextDate = addMonths(lastDate, months);
      }
    } catch {
      nextDate = lastDate;
    }

    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const isValidNextDate = nextDate && isValid(nextDate);
    const nextDateMidnight = isValidNextDate ? new Date(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate()) : null;
    const daysUntil = (nextDateMidnight && !isNaN(nextDateMidnight.getTime())) 
      ? Math.round((nextDateMidnight.getTime() - todayMidnight.getTime()) / (1000 * 3600 * 24))
      : 9999;
    
    let statusColor = 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    let iconColor = 'text-gray-400';
    let statusText = isValidNextDate ? `Due ${safeFormat(nextDate, 'd MMM')}` : 'Needs Date';

    if (daysUntil < 0) {
      statusColor = 'text-red-400 bg-red-500/10 border-red-500/20';
      iconColor = 'text-red-400';
      statusText = `Overdue (${Math.abs(daysUntil)}d)`;
    } else if (daysUntil === 0) {
      statusColor = 'text-orange-400 bg-orange-500/10 border-orange-500/20';
      iconColor = 'text-orange-400';
      statusText = 'Due Today';
    } else if (daysUntil <= 7) {
      statusColor = 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      iconColor = 'text-yellow-400';
      statusText = `Due in ${daysUntil}d (${safeFormat(nextDate, 'd MMM')})`;
    } else if (daysUntil <= 14) {
      statusColor = 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      iconColor = 'text-yellow-400';
      statusText = `Due ${safeFormat(nextDate, 'd MMM')}`;
    } else {
      statusColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      iconColor = 'text-emerald-400';
      statusText = `Due ${safeFormat(nextDate, 'd MMM')}`;
    }
    
    return { ...item, type: rawType, isGrooming, lastDate, nextDate, daysUntil, frequencyLabel, statusColor, iconColor, statusText };
  }).sort((a, b) => a.daysUntil - b.daysUntil);

  // Compute Trends Data
  const getStatsForInterval = (start: Date, end: Date) => {
    return pets.reduce((acc, exp) => {
      const expDate = safeParseDate(exp.date);
      if (expDate && isWithinInterval(expDate, { start, end })) {
        acc += (Number(exp.amount) || 0);
      }
      return acc;
    }, 0);
  };

  const monthlyTrendData = Array.from({ length: 6 }).map((_, i) => {
    const d = subMonths(new Date(), 5 - i);
    const start = startOfMonth(d);
    const end = endOfMonth(d);
    return {
      label: safeFormat(d, 'MMM'),
      total: getStatsForInterval(start, end),
    };
  });

  const weeklyTrendData = Array.from({ length: 8 }).map((_, i) => {
    const d = subWeeks(new Date(), 7 - i);
    const start = startOfWeek(d, { weekStartsOn: 1 });
    const end = endOfWeek(d, { weekStartsOn: 1 });
    return {
      label: safeFormat(start, 'd MMM'),
      total: getStatsForInterval(start, end),
    };
  });

  const activeTrendData = trendView === 'monthly' ? monthlyTrendData : weeklyTrendData;

  // Process Consumables
  const consumablesTracker = React.useMemo(() => {
    const consumableCategories = ['Food', 'Pee Pads'];
    
    const grouped = pets.reduce((acc, pet) => {
      const cat = pet.petCategory || 'Other';
      if (consumableCategories.includes(cat)) {
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(pet);
      }
      return acc;
    }, {} as Record<string, any[]>);

    const trackers = [];
    for (const [catName, anyEntries] of Object.entries(grouped)) {
      const entries = anyEntries as any[];
      // Get unique dates per category
      const uniqueDates = Array.from(new Set(entries.map(e => e.date)))
        .map(d => safeParseDate(d))
        .filter((d): d is Date => d !== null)
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
    return trackers.sort((a, b) => (b.lastDate?.getTime() || 0) - (a.lastDate?.getTime() || 0));
  }, [pets]);

  return (
    <div className="bg-[#030303] text-white min-h-screen relative flex flex-col">
      <div className="px-6 pt-14 pb-4 relative z-10 flex flex-col shrink-0">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-semibold text-white tracking-tight flex items-center gap-2">
            Pet Care <Heart className="text-pink-500 fill-pink-500/20" size={24} />
          </h2>
          <button 
            onClick={() => {
              fetchExpenses();
              fetchPetHealth(true);
            }}
            disabled={isLoading}
            className={`w-10 h-10 bg-white/[0.03] border border-white/[0.08] backdrop-blur-md rounded-full flex items-center justify-center transition-colors ${isLoading ? 'text-white/30' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
          >
            <RefreshCw size={18} strokeWidth={1.5} className={isLoading ? 'animate-spin' : ''} />
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

          {/* Health & Grooming Actions Checklist */}
          {healthItems.length > 0 && (
            <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/[0.08] p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-white/50 px-1">
                <Activity size={14} className="text-pink-400" />
                <span className="text-[11px] font-medium uppercase tracking-wider">Health & Grooming Reminders</span>
              </div>
              <div className="space-y-2">
                {healthItems.map((item, i) => (
                  <div key={i} className="bg-white/[0.02] p-3 rounded-xl border border-white/[0.05] flex justify-between items-center hover:border-white/10 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full ${item.isGrooming ? 'bg-purple-500/10 text-purple-400' : 'bg-pink-500/10 text-pink-400'} flex items-center justify-center shrink-0`}>
                        {item.isGrooming ? (
                          <Scissors size={15} />
                        ) : item.type.toLowerCase().includes('pill') || item.type.toLowerCase().includes('deworm') || item.type.toLowerCase().includes('kutu') ? (
                          <Pill size={15} />
                        ) : (
                          <Syringe size={15} />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-white">{item.type}</p>
                          <span className="text-[10px] text-white/40 bg-white/5 px-1.5 py-0.5 rounded font-mono">
                            {item.frequencyLabel}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[11px] text-white/50">
                            Last: <strong className="text-white/80 font-normal">{item.lastDate ? safeFormat(item.lastDate, 'd MMM yyyy') : 'Not set'}</strong>
                          </span>
                          <span className="text-white/20">•</span>
                          <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded uppercase tracking-wider ${item.statusColor}`}>
                            {item.statusText}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 relative shrink-0">
                      <button 
                        onClick={() => {
                          const dateVal = item.lastDate 
                            ? safeFormat(item.lastDate, 'yyyy-MM-dd') 
                            : safeFormat(new Date(), 'yyyy-MM-dd');
                          setShowDatePicker({ 
                            rowIndex: item.rowIndex || (i + 2), 
                            date: dateVal, 
                            type: item.type 
                          });
                        }}
                        title="Update date"
                        className="p-2.5 bg-white/5 rounded-full text-white/40 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors border border-white/5"
                      >
                        <CheckCircle2 size={18} strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                  const needsRefill = c.daysSinceLast >= c.avgDays * 0.9;
                  return (
                    <div key={i} className="bg-white/[0.02] p-3 rounded-xl border border-white/[0.05] flex justify-between items-center">
                      <div className="overflow-hidden pr-2">
                        <p className="text-sm font-medium text-white truncate" title={c.name}>{c.name}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Clock size={12} className="text-white/40" />
                          <span className="text-xs text-white/60">Estimated Refill: <strong className="text-white/90">{safeFormat(c.estimatedRefillDate, 'd MMM yyyy')}</strong></span>
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
                      <p className="text-xs text-white/40">{safeFormat(r.parsedNextDate, 'd MMM yyyy')}</p>
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
          <div className="h-44 w-full min-h-[176px]">
            <ResponsiveContainer width="100%" height={176}>
              <LineChart data={activeTrendData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="label" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis hide />
                <Tooltip 
                  formatter={(value: any) => `RM ${Number(value || 0).toFixed(2)}`}
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
                  <span className="text-xs text-white/40">{safeFormat(safeParseDate(log.date), 'd MMM')}</span>
                </div>
                <span className="font-semibold text-white tracking-wide">RM {(Number(log.amount) || 0).toFixed(2)}</span>
              </div>
              <p className="text-sm text-white/80 leading-relaxed font-medium">{log.description}</p>
              {log.nextDueDate && (
                <div className="flex items-center gap-1.5 mt-1 text-xs text-orange-400/80 bg-orange-400/10 w-fit px-2 py-0.5 rounded-full border border-orange-400/20">
                  <Calendar size={10} /> Next: {safeFormat(safeParseDate(log.nextDueDate), 'd MMM yyyy')}
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
        {showDatePicker && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl"
            >
              <h3 className="text-lg font-semibold text-white mb-2">Record Date</h3>
              <p className="text-sm text-white/50 mb-6">
                {(showDatePicker.type || '').toLowerCase().includes('grooming')
                  ? `When was ${showDatePicker.type} completed?`
                  : `When did you administer ${showDatePicker.type}?`}
              </p>
              
              <div className="mb-6">
                <input 
                  type="date"
                  value={showDatePicker.date}
                  onChange={(e) => setShowDatePicker({ ...showDatePicker, date: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50"
                />
              </div>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDatePicker(null)}
                  className="flex-1 py-3 px-4 rounded-xl font-medium text-white/60 bg-white/5 hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleHealthCheck(showDatePicker.rowIndex, showDatePicker.date)}
                  className="flex-1 py-3 px-4 rounded-xl font-medium text-white bg-emerald-600 hover:bg-emerald-500 transition-colors"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
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
