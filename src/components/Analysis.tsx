import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { isWithinInterval, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { RefreshCw } from 'lucide-react';

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'];

export const Analysis: React.FC = () => {
  const { expenses, fetchExpenses, isLoading } = useStore();
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly');
  
  const now = new Date();
  const periodStart = period === 'monthly' ? startOfMonth(now) : startOfYear(now);
  const periodEnd = period === 'monthly' ? endOfMonth(now) : endOfYear(now);

  const categoryTotals = expenses.reduce((acc, exp) => {
    const expDate = new Date(exp.date);
    if (isWithinInterval(expDate, { start: periodStart, end: periodEnd }) && !exp.isInvestment) {
      const amount = exp.sharedFlag ? exp.amount / 2 : exp.amount;
      acc[exp.category] = (acc[exp.category] || 0) + amount;
    }
    return acc;
  }, {} as Record<string, number>);

  const data = Object.entries(categoryTotals)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const totalSpent = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="bg-[#030303] text-white min-h-screen relative">
      <div className="px-6 pt-14 pb-6 mb-6 relative z-10 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold text-white tracking-tight">Analysis</h1>
          <p className="text-sm font-medium text-white/50 uppercase tracking-wider mt-1">
            {period === 'monthly' 
              ? now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
              : now.toLocaleDateString('en-GB', { year: 'numeric' })
            }
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white/[0.03] border border-white/[0.08] p-1 rounded-full flex backdrop-blur-md">
            <button
              onClick={() => setPeriod('monthly')}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${period === 'monthly' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'text-white/40 hover:text-white/70'}`}
            >
              Month
            </button>
            <button
              onClick={() => setPeriod('yearly')}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${period === 'yearly' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'text-white/40 hover:text-white/70'}`}
            >
              Year
            </button>
          </div>
          <button 
            onClick={() => fetchExpenses()}
            disabled={isLoading}
            className="w-10 h-10 bg-white/[0.03] border border-white/[0.08] backdrop-blur-md rounded-full flex items-center justify-center text-white transition-colors disabled:opacity-50 active:scale-95"
          >
            <RefreshCw size={18} strokeWidth={1.5} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <div className="px-6 space-y-6 relative z-10">
        {data.length > 0 ? (
          <>
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
                        {((item.value / totalSpent) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-16 bg-white/[0.02] border border-white/[0.05] rounded-3xl backdrop-blur-md">
            <p className="text-white/40 font-medium uppercase tracking-wider">No data for this {period === 'monthly' ? 'month' : 'year'}</p>
          </div>
        )}
      </div>
    </div>
  );
};
