import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Expense, UOBCycle, DashboardStats, LifeLogEntry, VaultEntry, FitnessEntry, InsightEntry, MonthlyInsightSummary, PetLogEntry, WealthLogEntry, WealthConfig, StockPriceData } from '../types';
import { 
  startOfMonth, 
  endOfMonth, 
  isWithinInterval, 
  differenceInDays, 
  addMonths, 
  subMonths,
  set as setFns
} from 'date-fns';

interface AppState {
  expenses: Expense[];
  lifeLogs: LifeLogEntry[];
  hasFetchedLifeLogs: boolean;
  vaultEntries: VaultEntry[];
  hasFetchedVaultEntries: boolean;
  fitnessLogs: FitnessEntry[];
  hasFetchedFitnessLogs: boolean;
  insights: InsightEntry[];
  hasFetchedInsights: boolean;
  insightSummaries: MonthlyInsightSummary[];
  hasFetchedInsightSummaries: boolean;
  wealthLogs: WealthLogEntry[];
  hasFetchedWealthLogs: boolean;
  wealthConfigs: Record<string, string>;
  hasFetchedWealthConfigs: boolean;
  categories: string[];
  foodTypes: string[];
  restaurants: string[];
  isStealthMode: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  appPin: string | null;
  vaultPin: string | null;
  monthlyBudget: number;
  categoryBudgets: Record<string, number>;
  isBalanceHidden: boolean;
  
  setExpenses: (expenses: Expense[]) => void;
  addExpense: (expense: Expense) => void;
  updateExpense: (rowIndex: number, updates: Partial<Expense>) => void;
  setLifeLogs: (logs: LifeLogEntry[]) => void;
  addLifeLog: (log: LifeLogEntry) => void;
  setVaultEntries: (entries: VaultEntry[]) => void;
  addVaultEntry: (entry: VaultEntry) => void;
  addCategory: (category: string) => void;
  removeCategory: (category: string) => void;
  setMonthlyBudget: (budget: number) => void;
  setCategoryBudget: (category: string, amount: number) => void;
  setVaultPin: (pin: string) => void;
  toggleStealthMode: () => void;
  setAuthenticated: (status: boolean, pin?: string) => void;
  setLoading: (status: boolean) => void;
  logout: () => void;
  fetchExpenses: () => Promise<void>;
  fetchLifeLogs: () => Promise<void>;
  markLifeLogCompleted: (rowIndex: number) => Promise<void>;
  fetchVaultEntries: () => Promise<void>;
  fetchFitnessLogs: () => Promise<void>;
  addFitnessLog: (entry: FitnessEntry) => Promise<void>;
  fetchInsights: () => Promise<void>;
  addInsight: (entry: InsightEntry) => Promise<void>;
  updateInsight: (rowIndex: number, updates: Partial<InsightEntry>) => Promise<void>;
  updateInsightReview: (rowIndex: number, reviewCount: number, lastReviewedAt: string, status: 'ACTIVE' | 'ARCHIVED') => Promise<void>;
  fetchInsightSummaries: () => Promise<void>;
  addInsightSummary: (summary: MonthlyInsightSummary) => Promise<void>;
  fetchWealthLogs: () => Promise<void>;
  addWealthLog: (entry: WealthLogEntry) => Promise<void>;
  updateWealthLog: (rowIndex: number, entry: WealthLogEntry) => Promise<void>;
  deleteWealthLog: (rowIndex: number) => Promise<void>;
  fetchWealthConfigs: () => Promise<void>;
  updateWealthConfig: (key: string, value: string) => Promise<void>;
  fetchStockPrice: (symbol: string) => Promise<StockPriceData | null>;
  fetchCategories: () => Promise<void>;
  fetchFoodMaster: () => Promise<void>;
  addFoodMaster: (type: 'Food' | 'Restaurant', value: string) => Promise<void>;
  
