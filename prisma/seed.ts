import {
  AccountType,
  Prisma,
  PrismaClient,
  TransactionType,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_USER_EMAIL = "demo@smartfinance.local";
const DEMO_USER_PASSWORD = "demo12345";
const MONTH_WINDOW = 6;

const SYSTEM_CATEGORIES = [
  "Food & Dining",
  "Transport",
  "Subscriptions",
  "Shopping",
  "Utilities",
  "Income",
] as const;

function monthStartUtc(monthsAgo: number): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsAgo, 1, 0, 0, 0, 0));
}

function dayInMonthUtc(monthStart: Date, day: number): Date {
  return new Date(
    Date.UTC(
      monthStart.getUTCFullYear(),
      monthStart.getUTCMonth(),
      day,
      12,
      0,
      0,
      0,
    ),
  );
}

function money(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value.toFixed(2));
}

async function main(): Promise<void> {
  const demoPasswordHash = await bcrypt.hash(DEMO_USER_PASSWORD, 12);

  // Keep seed idempotent for iterative demo prep, scoped to demo user only.
  const existingDemoUser = await prisma.user.findUnique({
    where: { email: DEMO_USER_EMAIL },
    select: { id: true },
  });

  if (existingDemoUser) {
    await prisma.alert.deleteMany({ where: { userId: existingDemoUser.id } });
    await prisma.transaction.deleteMany({
      where: {
        account: {
          userId: existingDemoUser.id,
        },
      },
    });
    await prisma.uploadJob.deleteMany({ where: { userId: existingDemoUser.id } });
    await prisma.budget.deleteMany({ where: { userId: existingDemoUser.id } });
    await prisma.account.deleteMany({ where: { userId: existingDemoUser.id } });
    await prisma.category.deleteMany({ where: { userId: existingDemoUser.id } });
    await prisma.user.delete({ where: { id: existingDemoUser.id } });
  }

  const user = await prisma.user.create({
    data: {
      email: DEMO_USER_EMAIL,
      passwordHash: demoPasswordHash,
    },
  });

  const checking = await prisma.account.create({
    data: {
      userId: user.id,
      name: "Main Checking",
      type: AccountType.CHECKING,
      currency: "USD",
    },
  });

  // Extra accounts exist to validate multi-account-ready schema from day one.
  await prisma.account.createMany({
    data: [
      {
        userId: user.id,
        name: "Daily Credit Card",
        type: AccountType.CREDIT_CARD,
        currency: "USD",
      },
      {
        userId: user.id,
        name: "Rainy Day Savings",
        type: AccountType.SAVINGS,
        currency: "USD",
      },
    ],
  });

  await prisma.category.createMany({
    data: SYSTEM_CATEGORIES.map((name) => ({
      userId: user.id,
      name,
      isSystem: true,
    })),
  });

  const categories = await prisma.category.findMany({ where: { userId: user.id } });
  const categoryByName = new Map(categories.map((category) => [category.name, category]));

  const incomeCategory = categoryByName.get("Income");
  const foodCategory = categoryByName.get("Food & Dining");
  const transportCategory = categoryByName.get("Transport");
  const subscriptionsCategory = categoryByName.get("Subscriptions");
  const shoppingCategory = categoryByName.get("Shopping");
  const utilitiesCategory = categoryByName.get("Utilities");

  if (
    !incomeCategory ||
    !foodCategory ||
    !transportCategory ||
    !subscriptionsCategory ||
    !shoppingCategory ||
    !utilitiesCategory
  ) {
    throw new Error("Expected system categories were not created.");
  }

  const monthStarts = Array.from({ length: MONTH_WINDOW }, (_, index) =>
    monthStartUtc(MONTH_WINDOW - 1 - index),
  );

  await prisma.budget.createMany({
    data: monthStarts.flatMap((monthStart) => [
      {
        userId: user.id,
        categoryId: foodCategory.id,
        monthStart,
        amount: money(600),
      },
      {
        userId: user.id,
        categoryId: transportCategory.id,
        monthStart,
        amount: money(220),
      },
      {
        userId: user.id,
        categoryId: subscriptionsCategory.id,
        monthStart,
        amount: money(90),
      },
      {
        userId: user.id,
        categoryId: shoppingCategory.id,
        monthStart,
        amount: money(300),
      },
      {
        userId: user.id,
        categoryId: utilitiesCategory.id,
        monthStart,
        amount: money(260),
      },
    ]),
  });

  const uploadJob = await prisma.uploadJob.create({
    data: {
      userId: user.id,
      accountId: checking.id,
      fileName: "seed-transactions.csv",
      status: "COMPLETE",
      completedAt: new Date(),
    },
  });

  const transactions: Prisma.TransactionCreateManyInput[] = [];

  monthStarts.forEach((monthStart, monthIndex) => {
    // Income: 9 total records (salary x6 + freelance x3)
    transactions.push({
      accountId: checking.id,
      categoryId: incomeCategory.id,
      uploadJobId: uploadJob.id,
      date: dayInMonthUtc(monthStart, 1),
      merchant: "Acme Corp Payroll",
      amount: money(3500),
      type: TransactionType.INCOME,
      isManualEntry: false,
    });

    if (monthIndex < 3) {
      transactions.push({
        accountId: checking.id,
        categoryId: incomeCategory.id,
        date: dayInMonthUtc(monthStart, 20),
        merchant: "Freelance Client A",
        amount: money(620),
        type: TransactionType.INCOME,
        isManualEntry: true,
      });
    }

    // Food & Dining: 9 total with one clear anomaly (~3x baseline)
    const foodBase = [26, 24, 28, 27, 25, 26][monthIndex];
    transactions.push({
      accountId: checking.id,
      categoryId: foodCategory.id,
      uploadJobId: uploadJob.id,
      date: dayInMonthUtc(monthStart, 5),
      merchant: "Fresh Fork Bistro",
      amount: money(foodBase),
      type: TransactionType.EXPENSE,
      isManualEntry: false,
    });

    if (monthIndex < 2) {
      transactions.push({
        accountId: checking.id,
        categoryId: foodCategory.id,
        uploadJobId: uploadJob.id,
        date: dayInMonthUtc(monthStart, 18),
        merchant: "Green Bowl",
        amount: money(23 + monthIndex),
        type: TransactionType.EXPENSE,
        isManualEntry: false,
      });
    }

    if (monthIndex === 4) {
      transactions.push({
        accountId: checking.id,
        categoryId: foodCategory.id,
        uploadJobId: uploadJob.id,
        date: dayInMonthUtc(monthStart, 27),
        merchant: "Steakhouse 48",
        amount: money(84), // clear anomaly: roughly 3x Food & Dining baseline
        type: TransactionType.EXPENSE,
        isManualEntry: false,
      });
    }

    // Transport: 9 total, recurring #1 (same merchant and amount across 6 months)
    transactions.push({
      accountId: checking.id,
      categoryId: transportCategory.id,
      uploadJobId: uploadJob.id,
      date: dayInMonthUtc(monthStart, 3),
      merchant: "Metro Pass",
      amount: money(50),
      type: TransactionType.EXPENSE,
      isManualEntry: false,
    });

    if (monthIndex < 3) {
      transactions.push({
        accountId: checking.id,
        categoryId: transportCategory.id,
        uploadJobId: uploadJob.id,
        date: dayInMonthUtc(monthStart, 22),
        merchant: "RideWave",
        amount: money(16 + monthIndex),
        type: TransactionType.EXPENSE,
        isManualEntry: false,
      });
    }

    // Subscriptions: 9 total, recurring #2 (same merchant and amount across 6 months)
    transactions.push({
      accountId: checking.id,
      categoryId: subscriptionsCategory.id,
      uploadJobId: uploadJob.id,
      date: dayInMonthUtc(monthStart, 8),
      merchant: "Netflix",
      amount: money(12.99),
      type: TransactionType.EXPENSE,
      isManualEntry: false,
    });

    if (monthIndex < 3) {
      transactions.push({
        accountId: checking.id,
        categoryId: subscriptionsCategory.id,
        uploadJobId: uploadJob.id,
        date: dayInMonthUtc(monthStart, 11),
        merchant: "Spotify",
        amount: money(9.99),
        type: TransactionType.EXPENSE,
        isManualEntry: false,
      });
    }

    // Shopping: 9 total
    transactions.push({
      accountId: checking.id,
      categoryId: shoppingCategory.id,
      uploadJobId: uploadJob.id,
      date: dayInMonthUtc(monthStart, 14),
      merchant: "MarketHub",
      amount: money(45 + monthIndex * 2),
      type: TransactionType.EXPENSE,
      isManualEntry: false,
    });

    if (monthIndex < 3) {
      transactions.push({
        accountId: checking.id,
        categoryId: shoppingCategory.id,
        uploadJobId: uploadJob.id,
        date: dayInMonthUtc(monthStart, 25),
        merchant: "HomeNeeds",
        amount: money(28 + monthIndex),
        type: TransactionType.EXPENSE,
        isManualEntry: false,
      });
    }

    // Utilities: 9 total (electricity recurring, internet top-up for first 3 months)
    transactions.push({
      accountId: checking.id,
      categoryId: utilitiesCategory.id,
      uploadJobId: uploadJob.id,
      date: dayInMonthUtc(monthStart, 7),
      merchant: "City Electric",
      amount: money(78 + monthIndex),
      type: TransactionType.EXPENSE,
      isManualEntry: false,
    });

    if (monthIndex < 3) {
      transactions.push({
        accountId: checking.id,
        categoryId: utilitiesCategory.id,
        uploadJobId: uploadJob.id,
        date: dayInMonthUtc(monthStart, 19),
        merchant: "FiberNet",
        amount: money(49.9),
        type: TransactionType.EXPENSE,
        isManualEntry: false,
      });
    }
  });

  await prisma.transaction.createMany({ data: transactions });

  console.log("Seed complete");
  console.log(`User: ${user.email}`);
  console.log(`Accounts: 3 (checking + credit card + savings)`);
  console.log(`Categories: ${SYSTEM_CATEGORIES.length}`);
  console.log(`Transactions: ${transactions.length}`);
  console.log("Notes:");
  console.log(
    "- Includes one Food & Dining anomaly (~3x baseline).\n- Includes recurring Metro Pass + Netflix + City Electric patterns across 6 months.",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
