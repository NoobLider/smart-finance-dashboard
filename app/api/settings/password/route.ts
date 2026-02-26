import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";

interface Body {
  currentPassword?: string;
  newPassword?: string;
  confirmNewPassword?: string;
}

const MIN_PASSWORD_LENGTH = 8;

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as Body;
  const currentPassword = body.currentPassword ?? "";
  const newPassword = body.newPassword ?? "";
  const confirmNewPassword = body.confirmNewPassword ?? "";

  if (!currentPassword || !newPassword || !confirmNewPassword) {
    return NextResponse.json({ error: "All password fields are required." }, { status: 400 });
  }

  if (newPassword !== confirmNewPassword) {
    return NextResponse.json({ error: "New passwords do not match." }, { status: 400 });
  }

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters.` },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      passwordHash: true,
    },
  });

  if (!user?.passwordHash) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
  }

  const matches = await bcrypt.compare(currentPassword, user.passwordHash);

  if (!matches) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
  }

  const nextHash = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: nextHash,
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true });
}
