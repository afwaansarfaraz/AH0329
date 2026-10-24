"""Deterministic data ingestion and artifact generation pipeline for WindDesk."""

import os
import sys
import json
import csv
import argparse
from pathlib import Path
from datetime import datetime

# Allow running as standalone script or module
if __name__ == "__main__" and __package__ is None:
    current_dir = Path(__file__).resolve().parent
    sys.path.insert(0, str(current_dir.parent.parent))

from backend.domain.config import (
    MAX_FORWARD_LEAD_HOURS,
    DECISION_WINDOW_START,
    DECISION_WINDOW_END,
    EVALUATION_DELIVERY_START,
    EVALUATION_DELIVERY_END,
    ARTIFACT_JSON_FILENAME,
    ARTIFACT_CSV_FILENAME,
)
from backend.domain.normalization import (
    normalize_windfor_dataset,
    normalize_fuelhh_dataset,
)
from backend.domain.actuals import aggregate_half_hourly_to_hourly

def run_ingestion(
    data_dir: Path | str = "DATA",
    output_dir: Path | str = "backend/data/artifacts",
    dry_run: bool = False
) -> dict:
    """Execute deterministic ingestion, validation, and artifact building."""
    data_path = Path(data_dir)
    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)
    
    report: dict = {
        "status": "FAILED",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "inputs": {},
        "records": {},
        "diagnostics": {}
    }
    
    # 1. Load WINDFOR source files
    wf_jan_file = data_path / "windfor_2026_01_all.json"
    if not wf_jan_file.exists():
        raise FileNotFoundError(f"Required WINDFOR file missing: {wf_jan_file}")
        
    with open(wf_jan_file, "r", encoding="utf-8") as f:
        wf_raw = json.load(f)
        
    report["inputs"]["windforJan"] = str(wf_jan_file)
    report["records"]["rawForecastsJan"] = len(wf_raw)
    
    # 2. Normalize WINDFOR
    wf_records, wf_diag = normalize_windfor_dataset(wf_raw)
    report["diagnostics"]["windforNormalization"] = wf_diag
    
    # Filter forward forecasts within 72h retention window (0 <= lead <= 72h)
    retained_forecasts = [
        f for f in wf_records
        if 0.0 <= f.leadHours <= MAX_FORWARD_LEAD_HOURS
    ]
    hindcast_count = sum(1 for f in wf_records if f.leadHours < 0.0)
    over_72h_count = sum(1 for f in wf_records if f.leadHours > MAX_FORWARD_LEAD_HOURS)
    
    # Sort deterministically
    retained_forecasts.sort(key=lambda r: (r.publishTime, r.startTime))
    report["records"]["retainedForecasts"] = len(retained_forecasts)
    report["diagnostics"]["hindcastsExcluded"] = hindcast_count
    report["diagnostics"]["over72hExcluded"] = over_72h_count
    
    # 3. Load FUELHH source files
    fuel_files = [
        data_path / "fuelhh_2026_01_all_periods.json",
        data_path / "fuelhh_2026_02_01.json",
        data_path / "fuelhh_2025_12_31.json"
    ]
    
    fuel_raw = []
    for fp in fuel_files:
        if fp.exists():
            with open(fp, "r", encoding="utf-8") as f:
                fuel_raw.extend(json.load(f))
            report["inputs"][fp.stem] = str(fp)
        else:
            print(f"Notice: Supplementary actuals file {fp} not found, proceeding without it.")
            
    report["records"]["rawFuelRecordsTotal"] = len(fuel_raw)
    
    # 4. Normalize FUELHH (strictly filters fuelType == "WIND")
    fuel_hh_records, fuel_diag = normalize_fuelhh_dataset(fuel_raw)
    report["records"]["windHalfHourlyActuals"] = len(fuel_hh_records)
    report["diagnostics"]["fuelNormalization"] = fuel_diag
    
    if len(fuel_hh_records) == 0:
        raise ValueError("Critical validation failure: No valid WIND actual records found.")
        
    # 5. Aggregate half-hourly actuals to hourly means
    hourly_actuals, actuals_diag = aggregate_half_hourly_to_hourly(fuel_hh_records)
    report["records"]["hourlyActuals"] = len(hourly_actuals)
    report["diagnostics"]["actualsAggregation"] = actuals_diag
    
    # Check evaluation window coverage: Jan 2 to Feb 1
    # Check if Feb 1 actuals are present
    has_feb1 = any(st.startswith("2026-02-01") for st in hourly_actuals.keys())
    report["diagnostics"]["hasFeb1Actuals"] = has_feb1
    
    # 6. Build final artifact payload
    artifact_payload = {
        "version": "1.0.0",
        "generatedAt": "2026-01-31T23:59:59Z",  # Deterministic timestamp
        "status": "production_ready",
        "decisionWindow": {
            "startDate": DECISION_WINDOW_START,
            "endDate": DECISION_WINDOW_END
        },
        "evaluationWindow": {
            "startDate": EVALUATION_DELIVERY_START,
            "endDate": EVALUATION_DELIVERY_END
        },
        "retentionWindowHours": MAX_FORWARD_LEAD_HOURS,
        "recordCounts": {
            "rawForecasts": len(wf_raw),
            "retainedForecasts": len(retained_forecasts),
            "rawActualRecords": len(fuel_raw),
            "windHalfHourlyActuals": len(fuel_hh_records),
            "hourlyActuals": len(hourly_actuals),
            "completeHours": actuals_diag["completeHours"],
            "incompleteHours": actuals_diag["incompleteHours"]
        },
        "coverage": {
            "forecastStartMin": min(f.startTime for f in retained_forecasts),
            "forecastStartMax": max(f.startTime for f in retained_forecasts),
            "publishTimeMin": min(f.publishTime for f in retained_forecasts),
            "publishTimeMax": max(f.publishTime for f in retained_forecasts),
            "actualStartMin": min(hourly_actuals.keys()),
            "actualStartMax": max(hourly_actuals.keys()),
            "hasFeb1DeliveryActuals": has_feb1
        },
        "actuals": {
            st: {
                "actualMW": act.actualMW,
                "periodCount": act.periodCount,
                "isComplete": act.isComplete
            }
            for st, act in sorted(hourly_actuals.items())
        },
        "halfHourlyActuals": [
            {
                "settlementDate": r.settlementDate,
                "settlementPeriod": r.settlementPeriod,
                "startTime": r.startTime,
                "publishTime": r.publishTime,
                "generation": r.generation,
                "fuelType": r.fuelType
            }
            for r in sorted(fuel_hh_records, key=lambda x: (x.settlementDate, x.settlementPeriod))
        ],
        "forecasts": [
            {
                "publishTime": f.publishTime,
                "startTime": f.startTime,
                "generation": f.generation,
                "leadHours": f.leadHours
            }
            for f in retained_forecasts
        ]
    }
    
    # 7. Write outputs atomically
    json_target = out_path / ARTIFACT_JSON_FILENAME
    csv_target = out_path / ARTIFACT_CSV_FILENAME
    
    if not dry_run:
        # Atomic write JSON
        tmp_json = out_path / f"{ARTIFACT_JSON_FILENAME}.tmp"
        with open(tmp_json, "w", encoding="utf-8") as f:
            json.dump(artifact_payload, f, indent=2)
        tmp_json.replace(json_target)
        
        # Atomic write CSV
        tmp_csv = out_path / f"{ARTIFACT_CSV_FILENAME}.tmp"
        with open(tmp_csv, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["publishTime", "startTime", "generation", "leadHours"])
            for f_rec in retained_forecasts:
                writer.writerow([f_rec.publishTime, f_rec.startTime, f_rec.generation, f_rec.leadHours])
        tmp_csv.replace(csv_target)
        
        report["outputJsonBytes"] = json_target.stat().st_size
        report["outputCsvBytes"] = csv_target.stat().st_size
        
    report["status"] = "SUCCESS"
    return report

