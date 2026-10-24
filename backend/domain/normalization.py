"""Validation and normalization of raw Elexon BMRS source records."""

from .schemas import ForecastRecord, HalfHourlyActual
from .timestamps import parse_iso_utc, compute_lead_hours, settlement_period_to_start_time

def normalize_windfor_record(raw: dict) -> tuple[ForecastRecord | None, str | None]:
    """Validate and normalize a raw WINDFOR record.
    
    Returns (record, None) on success or (None, error_code) on failure.
    """
    if not isinstance(raw, dict):
        return None, "INVALID_FORMAT"
        
    dataset = raw.get("dataset")
    if dataset != "WINDFOR":
        return None, "WRONG_DATASET"
        
    pub_time = raw.get("publishTime")
    start_time = raw.get("startTime")
    gen = raw.get("generation")
    
    if not pub_time or not isinstance(pub_time, str):
        return None, "MISSING_PUBLISH_TIME"
    if not start_time or not isinstance(start_time, str):
        return None, "MISSING_START_TIME"
    if gen is None or not isinstance(gen, (int, float)):
        return None, "INVALID_GENERATION"
    if gen < 0:
        return None, "NEGATIVE_GENERATION"
        
    try:
        parse_iso_utc(pub_time)
        parse_iso_utc(start_time)
    except ValueError:
        return None, "MALFORMED_TIMESTAMP"
        
    lead_hours = compute_lead_hours(pub_time, start_time)
    
    record = ForecastRecord(
        publishTime=pub_time,
        startTime=start_time,
        generation=float(gen),
        leadHours=lead_hours
    )
    return record, None

def normalize_fuelhh_record(raw: dict) -> tuple[HalfHourlyActual | None, str | None]:
    """Validate and normalize a raw FUELHH record.
    
    Filters for fuelType == 'WIND'.
    Returns (record, None) on success or (None, error_code) on failure.
    """
    if not isinstance(raw, dict):
        return None, "INVALID_FORMAT"
        
    dataset = raw.get("dataset")
    if dataset != "FUELHH":
        return None, "WRONG_DATASET"
        
    fuel_type = raw.get("fuelType")
    if fuel_type != "WIND":
        return None, "EXCLUDED_FUEL_TYPE"
        
    s_date = raw.get("settlementDate")
    s_period = raw.get("settlementPeriod")
    start_time = raw.get("startTime")
    pub_time = raw.get("publishTime")
    gen = raw.get("generation")
    
    if not s_date or not isinstance(s_date, str):
        return None, "MISSING_SETTLEMENT_DATE"
    if s_period is None or not isinstance(s_period, int) or not (1 <= s_period <= 50):
        return None, "INVALID_SETTLEMENT_PERIOD"
    if not start_time or not isinstance(start_time, str):
        return None, "MISSING_START_TIME"
    if not pub_time or not isinstance(pub_time, str):
        return None, "MISSING_PUBLISH_TIME"
    if gen is None or not isinstance(gen, (int, float)):
        return None, "INVALID_GENERATION"
    if gen < 0:
        return None, "NEGATIVE_GENERATION"
        
    try:
        expected_start = settlement_period_to_start_time(s_date, s_period)
        if start_time != expected_start:
            return None, "START_TIME_MISMATCH"
    except Exception:
        return None, "SETTLEMENT_MAPPING_ERROR"
        
    record = HalfHourlyActual(
        settlementDate=s_date,
        settlementPeriod=s_period,
        startTime=start_time,
        publishTime=pub_time,
        generation=float(gen),
        fuelType="WIND"
    )
    return record, None

def normalize_windfor_dataset(records: list[dict]) -> tuple[list[ForecastRecord], dict[str, int]]:
    """Normalize a batch of raw WINDFOR records with rejection diagnostic counts."""
    valid: list[ForecastRecord] = []
    diagnostics: dict[str, int] = {}
    for r in records:
        rec, err = normalize_windfor_record(r)
        if rec is not None:
            valid.append(rec)
        else:
            diagnostics[err] = diagnostics.get(err, 0) + 1
    return valid, diagnostics

def normalize_fuelhh_dataset(records: list[dict]) -> tuple[list[HalfHourlyActual], dict[str, int]]:
    """Normalize a batch of raw FUELHH records with rejection diagnostic counts."""
    valid: list[HalfHourlyActual] = []
    diagnostics: dict[str, int] = {}
    for r in records:
        rec, err = normalize_fuelhh_record(r)
        if rec is not None:
            valid.append(rec)
        else:
            diagnostics[err] = diagnostics.get(err, 0) + 1
    return valid, diagnostics
