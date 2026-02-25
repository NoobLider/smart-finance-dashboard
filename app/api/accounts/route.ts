import { AccountType, UploadJobStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "../../../lib/auth";
import { normalizeCsvRows, parseCsvText } from "../../../lib/csv-upload";
import { prisma } from "../../../lib/prisma";

const ALLOWED_ACCOUNT_TYPES = new Set<AccountType>([
  AccountType.CHECKING,
  AccountType.CREDIT_CARD,
  AccountType.SAVINGS,
]);

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const rawName = formData.get("name");
  const rawType = formData.get("type");
  const file = formData.get("file");

  const name = typeof rawName === "string" ? rawName.trim() : "";

  if (!name) {
    return NextResponse.json({ error: "name is required." }, { status: 400 });
  }

  if (name.length > 80) {
    return NextResponse.json({ error: "name must be 80 characters or less." }, { status: 400 });
  }

  if (typeof rawType !== "string" || !ALLOWED_ACCOUNT_TYPES.has(rawType as AccountType)) {
    return NextResponse.json({ error: "type must be CHECKING, CREDIT_CARD, or SAVINGS." }, { status: 400 });
  }

  if (file instanceof File && file.size > 0 && !file.name.toLowerCase().endsWith(".csv")) {
    return NextResponse.json({ error: "Only .csv files are supported." }, { status: 400 });
  }

  const type = rawType as AccountType;

  const account = await prisma.account.create({
    data: {
      userId: session.user.id,
      name,
      type,
    },
    select: {
      id: true,
    },
  });

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ ok: true, accountId: account.id, insertedCount: 0 });
  }

  const uploadJob = await prisma.uploadJob.create({
    data: {
      userId: session.user.id,
      accountId: account.id,
      fileName: file.name,
      status: UploadJobStatus.PENDING,
    },
    select: {
      id: true,
    },
  });

  try {
    const csvText = await file.text();
    const parsedRows = parseCsvText(csvText);
    const normalizedRows = normalizeCsvRows(parsedRows);

    const categoryNames = Array.from(
      new Set(normalizedRows.map((row) => row.categoryName).filter((value): value is string => Boolean(value))),
    );

    const categories = await prisma.category.findMany({
      where: {
        userId: session.user.id,
        name: {
          in: categoryNames,
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    const categoryByName = new Map(categories.map((category) => [category.name.toLowerCase(), category.id]));

    await prisma.$transaction(async (tx) => {
      await tx.transaction.createMany({
        data: normalizedRows.map((row) => ({
          accountId: account.id,
          uploadJobId: uploadJob.id,
          date: row.date,
          amount: row.amount,
          merchant: row.merchant,
          description: row.description,
          type: row.type,
          categoryId: row.categoryName ? categoryByName.get(row.categoryName.toLowerCase()) ?? null : null,
          isManualEntry: false,
        })),
      });

      await tx.uploadJob.update({
        where: { id: uploadJob.id },
        data: {
          status: UploadJobStatus.COMPLETE,
          completedAt: new Date(),
          errorMessage: null,
        },
      });
    });

    return NextResponse.json({
      ok: true,
      accountId: account.id,
      uploadJobId: uploadJob.id,
      insertedCount: normalizedRows.length,
    });
  } catch (error) {
    await prisma.uploadJob
      .update({
        where: { id: uploadJob.id },
        data: {
          status: UploadJobStatus.FAILED,
          completedAt: new Date(),
          errorMessage: error instanceof Error ? error.message : "Upload failed.",
        },
      })
      .catch(() => {
        // Best effort only; original parse/import error is returned below.
      });

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Upload failed.",
        accountId: account.id,
      },
      { status: 400 },
    );
  }
}
