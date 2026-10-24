"""Service layer coordinating domain operations and serving API queries."""

import json
from pathlib import Path
from datetime import datetime, date, timedelta
from .config import (
    get_artifact_path,
    DEFAULT_CUTOFF_TIME_STR,
    CUTOFF_POLICY_DESCRIPTION,
    EVALUATION_DELIVERY_START,
    EVALUATION_DELIVERY_END,
    PERSISTENCE_LAG_MINUTES,
    MAX_FORWARD_LEAD_HOURS,
    TIMEZONE_LONDON_NAME,
)
from .schemas import (
    ForecastRecord,
    HourlyActual,
    HalfHourlyActual,
    HealthResponse,
    DecisionResponse,
    VintageRecord,
    AccuracySummaryResponse,
    HorizonResponse,
    DistributionResponse,
    QualityResponse,
)
from .timestamps import (
    compute_decision_cutoff,
    to_iso_utc,
    to_iso_london,
)
from .forecast_selection import select_forecasts_for_delivery_date
from .actuals import select_persistence_actual
from .metrics import evaluate_paired_sample
from .distributions import calculate_error_distribution
from .horizons import calculate_horizon_metrics
from .quality import build_quality_report

class WindDeskService:
    """Core domain service for querying the WindDesk decision engine and analytics."""
    
    def __init__(self, artifact_path: Path | str | None = None):
        self.artifact_path = get_artifact_path(artifact_path)
        self.is_loaded = False
        self.version = "unknown"
        self.retention_hours = MAX_FORWARD_LEAD_HOURS
        self.forecasts: list[ForecastRecord] = []
        self.actuals_hourly: dict[str, HourlyActual] = {}
        self.actuals_half_hourly: list[HalfHourlyActual] = []
        self.metadata: dict = {}
        
        if self.artifact_path and self.artifact_path.exists():
            self.load_artifact(self.artifact_path)
            
    def load_artifact(self, path: Path | str) -> None:
        """Load and parse the processed JSON artifact into domain data structures."""
        p = Path(path)
        if not p.exists():
            raise FileNotFoundError(f"Artifact not found at {p}")
            
        with open(p, "r", encoding="utf-8") as f:
            data = json.load(f)
            
        self.version = data.get("version", "1.0.0")
        self.retention_hours = float(data.get("retentionWindowHours", MAX_FORWARD_LEAD_HOURS))
        self.metadata = data
        
        # Parse forecasts
        self.forecasts = [
            ForecastRecord(
                publishTime=r["publishTime"],
                startTime=r["startTime"],
                generation=float(r["generation"]),
                leadHours=float(r["leadHours"])
            )
            for r in data.get("forecasts", [])
        ]
        
        # Parse hourly actuals
        self.actuals_hourly = {}
        for st, act_data in data.get("actuals", {}).items():
            self.actuals_hourly[st] = HourlyActual(
                startTime=st,
                actualMW=float(act_data["actualMW"]),
                periodCount=int(act_data.get("periodCount", 2)),
                isComplete=bool(act_data.get("isComplete", True))
            )
            
        # Parse half-hourly actuals (for persistence selection)
        self.actuals_half_hourly = [
            HalfHourlyActual(
                settlementDate=r["settlementDate"],
                settlementPeriod=int(r["settlementPeriod"]),
                startTime=r["startTime"],
                publishTime=r.get("publishTime", r["startTime"]),
                generation=float(r["generation"]),
                fuelType=r.get("fuelType", "WIND")
            )
            for r in data.get("halfHourlyActuals", [])
        ]
        
        self.artifact_path = p
        self.is_loaded = True

    def get_health(self) -> HealthResponse:
        """Health check verifying live artifact load status and record counts."""
        if not self.is_loaded:
            return HealthResponse(
                status="degraded",
                service="WindDesk API",
                version="unknown",
                artifactLoaded=False,
                retentionWindowHours=self.retention_hours,
                recordCounts={"retainedForecasts": 0, "hourlyActuals": 0},
                coverage={}
            )
            
        return HealthResponse(
            status="healthy",
            service="WindDesk API",
            version=self.version,
            artifactLoaded=True,
            retentionWindowHours=self.retention_hours,
            recordCounts={
                "retainedForecasts": len(self.forecasts),
                "hourlyActuals": len(self.actuals_hourly),
                "totalRetainedRecords": len(self.forecasts) + len(self.actuals_hourly)
            },
            coverage=self.metadata.get("coverage", {})
        )

    def get_decision(self, delivery_date: str, cutoff_override: str | None = None) -> DecisionResponse:
        """Select latest eligible forecasts for deliveryDate before decision cutoff."""
        if not self.is_loaded:
            raise RuntimeError("Artifact is not loaded")
            
        cutoff_time_str = cutoff_override or DEFAULT_CUTOFF_TIME_STR
        cutoff_dt = compute_decision_cutoff(delivery_date, cutoff_time_str)
        cutoff_utc_str = to_iso_utc(cutoff_dt)
        cutoff_london_str = to_iso_london(cutoff_dt)
        
        intervals, summary, diag = select_forecasts_for_delivery_date(
            forecasts=self.forecasts,
            delivery_date_str=delivery_date,
            cutoff_dt=cutoff_dt,
            actuals_hourly=self.actuals_hourly
        )
        
        policy_desc = f"D-1 {cutoff_time_str} Europe/London"
        if not cutoff_override:
            policy_desc += " (default prototype assumption)"
            
        return DecisionResponse(
            deliveryDate=delivery_date,
            cutoffUtc=cutoff_utc_str,
            cutoffLondon=cutoff_london_str,
            cutoffPolicy=policy_desc,
            intervals=intervals,
            summary=summary,
            coverage=diag
        )

    def get_vintages(
        self,
        delivery_date: str | None = None,
        delivery_interval: str | None = None,
        publish_date: str | None = None,
        limit: int = 100
    ) -> list[VintageRecord]:
        """Query retained forecast vintages with deterministic filtering and pagination limit."""
        if not self.is_loaded:
            raise RuntimeError("Artifact is not loaded")
            
        results: list[VintageRecord] = []
        for f in self.forecasts:
            if delivery_date and not f.startTime.startswith(delivery_date):
                continue
            if delivery_interval and f.startTime != delivery_interval:
                continue
            if publish_date and not f.publishTime.startswith(publish_date):
                continue
            results.append(VintageRecord(
                publishTime=f.publishTime,
                startTime=f.startTime,
                generation=f.generation,
                leadHours=f.leadHours
            ))
            if len(results) >= max(1, min(limit, 500)):
                break
                
        # Deterministic sort by publishTime then startTime
        results.sort(key=lambda r: (r.publishTime, r.startTime))
        return results

    def _get_decision_cutoff_sample(
        self,
        start_date: str = EVALUATION_DELIVERY_START,
        end_date: str = EVALUATION_DELIVERY_END,
        cutoff_time_str: str = DEFAULT_CUTOFF_TIME_STR
    ) -> tuple[list[float], list[float], list[float]]:
        """Extract paired sample (forecast, actual, persistence_actual) across evaluation delivery dates."""
        s_d = date.fromisoformat(start_date)
        e_d = date.fromisoformat(end_date)
        
        forecast_list: list[float] = []
        actual_list: list[float] = []
        persistence_list: list[float] = []
        
        curr = s_d
        while curr <= e_d:
            deliv_str = curr.isoformat()
            cutoff_dt = compute_decision_cutoff(deliv_str, cutoff_time_str)
            
            # Select model forecasts
            intervals, _, _ = select_forecasts_for_delivery_date(
                forecasts=self.forecasts,
                delivery_date_str=deliv_str,
                cutoff_dt=cutoff_dt,
                actuals_hourly=self.actuals_hourly
            )
            
            # Select persistence actual
            pers_rec = select_persistence_actual(
                actuals=self.actuals_half_hourly,
                cutoff_dt=cutoff_dt,
                lag_minutes=PERSISTENCE_LAG_MINUTES
            )
            pers_mw = pers_rec.generation if pers_rec else None
            
            for item in intervals:
                if item.forecastMW is not None and item.actualMW is not None:
                    # If persistence baseline cannot be formed, omit or include if present
                    if pers_mw is not None:
                        forecast_list.append(item.forecastMW)
                        actual_list.append(item.actualMW)
                        persistence_list.append(pers_mw)
                        
            curr += timedelta(days=1)
            
        return forecast_list, actual_list, persistence_list

    def get_accuracy_summary(
        self,
        start_date: str | None = None,
        end_date: str | None = None,
        cutoff_time_str: str | None = None
    ) -> AccuracySummaryResponse:
        """Headline accuracy summary computed exclusively on the decision-cutoff evaluation sample."""
        if not self.is_loaded:
            raise RuntimeError("Artifact is not loaded")
            
        s_date = start_date or EVALUATION_DELIVERY_START
        e_date = end_date or EVALUATION_DELIVERY_END
        c_time = cutoff_time_str or DEFAULT_CUTOFF_TIME_STR
        
        f_vals, a_vals, p_vals = self._get_decision_cutoff_sample(s_date, e_date, c_time)
        metrics = evaluate_paired_sample(f_vals, a_vals, p_vals)
        
        return AccuracySummaryResponse(
            evaluationWindow={"startDate": s_date, "endDate": e_date},
            cutoffPolicy=f"D-1 {c_time} Europe/London (decision-cutoff sample only)",
            sampleCount=metrics["sampleCount"],
            mae=metrics["mae"],
            rmse=metrics["rmse"],
            bias=metrics["bias"],
            wape=metrics["wape"],
            naivePersistenceMae=metrics["naivePersistenceMae"],
            persistenceSkill=metrics["persistenceSkill"],
            coverage={
                "evaluatedDeliveryDays": (date.fromisoformat(e_date) - date.fromisoformat(s_date)).days + 1,
                "pairedHours": metrics["sampleCount"],
                "missingActualHours": max(0, ((date.fromisoformat(e_date) - date.fromisoformat(s_date)).days + 1) * 24 - metrics["sampleCount"])
            }
        )

    def get_accuracy_horizon(self, buckets: list[tuple[float, float]] | None = None) -> HorizonResponse:
        """Accuracy metrics segmented by lead-time buckets using all valid retained vintages."""
        if not self.is_loaded:
            raise RuntimeError("Artifact is not loaded")
            
        metrics_list = calculate_horizon_metrics(
            forecasts=self.forecasts,
            actuals_hourly=self.actuals_hourly,
            buckets=buckets
        )
        
        return HorizonResponse(
            sampleDescription="All valid retained forecast vintages with 0h <= leadTime <= 72h matched against hourly mean actuals.",
            retentionWindowHours=self.retention_hours,
            buckets=metrics_list
        )

    def get_accuracy_distribution(
        self,
        start_date: str | None = None,
        end_date: str | None = None,
        cutoff_time_str: str | None = None
    ) -> DistributionResponse:
        """Historical empirical signed-error distribution (P5, P50, P95) on the decision-cutoff sample."""
        if not self.is_loaded:
            raise RuntimeError("Artifact is not loaded")
            
        s_date = start_date or EVALUATION_DELIVERY_START
        e_date = end_date or EVALUATION_DELIVERY_END
        c_time = cutoff_time_str or DEFAULT_CUTOFF_TIME_STR
        
        f_vals, a_vals, _ = self._get_decision_cutoff_sample(s_date, e_date, c_time)
        errors = [round(f - a, 2) for f, a in zip(f_vals, a_vals)]
        dist = calculate_error_distribution(errors)
        
        return DistributionResponse(
            sampleDescription="Empirical historical signed error percentiles (forecast - actual) on the decision-cutoff sample.",
            errorConvention="signed_error = forecast - actual (positive = overforecasting)",
            sampleCount=dist["sampleCount"],
            p5=dist["p5"],
            p50=dist["p50"],
            p95=dist["p95"],
            min=dist["min"],
            max=dist["max"],
            mean=dist["mean"],
            evaluationWindow={"startDate": s_date, "endDate": e_date},
            cutoffPolicy=f"D-1 {c_time} Europe/London"
        )

    def get_quality(self) -> QualityResponse:
        """Comprehensive data quality diagnostics and coverage disclosures."""
        if not self.is_loaded:
            raise RuntimeError("Artifact is not loaded")
            
        f_vals, a_vals, _ = self._get_decision_cutoff_sample()
        return build_quality_report(
            forecasts=self.forecasts,
            actuals_hourly=self.actuals_hourly,
            ingestion_metadata=self.metadata,
            evaluation_sample_count=len(f_vals)
        )
