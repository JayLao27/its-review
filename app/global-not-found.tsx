export default function GlobalNotFound() {
  return (
    <html lang="en" className="dark">
      <body className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-100">
        <main className="max-w-md space-y-3 rounded-xl border border-slate-800 bg-slate-900/80 p-6 text-center shadow-xl">
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-400">404</p>
          <h1 className="text-2xl font-semibold">Page not found</h1>
          <p className="text-sm leading-6 text-slate-400">
            The requested route could not be found. Return to the review console and continue the triage.
          </p>
        </main>
      </body>
    </html>
  );
}
