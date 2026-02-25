# Smart Finance Dashboard - Product Specification (MVP)

## 1. Overview
Smart Finance Dashboard is a personal finance web app for importing account transactions, analyzing spending behavior, tracking budgets, and surfacing intelligent insights.

This specification defines the MVP scope and acceptance criteria. Prisma schema implementation must follow this document.

## 2. Goals
- Provide clear spending visibility from uploaded transaction data.
- Support user-specific, account-specific financial insights.
- Deliver practical smart insights (recurring and anomaly detection) with explicit, deterministic rules.
- Keep MVP implementation simple (synchronous processing, no background queue).

## 3. Non-Goals (MVP)
- Asynchronous job queues/workers
- External bank API integrations
- Forecast persistence/history comparison
- Multi-account dashboard UI (backend supports multiple accounts; UI remains single-account selection)

## 4. Functional Requirements (MVP)

### 4.1 Authentication and User Data Isolation
- Users can sign up/sign in.
- All data access is scoped to the authenticated user.

**Acceptance Criteria**
- A user cannot view or mutate another user’s accounts, transactions, budgets, or upload jobs.

### 4.2 Account Model (Multi-Account Ready)
- A user can own multiple accounts as distinct rows.
- Account types include at least: `checking`, `credit_card`, `savings`.
- MVP UI exposes only single-account selection at a time.

**Acceptance Criteria**
- Schema supports `User 1 -> N Accounts` from day one.
- No schema-breaking migration is required later to enable multi-account UI.

### 4.3 CSV Upload + Synchronous Processing
- User uploads transaction CSV for a selected account.
- Upload processing occurs synchronously in request lifecycle.
- Upload job status lifecycle is tracked.

#### UploadJob States (Exact)
- `pending`
- `complete`
- `failed`

**Acceptance Criteria**
- `UploadJob` status enum/constraint allows exactly the three states above.
- A successful upload transitions to `complete`; parsing/validation failure transitions to `failed`.
- No queue worker or async job infrastructure is required in MVP.

### 4.4 Transactions
- Persist normalized transaction records per account.
- Support listing, filtering, searching, and category editing.
- Canonical normalized transaction record fields (minimum required): `date`, `amount`, `merchant`, `category`, `accountId`.
- `category` may be empty at import time and assigned later by the user.
- Transactions include `isManualEntry` to distinguish CSV-imported records from manually added records.

**Acceptance Criteria**
- Each transaction is linked to exactly one account and one user (through account ownership).
- Category edits persist and are reflected in dashboard calculations.
- CSV parsing output is transformed into the canonical normalized fields: `date`, `amount`, `merchant`, `category`, `accountId`.
- CSV-imported transactions default to `isManualEntry = false`.

### 4.5 Dashboard Analytics
- Show total income, total expense, trend over time, and category breakdown.
- Trend over time is defined as monthly total expense for the last 6 calendar months (including current month).
- Category breakdown is defined as total expense amount by category for the current calendar month.

**Acceptance Criteria**
- Dashboard aggregates are computed from current persisted transactions for selected account context.
- Trend chart displays 6 monthly expense points derived from persisted transactions in account scope.
- Category breakdown is amount-based (not count-based) for the current calendar month in account scope.

### 4.6 Budget Tracking
- User defines monthly budgets by category.
- Show progress and over-budget signals.
- Budget scope for MVP is **user-level across all accounts** (not per-account budget rows).

**Acceptance Criteria**
- Budget progress updates correctly as transaction data changes.
- Budget records are uniquely scoped by `user + category + month`.

### 4.7 Recurring Transaction Detection
- Recurring detection constants must live in a dedicated constants file.
- Definition of recurring transaction in MVP:
  - Same merchant
  - Same amount within ±10% tolerance
  - Appears in at least 2 different calendar months

**Acceptance Criteria**
- Amount tolerance is configured via constant (not inline hardcoded).
- Detection requires transactions in at least two distinct calendar months.

### 4.8 Anomaly Detection
- Use `simple-statistics` with **IQR-based outlier detection**.
- Method must be explicitly documented in README using the exact wording: `IQR-based outlier detection`.

**Acceptance Criteria**
- Anomaly logic uses IQR thresholds, not plain average comparison.
- README explicitly names the method as `IQR-based outlier detection`.

### 4.9 Forecast (Stateless in MVP)
- Provide a forecast view in MVP.
- Forecast is computed from existing transaction data at request time.
- No forecast snapshot persistence in MVP.

**Acceptance Criteria**
- Forecast is computed at request time from existing transaction data and is not persisted. Results may differ between sessions as new data is added.
- No `ForecastSnapshot` table is included in MVP schema.

## 5. Data Model Requirements (MVP)
Required logical entities in MVP schema:
- User
- Account (1:N with User)
- Transaction (N:1 with Account)
- Category
- Budget (user-level by category and month, across all accounts)
- UploadJob
- Alert (supports optional links to `transaction` and `budget` context)

Additional data model constraints:
- `Transaction.category` is nullable to allow post-import category assignment.
- `Category.isSystem` requires an API-layer guard to prevent user deletion of system categories.

Explicit exclusion from MVP schema:
- ForecastSnapshot

## 6. Post-MVP Backlog
- Asynchronous upload queue/workers
- `ForecastSnapshot` table and persisted forecast runs
- Forecast-vs-actual historical comparison UI
- Expanded multi-account UX (cross-account comparisons)

## 7. Implementation Order Constraint
1. Finalize and review this specification.
2. Implement Prisma schema from this specification.
3. Build application features against approved schema.

Schema must reflect the spec, not the other way around.
