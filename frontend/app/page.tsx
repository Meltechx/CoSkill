import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-slate-700">
        <span className="text-2xl font-bold text-indigo-400">CoSkill</span>
        <div className="flex gap-4">
          <Link href="/login" className="px-4 py-2 rounded-lg hover:bg-slate-700 transition">
            Log in
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-500 transition"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-4 py-32 gap-6">
        <h1 className="text-5xl font-extrabold leading-tight max-w-3xl">
          AI-Powered Performance Tracking &amp; Talent Discovery
        </h1>
        <p className="text-lg text-slate-400 max-w-xl">
          CoSkill helps teams track work performance, surface hidden talent, and
          generate AI insights — all in one place.
        </p>
        <Link
          href="/register"
          className="mt-4 px-8 py-3 bg-indigo-600 rounded-xl text-lg font-semibold hover:bg-indigo-500 transition"
        >
          Start for free
        </Link>
      </section>

      {/* Features */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 px-12 py-16 max-w-6xl mx-auto">
        {[
          { title: "Task Tracking", desc: "Assign, monitor, and complete tasks across projects." },
          { title: "Performance Score", desc: "Automated scoring based on quality, speed, and consistency." },
          { title: "AI Insights", desc: "Claude-powered analysis to surface strengths and growth areas." },
        ].map((f) => (
          <div key={f.title} className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <h3 className="text-xl font-semibold mb-2">{f.title}</h3>
            <p className="text-slate-400">{f.desc}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
