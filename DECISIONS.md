# WindDesk — Architectural & Technical Decisions Log
**Document Version:** 2.0  
**Phase:** Phase 2 Modular Backend Implementation  
**Status:** Implemented, Tested & Validated  
**Date:** 2026-10-24  

---

## 1. Context & Scope

WindDesk is a decision-support platform for day-ahead wind power procurement. The core task is linking forecast vintages available at decision time to realised generation outturn for **decisions made during January 2026** (January 1–31, 2026).

---

## 2. Verified Data Semantics & Source Inspection

### A. WINDFOR (Wind Generation Forecast)
* **Inspected Datasets:** [`DATA/windfor_2026_01_all.json`](DATA/windfor_2026_01_all.json) (exploratory temporary stream dumps were audited and removed).
* **Schema:** `['dataset', 'generation', 'publishTime', 'startTime']`.
* **Publication Cadence:** 8 scheduled publication runs per day at UTC times:
  * `02:30:00`, `04:30:00`, `07:30:00`, `09:30:00`, `11:30:00` (one run at `12:25:00` on Jan 26 due to operator delay), `15:30:00`, `18:30:00`, `22:30:00`.
  * Total January 2026 publication runs: **248 runs**.
* **Timestamp Resolution:** Strictly **hourly** (`:00:00Z`). There are 0 half-hourly `:30:00Z` intervals.
* **Forecast Horizon per Run:** Exactly **73 hourly steps** per publication run.
* **Lead Time Semantics:**
  * Lead time defined as $\Delta t = \text{startTime} - \text{publishTime}$.
  * Observed range: $-25.5\,\text{h}$ to $+66.5\,\text{h}$.
  * Each publication run includes retrospective hindcast records for the preceding ~24 hours ($\text{startTime} < \text{publishTime}$), totaling 3,721 records in January.
  * Maximum forward lookahead is $+66.5\,\text{h}$.

### B. FUELHH (Generation Outturn by Fuel Type)
* **Inspected Datasets:** [`DATA/fuelhh_2026_01_all_periods.json`](DATA/fuelhh_2026_01_all_periods.json), [`DATA/fuelhh_2026_02_01.json`](DATA/fuelhh_2026_02_01.json), [`DATA/fuelhh_2025_12_31.json`](DATA/fuelhh_2025_12_31.json).
* **Schema:** `['dataset', 'fuelType', 'generation', 'publishTime', 'settlementDate', 'settlementPeriod', 'startTime']`.
* **Fuel Type Filtering:** Strictly filter `fuelType == "WIND"`. All other 19 fuel types (`CCGT`, `NUCLEAR`, etc.) are discarded in processed wind artifacts.
* **Settlement Period Mapping:**
  * Half-hourly periods from `1` to `48`.
  * Formula verified: $\text{startTime} = \text{settlementDate } 00:00:00\text{Z} + (\text{settlementPeriod} - 1) \times 30\,\text{minutes}$.
  * Result: **0 mismatches** across all records.
* **Units & Semantics:**
  * Elexon FUELHH `generation` represents **average active power in MW** over the 30-minute settlement period.
  * Range for WIND in Jan 2026: 1,695 MW to 17,805 MW (mean: 11,580.7 MW).
* **Publication Lag:**
  * `publishTime` matches period close ($\text{startTime} + 30\,\text{min}$) for 99.7% of records (0-minute lag relative to period close).

---

## 3. Timestamp Alignment Decision: T vs T+30 vs Hourly Mean

### Verification Experiment Findings
Using the decision-cutoff evaluation sample (Jan 2 to Jan 31, $N = 720$ paired delivery hours, cutoff at D-1 09:20 UTC):

| Alignment Method | Methodology | MAE (MW) | RMSE (MW) | Bias (MW) | WAPE (%) | Sample Size ($N$) |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Method A: Hourly Mean (Recommended)** | $\text{mean}(\text{Actual}_T, \text{Actual}_{T+30\text{m}})$ vs $\text{Forecast}_T$ | **2,073.27** | **2,538.69** | **+1,773.38** | **18.10%** | **720** |
| **Method B: First Half-Hour Only** | $\text{Actual}_T$ (Period $2H-1$) vs $\text{Forecast}_T$ | 2,057.62 | 2,531.66 | +1,772.47 | 17.96% | 720 |
| **Method C: Second Half-Hour Only** | $\text{Actual}_{T+30\text{m}}$ (Period $2H$) vs $\text{Forecast}_T$ | 2,095.22 | 2,554.33 | +1,774.29 | 18.29% | 720 |
| **Method D: Dual Observation (Flawed)** | Duplicate $\text{Forecast}_T$ to both periods | 2,076.42 | 2,543.02 | +1,773.38 | 18.10% | 1,440 (artificial) |

