"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { projects as projectsApi, Project, Task } from "@/lib/api";
import StatsCard from "@/components/dashboard/StatsCard";
import ProjectCard from "@/components/dashboard/ProjectCard";
import CreateProjectModal from "@/components/dashboard/CreateProjectModal";

function ActivityHeatmap({ tasks }: { tasks: Task[] }) {
  const days = Array.from({ length: 30 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (29 - index));
    const count = tasks.filter((task) => task.completed_at && new Date(task.completed_at).toDateString() === date.toDateString()).length;
    return { date, count };
  });
  const max = Math.max(1, ...days.map((day) => day.count));
  const color = (count: number) => count === 0 ? "rgba(255,255,255,.06)" : count / max < .34 ? "rgba(34,197,94,.35)" : count / max < .67 ? "rgba(34,197,94,.63)" : "#22c55e";
  return <section style={{ marginBottom: 28, padding: "19px 20px", borderRadius: 15, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.07)" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}><div><h2 style={{ margin: 0, fontSize: 15 }}>Activity</h2><p style={{ margin: "4px 0 0", color: "rgba(255,255,255,.38)", fontSize: 12 }}>Tasks completed over the last 30 days</p></div><span style={{ color: "#4ade80", fontSize: 12, fontWeight: 700 }}>{days.reduce((sum, day) => sum + day.count, 0)} completed</span></div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(15, minmax(12px, 1fr))", gap: 6 }}>{days.map((day) => <div key={day.date.toISOString()} title={`${day.date.toLocaleDateString()}: ${day.count} completed`} style={{ aspectRatio: "1", minHeight: 13, borderRadius: 3, background: color(day.count), boxShadow: day.count ? "0 0 8px rgba(34,197,94,.16)" : "none" }} />)}</div>
    <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 5, marginTop: 9, color: "rgba(255,255,255,.32)", fontSize: 10 }}><span>Less</span>{[0, .25, .55, 1].map((level) => <i key={level} style={{ width: 10, height: 10, borderRadius: 2, background: level ? `rgba(34,197,94,${level})` : "rgba(255,255,255,.06)" }} />)}<span>More</span></div>
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
  };

  const handleProjectDeleted = (projectId: string) => {
    setProjects((prev) => prev.filter((project) => project.id !== projectId));
    setAllTasks((prev) => prev.filter((task) => task.project_id !== projectId));
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
      <div style={{ padding: "40px", background: "#080808", minHeight: "100vh" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "36px" }}>
          <div>
            <div style={{ width: "200px", height: "24px", borderRadius: "8px", background: "rgba(255,255,255,0.06)", marginBottom: "10px" }} />
            <div style={{ width: "140px", height: "14px", borderRadius: "6px", background: "rgba(255,255,255,0.04)" }} />
          </div>
          <div style={{ width: "128px", height: "40px", borderRadius: "10px", background: "rgba(168,85,247,0.12)" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "16px", marginBottom: "40px" }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ height: "110px", borderRadius: "14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }} />
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "16px" }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ height: "130px", borderRadius: "14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }} />
          ))}
        </div>
      </div>

    );
  }

  return (
    <div style={{ padding: "40px", background: "#080808", minHeight: "100vh", color: "white" }}>

      {/* ── Header ──────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "36px" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "white", letterSpacing: "-0.03em", marginBottom: "4px" }}>
            Good to see you, {firstName} 👋
          </h1>
          <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.38)" }}>
            Here&apos;s your performance overview
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "7px",
            padding: "10px 20px",
            background: "linear-gradient(135deg, #a855f7, #3b82f6)",
            border: "none",
            borderRadius: "10px",
            color: "white",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 0 28px rgba(168,85,247,0.28)",
            transition: "opacity 0.2s, box-shadow 0.2s",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "0.9";
            e.currentTarget.style.boxShadow = "0 0 40px rgba(168,85,247,0.42)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1";
            e.currentTarget.style.boxShadow = "0 0 28px rgba(168,85,247,0.28)";
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New project
        </button>
      </div>

      <div style={{ marginBottom: "22px", padding: "18px 20px", borderRadius: "15px", background: "linear-gradient(110deg, rgba(168,85,247,.16), rgba(59,130,246,.08))", border: "1px solid rgba(168,85,247,.2)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
        <div><p style={{ margin: 0, color: "#d8b4fe", fontWeight: 700, fontSize: "13px" }}>Welcome back, {firstName}.</p><p style={{ margin: "5px 0 0", color: "rgba(255,255,255,.5)", fontSize: "13px" }}>{completedTasks} completed tasks across {activeProjects} active projects.</p></div>
        <div style={{ display: "flex", gap: "14px", flexShrink: 0 }}>{[["Completion", `${completionPct}%`], ["Workspaces", String(projects.length)]].map(([label, value]) => <div key={label} style={{ textAlign: "right" }}><b style={{ display: "block", fontSize: "18px" }}>{value}</b><span style={{ color: "rgba(255,255,255,.4)", fontSize: "11px" }}>{label}</span></div>)}</div>
      </div>

      {/* ── Stats ───────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "16px", marginBottom: "40px" }}>
        <StatsCard
          label="Active Projects"
          value={activeProjects}
          gradient="linear-gradient(135deg, rgba(168,85,247,0.9), rgba(99,102,241,0.9))"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          }
        />
        <StatsCard
          label="Total Tasks"
          value={totalTasks}
          gradient="linear-gradient(135deg, rgba(59,130,246,0.9), rgba(6,182,212,0.9))"
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
          gradient="linear-gradient(135deg, rgba(34,197,94,0.9), rgba(16,185,129,0.9))"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          }
        />
        <StatsCard
          label="Performance Score"
          value="—"
          gradient="linear-gradient(135deg, rgba(251,146,60,0.9), rgba(234,179,8,0.9))"
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
          <h2 style={{ fontSize: "16px", fontWeight: 700, color: "white", letterSpacing: "-0.02em" }}>
            Your projects
            {projects.length > 0 && (
              <span style={{
                marginLeft: "8px",
                fontSize: "12px",
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: "6px",
                background: "rgba(168,85,247,0.12)",
                color: "#c084fc",
                verticalAlign: "middle",
              }}>
                {projects.length}
              </span>
            )}
          </h2>
          <div style={{ display: "flex", gap: "6px" }}>{(["all", "active", "completed"] as const).map((item) => <button key={item} onClick={() => setFilter(item)} style={{ padding: "5px 9px", borderRadius: "6px", border: "1px solid rgba(255,255,255,.09)", background: filter === item ? "rgba(168,85,247,.18)" : "transparent", color: filter === item ? "#d8b4fe" : "rgba(255,255,255,.45)", textTransform: "capitalize", fontSize: "12px", cursor: "pointer" }}>{item}</button>)}</div>
        </div>

        {projects.length === 0 ? (
          /* ── Empty state ─────────────────────────────────────── */
          <div style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px dashed rgba(255,255,255,0.1)",
            borderRadius: "16px",
            padding: "72px 32px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}>
            {/* Concentric ring illustration */}
            <div style={{ position: "relative", width: "80px", height: "80px", marginBottom: "28px" }}>
              <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "1px solid rgba(168,85,247,0.2)" }} />
              <div style={{ position: "absolute", inset: "14px", borderRadius: "50%", border: "1px solid rgba(99,102,241,0.25)" }} />
              <div style={{
                position: "absolute", inset: "28px", borderRadius: "50%",
                background: "linear-gradient(135deg, #a855f7, #3b82f6)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
              {[0, 72, 144, 216, 288].map((deg) => (
                <div key={deg} style={{
                  position: "absolute",
                  width: "5px", height: "5px", borderRadius: "50%",
                  background: deg === 0 ? "rgba(168,85,247,0.6)" : deg === 144 ? "rgba(59,130,246,0.5)" : "rgba(255,255,255,0.1)",
                  top: `${50 - 45 * Math.cos((deg * Math.PI) / 180)}%`,
                  left: `${50 + 45 * Math.sin((deg * Math.PI) / 180)}%`,
                  transform: "translate(-50%,-50%)",
                }} />
              ))}
            </div>

            <h3 style={{ fontSize: "16px", fontWeight: 700, color: "white", letterSpacing: "-0.02em", marginBottom: "8px" }}>
              No projects yet
            </h3>
            <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.38)", lineHeight: 1.65, maxWidth: "320px", marginBottom: "28px" }}>
              Create your first project and let AI decompose it into a full task breakdown in seconds.
            </p>
            <button
              onClick={() => setShowModal(true)}
              style={{
                display: "flex", alignItems: "center", gap: "7px",
                padding: "10px 22px",
                background: "linear-gradient(135deg, #a855f7, #3b82f6)",
                border: "none", borderRadius: "10px",
                color: "white", fontSize: "14px", fontWeight: 600, cursor: "pointer",
                boxShadow: "0 0 24px rgba(168,85,247,0.25)",
                transition: "opacity 0.2s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
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

      {showTour && <div role="dialog" aria-modal="true" aria-labelledby="tour-title" style={{ position: "fixed", inset: 0, zIndex: 70, display: "grid", placeItems: "center", padding: 20, background: "rgba(0,0,0,.75)", backdropFilter: "blur(7px)" }}><div style={{ width: "min(100%, 650px)", padding: 28, borderRadius: 19, background: "#141414", border: "1px solid rgba(168,85,247,.27)", boxShadow: "0 32px 90px rgba(0,0,0,.6)" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}><div><p style={{ margin: 0, color: "#c084fc", fontSize: 11, fontWeight: 800, letterSpacing: ".1em" }}>WELCOME TO COSKILL</p><h2 id="tour-title" style={{ margin: "6px 0 0", fontSize: 23, letterSpacing: "-.04em" }}>Turn every project into proof of work.</h2></div><button onClick={closeTour} style={{ border: 0, background: "transparent", color: "rgba(255,255,255,.45)", cursor: "pointer", fontSize: 13 }}>Skip</button></div><div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 11, margin: "25px 0" }}>{[["01", "Create Project", "Add a goal and deadline."], ["02", "AI Decomposes", "Get focused tasks and skills."], ["03", "Build Your CV", "Track wins and share proof."]].map(([number, title, text]) => <div key={number} style={{ padding: 15, borderRadius: 12, background: "rgba(255,255,255,.035)", border: "1px solid rgba(255,255,255,.07)" }}><b style={{ color: "#c084fc", fontSize: 12 }}>{number}</b><h3 style={{ margin: "13px 0 5px", fontSize: 14 }}>{title}</h3><p style={{ margin: 0, color: "rgba(255,255,255,.42)", fontSize: 12, lineHeight: 1.5 }}>{text}</p></div>)}</div><div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}><button onClick={closeTour} style={{ padding: "9px 13px", borderRadius: 8, background: "transparent", border: "1px solid rgba(255,255,255,.1)", color: "rgba(255,255,255,.6)", cursor: "pointer" }}>Skip tour</button><button onClick={closeTour} style={{ padding: "9px 14px", borderRadius: 8, background: "linear-gradient(135deg,#a855f7,#3b82f6)", border: 0, color: "white", fontWeight: 700, cursor: "pointer" }}>Let&apos;s go →</button></div></div></div>}
    </div>
  );
}
