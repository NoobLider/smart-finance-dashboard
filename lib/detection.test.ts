import { describe, expect, it } from "vitest";

import { detectIqrAnomalies } from "./anomalyDetection";
import { detectRecurringTransactions } from "./recurringDetection";

describe("detectIqrAnomalies", () => {
  it("skips detection when sample size is below minimum threshold", () => {
    const result = detectIqrAnomalies([
      { id: "a", amount: 10 },
      { id: "b", amount: 12 },
      { id: "c", amount: 11 },
    ]);

    expect(result.skipped).toBe(true);
    expect(result.reason).toBe("insufficient_sample_size");
    expect(result.anomalies).toEqual([]);
  });

  it("detects a clear high outlier in Food & Dining-like samples", () => {
    const samples = [
      { id: "t1", amount: 24 },
      { id: "t2", amount: 25 },
      { id: "t3", amount: 26 },
      { id: "t4", amount: 27 },
      { id: "t5", amount: 28 },
      { id: "t6", amount: 84 },
    ];

    const result = detectIqrAnomalies(samples);

    expect(result.skipped).toBe(false);
    expect(result.anomalies.map((item) => item.id)).toContain("t6");
  });
});

describe("detectRecurringTransactions", () => {
  it("detects recurring patterns across multiple calendar months", () => {
    const transactions = [
      { id: "m1", merchant: "Metro Pass", amount: 50, date: "2025-09-03T12:00:00.000Z" },
      { id: "m2", merchant: "Metro Pass", amount: 50, date: "2025-10-03T12:00:00.000Z" },
      { id: "m3", merchant: "Metro Pass", amount: 50, date: "2025-11-03T12:00:00.000Z" },
      { id: "n1", merchant: "Netflix", amount: 12.99, date: "2025-09-08T12:00:00.000Z" },
      { id: "n2", merchant: "Netflix", amount: 12.99, date: "2025-10-08T12:00:00.000Z" },
      { id: "n3", merchant: "Netflix", amount: 12.99, date: "2025-11-08T12:00:00.000Z" },
      { id: "e1", merchant: "City Electric", amount: 78, date: "2025-09-07T12:00:00.000Z" },
      { id: "e2", merchant: "City Electric", amount: 81, date: "2025-10-07T12:00:00.000Z" },
      { id: "e3", merchant: "City Electric", amount: 83, date: "2025-11-07T12:00:00.000Z" },
    ];

    const result = detectRecurringTransactions(transactions);

    const merchants = result.map((pattern) => pattern.merchant.toLowerCase());

    expect(merchants).toContain("metro pass");
    expect(merchants).toContain("netflix");
    expect(merchants).toContain("city electric");
  });

  it("returns empty when matching transactions exist only within one calendar month", () => {
    const transactions = [
      { id: "s1", merchant: "Gym Plus", amount: 29.99, date: "2025-11-02T12:00:00.000Z" },
      { id: "s2", merchant: "Gym Plus", amount: 29.99, date: "2025-11-21T12:00:00.000Z" },
      { id: "s3", merchant: "Gym Plus", amount: 30.1, date: "2025-11-27T12:00:00.000Z" },
    ];

    const result = detectRecurringTransactions(transactions);

    expect(result).toEqual([]);
  });
});
