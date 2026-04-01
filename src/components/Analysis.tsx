import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { isWithinInterval, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { RefreshCw, Target, Heart, Zap } from 'lucide-react';

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'];

export const Analysis: React.FC = () => {
  const { expenses, fetchExpenses, isLoading } = useStore();
  const [period, setPeriod] = useState<'monthly' | 'yearly' | 'compare'>('monthly');
  
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [compareMonth, setCompareMonth] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const getMonthInterval = (monthStr: string) => {
    const [year, month] = monthStr.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    return { start: startOfMonth(date), end: endOfMonth(date) };
  };

  const now = new Date();
  const currentInterval = period === 'yearly' 
    ? { start: startOfYear(now), end: endOfYear(now) }
    : getMonthInterval(selectedMonth);

  const getStatsForInterval = (start: Date, end: Date) => {
    return expenses.reduce((acc, exp) => {
      const expDate = new Date(exp.date);
      if (isWithinInterval(expDate, { start, end }) && !exp.isInvestment) {
        const amount = exp.sharedFlag ? exp.amount / 2 : exp.amount;
        acc.total += amount;
        acc.categories[exp.category] = (acc.categories[exp.category] || 0) + amount;
        
        if (exp.isNeed) acc.needs += amount;
        else acc.wants += amount;
        
        if (exp.togetherFlag) acc.together += exp.amount;
      }
      return acc;
    }, { total: 0, needs: 0, wants: 0, together: 0, categories: {} as Record<string, number> });
  };

  const currentStats = getStatsForInterval(currentInterval.start, currentInterval.end);
  const compareStats = period === 'compare' ? getStatsForInterval(getMonthInterval(compareMonth).start, getMonthInterval(compareMonth).end) : null;

  const data = Object.entries(currentStats.categories)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const compareData = period === 'compare' ? [
    { name: 'Total', current: currentStats.total, previous: compareStats?.total || 0 },
    { name: 'Needs', current: currentStats.needs, previous: compareStats?.needs || 0 },
    { name: 'Wants', current: currentStats.wants, previous: compareStats?.wants || 0 },
    { name: 'Together', current: currentStats.together, previous: compareStats?.together || 0 },
  ] : [];

  const formatMonthLabel = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  };

  return (
    <div className="bg-[#030303] text-white min-h-screen relative">
      <div className="px-6 pt-14 pb-6 mb-2 relative z-10 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold text-white tracking-tight">Analysis</h1>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => fetchExpenses()}
            disabled={isLoading}
            className="w-10 h-10 bg-white/[0.03] border border-white/[0.08] backdrop-blur-md rounded-full flex items-center justify-center text-white transition-colors disabled:opacity-50 active:scale-95"
          >
            <RefreshCw size={18} strokeWidth={1.5} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <div className="px-6 mb-6 relative z-10">
        <div className="bg-white/[0.03] border border-white/[0.08] p-1 rounded-2xl flex backdrop-blur-md overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setPeriod('monthly')}
            className={`flex-1 min-w-[80px] px-4 py-2 rounded-xl text-xs font-medium transition-all ${period === 'monthly' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'text-white/40 hover:text-white/70'}`}
          >
            Month
          </button>
          <button
            onClick={() => setPeriod('compare')}
            className={`flex-1 min-w-[80px] px-4 py-2 rounded-xl text-xs font-medium transition-all ${period === 'compare' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'text-white/40 hover:text-white/70'}`}
          >
            Compare
          </button>
          <button
            onClick={() => setPeriod('yearly')}
            className={`flex-1 min-w-[80px] px-4 py-2 rounded-xl text-xs font-medium transition-all ${period === 'yearly' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'text-white/40 hover:text-white/70'}`}
          >
            Year
          </button>
        </div>
      </div>

      {period !== 'yearly' && (
        <div className="px-6 mb-6 relative z-10 flex gap-3">
          <input 
            type="month" 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="flex-1 bg-white/[0.05] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50 [color-scheme:dark]"
          />
          {period === 'compare' && (
            <input 
              type="month" 
              value={compareMonth}
              onChange={(e) => setCompareMonth(e.target.value)}
              className="flex-1 bg-white/[0.05] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50 [color-scheme:dark]"
            />
          )}
        </div>
      )}

      <div className="px-6 space-y-6 relative z-10">
        {period === 'compare' ? (
          <div className="bg-white/[0.03] backdrop-blur-xl p-6 rounded-3xl border border-white/[0.08] shadow-lg">
            <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider mb-6 text-center">
              {formatMonthLabel(selectedMonth)} vs {formatMonthLabel(compareMonth)}
            </h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={compareData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `RM${val}`} />
                  <Tooltip 
                    formatter={(value: number) => `RM ${value.toFixed(2)}`}
                    contentStyle={{ 
                      borderRadius: '16px', 
                      border: '1px solid rgba(255,255,255,0.1)', 
                      backgroundColor: 'rgba(10, 10, 10, 0.9)',
                      backdropFilter: 'blur(10px)',
                      color: '#fff'
                    }}
                    itemStyle={{ color: '#fff', fontWeight: 500 }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                  <Bar dataKey="current" name={formatMonthLabel(selectedMonth)} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="previous" name={formatMonthLabel(compareMonth)} fill="#64748b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : data.length > 0 ? (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl p-4 border border-white/[0.08] flex flex-col items-center justify-center text-center">
                <Target size={20} className="text-blue-400 mb-2" strokeWidth={1.5} />
                <p className="text-[10px] font-medium text-white/50 uppercase tracking-wider mb-1">Needs</p>
                <p className="font-semibold text-white tracking-wide">RM {currentStats.needs.toFixed(0)}</p>
              </div>
              <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl p-4 border border-white/[0.08] flex flex-col items-center justify-center text-center">
                <Zap size={20} className="text-purple-400 mb-2" strokeWidth={1.5} />
                <p className="text-[10px] font-medium text-white/50 uppercase tracking-wider mb-1">Wants</p>
                <p className="font-semibold text-white tracking-wide">RM {currentStats.wants.toFixed(0)}</p>
              </div>
              <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl p-4 border border-white/[0.08] flex flex-col items-center justify-center text-center">
                <Heart size={20} className="text-pink-400 mb-2" strokeWidth={1.5} />
                <p className="text-[10px] font-medium text-white/50 uppercase tracking-wider mb-1">Together</p>
                <p className="font-semibold text-white tracking-wide">RM {currentStats.together.toFixed(0)}</p>
              </div>
            </div>

            <div className="bg-white/[0.03] backdrop-blur-xl p-6 rounded-3xl border border-white/[0.08] shadow-lg">
              <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider mb-6 text-center">Spending by Category</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => `RM ${value.toFixed(2)}`}
                      contentStyle={{ 
                        borderRadius: '16px', 
                        border: '1px solid rgba(255,255,255,0.1)', 
                        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                        backgroundColor: 'rgba(10, 10, 10, 0.9)',
                        backdropFilter: 'blur(10px)',
                        color: '#fff'
                      }}
                      itemStyle={{ color: '#fff', fontWeight: 500 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider px-1">Category Breakdown</h3>
              <div className="bg-white/[0.03] backdrop-blur-xl rounded-3xl border border-white/[0.08] shadow-lg overflow-hidden">
                {data.map((item, index) => (
                  <div key={index} className={`p-4 flex items-center justify-between ${index !== 0 ? 'border-t border-white/[0.05]' : ''}`}>
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-3 h-3 rounded-full shadow-[0_0_10px_currentColor]" 
                        style={{ backgroundColor: COLORS[index % COLORS.length], color: COLORS[index % COLORS.length] }}
                      />
                      <p className="font-medium text-white tracking-wide">{item.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-white tracking-wide">RM {item.value.toFixed(2)}</p>
                      <p className="text-[11px] font-medium text-white/40 mt-1 uppercase tracking-wider">
                        {((item.value / currentStats.total) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-16 bg-white/[0.02] border border-white/[0.05] rounded-3xl backdrop-blur-md">
            <p className="text-white/40 font-medium uppercase tracking-wider">No data for this period</p>
          </div>
        )}
      </div>
    </div>
  );
};

