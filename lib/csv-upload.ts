import { TransactionType } from "@prisma/client";

export interface ParsedCsvRow {
  date: string;
  amount: string;
  merchant: string;
  description: string;
  type: string;
  category: string;
}

export interface NormalizedCsvRow {
  date: Date;
  amount: number;
  merchant: string;
  description: string | null;
  type: TransactionType;
  categoryName: string | null;
}

const HEADER_ALIASES: Record<string, keyof ParsedCsvRow> = {
  date: "date",
  posted_at: "date",
  transaction_date: "date",
  amount: "amount",
  value: "amount",
  merchant: "merchant",
  payee: "merchant",
  description: "description",
  memo: "description",
  type: "type",
  transaction_type: "type",
  category: "category",
};

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

export function parseCsvText(csvText: string): ParsedCsvRow[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    throw new Error("CSV must include a header row and at least one data row.");
  }

  const rawHeaders = splitCsvLine(lines[0]);
  const headerMap = rawHeaders.map((header) => {
    const alias = HEADER_ALIASES[normalizeHeader(header)];
    return alias ?? null;
  });

  if (!headerMap.includes("date") || !headerMap.includes("amount") || !headerMap.includes("merchant")) {
    throw new Error("CSV headers must include date, amount, and merchant columns.");
  }

  return lines.slice(1).map((line, index) => {
    const values = splitCsvLine(line);
    const row: ParsedCsvRow = {
      date: "",
      amount: "",
      merchant: "",
      description: "",
      type: "",
      category: "",
    };

    for (let i = 0; i < headerMap.length; i += 1) {
      const key = headerMap[i];

      if (!key) {
        continue;
      }

      row[key] = (values[i] ?? "").trim();
    }

    if (!row.date || !row.amount || !row.merchant) {
      throw new Error(`Row ${index + 2} is missing date, amount, or merchant.`);
    }

    return row;
  });
}

function parseAmount(rawAmount: string): number {
  const normalized = rawAmount.replace(/[$,]/g, "").trim();
  const parsed = Number.parseFloat(normalized);

  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid amount value: ${rawAmount}`);
  }

  return parsed;
}

function parseDate(rawDate: string): Date {
  const slashMatch = rawDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (slashMatch) {
    const month = Number.parseInt(slashMatch[1], 10);
    const day = Number.parseInt(slashMatch[2], 10);
    const year = Number.parseInt(slashMatch[3], 10);
    const parsed = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));

    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  const isoDateOnlyMatch = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (isoDateOnlyMatch) {
    const year = Number.parseInt(isoDateOnlyMatch[1], 10);
    const month = Number.parseInt(isoDateOnlyMatch[2], 10);
    const day = Number.parseInt(isoDateOnlyMatch[3], 10);
    const parsed = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));

    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  const direct = new Date(rawDate);

  if (!Number.isNaN(direct.getTime())) {
    return direct;
  }

  throw new Error(`Invalid date value: ${rawDate}`);
}

function inferType(typeValue: string, amount: number): TransactionType {
  const normalizedType = typeValue.trim().toLowerCase();

  if (["income", "credit", "deposit"].includes(normalizedType)) {
    return TransactionType.INCOME;
  }

  if (["expense", "debit", "withdrawal"].includes(normalizedType)) {
    return TransactionType.EXPENSE;
  }

  return amount < 0 ? TransactionType.EXPENSE : TransactionType.INCOME;
}

export function normalizeCsvRows(rows: ParsedCsvRow[]): NormalizedCsvRow[] {
  return rows.map((row) => {
    const signedAmount = parseAmount(row.amount);
    const type = inferType(row.type, signedAmount);

    return {
      date: parseDate(row.date),
      amount: Math.abs(signedAmount),
      merchant: row.merchant.trim(),
      description: row.description.trim() || null,
      type,
      categoryName: row.category.trim() ? row.category.trim() : null,
    };
  });
}
