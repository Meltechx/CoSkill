"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { projects as projectsApi, Project, SprintPlan, Task, TeamMatch } from "@/lib/api";

/* ── Helpers ──────────────────────────────────────────────────────────── */

const TAG_PALETTES = [
  { bg: "rgba(168,85,247,0.12)", color: "#c084fc", border: "rgba(168,85,247,0.2)" },
  { bg: "rgba(59,130,246,0.12)", color: "#60a5fa", border: "rgba(59,130,246,0.2)" },
  { bg: "rgba(6,182,212,0.12)", color: "#22d3ee", border: "rgba(6,182,212,0.2)" },
  { bg: "rgba(34,197,94,0.12)", color: "#4ade80", border: "rgba(34,197,94,0.2)" },
  { bg: "rgba(251,146,60,0.12)", color: "#fb923c", border: "rgba(251,146,60,0.2)" },
];

function tagPalette(tag: string) {
  let h = 0;
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) & 0xffff;
  return TAG_PALETTES[h % TAG_PALETTES.length];
}

const DIFFICULTY = {
  easy:   { label: "Easy",   bg: "rgba(34,197,94,0.1)",  color: "#4ade80", border: "rgba(34,197,94,0.2)" },
  medium: { label: "Medium", bg: "rgba(251,191,36,0.1)", color: "#fbbf24", border: "rgba(251,191,36,0.2)" },
  hard:   { label: "Hard",   bg: "rgba(251,146,60,0.1)", color: "#fb923c", border: "rgba(251,146,60,0.2)" },
  expert: { label: "Expert", bg: "rgba(239,68,68,0.1)",  color: "#f87171", border: "rgba(239,68,68,0.2)" },
};

const STATUS = {
  todo:        { label: "To do",       bg: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.45)", border: "rgba(255,255,255,0.1)" },
  in_progress: { label: "In progress", bg: "rgba(59,130,246,0.1)",   color: "#60a5fa",               border: "rgba(59,130,246,0.2)" },
  completed:   { label: "Completed",   bg: "rgba(34,197,94,0.1)",    color: "#4ade80",               border: "rgba(34,197,94,0.2)" },
  cancelled:   { label: "Cancelled",   bg: "rgba(239,68,68,0.08)",   color: "#f87171",               border: "rgba(239,68,68,0.2)" },
};

const PROJECT_STATUS = {
  active:    { label: "Active",    color: "#4ade80", bg: "rgba(34,197,94,0.08)",   border: "rgba(34,197,94,0.2)" },
  completed: { label: "Completed", color: "#60a5fa", bg: "rgba(59,130,246,0.08)",  border: "rgba(59,130,246,0.2)" },
  paused:    { label: "Paused",    color: "#fbbf24", bg: "rgba(251,191,36,0.08)",  border: "rgba(251,191,36,0.2)" },
  archived:  { label: "Archived",  color: "rgba(255,255,255,0.35)", bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.1)" },
};

const SPRINT_RISK_COLOR = { low: "#4ade80", medium: "#fbbf24", high: "#fb923c" };
const SPRINT_PRIORITY = {
  critical: { color: "#f87171", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.28)" },
  high: { color: "#fb923c", bg: "rgba(251,146,60,0.12)", border: "rgba(251,146,60,0.28)" },
  medium: { color: "#fbbf24", bg: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.28)" },
  low: { color: "#4ade80", bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.28)" },
};

/* ── Spinner ──────────────────────────────────────────────────────────── */
function Spinner({ size = 16, color = "white" }: { size?: number; color?: string }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        border: `2px solid ${color}33`,
        borderTopColor: color,
        borderRadius: "50%",
        flexShrink: 0,
        animation: "spin 0.7s linear infinite",
      }}
    />
  );
}

