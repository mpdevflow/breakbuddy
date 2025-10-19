import { useCallback, useMemo, useState } from 'react'

const suggestions = [
  'Stretch those wrists before they mutiny.',
  'Hydrate like the caffeinated champion you are.',
  'Stand up, stare into the middle distance, pretend you are refactoring life.',
  'Neck rolls now, merge conflicts later.',
  'Inhale confidence, exhale bug reports.',
]

function Landing() {
  const initialSuggestion = useMemo(
    () => suggestions[Math.floor(Math.random() * suggestions.length)],
    []
  )

  const [currentSuggestion, setCurrentSuggestion] = useState(initialSuggestion)

  const brewAnother = useCallback(() => {
    setCurrentSuggestion((prev) => {
      const filtered = suggestions.filter((entry) => entry !== prev)
      if (filtered.length === 0) {
        return prev
      }
      return filtered[Math.floor(Math.random() * filtered.length)]
    })
  }, [])

  return (
    <section className="flex flex-1 flex-col items-center justify-center px-2 text-center sm:px-4">
      <div className="glass-panel glow-card-strong relative mb-10 flex w-full max-w-2xl flex-col items-center overflow-hidden rounded-[32px] px-6 py-10 backdrop-blur-md sm:px-10 sm:py-14 animate-float-up">
        <span
          className="pointer-events-none absolute -top-20 right-10 h-56 w-56 rounded-full bg-neonPink/25 blur-[120px] animate-neon-pulse"
          aria-hidden
        />
        <span
          className="pointer-events-none absolute bottom-[-120px] left-[-60px] h-64 w-64 rounded-full bg-neonGold/15 blur-[120px] animate-neon-pulse"
          aria-hidden
        />
        <p className="text-[10px] uppercase tracking-[0.55em] text-neonGold/70 sm:text-xs">
          Your break concierge
        </p>
        <h1 className="heading-glow-pink mt-5 text-3xl font-semibold text-neonPink sm:text-5xl">
          Take a breather, dev.
        </h1>
        <p className="mt-6 max-w-xl text-base text-white/80 sm:text-lg">
          {currentSuggestion}
        </p>
        <button
          type="button"
          onClick={brewAnother}
          className="btn-animated mt-10 inline-flex items-center justify-center rounded-full border border-neonPink/45 bg-neonPink/18 px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.5em] text-neonGold hover:border-neonPink/60 hover:bg-neonPink/26 focus:outline-none focus-visible:ring-2 focus-visible:ring-neonPink/50 glow-button-active"
        >
          Brew another suggestion
        </button>
        <div className="mt-10 flex flex-wrap justify-center gap-3 text-[10px] uppercase tracking-[0.45em] text-white/40 sm:text-xs">
          <span>sarcastic</span>
          <span className="text-neonPink/60">•</span>
          <span>caffeinated</span>
          <span className="text-neonPink/60">•</span>
          <span>guarding your recharge time</span>
        </div>
      </div>
      <p className="max-w-md text-xs uppercase tracking-[0.45em] text-white/35 sm:text-[11px]">
        hydration reminders, stretch roasts, and neon compassion on standby.
      </p>
    </section>
  )
}

export default Landing
