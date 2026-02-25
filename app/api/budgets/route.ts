import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "../../../lib/auth";
import { parseMonthKeyOrNow } from "../../../lib/budget-tracking";
import { prisma } from "../../../lib/prisma";

interface Body {
  categoryId?: string;
  month?: string;
  amount?: number;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as Body;
  const categoryId = body.categoryId?.trim();
  const amount = body.amount;
  const monthStart = parseMonthKeyOrNow(body.month);

  if (!categoryId) {
    return NextResponse.json({ error: "categoryId is required." }, { status: 400 });
  }

  if (typeof amount !== "number" || Number.isNaN(amount) || amount < 0) {
    return NextResponse.json({ error: "amount must be a non-negative number." }, { status: 400 });
  }

  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      userId: session.user.id,
    },
    select: { id: true },
  });

  if (!category) {
    return NextResponse.json({ error: "Category not found." }, { status: 404 });
  }

  await prisma.budget.upsert({
    where: {
      userId_categoryId_monthStart: {
        userId: session.user.id,
        categoryId: category.id,
        monthStart,
      },
    },
    create: {
      userId: session.user.id,
      categoryId: category.id,
      monthStart,
      amount,
    },
    update: {
      amount,
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true });
}
