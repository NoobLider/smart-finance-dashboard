import { describe, expect, it } from "vitest";

import { normalizeCsvRows, parseCsvText } from "./csv-upload";

describe("csv upload parsing", () => {
  it("parses required columns", () => {
    const csv = [
      "date,amount,merchant,description,type,category",
      "2026-02-01,-24.50,Metro Pass,Monthly pass,expense,Transport",
    ].join("\n");

    const rows = parseCsvText(csv);

    expect(rows).toHaveLength(1);
    expect(rows[0].merchant).toBe("Metro Pass");
  });

  it("normalizes signed amounts into absolute amount + transaction type", () => {
    const rows = parseCsvText([
      "date,amount,merchant",
      "2026-02-01,-24.50,Metro Pass",
      "2026-02-03,3200.00,Salary",
    ].join("\n"));

    const normalized = normalizeCsvRows(rows);

    expect(normalized[0].amount).toBe(24.5);
    expect(normalized[0].type).toBe("EXPENSE");
    expect(normalized[1].amount).toBe(3200);
    expect(normalized[1].type).toBe("INCOME");
  });

  it("throws on missing required headers", () => {
    const csv = ["amount,merchant", "24.50,Shop"].join("\n");

    expect(() => parseCsvText(csv)).toThrow("CSV headers must include date, amount, and merchant columns.");
  });

  it("parses MM/DD/YYYY dates from common bank exports", () => {
    const rows = parseCsvText([
      "date,amount,merchant",
      "02/14/2026,-32.10,Corner Cafe",
    ].join("\n"));

    const normalized = normalizeCsvRows(rows);

    expect(normalized[0].date.toISOString()).toContain("2026-02-14");
  });
});
