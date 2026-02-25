import { UploadJobStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "../../../../lib/auth";
import { normalizeCsvRows, parseCsvText } from "../../../../lib/csv-upload";
import { prisma } from "../../../../lib/prisma";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const accountId = formData.get("accountId");
  const file = formData.get("file");

  if (typeof accountId !== "string" || !(file instanceof File)) {
    return NextResponse.json({ error: "accountId and CSV file are required." }, { status: 400 });
  }

  if (!file.name.toLowerCase().endsWith(".csv")) {
    return NextResponse.json({ error: "Only .csv files are supported." }, { status: 400 });
  }

  const account = await prisma.account.findFirst({
    where: {
      id: accountId,
      userId: session.user.id,
      isArchived: false,
    },
    select: { id: true },
  });

  if (!account) {
    return NextResponse.json({ error: "Account not found for current user." }, { status: 404 });
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
        // Best effort only; original upload parse/insert error is still returned below.
      });

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Upload failed.",
      },
      { status: 400 },
    );
  }
}
