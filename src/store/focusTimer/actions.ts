import { fetchBreakSuggestion } from '../../services/geminiClient.ts'
import type { MoodType } from '../../types/mood.ts'
import {
  createSessionId,
  getActiveSessionId,
  getLastLoggedSessionId,
  resetSessionTracker,
  setActiveSessionId,
} from './sessionTracker.ts'
import { buildInitialState } from './state.ts'
import { clearTimer, startTicker } from './ticker.ts'
import type {
  FocusDurations,
  FocusTimerActions,
  FocusTimerState,
} from './types.ts'

type Setter = (
  partial:
    | Partial<FocusTimerState>
    | ((state: FocusTimerState) => Partial<FocusTimerState> | FocusTimerState)
) => void

type Getter = () => FocusTimerState

export const createFocusTimerActions = (
  set: Setter,
  get: Getter
): FocusTimerActions => ({
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
    if (
      state.phase === 'focus' &&
      secondsRemaining === state.durations.focus &&
      !state.showBreakGate
    ) {
      const currentActiveId = getActiveSessionId()
      const lastLoggedId = getLastLoggedSessionId()
      if (!currentActiveId || currentActiveId === lastLoggedId) {
        setActiveSessionId(createSessionId())
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
    resetSessionTracker()
    set({
      ...buildInitialState(durations),
      durations,
      weeklyStats,
      sessionHistory,
      targetTimestamp: null,
    })
  },
  setDurations: (updates: Partial<FocusDurations>) => {
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
  setMood: (mood: MoodType) => {
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

      const lastLoggedId = getLastLoggedSessionId()
      set((current) => {
        const updatedHistory = current.sessionHistory.map((entry, index) => {
          if (index === 0 && entry.id === lastLoggedId) {
            return { ...entry, suggestion }
          }
          if (entry.id === lastLoggedId) {
            return { ...entry, suggestion }
          }
          return entry
        })

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

    const lastLoggedId = getLastLoggedSessionId()
    set((current) => {
      const suggestion = current.queuedSuggestion ?? null
      const updatedHistory = current.sessionHistory.map((entry) => {
        if (entry.id === lastLoggedId) {
          return { ...entry, suggestion }
        }
        return entry
      })

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
    setActiveSessionId(null)
    set({
      phase: 'long-break',
      secondsRemaining: state.durations.longBreak,
      isRunning: true,
      showBreakGate: false,
      cycleStreak: 0,
      targetTimestamp: Date.now() + state.durations.longBreak * 1000,
      focusSessionComplete: false,
      autoPromptVisible: false,
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
    setActiveSessionId(createSessionId())
    set({
      phase: 'focus',
      secondsRemaining: state.durations.focus,
      isRunning: true,
      showBreakGate: false,
      cycleStreak: 0,
      targetTimestamp: Date.now() + state.durations.focus * 1000,
      focusSessionComplete: false,
      autoPromptVisible: false,
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
})
