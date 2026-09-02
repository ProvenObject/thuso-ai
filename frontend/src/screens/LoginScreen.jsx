import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PrimaryButton from '../components/PrimaryButton.jsx'
import SigningIllustration from '../components/SigningIllustration.jsx'

/**
 * LoginScreen
 * First screen shown. Identifies the patient by file number + PIN before
 * handing off to <StartScreen />. No real auth backend is wired up yet —
 * both fields are only checked for presence, matching the placeholder
 * state of backend/app/routers/auth.py.
 */
export default function LoginScreen() {
  const navigate = useNavigate()
  const [fileNumber, setFileNumber] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!fileNumber.trim() || !pin.trim()) {
      setError('Enter the patient file number and PIN to continue.')
      return
    }
    setError('')
    navigate('/start')
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 lg:p-10 text-center">
      <div className="w-full max-w-[280px] animate-fade-in">
        <SigningIllustration />
      </div>

      <h1 className="mt-6 text-[28px] font-extrabold text-ink tracking-tight">Patient sign-in</h1>
      <p className="mt-2 text-[15px] text-ink-soft max-w-[360px]">
        Enter your file number and PIN to start session
      </p>

      <form onSubmit={handleSubmit} className="mt-8 w-full max-w-[320px] text-left" noValidate>
        <label htmlFor="fileNumber" className="block text-[13.5px] font-semibold text-ink-soft mb-1.5">
          File Number
        </label>
        <input
          id="fileNumber"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={fileNumber}
          onChange={(e) => setFileNumber(e.target.value)}
          placeholder="e.g. 0012345"
          className="w-full min-h-[52px] px-4 rounded-2xl bg-white border border-ink-faint/20 text-[15px] text-ink shadow-soft focus:outline-none focus:ring-2 focus:ring-primary/40"
        />

        <label htmlFor="pin" className="block text-[13.5px] font-semibold text-ink-soft mb-1.5 mt-4">
          PIN
        </label>
        <input
          id="pin"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="••••"
          className="w-full min-h-[52px] px-4 rounded-2xl bg-white border border-ink-faint/20 text-[15px] text-ink shadow-soft focus:outline-none focus:ring-2 focus:ring-primary/40"
        />

        {error && (
          <p className="mt-3 text-[13.5px] font-semibold text-warning" role="alert">
            {error}
          </p>
        )}

        <div className="mt-6">
          <PrimaryButton type="submit">Log in</PrimaryButton>
        </div>
      </form>
    </div>
  )
}
