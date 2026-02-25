"use client";

import { FormEvent, useState } from "react";

interface UploadFormProps {
  accounts: Array<{ id: string; name: string }>;
}

interface UploadResponse {
  ok?: boolean;
  insertedCount?: number;
  uploadJobId?: string;
  error?: string;
}

export function UploadForm({ accounts }: UploadFormProps) {
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id ?? "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selectedAccountId) {
      setError("Select an account before uploading.");
      return;
    }

    if (!selectedFile) {
      setError("Attach a CSV file to continue.");
      return;
    }

    setIsSubmitting(true);

    const formData = new FormData();
    formData.set("accountId", selectedAccountId);
    formData.set("file", selectedFile);

    const response = await fetch("/api/uploads/csv", {
      method: "POST",
      body: formData,
    });

    const data = (await response.json()) as UploadResponse;
    setIsSubmitting(false);

    if (!response.ok) {
      setError(data.error ?? "Upload failed.");
      return;
    }

    setSuccess(
      `Imported ${data.insertedCount ?? 0} transactions (upload job ${data.uploadJobId ?? "unknown"}).`,
    );
  }

  return (
    <form className="auth-form" onSubmit={onSubmit}>
      <label>
        Account
        <select
          value={selectedAccountId}
          onChange={(event) => setSelectedAccountId(event.target.value)}
          required
        >
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        CSV File
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => {
            setSelectedFile(event.target.files?.[0] ?? null);
          }}
          required
        />
      </label>

      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p className="form-success">{success}</p> : null}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Uploading..." : "Upload CSV"}
      </button>
    </form>
  );
}
