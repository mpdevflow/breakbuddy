import type { FC } from 'react'

type BreakGateModalProps = {
  open: boolean
  onAccept: () => void
  onSkip: () => void
}

const BreakGateModal: FC<BreakGateModalProps> = ({
  open,
  onAccept,
  onSkip,
}) => {
  if (!open) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-xl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="break-gate-title"
    >
      <div className="glass-panel glow-card-strong relative w-full max-w-lg rounded-3xl px-6 py-8 text-left shadow-[0_0_28px_rgba(255,0,110,0.15)]">
        <p
          id="break-gate-title"
          className="text-xs uppercase tracking-[0.45em] text-neonGold/70"
        >
          Long Break Unlocked
        </p>
        <h3 className="mt-3 text-2xl font-semibold text-neonPink">
          Your focus bar is overfilled.
        </h3>
        <p className="mt-4 text-sm text-white/80">
          Take the long break. Hydrate. Stretch. Pretend to look away from your
          monitor. Skip only if you enjoy refactoring your spine later.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onAccept}
            className="btn-animated w-full rounded-full border border-neonGold/45 bg-neonGold/20 px-4 py-3 text-xs font-semibold uppercase tracking-[0.45em] text-neonGold hover:border-neonGold/65 hover:bg-neonGold/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-neonGold/40 glow-button-active"
          >
            Start Break (recommended)
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="btn-animated w-full rounded-full border border-neonPink/45 bg-transparent px-4 py-3 text-xs font-semibold uppercase tracking-[0.45em] text-white/70 hover:border-neonPink/55 hover:text-neonPink glow-button-soft"
          >
            Skip Break (not recommended)
          </button>
        </div>
      </div>
    </div>
  )
}

export default BreakGateModal
