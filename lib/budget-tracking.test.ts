import { describe, expect, it } from "vitest";

import { buildBudgetProgressRows, parseMonthKeyOrNow } from "./budget-tracking";

describe("budget tracking", () => {
  it("parses month key when provided and falls back to current month", () => {
    const fixedNow = new Date(Date.UTC(2026, 5, 20, 12, 0, 0, 0));

    const explicit = parseMonthKeyOrNow("2026-02", fixedNow);
    const fallback = parseMonthKeyOrNow(undefined, fixedNow);

    expect(explicit.toISOString()).toContain("2026-02-01");
    expect(fallback.toISOString()).toContain("2026-06-01");
  });

  it("builds progress rows and over-budget flags", () => {
    const rows = buildBudgetProgressRows(
      [
        { id: "food", name: "Food" },
        { id: "transport", name: "Transport" },
      ],
      [
        { categoryId: "food", amount: 300 },
        { categoryId: "transport", amount: 100 },
      ],
      [
        { categoryId: "food", amount: 120 },
        { categoryId: "food", amount: 230 },
        { categoryId: "transport", amount: 50 },
      ],
    );

    const food = rows.find((row) => row.categoryId === "food");
    const transport = rows.find((row) => row.categoryId === "transport");

    expect(food?.spentAmount).toBe(350);
    expect(food?.isOverBudget).toBe(true);
    expect(food?.remainingAmount).toBe(-50);

    expect(transport?.spentAmount).toBe(50);
    expect(transport?.isOverBudget).toBe(false);
    expect(transport?.remainingAmount).toBe(50);
  });
});
