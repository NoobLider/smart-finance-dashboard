"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface CategorySelectProps {
  transactionId: string;
  currentCategoryId: string | null;
  categories: Array<{ id: string; name: string }>;
}

interface UpdateCategoryResponse {
  ok?: boolean;
  error?: string;
}

export function CategorySelect({ transactionId, currentCategoryId, categories }: CategorySelectProps) {
  const router = useRouter();
  const [value, setValue] = useState(currentCategoryId ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onChange(nextValue: string) {
    setValue(nextValue);
    setError(null);
    setIsSaving(true);

    const response = await fetch(`/api/transactions/${transactionId}/category`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ categoryId: nextValue || null }),
    });

    setIsSaving(false);

    if (!response.ok) {
      const data = (await response.json()) as UpdateCategoryResponse;
      setError(data.error ?? "Unable to update category.");
      setValue(currentCategoryId ?? "");
      return;
    }

    router.refresh();
  }

  return (
    <div>
      <select
        value={value}
        onChange={(event) => {
          void onChange(event.target.value);
        }}
        disabled={isSaving}
      >
        <option value="">Uncategorized</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
      {error ? <p className="form-error tiny-error">{error}</p> : null}
    </div>
  );
}
