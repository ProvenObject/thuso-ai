import TopNav from './TopNav.jsx'

/**
 * AppShell
 * Wraps the signed-in screens (Camera / History)
 * with the persistent top nav and a centered, wide content column sized for
 * a landscape/desktop browser window.
 */
export default function AppShell({ children }) {
  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <TopNav />
      <main className="flex-1 w-full max-w-[1200px] mx-auto px-6 lg:px-8 py-8">{children}</main>
    </div>
  )
}
