"use client";

import { AccountType } from "@prisma/client";
import Link from "next/link";
import { FormEvent, useState } from "react";

interface CreateAccountResponse {
  ok?: boolean;
  accountId?: string;
  uploadJobId?: string;
  insertedCount?: number;
  error?: string;
}

const ACCOUNT_TYPES: AccountType[] = ["CHECKING", "CREDIT_CARD", "SAVINGS"];

type Mode = "basic" | "extended";

function formatAccountType(value: AccountType): string {
  return value.toLowerCase().replaceAll("_", " ");
}

export function NewAccountForm() {
  const [mode, setMode] = useState<Mode>("basic");
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("CHECKING");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim()) {
      setError("Account name is required.");
      return;
    }

    if (mode === "extended" && file && !file.name.toLowerCase().endsWith(".csv")) {
      setError("Only .csv files are supported.");
      return;
    }

    setIsSubmitting(true);

    const formData = new FormData();
    formData.set("name", name.trim());
    formData.set("type", type);

    if (mode === "extended" && file) {
      formData.set("file", file);
    }

    const response = await fetch("/api/accounts", {
      method: "POST",
      body: formData,
    });

    const data = (await response.json()) as CreateAccountResponse;
    setIsSubmitting(false);

    if (!response.ok) {
      setError(data.error ?? "Unable to create account.");
      return;
    }

    setSuccess(
      mode === "extended" && file
        ? `Account created and imported ${data.insertedCount ?? 0} transactions (upload job ${data.uploadJobId ?? "unknown"}).`
        : "Account created successfully.",
    );

    setName("");
    setType("CHECKING");
    setFile(null);
  }

  return (
    <form className="auth-form" onSubmit={onSubmit}>
      <div className="mode-toggle" role="tablist" aria-label="Create account mode">
        <button
          type="button"
          className={`mode-button ${mode === "basic" ? "active" : ""}`}
          onClick={() => setMode("basic")}
        >
          Basic mode
        </button>
        <button
          type="button"
          className={`mode-button ${mode === "extended" ? "active" : ""}`}
          onClick={() => setMode("extended")}
        >
          Extended mode
        </button>
      </div>

      <label>
        Account name
        <input value={name} onChange={(event) => setName(event.target.value)} required maxLength={80} />
      </label>

      <label>
        Account type
        <select value={type} onChange={(event) => setType(event.target.value as AccountType)}>
          {ACCOUNT_TYPES.map((value) => (
            <option key={value} value={value}>
              {formatAccountType(value)}
            </option>
          ))}
        </select>
      </label>

      {mode === "extended" ? (
        <>
          <label>
            Optional CSV file
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
              }}
            />
          </label>
          <p>
            Optional import template columns: <code>date</code>, <code>amount</code>, <code>merchant</code>,
            <code>description</code>, <code>type</code>, <code>category</code>.{" "}
            <Link href="/sample-transactions.csv">Download sample CSV</Link>.
          </p>
        </>
      ) : null}

      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p className="form-success">{success}</p> : null}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : mode === "extended" ? "Create account (optional import)" : "Create account"}
      </button>
    </form>
  );
}
