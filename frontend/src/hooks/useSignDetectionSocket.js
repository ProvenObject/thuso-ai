import { useCallback, useEffect, useRef, useState } from 'react'
import { WS_BASE } from '../lib/api'

const RECONNECT_DELAY_MS = 2000

/**
 * useSignDetectionSocket
 * Owns the WebSocket connection to ws://<backend>/ws/detect used by
 * <CameraScreen />. Streams outgoing frames and turns incoming detection
 * messages into UI state (current sign, confidence, landmarks, history).
 *
 * Backend contract (see backend/app/routers/detect.py):
 *   -> client sends: { "frame": "<base64 jpeg>", "ts": <ms> }
 *   <- server sends: { "sign": "Thank you", "confidence": 0.82, "landmarks": [...] }
 */
export function useSignDetectionSocket({ enabled }) {
  const socketRef = useRef(null)
  const reconnectTimer = useRef(null)

  const [status, setStatus] = useState('idle') // idle | connecting | open | closed | error
  const [currentSign, setCurrentSign] = useState(null)
  const [confidence, setConfidence] = useState(0)
  const [landmarks, setLandmarks] = useState([])
  const [history, setHistory] = useState([])

  /**
   * PLACEHOLDER HOOK — frontend side
   * ---------------------------------
   * This is where a raw WebSocket message from /ws/detect gets parsed into
   * UI state. The backend currently returns mock data (see
   * backend/app/services/detection.py::process_frame). Swap this function
   * out (or extend it) once the real model is wired up, e.g. to add
   * confidence smoothing, debounce repeated signs, or discard low-confidence
   * frames before they hit the translation history.
   */
  const handleDetectionMessage = useCallback((raw) => {
    let data
    try {
      data = JSON.parse(raw)
    } catch {
      return
    }

    const { sign, confidence: conf, landmarks: pts } = data
    if (typeof sign !== 'string') return

    setCurrentSign(sign)
    setConfidence(typeof conf === 'number' ? conf : 0)
    setLandmarks(Array.isArray(pts) ? pts : [])

    setHistory((prev) => {
      const last = prev[prev.length - 1]
      if (last && last.sign === sign) return prev // collapse repeats
      const entry = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, sign, confidence: conf, at: new Date() }
      return [...prev.slice(-49), entry]
    })
  }, [])

  useEffect(() => {
    if (!enabled) {
      socketRef.current?.close()
      return undefined
    }

    let cancelled = false

    const connect = () => {
      if (cancelled) return
      setStatus('connecting')
      const socket = new WebSocket(`${WS_BASE}/ws/detect`)
      socketRef.current = socket

      socket.onopen = () => setStatus('open')
      socket.onmessage = (event) => handleDetectionMessage(event.data)
      socket.onerror = () => setStatus('error')
      socket.onclose = () => {
        setStatus('closed')
        if (!cancelled) {
          reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS)
        }
      }
    }

    connect()

    return () => {
      cancelled = true
      clearTimeout(reconnectTimer.current)
      socketRef.current?.close()
    }
  }, [enabled, handleDetectionMessage])

  const sendFrame = useCallback((base64Jpeg) => {
    const socket = socketRef.current
    if (!socket || socket.readyState !== WebSocket.OPEN) return
    socket.send(JSON.stringify({ frame: base64Jpeg, ts: Date.now() }))
  }, [])

  return { status, currentSign, confidence, landmarks, history, sendFrame }
}
