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
* **Inspected Datasets:** [`DATA/windfor_2026_01_all.json`](file:///c:/Users/afwaa/OneDrive/Desktop/WIND/DATA/windfor_2026_01_all.json), [`DATA/response_1792855931170.json`](file:///c:/Users/afwaa/OneDrive/Desktop/WIND/DATA/response_1792855931170.json), [`DATA/response_1792855092960.json`](file:///c:/Users/afwaa/OneDrive/Desktop/WIND/DATA/response_1792855092960.json).
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
* **Inspected Datasets:** [`DATA/fuelhh_2026_01_all_periods.json`](file:///c:/Users/afwaa/OneDrive/Desktop/WIND/DATA/fuelhh_2026_01_all_periods.json), [`DATA/fuelhh_2026_02_01.json`](file:///c:/Users/afwaa/OneDrive/Desktop/WIND/DATA/fuelhh_2026_02_01.json), [`DATA/fuelhh_2025_12_31.json`](file:///c:/Users/afwaa/OneDrive/Desktop/WIND/DATA/fuelhh_2025_12_31.json).
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
4. **Actuals Availability:** Added [`fuelhh_2026_02_01.json`](file:///c:/Users/afwaa/OneDrive/Desktop/WIND/DATA/fuelhh_2026_02_01.json) (960 records, 48 WIND records) and [`fuelhh_2025_12_31.json`](file:///c:/Users/afwaa/OneDrive/Desktop/WIND/DATA/fuelhh_2025_12_31.json) (960 records, 48 WIND records) without altering original source files.
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
* **Cloud Status:** Blocked on interactive credential requirement (requires `VERCEL_TOKEN` or `vercel login`). The backend architecture is fully verified and ready to deploy once credentials are provided in Phase 3.

---

## 7. Phase 2 Implementation Decisions & Results

### A. Full Evaluation Sample (Jan 2 – Feb 1, 2026, N = 744 hours)
With February 1 actuals included, the full 31-day January decision window was evaluated at D-1 09:20 Europe/London:
* **Valid Paired Sample Count ($N$):** **744 hours** (100% coverage, 0 missing hours).
* **MAE:** **2,038.91 MW**
* **RMSE:** **2,525.02 MW**
* **Bias:** **+1,729.07 MW** (systematic overforecasting tendency).
* **WAPE:** **17.65%**
* **Naive Persistence MAE:** **4,228.69 MW**
* **Persistence Skill:** **+0.518** (51.8% improvement over naive persistence).

### B. Empirical Signed-Error Distribution (forecast - actual)
* **Sample Count ($N$):** **744 hours**
* **P5 (5th percentile):** **-1,151.42 MW** (underforecast extreme)
* **P50 (Median):** **+1,592.00 MW** (median overforecast)
* **P95 (95th percentile):** **+5,283.35 MW** (overforecast extreme)
* **Minimum Error:** **-3,467.50 MW**
* **Maximum Error:** **+7,472.00 MW**

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