  fetchSettings: () => Promise<void>;
  getUOBCycle: () => UOBCycle;
  getDashboardStats: () => DashboardStats;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      expenses: [],
      lifeLogs: [],
      hasFetchedLifeLogs: false,
      vaultEntries: [],
      hasFetchedVaultEntries: false,
      fitnessLogs: [],
      hasFetchedFitnessLogs: false,
      insights: [],
      hasFetchedInsights: false,
      insightSummaries: [],
      hasFetchedInsightSummaries: false,
      wealthLogs: [],
      hasFetchedWealthLogs: false,
      wealthConfigs: {},
      hasFetchedWealthConfigs: false,
      categories: ['Food', 'Transport', 'Groceries', 'Entertainment', 'Bills', 'Investment', 'Others'],
      foodTypes: [],
      restaurants: [],
      isStealthMode: false,
      isAuthenticated: false,
      isLoading: false,
      appPin: null,
      vaultPin: null,
      monthlyBudget: 0,
      categoryBudgets: {},
      isBalanceHidden: false,

      setExpenses: (expenses) => set({ expenses }),
      addExpense: (expense) => set((state) => ({ expenses: [...state.expenses, expense] })),
      updateExpense: (rowIndex, updates) => set((state) => ({
        expenses: state.expenses.map(exp => 
          exp.rowIndex === rowIndex ? { ...exp, ...updates } : exp
        )
      })),
      setLifeLogs: (logs) => set({ lifeLogs: logs }),
      addLifeLog: (log) => set((state) => ({ lifeLogs: [...state.lifeLogs, log] })),
      setVaultEntries: (entries) => set({ vaultEntries: entries }),
      addVaultEntry: (entry) => set((state) => ({ vaultEntries: [...state.vaultEntries, entry] })),
      addCategory: async (category) => {
        const state = get();
        if (state.categories.includes(category)) return;
        const newCategories = [...state.categories, category];
        set({ categories: newCategories });
        
        // Sync to backend
        if (state.appPin) {
          try {
            await fetch('/api/categories', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', 'x-app-pin': state.appPin },
              body: JSON.stringify({ categories: newCategories })
            });
          } catch (e) {
            console.error('Failed to sync categories', e);
          }
        }
      },
      removeCategory: async (category) => {
        const state = get();
        const newCategories = state.categories.filter(c => c !== category);
        set({ categories: newCategories });
        
        // Sync to backend
        if (state.appPin) {
          try {
            await fetch('/api/categories', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', 'x-app-pin': state.appPin },
              body: JSON.stringify({ categories: newCategories })
            });
          } catch (e) {
            console.error('Failed to sync categories', e);
          }
        }
      },
      setMonthlyBudget: async (budget) => {
        set({ monthlyBudget: budget });
        const state = get();
        if (state.appPin) {
          try {
            await fetch('/api/settings', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', 'x-app-pin': state.appPin },
              body: JSON.stringify({ key: 'MonthlyBudget', value: budget.toString() })
            });
          } catch (e) {
            console.error('Failed to sync budget', e);
          }
        }
      },
      setCategoryBudget: async (category, amount) => {
        set((state) => ({
          categoryBudgets: { ...state.categoryBudgets, [category]: amount }
        }));
        
        const state = get();
        if (state.appPin) {
          try {
            await fetch('/api/settings', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', 'x-app-pin': state.appPin },
              body: JSON.stringify({ 
                key: 'CategoryBudgets', 
                value: JSON.stringify(state.categoryBudgets) 
              })
            });
          } catch (e) {
            console.error('Failed to sync category budget', e);
          }
        }
      },
      setVaultPin: async (pin) => {
        set({ vaultPin: pin });
        const state = get();
        if (state.appPin) {
          try {
            await fetch('/api/settings', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', 'x-app-pin': state.appPin },
              body: JSON.stringify({ key: 'VaultPin', value: pin })
            });
          } catch (e) {
            console.error('Failed to sync vault pin', e);
          }
        }
      },
      toggleStealthMode: () => set((state) => ({ isStealthMode: !state.isStealthMode })),
      setAuthenticated: (status, pin) => set({ isAuthenticated: status, appPin: pin || get().appPin }),
      setLoading: (status) => set({ isLoading: status }),
      logout: () => set({ 
        isAuthenticated: false, 
        appPin: null, 
        vaultPin: null,
        expenses: [], 
        lifeLogs: [], 
        hasFetchedLifeLogs: false,
        vaultEntries: [],
        hasFetchedVaultEntries: false,
        isStealthMode: false
      }),

      fetchExpenses: async () => {
        const pin = get().appPin;
        if (!pin) return;
        
        set({ isLoading: true });
        try {
          const response = await fetch('/api/expenses', {
            headers: { 'x-app-pin': pin }
          });
          
          if (!response.ok) {
            if (response.status === 401) {
              set({ isAuthenticated: false });
            }
            const text = await response.text();
            throw new Error(`Fetch failed: ${response.status} ${text.slice(0, 100)}`);
          }
          
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.indexOf("application/json") !== -1) {
            const data = await response.json();
            if (Array.isArray(data) && data.length > 0) {
              const mapped = data.slice(1).map((row: any, index: number) => ({
                rowIndex: index + 2,
                date: row[0],
                amount: parseFloat(row[1]),
                category: row[2],
                paymentMethod: row[3],
                sharedFlag: row[4] === 'TRUE',
                collectedAmount: parseFloat(row[5] || '0'),
                togetherFlag: row[6] === 'TRUE',
                isReimbursable: row[7] === 'TRUE',
                isNeed: row[8] === 'TRUE',
                description: row[9] || '',
                restaurant: row[10] || '',
                tier: row[11] || '',
                petCategory: row[12] || '',
                nextDueDate: row[13] || ''
              }));
              set({ expenses: mapped });
            }
          } else {
            const text = await response.text();
            console.error("Non-JSON response from expenses:", text);
          }
        } catch (error) {
          console.error("Fetch failed:", error);
        } finally {
          set({ isLoading: false });
        }
      },

      fetchLifeLogs: async () => {
        const pin = get().appPin;
        if (!pin) return;
        
        set({ isLoading: true });
        try {
          const response = await fetch('/api/life-log', {
            headers: { 'x-app-pin': pin }
          });
          
          if (!response.ok) {
            throw new Error(`Fetch failed: ${response.status}`);
          }
          
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.indexOf("application/json") !== -1) {
            const data = await response.json();
            if (Array.isArray(data)) {
              const mapped = data.map((row: any, index: number) => ({
                rowIndex: index + 2,
                timestamp: row[0] || '',
                rawText: row[1] || '',
                tags: row[2] || '',
                dueDate: row[3] || null,
                aiSummary: row[4] || '',
                status: row[5] || ''
              }));
              set({ lifeLogs: mapped, hasFetchedLifeLogs: true });
            }
          }
        } catch (error) {
          console.error("Fetch life logs failed:", error);
        } finally {
          set({ isLoading: false });
        }
      },

      markLifeLogCompleted: async (rowIndex: number) => {
        const pin = get().appPin;
        if (!pin) return;
        
        // Optimistic update
        set(state => ({
          lifeLogs: state.lifeLogs.filter(log => log.rowIndex !== rowIndex)
        }));
        
        try {
          await fetch(`/api/life-log/${rowIndex}/complete`, {
            method: 'PUT',
            headers: { 'x-app-pin': pin }
          });
        } catch (error) {
          console.error("Failed to mark life log as completed", error);
          // Optionally revert optimistic update by re-fetching
          get().fetchLifeLogs();
        }
      },

      fetchVaultEntries: async () => {
        const pin = get().appPin;
        if (!pin) return;
        
        set({ isLoading: true });
        try {
          const response = await fetch('/api/vault', {
            headers: { 'x-app-pin': pin }
          });
          
          if (!response.ok) {
            throw new Error(`Fetch failed: ${response.status}`);
          }
          
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.indexOf("application/json") !== -1) {
            const data = await response.json();
            if (Array.isArray(data)) {
              const mapped = data.map((row: any, index: number) => ({
                rowIndex: index + 2,
                timestamp: row[0] || '',
                type: row[1] || '',
                goalName: row[2] || '',
                amount: parseFloat(row[3] || '0'),
                dueDate: row[4] || null,
                monthlyContribution: parseFloat(row[5] || '0')
              }));
              set({ vaultEntries: mapped, hasFetchedVaultEntries: true });
            }
          }
        } catch (error) {
          console.error("Fetch vault entries failed:", error);
        } finally {
          set({ isLoading: false });
        }
      },

      fetchFitnessLogs: async () => {
        const pin = get().appPin;
        if (!pin) return;
        
        set({ isLoading: true });
        try {
          const response = await fetch('/api/fitness', {
            headers: { 'x-app-pin': pin }
          });
          
          if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data)) {
              const mapped = data.map((row: any, index: number) => ({
                rowIndex: index + 2,
                timestamp: row[0] || '',
                date: row[1] || '',
                activityType: row[2] || '',
                workoutData: row[3] || '{}',
                notes: row[4] || ''
              }));
              set({ fitnessLogs: mapped, hasFetchedFitnessLogs: true });
            }
          }
        } catch (error) {
          console.error("Fetch fitness logs failed:", error);
        } finally {
          set({ isLoading: false });
        }
      },

      addFitnessLog: async (entry) => {
        const pin = get().appPin;
        if (!pin) return;
        
        // Optimistic update
        set(state => ({ fitnessLogs: [...state.fitnessLogs, entry] }));
        
        try {
          const values = [[entry.timestamp, entry.date, entry.activityType, entry.workoutData, entry.notes]];
          await fetch('/api/fitness', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-app-pin': pin },
            body: JSON.stringify({ values })
          });
          get().fetchFitnessLogs(); // Re-fetch to get accurate row index
        } catch (error) {
          console.error("Failed to add fitness log", error);
        }
      },

      fetchInsights: async () => {
        const pin = get().appPin;
        if (!pin) return;
        try {
          const response = await fetch('/api/insights', { headers: { 'x-app-pin': pin } });
          if (response.ok) {
            const data = await response.json();
            set({ insights: data, hasFetchedInsights: true });
          }
        } catch (error) {
          console.error("Fetch insights failed:", error);
        }
      },

      addInsight: async (entry) => {
        const pin = get().appPin;
        if (!pin) return;
        try {
          await fetch('/api/insights', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-app-pin': pin },
            body: JSON.stringify(entry)
          });
          get().fetchInsights();
        } catch (error) {
          console.error("Failed to add insight", error);
        }
      },

      updateInsight: async (rowIndex, updates) => {
        const pin = get().appPin;
        if (!pin) return;

        // Optimistic update
        set(state => ({
          insights: state.insights.map(i => 
            i.rowIndex === rowIndex ? { ...i, ...updates } : i
          )
        }));

        try {
          await fetch(`/api/insights/${rowIndex}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'x-app-pin': pin },
            body: JSON.stringify(updates)
          });
        } catch (error) {
          console.error("Failed to update insight", error);
          get().fetchInsights(); // Revert on failure
        }
      },

      updateInsightReview: async (rowIndex, reviewCount, lastReviewedAt, status) => {
        const pin = get().appPin;
        if (!pin) return;
        
        // Optimistic update
        set(state => ({
          insights: state.insights.map(i => 
            i.rowIndex === rowIndex ? { ...i, reviewCount, lastReviewedAt, status } : i
          )
        }));

        try {
          await fetch(`/api/insights/${rowIndex}/review`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'x-app-pin': pin },
            body: JSON.stringify({ reviewCount, lastReviewedAt, status })
          });
        } catch (error) {
          console.error("Failed to update insight review", error);
          get().fetchInsights(); // Revert on failure
        }
      },

      fetchInsightSummaries: async () => {
        const pin = get().appPin;
        if (!pin) return;
        try {
          const response = await fetch('/api/insight-summaries', { headers: { 'x-app-pin': pin } });
          if (response.ok) {
            const data = await response.json();
            set({ insightSummaries: data, hasFetchedInsightSummaries: true });
          }
        } catch (error) {
          console.error("Fetch insight summaries failed:", error);
        }
      },

      addInsightSummary: async (summary) => {
        const pin = get().appPin;
        if (!pin) return;
        try {
          await fetch('/api/insight-summaries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-app-pin': pin },
            body: JSON.stringify(summary)
          });
          get().fetchInsightSummaries();
        } catch (error) {
          console.error("Failed to add insight summary", error);
        }
      },

      fetchWealthLogs: async () => {
        const pin = get().appPin;
        if (!pin) return;
        set({ isLoading: true });
        try {
          const response = await fetch('/api/wealth-log', { headers: { 'x-app-pin': pin } });
          const data = await response.json();
          if (Array.isArray(data)) {
            const mapped = data.slice(1).map((row: any, index: number) => ({
              rowIndex: index + 2,
              date: row[0],
              type: row[1],
              category: row[2],
              amountMYR: parseFloat(row[3] || '0'),
              amountUSD: row[4] ? parseFloat(row[4]) : undefined,
              priceUSD: row[5] ? parseFloat(row[5]) : undefined,
              units: row[6] ? parseFloat(row[6]) : undefined,
              notes: row[7] || ''
            })).filter((log: any) => log.date && log.category);
            set({ wealthLogs: mapped, hasFetchedWealthLogs: true });
          }
        } catch (error) {
          console.error("Fetch wealth logs failed:", error);
        } finally {
          set({ isLoading: false });
        }
      },

      addWealthLog: async (entry) => {
        const pin = get().appPin;
        if (!pin) return;
        try {
          const values = [[
            entry.date, 
            entry.type, 
            entry.category, 
            entry.amountMYR, 
            entry.amountUSD || '', 
            entry.priceUSD || '', 
            entry.units || '', 
            entry.notes || ''
          ]];
          await fetch('/api/wealth-log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-app-pin': pin },
            body: JSON.stringify({ values })
          });
          get().fetchWealthLogs();
        } catch (error) {
          console.error("Failed to add wealth log", error);
        }
      },

      updateWealthLog: async (rowIndex: number, entry: WealthLogEntry) => {
        const pin = get().appPin;
        if (!pin) return;
        try {
          const values = [[
            entry.date, 
            entry.type, 
            entry.category, 
            entry.amountMYR, 
            entry.amountUSD || '', 
            entry.priceUSD || '', 
            entry.units || '', 
            entry.notes || ''
          ]];
          await fetch(`/api/wealth-log/${rowIndex}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'x-app-pin': pin },
            body: JSON.stringify({ values })
          });
          get().fetchWealthLogs();
        } catch (error) {
          console.error("Failed to update wealth log", error);
        }
      },

      deleteWealthLog: async (rowIndex: number) => {
        const pin = get().appPin;
        if (!pin) return;
        try {
          await fetch(`/api/wealth-log/${rowIndex}`, {
            method: 'DELETE',
            headers: { 'x-app-pin': pin }
          });
          get().fetchWealthLogs();
        } catch (error) {
          console.error("Failed to delete wealth log", error);
        }
      },

      fetchWealthConfigs: async () => {
        const pin = get().appPin;
        if (!pin) return;
        try {
          const response = await fetch('/api/wealth-config', { headers: { 'x-app-pin': pin } });
          const data = await response.json();
          if (Array.isArray(data)) {
            const configs: Record<string, string> = {};
            data.forEach(row => {
              if (row[0] && row[0] !== 'Key') {
                configs[row[0]] = row[1] || '';
              }
            });
            set({ wealthConfigs: configs, hasFetchedWealthConfigs: true });
          }
        } catch (error) {
          console.error("Fetch wealth config failed:", error);
        }
      },

      updateWealthConfig: async (key, value) => {
        const pin = get().appPin;
        if (!pin) return;
        try {
          await fetch('/api/wealth-config', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'x-app-pin': pin },
            body: JSON.stringify({ key, value })
          });
          set(state => ({
            wealthConfigs: { ...state.wealthConfigs, [key]: value }
          }));
        } catch (error) {
          console.error("Failed to update wealth config", error);
        }
      },

      fetchStockPrice: async (symbol) => {
        const pin = get().appPin;
        if (!pin) return null;
        try {
          const response = await fetch(`/api/stock-price?symbol=${symbol}`, { 
            headers: { 'x-app-pin': pin } 
          });
          if (response.ok) {
            return await response.json();
          }
        } catch (error) {
          console.error(`Failed to fetch stock price for ${symbol}`, error);
        }
        return null;
      },

      fetchCategories: async () => {
        const pin = get().appPin;
        if (!pin) return;
        
        try {
          const response = await fetch('/api/categories', {
            headers: { 'x-app-pin': pin }
          });
          if (response.ok) {
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
              const data = await response.json();
              if (Array.isArray(data) && data.length > 0) {
                set({ categories: data });
              }
            }
          }
        } catch (error) {
          console.error("Fetch categories failed:", error);
        }
      },

      fetchFoodMaster: async () => {
        const pin = get().appPin;
        if (!pin) return;
        
        try {
          const response = await fetch('/api/food-master', {
            headers: { 'x-app-pin': pin }
          });
          if (response.ok) {
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
              const data = await response.json();
              set({ foodTypes: data.foodTypes || [], restaurants: data.restaurants || [] });
            }
          }
        } catch (error) {
          console.error("Fetch food master failed:", error);
        }
      },

      addFoodMaster: async (type: 'Food' | 'Restaurant', value: string) => {
        const state = get();
        const pin = state.appPin;
        if (!pin) return;

        // Optimistic update
        if (type === 'Food' && !state.foodTypes.includes(value)) {
          set({ foodTypes: [...state.foodTypes, value].sort() });
        } else if (type === 'Restaurant' && !state.restaurants.includes(value)) {
          set({ restaurants: [...state.restaurants, value].sort() });
        } else {
          return; // Already exists
        }

        try {
          await fetch('/api/food-master', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-app-pin': pin },
            body: JSON.stringify({ type, value })
          });
        } catch (error) {
          console.error("Add food master failed:", error);
        }
      },

      fetchSettings: async () => {
        const pin = get().appPin;
        if (!pin) return;
        
        try {
          const response = await fetch('/api/settings', {
            headers: { 'x-app-pin': pin }
          });
          if (response.ok) {
            const data = await response.json();
            if (data.MonthlyBudget) {
              set({ monthlyBudget: parseFloat(data.MonthlyBudget) });
            }
            if (data.VaultPin) {
              set({ vaultPin: data.VaultPin });
            }
            if (data.CategoryBudgets) {
              try {
                set({ categoryBudgets: JSON.parse(data.CategoryBudgets) });
              } catch (e) {
                console.error("Failed to parse category budgets", e);
              }
            }
          }
        } catch (error) {
          console.error("Failed to fetch settings", error);
        }
      },

      getUOBCycle: () => {
        const today = new Date();
        
        let start: Date;
        let end: Date;

        if (today.getDate() >= 18) {
          start = setFns(new Date(), { date: 18, hours: 0, minutes: 0, seconds: 0 });
          end = setFns(addMonths(new Date(), 1), { date: 17, hours: 23, minutes: 59, seconds: 59 });
        } else {
          start = setFns(subMonths(new Date(), 1), { date: 18, hours: 0, minutes: 0, seconds: 0 });
          end = setFns(new Date(), { date: 17, hours: 23, minutes: 59, seconds: 59 });
        }

        return {
          start,
          end,
          daysRemaining: differenceInDays(end, today)
        };
      },

      getDashboardStats: () => {
        const { expenses } = get();
        const now = new Date();
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);
        const uobCycle = get().getUOBCycle();

        return expenses.reduce((acc, exp) => {
          const expDate = new Date(exp.date);
          const isCurrentMonth = isWithinInterval(expDate, { start: monthStart, end: monthEnd });
          
          // All-time receivables
          if (exp.isReimbursable) {
            acc.receivable += exp.amount - (exp.collectedAmount || 0);
          } else if (exp.sharedFlag) {
            acc.receivable += (exp.amount / 2) - (exp.collectedAmount || 0);
          }

          // Monthly Spent (Current Calendar Month)
          if (isCurrentMonth && !exp.isReimbursable) {
            const amount = exp.sharedFlag ? exp.amount / 2 : exp.amount;
            acc.monthlySpent += amount;
            
            if (exp.isNeed) {
              acc.needsSpent += amount;
            } else {
              acc.wantsSpent += amount;
            }

            // Together Spent
            if (exp.togetherFlag) {
              acc.togetherSpent += exp.amount;
            }
          }

          // UOB Spent (Current UOB Cycle)
          if (isWithinInterval(expDate, { start: uobCycle.start, end: uobCycle.end }) && exp.paymentMethod === 'UOB_ONE') {
            acc.uobSpent += exp.amount;
          }

          return acc;
        }, { monthlySpent: 0, uobSpent: 0, receivable: 0, togetherSpent: 0, needsSpent: 0, wantsSpent: 0 });
      }
    }),
    {
      name: 'superapp-storage',
      partialize: (state) => ({ appPin: state.appPin, isAuthenticated: state.isAuthenticated, monthlyBudget: state.monthlyBudget, categories: state.categories, foodTypes: state.foodTypes, restaurants: state.restaurants, isBalanceHidden: state.isBalanceHidden }),
    }
  )
);
