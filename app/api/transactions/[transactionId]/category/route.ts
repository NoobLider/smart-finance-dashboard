import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";

interface Body {
  categoryId?: string | null;
}

interface RouteParams {
  params: Promise<{ transactionId: string }>;
}

export async function PATCH(request: Request, context: RouteParams) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { transactionId } = await context.params;
  const body = (await request.json()) as Body;
  const nextCategoryId = body.categoryId ?? null;

  const transaction = await prisma.transaction.findFirst({
    where: {
      id: transactionId,
      account: {
        userId: session.user.id,
      },
    },
    select: { id: true },
  });

  if (!transaction) {
    return NextResponse.json({ error: "Transaction not found." }, { status: 404 });
  }

  if (nextCategoryId) {
    const category = await prisma.category.findFirst({
      where: {
        id: nextCategoryId,
        userId: session.user.id,
      },
      select: { id: true },
    });

    if (!category) {
      return NextResponse.json({ error: "Category not found." }, { status: 404 });
    }
  }

  await prisma.transaction.update({
    where: { id: transaction.id },
    data: {
      categoryId: nextCategoryId,
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true });
}
