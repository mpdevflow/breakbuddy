import type { FC } from 'react'
import type { MoodType } from '../../types/mood'

type DashboardChipsProps = {
  moodChipClass: string
  suggestionChipClass: string
  moodLabel: string
  latestMood: MoodType | null
  suggestionPreview: string
  shouldScrollSuggestion: boolean
  onMoodClick: () => void
  onSuggestionClick: () => void
}

const DashboardChips: FC<DashboardChipsProps> = ({
  moodChipClass,
  suggestionChipClass,
  moodLabel,
  latestMood,
  suggestionPreview,
  shouldScrollSuggestion,
  onMoodClick,
  onSuggestionClick,
}) => (
  <div className="relative flex flex-col gap-3 pb-2 min-[641px]:flex-row min-[641px]:items-center min-[641px]:justify-between">
    <button
      type="button"
      onClick={onMoodClick}
      className={`${moodChipClass} w-full min-[641px]:max-w-xs`}
      aria-label="Update mood"
    >
      <span className="chip-steam" aria-hidden />
      <span className="text-[11px] uppercase tracking-[0.35em] text-white/50">
        Mood
      </span>
      <span className="text-sm font-semibold text-white/90">
        {latestMood ?? '☕'} {moodLabel}
      </span>
    </button>
    <button
      type="button"
      onClick={onSuggestionClick}
      className={`${suggestionChipClass} w-full min-[641px]:flex-1 min-[641px]:min-w-0`}
      aria-label="View last suggestion"
    >
      <span className="text-[11px] uppercase tracking-[0.35em] text-white/50">
        Last Suggestion Logged
      </span>
    </button>
    <div
      className={`pointer-events-none absolute bottom-[-28px] left-0 w-full text-center text-[11px] uppercase tracking-[0.35em] text-white/45 min-[641px]:hidden ${
        shouldScrollSuggestion ? 'chip-scroll--marquee' : ''
      }`}
    >
      <span className="chip-scroll-inner block overflow-hidden text-sm text-white/80">
        {suggestionPreview}
      </span>
    </div>
  </div>
)

export default DashboardChips
