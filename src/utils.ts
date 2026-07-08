import { Expense } from './types';

export function getCreditCardDueDate(dateString: string): { dueDateStr: string, dueDate: Date } {
  const txDate = new Date(dateString + 'T00:00:00');
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

  for (const exp of expenses) {
    if (exp.paymentMethod === 'UOB_ONE') {
      const { dueDateStr, dueDate } = getCreditCardDueDate(exp.date);
      if (dueDate >= today) {
        if (!liabilities[dueDateStr]) {
          liabilities[dueDateStr] = { dueDate, amount: 0, fundedAmount: 0 };
        }
        if (exp.isFunded) {
          liabilities[dueDateStr].fundedAmount += exp.amount;
        } else {
          liabilities[dueDateStr].amount += exp.amount;
        }
      }
    }
  }

  // Sort by dueDate
  return Object.entries(liabilities)
    .sort((a, b) => a[1].dueDate.getTime() - b[1].dueDate.getTime())
    .map(([dueDateStr, data]) => ({ 
       dueDateStr, 
       amount: data.amount, 
       fundedAmount: data.fundedAmount,
       totalAmount: data.amount + data.fundedAmount
    }));
}
