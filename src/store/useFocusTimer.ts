import { create } from 'zustand'
import { fetchBreakSuggestion } from '../services/geminiClient.ts'
import type { MoodType } from '../types/mood.ts'

const defaultDurations = {
  focus: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
} as const

type FocusDurations = {
  focus: number
  shortBreak: number
  longBreak: number
}

type TimerPhase = 'focus' | 'short-break' | 'long-break'

type DayStats = {
  focusSeconds: number
  breakSeconds: number
  focusCount: number
  breakCount: number
}

type WeeklyStats = Record<string, DayStats>

type SessionHistoryEntry = {
  id: string
  completedAt: string
  focusMinutes: number
  mood: MoodType | null
  suggestion: string | null
  cycle: number
}

type FocusTimerState = {
  phase: TimerPhase
  secondsRemaining: number
  isRunning: boolean
  completedFocusSessions: number
  totalFocusSeconds: number
  totalBreakSeconds: number
  pendingBreakSuggestions: number
  durations: FocusDurations
  latestMood: MoodType | null
  lastFocusSeconds: number | null
  breakSuggestion: string | null
  isGeneratingSuggestion: boolean
  suggestionError: string | null
  targetTimestamp: number | null
  focusSessionComplete: boolean
  awaitingBreak: boolean
  autoPromptVisible: boolean
  queuedSuggestion: string | null
  isPrefetchingAutoSuggestion: boolean
  autoSuggestionError: string | null
  snoozeUntil: number | null
  sessionCount: number
  sessionHistory: SessionHistoryEntry[]
  cycleStreak: number
  showBreakGate: boolean
  weeklyStats: WeeklyStats
  autoBrewEnabled: boolean
  start: () => void
  pause: () => void
  resume: () => void
  reset: () => void
  setDurations: (updates: Partial<FocusDurations>) => void
  setMood: (mood: MoodType) => void
  clearMood: () => void
  generateBreakSuggestion: () => Promise<void>
  clearBreakSuggestion: () => void
  prefetchAutoSuggestion: () => Promise<void>
  triggerAutoPrompt: () => void
  applyQueuedSuggestion: () => void
  abortAutoSuggestion: () => void
  snoozeAutoSuggestion: (minutes: number) => void
  resumeAwaitingBreak: () => void
  acceptBreakGate: () => void
  skipBreakGate: () => void
  setAutoBrewEnabled: (enabled: boolean) => void
  activeSessionId: string | null
  lastLoggedSessionId: string | null
}

const STORAGE_KEY = 'breakbuddy:focus-timer:v1'

const createSessionId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

type PersistedSnapshot = Pick<
  FocusTimerState,
  | 'weeklyStats'
  | 'sessionHistory'
  | 'durations'
  | 'completedFocusSessions'
  | 'totalFocusSeconds'
  | 'totalBreakSeconds'
  | 'cycleStreak'
  | 'autoBrewEnabled'
>

const validMoods = new Set<MoodType>(['😎', '😴', '😠', '🧠', '❤️'])

const sanitizeNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }
  return null
}

const sanitizeBoolean = (value: unknown, fallback: boolean) => {
  if (typeof value === 'boolean') {
    return value
  }
  if (typeof value === 'string') {
    const normalized = value.toLowerCase().trim()
    if (normalized === 'true') {
      return true
    }
    if (normalized === 'false') {
      return false
    }
  }
  return fallback
}

const sanitizeDurations = (value: unknown): FocusDurations | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined
  }

  const source = value as Record<string, unknown>
  const sanitized: FocusDurations = { ...defaultDurations }
  let hasValue = false

  const focus = sanitizeNumber(source.focus)
  if (focus !== null && focus > 0) {
    sanitized.focus = Math.floor(focus)
    hasValue = true
  }

  const shortBreak = sanitizeNumber(source.shortBreak)
  if (shortBreak !== null && shortBreak > 0) {
    sanitized.shortBreak = Math.floor(shortBreak)
    hasValue = true
  }

  const longBreak = sanitizeNumber(source.longBreak)
  if (longBreak !== null && longBreak > 0) {
    sanitized.longBreak = Math.floor(longBreak)
    hasValue = true
  }

  return hasValue ? sanitized : undefined
}

