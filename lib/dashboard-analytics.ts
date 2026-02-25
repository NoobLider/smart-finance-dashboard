import { TransactionType } from "@prisma/client";

interface AnalyticsTransaction {
  date: Date;
  amount: unknown;
  type: TransactionType;
  category: { name: string } | null;
}

export interface TrendPoint {
  monthKey: string;
  label: string;
  expenseTotal: number;
}

export interface CategoryBreakdownItem {
  category: string;
  amount: number;
}

export interface DashboardAnalytics {
  totalIncome: number;
  totalExpense: number;
  trend: TrendPoint[];
  categoryBreakdown: CategoryBreakdownItem[];
}

function monthStartUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
}

function monthLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function toAmount(value: unknown): number {
  return Number(value);
}

export function buildDashboardAnalytics(transactions: AnalyticsTransaction[], now = new Date()): DashboardAnalytics {
  let totalIncome = 0;
  let totalExpense = 0;

  const currentMonthStart = monthStartUtc(now);
  const nextMonthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0),
  );

  const trendMonths: TrendPoint[] = [];
  for (let i = 5; i >= 0; i -= 1) {
    const monthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1, 0, 0, 0, 0));
    trendMonths.push({
      monthKey: monthKey(monthDate),
      label: monthLabel(monthDate),
      expenseTotal: 0,
    });
  }

  const trendByKey = new Map(trendMonths.map((point) => [point.monthKey, point]));
  const categoryTotals = new Map<string, number>();

  for (const transaction of transactions) {
    const amount = toAmount(transaction.amount);

    if (transaction.type === TransactionType.INCOME) {
      totalIncome += amount;
    } else {
      totalExpense += amount;

      const bucket = trendByKey.get(monthKey(new Date(transaction.date)));
      if (bucket) {
        bucket.expenseTotal += amount;
      }

      if (transaction.date >= currentMonthStart && transaction.date < nextMonthStart) {
        const categoryName = transaction.category?.name ?? "Uncategorized";
        categoryTotals.set(categoryName, (categoryTotals.get(categoryName) ?? 0) + amount);
      }
    }
  }

  const categoryBreakdown = Array.from(categoryTotals.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  return {
    totalIncome,
    totalExpense,
    trend: trendMonths,
    categoryBreakdown,
  };
}
