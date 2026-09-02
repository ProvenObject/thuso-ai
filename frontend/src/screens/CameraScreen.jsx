import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell.jsx'
import SecondaryButton from '../components/SecondaryButton.jsx'
import { useSignDetectionSocket } from '../hooks/useSignDetectionSocket.js'
import { useConversationHistory } from '../context/ConversationContext.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'
import { DEMO_TURN_TRANSLATIONS, NURSE_GREETING } from '../i18n/demoTranslations.js'

const FRAME_INTERVAL_MS = 350

// MediaPipe Hands' 21-point topology (wrist=0, then thumb/index/middle/
// ring/pinky each as 4 points base-to-tip) — mirrors backend/app/services/
// detection.py so the skeleton drawn here matches what the classifier saw.
const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
]

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

// getUserMedia rejects with a handful of distinct error names — surface
// what actually went wrong instead of one generic "check permissions"
// message, since permission-denied, no-hardware, and camera-in-use all
// need a different fix from the person reading it.
function cameraErrorMessage(err) {
  switch (err?.name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return 'Camera permission was denied. Allow camera access for this site in your browser settings, then try again.'
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'No camera was found on this device. Connect a camera and try again.'
    case 'NotReadableError':
    case 'TrackStartError':
      return 'Your camera is already in use by another app or browser tab. Close it and try again.'
    default:
      return 'Camera access is unavailable. Check your browser permissions and try again.'
  }
}

