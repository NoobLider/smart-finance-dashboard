"use client";

import { AccountType } from "@prisma/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface AccountsManagerProps {
  accounts: Array<{
    id: string;
    name: string;
    type: AccountType;
    _count: {
      transactions: number;
    };
  }>;
}

interface ApiResponse {
  ok?: boolean;
  error?: string;
}

const ACCOUNT_TYPES: AccountType[] = ["CHECKING", "CREDIT_CARD", "SAVINGS"];

function formatAccountType(value: AccountType): string {
  return value.toLowerCase().replaceAll("_", " ");
}

function accountTypeBadgeClass(type: AccountType): string {
  switch (type) {
    case "CHECKING":
      return "type-badge checking";
    case "CREDIT_CARD":
      return "type-badge credit";
    default:
      return "type-badge savings";
  }
}

export function AccountsManager({ accounts }: AccountsManagerProps) {
  const router = useRouter();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameById, setNameById] = useState<Record<string, string>>(
    Object.fromEntries(accounts.map((account) => [account.id, account.name])),
  );
  const [typeById, setTypeById] = useState<Record<string, AccountType>>(
    Object.fromEntries(accounts.map((account) => [account.id, account.type])),
  );
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [errorById, setErrorById] = useState<Record<string, string>>({});

  async function saveAccount(accountId: string) {
    setPendingId(accountId);
    setErrorById((previous) => ({ ...previous, [accountId]: "" }));

    const response = await fetch(`/api/accounts/${accountId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: (nameById[accountId] ?? "").trim(),
        type: typeById[accountId],
      }),
    });

    setPendingId(null);

    if (!response.ok) {
      const data = (await response.json()) as ApiResponse;
      setErrorById((previous) => ({
        ...previous,
        [accountId]: data.error ?? "Unable to save account.",
      }));
      return;
    }

    setEditingId(null);
    router.refresh();
  }

  async function archiveAccount(accountId: string) {
    setPendingId(accountId);
    setErrorById((previous) => ({ ...previous, [accountId]: "" }));

    const response = await fetch(`/api/accounts/${accountId}/archive`, {
      method: "PATCH",
    });

    setPendingId(null);

    if (!response.ok) {
      const data = (await response.json()) as ApiResponse;
      setErrorById((previous) => ({
        ...previous,
        [accountId]: data.error ?? "Unable to archive account.",
      }));
      return;
    }

    router.refresh();
  }

  if (accounts.length === 0) {
    return <p>No active accounts found. Create your first account to get started.</p>;
  }

  return (
    <div className="table-wrap">
      <table className="transactions-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Transactions</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((account) => {
            const isEditing = editingId === account.id;
            const isPending = pendingId === account.id;

            return (
              <tr key={account.id}>
                <td>
                  {isEditing ? (
                    <input
                      value={nameById[account.id] ?? ""}
                      onChange={(event) => {
                        setNameById((previous) => ({ ...previous, [account.id]: event.target.value }));
                      }}
                    />
                  ) : (
                    account.name
                  )}
                </td>
                <td>
                  {isEditing ? (
                    <select
                      value={typeById[account.id] ?? account.type}
                      onChange={(event) => {
                        setTypeById((previous) => ({
                          ...previous,
                          [account.id]: event.target.value as AccountType,
                        }));
                      }}
                    >
                      {ACCOUNT_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {formatAccountType(type)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className={accountTypeBadgeClass(account.type)}>{formatAccountType(account.type)}</span>
                  )}
                </td>
                <td>{account._count.transactions}</td>
                <td>
                  <div className="account-actions">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => {
                            void saveAccount(account.id);
                          }}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => {
                            setEditingId(null);
                            setNameById((previous) => ({ ...previous, [account.id]: account.name }));
                            setTypeById((previous) => ({ ...previous, [account.id]: account.type }));
                          }}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <Link href={`/transactions?accountId=${account.id}`} className="button-link">
                          View transactions
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(account.id);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => {
                            void archiveAccount(account.id);
                          }}
                        >
                          Archive
                        </button>
                      </>
                    )}
                  </div>
                  {errorById[account.id] ? <p className="form-error tiny-error">{errorById[account.id]}</p> : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
