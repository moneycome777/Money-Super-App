import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { Plus, Search, Calendar, Tag as TagIcon, Sparkles, X, ChevronDown, ChevronRight, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LifeLogEntry } from '../types';
import { GoogleGenAI } from '@google/genai';

// ... (keep the rest the same until LogModal)

export const LifeLog: React.FC = () => {
  const { lifeLogs, fetchLifeLogs, appPin, addLifeLog, hasFetchedLifeLogs, markLifeLogCompleted } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [collapsedDates, setCollapsedDates] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!hasFetchedLifeLogs) {
      fetchLifeLogs();
    }
  }, [hasFetchedLifeLogs, fetchLifeLogs]);

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

  return (
    <div className="bg-[#030303] text-white min-h-screen relative pb-24">
      <div className="px-6 pt-14 pb-4 relative z-10">
        <h1 className="text-3xl font-semibold text-white tracking-tight mb-6">The Pulse</h1>
        
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
      </div>

      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-24 right-6 z-40 w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:bg-blue-500 transition-colors"
      >
        <Plus size={24} strokeWidth={2.5} />
      </button>

      <AnimatePresence>
        {isModalOpen && (
          <LogModal 
            onClose={() => setIsModalOpen(false)} 
            appPin={appPin}
            addLifeLog={addLifeLog}
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
