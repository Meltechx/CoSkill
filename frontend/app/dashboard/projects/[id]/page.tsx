"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { projects as projectsApi, Project, Task } from "@/lib/api";

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

  /* ── Derived ── */
  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const totalTasks = tasks.length;
  const progressPct = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
  const totalHours = tasks.reduce((s, t) => s + (t.estimated_hours ?? 0), 0);

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
          <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
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
    </div>
  );
}
