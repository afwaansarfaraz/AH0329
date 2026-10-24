"""FastAPI dependency injection for domain services."""

from functools import lru_cache
from ..domain.service import WindDeskService

@lru_cache()
def get_service() -> WindDeskService:
    """Return the cached singleton WindDeskService instance."""
    return WindDeskService()
