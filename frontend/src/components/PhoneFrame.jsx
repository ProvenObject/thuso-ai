/**
 * PhoneFrame
 * Wraps a screen in a realistic rounded "phone" container so every screen
 * previews consistently, App-Store-mockup style, on any viewport.
 */
export default function PhoneFrame({ children }) {
  return (
    <div className="app-shell">
      <div
        className="relative w-[390px] max-w-full h-[844px] max-h-[92vh] bg-surface rounded-[2.75rem] shadow-2xl ring-8 ring-black/5 overflow-hidden flex flex-col"
        role="presentation"
      >
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-6 bg-black/90 rounded-b-2xl z-30" />
        <div className="flex-1 flex flex-col overflow-hidden">{children}</div>
      </div>
    </div>
  )
}
