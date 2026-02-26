import { TransactionType } from "@prisma/client";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import {
  buildBudgetProgressRows,
  monthKey,
  nextMonthStartUtc,
  parseMonthKeyOrNow,
} from "../../lib/budget-tracking";
import { authOptions } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { BudgetEditor } from "./budget-editor";

interface BudgetsPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function BudgetsPage({ searchParams }: BudgetsPageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const monthParam = firstParam(resolvedSearchParams.month);

  const selectedMonthStart = parseMonthKeyOrNow(monthParam);
  const selectedMonthKey = monthKey(selectedMonthStart);
  const selectedMonthEnd = nextMonthStartUtc(selectedMonthStart);

  const [categories, budgets, expenses] = await Promise.all([
    prisma.category.findMany({
      where: { userId: session.user.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.budget.findMany({
      where: {
        userId: session.user.id,
        monthStart: selectedMonthStart,
      },
      select: {
        categoryId: true,
        amount: true,
      },
    }),
    prisma.transaction.findMany({
      where: {
        type: TransactionType.EXPENSE,
        date: {
          gte: selectedMonthStart,
          lt: selectedMonthEnd,
        },
        account: {
          userId: session.user.id,
        },
      },
      select: {
        categoryId: true,
        amount: true,
      },
    }),
  ]);

  const rows = buildBudgetProgressRows(categories, budgets, expenses);

  return (
    <main className="page">
      <section className="card transactions-card">
        <h1>Budget Tracking</h1>
        <p>Set monthly category budgets and monitor over-budget warnings.</p>

        <form className="filters-grid" method="GET">
          <label>
            Month
            <input type="month" name="month" defaultValue={selectedMonthKey} />
          </label>
          <button type="submit">Load month</button>
        </form>

        <BudgetEditor monthKey={selectedMonthKey} rows={rows} />
      </section>
    </main>
  );
}
