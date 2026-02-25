import { TransactionType } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { buildDashboardAnalytics } from "./dashboard-analytics";

describe("dashboard analytics", () => {
  it("computes totals, 6-month trend, and current-month category breakdown", () => {
    const now = new Date(Date.UTC(2026, 1, 20, 12, 0, 0, 0));

    const transactions = [
      {
        date: new Date(Date.UTC(2026, 1, 2, 12, 0, 0, 0)),
        amount: 3000,
        type: TransactionType.INCOME,
        category: { name: "Income" },
      },
      {
        date: new Date(Date.UTC(2026, 1, 5, 12, 0, 0, 0)),
        amount: 120,
        type: TransactionType.EXPENSE,
        category: { name: "Food & Dining" },
      },
      {
        date: new Date(Date.UTC(2026, 1, 7, 12, 0, 0, 0)),
        amount: 80,
        type: TransactionType.EXPENSE,
        category: null,
      },
      {
        date: new Date(Date.UTC(2025, 11, 10, 12, 0, 0, 0)),
        amount: 200,
        type: TransactionType.EXPENSE,
        category: { name: "Utilities" },
      },
    ];

    const result = buildDashboardAnalytics(transactions, now);

    expect(result.totalIncome).toBe(3000);
    expect(result.totalExpense).toBe(400);
    expect(result.trend).toHaveLength(6);

    const febPoint = result.trend.find((point) => point.monthKey === "2026-02");
    expect(febPoint?.expenseTotal).toBe(200);

    expect(result.categoryBreakdown).toEqual([
      { category: "Food & Dining", amount: 120 },
      { category: "Uncategorized", amount: 80 },
    ]);
  });
});
