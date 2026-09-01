import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StatusBar from '../components/StatusBar.jsx'
import PrimaryButton from '../components/PrimaryButton.jsx'
import { api } from '../lib/api.js'

// Local fallback so the screen still renders a full list if the FastAPI
// scaffold isn't running yet — GET /api/languages is tried first.
const FALLBACK_LANGUAGES = [
  { code: 'ASL', name: 'American Sign Language', region: 'United States', flag: '🇺🇸' },
  { code: 'BSL', name: 'British Sign Language', region: 'United Kingdom', flag: '🇬🇧' },
  { code: 'AUSLAN', name: 'Auslan', region: 'Australia', flag: '🇦🇺' },
  { code: 'LSF', name: 'Langue des Signes Française', region: 'France', flag: '🇫🇷' },
  { code: 'DGS', name: 'German Sign Language', region: 'Germany', flag: '🇩🇪' },
  { code: 'JSL', name: 'Japanese Sign Language', region: 'Japan', flag: '🇯🇵' },
  { code: 'ISL', name: 'Irish Sign Language', region: 'Ireland', flag: '🇮🇪' },
  { code: 'LSE', name: 'Spanish Sign Language', region: 'Spain', flag: '🇪🇸' },
]

const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
    <path d="M20 20l-4.5-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
)

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="12" fill="#1E9E6B" />
    <path d="M7 12.5l3.2 3.2L17 9" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export default function LanguageScreen() {
  const navigate = useNavigate()
  const [languages, setLanguages] = useState(FALLBACK_LANGUAGES)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState('ASL')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api
      .getLanguages()
      .then((data) => {
        if (Array.isArray(data) && data.length) setLanguages(data)
      })
      .catch((err) => {
        console.warn('Falling back to local language list:', err.message)
      })
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return languages
    return languages.filter(
      (l) => l.name.toLowerCase().includes(q) || l.code.toLowerCase().includes(q) || l.region.toLowerCase().includes(q),
    )
  }, [languages, query])

  const handleContinue = async () => {
    setSaving(true)
    try {
      await api.saveUserLanguage(selected)
    } catch (err) {
      console.warn('Saving language failed, continuing with local flow:', err.message)
    } finally {
      setSaving(false)
      navigate('/app/camera')
    }
  }

  return (
    <div className="flex flex-col h-full">
      <StatusBar />

      <div className="flex-1 flex flex-col overflow-hidden px-6 pt-2 pb-6">
        <h1 className="text-[26px] font-extrabold text-ink tracking-tight">Choose your sign language</h1>
        <p className="mt-2 text-[14px] text-ink-soft">
          We'll tailor detection and translations to this dialect. You can change it later in Settings.
        </p>

        <div className="mt-5 flex items-center gap-2.5 min-h-[52px] px-4 rounded-2xl bg-white border border-ink-faint/25 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
          <span className="text-ink-faint" aria-hidden="true">
            <SearchIcon />
          </span>
          <label htmlFor="lang-search" className="sr-only">
            Find a sign language
          </label>
          <input
            id="lang-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a sign language"
            className="flex-1 min-w-0 bg-transparent outline-none text-[15px] placeholder:text-ink-faint py-3"
          />
        </div>

        <ul className="flex-1 overflow-y-auto mt-4 -mx-1 px-1 flex flex-col gap-2.5" aria-label="Available sign languages">
          {filtered.map((lang) => {
            const isSelected = selected === lang.code
            return (
              <li key={lang.code}>
                <button
                  type="button"
                  onClick={() => setSelected(lang.code)}
                  aria-pressed={isSelected}
                  className={`w-full min-h-[64px] flex items-center gap-3.5 px-4 py-3 rounded-2xl bg-white border transition-colors text-left ${
                    isSelected ? 'border-primary ring-2 ring-primary/15' : 'border-ink-faint/15'
                  }`}
                >
                  <span className="text-2xl leading-none" aria-hidden="true">
                    {lang.flag}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[15px] font-semibold text-ink">{lang.name}</span>
                    <span className="block text-[12.5px] text-ink-soft">
                      {lang.code} · {lang.region}
                    </span>
                  </span>
                  {isSelected && <CheckIcon />}
                </button>
              </li>
            )
          })}
          {filtered.length === 0 && (
            <li className="text-center text-[14px] text-ink-soft py-8">No languages match "{query}".</li>
          )}
        </ul>

        <div className="pt-4">
          <PrimaryButton onClick={handleContinue} disabled={saving}>
            {saving ? 'Saving…' : 'Keep going'}
          </PrimaryButton>
        </div>
      </div>
    </div>
  )
}