### Decision:
* **Adopt Method A (Hourly Mean Aggregation).**
* **Rationale:**
  1. WINDFOR specifies expected generation over the entire 60-minute interval $[T, T+60\text{m})$.
  2. FUELHH reports average generation (MW) over $[T, T+30\text{m})$ and $[T+30\text{m}, T+60\text{m})$.
  3. Total energy over the hour is $0.5 \times \text{MW}_T + 0.5 \times \text{MW}_{T+30\text{m}} = \text{mean}(\text{MW}_T, \text{MW}_{T+30\text{m}}) \times 1\,\text{hour}$.
  4. Method B produces a lower MAE purely by coincidence of intra-hour wind trends, but comparing a 1-hour forecast against only the first 30 minutes ignores half the delivered energy.
  5. Method D violates statistical independence by duplicating 1-hour forecasts into two identical data points.

---

## 4. Date Coverage & February 1 Delivery Requirement

### Verified Facts & Decisions:
1. **Decision Window:** January 1 through January 31, 2026.
2. **Decision on January 31:** Under D-1 09:20 cutoff, the decision on Jan 31 procures for delivery on **February 1, 2026** (Periods 1–48).
3. **Forecast Availability:** Jan 31 publication runs cover all 24 delivery hours of February 1.
4. **Actuals Availability:** Added [`fuelhh_2026_02_01.json`](DATA/fuelhh_2026_02_01.json) (960 records, 48 WIND records) and [`fuelhh_2025_12_31.json`](DATA/fuelhh_2025_12_31.json) (960 records, 48 WIND records) without altering original source files.
5. **Decision:** The evaluation window spans **31 delivery days** (January 2 through February 1, 2026), producing exactly **744 paired evaluation hours** ($31 \times 24 = 744$).

---

## 5. Artifact Retention & Sizing Strategy

### Verified Metrics:
* **Raw Forecasts in Jan 2026:** 18,104 records (2.08 MB).
* **72-Hour Lead-Time Window Filter:** $0 \le (\text{startTime} - \text{publishTime}) \le 72\,\text{hours}$.
  * Discards 3,721 negative-lead hindcasts.
  * Retains **14,383 forward forecasts** (79.4% of total).
  * Covers 100% of the Day-Ahead procurement horizon (~14.5h to ~39.5h lead time) and horizon views up to 66.5h.
* **Processed Artifact Sizes:**
  * `wind_jan_decisions.json`: **2.63 MB** (14,383 retained forecasts + 792 hourly actuals + half-hourly persistence actuals + metadata).
  * `wind_jan_decisions.csv`: **779.7 KB** (14,383 rows).
* **Runtime Performance:** Plain Python in-memory querying executes in **~11 ms**.

---

## 6. Vercel Deployment Spike Findings

### Architecture Tested:
* **Entrypoint:** `api/index.py` delegating to `backend/main.py:app` (FastAPI).
* **Bundling Configuration (`vercel.json`):** Explicit `functions.api/index.py.includeFiles: "backend/data/artifacts/**"`.
* **Local TestClient Execution:** All 7 endpoints verified functional, reading the artifact with zero path disclosure.
* **Cloud Status:** Deployment is configured and ready for manual execution once the user deploys with their credentials (`VERCEL_TOKEN`).

---

## 7. Phase 2 Implementation Decisions & Results

### A. Full Evaluation Sample (Jan 2 – Feb 1, 2026, N = 744 hours)
With February 1 actuals included, the full 31-day January decision window was evaluated at D-1 09:20 Europe/London:
* **Valid Paired Sample Count ($N$):** **744 hours** (100% coverage, 0 missing hours).
* **MAE:** **2,038.91 MW**
* **RMSE:** **2,504.76 MW**
* **Bias:** **+1,747.89 MW** (systematic overforecasting tendency).
* **WAPE:** **18.07%**
* **Naive Persistence MAE:** **4,229.67 MW**
* **Persistence Skill:** **+0.518** (51.8% improvement over naive persistence).

### B. Empirical Signed-Error Distribution (forecast - actual)
* **Sample Count ($N$):** **744 hours**
* **P5 (5th percentile):** **-1,151.42 MW** (underforecast extreme)
* **P50 (Median):** **+1,592.00 MW** (median overforecast)
* **P95 (95th percentile):** **+5,283.35 MW** (overforecast extreme)
* **Minimum Error:** **-3,550.00 MW**
* **Maximum Error:** **+6,870.00 MW**

