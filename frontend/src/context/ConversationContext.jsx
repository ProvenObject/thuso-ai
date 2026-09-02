import { createContext, useContext, useState } from 'react'

const ConversationContext = createContext(null)

/**
 * Holds the live conversation transcript ({ id, text, from, at }[]) so it
 * survives navigating between screens — <CameraScreen /> writes to it as
 * turns happen, <HistoryScreen /> reads the same list to show the
 * conversation that's currently in progress (or just finished).
 */
export function ConversationProvider({ children }) {
  const [conversation, setConversation] = useState([])
  return (
    <ConversationContext.Provider value={{ conversation, setConversation }}>
      {children}
    </ConversationContext.Provider>
  )
}

export function useConversationHistory() {
  const ctx = useContext(ConversationContext)
  if (!ctx) throw new Error('useConversationHistory must be used within a ConversationProvider')
  return ctx
}
