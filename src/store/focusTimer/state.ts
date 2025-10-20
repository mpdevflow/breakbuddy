import { defaultDurations } from './constants.ts'
import { loadPersistedState } from './persistence.ts'
import { createInitialWeek } from './stats.ts'
import type { FocusDurations, FocusTimerData, TimerPhase } from './types.ts'

export const buildInitialState = (
  durations?: FocusDurations
): FocusTimerData => {
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
  }
}

export const computeInitialState = (): FocusTimerData => {
  const persisted = loadPersistedState()
  const base = buildInitialState(persisted.durations)

  return {
    ...base,
    ...persisted,
    durations: persisted.durations ?? base.durations,
    weeklyStats: persisted.weeklyStats ?? base.weeklyStats,
    sessionHistory: persisted.sessionHistory ?? base.sessionHistory,
    completedFocusSessions:
      persisted.completedFocusSessions ?? base.completedFocusSessions,
    totalFocusSeconds: persisted.totalFocusSeconds ?? base.totalFocusSeconds,
    totalBreakSeconds: persisted.totalBreakSeconds ?? base.totalBreakSeconds,
    cycleStreak: persisted.cycleStreak ?? base.cycleStreak,
    autoBrewEnabled: persisted.autoBrewEnabled ?? base.autoBrewEnabled,
  }
}
