import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { Plus, Search, Calendar, Tag as TagIcon, Sparkles, X, ChevronDown, ChevronRight, CheckCircle2, Activity, Dumbbell, Timer, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LifeLogEntry, FitnessEntry, StrengthSet, CardioData } from '../types';
import { GoogleGenAI } from '@google/genai';
import { startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns';

// ... (keep the rest the same until LogModal)

export const LifeLog: React.FC = () => {
  const { lifeLogs, fetchLifeLogs, appPin, addLifeLog, hasFetchedLifeLogs, markLifeLogCompleted, fitnessLogs, fetchFitnessLogs, hasFetchedFitnessLogs, addFitnessLog } = useStore();
  const [activeTab, setActiveTab] = useState<'journal' | 'fitness'>('journal');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFitnessModalOpen, setIsFitnessModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [collapsedDates, setCollapsedDates] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!hasFetchedLifeLogs) {
      fetchLifeLogs();
    }
    if (!hasFetchedFitnessLogs) {
      fetchFitnessLogs();
    }
  }, [hasFetchedLifeLogs, fetchLifeLogs, hasFetchedFitnessLogs, fetchFitnessLogs]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    lifeLogs.forEach(log => {
      log.tags.split(',').forEach(t => {
        const trimmed = t.trim();
        if (trimmed) tags.add(trimmed);
      });
    });
    return Array.from(tags).sort();
  }, [lifeLogs]);

  const filteredLogs = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return lifeLogs.filter(log => {
      const matchesSearch = log.rawText.toLowerCase().includes(query) || log.tags.toLowerCase().includes(query);
      const logTags = log.tags.split(',').map(t => t.trim()).filter(Boolean);
      const matchesTags = selectedTags.length === 0 || selectedTags.some(t => logTags.includes(t));
      return matchesSearch && matchesTags;
    });
  }, [lifeLogs, searchQuery, selectedTags]);

  const upcomingLogs = useMemo(() => {
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localToday = new Date(today.getTime() - (offset * 60 * 1000));
    const todayStr = localToday.toISOString().split('T')[0];
    return filteredLogs
      .filter(log => log.dueDate && log.dueDate >= todayStr)
      .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!));
  }, [filteredLogs]);

  const historyLogs = useMemo(() => {
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localToday = new Date(today.getTime() - (offset * 60 * 1000));
    const todayStr = localToday.toISOString().split('T')[0];
    return filteredLogs
      .filter(log => !log.dueDate || log.dueDate < todayStr)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [filteredLogs]);

  const groupedHistory = useMemo(() => {
    const groups: { dateStr: string, label: string, logs: LifeLogEntry[] }[] = [];
    let currentGroup: { dateStr: string, label: string, logs: LifeLogEntry[] } | null = null;
    
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localToday = new Date(today.getTime() - (offset * 60 * 1000));
    const todayStr = localToday.toISOString().split('T')[0];

    const yesterday = new Date(localToday);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    historyLogs.forEach(log => {
      const logDate = new Date(log.timestamp);
      const logLocal = new Date(logDate.getTime() - (logDate.getTimezoneOffset() * 60 * 1000));
      const dateStr = logLocal.toISOString().split('T')[0];
      
      let label = new Date(log.timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      if (dateStr === todayStr) label = 'Today';
      else if (dateStr === yesterdayStr) label = 'Yesterday';

      if (!currentGroup || currentGroup.dateStr !== dateStr) {
        currentGroup = { dateStr, label, logs: [] };
        groups.push(currentGroup);
      }
      currentGroup.logs.push(log);
    });
    return groups;
  }, [historyLogs]);

  const isDateCollapsed = (dateStr: string) => {
    if (collapsedDates[dateStr] !== undefined) return collapsedDates[dateStr];
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localToday = new Date(today.getTime() - (offset * 60 * 1000));
    const todayStr = localToday.toISOString().split('T')[0];
    return dateStr !== todayStr; // Collapse if not today
  };

  const toggleDate = (dateStr: string) => {
    setCollapsedDates(prev => ({ ...prev, [dateStr]: !isDateCollapsed(dateStr) }));
  };

  const fitnessHistory = useMemo(() => {
    return [...fitnessLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [fitnessLogs]);

  const weeklyFitnessStats = useMemo(() => {
    const today = new Date();
    const start = startOfWeek(today, { weekStartsOn: 1 }); // Monday
    const end = endOfWeek(today, { weekStartsOn: 1 }); // Sunday

    const thisWeekLogs = fitnessLogs.filter(log => {
      const logDate = parseISO(log.date);
      return isWithinInterval(logDate, { start, end });
    });

    const activeDays = new Set(thisWeekLogs.map(log => log.date)).size;
    
    const breakdown: Record<string, number> = {};
    thisWeekLogs.forEach(log => {
      breakdown[log.activityType] = (breakdown[log.activityType] || 0) + 1;
    });

    return {
      activeDays,
      totalWorkouts: thisWeekLogs.length,
      breakdown
    };
  }, [fitnessLogs]);

  const renderWeeklySummary = () => {
    const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const today = new Date();
    const start = startOfWeek(today, { weekStartsOn: 1 });
    
    const activeDates = new Set(fitnessLogs.map(log => log.date));

    return (
      <div className="bg-gradient-to-br from-blue-900/40 to-purple-900/20 border border-blue-500/20 rounded-3xl p-6 mb-8 shadow-[0_0_40px_-10px_rgba(59,130,246,0.15)]">
        <h3 className="text-sm font-medium text-blue-200/60 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Activity size={16} /> Weekly Summary
        </h3>
        
        <div className="flex justify-between items-end mb-6">
          <div>
            <p className="text-4xl font-semibold text-white tracking-tight">{weeklyFitnessStats.totalWorkouts}</p>
            <p className="text-xs text-white/50 mt-1">Workouts this week</p>
          </div>
          
          <div className="flex gap-1.5">
            {days.map((day, i) => {
              const date = new Date(start);
              date.setDate(date.getDate() + i);
              const dateStr = date.toISOString().split('T')[0];
              const isActive = activeDates.has(dateStr);
              const isToday = dateStr === today.toISOString().split('T')[0];
              
              return (
                <div key={i} className="flex flex-col items-center gap-1.5">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                    isActive ? 'bg-blue-500 text-white shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 
                    isToday ? 'bg-white/10 text-white border border-white/20' : 'bg-white/[0.03] text-white/30'
                  }`}>
                    {day}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {Object.keys(weeklyFitnessStats.breakdown).length > 0 && (
          <div className="flex flex-wrap gap-2 pt-4 border-t border-white/10">
            {Object.entries(weeklyFitnessStats.breakdown).map(([type, count]) => (
              <span key={type} className="px-3 py-1.5 bg-white/5 rounded-xl text-xs font-medium text-white/70 flex items-center gap-1.5">
                {type === 'Weights' ? <Dumbbell size={12} className="text-blue-400" /> : <Flame size={12} className="text-orange-400" />}
                {type}: <span className="text-white">{count}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-[#030303] text-white min-h-screen relative pb-24">
      <div className="px-6 pt-14 pb-4 relative z-10">
        <h1 className="text-3xl font-semibold text-white tracking-tight mb-6">The Pulse</h1>
        
        <div className="flex bg-white/[0.03] p-1 rounded-xl mb-6 border border-white/[0.08]">
          <button
            onClick={() => setActiveTab('journal')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'journal' ? 'bg-white/10 text-white shadow-sm' : 'text-white/50 hover:text-white/80'}`}
          >
            📝 Journal
          </button>
          <button
            onClick={() => setActiveTab('fitness')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'fitness' ? 'bg-white/10 text-white shadow-sm' : 'text-white/50 hover:text-white/80'}`}
          >
            💪 Fitness
          </button>
        </div>

        {activeTab === 'journal' ? (
          <>
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
              <input
                type="text"
                placeholder="Search logs or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-white/[0.03] rounded-2xl border border-white/[0.08] text-sm font-medium text-white focus:border-blue-500/50 outline-none transition-all placeholder:text-white/30"
              />
            </div>

            {allTags.length > 0 && (
              <div className="flex overflow-x-auto pb-4 mb-4 gap-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {allTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${
                      selectedTags.includes(tag) 
                        ? 'bg-blue-600 border-blue-500 text-white' 
                        : 'bg-white/[0.03] border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.08]'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-8">
              {upcomingLogs.length > 0 && (
                <section>
                  <h2 className="text-xs font-medium text-blue-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Calendar size={14} /> Upcoming
                  </h2>
                  <div className="space-y-3">
                    {upcomingLogs.map((log, i) => (
                      <LogCard key={i} log={log} isUpcoming onComplete={() => markLifeLogCompleted(log.rowIndex!)} />
                    ))}
                  </div>
                </section>
              )}

              <section>
                <h2 className="text-xs font-medium text-white/50 uppercase tracking-wider mb-4">
                  History
                </h2>
                <div className="space-y-6">
                  {groupedHistory.length > 0 ? (
                    groupedHistory.map((group) => {
                      const collapsed = isDateCollapsed(group.dateStr);
                      return (
                        <div key={group.dateStr} className="space-y-3">
                          <button 
                            onClick={() => toggleDate(group.dateStr)}
                            className="flex items-center gap-2 text-sm font-medium text-white/70 hover:text-white transition-colors w-full text-left"
                          >
                            {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                            {group.label}
                            <span className="text-xs text-white/30 ml-2">{group.logs.length}</span>
                          </button>
                          
                          {!collapsed && (
                            <div className="space-y-3 pl-2 border-l border-white/[0.05] ml-2">
                              {group.logs.map((log, i) => (
                                <LogCard key={i} log={log} onComplete={() => markLifeLogCompleted(log.rowIndex!)} />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-12 bg-white/[0.02] border border-white/[0.05] rounded-3xl">
                      <p className="text-white/40 font-medium text-sm">No logs found.</p>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </>
        ) : (
          <>
            {renderWeeklySummary()}
            <div className="space-y-4">
              <h2 className="text-xs font-medium text-white/50 uppercase tracking-wider mb-4">
                Workout History
              </h2>
              {fitnessHistory.length > 0 ? (
                fitnessHistory.map((log, i) => (
                  <FitnessCard key={i} log={log} />
                ))
              ) : (
                <div className="text-center py-12 bg-white/[0.02] border border-white/[0.05] rounded-3xl">
                  <p className="text-white/40 font-medium text-sm">No workouts logged yet.</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="fixed bottom-24 right-6 z-40 flex flex-col-reverse items-end gap-3">
        <button
          onClick={() => activeTab === 'journal' ? setIsModalOpen(true) : setIsFitnessModalOpen(true)}
          className="w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:bg-blue-500 transition-colors"
        >
          <Plus size={24} strokeWidth={2.5} />
        </button>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <LogModal 
            onClose={() => setIsModalOpen(false)} 
            appPin={appPin}
            addLifeLog={addLifeLog}
          />
        )}
        {isFitnessModalOpen && (
          <FitnessModal 
            onClose={() => setIsFitnessModalOpen(false)} 
            appPin={appPin}
            addFitnessLog={addFitnessLog}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const LogCard: React.FC<{ log: LifeLogEntry, isUpcoming?: boolean, onComplete?: () => void }> = ({ log, isUpcoming = false, onComplete }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const maxLength = 120;
  const isLong = log.rawText.length > maxLength;

  return (
    <div 
      className={`p-4 rounded-2xl border ${isUpcoming ? 'bg-blue-900/10 border-blue-500/30' : 'bg-white/[0.03] border-white/[0.08]'} backdrop-blur-md transition-all ${isLong ? 'cursor-pointer hover:bg-white/[0.05]' : ''}`}
      onClick={() => { if (isLong) setIsExpanded(!isExpanded); }}
    >
      <div className="flex justify-between items-start gap-4 mb-3">
        <p className="text-sm text-white/90 leading-relaxed whitespace-pre-wrap flex-1">
          {isLong && !isExpanded ? `${log.rawText.slice(0, maxLength)}...` : log.rawText}
        </p>
        {onComplete && (
          <button
            onClick={(e) => { e.stopPropagation(); onComplete(); }}
            className="p-1.5 bg-white/5 hover:bg-green-500/20 text-white/40 hover:text-green-400 rounded-xl transition-colors shrink-0"
            title="Mark as Done"
          >
            <CheckCircle2 size={18} />
          </button>
        )}
      </div>
      
      {log.aiSummary && (
        <div className="mb-3 p-3 bg-white/[0.02] rounded-xl border border-white/[0.05]">
          <div className="flex items-center gap-1.5 mb-1.5 text-purple-400">
            <Sparkles size={12} />
            <span className="text-[10px] font-semibold uppercase tracking-wider">AI Summary</span>
          </div>
          <p className="text-xs text-white/70 leading-relaxed">{log.aiSummary}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {log.tags.split(',').filter(Boolean).map((tag, i) => (
            <span key={i} className="px-2 py-1 bg-white/[0.05] border border-white/[0.1] rounded-md text-[10px] font-medium text-white/60 flex items-center gap-1">
              <TagIcon size={10} /> {tag.trim()}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-3 text-[10px] font-medium text-white/40">
          {log.dueDate && (
            <span className={`flex items-center gap-1 ${isUpcoming ? 'text-blue-400' : ''}`}>
              <Calendar size={12} /> {new Date(log.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>
          )}
          <span>{new Date(log.timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
        </div>
      </div>
    </div>
  );
};

const FitnessCard: React.FC<{ log: FitnessEntry }> = ({ log }) => {
  const isWeights = log.activityType === 'Weights';
  let parsedData: any = null;
  try {
    parsedData = JSON.parse(log.workoutData);
  } catch (e) {
    console.error("Failed to parse workout data", e);
  }

  return (
    <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-md">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isWeights ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400'}`}>
            {isWeights ? <Dumbbell size={20} /> : <Activity size={20} />}
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">{log.activityType}</h3>
            <p className="text-xs text-white/40">{new Date(log.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}</p>
          </div>
        </div>
      </div>

      {parsedData && (
        <div className="mb-4">
          {isWeights && Array.isArray(parsedData) ? (
            <div className="space-y-2">
              {parsedData.map((set: StrengthSet, idx: number) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-black/20 rounded-xl border border-white/[0.02]">
                  <span className="text-sm font-medium text-white/80">{set.name}</span>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-white/40">{set.sets} × {set.reps}</span>
                    <span className="font-semibold text-blue-400 w-12 text-right">{set.weight} kg</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex gap-4 p-4 bg-black/20 rounded-2xl border border-white/[0.02]">
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Duration</p>
                <p className="text-lg font-semibold text-white flex items-baseline gap-1">
                  {(parsedData as CardioData).duration} <span className="text-xs font-normal text-white/40">min</span>
                </p>
              </div>
              <div className="w-px bg-white/10" />
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Intensity</p>
                <p className="text-sm font-medium text-white mt-1">{(parsedData as CardioData).intensity}</p>
              </div>
              {(parsedData as CardioData).score && (
                <>
                  <div className="w-px bg-white/10" />
                  <div className="flex-1">
                    <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Score</p>
                    <p className="text-sm font-medium text-white mt-1">{(parsedData as CardioData).score}</p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {log.notes && (
        <div className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.05]">
          <p className="text-xs text-white/60 leading-relaxed">{log.notes}</p>
        </div>
      )}
    </div>
  );
};

const FitnessModal = ({ onClose, appPin, addFitnessLog }: { onClose: () => void, appPin: string | null, addFitnessLog: (log: FitnessEntry) => void }) => {
  const [activityType, setActivityType] = useState('Weights');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Weights State
  const [strengthSets, setStrengthSets] = useState<StrengthSet[]>([{ name: '', sets: 0, reps: 0, weight: 0 }]);

  // Cardio/Sports State
  const [duration, setDuration] = useState('');
  const [intensity, setIntensity] = useState('Medium');
  const [score, setScore] = useState('');

  const activityTypes = ['Weights', 'Badminton', 'Cardio', 'Yoga', 'Other'];

  const handleAddSet = () => {
    setStrengthSets([...strengthSets, { name: '', sets: 0, reps: 0, weight: 0 }]);
  };

  const updateSet = (index: number, field: keyof StrengthSet, value: string | number) => {
    const newSets = [...strengthSets];
    newSets[index] = { ...newSets[index], [field]: value };
    setStrengthSets(newSets);
  };

  const removeSet = (index: number) => {
    setStrengthSets(strengthSets.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appPin) return;

    setIsSubmitting(true);
    try {
      const timestamp = new Date().toISOString();
      let workoutData = '';

      if (activityType === 'Weights') {
        const validSets = strengthSets.filter(s => s.name.trim() !== '');
        if (validSets.length === 0) throw new Error("Please add at least one exercise");
        workoutData = JSON.stringify(validSets);
      } else {
        if (!duration) throw new Error("Please enter duration");
        const cardioData: CardioData = {
          duration: parseInt(duration),
          intensity,
          score: score.trim() || undefined
        };
        workoutData = JSON.stringify(cardioData);
      }

      await addFitnessLog({
        timestamp,
        date,
        activityType,
        workoutData,
        notes
      });

      onClose();
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Failed to save workout");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed bottom-0 left-0 right-0 z-[100] bg-[#111] border-t border-white/10 rounded-t-[32px] p-6 flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.5)] max-h-[90vh] overflow-y-auto pb-32"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">Log Workout</h2>
          <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-white/50 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Activity Type Selector */}
          <div className="flex overflow-x-auto pb-2 gap-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {activityTypes.map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setActivityType(type)}
                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors border ${
                  activityType === type 
                    ? 'bg-blue-600 border-blue-500 text-white' 
                    : 'bg-white/[0.03] border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-medium text-white/50 uppercase tracking-wider">Date</label>
            <input
              type="date"
              required
              className="w-full p-4 bg-white/[0.03] rounded-2xl border border-white/[0.08] outline-none text-sm font-medium text-white focus:border-blue-500/50 transition-all [color-scheme:dark]"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Dynamic Fields */}
          {activityType === 'Weights' ? (
            <div className="space-y-4">
              <label className="text-[11px] font-medium text-white/50 uppercase tracking-wider">Exercises</label>
              {strengthSets.map((set, idx) => (
                <div key={idx} className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-2xl space-y-3 relative">
                  {strengthSets.length > 1 && (
                    <button type="button" onClick={() => removeSet(idx)} className="absolute top-3 right-3 text-white/20 hover:text-red-400">
                      <X size={16} />
                    </button>
                  )}
                  <input
                    type="text"
                    placeholder="Exercise Name (e.g., Bench Press)"
                    required
                    value={set.name}
                    onChange={(e) => updateSet(idx, 'name', e.target.value)}
                    className="w-full p-3 bg-black/20 rounded-xl border border-white/[0.05] outline-none text-sm text-white focus:border-blue-500/50"
                  />
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] text-white/40 mb-1 block">Sets</label>
                      <input type="number" min="0" required value={set.sets || ''} onChange={(e) => updateSet(idx, 'sets', parseInt(e.target.value) || 0)} className="w-full p-3 bg-black/20 rounded-xl border border-white/[0.05] outline-none text-sm text-white focus:border-blue-500/50 text-center" />
                    </div>
                    <div>
                      <label className="text-[10px] text-white/40 mb-1 block">Reps</label>
                      <input type="number" min="0" required value={set.reps || ''} onChange={(e) => updateSet(idx, 'reps', parseInt(e.target.value) || 0)} className="w-full p-3 bg-black/20 rounded-xl border border-white/[0.05] outline-none text-sm text-white focus:border-blue-500/50 text-center" />
                    </div>
                    <div>
                      <label className="text-[10px] text-white/40 mb-1 block">Weight (kg)</label>
                      <input type="number" min="0" step="0.5" required value={set.weight || ''} onChange={(e) => updateSet(idx, 'weight', parseFloat(e.target.value) || 0)} className="w-full p-3 bg-black/20 rounded-xl border border-white/[0.05] outline-none text-sm text-white focus:border-blue-500/50 text-center" />
                    </div>
                  </div>
                </div>
              ))}
              <button type="button" onClick={handleAddSet} className="w-full py-3 border border-dashed border-white/20 rounded-2xl text-sm font-medium text-white/50 hover:text-white hover:border-white/40 hover:bg-white/5 transition-all flex items-center justify-center gap-2">
                <Plus size={16} /> Add Exercise
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-medium text-white/50 uppercase tracking-wider">Duration (mins)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full p-4 bg-white/[0.03] rounded-2xl border border-white/[0.08] outline-none text-sm text-white focus:border-blue-500/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-medium text-white/50 uppercase tracking-wider">Intensity</label>
                  <select
                    value={intensity}
                    onChange={(e) => setIntensity(e.target.value)}
                    className="w-full p-4 bg-white/[0.03] rounded-2xl border border-white/[0.08] outline-none text-sm text-white focus:border-blue-500/50 appearance-none"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-medium text-white/50 uppercase tracking-wider">Score / Result (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g., Won 2-1"
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  className="w-full p-4 bg-white/[0.03] rounded-2xl border border-white/[0.08] outline-none text-sm text-white focus:border-blue-500/50"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[11px] font-medium text-white/50 uppercase tracking-wider">Notes (Optional)</label>
            <textarea
              rows={2}
              className="w-full p-4 bg-white/[0.03] rounded-2xl border border-white/[0.08] outline-none text-sm text-white focus:border-blue-500/50 transition-all placeholder:text-white/20 resize-none"
              placeholder="How did it feel?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 disabled:opacity-50 text-white rounded-2xl font-semibold tracking-wide transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] disabled:shadow-none mt-4"
          >
            {isSubmitting ? 'Saving...' : 'Save Workout'}
          </button>
        </form>
      </motion.div>
    </>
  );
};

const LogModal = ({ onClose, appPin, addLifeLog }: { onClose: () => void, appPin: string | null, addLifeLog: (log: LifeLogEntry) => void }) => {
  const [rawText, setRawText] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [aiToggle, setAiToggle] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const generateTags = (text: string) => {
    const lowerText = text.toLowerCase();
    const tags = new Set<string>();
    
    const keywordMap: Record<string, string[]> = {
      'Achievement': ['solved', 'fixed', 'completed', 'finished', 'won', 'achieved', 'success', 'proud', 'milestone', 'done', 'crushed it', 'nailed it', 'breakthrough', 'overcame', 'shipped', 'launched', 'delivered'],
      'Learning': ['learnt', 'learned', 'discovered', 'read', 'studied', 'understood', 'realized', 'course', 'tutorial', 'lesson', 'book', 'article', 'insight', 'epiphany', 'found out', 'research', 'explored'],
      'Idea': ['idea', 'thought', 'brainstorm', 'what if', 'maybe', 'concept', 'innovation', 'could be', 'vision', 'imagine', 'proposal', 'suggestion', 'hypothesis', 'inspiration'],
      'Task': ['todo', 'to-do', 'need to', 'must do', 'task', 'action item', 'pending', 'fix', 'chore', 'errand', 'remind', 'follow up', 'prepare', 'organize', 'clean', 'buy'],
      'Goal': ['goal', 'target', 'aim', 'want to', 'future', 'plan', 'resolution', 'aspire', 'ambition', 'objective', 'strive', 'intention', 'bucket list'],
      'Health': ['workout', 'gym', 'run', 'exercise', 'health', 'sick', 'doctor', 'diet', 'sleep', 'meditate', 'yoga', 'fitness', 'walk', 'cycle', 'swim', 'nutrition', 'mental health', 'therapy', 'recovery', 'rest'],
      'Finance': ['money', 'bought', 'spent', 'invest', 'save', 'budget', 'salary', 'income', 'expense', 'paid', 'cost', 'bill', 'tax', 'crypto', 'stock', 'dividend', 'wealth', 'purchase'],
      'Social': ['met', 'friend', 'family', 'party', 'dinner with', 'coffee with', 'date', 'chat', 'hangout', 'call', 'visited', 'reunion', 'gathering', 'networking', 'community', 'event'],
      'Work': ['work', 'meeting', 'client', 'boss', 'office', 'project', 'presentation', 'interview', 'email', 'colleague', 'manager', 'deadline', 'sprint', 'deploy', 'code', 'bug', 'feature'],
      'Hobby': ['game', 'play', 'movie', 'watch', 'music', 'guitar', 'piano', 'art', 'draw', 'hobby', 'sport', 'craft', 'paint', 'write', 'blog', 'photo', 'video', 'cook', 'bake', 'garden'],
      'Mood': ['happy', 'sad', 'angry', 'frustrated', 'excited', 'anxious', 'tired', 'exhausted', 'grateful', 'feeling', 'stressed', 'overwhelmed', 'joy', 'peaceful', 'calm', 'motivated', 'bored'],
      'Travel': ['travel', 'trip', 'flight', 'hotel', 'vacation', 'holiday', 'visit', 'tour', 'journey', 'explore', 'beach', 'mountain', 'city', 'country'],
      'Tech': ['tech', 'software', 'hardware', 'app', 'website', 'server', 'database', 'api', 'framework', 'library', 'tool', 'device', 'phone', 'laptop', 'computer', 'setup'],
      'Food': ['food', 'eat', 'meal', 'breakfast', 'lunch', 'dinner', 'snack', 'restaurant', 'cafe', 'delicious', 'tasty', 'recipe', 'cooking', 'baking', 'drink', 'coffee', 'tea']
    };

    for (const [tag, keywords] of Object.entries(keywordMap)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        tags.add(tag);
      }
    }

    if (tags.size === 0) {
      tags.add('General');
    }
    
    return Array.from(tags).join(', ');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText.trim()) return;
    
    setIsSubmitting(true);
    try {
      const timestamp = new Date().toISOString();
      const tags = generateTags(rawText);
      let aiSummary = '';

      if (aiToggle) {
        try {
          const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
          const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Summarize the following life log entry in one short, insightful sentence: "${rawText}"`,
          });
          aiSummary = response.text || '';
        } catch (aiError) {
          console.error("AI Summary generation failed:", aiError);
          aiSummary = "Failed to generate AI summary.";
        }
      }

      const newLog: LifeLogEntry = {
        timestamp,
        rawText,
        tags,
        dueDate: dueDate || null,
        aiSummary
      };

      const payload = [
        newLog.timestamp,
        newLog.rawText,
        newLog.tags,
        newLog.dueDate || '',
        newLog.aiSummary
      ];

      const response = await fetch('/api/life-log', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-app-pin': appPin || ''
        },
        body: JSON.stringify({ values: [payload] })
      });

      if (response.ok) {
        addLifeLog(newLog);
        onClose();
      }
    } catch (error) {
      console.error("Failed to save log", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100]"
      />
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed bottom-0 left-0 right-0 z-[100] bg-[#0a0a0a] border-t border-white/[0.08] rounded-t-[32px] p-6 flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.5)] max-h-[90vh] overflow-y-auto pb-32"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white tracking-tight">New Entry</h2>
          <button onClick={onClose} className="p-2.5 bg-white/5 rounded-full text-white/50 hover:text-white transition-colors border border-white/5">
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <textarea
              required
              autoFocus
              rows={4}
              className="w-full p-4 bg-white/[0.03] rounded-2xl border border-white/[0.08] outline-none text-sm text-white focus:border-blue-500/50 transition-all placeholder:text-white/20 resize-none"
              placeholder="What's on your mind? (e.g., Solved client server issue)"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-medium text-white/50 uppercase tracking-wider">Due Date (Optional)</label>
            <input
              type="date"
              className="w-full p-4 bg-white/[0.03] rounded-2xl border border-white/[0.08] outline-none text-sm font-medium text-white focus:border-blue-500/50 transition-all [color-scheme:dark]"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-white/[0.03] rounded-2xl border border-white/[0.08]">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${aiToggle ? 'bg-purple-500/20 text-purple-400' : 'bg-white/5 text-white/40'}`}>
                <Sparkles size={16} />
              </div>
              <div>
                <p className="text-sm font-medium text-white">AI Summary</p>
                <p className="text-[10px] text-white/40">Generate insights with Gemini</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAiToggle(!aiToggle)}
              className={`w-12 h-6 rounded-full transition-colors relative ${aiToggle ? 'bg-purple-500' : 'bg-white/10'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${aiToggle ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !rawText.trim()}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 disabled:opacity-50 text-white rounded-2xl font-semibold tracking-wide transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] disabled:shadow-none mt-4"
          >
            {isSubmitting ? 'Saving...' : 'Save Entry'}
          </button>
        </form>
      </motion.div>
    </>
  );
};
