import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { AccountsManager } from "./accounts-manager";

export default async function AccountsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const accounts = await prisma.account.findMany({
    where: {
      userId: session.user.id,
      isArchived: false,
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      name: true,
      type: true,
    },
  });

  return (
    <main className="page">
      <section className="card transactions-card">
        <h1>Accounts</h1>
        <p>Manage account names, account types, and archive accounts while keeping historical transactions.</p>

        <p>
          <Link href="/accounts/new">Create account</Link>
        </p>

        <AccountsManager accounts={accounts} />

        <p>
          <Link href="/dashboard">Back to dashboard</Link> · <Link href="/upload">CSV upload</Link>
        </p>
      </section>
    </main>
  );
}
