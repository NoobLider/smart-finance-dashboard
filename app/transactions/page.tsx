import Link from "next/link";
import { TransactionType } from "@prisma/client";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { CategorySelect } from "./category-select";

interface TransactionPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function toMoney(value: unknown): string {
  const amount = typeof value === "number" ? value : Number(value);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export default async function TransactionsPage({ searchParams }: TransactionPageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const query = firstParam(resolvedSearchParams.q)?.trim() ?? "";
  const accountId = firstParam(resolvedSearchParams.accountId)?.trim() ?? "";
  const typeParam = firstParam(resolvedSearchParams.type)?.trim() ?? "";
  const categoryFilter = firstParam(resolvedSearchParams.categoryId)?.trim() ?? "";

  const whereClause = {
    account: {
      userId: session.user.id,
    },
    ...(accountId ? { accountId } : {}),
    ...(typeParam === "INCOME" || typeParam === "EXPENSE" ? { type: typeParam as TransactionType } : {}),
    ...(categoryFilter === "uncategorized"
      ? { categoryId: null }
      : categoryFilter
        ? { categoryId: categoryFilter }
        : {}),
    ...(query
      ? {
          OR: [
            { merchant: { contains: query, mode: "insensitive" as const } },
            { description: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [transactions, categories, accounts] = await Promise.all([
    prisma.transaction.findMany({
      where: whereClause,
      orderBy: { date: "desc" },
      take: 200,
      select: {
        id: true,
        date: true,
        merchant: true,
        description: true,
        amount: true,
        type: true,
        categoryId: true,
        category: {
          select: { name: true },
        },
        account: {
          select: { name: true },
        },
      },
    }),
    prisma.category.findMany({
      where: { userId: session.user.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.account.findMany({
      where: { userId: session.user.id, isArchived: false },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <main className="page">
      <section className="card transactions-card">
        <h1>Transactions</h1>
        <p>Filter, search, and edit categories inline.</p>

        <form className="filters-grid" method="GET">
          <label>
            Search
            <input type="text" name="q" defaultValue={query} placeholder="Merchant or description" />
          </label>

          <label>
            Account
            <select name="accountId" defaultValue={accountId}>
              <option value="">All accounts</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Type
            <select name="type" defaultValue={typeParam}>
              <option value="">All</option>
              <option value="INCOME">Income</option>
              <option value="EXPENSE">Expense</option>
            </select>
          </label>

          <label>
            Category
            <select name="categoryId" defaultValue={categoryFilter}>
              <option value="">All categories</option>
              <option value="uncategorized">Uncategorized</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <button type="submit">Apply filters</button>
        </form>

        <div className="table-wrap">
          <table className="transactions-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Merchant</th>
                <th>Description</th>
                <th>Account</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Category</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={7}>No transactions match your filters.</td>
                </tr>
              ) : (
                transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td>{new Date(transaction.date).toISOString().slice(0, 10)}</td>
                    <td>{transaction.merchant}</td>
                    <td>{transaction.description ?? "-"}</td>
                    <td>{transaction.account.name}</td>
                    <td>{transaction.type}</td>
                    <td>{toMoney(transaction.amount)}</td>
                    <td>
                      <CategorySelect
                        transactionId={transaction.id}
                        currentCategoryId={transaction.categoryId}
                        categories={categories}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p>
          <Link href="/upload">Upload more CSV</Link> · <Link href="/dashboard">Back to dashboard</Link>
        </p>
      </section>
    </main>
  );
}
