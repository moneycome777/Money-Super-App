import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Compass, MapPin, Utensils, Shuffle, Flame } from 'lucide-react';
import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

export const Discovery: React.FC = () => {
  const { expenses } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [randomPick, setRandomPick] = useState<{ food: string, restaurant: string, tier: string } | null>(null);

  const { foodTypeCounts, restaurantStats, foodHistory } = useMemo<{
    foodTypeCounts: Record<string, number>;
    restaurantStats: Record<string, { total: number, month: number, tier: string, foods: Set<string> }>;
    foodHistory: { id: string, food: string, restaurant: string, tier: string }[];
  }>(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const fCounts: Record<string, number> = {};
    const rStats: Record<string, { total: number, month: number, tier: string, foods: Set<string> }> = {};
    const history: { id: string, food: string, restaurant: string, tier: string }[] = [];
    const seen = new Set<string>();

    // Sort by date descending
    const sorted = [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    sorted.forEach(exp => {
      if (exp.category === 'Food' && exp.description && exp.restaurant) {
        const food = exp.description;
        const rest = exp.restaurant;
        const tier = exp.tier || '💰';

        // History for Surprise Me
        const key = `${food}-${rest}`;
        if (!seen.has(key)) {
          seen.add(key);
          history.push({
            id: exp.rowIndex?.toString() || Math.random().toString(),
            food,
            restaurant: rest,
            tier
          });
        }

        // Food counts
        fCounts[food] = (fCounts[food] || 0) + 1;

        // Restaurant stats
        if (!rStats[rest]) {
          rStats[rest] = { total: 0, month: 0, tier, foods: new Set() };
        }
        rStats[rest].total += 1;
        rStats[rest].foods.add(food);

        const expDate = new Date(exp.date);
        if (isWithinInterval(expDate, { start: monthStart, end: monthEnd })) {
          rStats[rest].month += 1;
        }
      }
    });

    return { foodTypeCounts: fCounts, restaurantStats: rStats, foodHistory: history };
  }, [expenses]);

  const topFoods = useMemo(() => {
    return (Object.entries(foodTypeCounts) as [string, number][])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12); // Top 12
  }, [foodTypeCounts]);

  const filteredRestaurants = useMemo(() => {
    return (Object.entries(restaurantStats) as [string, { total: number, month: number, tier: string, foods: Set<string> }][])
      .filter(([name, stats]) => {
        if (!searchTerm) return true;
        const lower = searchTerm.toLowerCase();
        return name.toLowerCase().includes(lower) || Array.from(stats.foods).some(f => f.toLowerCase().includes(lower));
      })
      .sort((a, b) => b[1].total - a[1].total);
  }, [restaurantStats, searchTerm]);

  const handleSurpriseMe = () => {
    if (foodHistory.length === 0) return;
    const randomIndex = Math.floor(Math.random() * foodHistory.length);
    setRandomPick(foodHistory[randomIndex]);
  };

  return (
    <div className="p-6 pb-32 max-w-md mx-auto min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/5 rounded-2xl flex items-center justify-center text-white border border-white/10">
            <Compass size={20} strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">Food & Dining</h1>
            <p className="text-xs text-white/50 font-medium">Discovery & Intelligence</p>
          </div>
        </div>
      </div>

      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} strokeWidth={1.5} />
        <input
          type="text"
          placeholder="Search food or restaurant..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white/[0.03] border border-white/[0.08] rounded-2xl outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 text-white placeholder:text-white/30 transition-all font-medium"
        />
      </div>

      <button
        onClick={handleSurpriseMe}
        className="w-full mb-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white py-4 rounded-2xl font-medium text-lg active:scale-[0.98] transition-all shadow-[0_0_30px_-5px_rgba(37,99,235,0.4)] flex items-center justify-center gap-2"
      >
        <Shuffle size={20} strokeWidth={2} />
        Surprise Me
      </button>

      <AnimatePresence>
        {randomPick && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="mb-8 p-6 bg-white/[0.05] border border-blue-500/30 rounded-3xl relative overflow-hidden shadow-[0_0_40px_-10px_rgba(37,99,235,0.2)]"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[40px] rounded-full pointer-events-none" />
            <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">Your Pick</p>
            <h3 className="text-2xl font-semibold text-white mb-1">{randomPick.food}</h3>
            <div className="flex items-center gap-2 text-white/60">
              <MapPin size={14} />
              <span className="font-medium">{randomPick.restaurant}</span>
              <span className="ml-auto text-lg">{randomPick.tier}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!searchTerm && topFoods.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Flame size={16} className="text-orange-400" />
            <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider">Top Food Types</h3>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {topFoods.map(([food, count]) => (
              <div key={food} className="px-3.5 py-2 bg-white/[0.03] border border-white/[0.08] rounded-2xl flex items-center gap-2 shadow-sm">
                <span className="text-sm font-medium text-white">{food}</span>
                <span className="text-[10px] font-bold text-white/40 bg-white/10 px-1.5 py-0.5 rounded-md">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4">Restaurant Directory</h3>
        {filteredRestaurants.length === 0 ? (
          <div className="text-center py-12 text-white/30">
            <Utensils size={32} className="mx-auto mb-3 opacity-50" strokeWidth={1} />
            <p>No restaurants found.</p>
          </div>
        ) : (
          filteredRestaurants.map(([name, stats]) => (
            <div key={name} className="p-5 bg-white/[0.02] border border-white/[0.05] rounded-3xl hover:bg-white/[0.04] transition-colors shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-semibold text-white text-lg">{name}</h4>
                <div className="text-sm bg-white/5 px-2.5 py-1 rounded-xl border border-white/5">{stats.tier}</div>
              </div>
              <p className="text-xs text-white/40 mb-4 leading-relaxed">
                Known for: <span className="text-white/70">{Array.from(stats.foods).slice(0, 3).join(', ')}{stats.foods.size > 3 ? '...' : ''}</span>
              </p>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-3.5 flex items-start gap-3">
                <MapPin size={16} className="text-blue-400 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-100/70 font-medium leading-relaxed">
                  {stats.month > 0
                    ? `You have been to ${name} ${stats.month} time${stats.month > 1 ? 's' : ''} this month.`
                    : `Visited ${stats.total} time${stats.total > 1 ? 's' : ''} total.`}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
