import { useNavigate } from 'react-router-dom'
import StatusBar from '../components/StatusBar.jsx'
import BottomNav from '../components/BottomNav.jsx'
import SecondaryButton from '../components/SecondaryButton.jsx'

const ROWS = [
  { label: 'Sign language dialect', value: 'ASL — American' },
  { label: 'Camera & permissions', value: 'Allowed' },
  { label: 'Accessibility', value: 'Reduced motion: system' },
  { label: 'Account', value: 'jordan@example.com' },
]

export default function SettingsScreen() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col h-full">
      <StatusBar />
      <div className="flex-1 flex flex-col px-6 pt-2 pb-4 overflow-y-auto">
        <h1 className="text-[24px] font-extrabold text-ink tracking-tight">Settings</h1>

        <div className="mt-5 flex flex-col gap-2.5">
          {ROWS.map((row) => (
            <button
              key={row.label}
              type="button"
              onClick={row.label === 'Sign language dialect' ? () => navigate('/language') : undefined}
              className="w-full min-h-[64px] flex items-center justify-between px-4 py-3 rounded-2xl bg-white shadow-soft text-left"
            >
              <span className="text-[15px] font-semibold text-ink">{row.label}</span>
              <span className="text-[13.5px] text-ink-soft">{row.value}</span>
            </button>
          ))}
        </div>

        <div className="flex-1" />
        <SecondaryButton onClick={() => navigate('/')}>Sign out</SecondaryButton>
      </div>
      <BottomNav />
    </div>
  )
}
