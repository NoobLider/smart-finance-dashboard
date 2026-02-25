import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "../../lib/auth";
import { SignOutButton } from "../components/sign-out-button";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/sign-in");
  }

  return (
    <main className="page">
      <section className="card">
        <h1>Dashboard</h1>
        <p>Signed in as {session.user.email}</p>
        <p>Auth foundation is ready.</p>
        <p>
          Continue to <Link href="/upload">CSV upload</Link>.
        </p>
        <p>
          Then open <Link href="/transactions">transaction list</Link>.
        </p>
        <SignOutButton />
      </section>
    </main>
  );
}
