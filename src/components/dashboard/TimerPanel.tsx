import type { FC } from 'react'
import type { FocusDurations } from '../../store/useFocusTimer'

type DurationPresetProps = {
  label: string
  activeMinutes: number
  options: readonly number[]
  onSelect: (minutes: number) => void
}

const DurationPresetGroup: FC<DurationPresetProps> = ({
  label,
  activeMinutes,
  options,
  onSelect,
}) => (
  <div className="flex flex-col items-center gap-2 text-center text-xs uppercase tracking-[0.35em] text-white/50 min-[641px]:flex-row min-[641px]:items-center min-[641px]:text-left">
    <span className="w-full text-white/40 min-[641px]:w-32">{label}</span>
    <div className="flex w-full items-center justify-center gap-2 min-[641px]:w-auto min-[641px]:justify-start">
      {options.map((option) => {
        const isActive = option === activeMinutes
        return (
          <button
            key={option}
            type="button"
            onClick={() => onSelect(option)}
            className={`btn-animated rounded-full border px-4 py-2 tracking-[0.3em] ${
              isActive
                ? 'border-neonPink/60 bg-neonPink/20 text-neonGold glow-button-active'
                : 'border-white/15 bg-transparent text-white/60 glow-button-soft hover:border-neonPink/35 hover:bg-neonPink/10 hover:text-neonPink'
            }`}
          >
            {option}m
          </button>
        )
      })}
    </div>
  </div>
)

type TimerPanelProps = {
  statusLabel: string
  statusAccent: string
  statusBlurb: string
  formattedClock: string
  isRunning: boolean
  showCompletionFlash: boolean
  breakSuggestion: string | null
  queuedSuggestion: string | null
  focusMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
  setDurations: (updates: Partial<FocusDurations>) => void
  showStart: boolean
  showResume: boolean
  showBreakGate: boolean
  start: () => void
  pause: () => void
  resume: () => void
  reset: () => void
}

const TimerPanel: FC<TimerPanelProps> = ({
  statusLabel,
  statusAccent,
  statusBlurb,
  formattedClock,
  isRunning,
  showCompletionFlash,
  breakSuggestion,
  queuedSuggestion,
  focusMinutes,
  shortBreakMinutes,
  longBreakMinutes,
  setDurations,
  showStart,
  showResume,
  showBreakGate,
  start,
  pause,
  resume,
  reset,
}) => (
  <article className="glass-panel glow-card-strong rounded-3xl p-6 min-[641px]:p-8 min-[1025px]:p-12 transition duration-300 hover:border-neonPink/45 hover:shadow-[0_0_10px_rgba(255,0,110,0.35)] animate-float-up">
    <div className="relative flex w-full flex-col items-center gap-6 text-center">
      <p
        className={`text-xs uppercase tracking-[0.45em] text-white/60 ${statusAccent}`}
      >
        {statusLabel}
      </p>
      <div
        className={`glow-timer-ring ${
          isRunning ? 'glow-timer-ring--active' : ''
        } ${isRunning && !showCompletionFlash ? 'timer-heartbeat' : ''} ${
          showCompletionFlash ? 'glow-timer-ring--flash' : ''
        }`}
      >
        <span
          className="timer-steam"
          aria-hidden
          style={{
            opacity: isRunning ? 0.35 : 0.2,
            animationPlayState: isRunning ? 'running' : 'paused',
          }}
        />
        <p
          className={`text-7xl font-semibold text-white ${
            isRunning && !showCompletionFlash
              ? 'glow-timer-active'
              : 'glow-timer-idle'
          }`}
        >
          {formattedClock}
        </p>
      </div>
      <div
        className={`running-indicator ${
          isRunning && !showCompletionFlash ? 'running-indicator--active' : ''
        }`}
        aria-live="polite"
      >
        Running…
      </div>
      <p className="max-w-lg text-sm text-white/70">{statusBlurb}</p>
      {(breakSuggestion || queuedSuggestion) && !showCompletionFlash && (
        <p className="suggestion-strip suggestion-strip--visible">
          {breakSuggestion ?? queuedSuggestion}
        </p>
      )}

      <div className="flex flex-col gap-3 text-[10px] sm:text-xs">
        <DurationPresetGroup
          label="Focus"
          activeMinutes={focusMinutes}
          options={[15, 25, 45]}
          onSelect={(minutes) => setDurations({ focus: minutes * 60 })}
        />
        <DurationPresetGroup
          label="Short Break"
          activeMinutes={shortBreakMinutes}
          options={[3, 5, 10]}
          onSelect={(minutes) => setDurations({ shortBreak: minutes * 60 })}
        />
        <DurationPresetGroup
          label="Long Break"
          activeMinutes={longBreakMinutes}
          options={[10, 15, 20]}
          onSelect={(minutes) => setDurations({ longBreak: minutes * 60 })}
        />
      </div>

      <div className="hidden flex-wrap items-center justify-center gap-4 min-[641px]:flex">
        {showStart && (
          <button
            type="button"
            onClick={start}
            disabled={showBreakGate}
            className="btn-animated inline-flex items-center justify-center rounded-full border border-neonPink/55 bg-neonPink/20 px-6 py-3 text-xs font-semibold uppercase tracking-[0.45em] text-neonGold hover:border-neonPink/70 hover:bg-neonPink/28 focus:outline-none focus-visible:ring-2 focus-visible:ring-neonPink/50 glow-button-active disabled:cursor-not-allowed disabled:opacity-60"
          >
            Start Sprint
          </button>
        )}
        {!showStart && (
          <button
            type="button"
            onClick={pause}
            disabled={!isRunning || showBreakGate}
            className="btn-animated inline-flex items-center justify-center rounded-full border border-white/18 bg-white/10 px-6 py-3 text-xs font-semibold uppercase tracking-[0.45em] text-white/80 hover:border-white/35 hover:bg-white/18 disabled:cursor-not-allowed disabled:scale-100 disabled:border-white/10 disabled:bg-white/5 disabled:text-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 glow-button-soft"
          >
            Pause
          </button>
        )}
        {showResume && (
          <button
            type="button"
            onClick={resume}
            disabled={showBreakGate}
            className="btn-animated inline-flex items-center justify-center rounded-full border border-neonPink/55 bg-neonPink/20 px-6 py-3 text-xs font-semibold uppercase tracking-[0.45em] text-neonGold hover:border-neonPink/70 hover:bg-neonPink/28 focus:outline-none focus-visible:ring-2 focus-visible:ring-neonPink/50 glow-button-active disabled:cursor-not-allowed disabled:opacity-60"
          >
            Resume
          </button>
        )}
        <button
          type="button"
          onClick={reset}
          disabled={showBreakGate}
          className="btn-animated inline-flex items-center justify-center rounded-full border border-white/15 bg-transparent px-6 py-3 text-xs font-semibold uppercase tracking-[0.45em] text-white/60 hover:border-white/35 hover:text-neonPink focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 glow-button-soft disabled:cursor-not-allowed disabled:opacity-60"
        >
          Reset
        </button>
      </div>
    </div>
  </article>
)

export default TimerPanel
