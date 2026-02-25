import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "../../../lib/auth";
import { NewAccountForm } from "./new-account-form";

export default async function NewAccountPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  return (
    <main className="page">
      <section className="card auth-card">
        <h1>Create account</h1>
        <p>Choose basic mode for account-only creation, or extended mode to optionally import CSV data.</p>

        <NewAccountForm />

        <p>
          <Link href="/accounts">Back to accounts</Link> · <Link href="/dashboard">Dashboard</Link>
        </p>
      </section>
    </main>
  );
}
