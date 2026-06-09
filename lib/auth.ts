const TOKEN_KEY = "sessionToken"
const USER_ID_KEY = "userId"
const USERNAME_KEY = "username"

export function getSessionToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setSession(token: string, userId: string, username: string) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_ID_KEY, userId)
  localStorage.setItem(USERNAME_KEY, username)
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_ID_KEY)
  localStorage.removeItem(USERNAME_KEY)
}

export function getUsername(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(USERNAME_KEY)
}

export function getUserId(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(USER_ID_KEY)
}
