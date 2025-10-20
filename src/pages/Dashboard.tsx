import { useEffect, useMemo, useRef, useState } from 'react'
import MoodTrackerModal from '../components/mood/MoodTrackerModal.tsx'
import { useFocusTimer } from '../store/useFocusTimer.ts'
import { formatMinutes } from '../utils/formatMinutes.ts'

const PHASE_COPY = {
  focus: {
    label: 'Focus Sprint',
    accent: 'text-neonPink',
    blurb:
      'Write code, ship vibes. No context switching, no Slack doomscrolling.',
  },
  'short-break': {
    label: 'Short Break',
    accent: 'text-neonGold',
    blurb: 'Five minutes to stretch, sip, or roast latest tech drama.',
  },
  'long-break': {
    label: 'Long Break',
    accent: 'text-neonGold',
    blurb: 'Fifteen to reset your brain and pretend you touch grass.',
  },
} as const

const FOCUS_PRESETS = [15, 25, 45] as const
const SHORT_BREAK_PRESETS = [3, 5, 10] as const
const LONG_BREAK_PRESETS = [10, 15, 20] as const

type DurationPresetProps = {
  label: string
  activeMinutes: number
  options: readonly number[]
  onSelect: (minutes: number) => void
}

const DurationPresetGroup = ({
  label,
  activeMinutes,
  options,
  onSelect,
}: DurationPresetProps) => (
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

const formatClock = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0')
  return `${mins}:${secs}`
}

