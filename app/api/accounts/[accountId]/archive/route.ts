import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";

interface RouteParams {
  params: Promise<{ accountId: string }>;
}

export async function PATCH(_request: Request, context: RouteParams) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { accountId } = await context.params;

  const account = await prisma.account.findFirst({
    where: {
      id: accountId,
      userId: session.user.id,
      isArchived: false,
    },
    select: { id: true },
  });

  if (!account) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  await prisma.account.update({
    where: { id: account.id },
    data: {
      isArchived: true,
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true });
}
