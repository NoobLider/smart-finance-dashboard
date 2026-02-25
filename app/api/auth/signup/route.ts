import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { prisma } from "../../../../lib/prisma";

interface SignUpBody {
  email?: string;
  password?: string;
}

const MIN_PASSWORD_LENGTH = 8;

export async function POST(request: Request) {
  const body = (await request.json()) as SignUpBody;

  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` },
      { status: 400 },
    );
  }

  const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });

  if (existingUser) {
    return NextResponse.json({ error: "Email is already registered." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      email,
      passwordHash,
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