const sanitizeWeeklyStats = (value: unknown): WeeklyStats | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined
  }

  const raw = value as Record<string, unknown>
  const sanitized: WeeklyStats = {}

  Object.entries(raw).forEach(([key, stats]) => {
    if (!stats || typeof stats !== 'object') {
      return
    }

    const record = stats as Record<string, unknown>
    const focusSeconds = sanitizeNumber(record.focusSeconds)
    const breakSeconds = sanitizeNumber(record.breakSeconds)
    const focusCount = sanitizeNumber(record.focusCount)
    const breakCount = sanitizeNumber(record.breakCount)

    sanitized[key] = {
      focusSeconds:
        focusSeconds !== null && focusSeconds >= 0 ? focusSeconds : 0,
      breakSeconds:
        breakSeconds !== null && breakSeconds >= 0 ? breakSeconds : 0,
      focusCount:
        focusCount !== null && focusCount >= 0 ? Math.round(focusCount) : 0,
      breakCount:
        breakCount !== null && breakCount >= 0 ? Math.round(breakCount) : 0,
    }
  })

  const today = new Date()
  const normalized: WeeklyStats = {}
  for (let i = 6; i >= 0; i -= 1) {
    const day = new Date(today)
    day.setDate(today.getDate() - i)
    const key = formatDayKey(day)
    normalized[key] = sanitized[key] ?? createDayStats()
  }

  return normalized
}

const sanitizeSessionHistory = (
  value: unknown
): SessionHistoryEntry[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined
  }

  const entries = value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null
      }

      const entry = item as Record<string, unknown>
      if (typeof entry.id !== 'string' || entry.id.trim().length === 0) {
        return null
      }

      if (typeof entry.completedAt !== 'string') {
        return null
      }
      const completedTime = Date.parse(entry.completedAt)
      if (Number.isNaN(completedTime)) {
        return null
      }

      const focusMinutes = sanitizeNumber(entry.focusMinutes)
      if (focusMinutes === null || focusMinutes < 0) {
        return null
      }

      const cycle = sanitizeNumber(entry.cycle)
      if (cycle === null || cycle < 0) {
        return null
      }

      const mood =
        typeof entry.mood === 'string' && validMoods.has(entry.mood as MoodType)
          ? (entry.mood as MoodType)
          : null

      const suggestion =
        typeof entry.suggestion === 'string' || entry.suggestion === null
          ? (entry.suggestion as string | null)
          : null

      return {
        id: entry.id,
        completedAt: new Date(completedTime).toISOString(),
        focusMinutes: Number(focusMinutes.toFixed(1)),
        mood,
        suggestion,
        cycle: Math.max(0, Math.round(cycle)),
      }
    })
    .filter((entry): entry is SessionHistoryEntry => entry !== null)

  entries.sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt))

  return entries.slice(0, 50)
}

const loadPersistedState = (): Partial<PersistedSnapshot> => {
  if (typeof window === 'undefined') {
    return {}
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return {}
    }

    const parsed = JSON.parse(raw) as Record<string, unknown>
    const result: Partial<PersistedSnapshot> = {}

    const durations = sanitizeDurations(parsed.durations)
    if (durations) {
      result.durations = durations
    }

    const weeklyStats = sanitizeWeeklyStats(parsed.weeklyStats)
    if (weeklyStats) {
      result.weeklyStats = weeklyStats
    }

    const sessionHistory = sanitizeSessionHistory(parsed.sessionHistory)
    if (sessionHistory) {
      result.sessionHistory = sessionHistory
    }

    const completedFocusSessions = sanitizeNumber(parsed.completedFocusSessions)
    if (completedFocusSessions !== null && completedFocusSessions >= 0) {
      result.completedFocusSessions = Math.round(completedFocusSessions)
    }

    const totalFocusSeconds = sanitizeNumber(parsed.totalFocusSeconds)
    if (totalFocusSeconds !== null && totalFocusSeconds >= 0) {
      result.totalFocusSeconds = Math.round(totalFocusSeconds)
    }

    const totalBreakSeconds = sanitizeNumber(parsed.totalBreakSeconds)
    if (totalBreakSeconds !== null && totalBreakSeconds >= 0) {
      result.totalBreakSeconds = Math.round(totalBreakSeconds)
    }

    const cycleStreak = sanitizeNumber(parsed.cycleStreak)
    if (cycleStreak !== null && cycleStreak >= 0) {
      result.cycleStreak = Math.round(cycleStreak)
    }

    result.autoBrewEnabled = sanitizeBoolean(parsed.autoBrewEnabled, true)

    return result
  } catch {
    return {}
  }
}

