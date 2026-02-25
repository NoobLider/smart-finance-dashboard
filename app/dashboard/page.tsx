import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "../../lib/auth";
import { buildDashboardAnalytics } from "../../lib/dashboard-analytics";
import { prisma } from "../../lib/prisma";
import { SignOutButton } from "../components/sign-out-button";

function toMoney(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const transactions = await prisma.transaction.findMany({
    where: {
      account: {
        userId: session.user.id,
      },
    },
    select: {
      date: true,
      amount: true,
      type: true,
      category: {
        select: {
          name: true,
        },
      },
    },
  });

  const analytics = buildDashboardAnalytics(transactions);
  const maxTrend = Math.max(...analytics.trend.map((point) => point.expenseTotal), 1);

  return (
    <main className="page">
      <section className="card dashboard-card">
        <h1>Dashboard</h1>
        <p>Signed in as {session.user.email}</p>

        <div className="stats-grid">
          <article className="stat-card">
            <h3>Total income</h3>
            <p className="stat-value income">{toMoney(analytics.totalIncome)}</p>
          </article>
          <article className="stat-card">
            <h3>Total expense</h3>
            <p className="stat-value expense">{toMoney(analytics.totalExpense)}</p>
          </article>
          <article className="stat-card">
            <h3>Net</h3>
            <p className="stat-value">{toMoney(analytics.totalIncome - analytics.totalExpense)}</p>
          </article>
        </div>

        <section className="analytics-section">
          <h2>6-month expense trend</h2>
          <div className="trend-grid">
            {analytics.trend.map((point) => (
              <div key={point.monthKey} className="trend-item">
                <div
                  className="trend-bar"
                  style={{
                    height: `${Math.max((point.expenseTotal / maxTrend) * 100, point.expenseTotal > 0 ? 12 : 0)}%`,
                  }}
                />
                <span className="trend-label">{point.label}</span>
                <span className="trend-value">{toMoney(point.expenseTotal)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="analytics-section">
          <h2>Current month category breakdown</h2>
          {analytics.categoryBreakdown.length === 0 ? (
            <p>No expense transactions in the current month yet.</p>
          ) : (
            <ul className="breakdown-list">
              {analytics.categoryBreakdown.map((item) => (
                <li key={item.category}>
                  <span>{item.category}</span>
                  <strong>{toMoney(item.amount)}</strong>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p>
          Continue to <Link href="/upload">CSV upload</Link>.
        </p>
        <p>
          Then open <Link href="/transactions">transaction list</Link>.
        </p>
        <p>
          Next set <Link href="/budgets">monthly budgets</Link>.
        </p>
        <SignOutButton />
      </section>
    </main>
  );
}
