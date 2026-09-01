import { Route, Routes } from 'react-router-dom'
import PhoneFrame from './components/PhoneFrame.jsx'
import OnboardingScreen from './screens/OnboardingScreen.jsx'
import SignInScreen from './screens/SignInScreen.jsx'
import SignupScreen from './screens/SignupScreen.jsx'
import LanguageScreen from './screens/LanguageScreen.jsx'
import CameraScreen from './screens/CameraScreen.jsx'
import HistoryScreen from './screens/HistoryScreen.jsx'
import TextToSignScreen from './screens/TextToSignScreen.jsx'
import SettingsScreen from './screens/SettingsScreen.jsx'

export default function App() {
  return (
    <PhoneFrame>
      <Routes>
        <Route path="/" element={<OnboardingScreen />} />
        <Route path="/signin" element={<SignInScreen />} />
        <Route path="/signup" element={<SignupScreen />} />
        <Route path="/language" element={<LanguageScreen />} />
        <Route path="/app/camera" element={<CameraScreen />} />
        <Route path="/app/history" element={<HistoryScreen />} />
        <Route path="/app/text-to-sign" element={<TextToSignScreen />} />
        <Route path="/app/settings" element={<SettingsScreen />} />
      </Routes>
    </PhoneFrame>
  )
}
