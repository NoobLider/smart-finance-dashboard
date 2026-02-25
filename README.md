# Smart Finance Dashboard

Smart Finance Dashboard is a personal finance project focused on transaction import, budgeting, and explainable detection signals.

## Detection

### Anomaly detection
- Method: **IQR-based outlier detection** (Tukey fences, `1.5 * IQR`).
- Implementation: @lib/anomalyDetection.ts
- Behavior:
  - Computes Q1, Q3, IQR, and lower/upper bounds.
  - Flags transactions outside the computed bounds as anomalies.
  - Skips anomaly evaluation when sample size is below the configured minimum.

### Recurring transaction detection
- Method: merchant + amount tolerance clustering, then distinct month validation.
- Implementation: @lib/recurringDetection.ts
- Behavior:
  - Groups by normalized merchant name.
  - Matches transactions by configured amount tolerance.
  - Marks a pattern as recurring only when it appears across at least the configured number of distinct calendar months.

### Configuration
All detection settings are centralized in one source of truth:
- @lib/constants/detection.ts

Current constants:
- `RECURRING_AMOUNT_TOLERANCE = 0.10`
- `RECURRING_MIN_DISTINCT_MONTHS = 2`
- `ANOMALY_MIN_SAMPLE_SIZE = 4`
- `ANOMALY_METHOD = "IQR"`

### Unit tests
Detection logic is unit tested with Vitest:
- Test file: @lib/detection.test.ts
- Covered scenarios:
  - IQR skips on insufficient sample size.
  - IQR detects a clear high outlier.
  - Recurring detection identifies multi-month recurring patterns.
  - Recurring detection returns no result when matching transactions occur only in one calendar month.

## How to run

### Option A (recommended): Docker Compose

1. **Prerequisites**
   - Docker
   - Docker Compose

2. **Set environment variables**
   ```bash
   cp .env.example .env
   ```

3. **Start full stack (Postgres + app)**
   ```bash
   docker compose up --build
   ```

4. **Run tests (in another terminal, optional)**
   ```bash
   npm test
   ```

5. **Run Prisma Studio (optional, for demos)**
   ```bash
   npm run db:studio
   ```

`docker compose up --build` runs migrations automatically on startup and seeds demo data only when the demo user does not already exist.

### Option B: Manual local setup

1. **Prerequisites**
   - Node.js `>= 20`
   - PostgreSQL running locally

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set environment variables**
   ```bash
   cp .env.example .env
   ```
   Then set `DATABASE_URL` in `.env` to the local variant shown in `.env.example` (`localhost` host).

4. **Run migration**
   ```bash
   npm run db:migrate
   ```

5. **Run seed**
   ```bash
   npm run db:seed
   ```

6. **Start app**
   ```bash
   npm run dev
   ```

7. **Run tests**
   ```bash
   npm test
   ```

8. **Run Prisma Studio (optional)**
   ```bash
   npm run db:studio
   ```
