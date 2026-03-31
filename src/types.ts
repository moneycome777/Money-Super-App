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
  isInvestment: boolean;
  isNeed: boolean;
  description?: string;
  restaurant?: string;
  tier?: string;
}

export interface UOBCycle {
  start: Date;
  end: Date;
  daysRemaining: number;
}

export interface DashboardStats {
  monthlySpent: number;
  uobSpent: number;
  receivable: number;
  togetherSpent: number;
  needsSpent: number;
  wantsSpent: number;
}
