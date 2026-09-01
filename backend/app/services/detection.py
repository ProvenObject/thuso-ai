"""Sign detection pipeline — scaffold only.

This module is intentionally empty of real computer vision code. It exists
so the WebSocket route (app/routers/detect.py) has a single, obvious seam to
call into once MediaPipe/OpenCV hand tracking and a sign classifier are
implemented.
"""

import random
import time

# Mock vocabulary used to fabricate plausible-looking responses until a real
# classifier is wired in.
_MOCK_SIGNS = ["Hello", "Thank you", "Please", "Yes", "No", "Help", "Good", "Sorry"]


def process_frame(frame: str) -> dict:
    """PLACEHOLDER HOOK — backend side.

    This is where real per-frame processing belongs:
      1. Decode `frame` (a base64-encoded JPEG string sent by the frontend,
         see frontend/src/hooks/useSignDetectionSocket.js) into an image,
         e.g. via `cv2.imdecode`.
      2. Run MediaPipe Hands (or an equivalent landmark model) over the
         decoded image to extract hand/pose landmarks.
      3. Feed the landmark sequence into a trained sign-classification model
         to produce a predicted sign + confidence score.
      4. Return a JSON-serializable dict shaped exactly like the mock data
         below so the frontend contract never has to change:
         { "sign": str, "confidence": float in [0, 1], "landmarks": [...] }

    Currently this returns randomized mock data so the full frontend <->
    backend pipeline can be exercised end-to-end without a real model.
    """
    del frame  # unused until real decoding is implemented

    # Mock landmark points in normalized [0, 1] video-space coordinates,
    # matching the 21-point shape MediaPipe Hands would return per hand.
    mock_landmarks = [
        {"x": round(random.uniform(0.3, 0.7), 3), "y": round(random.uniform(0.3, 0.7), 3), "z": 0.0}
        for _ in range(21)
    ]

    return {
        "sign": random.choice(_MOCK_SIGNS),
        "confidence": round(random.uniform(0.45, 0.97), 2),
        "landmarks": mock_landmarks,
        "server_ts": time.time(),
    }
