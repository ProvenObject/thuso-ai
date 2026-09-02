"""Sign detection pipeline.

Real hand-landmark detection via MediaPipe's pretrained HandLandmarker
(no training required — it's a bundled model), plus a small geometric
classifier that maps a static handshape to the closest word in a curated
vocabulary, and a per-connection ConversationBuilder that turns held words
into an in-progress phrase and, once the signer's hand drops, a completed
line of conversation.

Known, deliberate limitations (documented rather than hidden):
  - The classifier is a hand-crafted geometric heuristic, not a trained
    sign-classification model. It reads a single static handshape per
    frame — real ASL words like HELLO or THANK YOU are actually performed
    with motion (a salute-like wave, a hand moving out from the chin), which
    a static snapshot can't capture. What's recognized here is each word's
    distinguishing starting handshape as a proxy, not the full sign.
  - The vocabulary is intentionally small (see _WORD_PATTERNS) so each
    word's finger-curl pattern is unique — this avoids the heavy collisions
    a full 26-letter alphabet would cause with only 5 curl bits to work
    with. Swapping in a trained classifier (letter- or word-level, static or
    video) would mean replacing `classify_word` below with a call to that
    model — the surrounding pipeline (decode -> landmark -> classify ->
    build conversation) would stay the same.
  - Only a single hand is tracked, and the heuristic assumes the palm is
    roughly upright and facing the camera.
  - "Conversation" here means words held long enough to register,
    accumulated into a phrase, and flushed into the transcript once the
    signer pauses — not true ASL grammar (word order, non-manual markers,
    classifiers) that a per-frame landmark snapshot cannot capture.
"""

from __future__ import annotations

import base64
import math
from dataclasses import dataclass, field
from pathlib import Path

import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks.python import vision
from mediapipe.tasks.python.core.base_options import BaseOptions

_MODEL_PATH = Path(__file__).resolve().parent.parent / "models" / "hand_landmarker.task"

_landmarker = vision.HandLandmarker.create_from_options(
    vision.HandLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=str(_MODEL_PATH)),
        num_hands=1,
        running_mode=vision.RunningMode.IMAGE,
        min_hand_detection_confidence=0.5,
    )
)

# MediaPipe Hands' 21-point topology (wrist=0, then thumb/index/middle/ring/
# pinky each as 4 points from base to tip). Used to draw the skeleton on the
# frontend and to walk finger joints here.
WRIST = 0
THUMB_IP, THUMB_TIP = 3, 4
INDEX_PIP, INDEX_TIP = 6, 8
MIDDLE_PIP, MIDDLE_TIP = 10, 12
RING_PIP, RING_TIP = 14, 16
PINKY_PIP, PINKY_TIP = 18, 20

# Reference (thumb, index, middle, ring, pinky) extended/curled patterns for
# a small conversational vocabulary. Chosen so every word gets a unique
# 5-bit pattern (no two collide) — classify_word() still picks the closest
# match by Hamming distance so an imperfect handshape still resolves to
# something, but confidence drops the farther off it is.
_WORD_PATTERNS = {
    "HELLO": (1, 1, 1, 1, 1),
    "YES": (0, 0, 0, 0, 0),
    "NO": (1, 1, 0, 0, 0),
    "PLEASE": (0, 1, 1, 1, 1),
    "THANK YOU": (0, 0, 1, 1, 1),
    "SORRY": (1, 0, 0, 0, 0),
    "HELP": (1, 1, 1, 0, 0),
    "STOP": (0, 1, 1, 1, 0),
    "I LOVE YOU": (1, 1, 0, 0, 1),
    "GOOD": (1, 0, 0, 0, 1),
}


def decode_frame(frame_b64: str) -> np.ndarray | None:
    """Base64 JPEG (as sent by the frontend) -> RGB ndarray, or None if it
    doesn't decode."""
    try:
        raw = base64.b64decode(frame_b64)
    except Exception:
        return None
    arr = np.frombuffer(raw, dtype=np.uint8)
    bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if bgr is None:
        return None
    return cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)


def detect_landmarks(rgb_image: np.ndarray) -> list | None:
    """Runs MediaPipe HandLandmarker and returns the 21 landmarks of the
    first detected hand, or None if no hand is in frame."""
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_image)
    result = _landmarker.detect(mp_image)
    if not result.hand_landmarks:
        return None
    return result.hand_landmarks[0]


def _dist(a, b) -> float:
    return math.dist((a.x, a.y, a.z), (b.x, b.y, b.z))


