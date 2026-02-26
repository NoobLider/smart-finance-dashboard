import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { UploadForm } from "./upload-form";

export default async function UploadPage() {
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
    },
  });

  return (
    <main className="page">
      <section className="card auth-card">
        <h1>CSV Upload</h1>
        <p>Upload a statement CSV and import transactions into the selected account.</p>
        <p>
          Need a template?{" "}
          <a href="/sample-transactions.csv" download>
            Download sample CSV
          </a>
        </p>

        {accounts.length === 0 ? (
          <p className="form-error">No active accounts found. Seed data or create an account first.</p>
        ) : (
          <UploadForm accounts={accounts} />
        )}
      </section>
    </main>
  );
}
