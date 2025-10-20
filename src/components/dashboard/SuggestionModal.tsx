import type { FC } from 'react'

type SuggestionModalProps = {
  open: boolean
  suggestion: string | null
  error: string | null
  isGenerating: boolean
  hasQueuedSuggestion: boolean
  onBrew: () => void
  onSnooze: () => void
  onClose: () => void
}

const SuggestionModal: FC<SuggestionModalProps> = ({
  open,
  suggestion,
  error,
  isGenerating,
  hasQueuedSuggestion,
  onBrew,
  onSnooze,
  onClose,
}) => {
  if (!open) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-xl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="suggestion-modal-title"
    >
      <div className="glass-panel glow-card-strong relative w-full max-w-lg rounded-3xl px-6 py-8 text-left shadow-[0_0_25px_rgba(255,0,110,0.12)]">
        <p
          id="suggestion-modal-title"
          className="text-xs uppercase tracking-[0.45em] text-neonGold/70"
        >
          Break Suggestion
        </p>
        <h3 className="mt-3 text-2xl font-semibold text-neonPink">
          {suggestion ? 'You earned a refill break.' : 'Nothing brewing yet.'}
        </h3>
        <p className="mt-4 text-sm text-white/80">
          {suggestion ??
            'Wrap a focus sprint and we will queue something delicious.'}
        </p>
        {error && (
          <p className="mt-3 text-xs font-medium text-neonPink/70">{error}</p>
        )}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onBrew}
            disabled={isGenerating || (!suggestion && !hasQueuedSuggestion)}
            className="btn-animated w-full rounded-full border border-neonPink/45 bg-neonPink/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-neonGold hover:border-neonPink/60 hover:bg-neonPink/28 glow-button-active disabled:cursor-not-allowed disabled:scale-100 disabled:border-white/10 disabled:bg-transparent disabled:text-white/30"
          >
            {isGenerating
              ? 'Brewing…'
              : suggestion
              ? 'Brew Another'
              : 'Brew It'}
          </button>
          <button
            type="button"
            onClick={onSnooze}
            className="btn-animated w-full rounded-full border border-white/18 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white/60 hover:border-white/35 hover:text-neonPink glow-button-soft"
          >
            Snooze 5m
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="btn-animated mt-4 w-full rounded-full border border-white/12 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-white/50 hover:border-white/25 hover:text-neonPink"
        >
          Close
        </button>
      </div>
    </div>
  )
}

export default SuggestionModal
