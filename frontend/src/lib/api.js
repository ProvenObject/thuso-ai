/**
 * Base URLs for the FastAPI backend.
 * The camera screen upgrades to a WebSocket (see hooks/useSignDetectionSocket.js).
 */
export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'
export const WS_BASE = import.meta.env.VITE_WS_BASE || 'ws://localhost:8000'
