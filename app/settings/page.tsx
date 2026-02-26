import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "../../lib/auth";
import { SettingsPanel } from "./settings-panel";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  return (
    <main className="page">
      <section className="card transactions-card">
        <h1>User Settings</h1>
        <p>Manage password, backup your data, and permanently delete your account.</p>
        <SettingsPanel />
      </section>
    </main>
  );
}
