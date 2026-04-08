import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Lightbulb, Calendar, Sparkles, Edit2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { InsightEntry } from '../types';
import { InsightModal } from './InsightModal';

interface InsightsHubProps {
  onClose: () => void;
}

export const InsightsHub: React.FC<InsightsHubProps> = ({ onClose }) => {
  const { insights, insightSummaries } = useStore();
  const [activeTab, setActiveTab] = useState<'active' | 'summaries'>('active');
  const [editingInsight, setEditingInsight] = useState<InsightEntry | null>(null);

  const activeInsights = insights.filter(i => i.status === 'ACTIVE').sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm"
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed bottom-0 left-0 right-0 z-[100] bg-[#111] border-t border-white/10 rounded-t-[32px] p-6 flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.5)] h-[90vh]"
      >
        <div className="flex justify-between items-center mb-6 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center text-yellow-400">
              <Lightbulb size={20} strokeWidth={1.5} />
            </div>
            <h2 className="text-xl font-semibold text-white">Wisdom Vault</h2>
          </div>
          <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-white/50 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Segmented Control */}
        <div className="flex bg-white/[0.03] p-1 rounded-2xl mb-6 shrink-0 border border-white/[0.05]">
          <button
            onClick={() => setActiveTab('active')}
            className={`flex-1 py-2.5 text-sm font-medium rounded-xl transition-all ${
              activeTab === 'active' 
                ? 'bg-white/10 text-white shadow-sm' 
                : 'text-white/40 hover:text-white/70'
            }`}
          >
            Recent Insights
          </button>
          <button
            onClick={() => setActiveTab('summaries')}
            className={`flex-1 py-2.5 text-sm font-medium rounded-xl transition-all ${
              activeTab === 'summaries' 
                ? 'bg-white/10 text-white shadow-sm' 
                : 'text-white/40 hover:text-white/70'
            }`}
          >
            Monthly Summaries
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pb-32 custom-scrollbar">
          <AnimatePresence mode="wait">
            {activeTab === 'active' ? (
              <motion.div
                key="active"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {activeInsights.length === 0 ? (
                  <div className="text-center py-12 text-white/40">
                    <Lightbulb size={32} className="mx-auto mb-3 opacity-20" />
                    <p>No active insights.</p>
                    <p className="text-xs mt-1">Log a new insight to see it here.</p>
                  </div>
                ) : (
                  activeInsights.map(insight => (
                    <div key={insight.id} className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 relative group">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-medium text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          {insight.category}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-white/30">
                            Reviewed {insight.reviewCount} times
                          </span>
                          <button 
                            onClick={() => setEditingInsight(insight)}
                            className="text-white/30 hover:text-white/70 transition-colors"
                          >
                            <Edit2 size={14} />
                          </button>
                        </div>
                      </div>
                      <h4 className="text-base font-semibold text-white mb-2 pr-6">{insight.title}</h4>
                      <p className="text-sm text-white/60 leading-relaxed">{insight.context}</p>
                    </div>
                  ))
                )}
              </motion.div>
            ) : (
              <motion.div
                key="summaries"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {insightSummaries.length === 0 ? (
                  <div className="text-center py-12 text-white/40">
                    <Calendar size={32} className="mx-auto mb-3 opacity-20" />
                    <p>No monthly summaries yet.</p>
                    <p className="text-xs mt-1">Summaries are generated at the end of each month.</p>
                  </div>
                ) : (
                  insightSummaries.sort((a, b) => b.month.localeCompare(a.month)).map(summary => (
                    <div key={summary.id} className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-white/[0.08] rounded-2xl p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles size={16} className="text-blue-400" />
                        <h4 className="text-sm font-semibold text-white tracking-wide">{new Date(summary.month + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</h4>
                      </div>
                      <div className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">
                        {summary.summary}
                      </div>
                    </div>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <AnimatePresence>
        {editingInsight && (
          <InsightModal 
            initialInsight={editingInsight} 
            onClose={() => setEditingInsight(null)} 
          />
        )}
      </AnimatePresence>
    </>
  );
};