def main():
    parser = argparse.ArgumentParser(description="Deterministic Elexon BMRS ingestion for WindDesk")
    parser.add_argument("--data-dir", default="DATA", help="Path to raw source files")
    parser.add_argument("--output-dir", default="backend/data/artifacts", help="Output artifact directory")
    parser.add_argument("--dry-run", action="store_true", help="Perform validation without writing outputs")
    args = parser.parse_args()
    
    print("=" * 60)
    print(" WindDesk — Ingestion Pipeline")
    print("=" * 60)
    try:
        report = run_ingestion(args.data_dir, args.output_dir, args.dry_run)
        print(f"Status: {report['status']}")
        print(f"Retained Forecasts: {report['records']['retainedForecasts']}")
        print(f"Hourly Actuals:     {report['records']['hourlyActuals']}")
        print(f"Feb 1 Actuals:      {report['diagnostics']['hasFeb1Actuals']}")
        if not args.dry_run:
            print(f"JSON Artifact:      {report.get('outputJsonBytes', 0) / 1024 / 1024:.2f} MB")
            print(f"CSV Artifact:       {report.get('outputCsvBytes', 0) / 1024:.1f} KB")
        print("Ingestion completed successfully.")
        sys.exit(0)
    except Exception as exc:
        print(f"CRITICAL INGESTION ERROR: {exc}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
