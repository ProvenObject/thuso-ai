import { Route, Routes } from 'react-router-dom'
import LoginScreen from './screens/LoginScreen.jsx'
import StartScreen from './screens/StartScreen.jsx'
import CameraScreen from './screens/CameraScreen.jsx'
import HistoryScreen from './screens/HistoryScreen.jsx'
import { ConversationProvider } from './context/ConversationContext.jsx'
import { LanguageProvider } from './context/LanguageContext.jsx'

export default function App() {
  return (
    <LanguageProvider>
      <ConversationProvider>
        <Routes>
          <Route path="/" element={<LoginScreen />} />
          <Route path="/start" element={<StartScreen />} />
          <Route path="/app/camera" element={<CameraScreen />} />
          <Route path="/app/history" element={<HistoryScreen />} />
        </Routes>
      </ConversationProvider>
    </LanguageProvider>
  )
}
