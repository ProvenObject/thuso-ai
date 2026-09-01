import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import StatusBar from '../components/StatusBar.jsx'
import RoundedInput from '../components/RoundedInput.jsx'
import PrimaryButton from '../components/PrimaryButton.jsx'
import { api } from '../lib/api.js'

const COUNTRIES = [
  { code: 'US', dial: '+1', flag: '🇺🇸' },
  { code: 'GB', dial: '+44', flag: '🇬🇧' },
  { code: 'AU', dial: '+61', flag: '🇦🇺' },
  { code: 'FR', dial: '+33', flag: '🇫🇷' },
  { code: 'IN', dial: '+91', flag: '🇮🇳' },
]

function passwordStrength(pw) {
  if (!pw) return { score: 0, label: 'Enter a password' }
  let score = 0
  if (pw.length >= 8) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  const labels = ['Too short', 'Weak', 'Fair', 'Good', 'Strong']
  return { score, label: labels[score] }
}

const UserIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
    <path d="M5 20c1.2-4 4-6 7-6s5.8 2 7 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
)
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
const PhoneIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path
      d="M6 4h3l1.5 4-2 1.5a12 12 0 006 6l1.5-2 4 1.5v3a2 2 0 01-2.2 2A17 17 0 014 6.2 2 2 0 016 4z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
  </svg>
)
const EyeIcon = ({ open }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path
      d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    {!open && <path d="M4 4l16 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />}
  </svg>
)

export default function SignupScreen() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [phone, setPhone] = useState('')
  const [country, setCountry] = useState(COUNTRIES[0])
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const strength = useMemo(() => passwordStrength(password), [password])
  const canSubmit = fullName && email && password && phone && agreed && !submitting

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError('')
    try {
      await api.signup({
        full_name: fullName,
        email,
        password,
        phone: `${country.dial}${phone}`,
      })
      navigate('/language')
    } catch (err) {
      // Backend is a scaffold; still let the flow continue for the demo.
      console.warn('Signup request failed, continuing with local flow:', err.message)
      navigate('/language')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <StatusBar />

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-y-auto px-6 pb-6">
        <div className="pt-2 pb-5">
          <h1 className="text-[26px] font-extrabold text-ink tracking-tight">Create your free account</h1>
          <p className="mt-2 text-[14px] text-ink-soft">
            Already have an account?{' '}
            <Link to="/signin" className="text-primary font-semibold underline underline-offset-2">
              Sign In
            </Link>
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <RoundedInput
            id="fullName"
            label="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Jordan Lee"
            icon={<UserIcon />}
            autoComplete="name"
            required
          />

          <RoundedInput
            id="email"
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            icon={<MailIcon />}
            autoComplete="email"
            required
          />

          <div>
            <RoundedInput
              id="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              icon={<LockIcon />}
              autoComplete="new-password"
              required
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center text-ink-faint"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <EyeIcon open={showPassword} />
                </button>
              }
            />
            {/* Password strength — icon + text, never color-only */}
            <div className="mt-2 ml-1 flex items-center gap-2">
              <div className="flex-1 flex gap-1" role="img" aria-label={`Password strength: ${strength.label}`}>
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className={`h-1.5 flex-1 rounded-pill ${
                      i < strength.score
                        ? strength.score <= 1
                          ? 'bg-warning'
                          : strength.score === 2
                            ? 'bg-yellow-500'
                            : 'bg-success'
                        : 'bg-ink-faint/20'
                    }`}
                  />
                ))}
              </div>
              <span className="text-[12px] font-semibold text-ink-soft whitespace-nowrap">{strength.label}</span>
            </div>
          </div>

          <div>
            <label htmlFor="phone" className="block text-[13px] font-semibold text-ink-soft mb-1.5 ml-1">
              Phone number
            </label>
            <div className="flex items-center gap-2.5 min-h-[52px] px-3 rounded-2xl bg-white border border-ink-faint/25 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
              <label htmlFor="country" className="sr-only">
                Country code
              </label>
              <select
                id="country"
                value={country.code}
                onChange={(e) => setCountry(COUNTRIES.find((c) => c.code === e.target.value))}
                className="bg-transparent outline-none text-[15px] font-medium pr-1 py-3 shrink-0"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.dial}
                  </option>
                ))}
              </select>
              <span className="text-ink-faint" aria-hidden="true">
                <PhoneIcon />
              </span>
              <input
                id="phone"
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^\d\s-]/g, ''))}
                placeholder="555 123 4567"
                autoComplete="tel-national"
                required
                className="flex-1 min-w-0 bg-transparent outline-none text-[15px] text-ink placeholder:text-ink-faint py-3"
              />
            </div>
          </div>

          <label htmlFor="terms" className="flex items-start gap-3 mt-1 min-h-[44px] cursor-pointer">
            <input
              id="terms"
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 rounded-md border-2 border-ink-faint/40 text-primary focus:ring-primary/30"
            />
            <span className="text-[13.5px] leading-snug text-ink-soft">
              I agree to the <span className="text-primary font-semibold">Terms of Service</span> and{' '}
              <span className="text-primary font-semibold">Privacy Policy</span>.
            </span>
          </label>

          {error && (
            <p className="flex items-center gap-1.5 text-[13px] font-medium text-warning">{error}</p>
          )}
        </div>

        <div className="mt-6">
          <PrimaryButton type="submit" disabled={!canSubmit}>
            {submitting ? 'Creating account…' : 'Next step'}
          </PrimaryButton>
        </div>
      </form>
    </div>
  )
}
