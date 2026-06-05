import React, { useEffect, useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  Wallet, 
  Plane, 
  PiggyBank, 
  DollarSign, 
  PieChart, 
  History, 
  Plus, 
  ArrowUpRight, 
  ArrowDownRight, 
  Target,
  RefreshCw,
  Settings,
  ChevronRight,
  TrendingDown,
  Info,
  Briefcase,
  Coins
} from 'lucide-react';
import { format } from 'date-fns';
import { WealthLogEntry, StockPriceData } from '../types';
import { ResponsiveContainer, PieChart as RePieChart, Pie, Cell, Tooltip } from 'recharts';

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6b7280'];

export const WealthDashboard: React.FC = () => {
  const { 
    wealthLogs, 
    fetchWealthLogs, 
    wealthConfigs, 
    fetchWealthConfigs, 
    updateWealthConfig,
    addWealthLog,
    fetchStockPrice,
    isLoading 
  } = useStore();

  const [isAddingLog, setIsAddingLog] = useState(false);
  const [isEditingConfigs, setIsEditingConfigs] = useState(false);
  const [isLoggingStandard, setIsLoggingStandard] = useState(false);
  const [standardLogs, setStandardLogs] = useState<{category: string, amount: string}[]>([]);
  const [standardLogDate, setStandardLogDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingLog, setEditingLog] = useState<WealthLogEntry | null>(null);
  
  const [tempAllocations, setTempAllocations] = useState<{category: string, amount: string}[]>([]);
  const [tempCustomBuckets, setTempCustomBuckets] = useState('');
  const [tempSharedBuckets, setTempSharedBuckets] = useState<string[]>([]);
  const [tempInvestmentBuckets, setTempInvestmentBuckets] = useState('');
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
  const [tempBucketNotes, setTempBucketNotes] = useState('');

  const [stockData, setStockData] = useState<Record<string, StockPriceData>>({});
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'INVESTMENTS' | 'SAVINGS'>('OVERVIEW');

  useEffect(() => {
    fetchWealthLogs();
    fetchWealthConfigs();
  }, []);

  const investmentBuckets = useMemo(() => {
    return (wealthConfigs.InvestmentBuckets || '').split(',').map(s => s.trim()).filter(Boolean);
  }, [wealthConfigs.InvestmentBuckets]);

  useEffect(() => {
    const symbols = investmentBuckets.length > 0 ? investmentBuckets : [];
    symbols.forEach(async (sym) => {
      const data = await fetchStockPrice(sym);
      if (data) {
        setStockData(prev => ({ ...prev, [sym]: data }));
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wealthConfigs.InvestmentBuckets]);

  // Constants / Configs
  const customBucketsRaw = wealthConfigs.CustomBuckets || '';
  const customBuckets = useMemo(() => customBucketsRaw ? customBucketsRaw.split(',').filter(Boolean) : [], [customBucketsRaw]);

  const standardAllocationsRaw = wealthConfigs.StandardAllocations;
  const standardAllocations = useMemo(() => {
      if (standardAllocationsRaw) {
          try {
              return JSON.parse(standardAllocationsRaw);
          } catch (e) {
              return [];
          }
      }
      
      // Fallback for old configs
      const monthlyInvestMYR = parseFloat(wealthConfigs.MonthlyInvestAmt || '0');
      const travelMonthlyMYR = parseFloat(wealthConfigs.TravelMonthlyAmt || '0');
      const otherMonthlyMYR = parseFloat(wealthConfigs.OtherMonthlyAmt || '0');
      
      const defaultAlloc = [];
      if (monthlyInvestMYR > 0) {
          defaultAlloc.push({ category: 'VOO', amount: (monthlyInvestMYR * 0.7).toFixed(2) });
          defaultAlloc.push({ category: 'QQQ', amount: (monthlyInvestMYR * 0.25).toFixed(2) });
          defaultAlloc.push({ category: 'Bullet', amount: (monthlyInvestMYR * 0.05).toFixed(2) });
      }
      if (travelMonthlyMYR > 0) {
          defaultAlloc.push({ category: 'Travel', amount: travelMonthlyMYR.toFixed(2) });
      }
      if (otherMonthlyMYR > 0) {
          defaultAlloc.push({ category: 'Others', amount: otherMonthlyMYR.toFixed(2) });
      }
      return defaultAlloc;
  }, [standardAllocationsRaw, wealthConfigs]);

  const sharedBucketsConfig = useMemo(() => {
    try { return JSON.parse(wealthConfigs.SharedBuckets || '[]'); } 
    catch(e) { return [];}
  }, [wealthConfigs]);

  const bucketNotesConfig = useMemo(() => {
    try { return JSON.parse(wealthConfigs.BucketNotes || '{}'); } 
    catch(e) { return {};}
  }, [wealthConfigs]);

  const partnerContributionsConfig = useMemo(() => {
    try { return JSON.parse(wealthConfigs.PartnerContributions || '{}'); } 
    catch(e) { return {};}
  }, [wealthConfigs]);

  const openSettings = () => {
      setTempAllocations(standardAllocations.map((a: any) => ({ ...a })));
      setTempCustomBuckets(wealthConfigs.CustomBuckets || '');
      setTempInvestmentBuckets(wealthConfigs.InvestmentBuckets || '');
      setTempSharedBuckets(sharedBucketsConfig);
      setIsEditingConfigs(true);
  };

  const handleSaveSettings = async () => {
      setIsSubmitting(true);
      try {
          await updateWealthConfig('StandardAllocations', JSON.stringify(tempAllocations));
          await updateWealthConfig('CustomBuckets', tempCustomBuckets);
          await updateWealthConfig('InvestmentBuckets', tempInvestmentBuckets);
          await updateWealthConfig('SharedBuckets', JSON.stringify(tempSharedBuckets));
          setIsEditingConfigs(false);
      } finally {
          setIsSubmitting(false);
      }
  };

  const dynamicCategories = Array.from(new Set([
      ...customBuckets,
      ...investmentBuckets,
      ...standardAllocations.map((a: any) => a.category),
      ...wealthLogs.map(l => l.category)
  ])).filter(c => typeof c === 'string' && c.trim().length > 0) as string[];

  // Summary Logic
  const stats = useMemo(() => {
    const allCategories = dynamicCategories;
    
    const summary = {
      totalNetWorth: 0,
      buckets: {} as Record<string, { myr: number; units: number; usdInvested: number }>,
      totalInvestedMYR: 0,
      totalSavedMYR: 0
    };

    allCategories.forEach(cat => {
      summary.buckets[cat] = { myr: 0, units: 0, usdInvested: 0 };
    });

    wealthLogs.forEach(log => {
      const cat = log.category;
      const amt = log.amountMYR;
      
      if (!summary.buckets[cat]) {
          summary.buckets[cat] = { myr: 0, units: 0, usdInvested: 0 };
      }

      const bucket = summary.buckets[cat];
      
      switch (log.type as string) {
        case 'INCOME_SAVE':
        case 'CONTRIBUTION': // Fallback for old data
          bucket.myr += amt;
          if (investmentBuckets.includes(cat)) {
              summary.totalInvestedMYR += amt;
          } else {
              summary.totalSavedMYR += amt;
          }
          break;
        case 'WITHDRAW':
          bucket.myr -= amt;
          if (investmentBuckets.includes(cat)) {
              summary.totalInvestedMYR -= amt;
          } else {
              summary.totalSavedMYR -= amt;
          }
          break;
        case 'INVEST_BUY':
        case 'BUY': // Fallback
          // When buying an asset, we use existing cash (decrease myr) and increase units
          bucket.myr -= amt; 
          bucket.units += log.units || 0;
          bucket.usdInvested += log.amountUSD || 0;
          break;
        case 'INVEST_SELL':
        case 'SELL': // Fallback
          // When selling, cash goes up (increase myr) and units go down
          bucket.myr += amt;
          bucket.units -= log.units || 0;
          break;
        case 'BALANCE_ADJ':
        case 'ADJUSTMENT': // Fallback
          bucket.myr = amt; 
          break;
      }
    });

    // Current Value of tracked stocks based on stockData
    const usdToMyr = 4.7; 

    // Calculate total net worth: Cash in all buckets + Current Market Value of Assets
    summary.totalNetWorth = Object.keys(summary.buckets).reduce((sum, key) => {
        let val = summary.buckets[key].myr; // Start with cash in bucket
        
        // If there is stock data for this bucket, add its current market value
        if (stockData[key] && summary.buckets[key].units > 0) {
            const stockValUSD = summary.buckets[key].units * (stockData[key]?.currentPrice || 0);
            val += stockValUSD * usdToMyr;
        }

        return sum + val;
    }, 0);

    return summary;
  }, [wealthLogs, stockData, customBuckets, dynamicCategories]);

  // Bullet Fund Logic
  const bulletFundSignal = useMemo(() => {
    const symbol = investmentBuckets[0]; 
    const data = symbol ? stockData[symbol] : null;
    if (!data || !data.ma200 || data.ma200 === 0) return { action: 'SAVE', percent: 0, diff: 0 };

    const diffPercent = ((data.currentPrice - data.ma200) / data.ma200) * 100;
    
    if (diffPercent <= -10) {
      return { action: 'BUY_HEAVY', percent: 50, diff: diffPercent };
    } else if (diffPercent <= -5) {
      return { action: 'BUY_LIGHT', percent: 25, diff: diffPercent };
    }
    
    return { action: 'SAVE', percent: 0, diff: diffPercent };
  }, [stockData, investmentBuckets]);

  const openStandardLogModal = () => {
    setStandardLogs(standardAllocations.map((alloc: any) => ({ ...alloc })));
    setStandardLogDate(new Date().toISOString().split('T')[0]);
    setIsLoggingStandard(true);
  };

  const handleSaveStandardLog = async () => {
      setIsSubmitting(true);
      try {
          for (const log of standardLogs) {
              const amt = parseFloat(log.amount);
              if (amt > 0) {
                  await addWealthLog({
                      date: standardLogDate,
                      type: 'INCOME_SAVE',
                      category: log.category,
                      amountMYR: amt,
                      notes: 'Monthly standard contribution'
                  });
              }
          }
          setIsLoggingStandard(false);
      } finally {
          setIsSubmitting(false);
      }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-white">
      <datalist id="bucket-options">
          {dynamicCategories.map(b => typeof b === 'string' && <option key={b} value={b} />)}
      </datalist>
      {/* Header */}
      <div className="p-6 pb-2">
        <h1 className="text-2xl font-bold tracking-tight mb-1">Wealth & Assets</h1>
        <p className="text-white/40 text-sm">Long-term wealth tracking and allocation</p>
      </div>

      {/* Tabs */}
      <div className="flex px-6 gap-6 border-b border-white/5 mb-6">
        {(['OVERVIEW', 'INVESTMENTS', 'SAVINGS'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-3 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 ${
              activeTab === tab ? 'border-blue-500 text-blue-500' : 'border-transparent text-white/40 hover:text-white/60'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-24">
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-6">
            {/* Net Worth Card */}
            <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/10 rounded-3xl p-6 border border-white/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                    <TrendingUp size={120} />
                </div>
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <p className="text-white/50 text-xs font-medium uppercase tracking-widest mb-1">Estimated Net Worth</p>
                        <h2 className="text-4xl font-bold tracking-tight">RM {stats.totalNetWorth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                    <div>
                        <p className="text-white/40 text-[10px] uppercase font-bold tracking-wider mb-0.5">Total Invested</p>
                        <p className="text-sm font-semibold">RM {stats.totalInvestedMYR.toLocaleString()}</p>
                    </div>
                    <div>
                        <p className="text-white/40 text-[10px] uppercase font-bold tracking-wider mb-0.5">Total Savings</p>
                        <p className="text-sm font-semibold">RM {stats.totalSavedMYR.toLocaleString()}</p>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
                <button 
                    onClick={openStandardLogModal}
                    className="flex items-center justify-center gap-2 p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all active:scale-95"
                >
                    <Plus size={18} />
                    <span className="text-sm font-medium">Monthly Contrib.</span>
                </button>
                <button 
                    onClick={openSettings}
                    className="flex items-center justify-center gap-2 p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all active:scale-95"
                >
                    <Settings size={18} />
                    <span className="text-sm font-medium">Allocations</span>
                </button>
            </div>

            {/* Asset Allocation Chart */}
            <div className="bg-white/5 rounded-3xl p-6 border border-white/10">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                        <PieChart size={16} className="text-blue-400" /> Allocation Breakdown
                    </h3>
                </div>
                <div className="h-64 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                        <RePieChart>
                            <Pie
                                data={Object.entries(stats.buckets)
                                    .map(([name, bucket]) => ({ name, value: (bucket as any).myr }))
                                    .filter(d => d.value > 0)
                                    .sort((a, b) => b.value - a.value)
                                }
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {Object.entries(stats.buckets).map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                                ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                itemStyle={{ color: '#fff' }}
                            />
                        </RePieChart>
                    </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-y-3 mt-4">
                    {Object.entries(stats.buckets)
                        .map(([name, bucket]) => ({ name, value: (bucket as any).myr }))
                        .filter(d => d.value > 0)
                        .sort((a,b) => b.value - a.value)
                        .slice(0, 6)
                        .map((data, i) => (
                        <div key={data.name} className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                            <span className="text-xs text-white/60">{data.name}</span>
                        </div>
                    ))}
                </div>
            </div>
          </div>
        )}

        {activeTab === 'INVESTMENTS' && (
          <div className="space-y-6">
             {/* Bullet Fund Signal */}
             {stats.buckets.Bullet && (
             <div className="bg-orange-500/10 border border-orange-500/20 rounded-3xl p-6 relative overflow-hidden">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-orange-400 text-xs font-medium uppercase tracking-widest mb-1 flex items-center gap-1.5">
                            <Target size={14} /> Bullet Fund Signal
                        </h3>
                        <p className="text-xl font-bold">{bulletFundSignal.action === 'SAVE' ? 'Accumulating...' : `BUY SIGNAL: ${bulletFundSignal.percent}%`}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-[10px] font-bold ${bulletFundSignal.diff < 0 ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                        {bulletFundSignal.diff.toFixed(2)}% vs MA200
                    </div>
                </div>
                <p className="text-white/50 text-xs leading-relaxed">
                    Available: <span className="text-white font-bold">RM {stats.buckets.Bullet.myr.toLocaleString()}</span>. 
                    {bulletFundSignal.action === 'SAVE' 
                        ? ' Price is currently above MA200. Keep saving for the next dip.' 
                        : ` Price is below MA200. Formula suggests using ${bulletFundSignal.percent}% of fund.`}
                </p>
                {bulletFundSignal.action !== 'SAVE' && (
                    <button 
                        onClick={() => {/* logic to log refill */}}
                        className="mt-4 w-full py-3 bg-orange-500 hover:bg-orange-400 text-white rounded-xl text-sm font-bold shadow-lg shadow-orange-500/20 transition-all active:scale-95"
                    >
                        Execute BuyRM {(stats.buckets.Bullet.myr * (bulletFundSignal.percent / 100)).toFixed(0)}
                    </button>
                )}
            </div>
            )}

            {/* Core Stocks */}
            <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 px-1">Market Investments</h3>
                {investmentBuckets.length === 0 && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-sm text-white/50 text-center">
                        No investment tickers configured. Open Settings to add some.
                    </div>
                )}
                {investmentBuckets.map(sym => {
                    const data = stockData[sym];
                    const holdings = stats.buckets[sym] || { units: 0, myr: 0 };
                    return (
                        <div key={sym} className="bg-white/5 border border-white/10 rounded-2xl p-5 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center font-bold text-lg">
                                    {sym.substring(0, 2)}
                                </div>
                                <div>
                                    <p className="font-bold text-lg">{sym}</p>
                                    <p className="text-xs text-white/40">{holdings.units.toFixed(4)} Units</p>
                                </div>
                            </div>
                            <div className="text-right">
                                {data ? (
                                    <>
                                        <p className="font-bold">USD {data.currentPrice.toFixed(2)}</p>
                                        <div className={`flex items-center justify-end gap-1 text-[10px] ${data.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {data.changePercent >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                                            {Math.abs(data.changePercent).toFixed(2)}%
                                        </div>
                                    </>
                                ) : (
                                    <RefreshCw className="animate-spin text-white/20" size={16} />
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
          </div>
        )}

        {activeTab === 'SAVINGS' && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 px-1 mb-2">Savings Buckets</h3>
            {Object.keys(stats.buckets)
              .filter(key => !investmentBuckets.includes(key) && key !== 'Bullet')
              .map(key => {
                const Icon = Wallet;
                const color = 'text-green-400';
                const label = key;

                return (
                    <div 
                        key={key} 
                        onClick={() => {
                            setSelectedBucket(key);
                            setTempBucketNotes(bucketNotesConfig[key] || '');
                        }}
                        className="bg-white/5 border border-white/10 rounded-2xl p-5 flex justify-between items-center cursor-pointer hover:bg-white/10 transition-colors"
                    >
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center ${color}`}>
                                <Icon size={24} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <p className="font-bold">{label}</p>
                                    {sharedBucketsConfig.includes(key) && (
                                        <div className="bg-blue-500/20 text-blue-400 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Shared</div>
                                    )}
                                </div>
                                <p className="text-[10px] text-white/30 uppercase tracking-wider font-bold">Accumulated</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xl font-bold">RM {stats.buckets[key].myr.toLocaleString()}</p>
                        </div>
                    </div>
                );
              })}
          </div>
        )}

        {/* Recent Wealth Logs */}
        <div className="mt-8">
            <div className="flex justify-between items-center mb-4 px-1">
                <h3 className="text-xs font-bold uppercase tracking-widest text-white/40">Recent Activity</h3>
                <button 
                  onClick={() => setIsAddingLog(true)}
                  className="p-1 px-2 text-[10px] font-bold bg-blue-500/10 text-blue-400 rounded-md border border-blue-500/20"
                >
                    + Add Entry
                </button>
            </div>
            <div className="space-y-3">
                {wealthLogs.slice().reverse().slice(0, 10).map((log, i) => (
                    <div key={i} onClick={() => setEditingLog(log)} className="flex justify-between items-center p-4 bg-white/[0.02] border border-white/5 rounded-xl cursor-pointer hover:bg-white/[0.04] transition-all">
                        <div className="flex gap-3 items-center">
                            <div className={`p-2 rounded-lg ${
                                (log.type as string) === 'INCOME_SAVE' || (log.type as string) === 'CONTRIBUTION' ? 'bg-green-500/10 text-green-400' : 
                                (log.type as string) === 'INVEST_BUY' || (log.type as string) === 'BUY' ? 'bg-blue-500/10 text-blue-400' : 'bg-red-500/10 text-red-400'
                            }`}>
                                {(log.type as string) === 'INCOME_SAVE' || (log.type as string) === 'CONTRIBUTION' ? <Coins size={14} /> : ((log.type as string) === 'INVEST_BUY' || (log.type as string) === 'BUY') ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                            </div>
                            <div>
                                <p className="text-sm font-medium">{log.category}</p>
                                <p className="text-[10px] text-white/30">{format(new Date(log.date), 'dd MMM yyyy')}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-bold">RM {log.amountMYR.toLocaleString()}</p>
                            <p className="text-[10px] text-white/40 italic">{log.type}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>

      {/* Configuration Modal */}
      <AnimatePresence>
        {isEditingConfigs && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="bg-[#141414] border border-white/10 rounded-3xl p-6 w-full max-w-sm"
                >
                    <h2 className="text-xl font-bold mb-6">Allocation Settings</h2>
                    <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
                        <div>
                            <label className="text-[10px] text-white/40 uppercase font-bold tracking-wider mb-2 block">Custom Saving Buckets (Comma separated)</label>
                            <input 
                                type="text"
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:border-blue-500 outline-none"
                                placeholder="e.g. Car, Wedding, Laptop"
                                value={tempCustomBuckets}
                                onChange={(e) => setTempCustomBuckets(e.target.value)}
                            />
                            <p className="text-[9px] text-white/30 mt-2">Add names like "Car", "House" to create new buckets.</p>
                        </div>

                        <div>
                            <label className="text-[10px] text-white/40 uppercase font-bold tracking-wider mb-2 block">Investment Tickers (Comma separated)</label>
                            <input 
                                type="text"
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:border-blue-500 outline-none uppercase"
                                placeholder="e.g. VOO, QQQ, AAPL"
                                value={tempInvestmentBuckets}
                                onChange={(e) => setTempInvestmentBuckets(e.target.value)}
                            />
                            <p className="text-[9px] text-white/30 mt-2">Any bucket named like this will track real-time stock prices.</p>
                        </div>

                        <div className="pt-4 border-t border-white/10">
                            <label className="text-[10px] text-white/40 uppercase font-bold tracking-wider mb-4 block">Standard Monthly Allocations</label>
                            <div className="space-y-3">
                                {tempAllocations.map((alloc, i) => (
                                    <div key={i} className="flex gap-2">
                                        <input 
                                            list="bucket-options"
                                            value={alloc.category}
                                            onChange={(e) => {
                                                const newAlloc = [...tempAllocations];
                                                newAlloc[i] = { ...newAlloc[i], category: e.target.value };
                                                setTempAllocations(newAlloc);
                                            }}
                                            placeholder="Category Name"
                                            className="flex-1 bg-white/5 border border-white/10 rounded-xl p-2.5 text-sm focus:border-blue-500 outline-none"
                                        />
                                        <input 
                                            type="number"
                                            step="0.01"
                                            value={alloc.amount}
                                            onChange={(e) => {
                                                const newAlloc = [...tempAllocations];
                                                newAlloc[i] = { ...newAlloc[i], amount: e.target.value };
                                                setTempAllocations(newAlloc);
                                            }}
                                            placeholder="RM"
                                            className="w-24 bg-white/5 border border-white/10 rounded-xl p-2.5 text-sm focus:border-blue-500 outline-none text-right"
                                        />
                                        <button 
                                            onClick={() => setTempAllocations(tempAllocations.filter((_, idx) => idx !== i))}
                                            className="w-10 flex items-center justify-center bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-colors"
                                        >
                                            &times;
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <button 
                                onClick={() => setTempAllocations([...tempAllocations, {category: dynamicCategories[0] || '', amount: ''}])}
                                className="w-full mt-3 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-medium transition-colors"
                            >
                                + Add Allocation
                            </button>
                        </div>

                        <div className="pt-4 border-t border-white/10">
                            <label className="text-[10px] text-white/40 uppercase font-bold tracking-wider mb-2 block">Shared Partner Tracking</label>
                            <p className="text-[9px] text-white/30 mb-3">Select which buckets require partner contribution tracking.</p>
                            <div className="flex flex-wrap gap-2">
                                {dynamicCategories.map(b => (
                                    <label key={b} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm cursor-pointer transition-colors border ${tempSharedBuckets.includes(b) ? 'bg-blue-500/20 border-blue-500/50 text-blue-200' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}`}>
                                        <input 
                                            type="checkbox" 
                                            checked={tempSharedBuckets.includes(b)} 
                                            onChange={(e) => {
                                                if (e.target.checked) setTempSharedBuckets([...tempSharedBuckets, b]);
                                                else setTempSharedBuckets(tempSharedBuckets.filter(x => x !== b));
                                            }}
                                            className="hidden"
                                        />
                                        {b}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-3 mt-8">
                        <button 
                            onClick={() => setIsEditingConfigs(false)}
                            className="flex-1 py-3 bg-white/5 text-white font-bold rounded-xl"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleSaveSettings}
                            disabled={isSubmitting}
                            className="flex-[2] py-3 bg-white text-black font-bold rounded-xl flex items-center justify-center"
                        >
                            {isSubmitting ? <RefreshCw className="animate-spin text-black" size={18} /> : 'Save Config'}
                        </button>
                    </div>
                </motion.div>
            </div>
        )}

        {isAddingLog && (
            <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/80 backdrop-blur-sm">
                <motion.div 
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    className="bg-[#141414] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
                >
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold">Add Wealth Entry</h2>
                        <button onClick={() => setIsAddingLog(false)} className="text-white/40 hover:text-white">Close</button>
                    </div>
                    
                    <form onSubmit={async (e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        const data = {
                            date: formData.get('date') as string,
                            type: formData.get('type') as any,
                            category: formData.get('category') as string,
                            amountMYR: parseFloat(formData.get('amount') as string),
                            units: parseFloat(formData.get('units') as string) || 0,
                            amountUSD: parseFloat(formData.get('amountUSD') as string) || 0,
                            priceUSD: parseFloat(formData.get('priceUSD') as string) || 0,
                            notes: formData.get('notes') as string
                        };
                        await addWealthLog(data);
                        setIsAddingLog(false);
                    }} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Date</label>
                                <input type="date" name="date" required className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:border-blue-500 outline-none" defaultValue={new Date().toISOString().split('T')[0]} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Type</label>
                                <select name="type" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:border-blue-500 outline-none">
                                    <option value="INCOME_SAVE">SAVING (Income In)</option>
                                    <option value="WITHDRAW">WITHDRAWAL (Spending Out)</option>
                                    <option value="INVEST_BUY">INVEST: BUY ASSET</option>
                                    <option value="INVEST_SELL">INVEST: SELL ASSET</option>
                                    <option value="BALANCE_ADJ">BALANCE ADJUSTMENT</option>
                                </select>
                                <p className="text-[9px] text-white/30 px-1">
                                    Saving: Monthly contribution. Withdraw: Taking money out. Buy/Sell: Trading ETFs.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Category / Bucket</label>
                            <input 
                                list="bucket-options"
                                name="category" 
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:border-blue-500 outline-none"
                                placeholder="e.g. Travel, VOO..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Amount (MYR)</label>
                                <input type="number" step="0.01" name="amount" required className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:border-blue-500 outline-none" placeholder="0.00" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Units (Optional)</label>
                                <input type="number" step="0.0001" name="units" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:border-blue-500 outline-none" placeholder="0.0000" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] text-white/40 uppercase font-bold tracking-wider">USD Amount</label>
                                <input type="number" step="0.01" name="amountUSD" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:border-blue-500 outline-none" placeholder="0.00" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Price (USD)</label>
                                <input type="number" step="0.01" name="priceUSD" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:border-blue-500 outline-none" placeholder="0.00" />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Notes</label>
                            <input type="text" name="notes" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:border-blue-500 outline-none" placeholder="Description..." />
                        </div>

                        <button type="submit" className="w-full py-4 bg-white text-black font-bold rounded-2xl mt-4 active:scale-[0.98] transition-all">
                            Save Entry
                        </button>
                    </form>
                </motion.div>
            </div>
        )}
        {isLoggingStandard && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="bg-[#141414] border border-white/10 rounded-3xl p-6 w-full max-w-sm max-h-[80vh] overflow-y-auto"
                >
                    <h2 className="text-xl font-bold mb-1">Standard Allocation</h2>
                    <p className="text-white/40 text-[10px] uppercase font-bold tracking-wider mb-6">Review & Adjust Before Saving</p>
                    
                    <div className="space-y-4 mb-6">
                        <div className="space-y-1.5">
                            <label className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Date</label>
                            <input 
                                type="date" 
                                value={standardLogDate}
                                onChange={(e) => setStandardLogDate(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:border-blue-500 outline-none" 
                            />
                        </div>

                        {standardLogs.map((log, index) => (
                            <div key={log.category} className="space-y-1.5">
                                <label className="text-[10px] text-white/40 uppercase font-bold tracking-wider">{log.category} (MYR)</label>
                                <input 
                                    type="number"
                                    step="0.01"
                                    value={log.amount}
                                    onChange={(e) => {
                                        const newLogs = [...standardLogs];
                                        newLogs[index] = { ...newLogs[index], amount: e.target.value };
                                        setStandardLogs(newLogs);
                                    }}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:border-blue-500 outline-none"
                                />
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-3">
                        <button 
                            onClick={() => setIsLoggingStandard(false)}
                            className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleSaveStandardLog}
                            disabled={isSubmitting}
                            className="flex-1 py-3 bg-white hover:bg-gray-200 text-black font-bold rounded-xl transition-colors flex justify-center items-center"
                        >
                            {isSubmitting ? <RefreshCw className="animate-spin text-black" size={18} /> : 'Save Stats'}
                        </button>
                    </div>
                </motion.div>
            </div>
        )}

        {editingLog && (
            <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/80 backdrop-blur-sm">
                <motion.div 
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    className="bg-[#141414] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
                >
                    <div className="flex justify-between items-center mb-6">
                        <div>
                           <h2 className="text-xl font-bold">Edit Entry</h2>
                           <p className="text-white/40 text-[10px] uppercase font-bold tracking-wider">Modify or delete log</p>
                        </div>
                        <button onClick={() => setEditingLog(null)} className="text-white/40 hover:text-white">Close</button>
                    </div>
                    
                    <form onSubmit={async (e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        const data: WealthLogEntry = {
                            date: formData.get('date') as string,
                            type: formData.get('type') as any,
                            category: formData.get('category') as string,
                            amountMYR: parseFloat(formData.get('amount') as string),
                            units: parseFloat(formData.get('units') as string) || 0,
                            amountUSD: parseFloat(formData.get('amountUSD') as string) || 0,
                            priceUSD: parseFloat(formData.get('priceUSD') as string) || 0,
                            notes: formData.get('notes') as string
                        };
                        const { updateWealthLog } = useStore.getState();
                        if (editingLog.rowIndex) {
                           await updateWealthLog(editingLog.rowIndex, data);
                        }
                        setEditingLog(null);
                    }} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Date</label>
                                <input type="date" name="date" required className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:border-blue-500 outline-none" defaultValue={editingLog.date} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Type</label>
                                <select name="type" defaultValue={editingLog.type} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:border-blue-500 outline-none">
                                    <option value="INCOME_SAVE">SAVING (Income In)</option>
                                    <option value="WITHDRAW">WITHDRAWAL (Spending Out)</option>
                                    <option value="INVEST_BUY">INVEST: BUY ASSET</option>
                                    <option value="INVEST_SELL">INVEST: SELL ASSET</option>
                                    <option value="BALANCE_ADJ">BALANCE ADJUSTMENT</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Category / Bucket</label>
                            <input
                                list="bucket-options"
                                name="category" 
                                defaultValue={editingLog.category} 
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:border-blue-500 outline-none"
                                placeholder="e.g. Travel, VOO..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Amount (MYR)</label>
                                <input type="number" step="0.01" name="amount" required defaultValue={editingLog.amountMYR} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:border-blue-500 outline-none" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Units (Optional)</label>
                                <input type="number" step="0.0001" name="units" defaultValue={editingLog.units || ''} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:border-blue-500 outline-none" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] text-white/40 uppercase font-bold tracking-wider">USD Amount</label>
                                <input type="number" step="0.01" name="amountUSD" defaultValue={editingLog.amountUSD || ''} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:border-blue-500 outline-none" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Price (USD)</label>
                                <input type="number" step="0.01" name="priceUSD" defaultValue={editingLog.priceUSD || ''} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:border-blue-500 outline-none" />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Notes</label>
                            <input type="text" name="notes" defaultValue={editingLog.notes || ''} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:border-blue-500 outline-none" />
                        </div>

                        <div className="flex gap-3 mt-6 pt-4 border-t border-white/10">
                            <button 
                                type="button"
                                onClick={async () => {
                                    if(confirm('Are you sure you want to delete this log?')) {
                                        const { deleteWealthLog } = useStore.getState();
                                        if (editingLog.rowIndex) {
                                            await deleteWealthLog(editingLog.rowIndex);
                                        }
                                        setEditingLog(null);
                                    }
                                }}
                                className="w-full sm:w-auto px-4 py-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold rounded-2xl transition-all"
                            >
                                Delete
                            </button>
                            <button type="submit" className="flex-1 py-4 bg-white text-black font-bold rounded-2xl active:scale-[0.98] transition-all">
                                Update changes
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        )}
        {selectedBucket && (
            <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/80 backdrop-blur-sm">
                <motion.div 
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    className="bg-[#141414] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
                >
                    <div className="flex justify-between items-center mb-6">
                        <div>
                           <h2 className="text-xl font-bold">{selectedBucket} Bucket</h2>
                           <p className="text-white/40 text-[10px] uppercase font-bold tracking-wider">Bucket Details & Tracking</p>
                        </div>
                        <button onClick={() => setSelectedBucket(null)} className="text-white/40 hover:text-white">Close</button>
                    </div>

                    <div className="bg-white/5 border border-white/10 p-5 rounded-2xl mb-6 flex justify-between items-center">
                        <span className="text-white/40 text-sm font-bold uppercase tracking-wider">Total balance</span>
                        <span className="text-2xl font-bold">RM {stats.buckets[selectedBucket]?.myr.toLocaleString()}</span>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] text-white/40 uppercase font-bold tracking-wider block">Notes & Location (Where is this money?)</label>
                            <textarea
                                value={tempBucketNotes}
                                onChange={(e) => setTempBucketNotes(e.target.value)}
                                placeholder="e.g. Saved in Maybank Account XXXX, or TNGO GO+..."
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:border-blue-500 outline-none min-h-[100px] resize-none"
                            />
                        </div>

                        {sharedBucketsConfig.includes(selectedBucket) && (
                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-1 inline-block rounded uppercase font-bold tracking-wider mb-2">Partner Tracking</h4>
                                    <p className="text-xs text-white/50">Check off the months when partner contribution is collected.</p>
                                </div>
                                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                                    {['01','02','03','04','05','06','07','08','09','10','11','12'].map(month => {
                                        const year = new Date().getFullYear();
                                        const monthKey = `${year}-${month}`;
                                        const isChecked = !!(partnerContributionsConfig[selectedBucket] && partnerContributionsConfig[selectedBucket][monthKey]);
                                        
                                        return (
                                            <button 
                                                key={monthKey}
                                                onClick={() => {
                                                    const updated = {
                                                        ...partnerContributionsConfig,
                                                        [selectedBucket]: {
                                                            ...(partnerContributionsConfig[selectedBucket] || {}),
                                                            [monthKey]: !isChecked
                                                        }
                                                    };
                                                    // Immediately save partner contribution
                                                    updateWealthConfig('PartnerContributions', JSON.stringify(updated));
                                                }}
                                                className={`py-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                                                    isChecked ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                                                }`}
                                            >
                                                <span className="text-xs font-bold">{new Date(`${year}-${month}-01`).toLocaleString('en-US', {month: 'short'})}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <button 
                            onClick={async () => {
                                const newNotes = { ...bucketNotesConfig, [selectedBucket]: tempBucketNotes };
                                await updateWealthConfig('BucketNotes', JSON.stringify(newNotes));
                                setSelectedBucket(null);
                            }}
                            className="w-full py-4 bg-white text-black font-bold rounded-2xl active:scale-[0.98] transition-all"
                        >
                            Save Details
                        </button>
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>
    </div>
  );
};
