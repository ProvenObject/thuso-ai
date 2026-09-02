import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PrimaryButton from '../components/PrimaryButton.jsx'
import SigningIllustration from '../components/SigningIllustration.jsx'

export default function StartScreen() {
  const navigate = useNavigate()
  const [consent, setConsent] = useState(false)

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 lg:p-10 text-center">
      <div className="w-full max-w-[380px] animate-fade-in">
        <SigningIllustration />
      </div>

      <h1 className="mt-6 text-[28px] font-extrabold text-ink tracking-tight">You're all set</h1>

      <label className="mt-4 flex items-start gap-2.5 max-w-[360px] text-left cursor-pointer">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 h-[18px] w-[18px] shrink-0 rounded border-ink-faint/40 text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <span className="text-[13.5px] text-ink-soft leading-snug">
          By proceeding, you consent to the processing of your information for communication and
          service delivery purposes in accordance with POPIA.
        </span>
      </label>

      <div className="mt-8 w-full max-w-[280px]">
        <PrimaryButton onClick={() => navigate('/app/camera')} disabled={!consent}>
          Start
        </PrimaryButton>
      </div>
    </div>
  )
}