def _extended(landmarks, pip_idx: int, tip_idx: int) -> bool:
    """A finger reads as "extended" when its tip sits noticeably farther
    from the wrist than its PIP joint does; "curled" otherwise. Simple and
    orientation-sensitive, but good enough for an upright, camera-facing
    hand."""
    wrist = landmarks[WRIST]
    return _dist(wrist, landmarks[tip_idx]) > _dist(wrist, landmarks[pip_idx]) * 1.1


def _hand_pattern(landmarks) -> tuple[int, int, int, int, int]:
    thumb = _extended(landmarks, THUMB_IP, THUMB_TIP)
    index = _extended(landmarks, INDEX_PIP, INDEX_TIP)
    middle = _extended(landmarks, MIDDLE_PIP, MIDDLE_TIP)
    ring = _extended(landmarks, RING_PIP, RING_TIP)
    pinky = _extended(landmarks, PINKY_PIP, PINKY_TIP)
    return (int(thumb), int(index), int(middle), int(ring), int(pinky))


def classify_word(landmarks) -> tuple[str, float]:
    """Geometric nearest-neighbor match against _WORD_PATTERNS. Always
    returns some word from the vocabulary; `confidence` reflects how clean
    the match was (lower the farther the handshape is from any reference)."""
    pattern = _hand_pattern(landmarks)

    best_dist = 6
    best_words: list[str] = []
    for word, ref in _WORD_PATTERNS.items():
        d = sum(a != b for a, b in zip(pattern, ref))
        if d < best_dist:
            best_dist = d
            best_words = [word]
        elif d == best_dist:
            best_words.append(word)

    word = best_words[0]
    confidence = 1 - best_dist / 5
    if len(best_words) > 1:
        confidence -= 0.15  # more than one word ties on this handshape
    confidence = round(max(0.3, min(0.95, confidence)), 2)
    return word, confidence


@dataclass
class ConversationBuilder:
    """Per-WebSocket-connection state: turns a stream of per-frame word
    guesses into a running phrase, then a completed conversation transcript.

    A word only "commits" into the in-progress phrase once it's been the
    top guess for COMMIT_FRAMES consecutive frames (holding the handshape
    steady), which avoids spamming the phrase with noise from
    transient/transition frames. Once the signer's hand drops out of frame
    for WORD_BREAK_FRAMES straight, the in-progress phrase is flushed into
    `conversation` as one completed line — this is the "put your hand down
    to finish what you signed" behavior.
    """

    COMMIT_FRAMES = 6
    WORD_BREAK_FRAMES = 8

    stable_word: str | None = field(default=None)
    stable_count: int = field(default=0)
    no_hand_count: int = field(default=0)
    current_phrase: list[str] = field(default_factory=list)
    conversation: list[str] = field(default_factory=list)

    def update(self, word: str | None, confidence: float) -> None:
        if word is None or confidence < 0.5:
            self.no_hand_count += 1
            self.stable_word = None
            self.stable_count = 0
            if self.no_hand_count == self.WORD_BREAK_FRAMES and self.current_phrase:
                self.conversation.append(" ".join(self.current_phrase))
                self.conversation = self.conversation[-20:]
                self.current_phrase = []
            return

        self.no_hand_count = 0
        if word == self.stable_word:
            self.stable_count += 1
        else:
            self.stable_word = word
            self.stable_count = 1

        if self.stable_count == self.COMMIT_FRAMES:
            self.current_phrase.append(word)
            self.stable_count = 0  # require a fresh hold to repeat the same word


def process_frame(frame_b64: str, builder: ConversationBuilder) -> dict:
    """Single seam the WebSocket route calls into per incoming frame:
    decode -> detect landmarks -> classify -> update the running
    conversation. Returns the JSON payload sent straight back to the
    frontend."""
    rgb = decode_frame(frame_b64)
    landmarks = detect_landmarks(rgb) if rgb is not None else None

    if landmarks is None:
        word, confidence, landmark_payload = None, 0.0, []
    else:
        word, confidence = classify_word(landmarks)
        landmark_payload = [{"x": round(p.x, 4), "y": round(p.y, 4), "z": round(p.z, 4)} for p in landmarks]

    builder.update(word, confidence)

    return {
        "word": word,
        "confidence": confidence,
        "landmarks": landmark_payload,
        "current_phrase": " ".join(builder.current_phrase),
        "conversation": builder.conversation,
    }
