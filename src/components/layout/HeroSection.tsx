import Link from "next/link";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      {/* Background gradient orbs */}
      <div
        aria-hidden
        className="absolute -top-40 -left-40 w-96 h-96 bg-brand-600/20 rounded-full blur-3xl pointer-events-none"
      />
      <div
        aria-hidden
        className="absolute -bottom-20 right-0 w-80 h-80 bg-accent-teal/10 rounded-full blur-3xl pointer-events-none"
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-brand-400 text-sm font-semibold uppercase tracking-widest mb-4">
          Learn by seeing
        </p>
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-tight mb-6">
          Machine Learning,{" "}
          <span className="text-gradient">visualized.</span>
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed mb-10">
          Interactive lessons that build intuition from first principles.
          No black boxes — see every weight, gradient, and decision boundary come alive.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/courses"
            className="px-8 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold transition-colors"
          >
            Start Learning
          </Link>
          <Link
            href="/playground"
            className="px-8 py-3 rounded-xl border border-surface-border hover:border-brand-500 text-slate-300 hover:text-white font-semibold transition-colors"
          >
            Open Playground
          </Link>
        </div>
      </div>
    </section>
  );
}