function Dashboard() {
  const {
    phase,
    secondsRemaining,
    isRunning,
    completedFocusSessions,
    totalFocusSeconds,
    totalBreakSeconds,
    pendingBreakSuggestions,
    latestMood,
    breakSuggestion,
    isGeneratingSuggestion,
    suggestionError,
    focusSessionComplete,
    awaitingBreak,
    autoPromptVisible,
    queuedSuggestion,
    isPrefetchingAutoSuggestion,
    autoSuggestionError,
    snoozeUntil,
    cycleStreak,
    showBreakGate,
    acceptBreakGate,
    skipBreakGate,
    autoBrewEnabled,
    setAutoBrewEnabled,
    durations,
    setDurations,
    start,
    pause,
    resume,
    reset,
    setMood,
    clearMood,
    generateBreakSuggestion,
    clearBreakSuggestion,
    prefetchAutoSuggestion,
    triggerAutoPrompt,
    applyQueuedSuggestion,
    abortAutoSuggestion,
    snoozeAutoSuggestion,
    resumeAwaitingBreak,
  } = useFocusTimer()

  const [isMoodModalOpen, setMoodModalOpen] = useState(false)
  const [isSuggestionModalOpen, setSuggestionModalOpen] = useState(false)
  const [showCompletionFlash, setShowCompletionFlash] = useState(false)

  const previousPhaseRef = useRef(phase)

  const { focus, shortBreak, longBreak } = durations
  const focusMinutes = Math.round(focus / 60)
  const shortBreakMinutes = Math.round(shortBreak / 60)
  const longBreakMinutes = Math.round(longBreak / 60)

  const formattedClock = useMemo(
    () => formatClock(secondsRemaining),
    [secondsRemaining]
  )
  const statusCopy = PHASE_COPY[phase]

  const showStart =
    !isRunning &&
    totalFocusSeconds === 0 &&
    totalBreakSeconds === 0 &&
    completedFocusSessions === 0
  const showResume = !isRunning && !showStart
  const cycleIndex = useMemo(() => {
    if (showBreakGate) {
      return 4
    }
    if (phase === 'focus') {
      return (cycleStreak % 4) + 1
    }
    return cycleStreak === 0 ? 1 : cycleStreak
  }, [phase, cycleStreak, showBreakGate])

  const isSnoozed = useMemo(() => {
    if (!snoozeUntil) {
      return false
    }
    return snoozeUntil > Date.now()
  }, [snoozeUntil])

  const moodDescriptions: Record<string, string> = {
    '😎': 'Confident Roast',
    '😴': 'Sleepy Debugger',
    '😠': 'Spicy Sprint',
    '🧠': 'Laser Focus',
    '❤️': 'Warm Fuzzies',
  }

  const moodLabel = latestMood
    ? moodDescriptions[latestMood] ?? 'Logged'
    : 'Unlogged'
  const suggestionPreview =
    breakSuggestion ??
    queuedSuggestion ??
    (autoPromptVisible ? 'Suggestion brewing…' : 'No suggestion yet')
  const activeSuggestion = breakSuggestion ?? queuedSuggestion ?? null
  const shouldScrollSuggestion = suggestionPreview.length > 64
  const chipBase = 'chip-badge'
  const moodChipClass = `${chipBase} ${isRunning ? 'chip-badge--dim' : ''} ${
    focusSessionComplete || autoPromptVisible ? 'chip-badge--highlight' : ''
  }`
  const suggestionChipClass = `${chipBase} ${
    isRunning ? 'chip-badge--dim' : ''
  } ${
    autoPromptVisible || breakSuggestion || queuedSuggestion
      ? 'chip-badge--highlight'
      : ''
  }`

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined
    if (previousPhaseRef.current === 'focus' && phase !== 'focus') {
      setShowCompletionFlash(true)
      timeout = setTimeout(() => setShowCompletionFlash(false), 1000)
    }
    previousPhaseRef.current = phase
    return () => {
      if (timeout) {
        clearTimeout(timeout)
      }
    }
  }, [phase])

  useEffect(() => {
    if (!autoBrewEnabled) {
      return
    }
    if (!focusSessionComplete) {
      return
    }
    if (isSnoozed) {
      return
    }
    if (!queuedSuggestion && !isPrefetchingAutoSuggestion) {
      void prefetchAutoSuggestion()
    }
  }, [
    autoBrewEnabled,
    focusSessionComplete,
    queuedSuggestion,
    isPrefetchingAutoSuggestion,
    prefetchAutoSuggestion,
    isSnoozed,
  ])

  useEffect(() => {
    if (
      !autoBrewEnabled ||
      !focusSessionComplete ||
      !awaitingBreak ||
      isSnoozed ||
      autoPromptVisible
    ) {
      return
    }

    let idleTimeout: ReturnType<typeof setTimeout> | undefined

    function unregister() {
      window.removeEventListener('pointerdown', handleActivity)
      window.removeEventListener('keydown', handleActivity)
      window.removeEventListener('touchstart', handleActivity)
    }

    function cleanup() {
      if (idleTimeout) {
        clearTimeout(idleTimeout)
      }
      unregister()
    }

    function handleActivity() {
      cleanup()
      abortAutoSuggestion()
    }

    function register() {
      window.addEventListener('pointerdown', handleActivity)
      window.addEventListener('keydown', handleActivity)
      window.addEventListener('touchstart', handleActivity)
    }

    const maybeNotify = async () => {
      triggerAutoPrompt()
      unregister()
      if (typeof window !== 'undefined' && 'Notification' in window) {
        try {
          if (Notification.permission === 'default') {
            await Notification.requestPermission()
          }
          if (Notification.permission === 'granted') {
            new Notification('Focus done ☕', {
              body: 'Time to chill? BreakBuddy brewed a suggestion for you.',
              silent: true,
            })
          }
        } catch (error) {
          console.warn('Notification request failed', error)
        }
      }
    }

    register()
    idleTimeout = window.setTimeout(maybeNotify, 60_000)

    return cleanup
  }, [
    autoBrewEnabled,
    focusSessionComplete,
    awaitingBreak,
    autoPromptVisible,
    triggerAutoPrompt,
    abortAutoSuggestion,
    isSnoozed,
  ])

  useEffect(() => {
    if (!snoozeUntil) {
      return
    }
    const delay = snoozeUntil - Date.now()
    if (delay <= 0) {
      resumeAwaitingBreak()
      return
    }
    const timeout = window.setTimeout(() => {
      resumeAwaitingBreak()
    }, delay)

    return () => clearTimeout(timeout)
  }, [snoozeUntil, resumeAwaitingBreak])

  useEffect(() => {
    if (!activeSuggestion && !autoPromptVisible) {
      setSuggestionModalOpen(false)
    }
  }, [activeSuggestion, autoPromptVisible])

  useEffect(() => {
    if (showBreakGate) {
      setSuggestionModalOpen(false)
    }
  }, [showBreakGate])

  const mobilePrimaryAction = showStart
    ? {
        label: 'Start Sprint',
        action: start,
        disabled: false,
        tone: 'primary' as const,
      }
    : isRunning
    ? {
        label: 'Pause',
        action: pause,
        disabled: false,
        tone: 'neutral' as const,
      }
    : {
        label: 'Resume',
        action: resume,
        disabled: false,
        tone: 'primary' as const,
      }

  const mobilePrimaryClass =
    mobilePrimaryAction.tone === 'primary'
      ? 'border-neonPink/55 bg-neonPink/20 text-neonGold glow-button-active'
      : 'border-white/18 bg-white/10 text-white/80 glow-button-soft'
  const mobilePrimaryDisabled = mobilePrimaryAction.disabled || showBreakGate

  const hasBreakSuggestion = Boolean(breakSuggestion)

  const manualButtonLabel =
    autoPromptVisible && queuedSuggestion
      ? 'Brew It'
      : hasBreakSuggestion
      ? 'Brew Another'
      : 'Brew Suggestion'

  const toggleAutoBrew = () => {
    setAutoBrewEnabled(!autoBrewEnabled)
  }

  const handleManualBrew = () => {
    if (showBreakGate) {
      return
    }
    if (autoPromptVisible && queuedSuggestion) {
      applyQueuedSuggestion()
      setSuggestionModalOpen(false)
      return
    }
    if (queuedSuggestion && !isPrefetchingAutoSuggestion) {
      applyQueuedSuggestion()
      setSuggestionModalOpen(false)
      return
    }
    if (isGeneratingSuggestion) {
      return
    }
    abortAutoSuggestion()
    void generateBreakSuggestion()
    setSuggestionModalOpen(false)
  }

  const mobileSecondaryAction = (() => {
    if (autoPromptVisible) {
      if (queuedSuggestion) {
        return {
          label: 'Brew It',
          action: applyQueuedSuggestion,
          disabled: showBreakGate,
        }
      }
      return {
        label: 'Brewing…',
        action: () => {},
        disabled: true,
      }
    }

    return {
      label: manualButtonLabel,
      action: handleManualBrew,
      disabled: isGeneratingSuggestion || showBreakGate,
    }
  })()

  return (
    <>
      {showBreakGate && (
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
              Take the long break. Hydrate. Stretch. Pretend to look away from
              your monitor. Skip only if you enjoy refactoring your spine later.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={acceptBreakGate}
                className="btn-animated w-full rounded-full border border-neonGold/45 bg-neonGold/20 px-4 py-3 text-xs font-semibold uppercase tracking-[0.45em] text-neonGold hover:border-neonGold/65 hover:bg-neonGold/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-neonGold/40 glow-button-active"
              >
                Start Break (recommended)
              </button>
              <button
                type="button"
                onClick={skipBreakGate}
                className="btn-animated w-full rounded-full border border-neonPink/45 bg-transparent px-4 py-3 text-xs font-semibold uppercase tracking-[0.45em] text-white/70 hover:border-neonPink/55 hover:text-neonPink glow-button-soft"
              >
                Skip Break (not recommended)
              </button>
            </div>
          </div>
        </div>
      )}
      {isSuggestionModalOpen && (
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
              {activeSuggestion
                ? 'You earned a refill break.'
                : 'Nothing brewing yet.'}
            </h3>
            <p className="mt-4 text-sm text-white/80">
              {activeSuggestion ??
                'Wrap a focus sprint and we will queue something delicious.'}
            </p>
            {autoSuggestionError && (
              <p className="mt-3 text-xs font-medium text-neonPink/70">
                {autoSuggestionError}
              </p>
            )}
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={handleManualBrew}
                disabled={
                  isGeneratingSuggestion ||
                  (!activeSuggestion && !autoPromptVisible)
                }
                className="btn-animated w-full rounded-full border border-neonPink/45 bg-neonPink/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-neonGold hover:border-neonPink/60 hover:bg-neonPink/28 glow-button-active disabled:cursor-not-allowed disabled:scale-100 disabled:border-white/10 disabled:bg-transparent disabled:text-white/30"
              >
                {activeSuggestion
                  ? 'Brew Another'
                  : autoPromptVisible
                  ? 'Brew It'
                  : 'Brew Suggestion'}
              </button>
              <button
                type="button"
                onClick={() => snoozeAutoSuggestion(5)}
                className="btn-animated w-full rounded-full border border-white/18 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white/60 hover:border-white/35 hover:text-neonPink glow-button-soft"
              >
                Snooze 5m
              </button>
            </div>
            <button
              type="button"
              onClick={() => setSuggestionModalOpen(false)}
              className="btn-animated mt-4 w-full rounded-full border border-white/12 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-white/50 hover:border-white/25 hover:text-neonPink"
            >
              Close
            </button>
          </div>
        </div>
      )}
      <section className="flex flex-1 flex-col gap-8 pb-28 min-[641px]:gap-10 min-[641px]:pb-0">
        <header className="glass-panel glow-card-soft rounded-3xl p-6 min-[641px]:p-8 min-[1025px]:p-12">
          <h2 className="heading-glow-pink text-3xl font-semibold text-neonGold sm:text-4xl">
            Dashboard
          </h2>
          <p className="mt-4 max-w-2xl text-sm text-white/70">
            Focus timer now caffeinated with Pomodoro cycles. Tune the sprint
            length, pause when life interrupts, resume when the coffee hits,
            reset when you crave a clean slate.
          </p>
        </header>
        <div className="relative flex flex-col gap-3 pb-2 min-[641px]:flex-row min-[641px]:items-center min-[641px]:justify-between">
          <button
            type="button"
            onClick={() => setMoodModalOpen(true)}
            className={`${moodChipClass} w-full min-[641px]:max-w-xs`}
            aria-label="Update mood"
          >
            <span className="chip-steam" aria-hidden />
            <span className="text-[11px] uppercase tracking-[0.35em] text-white/50">
              Mooda
            </span>
            <span className="text-sm font-semibold text-white/90">
              {latestMood ?? '☕'} {moodLabel}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setSuggestionModalOpen(true)}
            className={`${suggestionChipClass} w-full min-[641px]:flex-1 min-[641px]:min-w-0`}
            aria-label="View last suggestion"
          >
            <span className="text-[11px] uppercase tracking-[0.35em] text-white/50">
              Last Suggestion Logged
            </span>
          </button>
        </div>
        <div className="flex flex-1 flex-col gap-6 min-[641px]:grid min-[641px]:grid-cols-2 min-[1025px]:grid-cols-[2fr_1fr]">
          <article className="glass-panel glow-card-strong rounded-3xl p-6 min-[641px]:p-8 min-[1025px]:p-12 transition duration-300 hover:border-neonPink/45 hover:shadow-[0_0_10px_rgba(255,0,110,0.35)] animate-float-up">
            <div className="relative flex w-full flex-col items-center gap-6 text-center">
              <MoodTrackerModal
                open={isMoodModalOpen}
                currentMood={latestMood}
                onSelect={(mood) => {
                  setMood(mood)
                  setMoodModalOpen(false)
                }}
                onClear={() => {
                  clearMood()
                }}
                onClose={() => setMoodModalOpen(false)}
              />
              <p
                className={`text-xs uppercase tracking-[0.45em] text-white/60 ${statusCopy.accent}`}
              >
                {statusCopy.label}
              </p>
              <div
                className={`glow-timer-ring ${
                  isRunning ? 'glow-timer-ring--active' : ''
                } ${
                  isRunning && !showCompletionFlash ? 'timer-heartbeat' : ''
                } ${showCompletionFlash ? 'glow-timer-ring--flash' : ''}`}
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
                  isRunning && !showCompletionFlash
                    ? 'running-indicator--active'
                    : ''
                }`}
                aria-live="polite"
              >
                Running…
              </div>
              <p className="max-w-lg text-sm text-white/70">
                {statusCopy.blurb}
              </p>
              {(breakSuggestion || queuedSuggestion) &&
                !showCompletionFlash && (
                  <p className="suggestion-strip suggestion-strip--visible">
                    {breakSuggestion ?? queuedSuggestion}
                  </p>
                )}

              <div className="flex flex-col gap-3 text-[10px] sm:text-xs">
                <DurationPresetGroup
                  label="Focus"
                  activeMinutes={focusMinutes}
                  options={FOCUS_PRESETS}
                  onSelect={(minutes) => setDurations({ focus: minutes * 60 })}
                />
                <DurationPresetGroup
                  label="Short Break"
                  activeMinutes={shortBreakMinutes}
                  options={SHORT_BREAK_PRESETS}
                  onSelect={(minutes) =>
                    setDurations({ shortBreak: minutes * 60 })
                  }
                />
                <DurationPresetGroup
                  label="Long Break"
                  activeMinutes={longBreakMinutes}
                  options={LONG_BREAK_PRESETS}
                  onSelect={(minutes) =>
                    setDurations({ longBreak: minutes * 60 })
                  }
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
          <div className="flex flex-col gap-3 min-[641px]:hidden">
            <details className="glass-panel glow-card-soft rounded-3xl px-4 py-3">
              <summary className="flex cursor-pointer items-center justify-between text-left text-[11px] uppercase tracking-[0.35em] text-white/50">
                <span>Focus Logged</span>
                <span className="text-sm font-semibold text-neonPink">
                  {formatMinutes(totalFocusSeconds)}m
                </span>
              </summary>
              <div className="mt-3 space-y-2 text-left text-xs leading-relaxed text-white/70">
                <p className="text-[11px] uppercase tracking-[0.35em] text-white/45">
                  completed: {completedFocusSessions} sprints
                </p>
                <p>
                  Keep the cadence; timer glow shifts when sprint wraps so you
                  always know when to breathe.
                </p>
              </div>
            </details>
            <details className="glass-panel glow-card-soft-gold rounded-3xl px-4 py-3">
              <summary className="flex cursor-pointer items-center justify-between text-left text-[11px] uppercase tracking-[0.35em] text-white/50">
                <span>Break Logged</span>
                <span className="text-sm font-semibold text-neonGold">
                  {formatMinutes(totalBreakSeconds)}m
                </span>
              </summary>
              <div className="mt-3 space-y-2 text-left text-xs leading-relaxed text-white/70">
                <p>
                  Short or long, every recovery gets logged so the AI can roast
                  you appropriately when you forget to breathe.
                </p>
              </div>
            </details>
            <details className="glass-panel glow-card-soft rounded-3xl px-4 py-3">
              <summary className="flex cursor-pointer items-center justify-between text-left text-[11px] uppercase tracking-[0.35em] text-white/50">
                <span>Current Cycle</span>
                <span className="text-sm font-semibold text-white/70">
                  {cycleIndex} / 4
                </span>
              </summary>
              <div className="mt-3 space-y-2 text-left text-xs leading-relaxed text-white/70">
                <p>
                  Long break hits after four focus sprints. Keep the momentum,
                  stay caffeinated.
                </p>
              </div>
            </details>
            <details
              className={`glass-panel rounded-3xl px-4 py-3 ${
                showCompletionFlash ? 'glow-card-soft-gold' : 'glow-card-soft'
              }`}
              open={autoPromptVisible ? true : undefined}
            >
              <summary className="flex cursor-pointer items-center justify-between text-left text-[11px] uppercase tracking-[0.35em] text-white/50">
                <span>Break Suggestion</span>
                <span className="text-sm font-semibold text-neonPink">
                  {pendingBreakSuggestions}
                </span>
              </summary>
              <div className="mt-3 space-y-3 text-left text-xs leading-relaxed text-white/80">
                <p>
                  {breakSuggestion ??
                    'Finish a focus sprint and tap Brew Suggestion for a freshly sarcastic break prompt.'}
                </p>
                <div className="rounded-2xl border border-white/12 bg-white/5 px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="max-w-[70%]">
                      <p className="text-[10px] uppercase tracking-[0.35em] text-white/55">
                        Auto-brew break suggestions
                      </p>
                      <p className="mt-2 text-[11px] text-white/60">
                        {autoBrewEnabled
                          ? 'Neon barista auto-serves quips when you wrap a sprint.'
                          : 'Manual mode. Tap Brew when you crave a sarcastic refill.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={toggleAutoBrew}
                      className={`btn-animated flex h-10 min-w-[86px] items-center justify-center rounded-full border px-4 text-[10px] font-semibold uppercase tracking-[0.35em] transition ${
                        autoBrewEnabled
                          ? 'border-neonPink/55 bg-neonPink/20 text-neonGold glow-button-active'
                          : 'border-white/18 bg-transparent text-white/60 hover:border-neonPink/35 hover:text-neonPink glow-button-soft'
                      }`}
                    >
                      {autoBrewEnabled ? 'On' : 'Off'}
                    </button>
                  </div>
                </div>
                {autoSuggestionError && (
                  <p className="text-[11px] font-medium text-neonPink/70">
                    {autoSuggestionError}
                  </p>
                )}
                {autoPromptVisible && (
                  <div className="space-y-2 rounded-2xl border border-neonGold/25 bg-white/5 px-3 py-3">
                    <p className="text-[11px] uppercase tracking-[0.35em] text-white/55">
                      Focus done ☕ Time to chill. Want your break suggestion?
                    </p>
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={applyQueuedSuggestion}
                        disabled={!queuedSuggestion}
                        className="btn-animated w-full rounded-full border border-neonPink/55 bg-neonPink/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-neonGold hover:border-neonPink/70 hover:bg-neonPink/28 glow-button-active disabled:cursor-not-allowed disabled:scale-100 disabled:border-white/10 disabled:bg-transparent disabled:text-white/30"
                      >
                        {queuedSuggestion ? 'Brew It' : 'Brewing…'}
                      </button>
                      <button
                        type="button"
                        onClick={() => snoozeAutoSuggestion(5)}
                        className="btn-animated w-full rounded-full border border-white/18 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white/60 hover:border-white/35 hover:text-neonPink glow-button-soft"
                      >
                        Snooze 5m
                      </button>
                    </div>
                    {!queuedSuggestion && isPrefetchingAutoSuggestion && (
                      <p className="text-[11px] uppercase tracking-[0.35em] text-white/45">
                        Brewing in the background…
                      </p>
                    )}
                  </div>
                )}
                {suggestionError && (
                  <p className="text-[11px] font-medium text-neonPink/80">
                    {suggestionError}
                  </p>
                )}
                {breakSuggestion && (
                  <button
                    type="button"
                    onClick={() => clearBreakSuggestion()}
                    className="btn-animated w-full rounded-full border border-white/18 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white/60 hover:border-white/35 hover:text-neonPink glow-button-soft"
                  >
                    Clear
                  </button>
                )}
              </div>
            </details>
            <details className="glass-panel glow-card-soft rounded-3xl px-4 py-3">
              <summary className="flex cursor-pointer items-center justify-between text-left text-[11px] uppercase tracking-[0.35em] text-white/50">
                <span>Current Mood</span>
                <span className="text-lg">{latestMood ?? '☕'}</span>
              </summary>
              <div className="mt-3 space-y-3 text-left text-xs leading-relaxed text-white/70">
                <p>
                  Mood colors the AI quips. Keep it honest so BreakBuddy knows
                  whether to hype or soothe.
                </p>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setMoodModalOpen(true)}
                    className="btn-animated w-full rounded-full border border-neonPink/45 bg-neonPink/18 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-neonGold hover:border-neonPink/60 hover:bg-neonPink/26 glow-button-active"
                  >
                    Update Mood
                  </button>
                  {latestMood && (
                    <button
                      type="button"
                      onClick={() => clearMood()}
                      className="btn-animated w-full rounded-full border border-white/18 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white/60 hover:border-white/35 hover:text-neonPink glow-button-soft"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </details>
          </div>
          <aside className="hidden flex-col gap-6 min-[641px]:flex">
            <article
              className="glass-panel glow-card-soft rounded-3xl p-6 min-[1025px]:p-8 transition duration-300 hover:border-neonPink/40 hover:shadow-[0_0_8px_rgba(255,0,110,0.25)] animate-float-up"
              style={{ animationDelay: '0.1s' }}
            >
              <p className="text-xs uppercase tracking-[0.35em] text-white/40">
                Focus Logged
              </p>
              <p className="mt-3 text-3xl font-semibold text-neonPink">
                {formatMinutes(totalFocusSeconds)} min
              </p>
              <p className="mt-2 text-xs uppercase tracking-[0.3em] text-white/40">
                {completedFocusSessions} completed sprints
              </p>
            </article>
            <article
              className="glass-panel glow-card-soft-gold rounded-3xl p-6 min-[1025px]:p-8 transition duration-300 hover:border-neonGold/45 hover:shadow-[0_0_8px_rgba(255,214,10,0.28)] animate-float-up"
              style={{ animationDelay: '0.2s' }}
            >
              <p className="text-xs uppercase tracking-[0.35em] text-white/40">
                Break Logged
              </p>
              <p className="mt-3 text-3xl font-semibold text-neonGold [text-shadow:0_0_6px_rgba(255,214,10,0.35)]">
                {formatMinutes(totalBreakSeconds)} min
              </p>
              <p className="mt-2 text-xs uppercase tracking-[0.3em] text-white/40">
                Includes short and long recoveries
              </p>
            </article>
            <article
              className="glass-panel glow-card-soft rounded-3xl p-6 min-[1025px]:p-8 transition duration-300 hover:border-white/25 hover:shadow-[0_0_8px_rgba(255,255,255,0.18)] animate-float-up"
              style={{ animationDelay: '0.3s' }}
            >
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
              className={`glass-panel rounded-3xl p-6 min-[1025px]:p-8 transition duration-300 animate-float-up ${
                showCompletionFlash ? 'glow-card-soft-gold' : 'glow-card-soft'
              } hover:border-neonPink/40 hover:shadow-[0_0_8px_rgba(255,0,110,0.25)]`}
              style={{ animationDelay: '0.4s' }}
            >
              <p className="text-xs uppercase tracking-[0.35em] text-white/40">
                Break Suggestion
              </p>
              <p className="mt-3 text-sm text-white/80">
                {breakSuggestion ??
                  'No AI quip yet. Finish a focus sprint and brew a suggestion when you are ready.'}
              </p>
              <div className="mt-4 rounded-2xl border border-white/12 bg-white/5 px-4 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="max-w-[70%] text-left">
                    <p className="text-[10px] uppercase tracking-[0.35em] text-white/55">
                      Auto-brew break suggestions
                    </p>
                    <p className="mt-2 text-[12px] text-white/60">
                      {autoBrewEnabled
                        ? 'BreakBuddy keeps the espresso machine humming—idle for 60s or hit the gate and we serve the quip.'
                        : 'Prefer manual pour-over? We stay quiet until you hit Brew.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={toggleAutoBrew}
                    className={`btn-animated flex h-11 min-w-[96px] items-center justify-center rounded-full border px-4 text-[11px] font-semibold uppercase tracking-[0.35em] transition ${
                      autoBrewEnabled
                        ? 'border-neonPink/55 bg-neonPink/20 text-neonGold glow-button-active'
                        : 'border-white/18 bg-transparent text-white/60 hover:border-neonPink/35 hover:text-neonPink glow-button-soft'
                    }`}
                  >
                    {autoBrewEnabled ? 'On' : 'Off'}
                  </button>
                </div>
              </div>
              {suggestionError && (
                <p className="mt-3 text-xs font-medium text-neonPink/80">
                  {suggestionError}
                </p>
              )}
              {autoSuggestionError && (
                <p className="mt-3 text-xs font-medium text-neonPink/70">
                  {autoSuggestionError}
                </p>
              )}
              {autoPromptVisible && (
                <div
                  className="mt-5 space-y-3 rounded-2xl border border-neonGold/25 bg-white/5 px-4 py-4 text-left shadow-[0_0_12px_rgba(255,214,10,0.15)]"
                  role="status"
                  aria-live="polite"
                >
                  <p className="text-[11px] uppercase tracking-[0.35em] text-white/55">
                    Focus done ☕ Time to chill. Want your break suggestion?
                  </p>
                  <div className="flex flex-col gap-2 min-[641px]:flex-row">
                    <button
                      type="button"
                      onClick={applyQueuedSuggestion}
                      disabled={!queuedSuggestion}
                      className="btn-animated w-full rounded-full border border-neonPink/55 bg-neonPink/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-neonGold hover:border-neonPink/70 hover:bg-neonPink/28 glow-button-active disabled:cursor-not-allowed disabled:scale-100 disabled:border-white/10 disabled:bg-transparent disabled:text-white/30"
                    >
                      {queuedSuggestion ? 'Brew It' : 'Brewing…'}
                    </button>
                    <button
                      type="button"
                      onClick={() => snoozeAutoSuggestion(5)}
                      className="btn-animated w-full rounded-full border border-white/18 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white/60 hover:border-white/35 hover:text-neonPink glow-button-soft"
                    >
                      Snooze 5m
                    </button>
                  </div>
                  {!queuedSuggestion && isPrefetchingAutoSuggestion && (
                    <p className="text-[11px] uppercase tracking-[0.35em] text-white/45">
                      Brewing in the background…
                    </p>
                  )}
                </div>
              )}
              <div className="mt-5 hidden flex-wrap items-center gap-3 min-[641px]:flex">
                <button
                  type="button"
                  onClick={handleManualBrew}
                  disabled={isGeneratingSuggestion || showBreakGate}
                  className="btn-animated inline-flex rounded-full border border-neonPink/45 bg-neonPink/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-neonGold hover:border-neonPink/60 hover:bg-neonPink/28 focus:outline-none focus-visible:ring-2 focus-visible:ring-neonPink/50 glow-button-active disabled:cursor-not-allowed disabled:scale-100 disabled:border-white/10 disabled:bg-transparent disabled:text-white/30"
                >
                  {isGeneratingSuggestion ? 'Brewing…' : manualButtonLabel}
                </button>
                {breakSuggestion && (
                  <button
                    type="button"
                    onClick={() => clearBreakSuggestion()}
                    className="btn-animated inline-flex rounded-full border border-white/18 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white/60 hover:border-white/35 hover:text-neonPink focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 glow-button-soft"
                  >
                    Clear
                  </button>
                )}
              </div>
              <p className="mt-5 text-[10px] uppercase tracking-[0.35em] text-white/30">
                queued: {pendingBreakSuggestions} • mood:{' '}
                {latestMood ?? '☕ default roast'}
              </p>
            </article>
            <article className="glass-panel glow-card-soft rounded-3xl p-6 min-[1025px]:p-8 text-center">
              <p className="text-xs uppercase tracking-[0.35em] text-white/40">
                Current Mood
              </p>
              <p className="mt-3 text-4xl">{latestMood ?? '☕'}</p>
              <p className="mt-2 text-xs uppercase tracking-[0.3em] text-white/40">
                {latestMood
                  ? 'Logged for the break suggestion engine'
                  : 'No mood logged yet'}
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setMoodModalOpen(true)}
                  className="btn-animated rounded-full border border-neonPink/45 bg-neonPink/18 px-5 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-neonGold hover:border-neonPink/60 hover:bg-neonPink/26 glow-button-active"
                >
                  Update Mood
                </button>
                {latestMood && (
                  <button
                    type="button"
                    onClick={() => clearMood()}
                    className="btn-animated rounded-full border border-white/18 px-5 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white/60 hover:border-white/35 hover:text-neonPink glow-button-soft"
                  >
                    Clear
                  </button>
                )}
              </div>
            </article>
          </aside>
        </div>
        <div className="min-[641px]:hidden">
          <div className="fixed inset-x-0 bottom-4 z-40 px-4">
            <div className="glass-panel glow-card-soft rounded-3xl bg-black/75 p-4 shadow-lg backdrop-blur-lg space-y-3">
              <button
                type="button"
                onClick={mobilePrimaryAction.action}
                disabled={mobilePrimaryDisabled}
                className={`btn-animated w-full rounded-full border px-4 py-3 text-xs font-semibold uppercase tracking-[0.45em] ${mobilePrimaryClass} disabled:cursor-not-allowed disabled:scale-100 disabled:border-white/10 disabled:bg-white/5 disabled:text-white/30`}
              >
                {mobilePrimaryAction.label}
              </button>
              <button
                type="button"
                onClick={mobileSecondaryAction.action}
                disabled={mobileSecondaryAction.disabled}
                className="btn-animated w-full rounded-full border border-neonPink/45 bg-neonPink/20 px-4 py-3 text-xs font-semibold uppercase tracking-[0.45em] text-neonGold hover:border-neonPink/60 hover:bg-neonPink/28 focus:outline-none focus-visible:ring-2 focus-visible:ring-neonPink/50 glow-button-active disabled:cursor-not-allowed disabled:scale-100 disabled:border-white/10 disabled:bg-transparent disabled:text-white/30"
              >
                {mobileSecondaryAction.label}
              </button>
              {autoPromptVisible && (
                <button
                  type="button"
                  onClick={() => snoozeAutoSuggestion(5)}
                  className="btn-animated w-full rounded-full border border-white/18 px-4 py-3 text-xs font-semibold uppercase tracking-[0.45em] text-white/60 hover:border-white/35 hover:text-neonPink glow-button-soft"
                >
                  Snooze 5m
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

export default Dashboard
