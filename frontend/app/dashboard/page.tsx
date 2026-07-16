import Sidebar from "@/components/layout/Sidebar";
import StatsCard from "@/components/dashboard/StatsCard";

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen bg-slate-900 text-white">
      <Sidebar />

      <main className="flex-1 p-8">
        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <StatsCard label="Tasks Completed" value="—" />
          <StatsCard label="On-Time Rate" value="—" />
          <StatsCard label="Performance Score" value="—" />
          <StatsCard label="Active Projects" value="—" />
        </div>

        {/* Placeholder sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 h-64 flex items-center justify-center text-slate-500">
            Recent Tasks — coming soon
          </div>
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 h-64 flex items-center justify-center text-slate-500">
            AI Insights — coming soon
          </div>
        </div>
      </main>
    </div>
  );
}
