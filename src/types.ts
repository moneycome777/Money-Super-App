export interface Expense {
  id?: string;
  rowIndex?: number;
  date: string;
  amount: number;
  category: string;
  paymentMethod: 'UOB_ONE' | 'CASH/OTHER';
  sharedFlag: boolean;
  collectedAmount: number;
  togetherFlag: boolean;
  isReimbursable: boolean;
  isNeed: boolean;
  description?: string;
  restaurant?: string;
  tier?: string;
  petCategory?: string;
  nextDueDate?: string;
}

export interface LifeLogEntry {
  id?: string;
  rowIndex?: number;
  timestamp: string;
  rawText: string;
  tags: string;
  dueDate: string | null;
  aiSummary: string;
  status?: string;
}

export interface UOBCycle {
  start: Date;
  end: Date;
  daysRemaining: number;
}

export interface VaultEntry {
  id?: string;
  rowIndex?: number;
  timestamp: string;
  type: 'TARGET' | 'DEPOSIT';
  goalName: string;
  amount: number;
  dueDate: string | null;
  monthlyContribution?: number;
}

export interface StrengthSet {
  name: string;
  sets: number;
  reps: number;
  weight: number;
}

export interface CardioData {
  duration: number;
  intensity: string;
  score?: string;
}

export interface FitnessEntry {
  id?: string;
  rowIndex?: number;
  timestamp: string;
  date: string;
  activityType: string;
  workoutData: string; // JSON string
  notes: string;
}

export interface DashboardStats {
  monthlySpent: number;
  uobSpent: number;
  receivable: number;
  togetherSpent: number;
  needsSpent: number;
  wantsSpent: number;
}

export interface InsightEntry {
  id?: string;
  rowIndex?: number;
  timestamp: string;
  title: string;
  context: string;
  category: string;
  reviewCount: number;
  lastReviewedAt: string | null;
  status: 'ACTIVE' | 'ARCHIVED';
}

export interface MonthlyInsightSummary {
  id?: string;
  rowIndex?: number;
  month: string; // e.g., "2026-04"
  summary: string;
}

export interface PetLogEntry {
  id?: string;
  rowIndex?: number;
  date: string;
  category: 'Food' | 'Vet' | 'Grooming' | 'Toys' | 'Others';
  amount: number;
  notes: string;
  nextDueDate: string | null;
}
