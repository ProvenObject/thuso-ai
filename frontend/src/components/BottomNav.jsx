import { NavLink } from 'react-router-dom'

const TABS = [
  {
    to: '/app/camera',
    label: 'Camera',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4 12a8 8 0 118 8"
          stroke="currentColor"
          strokeWidth={active ? 2.2 : 1.8}
          strokeLinecap="round"
        />
        <path d="M4 6v6h6" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 9v4l2.5 1.5" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" />
      </svg>
    ),
  },
  {
    to: '/app/text-to-sign',
    label: 'Text-to-Sign',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M8 12.5c0-2.5.5-6 3-6s3 3 3 5-1 3-1 5"
          stroke="currentColor"
          strokeWidth={active ? 2.2 : 1.8}
          strokeLinecap="round"
        />
        <path d="M6 16.5h12" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" />
      </svg>
    ),
  },
  {
    to: '/app/settings',
    label: 'Settings',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} />
        <path
          d="M19.4 13.5a1.7 1.7 0 00.34 1.87l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.7 1.7 0 00-1.87-.34 1.7 1.7 0 00-1.04 1.56V20a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.04-1.55 1.7 1.7 0 00-1.87.34l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.7 1.7 0 00.34-1.87 1.7 1.7 0 00-1.56-1.04H4a2 2 0 110-4h.1a1.7 1.7 0 001.56-1.04 1.7 1.7 0 00-.34-1.87l-.06-.06a2 2 0 112.83-2.83l.06.06a1.7 1.7 0 001.87.34H10a1.7 1.7 0 001.04-1.56V4a2 2 0 114 0v.1a1.7 1.7 0 001.04 1.56 1.7 1.7 0 001.87-.34l.06-.06a2 2 0 112.83 2.83l-.06.06a1.7 1.7 0 00-.34 1.87V10a1.7 1.7 0 001.56 1.04H20a2 2 0 110 4h-.1a1.7 1.7 0 00-1.56 1.04z"
          stroke="currentColor"
          strokeWidth={active ? 1.6 : 1.3}
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
]

/**
 * BottomNav
 * 4-tab bar. Every tab is icon + visible label (no icon-only buttons) and
 * each tap target is at least 44px tall for accessibility.
 */
export default function BottomNav() {
  return (
    <nav
      aria-label="Primary"
      className="relative z-20 flex items-stretch justify-between gap-1 px-3 pt-2 pb-[env(safe-area-inset-bottom,10px)] bg-white/95 backdrop-blur border-t border-ink-faint/10"
    >
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) =>
            `flex-1 min-h-[52px] flex flex-col items-center justify-center gap-1 rounded-xl mx-0.5 mb-1.5 transition-colors ${
              isActive ? 'text-primary' : 'text-ink-faint'
            }`
          }
        >
          {({ isActive }) => (
            <>
              {tab.icon(isActive)}
              <span className={`text-[11px] leading-none ${isActive ? 'font-semibold' : 'font-medium'}`}>
                {tab.label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