const persistState = (state: PersistedSnapshot) => {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const payload: PersistedSnapshot = {
      weeklyStats: state.weeklyStats,
      sessionHistory: state.sessionHistory,
      durations: state.durations,
      completedFocusSessions: state.completedFocusSessions,
      totalFocusSeconds: state.totalFocusSeconds,
      totalBreakSeconds: state.totalBreakSeconds,
      cycleStreak: state.cycleStreak,
      autoBrewEnabled: state.autoBrewEnabled,
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    /* ignore */
  }
}

let timer: ReturnType<typeof setInterval> | null = null

const createDayStats = (): DayStats => ({
  focusSeconds: 0,
  breakSeconds: 0,
  focusCount: 0,
  breakCount: 0,
})

const formatDayKey = (date: Date) => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

const createInitialWeek = (): WeeklyStats => {
  const stats: WeeklyStats = {}
  const today = new Date()
  for (let i = 6; i >= 0; i -= 1) {
    const day = new Date(today)
    day.setDate(today.getDate() - i)
    stats[formatDayKey(day)] = createDayStats()
  }
  return stats
}

const upsertWeeklyStats = (
  current: WeeklyStats,
  dayKey: string,
  updater: (existing: DayStats) => DayStats
) => {
  const next: WeeklyStats = { ...current }
  const existing = current[dayKey] ?? createDayStats()
  next[dayKey] = updater(existing)

  const entries = Object.entries(next).sort(([a], [b]) => a.localeCompare(b))

  if (entries.length <= 7) {
    return next
  }

  const trimmed = entries.slice(-7)
  return trimmed.reduce<WeeklyStats>((acc, [key, value]) => {
    acc[key] = value
    return acc
  }, {})
}

const clearTimer = () => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

