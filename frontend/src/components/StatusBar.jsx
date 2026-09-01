/**
 * StatusBar
 * Mock iOS/Android-style status bar: time, signal, wifi, battery.
 * `dark` flips icon/text color for screens with a dark or photo backdrop
 * (e.g. the camera preview) so contrast is always maintained.
 */
export default function StatusBar({ dark = false }) {
  const tone = dark ? 'text-white' : 'text-ink'

  return (
    <div
      className={`relative z-20 flex items-center justify-between px-7 pt-3.5 pb-2 select-none ${tone}`}
      aria-hidden="true"
    >
      <span className="text-[15px] font-semibold tabular-nums">9:41</span>
      <div className="flex items-center gap-1.5">
        {/* Signal */}
        <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
          <rect x="0" y="7" width="3" height="5" rx="0.8" fill="currentColor" />
          <rect x="5" y="5" width="3" height="7" rx="0.8" fill="currentColor" />
          <rect x="10" y="3" width="3" height="9" rx="0.8" fill="currentColor" />
          <rect x="15" y="0" width="3" height="12" rx="0.8" fill="currentColor" />
        </svg>
        {/* Wifi */}
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
          <path
            d="M8 10.5a1.1 1.1 0 100-2.2 1.1 1.1 0 000 2.2z"
            fill="currentColor"
          />
          <path
            d="M4.6 7.1a4.8 4.8 0 016.8 0"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M2 4.4a8.6 8.6 0 0112 0"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
        {/* Battery */}
        <svg width="25" height="12" viewBox="0 0 25 12" fill="none">
          <rect
            x="0.75"
            y="0.75"
            width="20.5"
            height="10.5"
            rx="2.5"
            stroke="currentColor"
            strokeWidth="1.1"
          />
          <rect x="2.5" y="2.5" width="15.5" height="7" rx="1.3" fill="currentColor" />
          <rect x="22" y="4" width="2" height="4" rx="1" fill="currentColor" />
        </svg>
      </div>
    </div>
  )
}
