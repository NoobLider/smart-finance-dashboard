export interface BudgetCategory {
  id: string;
  name: string;
}

export interface BudgetRecord {
  categoryId: string;
  amount: unknown;
}

export interface ExpenseRecord {
  categoryId: string | null;
  amount: unknown;
}

export interface BudgetProgressRow {
  categoryId: string;
  categoryName: string;
  budgetAmount: number | null;
  spentAmount: number;
  remainingAmount: number | null;
  progressPercent: number;
  isOverBudget: boolean;
}

function toAmount(value: unknown): number {
  return Number(value);
}

export function monthStartUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
}

export function nextMonthStartUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1, 0, 0, 0, 0));
}

export function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function parseMonthKeyOrNow(month: string | undefined, now = new Date()): Date {
  if (month) {
    const match = month.match(/^(\d{4})-(\d{2})$/);

    if (match) {
      const year = Number.parseInt(match[1], 10);
      const monthIndex = Number.parseInt(match[2], 10) - 1;

      if (monthIndex >= 0 && monthIndex <= 11) {
        return new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
      }
    }
  }

  return monthStartUtc(now);
}

export function buildBudgetProgressRows(
  categories: BudgetCategory[],
  budgets: BudgetRecord[],
  expenses: ExpenseRecord[],
): BudgetProgressRow[] {
  const budgetByCategory = new Map(budgets.map((budget) => [budget.categoryId, toAmount(budget.amount)]));
  const spentByCategory = new Map<string, number>();

  for (const expense of expenses) {
    if (!expense.categoryId) {
      continue;
    }

    spentByCategory.set(
      expense.categoryId,
      (spentByCategory.get(expense.categoryId) ?? 0) + toAmount(expense.amount),
    );
  }

  return categories.map((category) => {
    const budgetAmount = budgetByCategory.get(category.id) ?? null;
    const spentAmount = spentByCategory.get(category.id) ?? 0;

    if (budgetAmount === null) {
      return {
        categoryId: category.id,
        categoryName: category.name,
        budgetAmount: null,
        spentAmount,
        remainingAmount: null,
        progressPercent: 0,
        isOverBudget: false,
      };
    }

    const progressPercent = budgetAmount <= 0 ? 0 : (spentAmount / budgetAmount) * 100;

    return {
      categoryId: category.id,
      categoryName: category.name,
      budgetAmount,
      spentAmount,
      remainingAmount: budgetAmount - spentAmount,
      progressPercent,
      isOverBudget: spentAmount > budgetAmount,
    };
  });
}
