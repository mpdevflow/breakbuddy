import { upsertWeeklyStats, formatDayKey } from './stats.ts'
import {
  createSessionId,
  getActiveSessionId,
  getLastLoggedSessionId,
  setActiveSessionId,
  setLastLoggedSessionId,
} from './sessionTracker.ts'
import type { FocusTimerState, SessionHistoryEntry } from './types.ts'

type StateSetter = (
  partial:
    | Partial<FocusTimerState>
    | ((state: FocusTimerState) => Partial<FocusTimerState> | FocusTimerState)
) => void

let timer: ReturnType<typeof setInterval> | null = null

export const clearTimer = () => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

export const startTicker = (set: StateSetter) => {
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

      let activeId = getActiveSessionId()
      let lastLoggedId = getLastLoggedSessionId()

      let safety = 0
      while (leftoverMs >= 0 && safety < 24) {
        safety += 1
        if (phase === 'focus') {
          if (!activeId) {
            activeId = createSessionId()
            setActiveSessionId(activeId)
          }
          const alreadyLogged = activeId === lastLoggedId
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
              id: activeId,
              completedAt: new Date().toISOString(),
              focusMinutes: Number((durations.focus / 60).toFixed(1)),
              mood: state.latestMood,
              suggestion: null,
              cycle: state.cycleStreak + 1,
            }
            sessionHistory = [
              sessionEntry,
              ...sessionHistory.filter((entry) => entry.id !== activeId),
            ].slice(0, 50)
          }

          cycleStreak = alreadyLogged
            ? state.cycleStreak
            : state.cycleStreak + 1
          setLastLoggedSessionId(activeId)
          lastLoggedId = activeId
          setActiveSessionId(null)
          activeId = null

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
          const newSessionId = createSessionId()
          setActiveSessionId(newSessionId)
          activeId = newSessionId
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
