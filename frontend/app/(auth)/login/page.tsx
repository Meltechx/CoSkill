import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
      <div className="w-full max-w-md bg-slate-800 rounded-2xl p-8 border border-slate-700">
        <h1 className="text-2xl font-bold mb-6 text-center">Log in to CoSkill</h1>

        <form className="flex flex-col gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <button
            type="submit"
            className="mt-2 w-full py-2 bg-indigo-600 rounded-lg font-semibold hover:bg-indigo-500 transition"
          >
            Log in
          </button>
        </form>

        <p className="text-center text-slate-400 mt-4 text-sm">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-indigo-400 hover:underline">
            Register
          </Link>
        </p>
      </div>
    </main>
  );
}
