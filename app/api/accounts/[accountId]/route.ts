import { AccountType } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";

interface Body {
  name?: string;
  type?: AccountType;
}

interface RouteParams {
  params: Promise<{ accountId: string }>;
}

const ALLOWED_ACCOUNT_TYPES = new Set<AccountType>([
  AccountType.CHECKING,
  AccountType.CREDIT_CARD,
  AccountType.SAVINGS,
]);

export async function PATCH(request: Request, context: RouteParams) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { accountId } = await context.params;
  const body = (await request.json()) as Body;

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

  const nextName = typeof body.name === "string" ? body.name.trim() : undefined;
  const nextType = body.type;

  if (nextName !== undefined && !nextName) {
    return NextResponse.json({ error: "name cannot be empty." }, { status: 400 });
  }

  if (nextName !== undefined && nextName.length > 80) {
    return NextResponse.json({ error: "name must be 80 characters or less." }, { status: 400 });
  }

  if (nextType !== undefined && !ALLOWED_ACCOUNT_TYPES.has(nextType)) {
    return NextResponse.json({ error: "Invalid account type." }, { status: 400 });
  }

  if (nextName === undefined && nextType === undefined) {
    return NextResponse.json({ error: "Provide name or type to update." }, { status: 400 });
  }

  await prisma.account.update({
    where: { id: account.id },
    data: {
      ...(nextName !== undefined ? { name: nextName } : {}),
      ...(nextType !== undefined ? { type: nextType } : {}),
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true });
}
