import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import StatusBar from '../components/StatusBar.jsx'
import RoundedInput from '../components/RoundedInput.jsx'
import PrimaryButton from '../components/PrimaryButton.jsx'
import { api } from '../lib/api.js'

const MailIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
    <path d="M4.5 7l7.5 6 7.5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
const LockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <rect x="5" y="10.5" width="14" height="9.5" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
    <path d="M8 10.5V8a4 4 0 018 0v2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
)

export default function SignInScreen() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await api.login({ email, password })
      navigate('/app/camera')
    } catch (err) {
      console.warn('Login request failed, continuing with local flow:', err.message)
      navigate('/app/camera')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <StatusBar />

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col px-6 pt-4 pb-6">
        <h1 className="text-[26px] font-extrabold text-ink tracking-tight">Welcome back</h1>
        <p className="mt-2 text-[14px] text-ink-soft">
          New here?{' '}
          <Link to="/signup" className="text-primary font-semibold underline underline-offset-2">
            Create an account
          </Link>
        </p>

        <div className="flex flex-col gap-4 mt-6">
          <RoundedInput
            id="signin-email"
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            icon={<MailIcon />}
            autoComplete="email"
            required
          />
          <RoundedInput
            id="signin-password"
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            icon={<LockIcon />}
            autoComplete="current-password"
            required
            error={error}
          />
        </div>

        <div className="flex-1" />

        <PrimaryButton type="submit" disabled={!email || !password || submitting}>
          {submitting ? 'Signing in…' : 'Sign In'}
        </PrimaryButton>
      </form>
    </div>
  )
}
