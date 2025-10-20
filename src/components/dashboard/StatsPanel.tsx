import type { FC } from 'react'
import { formatMinutes } from '../../utils/formatMinutes'

type StatsPanelProps = {
  totalFocusSeconds: number
  totalBreakSeconds: number
  completedFocusSessions: number
  cycleIndex: number
  showCompletionFlash: boolean
  breakSuggestion: string | null
  queuedSuggestion: string | null
  suggestionError: string | null
  isGeneratingSuggestion: boolean
  showBreakGate: boolean
  onManualBrew: () => void
  onClearSuggestion: () => void
}

const StatsPanel: FC<StatsPanelProps> = ({
  totalFocusSeconds,
  totalBreakSeconds,
  completedFocusSessions,
  cycleIndex,
  showCompletionFlash,
  breakSuggestion,
  queuedSuggestion,
  suggestionError,
  isGeneratingSuggestion,
  showBreakGate,
  onManualBrew,
  onClearSuggestion,
}) => {
  const focusMinutesLabel = formatMinutes(totalFocusSeconds)
  const breakMinutesLabel = formatMinutes(totalBreakSeconds)
  const suggestionText = breakSuggestion ?? queuedSuggestion

  return (
    <aside className="hidden flex-col gap-6 min-[641px]:flex">
      <article className="glass-panel glow-card-soft rounded-3xl p-6 transition duration-300 hover:border-neonPink/40 hover:shadow-[0_0_8px_rgba(255,0,110,0.25)] animate-float-up">
        <p className="text-xs uppercase tracking-[0.35em] text-white/40">
          Focus Logged
        </p>
        <p className="mt-3 text-3xl font-semibold text-neonPink">
          {focusMinutesLabel} min
        </p>
        <p className="mt-2 text-xs uppercase tracking-[0.3em] text-white/40">
          {completedFocusSessions} completed sprints
        </p>
      </article>
      <article className="glass-panel glow-card-soft-gold rounded-3xl p-6 transition duration-300 hover:border-neonGold/45 hover:shadow-[0_0_8px_rgba(255,214,10,0.28)] animate-float-up">
        <p className="text-xs uppercase tracking-[0.35em] text-white/40">
          Break Logged
        </p>
        <p className="mt-3 text-3xl font-semibold text-neonGold [text-shadow:0_0_6px_rgba(255,214,10,0.35)]">
          {breakMinutesLabel} min
        </p>
        <p className="mt-2 text-xs uppercase tracking-[0.3em] text-white/40">
          Includes short and long recoveries
        </p>
      </article>
      <article className="glass-panel glow-card-soft rounded-3xl p-6 transition duration-300 hover:border-white/25 hover:shadow-[0_0_8px_rgba(255,255,255,0.18)] animate-float-up">
        <p className="text-xs uppercase tracking-[0.35em] text-white/40">
          Current Cycle
        </p>
        <p className="mt-3 text-lg font-semibold text-white/80">
          Session {cycleIndex} of 4
        </p>
        <p className="mt-2 text-xs uppercase tracking-[0.3em] text-white/40">
          Long break hits after four focus sprints
        </p>
      </article>
      <article
        className={`glass-panel rounded-3xl p-6 transition duration-300 animate-float-up ${
          showCompletionFlash ? 'glow-card-soft-gold' : 'glow-card-soft'
        } hover:border-neonPink/40 hover:shadow-[0_0_8px_rgba(255,0,110,0.25)]`}
        style={{ animationDelay: '0.12s' }}
      >
        <p className="text-xs uppercase tracking-[0.35em] text-white/40">
          Break Suggestion
        </p>
        <p className="mt-3 text-sm text-white/80">
          {suggestionText ??
            'Finish a focus sprint and tap Brew Suggestion for a freshly sarcastic break prompt.'}
        </p>
        {suggestionError && (
          <p className="mt-3 text-xs font-medium text-neonPink/80">
            {suggestionError}
          </p>
        )}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onManualBrew}
            disabled={isGeneratingSuggestion || showBreakGate}
            className="btn-animated inline-flex rounded-full border border-neonPink/45 bg-neonPink/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-neonGold hover:border-neonPink/60 hover:bg-neonPink/28 focus:outline-none focus-visible:ring-2 focus-visible:ring-neonPink/50 glow-button-active disabled:cursor-not-allowed disabled:scale-100 disabled:border-white/10 disabled:bg-transparent disabled:text-white/30"
          >
            {isGeneratingSuggestion ? 'Brewing…' : 'Brew Suggestion'}
          </button>
          {suggestionText && (
            <button
              type="button"
              onClick={onClearSuggestion}
              disabled={showBreakGate}
              className="btn-animated inline-flex rounded-full border border-white/18 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white/60 hover:border-white/35 hover:text-neonPink focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 glow-button-soft disabled:cursor-not-allowed disabled:scale-100 disabled:border-white/10 disabled:bg-transparent disabled:text-white/30"
            >
              Clear
            </button>
          )}
        </div>
      </article>
    </aside>
  )
}

export default StatsPanel
