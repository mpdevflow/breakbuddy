import { STORAGE_KEY } from './constants.ts'
import {
  sanitizeBoolean,
  sanitizeDurations,
  sanitizeNumber,
  sanitizeSessionHistory,
  sanitizeWeeklyStats,
} from './sanitizers.ts'
import type { PersistedSnapshot } from './types.ts'

export const loadPersistedState = (): Partial<PersistedSnapshot> => {
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

    const completedFocusSessions = sanitizeNumber(
      parsed.completedFocusSessions
    )
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

export const persistState = (state: PersistedSnapshot) => {
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
