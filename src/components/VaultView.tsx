import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Lock, Plus, Search, ChevronDown, ChevronUp, CheckCircle2, Target, Calendar, DollarSign, X, PieChart as PieChartIcon, TrendingUp, Wallet } from 'lucide-react';
import { format, differenceInDays, parseISO, isValid } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { WealthDashboard } from './WealthDashboard';

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6'];

export const VaultView: React.FC = () => {
  const { appPin, vaultPin, setVaultPin, toggleStealthMode, fetchVaultEntries, hasFetchedVaultEntries } = useStore();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const isSettingPin = !vaultPin;
  const [error, setError] = useState('');
  
  useEffect(() => {
    if (isUnlocked && !hasFetchedVaultEntries) {
      fetchVaultEntries();
    }
  }, [isUnlocked, hasFetchedVaultEntries, fetchVaultEntries]);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSettingPin) {
      if (pinInput.length < 4) {
        setError('PIN must be at least 4 digits');
        return;
      }
      if (pinInput !== confirmPinInput) {
        setError('PINs do not match');
        return;
      }
      setVaultPin(pinInput);
      setIsUnlocked(true);
      setError('');
    } else {
      if (pinInput === vaultPin) {
        setIsUnlocked(true);
        setError('');
      } else {
        setError('Invalid PIN');
        setPinInput('');
      }
    }
  };

  if (!isUnlocked) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed inset-0 z-[200] bg-[#030303] p-6 flex flex-col items-center justify-center"
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 w-full max-w-xs">
          <div className="w-20 h-20 bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl rounded-3xl flex items-center justify-center text-purple-500 mx-auto mb-8 shadow-2xl">
            <Shield size={36} strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl font-semibold text-white tracking-tight mb-2 text-center">Stealth Vault</h1>
          <p className="text-sm text-white/50 mb-10 font-medium text-center">
            {isSettingPin ? 'Create a new PIN for your Vault' : 'Enter PIN to access secure savings'}
          </p>
          
          <form onSubmit={handlePinSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="relative">
                <input 
                  type="password" 
                  pattern="[0-9]*"
                  inputMode="numeric"
                  placeholder="••••••"
                  value={pinInput}
                  onChange={e => setPinInput(e.target.value)}
                  autoFocus
                  className="w-full py-5 bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl rounded-2xl outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 text-center text-3xl tracking-[0.5em] font-medium text-white transition-all placeholder:text-white/20"
                />
              </div>
              {isSettingPin && (
                <div className="relative">
                  <input 
                    type="password" 
                    pattern="[0-9]*"
                    inputMode="numeric"
                    placeholder="Confirm PIN"
                    value={confirmPinInput}
                    onChange={e => setConfirmPinInput(e.target.value)}
                    className="w-full py-5 bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl rounded-2xl outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 text-center text-3xl tracking-[0.5em] font-medium text-white transition-all placeholder:text-white/20"
                  />
                </div>
              )}
            </div>
            {error && <p className="text-red-400 text-sm font-medium text-center">{error}</p>}
            <button 
              type="submit"
              disabled={!pinInput || (isSettingPin && !confirmPinInput)}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white py-4 rounded-2xl font-medium text-lg active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:bg-purple-600 shadow-[0_0_40px_-10px_rgba(147,51,234,0.5)]"
            >
              {isSettingPin ? 'Set Vault PIN' : 'Unlock Vault'}
            </button>
            <button 
              type="button"
              onClick={toggleStealthMode}
              className="w-full py-4 text-white/50 hover:text-white transition-colors text-sm font-medium"
            >
              Cancel
            </button>
          </form>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 z-[200] bg-[#030303] flex flex-col"
    >
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none z-0" />
      
      {/* Header */}
      <div className="px-6 pt-14 pb-4 relative z-10 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center text-purple-400">
            <Shield size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Wealth Vault</h2>
            <p className="text-[10px] font-bold text-purple-400/60 uppercase tracking-widest">Encrypted Session</p>
          </div>
        </div>
        <button 
          onClick={toggleStealthMode}
          className="w-10 h-10 bg-white/[0.03] border border-white/[0.08] backdrop-blur-md rounded-full flex items-center justify-center text-white/60 hover:text-white transition-colors"
        >
          <Lock size={18} />
        </button>
      </div>

      <WealthDashboard />
    </motion.div>
  );
};
