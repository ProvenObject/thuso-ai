"""Thuso AI backend — FastAPI scaffold.

Run locally with:
    uvicorn main:app --reload --port 8000

REST handles auth/account/language screens; the /ws/detect WebSocket streams
live camera frames from <CameraScreen /> and streams detection results back.
Real MediaPipe/OpenCV sign detection is NOT implemented here — see the
clearly marked hook in app/services/detection.py::process_frame.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, detect, languages

app = FastAPI(title="Thuso AI API", version="0.1.0")

# Vite's default dev server origin; adjust/broaden for staging & prod.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
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
