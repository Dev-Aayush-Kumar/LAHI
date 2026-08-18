from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from utils.logger import logger
from config import API_TITLE, API_VERSION, CORS_ORIGINS
from contextlib import asynccontextmanager
from models.model_manager import model_manager

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("===================================")
    logger.info("LAHI Backend Starting...")
    logger.info("===================================")

    model_manager.load_all()
    yield

    logger.info("===================================")
    logger.info("LAHI Backend Stopped.")
    logger.info("===================================")

app = FastAPI(
    title=API_TITLE,
    version=API_VERSION,
    lifespan=lifespan,
)

# -----------------------------
# CORS
# -----------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# Root
# -----------------------------

@app.get("/")
async def root():
    return {
        "application": API_TITLE,
        "version": API_VERSION,
        "status": "running"
    }

# -----------------------------
# Health
# -----------------------------

@app.get("/health")
async def health():
    return {
        "status": "healthy"
    }
