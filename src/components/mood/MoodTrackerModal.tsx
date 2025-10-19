import type { MoodType } from '../../types/mood.ts'

type MoodTrackerModalProps = {
  open: boolean
  currentMood: MoodType | null
  onSelect: (mood: MoodType) => void
  onClear: () => void
  onClose: () => void
}

const MOODS: MoodType[] = ['😎', '😴', '😠', '🧠', '❤️']

function MoodTrackerModal({
  open,
  currentMood,
  onSelect,
  onClear,
  onClose,
}: MoodTrackerModalProps) {
  if (!open) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mood-tracker-title"
    >
      <div className="glass-panel glow-card-strong w-[min(90vw,420px)] rounded-3xl bg-cafeShadow/95 p-8 shadow-[0_0_25px_rgba(255,0,110,0.12)]">
        <header className="text-center">
          <p
            id="mood-tracker-title"
            className="text-xs uppercase tracking-[0.45em] text-neonGold/70"
          >
            Mood Check
          </p>
          <h2 className="heading-glow-pink mt-4 text-2xl font-semibold text-neonPink">
            How&apos;s the vibe?
          </h2>
          <p className="mt-3 text-sm text-white/70">
            Pick the emoji that matches your current energy. We&apos;ll keep it
            on file for future snark.
          </p>
        </header>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          {MOODS.map((mood) => {
            const selected = currentMood === mood
            return (
              <button
                key={mood}
                type="button"
                onClick={() => onSelect(mood)}
                className={`btn-animated flex h-16 w-16 items-center justify-center rounded-2xl border text-3xl transition ${
                  selected
                    ? 'border-neonPink/60 bg-neonPink/18 text-neonGold glow-button-active'
                    : 'border-white/15 bg-white/5 text-white/80 glow-button-soft hover:border-neonPink/35 hover:bg-neonPink/12 hover:text-neonGold'
                }`}
                aria-label={`Select mood ${mood}`}
              >
                {mood}
              </button>
            )
          })}
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-4 text-xs uppercase tracking-[0.35em]">
          <button
            type="button"
            onClick={onClear}
            className="btn-animated rounded-full border border-white/18 px-5 py-2 text-white/60 hover:border-white/35 hover:text-neonPink glow-button-soft"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={onClose}
            className="btn-animated rounded-full border border-neonPink/55 bg-neonPink/20 px-6 py-2 text-neonGold hover:border-neonPink/70 hover:bg-neonPink/28 glow-button-active"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

export default MoodTrackerModal
