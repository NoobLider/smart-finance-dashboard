import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";

export async function DELETE() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.transaction.deleteMany({
      where: {
        account: {
          userId: session.user.id,
        },
      },
    });

    await tx.uploadJob.deleteMany({
      where: {
        userId: session.user.id,
      },
    });

    await tx.alert.deleteMany({
      where: {
        userId: session.user.id,
      },
    });

    await tx.budget.deleteMany({
      where: {
        userId: session.user.id,
      },
    });

    await tx.account.deleteMany({
      where: {
        userId: session.user.id,
      },
    });

    await tx.category.deleteMany({
      where: {
        userId: session.user.id,
      },
    });

    await tx.user.delete({
      where: {
        id: session.user.id,
      },
    });
  });

  return NextResponse.json({ ok: true });
}
