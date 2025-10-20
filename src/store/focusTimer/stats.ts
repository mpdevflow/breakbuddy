import type { DayStats, WeeklyStats } from './types.ts'

export const createDayStats = (): DayStats => ({
  focusSeconds: 0,
  breakSeconds: 0,
  focusCount: 0,
  breakCount: 0,
})

export const formatDayKey = (date: Date) => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const createInitialWeek = (): WeeklyStats => {
  const stats: WeeklyStats = {}
  const today = new Date()
  for (let i = 6; i >= 0; i -= 1) {
    const day = new Date(today)
    day.setDate(today.getDate() - i)
    stats[formatDayKey(day)] = createDayStats()
  }
  return stats
}

export const upsertWeeklyStats = (
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
