import { Expense } from './types';

export function safeParseDate(val?: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  
  if (typeof val === 'number') {
    if (val > 1000000000) {
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d;
    }
    if (val > 30000 && val < 60000) {
      const d = new Date(Math.round((val - 25569) * 86400 * 1000));
      return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }

  const str = String(val).trim();
  if (!str) return null;

  // 1. ISO format: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const d = new Date(`${str}T00:00:00`);
    if (!isNaN(d.getTime())) return d;
  }

  // 2. Direct Date constructor
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d;

  // 3. Text date like "2 Oct 2026" or "02 October 2026"
  const months: Record<string, number> = {
    jan: 0, january: 0,
    feb: 1, february: 1,
    mar: 2, march: 2,
    apr: 3, april: 3,
    may: 4,
    jun: 5, june: 5,
    jul: 6, july: 6,
    aug: 7, august: 7,
    sep: 8, sept: 8, september: 8,
    oct: 9, october: 9,
    nov: 10, november: 10,
    dec: 11, december: 11
  };

  const textMatch = str.match(/^(\d{1,2})[\s\-]+([A-Za-z]+)[\s\-]+(\d{4})$/);
  if (textMatch) {
    const day = parseInt(textMatch[1], 10);
    const mStr = textMatch[2].toLowerCase();
    const monthKey = months[mStr] !== undefined ? months[mStr] : months[mStr.slice(0, 3)];
    const year = parseInt(textMatch[3], 10);
    if (monthKey !== undefined) {
      const td = new Date(year, monthKey, day);
      if (!isNaN(td.getTime())) return td;
    }
  }

  // 4. DD/MM/YYYY or DD-MM-YYYY
  const slashMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (slashMatch) {
    const d1 = parseInt(slashMatch[1], 10);
    const d2 = parseInt(slashMatch[2], 10);
    const yr = parseInt(slashMatch[3], 10);
    const td = new Date(yr, d2 - 1, d1);
    if (!isNaN(td.getTime())) return td;
  }

  return null;
}

export function getCreditCardDueDate(dateString: string): { dueDateStr: string, dueDate: Date } {
  const txDate = safeParseDate(dateString) || new Date();
  const day = txDate.getDate();
  const month = txDate.getMonth();
  const year = txDate.getFullYear();

  let dueMonth = month + (day <= 18 ? 1 : 2);
  let dueYear = year;

  if (dueMonth > 11) {
    dueMonth -= 12;
    dueYear += 1;
  }
  
  const dueDate = new Date(dueYear, dueMonth, 7);
  const dueDateStr = dueDate.toLocaleString('default', { month: 'short' }) + ' 7th';
  
  return { dueDateStr, dueDate };
}

export function calculateCreditCardLiability(expenses: Expense[]) {
  const now = new Date();
  
  // A transaction is pending if its dueDate is >= today (ignoring hours)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const liabilities: Record<string, { dueDate: Date, amount: number, fundedAmount: number }> = {};

  for (const exp of (Array.isArray(expenses) ? expenses : [])) {
    if (exp && exp.paymentMethod === 'UOB_ONE') {
      const { dueDateStr, dueDate } = getCreditCardDueDate(exp.date);
      if (dueDate >= today) {
        if (!liabilities[dueDateStr]) {
          liabilities[dueDateStr] = { dueDate, amount: 0, fundedAmount: 0 };
        }
        if (exp.isFunded) {
          liabilities[dueDateStr].fundedAmount += (Number(exp.amount) || 0);
        } else {
          liabilities[dueDateStr].amount += (Number(exp.amount) || 0);
        }
      }
    }
  }

  // Sort by dueDate
  return Object.entries(liabilities)
    .sort((a, b) => (a[1].dueDate?.getTime() || 0) - (b[1].dueDate?.getTime() || 0))
    .map(([dueDateStr, data]) => ({ 
       dueDateStr, 
       amount: data.amount, 
       fundedAmount: data.fundedAmount,
       totalAmount: data.amount + data.fundedAmount
    }));
}
