import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen p-6">
      <main className="mx-auto max-w-6xl space-y-6">
        <header className="glass-card flex items-center justify-between rounded-2xl px-6 py-4 shadow-sm ring-1 ring-slate-200">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-700">
              University LMS
            </p>
            <h1 className="text-lg font-semibold text-slate-900">Campus Student Portal</h1>
          </div>
          <div className="flex gap-2">
            <Link
              href="/auth/login"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Sign In
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100"
            >
              Dashboard
            </Link>
          </div>
        </header>

        <section className="glass-card overflow-hidden rounded-3xl shadow-xl ring-1 ring-slate-200">
          <div className="grid gap-8 bg-gradient-to-r from-indigo-900 via-sky-900 to-violet-900 p-8 text-white md:grid-cols-[1.3fr_1fr] md:p-12">
            <div>
              <h2 className="text-3xl font-semibold leading-tight md:text-4xl">
                Your real university day in one dashboard
              </h2>
              <p className="mt-4 text-sm text-indigo-100 md:text-base">
                Start your morning with schedule and attendance, monitor grades
                before midterms, submit official requests online, and receive
                urgent academic alerts in one place.
              </p>
              <div className="mt-6 flex flex-wrap gap-3 text-sm">
                <span className="rounded-full bg-white/15 px-3 py-1">Schedule & Attendance</span>
                <span className="rounded-full bg-white/15 px-3 py-1">Grades & GPA</span>
                <span className="rounded-full bg-white/15 px-3 py-1">Official Requests</span>
              </div>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-100">
                Real-time status
              </p>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between rounded-lg bg-white/10 px-3 py-2">
                  <span>Academic alerts</span>
                  <span className="font-semibold">Online</span>
                </div>
                <div className="flex justify-between rounded-lg bg-white/10 px-3 py-2">
                  <span>Services portal</span>
                  <span className="font-semibold">Operational</span>
                </div>
                <div className="flex justify-between rounded-lg bg-white/10 px-3 py-2">
                  <span>Grade sync</span>
                  <span className="font-semibold">Updated</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <article className="glass-card rounded-2xl p-6 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
              Typical student case
            </p>
            <h3 className="mt-2 text-lg font-semibold text-slate-900">
              “I have exam week and one document request”
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              <li>• Check tomorrow classes and room changes</li>
              <li>• Review course grades and risk subjects</li>
              <li>• Send dormitory certificate request</li>
              <li>• Track request status without visiting office</li>
            </ul>
          </article>
          <article className="glass-card rounded-2xl p-6 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
              Why this portal matters
            </p>
            <h3 className="mt-2 text-lg font-semibold text-slate-900">
              Faster academic decisions, less admin friction
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              <li>• One account for all student workflows</li>
              <li>• Clear priorities: must academic operations first</li>
              <li>• Data-backed dashboard with PostgreSQL</li>
              <li>• Scalable structure for university growth</li>
            </ul>
          </article>
        </section>

        <footer className="px-2 pb-4 text-center text-xs text-slate-500">
          Campus Student Portal • Real workflow case: study, track progress, request services
        </footer>
      </main>
    </div>
  );
}
