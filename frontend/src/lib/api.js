/**
 * Minimal REST client for the FastAPI backend.
 * Auth/account/language screens talk over plain REST; only the camera
 * screen upgrades to a WebSocket (see hooks/useSignDetectionSocket.js).
 */
export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'
export const WS_BASE = import.meta.env.VITE_WS_BASE || 'ws://localhost:8000'

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })

  let body = null
  try {
    body = await res.json()
  } catch {
    // no JSON body
  }

  if (!res.ok) {
    throw new Error(body?.detail || `Request failed: ${res.status}`)
  }
  return body
}

export const api = {
  signup: (payload) =>
    request('/api/auth/signup', { method: 'POST', body: JSON.stringify(payload) }),

  login: (payload) =>
    request('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) }),

  getLanguages: () => request('/api/languages'),

  saveUserLanguage: (languageCode) =>
    request('/api/user/language', {
      method: 'POST',
      body: JSON.stringify({ language_code: languageCode }),
    }),
}
