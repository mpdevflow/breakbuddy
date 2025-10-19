import { useMemo } from 'react'
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useFocusTimer } from '../store/useFocusTimer.ts'

type ChartDatum = {
  key: string
  dayLabel: string
  focusMinutes: number
  breakMinutes: number
  breakCount: number
  focusCount: number
}

type TooltipProps = {
  active?: boolean
  payload?: Array<{
    dataKey: keyof ChartDatum | string
    value: number
    color: string
    name: string
  }>
  label?: string
}

const WeeklyTooltip = ({ active, payload, label }: TooltipProps) => {
  if (!active || !payload || payload.length === 0) {
    return null
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/80 px-4 py-3 text-xs uppercase tracking-[0.25em] text-white/70 shadow-lg backdrop-blur-md">
      <p className="mb-2 text-[11px] font-semibold text-neonGold">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  )
}

const formatDayLabel = (dayKey: string) => {
  const date = new Date(dayKey)
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
  })
}

function History() {
  const sessions = [
    { label: '13:30 — Neck stretch + tiny dance break', mood: 'Spicy calm' },
    { label: '11:05 — Hydration challenge accepted', mood: 'Energized' },
    { label: '09:40 — Eye break, stared at neon reflections', mood: 'Zen-ish' },
  ]

  const weeklyStats = useFocusTimer((state) => state.weeklyStats)
  const sessionHistory = useFocusTimer((state) => state.sessionHistory)

  const chartData = useMemo<ChartDatum[]>(() => {
    const entries = Object.entries(weeklyStats ?? {}).sort(([a], [b]) =>
      a.localeCompare(b)
    )

    return entries.map(([key, value]) => ({
      key,
      dayLabel: formatDayLabel(key),
      focusMinutes: Number((value.focusSeconds / 60).toFixed(1)),
      breakMinutes: Number((value.breakSeconds / 60).toFixed(1)),
      breakCount: value.breakCount,
      focusCount: value.focusCount,
    }))
  }, [weeklyStats])

  const totals = useMemo(() => {
    if (chartData.length === 0) {
      return {
        totalFocusMinutes: 0,
        totalBreakCount: 0,
        averageFocusMinutes: 0,
      }
    }

    const totalFocusMinutes = chartData.reduce(
      (sum, day) => sum + day.focusMinutes,
      0
    )

    const totalBreakCount = chartData.reduce(
      (sum, day) => sum + day.breakCount,
      0
    )

    return {
      totalFocusMinutes: Number(totalFocusMinutes.toFixed(1)),
      totalBreakCount,
      averageFocusMinutes: Number(
        (totalFocusMinutes / chartData.length).toFixed(1)
      ),
    }
  }, [chartData])

  const historyList = useMemo(
    () =>
      sessionHistory.map((entry) => {
        const completed = new Date(entry.completedAt)
        const timeLabel = completed.toLocaleTimeString(undefined, {
          hour: 'numeric',
          minute: '2-digit',
        })
        const dateLabel = completed.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        })

        return {
          ...entry,
          timeLabel,
          dateLabel,
        }
      }),
    [sessionHistory]
  )

  return (
    <section className="flex flex-1 flex-col gap-8">
      <header className="glass-panel glow-card-soft rounded-3xl p-10 transition duration-300 hover:border-neonGold/40 hover:shadow-[0_0_8px_rgba(255,214,10,0.25)]">
        <h2 className="heading-glow-pink text-3xl font-semibold text-neonGold sm:text-4xl">
          Break History
        </h2>
        <p className="mt-4 max-w-2xl text-sm text-white/70 sm:text-base">
          Every focus sprint you finish lands here. Track the vibe, the
          duration, and the quip BreakBuddy brewed when you finally took a
          breather.
        </p>
      </header>
      <article className="glass-panel glow-card-strong rounded-3xl p-8 transition duration-300 hover:border-neonPink/40 hover:shadow-[0_0_10px_rgba(255,0,110,0.28)]">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.45em] text-white/40 sm:text-xs">
              This Week
            </p>
            <h3 className="heading-glow-pink mt-2 text-2xl font-semibold text-neonPink sm:text-3xl">
              Focus & Break Rhythm
            </h3>
            <p className="mt-3 text-sm text-white/60 sm:max-w-md">
              Track how many minutes you’ve actually focused versus how many
              breaks you’ve taken. Neon justice for procrastination and hustle
              alike.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-[10px] uppercase tracking-[0.3em] text-white/50 sm:text-xs">
            <div>
              <p>Total Focus</p>
              <p className="mt-1 text-lg font-semibold text-neonGold">
                {totals.totalFocusMinutes} min
              </p>
            </div>
            <div>
              <p>Break Count</p>
              <p className="mt-1 text-lg font-semibold text-neonPink">
                {totals.totalBreakCount}
              </p>
            </div>
            <div>
              <p>Avg Focus / Day</p>
              <p className="mt-1 text-lg font-semibold text-white">
                {totals.averageFocusMinutes} min
              </p>
            </div>
            <div>
              <p>Days Logged</p>
              <p className="mt-1 text-lg font-semibold text-white/80">
                {chartData.length}
              </p>
            </div>
          </div>
        </div>
        {chartData.length === 0 ? (
          <p className="mt-8 text-sm text-white/60">
            Finish a focus sprint to unlock weekly metrics. BreakBuddy will
            start plotting once the first neon session lands.
          </p>
        ) : (
          <div className="mt-8 h-[260px] w-full sm:h-72">
            <ResponsiveContainer width="100%" height="100%" minWidth={280}>
              <ComposedChart
                data={chartData}
                margin={{ top: 12, right: 12, bottom: 24, left: -12 }}
              >
                <defs>
                  <linearGradient
                    id="focusGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#FF006E" stopOpacity={0.55} />
                    <stop offset="95%" stopColor="#FF006E" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient
                    id="breakGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#FFD60A" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#FFD60A" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="rgba(255,255,255,0.08)"
                  vertical={false}
                />
                <XAxis
                  dataKey="dayLabel"
                  tickLine={false}
                  axisLine={false}
                  interval={chartData.length > 5 ? 1 : 0}
                  tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
                />
                <YAxis
                  yAxisId="minutes"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
                  label={{
                    value: 'Minutes',
                    angle: -90,
                    position: 'insideLeft',
                    fill: 'rgba(255,255,255,0.45)',
                    offset: -5,
                    fontSize: 11,
                    fontFamily: 'Inter, system-ui, sans-serif',
                  }}
                />
                <YAxis
                  yAxisId="counts"
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
                  label={{
                    value: 'Breaks',
                    angle: 90,
                    position: 'insideRight',
                    fill: 'rgba(255,255,255,0.35)',
                    offset: -5,
                    fontSize: 11,
                    fontFamily: 'Inter, system-ui, sans-serif',
                  }}
                  allowDecimals={false}
                />
                <Tooltip
                  content={<WeeklyTooltip />}
                  cursor={{ fill: 'rgba(255,0,110,0.05)' }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={38}
                  iconSize={10}
                  iconType="circle"
                  formatter={(value) => {
                    if (value === 'Break Minutes') return value
                    if (value === 'Focus Minutes') return value
                    if (value === 'Break Count') return value
                    if (value === 'breakMinutes') return 'Break Minutes'
                    if (value === 'focusMinutes') return 'Focus Minutes'
                    if (value === 'breakCount') return 'Break Count'
                    return value
                  }}
                  wrapperStyle={{
                    color: 'rgba(255,255,255,0.65)',
                    fontSize: 10,
                    letterSpacing: '0.25em',
                    textTransform: 'uppercase',
                    lineHeight: '1.4',
                  }}
                />
                <Area
                  yAxisId="minutes"
                  type="monotone"
                  dataKey="breakMinutes"
                  name="Break Minutes"
                  stroke="#FFD60A"
                  strokeWidth={1.5}
                  fill="url(#breakGradient)"
                  activeDot={{ r: 4 }}
                />
                <Bar
                  yAxisId="minutes"
                  dataKey="focusMinutes"
                  name="Focus Minutes"
                  fill="url(#focusGradient)"
                  radius={[12, 12, 4, 4]}
                  maxBarSize={36}
                />
                <Line
                  yAxisId="counts"
                  type="monotone"
                  dataKey="breakCount"
                  name="Break Count"
                  stroke="#FF9ACD"
                  strokeWidth={2}
                  dot={{ stroke: '#FF9ACD', fill: '#0D0D0D', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </article>
      <div className="glass-panel glow-card-soft rounded-3xl p-6 transition duration-300 hover:border-neonPink/35 hover:shadow-[0_0_8px_rgba(255,0,110,0.22)]">
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-sm font-semibold uppercase tracking-[0.4em] text-white/50">
            Session Log
          </h4>
          <span className="text-[11px] uppercase tracking-[0.35em] text-white/40">
            {historyList.length} entries
          </span>
        </div>
        {historyList.length === 0 ? (
          <p className="mt-6 text-sm text-white/60">
            No sprints recorded yet. Brew a focus session and your neon
            footprints will show up here.
          </p>
        ) : (
          <ul className="mt-6 space-y-3">
            {historyList.map((entry, index) => (
              <li
                key={entry.id}
                className="glass-panel glow-card-soft rounded-2xl border border-white/5 px-5 py-4 text-sm text-white/80 transition duration-300 hover:border-neonPink/35 hover:shadow-[0_0_8px_rgba(255,0,110,0.2)] animate-float-up"
                style={{ animationDelay: `${index * 0.04}s` }}
              >
                <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.35em] text-white/45">
                  <span>{entry.dateLabel}</span>
                  <span>Cycle {entry.cycle}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs uppercase tracking-[0.35em] text-white/40">
                  <span>{entry.timeLabel}</span>
                  <span>{entry.mood ?? '☕'}</span>
                </div>
                <p className="mt-2 text-sm font-medium text-neonPink">
                  Focus: {entry.focusMinutes} min
                </p>
                {entry.suggestion && (
                  <p className="mt-2 text-sm italic text-white/70">
                    “{entry.suggestion}”
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

export default History
