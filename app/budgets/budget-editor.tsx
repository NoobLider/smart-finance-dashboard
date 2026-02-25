"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { BudgetProgressRow } from "../../lib/budget-tracking";

interface BudgetEditorProps {
  monthKey: string;
  rows: BudgetProgressRow[];
}

interface BudgetResponse {
  ok?: boolean;
  error?: string;
}

export function BudgetEditor({ monthKey, rows }: BudgetEditorProps) {
  const router = useRouter();

  const initialValues = useMemo(
    () =>
      Object.fromEntries(
        rows.map((row) => [row.categoryId, row.budgetAmount === null ? "" : String(row.budgetAmount)]),
      ),
    [rows],
  );

  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [savingCategoryId, setSavingCategoryId] = useState<string | null>(null);
  const [errorByCategory, setErrorByCategory] = useState<Record<string, string>>({});

  async function saveCategory(categoryId: string) {
    setSavingCategoryId(categoryId);
    setErrorByCategory((previous) => ({ ...previous, [categoryId]: "" }));

    const amount = Number.parseFloat(values[categoryId] ?? "");

    const response = await fetch("/api/budgets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        categoryId,
        month: monthKey,
        amount,
      }),
    });

    setSavingCategoryId(null);

    if (!response.ok) {
      const data = (await response.json()) as BudgetResponse;
      setErrorByCategory((previous) => ({
        ...previous,
        [categoryId]: data.error ?? "Unable to save budget.",
      }));
      return;
    }

    router.refresh();
  }

  return (
    <div className="table-wrap">
      <table className="transactions-table budgets-table">
        <thead>
          <tr>
            <th>Category</th>
            <th>Budget</th>
            <th>Spent</th>
            <th>Remaining</th>
            <th>Progress</th>
            <th>Warning</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const rawProgress = Number.isFinite(row.progressPercent) ? row.progressPercent : 0;
            const progressForBar = Math.min(rawProgress, 100);

            return (
              <tr key={row.categoryId}>
                <td>{row.categoryName}</td>
                <td>
                  <div className="budget-input-row">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={values[row.categoryId] ?? ""}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        setValues((previous) => ({ ...previous, [row.categoryId]: nextValue }));
                      }}
                      placeholder="0.00"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        void saveCategory(row.categoryId);
                      }}
                      disabled={savingCategoryId === row.categoryId}
                    >
                      Save
                    </button>
                  </div>
                  {errorByCategory[row.categoryId] ? (
                    <p className="form-error tiny-error">{errorByCategory[row.categoryId]}</p>
                  ) : null}
                </td>
                <td>{row.spentAmount.toFixed(2)}</td>
                <td>{row.remainingAmount === null ? "-" : row.remainingAmount.toFixed(2)}</td>
                <td>
                  <div className="budget-progress-track">
                    <div
                      className={`budget-progress-fill ${row.isOverBudget ? "over" : ""}`}
                      style={{ width: `${progressForBar}%` }}
                    />
                  </div>
                  <span className="trend-value">{rawProgress.toFixed(1)}%</span>
                </td>
                <td>
                  {row.isOverBudget ? <span className="warning-chip">Over budget</span> : <span>-</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
