import { createContext, useContext, useState } from 'react'

// South Africa's 11 official languages.
export const SA_LANGUAGES = [
  { code: 'af', name: 'Afrikaans' },
  { code: 'en', name: 'English' },
  { code: 'nr', name: 'isiNdebele' },
  { code: 'xh', name: 'isiXhosa' },
  { code: 'zu', name: 'isiZulu' },
  { code: 'nso', name: 'Sepedi' },
  { code: 'st', name: 'Sesotho' },
  { code: 'tn', name: 'Setswana' },
  { code: 'ss', name: 'siSwati' },
  { code: 've', name: 'Tshivenda' },
  { code: 'ts', name: 'Xitsonga' },
]

const LanguageContext = createContext(null)

/**
 * Holds the user's preferred output language so it's available anywhere
 * the app renders translated text, independent of which screen is active.
 */
export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(SA_LANGUAGES[1]) // English

  const setLanguageByCode = (code) => {
    const next = SA_LANGUAGES.find((l) => l.code === code)
    if (next) setLanguage(next)
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage: setLanguageByCode }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider')
  return ctx
}
