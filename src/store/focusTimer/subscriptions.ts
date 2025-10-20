import type { StoreApi } from 'zustand'
import { persistState } from './persistence.ts'
import type {
  FocusDurations,
  FocusTimerData,
  FocusTimerState,
  SessionHistoryEntry,
} from './types.ts'

type PersistTuple = [
  FocusTimerData['weeklyStats'],
  SessionHistoryEntry[],
  FocusDurations,
  number,
  number,
  number,
  number,
  boolean
]

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

export const registerPersistenceSubscription = (
  store: StoreApi<FocusTimerState>
) => {
  if (typeof window === 'undefined') {
    return
  }

  let previous = capture(store.getState())
  persistFromTuple(previous)

  store.subscribe((state) => {
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
