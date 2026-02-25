import { AlertSeverity, TransactionType } from "@prisma/client";

import { detectIqrAnomalies } from "./anomalyDetection";
import { detectRecurringTransactions } from "./recurringDetection";

export interface DetectionTransaction {
  id: string;
  accountId: string;
  merchant: string;
  amount: unknown;
  date: Date;
  type: TransactionType;
}

export interface GeneratedDetectionAlert {
  kind: "anomaly" | "recurring";
  accountId: string | null;
  transactionId: string | null;
  severity: AlertSeverity;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
}

function toAmount(value: unknown): number {
  return Number(value);
}

function toMoney(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export function buildDetectionAlerts(transactions: DetectionTransaction[]): GeneratedDetectionAlert[] {
  const expenseTransactions = transactions
    .filter((transaction) => transaction.type === TransactionType.EXPENSE)
    .map((transaction) => ({
      ...transaction,
      amount: toAmount(transaction.amount),
    }));

  const anomalyResult = detectIqrAnomalies(
    expenseTransactions.map((transaction) => ({
      id: transaction.id,
      amount: transaction.amount,
      merchant: transaction.merchant,
      date: transaction.date,
      accountId: transaction.accountId,
    })),
  );

  const anomalyAlerts: GeneratedDetectionAlert[] = anomalyResult.anomalies.map((anomaly) => ({
    kind: "anomaly",
    accountId: anomaly.accountId,
    transactionId: anomaly.id,
    severity:
      anomalyResult.upperBound && anomaly.amount > anomalyResult.upperBound * 1.5
        ? AlertSeverity.HIGH
        : AlertSeverity.MEDIUM,
    title: "Anomalous expense detected",
    message: `${anomaly.merchant} at ${toMoney(anomaly.amount)} is outside your normal spending range.`,
    metadata: {
      detectionKind: "anomaly",
      method: anomalyResult.method,
      q1: anomalyResult.q1,
      q3: anomalyResult.q3,
      iqr: anomalyResult.iqr,
      lowerBound: anomalyResult.lowerBound,
      upperBound: anomalyResult.upperBound,
      sampleSize: anomalyResult.sampleSize,
    },
  }));

  const recurringPatterns = detectRecurringTransactions(
    expenseTransactions.map((transaction) => ({
      id: transaction.id,
      merchant: transaction.merchant,
      amount: transaction.amount,
      date: transaction.date,
    })),
  );

  const recurringAlerts: GeneratedDetectionAlert[] = recurringPatterns.map((pattern) => {
    const latestTransaction = [...pattern.transactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    )[0];

    return {
      kind: "recurring",
      accountId: null,
      transactionId: latestTransaction?.id ?? null,
      severity: AlertSeverity.LOW,
      title: "Recurring payment detected",
      message: `${pattern.merchant} appears recurring (${pattern.distinctMonthCount} months, avg ${toMoney(pattern.averageAmount)}).`,
      metadata: {
        detectionKind: "recurring",
        merchant: pattern.merchant,
        averageAmount: pattern.averageAmount,
        minAmount: pattern.minAmount,
        maxAmount: pattern.maxAmount,
        transactionCount: pattern.transactionCount,
        distinctMonthCount: pattern.distinctMonthCount,
        transactionIds: pattern.transactions.map((transaction) => transaction.id),
      },
    };
  });

  return [...anomalyAlerts, ...recurringAlerts];
}
