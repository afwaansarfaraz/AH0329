"""Configuration constants and path resolution for WindDesk."""

from pathlib import Path
from zoneinfo import ZoneInfo

# Timezone
TIMEZONE_LONDON_NAME = "Europe/London"
TIMEZONE_LONDON = ZoneInfo(TIMEZONE_LONDON_NAME)

# Decision and evaluation policies
# Prototype assumption: D-1 at 09:20 Europe/London
DEFAULT_CUTOFF_TIME_STR = "09:20:00"
CUTOFF_POLICY_DESCRIPTION = "D-1 09:20 Europe/London (prototype assumption)"

# Persistence baseline availability lag (minutes prior to cutoff)
PERSISTENCE_LAG_MINUTES = 60
PERSISTENCE_POLICY_DESCRIPTION = "Last settled half-hour available at (cutoff - 60 min)"

# Maximum retained forward lead time in hours
MAX_FORWARD_LEAD_HOURS = 72.0

# Supported decision window: decisions made January 1–31, 2026
DECISION_WINDOW_START = "2026-01-01"
DECISION_WINDOW_END = "2026-01-31"

# Supported delivery dates under default D-1 cutoff: Jan 2 – Feb 1, 2026
EVALUATION_DELIVERY_START = "2026-01-02"
EVALUATION_DELIVERY_END = "2026-02-01"

# Default horizon buckets (hours)
DEFAULT_HORIZON_BUCKETS = [
    (0, 12),
    (12, 24),
    (24, 36),
    (36, 48),
    (48, 72)
]

# Elexon BMRS API
ELEXON_API_BASE_URL = "https://data.elexon.co.uk/bmrs/api/v1"
ELEXON_REQUEST_TIMEOUT_SECONDS = 30
ELEXON_MAX_RETRIES = 3

# Artifact filenames
ARTIFACT_JSON_FILENAME = "wind_jan_decisions.json"
ARTIFACT_CSV_FILENAME = "wind_jan_decisions.csv"

def get_artifact_path(custom_path: Path | str | None = None) -> Path | None:
    """Resolve the path to the processed JSON artifact across development and deployed environments."""
    if custom_path:
        p = Path(custom_path)
        if p.exists():
            return p

    base_dir = Path(__file__).resolve().parent.parent
    candidates = [
        base_dir / "data" / "artifacts" / ARTIFACT_JSON_FILENAME,
        Path.cwd() / "backend" / "data" / "artifacts" / ARTIFACT_JSON_FILENAME,
        Path.cwd() / "data" / "artifacts" / ARTIFACT_JSON_FILENAME,
        Path.cwd() / ARTIFACT_JSON_FILENAME,
    ]
    for c in candidates:
        if c.exists():
            return c
    return None
