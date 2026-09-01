"""WS /ws/detect — streaming sign-detection endpoint.

Accepts a persistent WebSocket connection from <CameraScreen />. The client
sends one JSON message per captured frame: { "frame": "<base64 jpeg>", "ts": <ms> }.
For every incoming message this handler calls services.detection.process_frame
(currently mock data) and streams the resulting JSON straight back.
"""

import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.detection import process_frame

logger = logging.getLogger("signbridge.detect")

router = APIRouter()


@router.websocket("/ws/detect")
async def detect(websocket: WebSocket) -> None:
    await websocket.accept()
    try:
        while True:
            raw = await websocket.receive_text()

            try:
                payload = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_json({"error": "invalid_json"})
                continue

            frame = payload.get("frame")
            if not frame:
                await websocket.send_json({"error": "missing_frame"})
                continue

            # Single seam into the real detection pipeline (see
            # app/services/detection.py::process_frame) — everything else in
            # this handler is transport plumbing.
            result = process_frame(frame)
            await websocket.send_json(result)
    except WebSocketDisconnect:
        logger.info("Client disconnected from /ws/detect")