export default function CameraScreen() {
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const overlayRef = useRef(null)
  const captureCanvasRef = useRef(null)
  const [cameraError, setCameraError] = useState('')
  const [cameraReady, setCameraReady] = useState(false)
  const [attempt, setAttempt] = useState(0)

  // Demo mode: always on so the scripted 3-turn conversation is what the
  // camera screen shows. Flip to false here to fall through to the real
  // MediaPipe classification path below, which is left untouched.
  const demoMode = true
  const { language } = useLanguage()
  // Re-derives the scripted turns (nurse prompt + patient reply, in the
  // selected output language) any time the language dropdown changes.
  // Fixed 3-turn scripted conversation for live demos. Demo mode ignores
  // the real detection payload's content — it only reacts to WHETHER a
  // hand was detected, not what sign was actually made. Each turn's
  // sentence is revealed one word per detection — the sentence grows in
  // place until all its words have appeared, then the next turn starts a
  // new sentence, looping back to turn 1 after turn 3.
  const demoTurns = useMemo(
    () =>
      DEMO_TURN_TRANSLATIONS.map((turn) => ({
        prompt: turn.prompt[language.code] ?? turn.prompt.en,
        words: (turn.reply[language.code] ?? turn.reply.en).split(' '),
      })),
    [language.code],
  )
  const [demoTurnIndex, setDemoTurnIndex] = useState(0)
  const [demoWordIndex, setDemoWordIndex] = useState(0)
  // Shared with <HistoryScreen /> so the same transcript shows on the
  // History tab while the conversation is happening (and after it ends).
  const { conversation: demoConversation, setConversation: setDemoConversation } = useConversationHistory()
  // awaitingNurse spans the whole gap after a sentence completes (gates hand
  // detection); nurseTyping controls only the "Typing…" bubble's visibility,
  // which turns on 2s into that gap.
  const [awaitingNurse, setAwaitingNurse] = useState(false)
  const [nurseTyping, setNurseTyping] = useState(false)
  const [demoComplete, setDemoComplete] = useState(false)
  const prevHandPresentRef = useRef(false)
  const typingTimerRef = useRef(null)
  const nurseTimerRef = useRef(null)

  // Clear any pending nurse timers on unmount only — this must not depend
  // on the demo turn/word state below, or it would cancel the timers the
  // instant that state changes (i.e. immediately after starting them).
  useEffect(() => () => {
    clearTimeout(typingTimerRef.current)
    clearTimeout(nurseTimerRef.current)
  }, [])

  const { status, landmarks, currentWord, currentPhrase, conversation, sendFrame } = useSignDetectionSocket({
    enabled: cameraReady,
  })

  // Demo mode only cares THAT a hand was detected, never what the real
  // payload thinks was signed — this boolean is the sole signal it reacts
  // to, deliberately discarding word/confidence/phrase content.
  const handDetected = Boolean(landmarks?.length) || Boolean(currentWord)

  useEffect(() => {
    const wasPresent = prevHandPresentRef.current
    prevHandPresentRef.current = handDetected
    if (!demoMode) return
    // Conversation chain ends after the final turn's sentence — no more
    // nurse follow-up, no looping back to turn 1.
    if (demoComplete) return
    // While waiting on the nurse's next question (silence, then typing),
    // ignore hand signs — the patient waits for the question before
    // responding.
    if (awaitingNurse) return
    // Rising edge only — advance once per hand appearing, not once per
    // frame while it's held in view.
    if (handDetected && !wasPresent) {
      const turn = demoTurns[demoTurnIndex]
      const word = turn.words[demoWordIndex] ?? ''

      setDemoConversation((prev) => {
        // First word of a turn starts a new sentence bubble; every word
        // after that grows the same bubble in place.
        if (demoWordIndex === 0) {
          return [
            ...prev,
            { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, text: word, from: 'patient', at: new Date() },
          ]
        }
        const last = prev[prev.length - 1]
        return [...prev.slice(0, -1), { ...last, text: `${last.text} ${word}` }]
      })

      const nextWordIndex = demoWordIndex + 1
      if (nextWordIndex >= turn.words.length) {
        const isLastTurn = demoTurnIndex === demoTurns.length - 1
        if (isLastTurn) {
          // The final scripted reply just landed — end the chain here
          // instead of looping back to turn 1.
          setDemoComplete(true)
        } else {
          // Sentence complete — 2s of silence, then a "Typing…" indicator,
          // then the nurse's next question lands at the 5s mark.
          const nextTurnIndex = demoTurnIndex + 1
          setAwaitingNurse(true)
          typingTimerRef.current = setTimeout(() => setNurseTyping(true), 2000)
          nurseTimerRef.current = setTimeout(() => {
            setDemoConversation((prev) => [
              ...prev,
              {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                text: demoTurns[nextTurnIndex].prompt,
                from: 'nurse',
                at: new Date(),
              },
            ])
            setDemoTurnIndex(nextTurnIndex)
            setDemoWordIndex(0)
            setNurseTyping(false)
            setAwaitingNurse(false)
          }, 5000)
        }
      } else {
        setDemoWordIndex(nextWordIndex)
      }
    }
  }, [handDetected, demoMode, demoComplete, demoTurnIndex, demoWordIndex, awaitingNurse, demoTurns])

  const displayedConversation = demoMode ? demoConversation : conversation

  // Acquire the webcam stream. Re-runs whenever `attempt` changes, so the
  // "Try again" button below can retry after a permission is granted
  // without requiring a full page reload.
  useEffect(() => {
    let stream
    let cancelled = false
    async function start() {
      setCameraError('')
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
          setCameraReady(true)
        }
      } catch (err) {
        if (!cancelled) setCameraError(cameraErrorMessage(err))
      }
    }
    start()
    return () => {
      cancelled = true
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [attempt])

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

  // Draws the real hand skeleton (bones + joints) returned by the backend's
  // MediaPipe HandLandmarker onto the overlay <canvas> — a neutral white so
  // it reads as a tracking overlay rather than competing with the app's
  // blue branding elsewhere on screen.
  useEffect(() => {
    const canvas = overlayRef.current
    const video = videoRef.current
    if (!canvas || !video) return
    canvas.width = video.clientWidth
    canvas.height = video.clientHeight
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (!landmarks?.length) return

    const toPx = (pt) => [(pt.x ?? 0) * canvas.width, (pt.y ?? 0) * canvas.height]

    ctx.strokeStyle = 'rgba(255,255,255,0.85)'
    ctx.lineWidth = 2
    HAND_CONNECTIONS.forEach(([a, b]) => {
      const pa = landmarks[a]
      const pb = landmarks[b]
      if (!pa || !pb) return
      const [ax, ay] = toPx(pa)
      const [bx, by] = toPx(pb)
      ctx.beginPath()
      ctx.moveTo(ax, ay)
      ctx.lineTo(bx, by)
      ctx.stroke()
    })

    ctx.fillStyle = 'rgba(255,255,255,0.95)'
    landmarks.forEach((pt) => {
      const [x, y] = toPx(pt)
      ctx.beginPath()
      ctx.arc(x, y, 3, 0, Math.PI * 2)
      ctx.fill()
    })
  }, [landmarks])

  return (
    <AppShell>
      {/* Live status pill */}
      <div className="flex items-center justify-between mb-5 gap-3">
        <h1 className="text-[24px] font-extrabold text-ink tracking-tight">Live Camera</h1>
        <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-pill bg-white border border-ink-faint/15 text-[12.5px] font-semibold text-ink-soft">
          <ConnIcon state={status} />
          {connLabel[status]}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-6 items-start">
        {/* Camera preview pane */}
        <div className="flex flex-col gap-4">
        <div className="relative w-full aspect-video rounded-3xl overflow-hidden bg-ink shadow-card">
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
              <p className="text-white text-[14px] font-medium leading-snug max-w-[360px]">{cameraError}</p>
              <button
                type="button"
                onClick={() => setAttempt((n) => n + 1)}
                className="min-h-[44px] px-5 rounded-pill bg-white text-primary text-[14px] font-semibold"
              >
                Try again
              </button>
            </div>
          )}

          {!cameraError && !cameraReady && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-ink/70">
              <p className="text-white text-[14px] font-medium">Starting camera…</p>
            </div>
          )}
        </div>

        <SecondaryButton onClick={() => navigate('/')}>End Session</SecondaryButton>
        {/* Returns to /, the patient sign-in screen, so the next patient
            re-authenticates rather than resuming this session. */}
        </div>

        {/* Detection panel */}
        <div className="flex flex-col gap-4">
          {/* Live in-progress phrase — real detection content only, so it's
              hidden in demo mode which never surfaces payload content. */}
          {!demoMode && currentPhrase && (
            <div
              className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-secondary text-secondary-text"
              aria-live="polite"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
                <path
                  d="M12 3a3 3 0 00-3 3v6a3 3 0 006 0V6a3 3 0 00-3-3z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <path d="M6 11v1a6 6 0 0012 0v-1M12 18v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <p className="text-[14.5px] font-semibold truncate">Signing: {currentPhrase}</p>
            </div>
          )}

          {/* Recent conversation transcript — a completed line lands here
              once the signer's hand drops and the phrase closes out. */}
          <div className="p-5 rounded-2xl bg-white shadow-soft flex-1 flex flex-col min-h-[280px]">
            <p className="text-[12.5px] font-semibold uppercase tracking-wide text-ink-faint mb-3">Recent conversation</p>
            {displayedConversation.length === 0 ? (
              <p className="text-[13.5px] text-ink-soft">{NURSE_GREETING[language.code] ?? NURSE_GREETING.en}</p>
            ) : (
              <div className="flex flex-col gap-2.5 overflow-y-auto" aria-label="Conversation transcript">
                {displayedConversation.map((line) =>
                  line.from === 'nurse' ? (
                    <div
                      key={line.id}
                      className="self-end max-w-[85%] px-4 py-2.5 rounded-2xl rounded-br-md bg-white border border-ink-faint/15 shadow-soft"
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint mb-0.5">Nurse</p>
                      <p className="text-[14.5px] font-semibold leading-snug break-words text-ink">{line.text}</p>
                      <p className="text-[11px] text-ink-faint font-medium">
                        {line.at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  ) : (
                    <div key={line.id} className="max-w-[85%] px-4 py-2.5 rounded-2xl rounded-bl-md bg-secondary text-secondary-text shadow-soft">
                      <p className="text-[14.5px] font-semibold leading-snug break-words">{line.text}</p>
                      <p className="text-[11px] text-primary/70 font-medium">
                        {line.at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  ),
                )}
                {nurseTyping && (
                  <div
                    className="self-end max-w-[85%] px-4 py-2.5 rounded-2xl rounded-br-md bg-white border border-ink-faint/15 shadow-soft"
                    aria-live="polite"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint mb-0.5">Nurse</p>
                    <p className="text-[14.5px] font-semibold leading-snug text-ink-soft animate-pulse-soft">Typing…</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hidden capture canvas used only to grab frames for the socket */}
      <canvas ref={captureCanvasRef} className="hidden" aria-hidden="true" />
    </AppShell>
  )
}