### C. Horizon Error Analysis (Retained Vintages <= 72h Lead)
| Bucket | Min Lead (h) | Max Lead (h) | Sample ($N$) | MAE (MW) | RMSE (MW) | Bias (MW) | WAPE (%) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **0-12h** | 0.0 | 12.0 | 1,847 | 1,368.51 | 1,777.62 | +612.35 | 12.01% |
| **12-24h** | 12.0 | 24.0 | 2,827 | 1,732.19 | 2,216.48 | +1,114.72 | 15.08% |
| **24-36h** | 24.0 | 36.0 | 2,842 | 2,122.37 | 2,669.81 | +1,659.84 | 18.23% |
| **36-48h** | 36.0 | 48.0 | 2,843 | 2,476.32 | 3,099.16 | +2,045.24 | 21.01% |
| **48-72h** | 48.0 | 72.0 | 3,968 | 2,828.66 | 3,501.99 | +2,398.24 | 23.63% |

*Notice the monotonic increase in MAE and RMSE from 1,368 MW at <12h lead time up to 2,828 MW at 48-72h lead time, exactly matching physical expectations of forecast degradation.*

### D. Architectural Modularity & Test Coverage
* Complete separation of concerns: `config`, `timestamps`, `schemas`, `normalization`, `actuals`, `forecast_selection`, `metrics`, `distributions`, `horizons`, `quality`, and `service`.
* 52 comprehensive unit and integration tests passing offline with zero external network dependencies.

---

## 8. Phase 3 Frontend, Motion Design & Deployment Architecture

### A. Technology Selection & Rationale
* **React 18 + TypeScript + Vite:** Chosen for fast HMR, strong typing of API contracts, and optimal bundle size.
* **Apache ECharts (Canvas Renderer):** Selected for high-performance rendering of 24-hour time series, multi-run vintage trajectories, and empirical histograms without DOM bloat.
* **Direct ECharts Lifecycle Wrapper (`EChartsWrapper.tsx`):** Implemented using `ResizeObserver` and explicit `chart.dispose()` on unmount, completely eliminating memory leaks.
* **Lucide Icons:** Selected for clean, consistent, engineering-grade icons across the UI.

### B. Visual Design System: Midnight Energy Intelligence
* **Palette Tokens:**
  * Canvas: `#101C32` | Surface Deep: `#0B1425` | Elevated Card: `#172640` | Secondary Panel: `#1C304A`
  * Borders: `#2A3D56` | Border Hover: `#3E5879`
  * Text Primary: `#F1F5FA` | Text Secondary: `#9CAEC3` | Text Muted: `#647B96`
  * Forecast Accent (Teal): `#26D9C4` | Realized Actual (Blue): `#38BDF8`
  * Secondary Accent (Lime): `#B7F36B` | Warning (Amber): `#F59E0B` | Error: `#EF4444`
* **Motion Design Principles:**
  * 150–250ms cubic-bezier easing for smooth card elevation and tab transitions.
  * Staggered entrance fade-in animations on route navigation.
  * ECharts data transition animations (300–400ms duration).
  * Strict `prefers-reduced-motion` compliance to respect accessibility preferences.

### C. Containerization & Production Build
* **Docker Multi-Stage Setup:**
  * `Dockerfile.backend`: Python 3.11-slim with health check on `/api/health`, served on port `8008`.
  * `Dockerfile.frontend`: Node 20 builder with multi-stage Nginx alpine runner, reverse-proxying `/api/` to backend, served on port `3008`.
  * `docker-compose.yml`: Root orchestration with health check synchronization and custom non-conflicting host ports (`8008` and `3008`).
* **Vercel Cloud Configuration:**
  * `vercel.json` updated with `buildCommand: npm run build`, `outputDirectory: dist`, and Python serverless function mapping for `/api/(.*)`.
  * Cloud deployment is fully configured; live deployment execution awaits authenticated deployment credentials (`VERCEL_TOKEN`).

---

## 9. Phase 3 Final Polish, Data Integrity & Quality Audit

### A. Elimination of Hardcoded Placeholders & Synthetic Data
1. **Data Completeness Calculation (`DataQualityRing.tsx`):**
   * Removed hardcoded `98.6%` placeholder. Completeness is now computed dynamically: $\frac{\text{retainedActualHours}}{\text{retainedActualHours} + \text{missingActualHours}} \times 100\% = 100.0\%$.
   * Settlement period counts, forecast record counts, and sample size are bound directly to the live `/api/quality` response.