const startTicker = (
  set: (
    partial:
      | Partial<FocusTimerState>
      | ((state: FocusTimerState) => Partial<FocusTimerState> | FocusTimerState)
  ) => void
) => {
  if (timer) {
    clearTimer()
  }

  const tick = () => {
    let shouldStopTicker = false

    set((state) => {
      if (!state.isRunning) {
        clearTimer()
        return state
      }

      if (state.showBreakGate) {
        shouldStopTicker = true
        return {
          isRunning: false,
          targetTimestamp: null,
        }
      }

      const now = Date.now()
      const target =
        state.targetTimestamp ?? now + state.secondsRemaining * 1000
      let remainingMs = target - now

      if (remainingMs > 0) {
        const secondsRemaining = Math.max(0, Math.ceil(remainingMs / 1000))
        if (secondsRemaining !== state.secondsRemaining) {
          return {
            secondsRemaining,
            targetTimestamp: target,
          }
        }
        return {
          targetTimestamp: target,
        }
      }

      let leftoverMs = -remainingMs
      let phase = state.phase
      let secondsRemaining = state.secondsRemaining
      let completedFocusSessions = state.completedFocusSessions
      let totalFocusSeconds = state.totalFocusSeconds
      let totalBreakSeconds = state.totalBreakSeconds
      let pendingBreakSuggestions = state.pendingBreakSuggestions
      let lastFocusSeconds = state.lastFocusSeconds
      let weeklyStats = state.weeklyStats
      let sessionHistory = state.sessionHistory
      let focusSessionComplete = state.focusSessionComplete
      let awaitingBreak = state.awaitingBreak
      let autoPromptVisible = state.autoPromptVisible
      let queuedSuggestion = state.queuedSuggestion
      let isPrefetchingAutoSuggestion = state.isPrefetchingAutoSuggestion
      let autoSuggestionError = state.autoSuggestionError
      let snoozeUntil = state.snoozeUntil
      let targetTimestamp = target
      let cycleStreak = state.cycleStreak
      let showBreakGate = state.showBreakGate
      const durations = state.durations
      const todayKey = formatDayKey(new Date())

      let safety = 0
      while (leftoverMs >= 0 && safety < 24) {
        safety += 1
        if (phase === 'focus') {
          completedFocusSessions += 1
          pendingBreakSuggestions += 1
          lastFocusSeconds = durations.focus
          focusSessionComplete = true
          awaitingBreak = true
          autoPromptVisible = false
          queuedSuggestion = null
          isPrefetchingAutoSuggestion = false
          autoSuggestionError = null
          snoozeUntil = null
          activeSessionId = activeSessionId ?? createSessionId()
          const alreadyLogged = activeSessionId === lastLoggedSessionId
          if (!alreadyLogged) {
            weeklyStats = upsertWeeklyStats(
              weeklyStats,
              todayKey,
              (existing) => ({
                ...existing,
                focusSeconds: existing.focusSeconds + durations.focus,
                focusCount: existing.focusCount + 1,
              })
            )
            totalFocusSeconds += durations.focus
            const sessionEntry: SessionHistoryEntry = {
              id: activeSessionId,
              completedAt: new Date().toISOString(),
              focusMinutes: Number((durations.focus / 60).toFixed(1)),
              mood: state.latestMood,
              suggestion: null,
              cycle: state.cycleStreak + 1,
            }
            sessionHistory = [
              sessionEntry,
              ...sessionHistory.filter((entry) => entry.id !== activeSessionId),
            ].slice(0, 50)
          }

          cycleStreak = alreadyLogged
            ? state.cycleStreak
            : state.cycleStreak + 1
          lastLoggedSessionId = activeSessionId
          activeSessionId = null

          const useLongBreak = cycleStreak >= 4
          if (useLongBreak) {
            showBreakGate = true
            awaitingBreak = false
            targetTimestamp = null
            phase = 'long-break'
            secondsRemaining = durations.longBreak
            shouldStopTicker = true
            cycleStreak = 0
            focusSessionComplete = false
            autoPromptVisible = false
            break
          }
          phase = 'short-break'
          secondsRemaining = durations.shortBreak
        } else {
          totalBreakSeconds +=
            phase === 'short-break' ? durations.shortBreak : durations.longBreak
          focusSessionComplete = false
          awaitingBreak = false
          autoPromptVisible = false
          queuedSuggestion = null
          isPrefetchingAutoSuggestion = false
          autoSuggestionError = null
          snoozeUntil = null
          weeklyStats = upsertWeeklyStats(
            weeklyStats,
            todayKey,
            (existing) => ({
              ...existing,
              breakSeconds:
                existing.breakSeconds +
                (phase === 'short-break'
                  ? durations.shortBreak
                  : durations.longBreak),
              breakCount: existing.breakCount + 1,
            })
          )
          phase = 'focus'
          secondsRemaining = durations.focus
          cycleStreak = state.cycleStreak
          activeSessionId = createSessionId()
        }

        targetTimestamp = now + secondsRemaining * 1000
        const phaseDurationMs = secondsRemaining * 1000

        if (leftoverMs < phaseDurationMs) {
          const remainingMsInPhase = phaseDurationMs - leftoverMs
          secondsRemaining = Math.max(0, Math.ceil(remainingMsInPhase / 1000))
          targetTimestamp = now + remainingMsInPhase
          leftoverMs = -1
          break
        }

        leftoverMs -= phaseDurationMs
        if (leftoverMs <= 0) {
          targetTimestamp = now + secondsRemaining * 1000
          leftoverMs = -1
          break
        }
      }

      return {
        phase,
        secondsRemaining,
        completedFocusSessions,
        totalFocusSeconds,
        totalBreakSeconds,
        pendingBreakSuggestions,
        lastFocusSeconds,
        focusSessionComplete,
        awaitingBreak,
        autoPromptVisible,
        queuedSuggestion,
        isPrefetchingAutoSuggestion,
        autoSuggestionError,
        snoozeUntil,
        sessionHistory,
        weeklyStats,
        targetTimestamp,
        cycleStreak,
        showBreakGate,
        activeSessionId,
        lastLoggedSessionId,
        isRunning: shouldStopTicker ? false : state.isRunning,
      }
    })

    if (shouldStopTicker) {
      clearTimer()
    }
  }

  tick()
  timer = setInterval(tick, 250)
}

