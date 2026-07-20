"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { projects as projectsApi, Project, Task } from "@/lib/api";
import StatsCard from "@/components/dashboard/StatsCard";
import ProjectCard from "@/components/dashboard/ProjectCard";
import CreateProjectModal from "@/components/dashboard/CreateProjectModal";
import DashboardAssistant from "@/components/dashboard/DashboardAssistant";

function ActivityHeatmap({ tasks }: { tasks: Task[] }) {
  const days = Array.from({ length: 30 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (29 - index));
    const count = tasks.filter((task) => task.completed_at && new Date(task.completed_at).toDateString() === date.toDateString()).length;
    return { date, count };
  });
  const max = Math.max(1, ...days.map((day) => day.count));
  const color = (count: number) => count === 0 ? "#161b22" : count / max < .25 ? "#0e4429" : count / max < .5 ? "#006d32" : count / max < .75 ? "#26a641" : "#39d353";
  return <section style={{ marginBottom: 28, padding: "16px", borderRadius: 6, background: "#161b22", border: "1px solid #30363d" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}><div><h2 style={{ margin: 0, fontSize: 14, color: "#e6edf3" }}>Activity</h2><p style={{ margin: "4px 0 0", color: "#8b949e", fontSize: 12 }}>Tasks completed over the last 30 days</p></div><span style={{ color: "#3fb950", fontSize: 12, fontWeight: 600 }}>{days.reduce((sum, day) => sum + day.count, 0)} completed</span></div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(15, minmax(12px, 1fr))", gap: 5 }}>{days.map((day) => <div key={day.date.toISOString()} title={`${day.date.toLocaleDateString()}: ${day.count} completed`} style={{ aspectRatio: "1", minHeight: 13, borderRadius: 2, background: color(day.count) }} />)}</div>
    <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 5, marginTop: 9, color: "#8b949e", fontSize: 10 }}><span>Less</span>{["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"].map((level) => <i key={level} style={{ width: 10, height: 10, borderRadius: 2, background: level }} />)}<span>More</span></div>
  </section>;
}

