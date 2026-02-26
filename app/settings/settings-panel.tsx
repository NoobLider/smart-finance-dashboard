"use client";

import { signOut } from "next-auth/react";
import { FormEvent, useState } from "react";

interface ApiResponse {
  ok?: boolean;
  error?: string;
}

export function SettingsPanel() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function onSubmitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    setIsSavingPassword(true);

    const response = await fetch("/api/settings/password", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        currentPassword,
        newPassword,
        confirmNewPassword: confirmPassword,
      }),
    });

    const data = (await response.json()) as ApiResponse;
    setIsSavingPassword(false);

    if (!response.ok) {
      setPasswordError(data.error ?? "Unable to update password.");
      return;
    }

    setPasswordSuccess("Password updated.");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  async function onDeleteAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDeleteError(null);

    if (deleteConfirmText !== "DELETE") {
      setDeleteError('Type "DELETE" to confirm account deletion.');
      return;
    }

    setIsDeleting(true);

    const response = await fetch("/api/settings/account", {
      method: "DELETE",
    });

    const data = (await response.json()) as ApiResponse;

    if (!response.ok) {
      setDeleteError(data.error ?? "Unable to delete account.");
      setIsDeleting(false);
      return;
    }

    await signOut({ callbackUrl: "/sign-in" });
  }

  return (
    <div className="settings-grid">
      <section className="settings-section">
        <h2>Change password</h2>
        <form className="auth-form" onSubmit={onSubmitPassword}>
          <label>
            Current password
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
            />
          </label>

          <label>
            New password
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
            />
          </label>

          <label>
            Confirm new password
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
          </label>

          {passwordError ? <p className="form-error">{passwordError}</p> : null}
          {passwordSuccess ? <p className="form-success">{passwordSuccess}</p> : null}

          <button type="submit" disabled={isSavingPassword}>
            {isSavingPassword ? "Saving..." : "Update password"}
          </button>
        </form>
      </section>

      <section className="settings-section">
        <h2>Export data (backup)</h2>
        <p>Download your accounts, categories, budgets, and transactions as JSON.</p>
        <a href="/api/settings/export" className="button-link">
          Download export
        </a>
      </section>

      <section className="settings-section danger">
        <h2>Delete account</h2>
        <p>This permanently deletes your account and all related data.</p>

        <form className="auth-form" onSubmit={onDeleteAccount}>
          <label>
            Type DELETE to confirm
            <input
              value={deleteConfirmText}
              onChange={(event) => setDeleteConfirmText(event.target.value)}
              required
            />
          </label>

          {deleteError ? <p className="form-error">{deleteError}</p> : null}

          <button type="submit" disabled={isDeleting} className="danger-button">
            {isDeleting ? "Deleting..." : "Delete account"}
          </button>
        </form>
      </section>
    </div>
  );
}
