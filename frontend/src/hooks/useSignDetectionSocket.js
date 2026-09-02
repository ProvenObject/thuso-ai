import { useCallback, useEffect, useRef, useState } from 'react'
import { WS_BASE } from '../lib/api'

const RECONNECT_DELAY_MS = 2000

/**
 * useSignDetectionSocket
 * Owns the WebSocket connection to ws://<backend>/ws/detect used by
 * <CameraScreen />. Streams outgoing frames and turns incoming detection
 * messages into UI state: the current per-frame word guess, confidence,
 * landmarks, the in-progress phrase being signed, and the completed
 * conversation transcript.
 *
 * Backend contract (see backend/app/routers/detect.py +
 * backend/app/services/detection.py):
 *   -> client sends: { "frame": "<base64 jpeg>", "ts": <ms> }
 *   <- server sends: { "word": "HELLO", "confidence": 0.82, "landmarks": [...], "current_phrase": "HELLO THANK YOU", "conversation": ["HI THERE", "GOOD BYE"] }
 * `word`/`landmarks` are null/empty when no hand is in frame. `conversation`
 * is the full transcript (oldest first, capped at 20 lines) — the backend
 * is the source of truth for its content and order; this hook just stamps
 * each new line with a client-side timestamp as it arrives.
 */
export function useSignDetectionSocket({ enabled }) {
  const socketRef = useRef(null)
  const reconnectTimer = useRef(null)

  const [status, setStatus] = useState('idle') // idle | connecting | open | closed | error
  const [currentWord, setCurrentWord] = useState(null)
  const [confidence, setConfidence] = useState(0)
  const [landmarks, setLandmarks] = useState([])
  const [currentPhrase, setCurrentPhrase] = useState('')
  // { id, text, at } entries — the backend sends conversation as a plain
  // array of completed phrase strings (source of truth for content/order);
  // timestamps are stamped client-side the moment a new line arrives.
  const [conversation, setConversation] = useState([])

  /**
   * PLACEHOLDER HOOK — frontend side
   * ---------------------------------
   * This is where a raw WebSocket message from /ws/detect gets parsed into
   * UI state. Extend this if the backend's classifier changes shape (e.g.
   * to add per-word alternates, or to smooth confidence across frames
   * before it reaches the UI).
   */
  const handleDetectionMessage = useCallback((raw) => {
    let data
    try {
      data = JSON.parse(raw)
    } catch {
      return
    }
    if (data.error) return

    const { word, confidence: conf, landmarks: pts, current_phrase: phrase, conversation: transcript } = data

    setCurrentWord(word ?? null)
    setConfidence(typeof conf === 'number' ? conf : 0)
    setLandmarks(Array.isArray(pts) ? pts : [])
    setCurrentPhrase(phrase || '')

    if (Array.isArray(transcript)) {
      setConversation((prev) => {
        if (transcript.length === prev.length) return prev
        // Common case: the backend appended N new lines to the end.
        if (transcript.length > prev.length && transcript.slice(0, prev.length).every((t, i) => t === prev[i].text)) {
          const added = transcript.slice(prev.length).map((text) => ({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            text,
            at: new Date(),
          }))
          return [...prev, ...added]
        }
        // Otherwise (e.g. the backend's 20-line cap trimmed the front) just
        // resync — those re-stamped entries lose their original time, which
        // only affects lines old enough to have scrolled off the cap.
        return transcript.map((text) => ({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          text,
          at: new Date(),
        }))
      })
    }
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

  return { status, currentWord, confidence, landmarks, currentPhrase, conversation, sendFrame }
}
