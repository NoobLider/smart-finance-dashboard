import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";

function exportFileDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [accounts, categories, budgets, transactions] = await Promise.all([
    prisma.account.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        type: true,
        isArchived: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.category.findMany({
      where: { userId: session.user.id },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        isSystem: true,
      },
    }),
    prisma.budget.findMany({
      where: { userId: session.user.id },
      orderBy: { monthStart: "asc" },
      select: {
        id: true,
        categoryId: true,
        monthStart: true,
        amount: true,
      },
    }),
    prisma.transaction.findMany({
      where: {
        account: {
          userId: session.user.id,
        },
      },
      orderBy: { date: "asc" },
      select: {
        id: true,
        accountId: true,
        categoryId: true,
        uploadJobId: true,
        date: true,
        amount: true,
        merchant: true,
        description: true,
        type: true,
        isManualEntry: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    userId: session.user.id,
    accounts,
    categories,
    budgets,
    transactions,
  };

  const fileName = `smart-finance-export-${exportFileDate()}.json`;

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
