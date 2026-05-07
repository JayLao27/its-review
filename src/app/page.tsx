export default function HomePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.9),_rgba(231,229,228,0.75)_34%,_rgba(214,211,209,0.95))] text-stone-900">
      <section className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-6 py-16 sm:px-10 lg:px-12">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-6">
            <span className="inline-flex items-center rounded-full border border-stone-300/80 bg-white/70 px-4 py-1 text-xs font-medium uppercase tracking-[0.22em] text-stone-600 shadow-sm backdrop-blur">
              Next.js ready
            </span>
            <div className="space-y-4">
              <h1 className="max-w-xl text-5xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">
                A clean base for the next part of this project.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-stone-600 sm:text-lg">
                This workspace now has a proper Next.js app router scaffold,
                Tailwind configured, and shadcn-compatible aliases in place.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                className="rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-stone-800"
                href="https://ui.shadcn.com/docs/installation/next"
                target="_blank"
                rel="noreferrer"
              >
                Continue with shadcn/ui
              </a>
              <a
                className="rounded-full border border-stone-300 bg-white/70 px-5 py-3 text-sm font-medium text-stone-700 transition hover:bg-white"
                href="https://nextjs.org/docs"
                target="_blank"
                rel="noreferrer"
              >
                Next.js docs
              </a>
            </div>
          </div>

          <div className="rounded-3xl border border-white/70 bg-white/60 p-4 shadow-[0_24px_80px_rgba(28,25,23,0.12)] backdrop-blur-xl">
            <div className="rounded-[1.4rem] border border-stone-200 bg-stone-950 p-6 text-stone-100 shadow-inner">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.22em] text-stone-400">
                <span>App shell</span>
                <span>src/app/page.tsx</span>
              </div>
              <div className="mt-8 space-y-4">
                <div className="h-3 w-24 rounded-full bg-stone-700" />
                <div className="h-3 w-3/4 rounded-full bg-stone-800" />
                <div className="h-3 w-5/6 rounded-full bg-stone-800" />
              </div>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-stone-800 bg-stone-900 p-4">
                  <div className="text-xs text-stone-500">Framework</div>
                  <div className="mt-2 text-sm font-medium">Next.js</div>
                </div>
                <div className="rounded-2xl border border-stone-800 bg-stone-900 p-4">
                  <div className="text-xs text-stone-500">Styles</div>
                  <div className="mt-2 text-sm font-medium">Tailwind</div>
                </div>
                <div className="rounded-2xl border border-stone-800 bg-stone-900 p-4">
                  <div className="text-xs text-stone-500">UI</div>
                  <div className="mt-2 text-sm font-medium">shadcn-ready</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}