import {
  RECURRING_AMOUNT_TOLERANCE,
  RECURRING_MIN_DISTINCT_MONTHS,
} from "./constants/detection";

export interface RecurringTransactionInput {
  id: string;
  merchant: string;
  amount: number;
  date: Date | string;
}

export interface RecurringPattern<T extends RecurringTransactionInput> {
  merchant: string;
  averageAmount: number;
  minAmount: number;
  maxAmount: number;
  transactionCount: number;
  distinctMonthCount: number;
  tolerance: number;
  transactions: T[];
}

interface Cluster<T extends RecurringTransactionInput> {
  merchant: string;
  transactions: T[];
  averageAmount: number;
}

function normalizeMerchant(merchant: string): string {
  return merchant.trim().toLowerCase();
}

function toMonthKey(date: Date | string): string {
  const parsed = new Date(date);
  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function isWithinTolerance(baseAmount: number, candidateAmount: number): boolean {
  if (baseAmount === 0) {
    return candidateAmount === 0;
  }

  const delta = Math.abs(candidateAmount - baseAmount);
  return delta / Math.abs(baseAmount) <= RECURRING_AMOUNT_TOLERANCE;
}

// NOTE: cluster matching is order-sensitive; average drifts as members are added.
function upsertCluster<T extends RecurringTransactionInput>(
  clusters: Cluster<T>[],
  transaction: T,
): void {
  const match = clusters.find((cluster) =>
    isWithinTolerance(cluster.averageAmount, transaction.amount),
  );

  if (!match) {
    clusters.push({
      merchant: transaction.merchant,
      transactions: [transaction],
      averageAmount: transaction.amount,
    });
    return;
  }

  match.transactions.push(transaction);
  const total = match.transactions.reduce((sum, item) => sum + item.amount, 0);
  match.averageAmount = total / match.transactions.length;
}

function toRecurringPattern<T extends RecurringTransactionInput>(
  cluster: Cluster<T>,
): RecurringPattern<T> {
  const amounts = cluster.transactions.map((item) => item.amount);
  const monthSet = new Set(cluster.transactions.map((item) => toMonthKey(item.date)));

  return {
    merchant: cluster.merchant,
    averageAmount:
      cluster.transactions.reduce((sum, item) => sum + item.amount, 0) /
      cluster.transactions.length,
    minAmount: Math.min(...amounts),
    maxAmount: Math.max(...amounts),
    transactionCount: cluster.transactions.length,
    distinctMonthCount: monthSet.size,
    tolerance: RECURRING_AMOUNT_TOLERANCE,
    transactions: cluster.transactions,
  };
}

export function detectRecurringTransactions<T extends RecurringTransactionInput>(
  transactions: T[],
): RecurringPattern<T>[] {
  const byMerchant = new Map<string, T[]>();

  for (const transaction of transactions) {
    const merchantKey = normalizeMerchant(transaction.merchant);
    const existing = byMerchant.get(merchantKey) ?? [];
    existing.push(transaction);
    byMerchant.set(merchantKey, existing);
  }

  const recurring: RecurringPattern<T>[] = [];

  for (const merchantTransactions of byMerchant.values()) {
    const sorted = [...merchantTransactions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    const clusters: Cluster<T>[] = [];
    for (const transaction of sorted) {
      upsertCluster(clusters, transaction);
    }

    for (const cluster of clusters) {
      const pattern = toRecurringPattern(cluster);
      if (pattern.distinctMonthCount >= RECURRING_MIN_DISTINCT_MONTHS) {
        recurring.push(pattern);
      }
    }
  }

  return recurring;
}
