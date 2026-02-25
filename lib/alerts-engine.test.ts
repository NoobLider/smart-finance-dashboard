import { TransactionType } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { buildDetectionAlerts } from "./alerts-engine";

describe("buildDetectionAlerts", () => {
  it("creates anomaly and recurring alerts from expense transactions", () => {
    const transactions = [
      { id: "1", accountId: "a1", merchant: "Grocer", amount: 40, date: new Date("2026-01-02"), type: TransactionType.EXPENSE },
      { id: "2", accountId: "a1", merchant: "Grocer", amount: 42, date: new Date("2026-01-10"), type: TransactionType.EXPENSE },
      { id: "3", accountId: "a1", merchant: "Grocer", amount: 41, date: new Date("2026-01-20"), type: TransactionType.EXPENSE },
      { id: "4", accountId: "a1", merchant: "Grocer", amount: 210, date: new Date("2026-01-22"), type: TransactionType.EXPENSE },
      { id: "5", accountId: "a1", merchant: "Netflix", amount: 15, date: new Date("2026-01-03"), type: TransactionType.EXPENSE },
      { id: "6", accountId: "a1", merchant: "Netflix", amount: 15.2, date: new Date("2026-02-03"), type: TransactionType.EXPENSE },
      { id: "7", accountId: "a1", merchant: "Salary", amount: 3000, date: new Date("2026-02-01"), type: TransactionType.INCOME },
    ];

    const alerts = buildDetectionAlerts(transactions);

    expect(alerts.some((alert) => alert.kind === "anomaly")).toBe(true);
    expect(alerts.some((alert) => alert.kind === "recurring")).toBe(true);
  });
});
