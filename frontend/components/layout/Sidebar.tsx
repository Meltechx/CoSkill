import Link from "next/link";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Projects", href: "/dashboard/projects" },
  { label: "Tasks", href: "/dashboard/tasks" },
  { label: "Performance", href: "/dashboard/performance" },
  { label: "Leaderboard", href: "/dashboard/leaderboard" },
];

export default function Sidebar() {
  return (
    <aside className="w-56 min-h-screen bg-slate-800 border-r border-slate-700 flex flex-col py-8 px-4">
      <span className="text-xl font-bold text-indigo-400 mb-10 px-2">CoSkill</span>
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
