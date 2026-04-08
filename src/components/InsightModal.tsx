import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Lightbulb } from 'lucide-react';
import { useStore } from '../store/useStore';
import { InsightEntry } from '../types';

interface InsightModalProps {
  onClose: () => void;
  initialInsight?: InsightEntry | null;
}

export const InsightModal: React.FC<InsightModalProps> = ({ onClose, initialInsight }) => {
  const { addInsight, updateInsight } = useStore();
  const [title, setTitle] = useState(initialInsight?.title || '');
  const [context, setContext] = useState(initialInsight?.context || '');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    initialInsight?.category ? initialInsight.category.split(',').map(c => c.trim()) : ['Work']
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = ['Work', 'Life', 'Finance', 'Health', 'Relationships', 'Other'];

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev => 
      prev.includes(cat) 
        ? prev.filter(c => c !== cat)
        : [...prev, cat]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || selectedCategories.length === 0) return;

    setIsSubmitting(true);
    try {
      if (initialInsight?.rowIndex) {
        await updateInsight(initialInsight.rowIndex, {
          title: title.trim(),
          context: context.trim(),
          category: selectedCategories.join(', ')
        });
      } else {
        await addInsight({
          timestamp: new Date().toISOString(),
          title: title.trim(),
          context: context.trim(),
          category: selectedCategories.join(', '),
          reviewCount: 0,
          lastReviewedAt: null,
          status: 'ACTIVE'
        });
      }
      onClose();
    } catch (error) {
      console.error(error);
      alert("Failed to save insight");
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
        className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm"
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed bottom-0 left-0 right-0 z-[110] bg-[#111] border-t border-white/10 rounded-t-[32px] p-6 flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.5)] max-h-[90vh] overflow-y-auto pb-32"
      >
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center text-yellow-400">
              <Lightbulb size={20} strokeWidth={1.5} />
            </div>
            <h2 className="text-xl font-semibold text-white">{initialInsight ? 'Edit Insight' : 'Log Insight'}</h2>
          </div>
          <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-white/50 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2">Key Takeaway</label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g., Always get a timeline first"
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-4 py-4 text-white placeholder:text-white/20 focus:outline-none focus:border-yellow-500/50 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2">Context / Details</label>
            <textarea
              value={context}
              onChange={e => setContext(e.target.value)}
              placeholder="What led to this insight? How will you apply it?"
              rows={4}
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-4 py-4 text-white placeholder:text-white/20 focus:outline-none focus:border-yellow-500/50 transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2">Categories (Select multiple)</label>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${
                    selectedCategories.includes(cat) 
                      ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' 
                      : 'bg-white/[0.03] text-white/50 border-white/[0.08] hover:bg-white/[0.08]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !title.trim() || selectedCategories.length === 0}
            className="w-full py-4 bg-yellow-600 hover:bg-yellow-500 text-white rounded-2xl font-medium text-lg active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:bg-yellow-600 shadow-[0_0_30px_-5px_rgba(202,138,4,0.5)]"
          >
            {isSubmitting ? 'Saving...' : 'Save Insight'}
          </button>
        </form>
      </motion.div>
    </>
  );
};
