import type { MoodType } from '../../types/mood.ts'

export const defaultDurations = {
  focus: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
} as const

export const STORAGE_KEY = 'breakbuddy:focus-timer:v1'

export const validMoods = new Set<MoodType>(['😎', '😴', '😠', '🧠', '❤️'])
