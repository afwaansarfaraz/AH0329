"""Timezone-safe timestamp parsing, normalization, and cutoff computation."""

from datetime import datetime, date, time, timedelta, timezone
from zoneinfo import ZoneInfo
from .config import TIMEZONE_LONDON, TIMEZONE_LONDON_NAME, DEFAULT_CUTOFF_TIME_STR

def parse_iso_utc(ts: str) -> datetime:
    """Parse an ISO-8601 timestamp string into a timezone-aware UTC datetime.
    
    Rejects naive timestamps or malformed strings.
    """
    if not isinstance(ts, str) or not ts.strip():
        raise ValueError(f"Invalid timestamp value: {ts!r}")
    
    clean_ts = ts.strip()
    # Normalize trailing Z to +00:00 for datetime.fromisoformat compatibility
    if clean_ts.endswith("Z"):
        clean_ts = clean_ts[:-1] + "+00:00"
        
    try:
        dt = datetime.fromisoformat(clean_ts)
    except Exception as exc:
        raise ValueError(f"Malformed ISO-8601 timestamp: {ts!r}") from exc
        
    if dt.tzinfo is None:
        raise ValueError(f"Naive datetime rejected; explicit timezone required: {ts!r}")
        
    return dt.astimezone(timezone.utc)

def to_iso_utc(dt: datetime) -> str:
    """Format a timezone-aware datetime to standard UTC ISO-8601 representation (YYYY-MM-DDTHH:MM:SSZ)."""
    if dt.tzinfo is None:
        raise ValueError(f"Cannot format naive datetime to ISO UTC: {dt!r}")
    utc_dt = dt.astimezone(timezone.utc)
    return utc_dt.strftime("%Y-%m-%dT%H:%M:%SZ")

def to_london(dt: datetime) -> datetime:
    """Convert a timezone-aware datetime into Europe/London timezone."""
    if dt.tzinfo is None:
        raise ValueError(f"Cannot convert naive datetime to Europe/London: {dt!r}")
    return dt.astimezone(TIMEZONE_LONDON)

def to_iso_london(dt: datetime) -> str:
    """Format a timezone-aware datetime into Europe/London ISO string."""
    london_dt = to_london(dt)
    return london_dt.isoformat()

def compute_decision_cutoff(
    delivery_date_str: str,
    cutoff_time_str: str = DEFAULT_CUTOFF_TIME_STR,
    tz_name: str = TIMEZONE_LONDON_NAME
) -> datetime:
    """Compute the decision cutoff timestamp in UTC for a target delivery date.
    
    By default, cutoff is set to Day D-1 at 09:20 Europe/London.
    Handles daylight saving transitions correctly via ZoneInfo.
    """
    try:
        deliv_date = date.fromisoformat(delivery_date_str)
    except Exception as exc:
        raise ValueError(f"Invalid delivery_date format, expected YYYY-MM-DD: {delivery_date_str!r}") from exc
        
    try:
        c_time = time.fromisoformat(cutoff_time_str)
    except Exception as exc:
        raise ValueError(f"Invalid cutoff_time format, expected HH:MM:SS: {cutoff_time_str!r}") from exc
        
    d_minus_1 = deliv_date - timedelta(days=1)
    tz = ZoneInfo(tz_name)
    london_dt = datetime.combine(d_minus_1, c_time, tzinfo=tz)
    return london_dt.astimezone(timezone.utc)

def settlement_period_to_start_time(settlement_date_str: str, settlement_period: int) -> str:
    """Compute the UTC startTime ISO string for a given settlementDate and settlementPeriod (1..48).
    
    Formula: startTime = settlementDate 00:00:00Z + (settlementPeriod - 1) * 30 min.
    """
    if not (1 <= settlement_period <= 50):
        raise ValueError(f"Settlement period must be between 1 and 50, got {settlement_period}")
    try:
        s_date = date.fromisoformat(settlement_date_str)
    except Exception as exc:
        raise ValueError(f"Invalid settlement_date format: {settlement_date_str!r}") from exc
        
    base_dt = datetime(s_date.year, s_date.month, s_date.day, 0, 0, 0, tzinfo=timezone.utc)
    start_dt = base_dt + timedelta(minutes=(settlement_period - 1) * 30)
    return to_iso_utc(start_dt)

def settlement_period_to_close_time(settlement_date_str: str, settlement_period: int) -> datetime:
    """Compute the UTC close timestamp (end of period) for a given settlement period."""
    start_iso = settlement_period_to_start_time(settlement_date_str, settlement_period)
    start_dt = parse_iso_utc(start_iso)
    return start_dt + timedelta(minutes=30)

def compute_lead_hours(publish_time_str: str, start_time_str: str) -> float:
    """Compute forecast lead time in hours: (startTime - publishTime)."""
    p_dt = parse_iso_utc(publish_time_str)
    s_dt = parse_iso_utc(start_time_str)
    return round((s_dt - p_dt).total_seconds() / 3600.0, 4)

def get_delivery_date(start_time_str: str) -> str:
    """Extract YYYY-MM-DD from an ISO UTC start_time string."""
    dt = parse_iso_utc(start_time_str)
    return dt.strftime("%Y-%m-%d")

def get_delivery_hour(start_time_str: str) -> int:
    """Extract integer hour 0..23 from an ISO UTC start_time string."""
    dt = parse_iso_utc(start_time_str)
    return dt.hour
