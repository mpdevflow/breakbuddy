import { Link } from 'react-router-dom';

function NotFound() {
  return (
    <section className="flex flex-1 flex-col items-center justify-center text-center">
      <div className="glass-panel glow-card-strong max-w-lg rounded-3xl p-12">
        <p className="text-xs uppercase tracking-[0.45em] text-neonGold/80">404</p>
        <h1 className="heading-glow-pink mt-4 text-3xl font-semibold text-neonPink">
          That route needs more caffeine.
        </h1>
        <p className="mt-4 text-sm text-white/70">
          Either the page went on break without telling us, or you typed like you
          were on your third espresso.
        </p>
        <Link
          to="/"
          className="btn-animated mt-8 inline-flex items-center justify-center rounded-full border border-neonPink/45 bg-neonPink/20 px-6 py-3 text-xs font-semibold uppercase tracking-[0.45em] text-neonGold hover:border-neonPink/60 hover:bg-neonPink/28 glow-button-active"
        >
          Back to home
        </Link>
      </div>
    </section>
  );
}

export default NotFound;
