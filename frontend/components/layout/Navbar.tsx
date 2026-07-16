import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="flex items-center justify-between px-8 py-4 bg-slate-800 border-b border-slate-700">
      <Link href="/" className="text-xl font-bold text-indigo-400">
        CoSkill
      </Link>
      <div className="flex gap-4 text-sm">
        <Link href="/dashboard" className="hover:text-indigo-400 transition">Dashboard</Link>
        <button className="hover:text-red-400 transition">Log out</button>
      </div>
    </nav>
  );
}