const buildInitialState = (durations?: FocusDurations) => {
  const activeDurations = durations ? { ...durations } : { ...defaultDurations }

  return {
    phase: 'focus' as TimerPhase,
    secondsRemaining: activeDurations.focus,
    isRunning: false,
    completedFocusSessions: 0,
    totalFocusSeconds: 0,
    totalBreakSeconds: 0,
    pendingBreakSuggestions: 0,
    durations: activeDurations,
    latestMood: null,
    lastFocusSeconds: null,
    breakSuggestion: null,
    isGeneratingSuggestion: false,
    suggestionError: null,
    targetTimestamp: null,
    focusSessionComplete: false,
    awaitingBreak: false,
    autoPromptVisible: false,
    queuedSuggestion: null,
    isPrefetchingAutoSuggestion: false,
    autoSuggestionError: null,
    snoozeUntil: null,
    sessionCount: 0,
    sessionHistory: [],
    weeklyStats: createInitialWeek(),
    cycleStreak: 0,
    showBreakGate: false,
    autoBrewEnabled: true,
    activeSessionId: null,
    lastLoggedSessionId: null,
  }
}

const persistedState = loadPersistedState()
const baseInitialState = buildInitialState(persistedState.durations)
const initialState = {
  ...baseInitialState,
  ...persistedState,
  durations: persistedState.durations ?? baseInitialState.durations,
  weeklyStats: persistedState.weeklyStats ?? baseInitialState.weeklyStats,
  sessionHistory:
    persistedState.sessionHistory ?? baseInitialState.sessionHistory,
  completedFocusSessions:
    persistedState.completedFocusSessions ??
    baseInitialState.completedFocusSessions,
  totalFocusSeconds:
    persistedState.totalFocusSeconds ?? baseInitialState.totalFocusSeconds,
  totalBreakSeconds:
    persistedState.totalBreakSeconds ?? baseInitialState.totalBreakSeconds,
  cycleStreak: persistedState.cycleStreak ?? baseInitialState.cycleStreak,
  autoBrewEnabled:
    persistedState.autoBrewEnabled ?? baseInitialState.autoBrewEnabled,
  activeSessionId: null,
  lastLoggedSessionId: null,
}

