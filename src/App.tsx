import React, { useEffect, useState, useRef } from 'react';
import { useStore } from './store/useStore';
import { Dashboard } from './components/Dashboard';
import { VaultView } from './components/VaultView';
import { Analysis } from './components/Analysis';
import { Discovery } from './components/Discovery';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Lock, LogIn, KeyRound, Home, PieChart, Plus, RefreshCw, Compass, TrendingUp } from 'lucide-react';
import { ExpenseForm } from './components/ExpenseForm';

export default function App() {
  const { 
    isAuthenticated, 
    setAuthenticated, 
    setExpenses, 
    setLoading, 
    isLoading,
    isStealthMode,
    toggleStealthMode,
    appPin,
    fetchExpenses,
    fetchCategories
  } = useStore();

  const [tapCount, setTapCount] = useState(0);
  const [pinInput, setPinInput] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'home' | 'analysis' | 'discovery' | 'invest'>('home');
  const [isAdding, setIsAdding] = useState(false);
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isAuthenticated && appPin) {
      fetchExpenses();
      fetchCategories();
      useStore.getState().fetchFoodMaster();
    }
  }, [isAuthenticated, appPin, activeTab]); // Added activeTab to trigger auto-update when opening analysis page

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const response = await fetch('/api/auth/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinInput })
      });
      
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await response.json();
        if (data.success) {
          setAuthenticated(true, pinInput);
        } else {
          setError(data.error || "Incorrect PIN");
        }
      } else {
        const text = await response.text();
        console.error("Non-JSON response:", text);
        setError(`Server error: ${response.status} ${response.statusText}`);
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      setError(`Connection error: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoTap = () => {
    setTapCount(prev => prev + 1);
    if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
    
    tapTimeoutRef.current = setTimeout(() => {
      if (tapCount + 1 >= 3) {
        toggleStealthMode();
      }
      setTapCount(0);
    }, 500);
  };

  // Auto-lock logic
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && isStealthMode) {
        toggleStealthMode();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isStealthMode]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-[100dvh] bg-[#030303] flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 w-full max-w-xs">
          <div className="w-20 h-20 bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl rounded-3xl flex items-center justify-center text-blue-500 mx-auto mb-8 shadow-2xl">
            <Shield size={36} strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl font-semibold text-white tracking-tight mb-2">Vault Access</h1>
          <p className="text-sm text-white/50 mb-10 font-medium">Enter your secure PIN to continue</p>
          
          <form onSubmit={handlePinSubmit} className="space-y-6">
            <div className="relative">
              <input 
                type="password" 
                pattern="[0-9]*"
                inputMode="numeric"
                placeholder="••••••"
                value={pinInput}
                onChange={e => setPinInput(e.target.value)}
                className="w-full py-5 bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl rounded-2xl outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 text-center text-3xl tracking-[0.5em] font-medium text-white transition-all placeholder:text-white/20"
              />
            </div>
            {error && <p className="text-red-400 text-sm font-medium">{error}</p>}
            <button 
              type="submit"
              disabled={isLoading || !pinInput}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-medium text-lg active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:bg-blue-600 shadow-[0_0_40px_-10px_rgba(37,99,235,0.5)]"
            >
              {isLoading ? 'Verifying...' : 'Unlock Vault'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#030303] min-h-[100dvh] text-white relative overflow-hidden">
      {/* Ambient Glows */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none z-0" />
      
      {/* Invisible Logo Tap Area */}
      <div 
        onClick={handleLogoTap}
        className="fixed top-12 left-6 w-12 h-12 z-[110] cursor-pointer"
      />

      <div className="pb-28 relative z-10">
        {activeTab === 'home' && <Dashboard />}
        {activeTab === 'analysis' && <Analysis />}
        {activeTab === 'discovery' && <Discovery />}
        {activeTab === 'invest' && (
          <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-400 mb-4">
              <TrendingUp size={32} />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Investment Module</h2>
            <p className="text-white/50 text-sm">Coming soon. Track your portfolio and assets here.</p>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-6 left-6 right-6 bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] rounded-3xl px-6 py-4 flex justify-around items-center z-40 shadow-2xl">
        <button 
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center gap-1.5 w-16 transition-colors ${activeTab === 'home' ? 'text-white' : 'text-white/40'}`}
        >
          <Home size={22} strokeWidth={1.5} />
          <span className="text-[10px] font-medium tracking-wide">Home</span>
        </button>
        
        <button 
          onClick={() => setActiveTab('discovery')}
          className={`flex flex-col items-center gap-1.5 w-16 transition-colors ${activeTab === 'discovery' ? 'text-white' : 'text-white/40'}`}
        >
          <Compass size={22} strokeWidth={1.5} />
          <span className="text-[10px] font-medium tracking-wide">Discover</span>
        </button>

        <button 
          onClick={() => setIsAdding(true)}
          className="flex flex-col items-center justify-center -mt-8"
        >
          <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center text-white active:scale-95 transition-transform shadow-[0_0_30px_-5px_rgba(37,99,235,0.6)] border border-blue-400/30">
            <Plus size={28} strokeWidth={1.5} />
          </div>
        </button>

        <button 
          onClick={() => setActiveTab('analysis')}
          className={`flex flex-col items-center gap-1.5 w-16 transition-colors ${activeTab === 'analysis' ? 'text-white' : 'text-white/40'}`}
        >
          <PieChart size={22} strokeWidth={1.5} />
          <span className="text-[10px] font-medium tracking-wide">Analysis</span>
        </button>

        <button 
          onClick={() => setActiveTab('invest')}
          className={`flex flex-col items-center gap-1.5 w-16 transition-colors ${activeTab === 'invest' ? 'text-white' : 'text-white/40'}`}
        >
          <TrendingUp size={22} strokeWidth={1.5} />
          <span className="text-[10px] font-medium tracking-wide">Invest</span>
        </button>
      </div>

      <AnimatePresence>
        {isAdding && <ExpenseForm onClose={() => setIsAdding(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {isStealthMode && <VaultView />}
      </AnimatePresence>

      {isLoading && (
        <div className="fixed inset-0 bg-[#030303]/80 backdrop-blur-md z-[200] flex items-center justify-center">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="w-12 h-12 border-[3px] border-white/10 border-t-blue-500 rounded-full"
          />
        </div>
      )}
    </div>
  );
}
