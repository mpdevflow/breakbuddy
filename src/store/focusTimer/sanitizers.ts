import type { MoodType } from '../../types/mood.ts'
import { defaultDurations, validMoods } from './constants.ts'
import { createDayStats, formatDayKey } from './stats.ts'
import type {
  FocusDurations,
  SessionHistoryEntry,
  WeeklyStats,
} from './types.ts'

export const sanitizeNumber = (value: unknown) => {
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

export const sanitizeBoolean = (value: unknown, fallback: boolean) => {
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

export const sanitizeDurations = (
  value: unknown
): FocusDurations | undefined => {
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

export const sanitizeWeeklyStats = (
  value: unknown
): WeeklyStats | undefined => {
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

export const sanitizeSessionHistory = (
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
        typeof entry.mood === 'string' &&
        validMoods.has(entry.mood as MoodType)
          ? (entry.mood as SessionHistoryEntry['mood'])
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