export const useFocusTimer = create<FocusTimerState>((set, get) => ({
  ...initialState,
  start: () => {
    const state = get()
    if (state.isRunning || state.showBreakGate) {
      return
    }

    let secondsRemaining = state.secondsRemaining
    if (secondsRemaining === 0) {
      secondsRemaining = state.durations.focus
      set({
        phase: 'focus',
        secondsRemaining,
        completedFocusSessions: 0,
        pendingBreakSuggestions: 0,
      })
    }

    const targetTimestamp = Date.now() + secondsRemaining * 1000
    let activeSessionId = state.activeSessionId
    if (
      state.phase === 'focus' &&
      secondsRemaining === state.durations.focus &&
      state.showBreakGate === false
    ) {
      if (!activeSessionId || activeSessionId === state.lastLoggedSessionId) {
        activeSessionId = createSessionId()
      }
    }

    set({
      isRunning: true,
      focusSessionComplete: false,
      awaitingBreak: false,
      autoPromptVisible: false,
      queuedSuggestion: null,
      isPrefetchingAutoSuggestion: false,
      autoSuggestionError: null,
      snoozeUntil: null,
      targetTimestamp,
      activeSessionId,
    })
    startTicker(set)
  },
  pause: () => {
    const state = get()
    if (!state.isRunning || state.showBreakGate) {
      return
    }
    clearTimer()
    let secondsRemaining = state.secondsRemaining
    if (state.targetTimestamp) {
      const diff = state.targetTimestamp - Date.now()
      secondsRemaining = Math.max(0, Math.ceil(diff / 1000))
    }
    set({ isRunning: false, targetTimestamp: null, secondsRemaining })
  },
  resume: () => {
    const state = get()
    if (state.isRunning || state.showBreakGate) {
      return
    }

    if (state.secondsRemaining === 0) {
      set({
        phase: 'focus',
        secondsRemaining: state.durations.focus,
      })
    }

    const secondsRemaining = get().secondsRemaining
    set({
      isRunning: true,
      targetTimestamp: Date.now() + secondsRemaining * 1000,
    })
    startTicker(set)
  },
  reset: () => {
    clearTimer()
    const { durations, weeklyStats, sessionHistory } = get()
    set({
      ...buildInitialState(durations),
      durations,
      weeklyStats,
      sessionHistory,
      targetTimestamp: null,
    })
  },
  setDurations: (updates) => {
    set((state) => {
      const durations = { ...state.durations, ...updates }
      let secondsRemaining = state.secondsRemaining

      if (!state.isRunning) {
        if (updates.focus !== undefined && state.phase === 'focus') {
          secondsRemaining = updates.focus
        } else if (
          updates.shortBreak !== undefined &&
          state.phase === 'short-break'
        ) {
          secondsRemaining = updates.shortBreak
        } else if (
          updates.longBreak !== undefined &&
          state.phase === 'long-break'
        ) {
          secondsRemaining = updates.longBreak
        }
      }

      return {
        durations,
        secondsRemaining,
      }
    })
  },
  setMood: (mood) => {
    set({ latestMood: mood })
  },
  clearMood: () => {
    set({ latestMood: null })
  },
  generateBreakSuggestion: async () => {
    const state = get()
    if (state.isGeneratingSuggestion) {
      return
    }

    const focusSeconds = state.lastFocusSeconds ?? state.durations.focus
    set({ isGeneratingSuggestion: true, suggestionError: null })

    try {
      const suggestion = await fetchBreakSuggestion({
        focusMinutes: Math.max(1, Math.round(focusSeconds / 60)),
        mood: state.latestMood,
        previousSuggestion: state.breakSuggestion ?? undefined,
        sessionCount: state.sessionCount + 1,
      })

      set((current) => {
        const updatedHistory = current.sessionHistory.length
          ? [
              {
                ...current.sessionHistory[0],
                suggestion,
              },
              ...current.sessionHistory.slice(1),
            ]
          : current.sessionHistory

        return {
          breakSuggestion: suggestion,
          isGeneratingSuggestion: false,
          suggestionError: null,
          pendingBreakSuggestions:
            current.pendingBreakSuggestions > 0
              ? current.pendingBreakSuggestions - 1
              : 0,
          sessionCount: current.sessionCount + 1,
          sessionHistory: updatedHistory,
        }
      })
    } catch (error) {
      set({
        suggestionError:
          error instanceof Error
            ? error.message
            : 'Failed to brew a fresh suggestion.',
        isGeneratingSuggestion: false,
      })
    }
  },
  clearBreakSuggestion: () => {
    set({ breakSuggestion: null, suggestionError: null })
  },
  prefetchAutoSuggestion: async () => {
    const state = get()
    if (
      !state.autoBrewEnabled ||
      !state.focusSessionComplete ||
      state.isPrefetchingAutoSuggestion ||
      state.queuedSuggestion ||
      (state.snoozeUntil && state.snoozeUntil > Date.now())
    ) {
      return
    }

    const focusSeconds = state.lastFocusSeconds ?? state.durations.focus
    set({ isPrefetchingAutoSuggestion: true, autoSuggestionError: null })

    try {
      const suggestion = await fetchBreakSuggestion({
        focusMinutes: Math.max(1, Math.round(focusSeconds / 60)),
        mood: state.latestMood,
        previousSuggestion: state.breakSuggestion ?? undefined,
        sessionCount: state.sessionCount + 1,
      })

      set({
        queuedSuggestion: suggestion,
        isPrefetchingAutoSuggestion: false,
        autoSuggestionError: null,
      })
    } catch (error) {
      set({
        autoSuggestionError:
          error instanceof Error
            ? error.message
            : 'Gemini needs a refill. Try again soon.',
        isPrefetchingAutoSuggestion: false,
      })
    }
  },
  triggerAutoPrompt: () => {
    const state = get()
    if (!state.focusSessionComplete) {
      return
    }
    set({ autoPromptVisible: true, awaitingBreak: false })
  },
  applyQueuedSuggestion: () => {
    const state = get()
    if (!state.queuedSuggestion) {
      return
    }

    set((current) => {
      const suggestion = current.queuedSuggestion ?? null
      const updatedHistory = current.sessionHistory.length
        ? [
            {
              ...current.sessionHistory[0],
              suggestion,
            },
            ...current.sessionHistory.slice(1),
          ]
        : current.sessionHistory

      return {
        breakSuggestion: suggestion,
        queuedSuggestion: null,
        focusSessionComplete: false,
        awaitingBreak: false,
        autoPromptVisible: false,
        isPrefetchingAutoSuggestion: false,
        autoSuggestionError: null,
        snoozeUntil: null,
        sessionCount: current.sessionCount + 1,
        pendingBreakSuggestions:
          current.pendingBreakSuggestions > 0
            ? current.pendingBreakSuggestions - 1
            : 0,
        sessionHistory: updatedHistory,
      }
    })
  },
  abortAutoSuggestion: () => {
    set({
      queuedSuggestion: null,
      isPrefetchingAutoSuggestion: false,
      autoPromptVisible: false,
      focusSessionComplete: false,
      awaitingBreak: false,
      autoSuggestionError: null,
      snoozeUntil: null,
    })
  },
  snoozeAutoSuggestion: (minutes) => {
    const duration = Math.max(minutes, 1)
    set({
      snoozeUntil: Date.now() + duration * 60_000,
      autoPromptVisible: false,
      awaitingBreak: false,
    })
  },
  resumeAwaitingBreak: () => {
    const state = get()
    if (!state.focusSessionComplete) {
      return
    }
    set({ awaitingBreak: true, autoPromptVisible: false })
  },
  acceptBreakGate: () => {
    const state = get()
    if (!state.showBreakGate) {
      return
    }
    set({
      phase: 'long-break',
      secondsRemaining: state.durations.longBreak,
      isRunning: true,
      showBreakGate: false,
      cycleStreak: 0,
      targetTimestamp: Date.now() + state.durations.longBreak * 1000,
      focusSessionComplete: false,
      autoPromptVisible: false,
      activeSessionId: null,
    })
    if (typeof window !== 'undefined' && 'Audio' in window) {
      try {
        const audio = new Audio('/sounds/steam-soft.wav')
        audio.volume = 0.4
        audio.play().catch(() => {})
      } catch {
        /* ignore */
      }
    }
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        if (Notification.permission === 'default') {
          void Notification.requestPermission()
        }
        if (Notification.permission === 'granted') {
          new Notification('BreakBuddy ☕', {
            body: 'Long break engaged. Hydrate before your keyboard unions.',
            silent: true,
          })
        }
      } catch {
        /* ignore */
      }
    }
    startTicker(set)
  },
  skipBreakGate: () => {
    const state = get()
    if (!state.showBreakGate) {
      return
    }
    set({
      phase: 'focus',
      secondsRemaining: state.durations.focus,
      isRunning: true,
      showBreakGate: false,
      cycleStreak: 0,
      targetTimestamp: Date.now() + state.durations.focus * 1000,
      focusSessionComplete: false,
      autoPromptVisible: false,
      activeSessionId: createSessionId(),
    })
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        if (Notification.permission === 'default') {
          void Notification.requestPermission()
        }
        if (Notification.permission === 'granted') {
          new Notification('BreakBuddy 😒', {
            body: 'Skipping the long break? Fine. Stretch later—if your neck survives.',
            silent: true,
          })
        }
      } catch {
        /* ignore */
      }
    }
    startTicker(set)
  },
  setAutoBrewEnabled: (enabled) => {
    set((state) => {
      if (enabled) {
        return { autoBrewEnabled: true }
      }
      return {
        autoBrewEnabled: false,
        autoPromptVisible: false,
        queuedSuggestion: null,
        isPrefetchingAutoSuggestion: false,
        autoSuggestionError: null,
        snoozeUntil: null,
      }
    })
  },
}))