2. **Sparkline Deletion on KPI Cards (`DecisionOverviewPage.tsx`):**
   * Removed hardcoded synthetic sparkline arrays (`[2400, 2200, ...]` and `[0.3, 0.4, ...]`). As the backend returns scalar evaluation summaries, rendering fabricated time-series sparklines breached data integrity standards.
3. **Dynamic Error Histogram (`ErrorDistributionChart.tsx`):**
   * Completely eliminated synthetic fallback histogram bins (`[{ label: '< -1000', count: 4 }, ...]`).
   * When no evaluation intervals are present, an honest empty-state title is displayed without fake bars.
4. **Dynamic Contextual Callouts:**
   * Dynamic bias amounts and persistence skill percentages in `DecisionOverviewPage`, `ForecastAccuracyPage`, and `ErrorDistributionPage`.

### B. Strict Missing-Value Policy
* All formatting utilities in `src/api/client.ts` (`formatMW`, `formatSignedMW`, `formatWape`, `formatSkill`, `formatDateOnly`, `formatDateTime`) enforce `Number.isFinite(val)` validation.
* Zero (`0`) is correctly preserved as a legitimate measured power or error value (`0 MW`, `+0 MW`, `0.0%`), never silently converted to fallback.
* Missing, `null`, `undefined`, `NaN`, or `Infinity` values return explicit fallback strings (`"Not available"`, `"Insufficient data"`, or `"—"`).
* In charts, missing interval values return `null` rather than `0` to prevent misleading zero-watt dips.

### C. Cross-Platform Build & Dependency Reliability
* Added `@rollup/rollup-linux-x64-gnu` and `@rollup/rollup-linux-x64-musl` to `optionalDependencies` in `package.json`, resolving native binary installation issues when building in Linux Docker containers and CI/Vercel environments from Windows lockfiles.

---

## 10. Windows WinError 10013 Diagnosis, Port Resolution & Port 8008 Standardization

### A. Root Cause Analysis: Windows `WinError 10013`
* **Mechanism:** On Windows systems with Hyper-V, WSL2, Docker Desktop, or Windows NAT (WinNAT) active, the Host Network Service reserves dynamic port exclusion ranges (`netsh interface ipv4 show excludedportrange protocol=tcp`).
* **Observed Exclusions:** The user's machine had administered and dynamic exclusions in ranges `50000-50059`, `50131`, `50203-50302`, `55623-55722`, etc. Attempting to bind any non-elevated user process to these ports triggers `PermissionError: [WinError 10013] An attempt was made to access a socket in a way forbidden by its access permissions` (WSAEACCES).
* **Port 8000 Conflict:** Port `8000` was concurrently occupied on the host by PID 31664 (`sherlog-api` / Docker), causing `[WinError 10048] Only one usage of each socket address is normally permitted`.

### B. Root Cause Analysis: Frontend `Internal Server Error` & `API Offline`
* **Vite Dev Proxy Target:** `vite.config.ts` was configured with:
  ```ts
  proxy: { '/api': { target: 'http://127.0.0.1:8008', changeOrigin: true } }
  ```
* **Failure Chain:** When the backend was started on port `50000` (or failed on excluded ports), nothing was listening on `127.0.0.1:8008`. When the frontend at `http://localhost:5174` made requests to `/api/health`, `/api/decision`, etc., Vite received `ECONNREFUSED` from `127.0.0.1:8008` and returned HTTP 500 `Internal Server Error` for all API calls.
* **UI Symptoms:** Header displayed `API Offline`, Overview displayed `Internal Server Error`, and all KPI cards, tables, and distribution charts fell back to empty/loading states.

### C. Standardized Solution
1. **Designated Port 8008:** Port `8008` is verified free, outside all Windows TCP exclusion ranges, binds cleanly without permission errors, and matches both `docker-compose.yml` (`8008:8000`) and `vite.config.ts`.
2. **Alignment Across Documentation:** Updated `README.md` commands and PowerShell curl examples to specify port `8008` consistently (`python -m uvicorn backend.main:app --reload --port 8008`).
3. **Verified Health & Endpoints:** All 7 endpoints (`/api/health`, `/api/decision`, `/api/vintages`, `/api/accuracy/summary`, `/api/accuracy/horizon`, `/api/accuracy/distribution`, `/api/quality`) return HTTP 200 with 744 verified paired hourly evaluation intervals and 100% data completeness.



