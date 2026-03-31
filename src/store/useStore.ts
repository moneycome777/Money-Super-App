import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Expense, UOBCycle, DashboardStats } from '../types';
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
  categories: string[];
  foodTypes: string[];
  restaurants: string[];
  isStealthMode: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  appPin: string | null;
  monthlyBudget: number;
  
  setExpenses: (expenses: Expense[]) => void;
  addExpense: (expense: Expense) => void;
  updateExpense: (rowIndex: number, updates: Partial<Expense>) => void;
  addCategory: (category: string) => void;
  removeCategory: (category: string) => void;
  setMonthlyBudget: (budget: number) => void;
  toggleStealthMode: () => void;
  setAuthenticated: (status: boolean, pin?: string) => void;
  setLoading: (status: boolean) => void;
  logout: () => void;
  fetchExpenses: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchFoodMaster: () => Promise<void>;
  addFoodMaster: (type: 'Food' | 'Restaurant', value: string) => Promise<void>;
  
  getUOBCycle: () => UOBCycle;
  getDashboardStats: () => DashboardStats;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      expenses: [],
      categories: ['Food', 'Transport', 'Groceries', 'Entertainment', 'Bills', 'Investment', 'Others'],
      foodTypes: [],
      restaurants: [],
      isStealthMode: false,
      isAuthenticated: false,
      isLoading: false,
      appPin: null,
      monthlyBudget: 0,

      setExpenses: (expenses) => set({ expenses }),
      addExpense: (expense) => set((state) => ({ expenses: [...state.expenses, expense] })),
      updateExpense: (rowIndex, updates) => set((state) => ({
        expenses: state.expenses.map(exp => 
          exp.rowIndex === rowIndex ? { ...exp, ...updates } : exp
        )
      })),
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
      setMonthlyBudget: (budget) => set({ monthlyBudget: budget }),
      toggleStealthMode: () => set((state) => ({ isStealthMode: !state.isStealthMode })),
      setAuthenticated: (status, pin) => set({ isAuthenticated: status, appPin: pin || get().appPin }),
      setLoading: (status) => set({ isLoading: status }),
      logout: () => set({ isAuthenticated: false, appPin: null, expenses: [] }),

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
                isInvestment: row[7] === 'TRUE',
                isNeed: row[8] === 'TRUE',
                description: row[9] || '',
                restaurant: row[10] || '',
                tier: row[11] || ''
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
          
          // Monthly Spent (Current Calendar Month)
          if (isWithinInterval(expDate, { start: monthStart, end: monthEnd }) && !exp.isInvestment) {
            const amount = exp.sharedFlag ? exp.amount / 2 : exp.amount;
            acc.monthlySpent += amount;
            
            if (exp.sharedFlag) {
              acc.receivable += (exp.amount / 2) - (exp.collectedAmount || 0);
            }
            
            if (exp.isNeed) {
              acc.needsSpent += amount;
            } else {
              acc.wantsSpent += amount;
            }
          }

          // UOB Spent (Current UOB Cycle)
          if (isWithinInterval(expDate, { start: uobCycle.start, end: uobCycle.end }) && exp.paymentMethod === 'UOB_ONE') {
            acc.uobSpent += exp.amount;
          }

          // Together Spent
          if (exp.togetherFlag) {
            acc.togetherSpent += exp.amount;
          }

          return acc;
        }, { monthlySpent: 0, uobSpent: 0, receivable: 0, togetherSpent: 0, needsSpent: 0, wantsSpent: 0 });
      }
    }),
    {
      name: 'superapp-storage',
      partialize: (state) => ({ appPin: state.appPin, isAuthenticated: state.isAuthenticated, monthlyBudget: state.monthlyBudget, categories: state.categories, foodTypes: state.foodTypes, restaurants: state.restaurants }),
    }
  )
);
