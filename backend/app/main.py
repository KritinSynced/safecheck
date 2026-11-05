import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import init_db
from app.routes.moderation import router as moderation_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("safecheck")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite database schema
    logger.info("Initializing SafeCheck database schema...")
    init_db()
    logger.info("SafeCheck database initialized successfully.")
    yield
    logger.info("SafeCheck API shutting down.")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="SafeCheck — Minimal Automated Content Moderation Dashboard API",
    lifespan=lifespan
)

# CORS Middleware setup
# Allows local Next.js frontend (http://localhost:3000) and Vercel production domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permits local dev and preview deployments easily
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(moderation_router)


@app.get("/health", tags=["system"])
def health_check():
    """
    Health check endpoint for Render, uptime monitors, and frontend status checks.
    """
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "aws_configured": bool(settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY and settings.AWS_S3_BUCKET),
        "mock_mode": settings.MOCK_AWS or not bool(settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY and settings.AWS_S3_BUCKET)
    }


@app.get("/", tags=["system"])
def root():
    return {
        "message": "SafeCheck Content Moderation API is running.",
        "health": "/health",
        "docs": "/docs"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

