import AppShell from '../components/AppShell.jsx'
import { useConversationHistory } from '../context/ConversationContext.jsx'

/**
 * HistoryScreen
 * Mirrors the same transcript <CameraScreen /> writes to (via
 * ConversationContext), so the conversation that's happening — or just
 * finished — shows up here too, not only on the Camera tab.
 */
export default function HistoryScreen() {
  const { conversation } = useConversationHistory()

  return (
    <AppShell>
      <h1 className="text-[24px] font-extrabold text-ink tracking-tight mb-5">History</h1>

      {conversation.length === 0 ? (
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 12a8 8 0 118 8" stroke="#1E3FCC" strokeWidth="2" strokeLinecap="round" />
              <path d="M4 6v6h6" stroke="#1E3FCC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 9v4l2.5 1.5" stroke="#1E3FCC" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <h2 className="text-[22px] font-extrabold text-ink">No conversation yet</h2>
          <p className="text-[14px] text-ink-soft leading-relaxed max-w-[380px]">
            Start a session on the Camera tab — the conversation will show up here as it happens.
          </p>
        </div>
      ) : (
        <div className="p-5 rounded-2xl bg-white shadow-soft max-w-[640px]">
          <div className="flex flex-col gap-2.5">
            {conversation.map((line) =>
              line.from === 'nurse' ? (
                <div
                  key={line.id}
                  className="self-end max-w-[85%] px-4 py-2.5 rounded-2xl rounded-br-md bg-white border border-ink-faint/15 shadow-soft"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint mb-0.5">Nurse</p>
                  <p className="text-[14.5px] font-semibold leading-snug break-words text-ink">{line.text}</p>
                  <p className="text-[11px] text-ink-faint font-medium">
                    {line.at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ) : (
                <div key={line.id} className="max-w-[85%] px-4 py-2.5 rounded-2xl rounded-bl-md bg-secondary text-secondary-text shadow-soft">
                  <p className="text-[14.5px] font-semibold leading-snug break-words">{line.text}</p>
                  <p className="text-[11px] text-primary/70 font-medium">
                    {line.at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ),
            )}
          </div>
        </div>
      )}
    </AppShell>
  )
}
