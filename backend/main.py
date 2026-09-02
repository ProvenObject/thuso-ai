"""Thuso AI backend — FastAPI scaffold.

Run locally with:
    uvicorn main:app --reload --port 8000

REST handles auth/account/language screens; the /ws/detect WebSocket streams
live camera frames from <CameraScreen /> and streams detection results back.
Real MediaPipe/OpenCV sign detection is NOT implemented here — see the
clearly marked hook in app/services/detection.py::process_frame.
"""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, detect, languages

app = FastAPI(title="Thuso AI API", version="0.1.0")

# Vite's default dev server origin, plus any deployed frontend origins
# supplied via the FRONTEND_ORIGINS env var (comma-separated) — e.g. the
# Vercel production URL, so the deployed frontend can reach this backend.
_extra_origins = [o.strip() for o in os.environ.get("FRONTEND_ORIGINS", "").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", *_extra_origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(languages.router)
app.include_router(detect.router)


@app.get("/api/health", tags=["health"])
def health() -> dict:
    return {"status": "ok"}
