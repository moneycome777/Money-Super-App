const fs = require('fs');
let data = fs.readFileSync('src/utils.ts', 'utf8');

const target = `export function calculateCreditCardLiability(expenses: Expense[]) {
  const now = new Date();
  
  // A transaction is pending if its dueDate is >= today (ignoring hours)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const liabilities: Record<string, { dueDate: Date, amount: number }> = {};

  for (const exp of expenses) {
    if (exp.paymentMethod === 'UOB_ONE' && !exp.isFunded) {
      const { dueDateStr, dueDate } = getCreditCardDueDate(exp.date);
      if (dueDate >= today) {
        if (!liabilities[dueDateStr]) {
          liabilities[dueDateStr] = { dueDate, amount: 0 };
        }
        liabilities[dueDateStr].amount += exp.amount;
      }
    }
  }

  // Sort by dueDate
  return Object.entries(liabilities)
    .sort((a, b) => a[1].dueDate.getTime() - b[1].dueDate.getTime())
    .map(([dueDateStr, data]) => ({ dueDateStr, amount: data.amount }));
}`;

const replacement = `export function calculateCreditCardLiability(expenses: Expense[]) {
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
}`;

data = data.replace(target, replacement);
fs.writeFileSync('src/utils.ts', data);