type PersistTuple = [
  WeeklyStats,
  SessionHistoryEntry[],
  FocusDurations,
  number,
  number,
  number,
  number,
  boolean
]

if (typeof window !== 'undefined') {
  const capture = (state: FocusTimerState): PersistTuple => [
    state.weeklyStats,
    state.sessionHistory,
    state.durations,
    state.completedFocusSessions,
    state.totalFocusSeconds,
    state.totalBreakSeconds,
    state.cycleStreak,
    state.autoBrewEnabled,
  ]

  const persistFromTuple = ([
    weeklyStats,
    sessionHistory,
    durations,
    completedFocusSessions,
    totalFocusSeconds,
    totalBreakSeconds,
    cycleStreak,
    autoBrewEnabled,
  ]: PersistTuple) => {
    persistState({
      weeklyStats,
      sessionHistory,
      durations,
      completedFocusSessions,
      totalFocusSeconds,
      totalBreakSeconds,
      cycleStreak,
      autoBrewEnabled,
    })
  }

  let previous = capture(useFocusTimer.getState())
  persistFromTuple(previous)

  useFocusTimer.subscribe((state) => {
    const next = capture(state)

    if (
      previous[0] === next[0] &&
      previous[1] === next[1] &&
      previous[2] === next[2] &&
      previous[3] === next[3] &&
      previous[4] === next[4] &&
      previous[5] === next[5] &&
      previous[6] === next[6] &&
      previous[7] === next[7]
    ) {
      return
    }

    previous = next
    persistFromTuple(next)
  })
}
