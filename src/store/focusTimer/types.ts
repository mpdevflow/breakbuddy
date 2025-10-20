import type { MoodType } from '../../types/mood.ts'

export type FocusDurations = {
  focus: number
  shortBreak: number
  longBreak: number
}

export type TimerPhase = 'focus' | 'short-break' | 'long-break'

export type DayStats = {
  focusSeconds: number
  breakSeconds: number
  focusCount: number
  breakCount: number
}

export type WeeklyStats = Record<string, DayStats>

export type SessionHistoryEntry = {
  id: string
  completedAt: string
  focusMinutes: number
  mood: MoodType | null
  suggestion: string | null
  cycle: number
}

export type FocusTimerData = {
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
}

export type FocusTimerActions = {
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
}

export type FocusTimerState = FocusTimerData & FocusTimerActions

export type PersistedSnapshot = Pick<
  FocusTimerData,
  | 'weeklyStats'
  | 'sessionHistory'
  | 'durations'
  | 'completedFocusSessions'
  | 'totalFocusSeconds'
  | 'totalBreakSeconds'
  | 'cycleStreak'
  | 'autoBrewEnabled'
>
