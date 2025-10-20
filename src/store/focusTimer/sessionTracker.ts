let activeSessionId: string | null = null
let lastLoggedSessionId: string | null = null

export const createSessionId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

export const getActiveSessionId = () => activeSessionId

export const setActiveSessionId = (id: string | null) => {
  activeSessionId = id
}

export const getLastLoggedSessionId = () => lastLoggedSessionId

export const setLastLoggedSessionId = (id: string | null) => {
  lastLoggedSessionId = id
}

export const resetSessionTracker = () => {
  activeSessionId = null
  lastLoggedSessionId = null
}