/* ── Decomposing overlay ──────────────────────────────────────────────── */
function DecomposingOverlay() {
  return (
    <div
      style={{
        padding: "48px 32px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "20px",
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(168,85,247,0.15)",
        borderRadius: "16px",
      }}
    >
      {/* Pulsing orb */}
      <div style={{ position: "relative", width: "56px", height: "56px" }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #a855f7, #3b82f6)",
            opacity: 0.15,
            animation: "orb-drift 2s ease-in-out infinite",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: "8px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #a855f7, #3b82f6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Spinner size={18} color="white" />
        </div>
      </div>

      <div>
        <p style={{ fontSize: "15px", fontWeight: 600, color: "white", marginBottom: "6px" }}>
          AI is decomposing your project…
        </p>
        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
          Analyzing your goal and generating actionable tasks with estimates and skill tags.
        </p>
      </div>

      {/* Animated dots */}
      <div style={{ display: "flex", gap: "6px" }}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #a855f7, #3b82f6)",
              opacity: 0.4,
              animation: `badge-pulse 1.2s ${i * 0.2}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Task card ────────────────────────────────────────────────────────── */
function TaskCard({
  task,
  projectId,
}: {
  task: Task;
  projectId: string;
}) {
  const diff = DIFFICULTY[task.difficulty] ?? DIFFICULTY.medium;
  const stat = STATUS[task.status] ?? STATUS.todo;
  const isDone = task.status === "completed";

  return (
    <Link
      href={`/dashboard/projects/${projectId}/tasks/${task.id}`}
      style={{ textDecoration: "none", color: "inherit", display: "block" }}
    >
      <div
        style={{
          background: isDone ? "rgba(255,255,255,0.015)" : "rgba(255,255,255,0.03)",
          border: `1px solid ${isDone ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.07)"}`,
          borderRadius: "12px",
          padding: "16px 18px",
          transition: "border-color 0.2s, background 0.2s",
          opacity: isDone && !task.is_flagged ? 0.65 : 1,
          cursor: "pointer",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(168,85,247,0.25)";
          (e.currentTarget as HTMLDivElement).style.background = isDone ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.045)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = isDone ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.07)";
          (e.currentTarget as HTMLDivElement).style.background = isDone ? "rgba(255,255,255,0.015)" : "rgba(255,255,255,0.03)";
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
          {/* Status indicator */}
          <div
            style={{
              marginTop: "1px",
              width: "20px",
              height: "20px",
              borderRadius: "6px",
              border: isDone ? "none" : "1.5px solid rgba(255,255,255,0.2)",
              background: isDone
                ? "linear-gradient(135deg, #a855f7, #3b82f6)"
                : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {isDone && (
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>

          {/* Body */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Title row */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", marginBottom: "6px" }}>
              <h3
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: isDone ? "rgba(255,255,255,0.4)" : "white",
                  textDecoration: isDone ? "line-through" : "none",
                  letterSpacing: "-0.01em",
                  lineHeight: 1.35,
                }}
              >
                {task.title}
              </h3>
              {/* Status badge */}
              <span
                style={{
                  flexShrink: 0,
                  fontSize: "11px",
                  fontWeight: 600,
                  padding: "3px 8px",
                  borderRadius: "6px",
                  background: stat.bg,
                  border: `1px solid ${stat.border}`,
                  color: stat.color,
                  whiteSpace: "nowrap",
                }}
              >
                {stat.label}
              </span>
            </div>

            {/* Description */}
            {task.description && (
              <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.38)", lineHeight: 1.6, marginBottom: "10px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {task.description}
              </p>
            )}

            {/* Meta pills */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
              {isDone && (
                <span
                  style={{
                    fontSize: "11px", fontWeight: 700, padding: "3px 8px", borderRadius: "6px",
                    background: task.is_flagged ? "rgba(251,191,36,0.12)" : "rgba(34,197,94,0.1)",
                    border: `1px solid ${task.is_flagged ? "rgba(251,191,36,0.28)" : "rgba(34,197,94,0.25)"}`,
                    color: task.is_flagged ? "#fbbf24" : "#4ade80",
                  }}
                >
                  {task.is_flagged ? "Under Review" : "Verified"}
                </span>
              )}
              {/* Difficulty */}
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  padding: "3px 8px",
                  borderRadius: "6px",
                  background: diff.bg,
                  border: `1px solid ${diff.border}`,
                  color: diff.color,
                }}
              >
                {diff.label}
              </span>

              {/* Hours */}
              {task.estimated_hours != null && (
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 500,
                    padding: "3px 8px",
                    borderRadius: "6px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "rgba(255,255,255,0.45)",
                    display: "flex",
                    alignItems: "center",
                    gap: "3px",
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                  </svg>
                  {task.estimated_hours}h
                </span>
              )}

              {/* Skill tags */}
              {task.skill_tags.map((tag) => {
                const p = tagPalette(tag);
                return (
                  <span
                    key={tag}
                    style={{
                      fontSize: "11px",
                      fontWeight: 500,
                      padding: "3px 8px",
                      borderRadius: "6px",
                      background: p.bg,
                      border: `1px solid ${p.border}`,
                      color: p.color,
                    }}
                  >
                    {tag}
                  </span>
                );
              })}

              {/* Arrow indicator */}
              <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", color: "rgba(255,255,255,0.2)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ── Main page ────────────────────────────────────────────────────────── */
export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [decomposing, setDecomposing] = useState(false);
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [teamMatches, setTeamMatches] = useState<TeamMatch[]>([]);
  const [matchingTeam, setMatchingTeam] = useState(false);
  const [teamFilter, setTeamFilter] = useState<{ role: string; experience: string }>({ role: "", experience: "" });
  const [showSprintModal, setShowSprintModal] = useState(false);
  const [sprintDuration, setSprintDuration] = useState(16);
  const [teamSize, setTeamSize] = useState(1);
  const [sprintPlanning, setSprintPlanning] = useState(false);
  const [sprintPlan, setSprintPlan] = useState<SprintPlan | null>(null);

  useEffect(() => {
    if (!token || !projectId) return;
    const fetchData = async () => {
      try {
        const [proj, taskList] = await Promise.all([
          projectsApi.get(projectId, token),
          projectsApi.tasks(projectId, token),
        ]);
        setProject(proj);
        setTasks(taskList);

      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load project");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token, projectId]);

  const handleDecompose = async () => {
    if (!token) return;
    setDecomposing(true);
    setError("");
    try {
      const newTasks = await projectsApi.decompose(projectId, token);
      setTasks((prev) => [...newTasks, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to decompose project");
    } finally {
      setDecomposing(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!token) return;
    try {
      await projectsApi.delete(projectId, token);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete project");
      setDeleteConfirm(false);
    }
  };

  const handlePlanSprint = async () => {
    if (!token) return;
    setSprintPlanning(true);
    setError("");
    try {
      const plan = await projectsApi.sprint(projectId, { duration_hours: sprintDuration, team_size: teamSize }, token);
      setSprintPlan(plan);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to plan sprint");
    } finally {
      setSprintPlanning(false);
    }
  };

  const handleFindTeammates = async () => {
    if (!token || matchingTeam) return;
    setMatchingTeam(true);
    setError("");
    setShowTeamModal(true);
    try {
      const matches = await projectsApi.matchTeammates(projectId, token);
      setTeamMatches(matches);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to find teammates");
    } finally {
      setMatchingTeam(false);
    }
  };

  /* ── Derived ── */
  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const totalTasks = tasks.length;
  const progressPct = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
  const totalHours = tasks.reduce((s, t) => s + (t.estimated_hours ?? 0), 0);
  const sprintAssignments = sprintPlan?.phases.flatMap((phase) => phase.tasks) ?? [];
  const sprintEstimatedHours = sprintAssignments.reduce((total, task) => total + task.estimated_hours, 0);
  const sprintCriticalTasks = sprintAssignments.filter((task) => task.priority === "critical").length;

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div style={{ padding: "40px", background: "#080808", minHeight: "100vh" }}>
        <div style={{ maxWidth: "820px" }}>
          <div style={{ width: "160px", height: "14px", borderRadius: "6px", background: "rgba(255,255,255,0.06)", marginBottom: "32px" }} />
          <div style={{ width: "300px", height: "28px", borderRadius: "8px", background: "rgba(255,255,255,0.07)", marginBottom: "12px" }} />
          <div style={{ width: "480px", height: "16px", borderRadius: "6px", background: "rgba(255,255,255,0.04)", marginBottom: "32px" }} />
          <div style={{ height: "6px", borderRadius: "99px", background: "rgba(255,255,255,0.05)", marginBottom: "32px" }} />
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ height: "90px", borderRadius: "12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: "10px" }} />
          ))}
        </div>
      </div>
    );
  }

  /* ── Not found ── */
  if (!project) {
    return (
      <div style={{ padding: "40px", background: "#080808", minHeight: "100vh", color: "white" }}>
        <p style={{ color: "#f87171", marginBottom: "16px" }}>{error || "Project not found"}</p>
        <Link href="/dashboard" style={{ color: "#a855f7", fontSize: "14px", textDecoration: "none" }}>
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  const ps = PROJECT_STATUS[project.status] ?? PROJECT_STATUS.active;

  return (
    <div style={{ padding: "40px", background: "#080808", minHeight: "100vh", color: "white" }}>
      <div style={{ maxWidth: "820px" }}>

        {/* ── Breadcrumb ────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "28px" }}>
          <Link
            href="/dashboard"
            style={{ fontSize: "13px", color: "rgba(255,255,255,0.35)", textDecoration: "none", transition: "color 0.15s" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.35)")}
          >
            Dashboard
          </Link>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
          <Link
            href="/dashboard/projects"
            style={{ fontSize: "13px", color: "rgba(255,255,255,0.35)", textDecoration: "none", transition: "color 0.15s" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.35)")}
          >
            Projects
          </Link>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
          <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.55)", maxWidth: "240px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {project.title}
          </span>
        </div>

        {/* ── Project header ────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "20px", marginBottom: "24px" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "8px" }}>
              <h1 style={{ fontSize: "24px", fontWeight: 800, color: "white", letterSpacing: "-0.04em", lineHeight: 1.1 }}>
                {project.title}
              </h1>
              <span
                style={{
                  fontSize: "12px", fontWeight: 600, padding: "4px 10px", borderRadius: "8px",
                  background: ps.bg, border: `1px solid ${ps.border}`, color: ps.color,
                }}
              >
                {ps.label}
              </span>
            </div>
            {project.goal && (
              <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.45)", lineHeight: 1.6, maxWidth: "540px" }}>
                {project.goal}
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: "8px", flexShrink: 0, flexWrap: "wrap" }}>
            <button
              onClick={handleFindTeammates}
              disabled={matchingTeam || totalTasks === 0}
              style={{
                display: "flex", alignItems: "center", gap: "7px", padding: "9px 14px",
                background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.28)",
                borderRadius: "9px", color: "#86efac", fontSize: "13px", fontWeight: 600,
                cursor: matchingTeam || totalTasks === 0 ? "not-allowed" : "pointer",
                opacity: totalTasks === 0 ? 0.45 : 1, whiteSpace: "nowrap",
              }}
            >
              {matchingTeam ? <Spinner size={13} color="#86efac" /> : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4-4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
                </svg>
              )}
              {matchingTeam ? "Matching…" : "Find Teammates"}
            </button>
            <button
              onClick={() => { setSprintPlan(null); setShowSprintModal(true); }}
              disabled={tasks.filter((task) => task.status !== "completed" && task.status !== "cancelled").length === 0}
              style={{ display: "flex", alignItems: "center", gap: "7px", padding: "9px 14px", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.28)", borderRadius: "9px", color: "#93c5fd", fontSize: "13px", fontWeight: 600, cursor: "pointer", opacity: tasks.filter((task) => task.status !== "completed" && task.status !== "cancelled").length === 0 ? 0.45 : 1, whiteSpace: "nowrap" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="m7 16 4-5 3 2 5-7" /></svg>
              Plan Sprint
            </button>
            {/* AI Decompose */}
            <button
              onClick={handleDecompose}
              disabled={decomposing}
              style={{
                display: "flex", alignItems: "center", gap: "7px",
                padding: "9px 16px",
                background: decomposing ? "rgba(168,85,247,0.4)" : "linear-gradient(135deg, #a855f7, #3b82f6)",
                border: "none", borderRadius: "9px",
                color: "white", fontSize: "13px", fontWeight: 600,
                cursor: decomposing ? "not-allowed" : "pointer",
                boxShadow: decomposing ? "none" : "0 0 24px rgba(168,85,247,0.3)",
                transition: "opacity 0.2s, box-shadow 0.2s",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => { if (!decomposing) { e.currentTarget.style.opacity = "0.9"; e.currentTarget.style.boxShadow = "0 0 36px rgba(168,85,247,0.45)"; } }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.boxShadow = decomposing ? "none" : "0 0 24px rgba(168,85,247,0.3)"; }}
            >
              {decomposing ? (
                <Spinner size={13} color="white" />
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              )}
              {decomposing ? "Analyzing…" : tasks.length > 0 ? "Re-decompose" : "AI Decompose"}
            </button>

            {/* Delete */}
            {!deleteConfirm ? (
              <button
                onClick={() => setDeleteConfirm(true)}
                style={{
                  padding: "9px 14px", borderRadius: "9px",
                  background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)",
                  color: "rgba(239,68,68,0.7)", fontSize: "13px", fontWeight: 500, cursor: "pointer",
                  transition: "background 0.15s, color 0.15s, border-color 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.14)"; e.currentTarget.style.color = "#f87171"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.3)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; e.currentTarget.style.color = "rgba(239,68,68,0.7)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.15)"; }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                </svg>
              </button>
            ) : (
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  onClick={handleDeleteProject}
                  style={{
                    padding: "9px 14px", borderRadius: "9px",
                    background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)",
                    color: "#f87171", fontSize: "13px", fontWeight: 600, cursor: "pointer",
                  }}
                >
                  Confirm delete
                </button>
                <button
                  onClick={() => setDeleteConfirm(false)}
                  style={{
                    padding: "9px 12px", borderRadius: "9px",
                    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)",
                    color: "rgba(255,255,255,0.5)", fontSize: "13px", cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Error ─────────────────────────────────────────────── */}
        {error && (
          <div style={{
            marginBottom: "20px", padding: "12px 14px", borderRadius: "10px",
            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
            color: "#fca5a5", fontSize: "13px", display: "flex", alignItems: "center", gap: "8px",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}

        {/* ── Stats bar ─────────────────────────────────────────── */}
        {totalTasks > 0 && (
          <div style={{ marginBottom: "28px" }}>
            {/* Progress bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)" }}>
                Progress — {completedCount} of {totalTasks} tasks completed
              </span>
              <span
                style={{
                  fontSize: "13px", fontWeight: 700,
                  background: "linear-gradient(135deg, #a855f7, #3b82f6)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                }}
              >
                {progressPct}%
              </span>
            </div>
            <div style={{ height: "5px", borderRadius: "99px", background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${progressPct}%`,
                  borderRadius: "99px",
                  background: "linear-gradient(90deg, #a855f7, #3b82f6)",
                  transition: "width 0.5s ease",
                  boxShadow: "0 0 8px rgba(168,85,247,0.5)",
                }}
              />
            </div>

            {/* Meta row */}
            <div style={{ display: "flex", gap: "20px", marginTop: "14px" }}>
              {[
                { label: "Total tasks", value: String(totalTasks) },
                { label: "Completed", value: String(completedCount) },
                { label: "Est. hours", value: totalHours > 0 ? `${totalHours}h` : "—" },
                { label: "Created", value: new Date(project.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) },
              ].map((s) => (
                <div key={s.label}>
                  <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600 }}>
                    {s.label}
                  </span>
                  <p style={{ fontSize: "14px", fontWeight: 700, color: "white", marginTop: "2px", letterSpacing: "-0.02em" }}>
                    {s.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Divider ───────────────────────────────────────────── */}
        {totalTasks > 0 && (
          <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", marginBottom: "24px" }} />
        )}

        {/* ── Decomposing animation ─────────────────────────────── */}
        {decomposing && <DecomposingOverlay />}

        {/* ── Empty state ───────────────────────────────────────── */}
        {!decomposing && totalTasks === 0 && (
          <div style={{
            padding: "64px 32px", textAlign: "center",
            background: "rgba(255,255,255,0.02)",
            border: "1px dashed rgba(255,255,255,0.09)",
            borderRadius: "16px",
            display: "flex", flexDirection: "column", alignItems: "center",
          }}>
            {/* Lightning illustration */}
            <div style={{
              width: "52px", height: "52px", borderRadius: "14px",
              background: "linear-gradient(135deg, rgba(168,85,247,0.2), rgba(59,130,246,0.2))",
              border: "1px solid rgba(168,85,247,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: "20px",
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 style={{ fontSize: "16px", fontWeight: 700, color: "white", letterSpacing: "-0.02em", marginBottom: "8px" }}>
              No tasks yet
            </h3>
            <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.38)", lineHeight: 1.65, maxWidth: "340px", marginBottom: "28px" }}>
              Click <strong style={{ color: "rgba(255,255,255,0.6)" }}>AI Decompose</strong> to let the AI analyze your project goal and generate a full task breakdown with estimates and skill tags.
            </p>
            <button
              onClick={handleDecompose}
              style={{
                display: "flex", alignItems: "center", gap: "7px",
                padding: "11px 24px",
                background: "linear-gradient(135deg, #a855f7, #3b82f6)",
                border: "none", borderRadius: "10px",
                color: "white", fontSize: "14px", fontWeight: 600, cursor: "pointer",
                boxShadow: "0 0 28px rgba(168,85,247,0.28)",
                transition: "opacity 0.2s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Generate tasks with AI
            </button>
          </div>
        )}

        {/* ── Task list ─────────────────────────────────────────── */}
        {!decomposing && totalTasks > 0 && (
          <div>
            {/* Section header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <h2 style={{ fontSize: "14px", fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Tasks
                <span style={{
                  marginLeft: "8px", fontSize: "11px", fontWeight: 700,
                  padding: "2px 7px", borderRadius: "5px",
                  background: "rgba(168,85,247,0.12)", color: "#c084fc",
                }}>
                  {totalTasks}
                </span>
              </h2>
            </div>

            {/* Group: incomplete */}
            {tasks.filter((t) => t.status !== "completed").length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
                {tasks
                  .filter((t) => t.status !== "completed")
                  .map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      projectId={projectId}
                    />
                  ))}
              </div>
            )}

            {/* Group: completed */}
            {tasks.filter((t) => t.status === "completed").length > 0 && (
              <div>
                <p style={{ fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.22)", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: "8px" }}>
                  Completed
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {tasks
                    .filter((t) => t.status === "completed")
                    .map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        projectId={projectId}
                      />
                    ))}
                </div>
              </div>
            )}
          </div>
        )}


      </div>
      {showTeamModal && (() => {
        const ROLES = ["", "backend", "frontend", "mobile", "designer", "ai-ml", "devops", "other"];
        const LEVELS = ["", "junior", "mid", "senior", "lead"];
        const filtered = teamMatches.filter((m) => {
          if (teamFilter.role && m.user.team_role !== teamFilter.role) return false;
          if (teamFilter.experience && m.user.experience_level !== teamFilter.experience) return false;
          return true;
        });
        return (
          <div role="dialog" aria-modal="true" aria-label="AI team matching" style={{ position: "fixed", inset: 0, zIndex: 50, overflowY: "auto", display: "grid", placeItems: "center", padding: 20, background: "rgba(0,0,0,0.74)", backdropFilter: "blur(5px)" }}>
            <div style={{ width: "min(100%, 720px)", maxHeight: "min(800px, calc(100vh - 40px))", overflowY: "auto", padding: 28, borderRadius: 18, background: "#121212", border: "1px solid rgba(34,197,94,0.25)", boxShadow: "0 30px 80px rgba(0,0,0,0.55)" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 22 }}>
                <div>
                  <p style={{ margin: "0 0 5px", fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "#4ade80" }}>AI Team Matching</p>
                  <h2 style={{ margin: 0, fontSize: 21, color: "white", letterSpacing: "-0.03em" }}>Find teammates for {project.title}</h2>
                </div>
                <button onClick={() => setShowTeamModal(false)} style={{ border: "none", background: "transparent", color: "rgba(255,255,255,0.45)", fontSize: 25, cursor: "pointer", lineHeight: 1 }}>&times;</button>
              </div>

              {matchingTeam ? (
                <div style={{ padding: "48px 20px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                  <Spinner size={24} color="#4ade80" />
                  <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)" }}>AI is analyzing candidate profiles…</p>
                </div>
              ) : teamMatches.length === 0 ? (
                <div style={{ padding: "48px 20px", textAlign: "center" }}>
                  <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>No matching candidates found</p>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>No available users match your project requirements right now.</p>
                </div>
              ) : (
                <>
                  {/* Filters */}
                  <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
                    <select
                      value={teamFilter.role}
                      onChange={(e) => setTeamFilter((prev) => ({ ...prev, role: e.target.value }))}
                      style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "white", fontSize: 13, outline: "none", cursor: "pointer" }}
                    >
                      <option value="">All roles</option>
                      {ROLES.slice(1).map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <select
                      value={teamFilter.experience}
                      onChange={(e) => setTeamFilter((prev) => ({ ...prev, experience: e.target.value }))}
                      style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "white", fontSize: 13, outline: "none", cursor: "pointer" }}
                    >
                      <option value="">All levels</option>
                      {LEVELS.slice(1).map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", alignSelf: "center", marginLeft: "auto" }}>
                      {filtered.length} of {teamMatches.length} candidates
                    </span>
                  </div>

                  {/* Match cards */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {filtered.map((match) => {
                      const compatColor = match.compatibility >= 80 ? "#4ade80" : match.compatibility >= 60 ? "#fbbf24" : "#fb923c";
                      return (
                        <div key={match.user.id} style={{
                          padding: "18px 20px", borderRadius: 14,
                          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                          transition: "border-color 0.2s",
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(34,197,94,0.25)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.07)"; }}
                        >
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                            {/* Avatar */}
                            <div style={{
                              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                              background: "linear-gradient(135deg, rgba(34,197,94,0.2), rgba(59,130,246,0.2))",
                              border: "1px solid rgba(34,197,94,0.2)",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 17, fontWeight: 700, color: "#4ade80",
                            }}>
                              {(match.user.full_name?.[0] || "?").toUpperCase()}
                            </div>

                            {/* Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
                                <div>
                                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "white", margin: 0 }}>
                                    {match.user.full_name || "Unknown"}
                                  </h3>
                                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", margin: "2px 0 0" }}>
                                    {match.user.team_role} &middot; {match.user.experience_level} &middot; Lv.{match.user.level}
                                  </p>
                                </div>
                                {/* Compatibility */}
                                <div style={{ textAlign: "right", flexShrink: 0 }}>
                                  <span style={{ fontSize: 22, fontWeight: 800, color: compatColor, letterSpacing: "-0.04em" }}>
                                    {match.compatibility}%
                                  </span>
                                  <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", margin: "1px 0 0", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>match</p>
                                </div>
                              </div>

                              {/* Explanation */}
                              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.5, margin: "0 0 10px" }}>
                                {match.explanation}
                              </p>

                              {/* Skills */}
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center" }}>
                                {match.user.skills.slice(0, 6).map((skill) => (
                                  <span key={skill} style={{
                                    fontSize: 11, fontWeight: 500, padding: "3px 8px", borderRadius: 6,
                                    background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.18)", color: "#86efac",
                                  }}>
                                    {skill}
                                  </span>
                                ))}
                                {match.user.github_url && (
                                  <a
                                    href={match.user.github_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                      marginLeft: "auto", fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 6,
                                      background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                                      color: "rgba(255,255,255,0.5)", textDecoration: "none",
                                    }}
                                  >
                                    GitHub
                                  </a>
                                )}
                                <button
                                  style={{
                                    fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 7, border: "none",
                                    background: "linear-gradient(135deg, #22c55e, #16a34a)",
                                    color: "white", cursor: "pointer",
                                    boxShadow: "0 0 12px rgba(34,197,94,0.2)",
                                  }}
                                  onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                                >
                                  Invite
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })()}

      {showSprintModal && (
        <div role="dialog" aria-modal="true" aria-label="AI sprint planner" style={{ position: "fixed", inset: 0, zIndex: 50, overflowY: "auto", display: "grid", placeItems: "center", padding: 20, background: "rgba(0,0,0,0.74)", backdropFilter: "blur(5px)" }}>
          <div style={{ width: "min(100%, 680px)", maxHeight: "min(760px, calc(100vh - 40px))", overflowY: "auto", padding: 26, borderRadius: 18, background: "#121212", border: "1px solid rgba(59,130,246,0.25)", boxShadow: "0 30px 80px rgba(0,0,0,0.55)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 20 }}>
              <div>
                <p style={{ margin: "0 0 5px", fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "#60a5fa" }}>AI Sprint Planner</p>
                <h2 style={{ margin: 0, fontSize: 21, color: "white", letterSpacing: "-0.03em" }}>{sprintPlan ? sprintPlan.sprint_goal : "Plan focused delivery time"}</h2>
              </div>
              <button onClick={() => setShowSprintModal(false)} style={{ border: "none", background: "transparent", color: "rgba(255,255,255,0.45)", fontSize: 25, cursor: "pointer", lineHeight: 1 }}>&times;</button>
            </div>

            {!sprintPlan && sprintPlanning ? (
              <div style={{ padding: "36px 12px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
                <div style={{ width: 58, height: 58, display: "grid", placeItems: "center", borderRadius: "50%", background: "linear-gradient(135deg, rgba(59,130,246,0.26), rgba(168,85,247,0.28))", border: "1px solid rgba(147,197,253,0.32)", fontSize: 25, animation: "badge-pulse 1.5s ease-in-out infinite" }}>🤖</div>
                <div style={{ width: "min(100%, 390px)", display: "flex", flexDirection: "column", gap: 10 }}>
                  {["🤖 Analyzing tasks...", "✓ Reviewing dependencies", "✓ Calculating workload", "✓ Building timeline"].map((step, index) => (
                    <div key={step} className="sprint-analysis-step" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 9, color: index === 0 ? "white" : "rgba(255,255,255,0.55)", background: index === 0 ? "rgba(59,130,246,0.1)" : "rgba(255,255,255,0.025)", border: `1px solid ${index === 0 ? "rgba(59,130,246,0.25)" : "rgba(255,255,255,0.06)"}`, fontSize: 13, fontWeight: index === 0 ? 700 : 500, animationDelay: `${index * 0.22}s` }}>
                      {index === 0 && <Spinner size={13} color="#60a5fa" />}{step}
                    </div>
                  ))}
                </div>
              </div>
            ) : !sprintPlan ? (
              <>
                <p style={{ margin: "0 0 20px", color: "rgba(255,255,255,0.5)", fontSize: 14, lineHeight: 1.55 }}>Set the time and team capacity. The planner will turn your incomplete tasks into an assigned delivery timeline.</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <label style={{ display: "flex", flexDirection: "column", gap: 7, color: "rgba(255,255,255,0.55)", fontSize: 12, fontWeight: 700 }}>Duration (hours)
                    <input type="number" min="1" max="168" value={sprintDuration} onChange={(event) => setSprintDuration(Math.max(1, Number(event.target.value) || 1))} style={{ padding: "11px 12px", borderRadius: 9, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", color: "white", font: "inherit", outline: "none" }} />
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: 7, color: "rgba(255,255,255,0.55)", fontSize: 12, fontWeight: 700 }}>Team size
                    <input type="number" min="1" max="20" value={teamSize} onChange={(event) => setTeamSize(Math.max(1, Number(event.target.value) || 1))} style={{ padding: "11px 12px", borderRadius: 9, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", color: "white", font: "inherit", outline: "none" }} />
                  </label>
                </div>
                <button onClick={handlePlanSprint} style={{ width: "100%", marginTop: 20, padding: "12px 16px", border: "none", borderRadius: 10, background: "linear-gradient(135deg, #2563eb, #7c3aed)", color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Generate sprint timeline</button>
              </>
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 9, marginBottom: 12 }}>
                  {[
                    { label: "Total tasks", value: sprintAssignments.length },
                    { label: "Estimated hours", value: `${sprintEstimatedHours.toFixed(1)}h` },
                    { label: "Critical tasks", value: sprintCriticalTasks },
                  ].map((stat) => <div key={stat.label} style={{ padding: "12px 11px", borderRadius: 10, background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.07)" }}><p style={{ margin: "0 0 4px", color: "rgba(255,255,255,0.36)", fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase" }}>{stat.label}</p><strong style={{ color: "white", fontSize: 19 }}>{stat.value}</strong></div>)}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 14px", marginBottom: sprintPlan.risk_level === "low" ? 20 : 10, borderRadius: 10, background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div><p style={{ margin: "0 0 3px", color: "rgba(255,255,255,0.45)", fontSize: 12 }}>Delivery risk</p><strong style={{ color: SPRINT_RISK_COLOR[sprintPlan.risk_level], fontSize: 12, textTransform: "uppercase" }}>{sprintPlan.risk_level}</strong></div>
                  <div style={{ textAlign: "right" }}><p style={{ margin: "0 0 3px", color: "rgba(255,255,255,0.45)", fontSize: 12 }}>Completion probability</p><strong style={{ color: "#93c5fd", fontSize: 22 }}>{sprintPlan.completion_probability}%</strong></div>
                </div>
                {sprintPlan.risk_level !== "low" && <p style={{ margin: "0 0 20px", padding: "10px 12px", borderRadius: 9, color: "rgba(255,255,255,0.62)", background: "rgba(251,191,36,0.055)", border: "1px solid rgba(251,191,36,0.14)", fontSize: 12, lineHeight: 1.55 }}>{sprintPlan.risk_reason}</p>}
                <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 14 }}>
                  {sprintPlan.phases.map((phase, index) => (
                    <div key={`${phase.time_range}-${index}`} style={{ display: "grid", gridTemplateColumns: "28px 1fr", gap: 12 }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <div style={{ width: 12, height: 12, marginTop: 5, borderRadius: "50%", background: "linear-gradient(135deg, #a855f7, #3b82f6)", boxShadow: "0 0 10px rgba(168,85,247,0.7)" }} />
                        {index < sprintPlan.phases.length - 1 && <div style={{ flex: 1, width: 1, marginTop: 6, background: "rgba(168,85,247,0.28)" }} />}
                      </div>
                      <div style={{ padding: "13px 14px", borderRadius: 11, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 4 }}><strong style={{ color: "white", fontSize: 14 }}>{phase.focus}</strong><span style={{ color: "#93c5fd", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>{phase.time_range}</span></div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 10 }}>{phase.tasks.map((task) => {
                          const priority = SPRINT_PRIORITY[task.priority];
                          return <div key={task.task_id} style={{ padding: "10px 11px", borderRadius: 9, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.055)" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}><strong style={{ color: "rgba(255,255,255,0.82)", fontSize: 12 }}>{task.title}</strong><span style={{ padding: "2px 6px", borderRadius: 5, background: priority.bg, border: `1px solid ${priority.border}`, color: priority.color, fontSize: 9, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase" }}>{task.priority}</span></div>
                            <p style={{ margin: "6px 0", color: "rgba(255,255,255,0.46)", fontStyle: "italic", fontSize: 11, lineHeight: 1.45 }}>{task.ai_reason}</p>
                            <p style={{ margin: "0 0 5px", color: "rgba(255,255,255,0.38)", fontSize: 11 }}>{task.assignee} · {task.estimated_hours}h</p>
                            {(task.depends_on.length > 0 || task.blocks.length > 0) && <div style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 10, lineHeight: 1.4 }}>{task.depends_on.length > 0 && <span style={{ color: "#93c5fd" }}>Depends on: <span style={{ color: "rgba(255,255,255,0.48)" }}>{task.depends_on.join(", ")}</span></span>}{task.blocks.length > 0 && <span style={{ color: "#fbbf24" }}>Blocks: <span style={{ color: "rgba(255,255,255,0.48)" }}>{task.blocks.join(", ")}</span></span>}</div>}
                          </div>;
                        })}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 20, padding: "15px", borderRadius: 11, background: "rgba(59,130,246,0.045)", border: "1px solid rgba(59,130,246,0.14)" }}>
                  <p style={{ margin: "0 0 9px", color: "#93c5fd", fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>AI recommendations</p>
                  <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6, color: "rgba(255,255,255,0.62)", fontSize: 12, lineHeight: 1.45 }}>{sprintPlan.recommendations.map((recommendation, index) => <li key={`${recommendation}-${index}`}>{recommendation}</li>)}</ul>
                </div>
                <button onClick={() => setSprintPlan(null)} style={{ width: "100%", marginTop: 20, padding: "10px", borderRadius: 9, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "rgba(255,255,255,0.68)", fontWeight: 700, cursor: "pointer" }}>Plan another sprint</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
