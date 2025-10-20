import { create } from 'zustand'
import { createFocusTimerActions } from './focusTimer/actions.ts'
import { computeInitialState } from './focusTimer/state.ts'
import { registerPersistenceSubscription } from './focusTimer/subscriptions.ts'
import type { FocusTimerState } from './focusTimer/types.ts'

export const useFocusTimer = create<FocusTimerState>((set, get) => ({
  ...computeInitialState(),
  ...createFocusTimerActions(set, get),
}))

registerPersistenceSubscription(useFocusTimer)

export type { FocusDurations, FocusTimerState } from './focusTimer/types.ts'
