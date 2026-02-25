import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "../../lib/auth";
import { syncAlertsForUser } from "../../lib/alerts-sync";

function severityClassName(severity: string): string {
  switch (severity) {
    case "HIGH":
      return "severity-chip high";
    case "MEDIUM":
      return "severity-chip medium";
    default:
      return "severity-chip low";
  }
}

export default async function AlertsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const data = await syncAlertsForUser(session.user.id);

  return (
    <main className="page">
      <section className="card transactions-card">
        <h1>Alerts</h1>
        <p>Surfacing anomaly and recurring detections from your persisted transactions.</p>

        <section className="analytics-section">
          <h2>Anomaly alerts</h2>
          {data.anomalyAlerts.length === 0 ? (
            <p>No anomaly alerts found in current transaction history.</p>
          ) : (
            <ul className="alerts-list">
              {data.anomalyAlerts.map((alert) => (
                <li key={alert.id} className="alert-item">
                  <div className="alert-head">
                    <strong>{alert.title}</strong>
                    <span className={severityClassName(alert.severity)}>{alert.severity}</span>
                  </div>
                  <p>{alert.message}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="analytics-section">
          <h2>Recurring detections</h2>
          {data.recurringAlerts.length === 0 ? (
            <p>No recurring patterns detected yet.</p>
          ) : (
            <ul className="alerts-list">
              {data.recurringAlerts.map((alert, index) => {
                const merchant =
                  typeof alert.metadata.merchant === "string" ? alert.metadata.merchant : "recurring";

                return (
                  <li key={`${merchant}-${index}`} className="alert-item">
                    <div className="alert-head">
                      <strong>{alert.title}</strong>
                      <span className={severityClassName(alert.severity)}>{alert.severity}</span>
                    </div>
                    <p>{alert.message}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <p>
          <Link href="/dashboard">Back to dashboard</Link> · <Link href="/budgets">Budgets</Link>
        </p>
      </section>
    </main>
  );
}
