import { useEffect, useRef, useState } from 'react'
import StatusBar from '../components/StatusBar.jsx'
import BottomNav from '../components/BottomNav.jsx'
import { useSignDetectionSocket } from '../hooks/useSignDetectionSocket.js'

const FRAME_INTERVAL_MS = 350

const ConnIcon = ({ state }) => {
  if (state === 'open')
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="#1E9E6B" />
        <path d="M7 12.5l3.2 3.2L17 9" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  if (state === 'connecting')
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="animate-pulse-soft" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="#C97A1B" />
      </svg>
    )
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#9AA0B4" />
    </svg>
  )
}

const connLabel = {
  idle: 'Not connected',
  connecting: 'Connecting…',
  open: 'Live',
  closed: 'Reconnecting…',
  error: 'Connection issue',
}

function confidenceLabel(score) {
  if (score >= 0.75) return { text: 'High confidence', tone: 'text-success' }
  if (score >= 0.4) return { text: 'Possible match', tone: 'text-warning' }
  return { text: 'Low confidence', tone: 'text-ink-soft' }
}

export default function CameraScreen() {
  const videoRef = useRef(null)
  const overlayRef = useRef(null)
  const captureCanvasRef = useRef(null)
  const [cameraError, setCameraError] = useState('')
  const [cameraReady, setCameraReady] = useState(false)

  const { status, currentSign, confidence, landmarks, history, sendFrame } = useSignDetectionSocket({
    enabled: cameraReady,
  })

  // Acquire the webcam stream.
  useEffect(() => {
    let stream
    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
          setCameraReady(true)
        }
      } catch (err) {
        setCameraError('Camera access is unavailable. Check your browser permissions and try again.')
      }
    }
    start()
    return () => stream?.getTracks().forEach((t) => t.stop())
  }, [])

  // Periodically capture a frame and stream it to the backend over the WS.
  useEffect(() => {
    if (!cameraReady) return undefined
    const canvas = captureCanvasRef.current
    const video = videoRef.current
    const ctx = canvas.getContext('2d')

    const timer = setInterval(() => {
      if (!video || video.readyState < 2) return
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.6)
      sendFrame(dataUrl.split(',')[1])
    }, FRAME_INTERVAL_MS)

    return () => clearInterval(timer)
  }, [cameraReady, sendFrame])

  /**
   * PLACEHOLDER — draws hand landmarks returned by the backend onto the
   * overlay <canvas>. Backend mock data currently sends an empty/sample
   * `landmarks` array (see backend/app/services/detection.py); once real
   * MediaPipe output is streamed, this is where per-point rendering,
   * connective "bones", or skeleton smoothing would be implemented.
   */
  useEffect(() => {
    const canvas = overlayRef.current
    const video = videoRef.current
    if (!canvas || !video) return
    canvas.width = video.clientWidth
    canvas.height = video.clientHeight
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (!landmarks?.length) return

    ctx.fillStyle = '#1E3FCC'
    landmarks.forEach((pt) => {
      const x = (pt.x ?? 0) * canvas.width
      const y = (pt.y ?? 0) * canvas.height
      ctx.beginPath()
      ctx.arc(x, y, 4, 0, Math.PI * 2)
      ctx.fill()
    })
  }, [landmarks])

  const conf = confidenceLabel(confidence)

  return (
    <div className="flex flex-col h-full">
      <StatusBar dark />

      <div className="flex-1 overflow-y-auto px-5 pb-2">
        {/* Live status pill */}
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-[20px] font-extrabold text-ink tracking-tight">Live Camera</h1>
          <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-pill bg-white border border-ink-faint/15 text-[12.5px] font-semibold text-ink-soft">
            <ConnIcon state={status} />
            {connLabel[status]}
          </span>
        </div>

        {/* Camera preview card */}
        <div className="relative w-full aspect-[3/4] rounded-3xl overflow-hidden bg-ink shadow-card">
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-cover"
            aria-label="Live camera preview used for sign detection"
          />
          <canvas ref={overlayRef} className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true" />

          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink/90 px-6 text-center">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2" />
                <path d="M12 7v6" stroke="white" strokeWidth="2" strokeLinecap="round" />
                <circle cx="12" cy="16.5" r="1.1" fill="white" />
              </svg>
              <p className="text-white text-[14px] font-medium leading-snug">{cameraError}</p>
            </div>
          )}

          {!cameraError && !cameraReady && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-ink/70">
              <p className="text-white text-[14px] font-medium">Starting camera…</p>
            </div>
          )}
        </div>

        {/* Detected sign card */}
        <div className="mt-4 p-5 rounded-2xl bg-white shadow-soft">
          <p className="text-[12.5px] font-semibold uppercase tracking-wide text-ink-faint">Detected Sign</p>
          <p className="mt-1 text-[26px] font-extrabold text-ink truncate">{currentSign || 'Waiting for a sign…'}</p>

          <div className="mt-3">
            <div className="h-2.5 rounded-pill bg-surface-alt overflow-hidden" role="presentation">
              <div
                className={`h-full rounded-pill transition-all duration-300 ${
                  confidence >= 0.75 ? 'bg-success' : confidence >= 0.4 ? 'bg-warning' : 'bg-ink-faint'
                }`}
                style={{ width: `${Math.round(confidence * 100)}%` }}
              />
            </div>
            <p className={`mt-1.5 text-[13px] font-semibold ${conf.tone}`}>
              {conf.text} · {Math.round(confidence * 100)}%
            </p>
          </div>
        </div>

        {/* Translation history strip */}
        <div className="mt-4 mb-3">
          <p className="text-[12.5px] font-semibold uppercase tracking-wide text-ink-faint mb-2">Recent translations</p>
          {history.length === 0 ? (
            <p className="text-[13.5px] text-ink-soft">Signs you make will appear here as translated text.</p>
          ) : (
            <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1" aria-label="Translation history">
              {history
                .slice()
                .reverse()
                .map((item) => (
                  <div
                    key={item.id}
                    className="shrink-0 max-w-[220px] px-4 py-2.5 rounded-2xl rounded-bl-md bg-secondary text-secondary-text shadow-soft"
                  >
                    <p className="text-[14px] font-semibold truncate">{item.sign}</p>
                    <p className="text-[11px] text-primary/70 font-medium">
                      {item.at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Hidden capture canvas used only to grab frames for the socket */}
      <canvas ref={captureCanvasRef} className="hidden" aria-hidden="true" />

      <BottomNav />
    </div>
  )
}
