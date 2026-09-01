import StatusBar from '../components/StatusBar.jsx'
import BottomNav from '../components/BottomNav.jsx'

/**
 * HistoryScreen
 * Placeholder tab — full session history (persisted translations) would be
 * fetched from a REST endpoint here once the backend tracks sessions.
 */
export default function HistoryScreen() {
  return (
    <div className="flex flex-col h-full">
      <StatusBar />
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-3">
        <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 12a8 8 0 118 8" stroke="#1E3FCC" strokeWidth="2" strokeLinecap="round" />
            <path d="M4 6v6h6" stroke="#1E3FCC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 9v4l2.5 1.5" stroke="#1E3FCC" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <h1 className="text-[20px] font-extrabold text-ink">Full history coming soon</h1>
        <p className="text-[14px] text-ink-soft leading-relaxed">
          Your complete translation history will live here. Recent signs already show up on the Camera tab.
        </p>
      </div>
      <BottomNav />
    </div>
  )
}
