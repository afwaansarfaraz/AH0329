"""Main FastAPI application entrypoint for WindDesk."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api.routes import router

app = FastAPI(
    title="WindDesk API",
    description="Day-ahead wind procurement decision support and forecast accuracy analytics",
    version="1.0.0"
)

# Explicit CORS configuration for local development and production frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all /api routes
app.include_router(router)

@app.get("/", tags=["Root"])
def root():
    """Root welcoming endpoint with health check discovery."""
    return {
        "service": "WindDesk API",
        "version": "1.0.0",
        "health": "/api/health",
        "docs": "/docs"
    }
