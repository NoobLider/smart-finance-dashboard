import { AlertType, Prisma } from "@prisma/client";

import { buildDetectionAlerts } from "./alerts-engine";
import { prisma } from "./prisma";

export interface SyncedAlertData {
  anomalyAlerts: Array<{
    id: string;
    severity: string;
    title: string;
    message: string;
    createdAt: Date;
  }>;
  recurringAlerts: Array<{
    severity: string;
    title: string;
    message: string;
    metadata: Record<string, unknown>;
  }>;
}

function toJsonObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

export async function syncAlertsForUser(userId: string): Promise<SyncedAlertData> {
  const transactions = await prisma.transaction.findMany({
    where: {
      account: {
        userId,
      },
    },
    select: {
      id: true,
      accountId: true,
      merchant: true,
      amount: true,
      date: true,
      type: true,
    },
  });

  const generated = buildDetectionAlerts(transactions);
  const anomalyAlerts = generated.filter((alert) => alert.kind === "anomaly");
  const recurringAlerts = generated.filter((alert) => alert.kind === "recurring");

  await prisma.$transaction(async (tx) => {
    // MVP note: replace-on-sync resets isRead because rows are recreated.
    await tx.alert.deleteMany({
      where: {
        userId,
        type: AlertType.ANOMALY,
      },
    });

    const rows = [...anomalyAlerts, ...recurringAlerts];

    if (rows.length > 0) {
      await tx.alert.createMany({
        data: rows.map((alert) => ({
          userId,
          accountId: alert.accountId,
          transactionId: alert.transactionId,
          type: AlertType.ANOMALY,
          severity: alert.severity,
          title: alert.title,
          message: alert.message,
          metadata: alert.metadata as Prisma.InputJsonValue,
        })),
      });
    }
  });

  const persistedAnomalyAlerts = await prisma.alert.findMany({
    where: {
      userId,
      type: AlertType.ANOMALY,
      metadata: {
        path: ["detectionKind"],
        equals: "anomaly",
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      severity: true,
      title: true,
      message: true,
      metadata: true,
      createdAt: true,
    },
    take: 50,
  });

  const persistedRecurringAlerts = await prisma.alert.findMany({
    where: {
      userId,
      type: AlertType.ANOMALY,
      metadata: {
        path: ["detectionKind"],
        equals: "recurring",
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      severity: true,
      title: true,
      message: true,
      metadata: true,
    },
    take: 50,
  });

  return {
    anomalyAlerts: persistedAnomalyAlerts.map((alert) => ({
      id: alert.id,
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      createdAt: alert.createdAt,
    })),
    recurringAlerts: persistedRecurringAlerts.map((alert) => ({
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      metadata: toJsonObject(alert.metadata),
    })),
  };
}
