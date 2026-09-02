"""WS /ws/detect — streaming sign-detection endpoint.

Accepts a persistent WebSocket connection from <CameraScreen />. The client
sends one JSON message per captured frame: { "frame": "<base64 jpeg>", "ts": <ms> }.
For every incoming message this handler calls services.detection.process_frame
(real MediaPipe hand-landmark detection + a geometric word classifier) and
streams the resulting JSON straight back. Each connection gets its own
ConversationBuilder so one viewer's conversation never leaks into another's.
"""

import asyncio
import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.detection import ConversationBuilder, process_frame

logger = logging.getLogger("signbridge.detect")

router = APIRouter()


@router.websocket("/ws/detect")
async def detect(websocket: WebSocket) -> None:
    await websocket.accept()
    builder = ConversationBuilder()
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

            # process_frame runs MediaPipe inference, which is blocking CPU
            # work — offload it so it doesn't stall the event loop (and any
            # other connections) while it runs.
            result = await asyncio.to_thread(process_frame, frame, builder)
            await websocket.send_json(result)
    except WebSocketDisconnect:
        logger.info("Client disconnected from /ws/detect")