export default function DashboardPage() {
  const { token, user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    if (!token) return;
    const fetchData = async () => {
      try {
        const projectList = await projectsApi.list(token);
        setProjects(projectList);
        const taskArrays = await Promise.all(
          projectList.map((p) => projectsApi.tasks(p.id, token).catch(() => []))
        );
        setAllTasks(taskArrays.flat());
      } catch (err) {
        console.error("Failed to load data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  useEffect(() => { if (typeof window !== "undefined" && !localStorage.getItem("coskill-onboarding-seen")) setShowTour(true); }, []);
  const closeTour = () => { localStorage.setItem("coskill-onboarding-seen", "true"); setShowTour(false); };

  const handleCreateProject = async (data: { title: string; goal: string; deadline?: string }) => {
    if (!token) return;
    const newProject = await projectsApi.create(data, token);
    setProjects((prev) => [newProject, ...prev]);
    window.dispatchEvent(new Event("projects:changed"));
  };

  const handleProjectDeleted = (projectId: string) => {
    setProjects((prev) => prev.filter((project) => project.id !== projectId));
    setAllTasks((prev) => prev.filter((task) => task.project_id !== projectId));
    window.dispatchEvent(new Event("projects:changed"));
  };

  const completedTasks = allTasks.filter((t) => t.status === "completed").length;
  const totalTasks = allTasks.length;
  const activeProjects = projects.filter((p) => p.status === "active").length;
  const completionPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const firstName = user?.full_name?.split(" ")[0] || "there";
  const visibleProjects = filter === "all" ? projects : projects.filter((project) => project.status === filter);

  /* ── Loading skeleton ─────────────────────────────────────── */
  if (loading) {
    return (
      <div className="github-dashboard" style={{ padding: "32px", background: "#0d1117", minHeight: "100vh", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "36px" }}>
          <div>
            <div style={{ width: "200px", height: "24px", borderRadius: "6px", background: "#161b22", marginBottom: "10px" }} />
            <div style={{ width: "140px", height: "14px", borderRadius: "6px", background: "#161b22" }} />
          </div>
          <div style={{ width: "128px", height: "32px", borderRadius: "6px", background: "#21262d" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "16px", marginBottom: "40px" }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ height: "110px", borderRadius: "6px", background: "#161b22", border: "1px solid #30363d" }} />
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "16px" }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ height: "130px", borderRadius: "6px", background: "#161b22", border: "1px solid #30363d" }} />
          ))}
        </div>
      </div>

    );
  }

  return (
    <div className="github-dashboard" style={{ padding: "32px", background: "#0d1117", minHeight: "100vh", color: "#e6edf3", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

      {/* ── Header ──────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "28px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 600, color: "#e6edf3", letterSpacing: "-0.02em", marginBottom: "4px" }}>
            Overview
          </h1>
          <p style={{ fontSize: "14px", color: "#8b949e" }}>
            {firstName}&apos;s projects, tasks, and recent activity
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "7px",
            padding: "7px 12px",
            background: "#238636",
            border: "1px solid rgba(240,246,252,.1)",
            borderRadius: "6px",
            color: "white",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
            transition: "background 0.15s ease",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#2ea043";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#238636";
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New project
        </button>
      </div>

      <div style={{ marginBottom: "20px", padding: "16px", borderRadius: "6px", background: "#161b22", border: "1px solid #30363d", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
        <div><p style={{ margin: 0, color: "#e6edf3", fontWeight: 600, fontSize: "14px" }}>Welcome back, {firstName}.</p><p style={{ margin: "5px 0 0", color: "#8b949e", fontSize: "13px" }}>{completedTasks} completed tasks across {activeProjects} active projects.</p></div>
        <div style={{ display: "flex", gap: "20px", flexShrink: 0 }}>{[["Completion", `${completionPct}%`], ["Projects", String(projects.length)]].map(([label, value]) => <div key={label} style={{ textAlign: "right" }}><b style={{ display: "block", color: "#e6edf3", fontSize: "18px", fontWeight: 600 }}>{value}</b><span style={{ color: "#8b949e", fontSize: "11px" }}>{label}</span></div>)}</div>
      </div>

      <DashboardAssistant token={token} />

      {/* ── Stats ───────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "16px", marginBottom: "28px" }}>
        <StatsCard
          label="Active Projects"
          value={activeProjects}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          }
        />
        <StatsCard
          label="Total Tasks"
          value={totalTasks}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
            </svg>
          }
        />
        <StatsCard
          label="Completed Tasks"
          value={completedTasks}
          change={`${completionPct}%`}
          trend="up"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          }
        />
        <StatsCard
          label="Performance Score"
          value="—"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        />
      </div>

      <ActivityHeatmap tasks={allTasks} />

      {/* ── Projects ─────────────────────────────────────────────── */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#e6edf3", letterSpacing: "-0.01em" }}>
            Your projects
            {projects.length > 0 && (
              <span style={{
                marginLeft: "8px",
                fontSize: "12px",
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: "2em",
                background: "#21262d",
                border: "1px solid #30363d",
                color: "#8b949e",
                verticalAlign: "middle",
              }}>
                {projects.length}
              </span>
            )}
          </h2>
          <div style={{ display: "flex", gap: "6px" }}>{(["all", "active", "completed"] as const).map((item) => <button key={item} onClick={() => setFilter(item)} style={{ padding: "5px 9px", borderRadius: "6px", border: "1px solid #30363d", background: filter === item ? "#21262d" : "transparent", color: filter === item ? "#e6edf3" : "#8b949e", textTransform: "capitalize", fontSize: "12px", cursor: "pointer" }}>{item}</button>)}</div>
        </div>

        {projects.length === 0 ? (
          /* ── Empty state ─────────────────────────────────────── */
          <div style={{
            background: "#161b22",
            border: "1px dashed #30363d",
            borderRadius: "6px",
            padding: "56px 32px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}>
          <div style={{ width: "44px", height: "44px", marginBottom: "20px", borderRadius: "6px", border: "1px solid #30363d", background: "#21262d", display: "grid", placeItems: "center", color: "#8b949e" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
            </div>

            <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#e6edf3", marginBottom: "8px" }}>
              No projects yet
            </h3>
            <p style={{ fontSize: "14px", color: "#8b949e", lineHeight: 1.5, maxWidth: "320px", marginBottom: "24px" }}>
              Create your first project and let AI decompose it into a full task breakdown in seconds.
            </p>
            <button
              onClick={() => setShowModal(true)}
              style={{
                display: "flex", alignItems: "center", gap: "7px",
                padding: "7px 12px",
                background: "#238636",
                border: "1px solid rgba(240,246,252,.1)", borderRadius: "6px",
                color: "white", fontSize: "14px", fontWeight: 600, cursor: "pointer",
                transition: "background 0.15s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#2ea043"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#238636"; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Create first project
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: "16px" }}>
            {visibleProjects.map((project) => (
              <ProjectCard key={project.id} project={project} onDeleted={handleProjectDeleted} />
            ))}
          </div>
        )}
      </div>

      <CreateProjectModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onCreate={handleCreateProject}
      />

      {showTour && <div role="dialog" aria-modal="true" aria-labelledby="tour-title" style={{ position: "fixed", inset: 0, zIndex: 70, display: "grid", placeItems: "center", padding: 20, background: "rgba(1,4,9,.78)" }}><div style={{ width: "min(100%, 650px)", padding: 28, borderRadius: 6, background: "#161b22", border: "1px solid #30363d", boxShadow: "0 16px 48px rgba(1,4,9,.75)" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}><div><p style={{ margin: 0, color: "#3fb950", fontSize: 11, fontWeight: 700, letterSpacing: ".08em" }}>WELCOME TO COSKILL</p><h2 id="tour-title" style={{ margin: "6px 0 0", color: "#e6edf3", fontSize: 22, fontWeight: 600 }}>Turn every project into proof of work.</h2></div><button onClick={closeTour} style={{ border: 0, background: "transparent", color: "#8b949e", cursor: "pointer", fontSize: 13 }}>Skip</button></div><div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 11, margin: "25px 0" }}>{[["01", "Create Project", "Add a goal and deadline."], ["02", "AI Decomposes", "Get focused tasks and skills."], ["03", "Build Your CV", "Track wins and share proof."]].map(([number, title, text]) => <div key={number} style={{ padding: 15, borderRadius: 6, background: "#0d1117", border: "1px solid #30363d" }}><b style={{ color: "#3fb950", fontSize: 12 }}>{number}</b><h3 style={{ margin: "13px 0 5px", color: "#e6edf3", fontSize: 14 }}>{title}</h3><p style={{ margin: 0, color: "#8b949e", fontSize: 12, lineHeight: 1.5 }}>{text}</p></div>)}</div><div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}><button onClick={closeTour} style={{ padding: "7px 12px", borderRadius: 6, background: "#21262d", border: "1px solid #30363d", color: "#e6edf3", cursor: "pointer" }}>Skip tour</button><button onClick={closeTour} style={{ padding: "7px 12px", borderRadius: 6, background: "#238636", border: "1px solid rgba(240,246,252,.1)", color: "white", fontWeight: 600, cursor: "pointer" }}>Let&apos;s go →</button></div></div></div>}
    </div>
  );
}
