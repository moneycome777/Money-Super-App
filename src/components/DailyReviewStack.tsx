import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'motion/react';
import { Lightbulb, CheckCircle2, ChevronRight } from 'lucide-react';
import { useStore } from '../store/useStore';
import { InsightEntry } from '../types';
import { InsightsHub } from './InsightsHub';

export const DailyReviewStack: React.FC = () => {
  const { insights, updateInsightReview } = useStore();
  const [reviewQueue, setReviewQueue] = useState<InsightEntry[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [isHubOpen, setIsHubOpen] = useState(false);

  useEffect(() => {
    // Filter insights that need review
    // Rules: ACTIVE status, and lastReviewedAt is null or > 24 hours ago
    const now = new Date();
    const pending = insights.filter(insight => {
      if (insight.status !== 'ACTIVE') return false;
      if (!insight.lastReviewedAt) return true;
      const lastReviewed = new Date(insight.lastReviewedAt);
      const diffHours = (now.getTime() - lastReviewed.getTime()) / (1000 * 60 * 60);
      return diffHours >= 24;
    });

    // Sort by review count (least reviewed first), then take up to 5
    const sorted = pending.sort((a, b) => a.reviewCount - b.reviewCount).slice(0, 5);
    setReviewQueue(sorted);
    
    if (sorted.length === 0 && insights.filter(i => i.status === 'ACTIVE').length > 0) {
      setIsComplete(true);
    }
  }, [insights]);

  const handleSwipe = async (insight: InsightEntry, direction: 'left' | 'right') => {
    // Remove from local queue immediately for snappy UI
    setReviewQueue(prev => prev.filter(i => i.id !== insight.id));
    
    if (reviewQueue.length <= 1) {
      setIsComplete(true);
    }

    // Update in store
    if (insight.rowIndex) {
      const now = new Date().toISOString();
      await updateInsightReview(
        insight.rowIndex, 
        insight.reviewCount + 1, 
        now, 
        insight.status // Keep active, backend/cron will archive after 30 days
      );
    }
  };

  if (reviewQueue.length === 0) {
    if (isComplete) {
      return (
        <>
          <div 
            onClick={() => setIsHubOpen(true)}
            className="bg-white/[0.03] backdrop-blur-xl rounded-2xl p-3 border border-white/[0.08] flex items-center justify-between mb-6 shadow-lg cursor-pointer hover:bg-white/[0.05] transition-colors"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-green-400" />
              <span className="text-xs font-medium text-white/60">Daily Review Complete</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-yellow-400 uppercase tracking-wider font-medium">
              Wisdom Vault <ChevronRight size={14} />
            </div>
          </div>
          <AnimatePresence>
            {isHubOpen && <InsightsHub onClose={() => setIsHubOpen(false)} />}
          </AnimatePresence>
        </>
      );
    }
    return null;
  }

  return (
    <>
      <div className="mb-6 relative h-[160px]">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <Lightbulb size={16} className="text-yellow-400" />
            <h3 className="text-xs font-medium text-white/60 uppercase tracking-wider">Daily Review ({reviewQueue.length})</h3>
          </div>
          <button 
            onClick={() => setIsHubOpen(true)}
            className="flex items-center gap-1 text-[10px] text-yellow-400 uppercase tracking-wider font-medium hover:text-yellow-300 transition-colors"
          >
            Wisdom Vault <ChevronRight size={14} />
          </button>
        </div>
        
        <div className="relative w-full h-[120px] flex justify-center">
        <AnimatePresence>
          {reviewQueue.map((insight, index) => {
            const isTop = index === 0;
            return (
              <motion.div
                key={insight.id}
                initial={{ scale: 0.9, y: 20, opacity: 0 }}
                animate={{ 
                  scale: 1 - index * 0.05, 
                  y: index * 10, 
                  opacity: 1 - index * 0.2,
                  zIndex: reviewQueue.length - index
                }}
                exit={{ x: 300, opacity: 0, scale: 0.5 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                drag={isTop ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={(e, info: PanInfo) => {
                  if (info.offset.x > 100) {
                    handleSwipe(insight, 'right');
                  } else if (info.offset.x < -100) {
                    handleSwipe(insight, 'left');
                  }
                }}
                className="absolute w-full max-w-sm bg-gradient-to-br from-[#1a1a1a] to-[#111] rounded-3xl p-5 border border-white/[0.08] shadow-2xl cursor-grab active:cursor-grabbing"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-medium text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {insight.category}
                  </span>
                  <span className="text-[10px] text-white/30">
                    Swipe to acknowledge
                  </span>
                </div>
                <h4 className="text-base font-semibold text-white mb-1 leading-tight">{insight.title}</h4>
                <p className="text-xs text-white/50 line-clamp-2 leading-relaxed">{insight.context}</p>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
    <AnimatePresence>
      {isHubOpen && <InsightsHub onClose={() => setIsHubOpen(false)} />}
    </AnimatePresence>
    </>
  );
};
