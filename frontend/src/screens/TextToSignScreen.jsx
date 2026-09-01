import { useState } from 'react'
import StatusBar from '../components/StatusBar.jsx'
import BottomNav from '../components/BottomNav.jsx'
import PrimaryButton from '../components/PrimaryButton.jsx'

/**
 * TextToSignScreen
 * Placeholder tab for the reverse flow (typed text -> sign animation).
 * Not part of the requested WebSocket detection scope; wired for
 * navigation completeness only.
 */
export default function TextToSignScreen() {
  const [text, setText] = useState('')

  return (
    <div className="flex flex-col h-full">
      <StatusBar />
      <div className="flex-1 flex flex-col px-6 pt-2 pb-4">
        <h1 className="text-[24px] font-extrabold text-ink tracking-tight">Text-to-Sign</h1>
        <p className="mt-2 text-[14px] text-ink-soft">Type a phrase and preview it as sign language.</p>

        <label htmlFor="tts-input" className="sr-only">
          Phrase to translate to sign language
        </label>
        <textarea
          id="tts-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. Nice to meet you"
          rows={3}
          className="mt-5 w-full rounded-2xl bg-white border border-ink-faint/25 p-4 text-[15px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 resize-none"
        />

        <div className="flex-1 mt-4 rounded-2xl bg-white shadow-soft flex flex-col items-center justify-center gap-2 text-center px-6">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M8 12.5c0-2.5.5-6 3-6s3 3 3 5-1 3-1 5"
              stroke="#9AA0B4"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
          <p className="text-[13.5px] text-ink-soft">Sign animation preview will appear here.</p>
        </div>

        <PrimaryButton className="mt-4" disabled={!text.trim()}>
          Preview sign
        </PrimaryButton>
      </div>
      <BottomNav />
    </div>
  )
}
