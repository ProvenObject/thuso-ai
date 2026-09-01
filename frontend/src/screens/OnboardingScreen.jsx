import { useNavigate } from 'react-router-dom'
import StatusBar from '../components/StatusBar.jsx'
import PrimaryButton from '../components/PrimaryButton.jsx'
import SecondaryButton from '../components/SecondaryButton.jsx'
import PaginationDots from '../components/PaginationDots.jsx'
import SigningIllustration from '../components/SigningIllustration.jsx'

export default function OnboardingScreen() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col h-full">
      <StatusBar />

      <div className="flex-1 flex flex-col px-7 pt-4">
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-[300px] animate-fade-in">
            <SigningIllustration />
          </div>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-[27px] leading-tight font-extrabold text-ink tracking-tight">
            Welcome to SignBridge
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
            Real-time sign language translation, made simple.
          </p>
        </div>

        <PaginationDots count={3} active={0} />

        <div className="flex flex-col gap-3 mt-6 mb-8">
          <PrimaryButton onClick={() => navigate('/signin')}>Sign In</PrimaryButton>
          <SecondaryButton onClick={() => navigate('/signup')}>Create an account</SecondaryButton>
        </div>
      </div>
    </div>
  )
}
