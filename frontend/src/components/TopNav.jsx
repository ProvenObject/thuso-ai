import { NavLink } from 'react-router-dom'
import { SA_LANGUAGES, useLanguage } from '../context/LanguageContext.jsx'

const TABS = [
  {
    to: '/app/camera',
    label: 'Camera',
    icon: (active) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4 8.5A1.5 1.5 0 015.5 7h2l1-1.5h7L16.5 7h2A1.5 1.5 0 0120 8.5v9A1.5 1.5 0 0118.5 19h-13A1.5 1.5 0 014 17.5v-9z"
          stroke="currentColor"
          strokeWidth={active ? 2.2 : 1.8}
          strokeLinejoin="round"
        />
        <circle cx="12" cy="13" r="3.2" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} />
      </svg>
    ),
  },
  {
    to: '/app/history',
    label: 'History',
    icon: (active) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 12a8 8 0 118 8" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" />
        <path d="M4 6v6h6" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 9v4l2.5 1.5" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" />
      </svg>
    ),
  },
]

const LogoMark = () => (
  <svg width="26" height="26" viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <rect width="32" height="32" rx="9" fill="#1E3FCC" />
    <path
      d="M10 20v-3a3 3 0 013-3h1a2 2 0 002-2v-1a3 3 0 013-3"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <circle cx="21" cy="21" r="2.2" fill="white" />
  </svg>
)

/**
 * TopNav
 * Persistent horizontal header for the signed-in app (Camera / History) —
 * replaces the mobile bottom tab bar now that
 * the UI targets a wide, landscape/desktop viewport. Every tab keeps its
 * visible text label (never icon-only) and a 44px+ tap target.
 */
export default function TopNav() {
  const { language, setLanguage } = useLanguage()

  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-ink-faint/10">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        <div className="flex items-center gap-2.5 shrink-0">
          <LogoMark />
          <span className="text-[17px] font-extrabold text-ink tracking-tight">Thuso AI</span>
        </div>

        <div className="flex items-center gap-4">
          <nav aria-label="Primary" className="flex items-center gap-1">
            {TABS.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) =>
                  `min-h-[44px] flex items-center gap-2 px-3.5 rounded-xl text-[14px] font-semibold transition-colors ${
                    isActive ? 'bg-secondary text-primary' : 'text-ink-soft hover:bg-surface-alt'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {tab.icon(isActive)}
                    <span>{tab.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <select
            aria-label="Output language"
            value={language.code}
            onChange={(e) => setLanguage(e.target.value)}
            className="min-h-[44px] pl-3 pr-8 rounded-xl border border-ink-faint/20 bg-white text-[14px] font-semibold text-ink-soft cursor-pointer hover:bg-surface-alt focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            {SA_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  )
}
