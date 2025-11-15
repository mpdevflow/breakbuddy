import { NavLink, Outlet } from 'react-router-dom'
import Logo from '/neon-coffee.svg'

const navLinkClass =
  'relative px-4 py-2 text-xs sm:text-sm font-medium uppercase tracking-[0.35em] transition-colors duration-200'

function AppLayout() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-cafeNight via-cafeShadow to-black text-white">
      <div className="pointer-events-none absolute -top-32 -left-24 h-80 w-80 rounded-full bg-neonPink/35 blur-3xl animate-neon-pulse" />
      <div
        className="pointer-events-none absolute bottom-[-120px] right-[-80px] h-96 w-96 rounded-full bg-neonGold/20 blur-[140px] animate-neon-pulse"
        style={{ animationDelay: '1.8s' }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-1/3 mx-auto h-64 w-64 rounded-full bg-white/5 blur-[120px]"
        style={{ opacity: 0.35 }}
      />
      <header className="border-b border-white/10 bg-black/50 backdrop-blur-lg">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-5 py-6 sm:px-6">
          <div className="flex items-center gap-3">
            <img
              src={Logo}
              alt="BreakBuddy neon coffee mug"
              className="h-10 w-10 drop-shadow-[0_0_6px_rgba(255,0,110,0.6)] transition-transform duration-300 hover:scale-105"
            />
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-[0.4em] text-neonGold/80">
                BreakBuddy
              </span>
              <span className="heading-glow-pink text-lg font-semibold text-neonPink">
                Neon Coffee Edition
              </span>
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-3 text-white/70">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `${navLinkClass} ${
                  isActive
                    ? 'text-neonGold [text-shadow:0_0_4px_rgba(255,214,10,0.45)]'
                    : 'text-white/60 hover:text-neonPink'
                }`
              }
            >
              Home
            </NavLink>
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `${navLinkClass} ${
                  isActive
                    ? 'text-neonGold [text-shadow:0_0_4px_rgba(255,214,10,0.45)]'
                    : 'text-white/60 hover:text-neonPink'
                }`
              }
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/history"
              className={({ isActive }) =>
                `${navLinkClass} ${
                  isActive
                    ? 'text-neonGold [text-shadow:0_0_4px_rgba(255,214,10,0.45)]'
                    : 'text-white/60 hover:text-neonPink'
                }`
              }
            >
              History
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="relative mx-auto flex min-h-[calc(100vh-120px)] w-full max-w-5xl flex-col px-5 py-12 sm:px-6">
        <Outlet />
      </main>
      <footer className="border-t border-white/10 bg-black/50 py-6 text-center text-[10px] uppercase tracking-[0.4em] text-white/40 sm:text-xs">
        Caffeinate wisely. Break often. No corporate wellness platitudes.
      </footer>
    </div>
  )
}

export default AppLayout
