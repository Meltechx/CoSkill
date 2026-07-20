"use client";

import Link from "next/link";
import { useState } from "react";
import { projects, Project } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

interface ProjectCardProps {
  project: Project;
  onDeleted?: (projectId: string) => void;
}

const statusConfig = {
  active: { label: "Active", color: "#3fb950", bg: "rgba(46,160,67,0.15)", border: "rgba(46,160,67,0.4)" },
  completed: { label: "Completed", color: "#58a6ff", bg: "rgba(56,139,253,0.15)", border: "rgba(56,139,253,0.4)" },
  paused: { label: "Paused", color: "#d29922", bg: "rgba(187,128,9,0.15)", border: "rgba(187,128,9,0.4)" },
  archived: { label: "Archived", color: "#8b949e", bg: "#21262d", border: "#30363d" },
};

function deadlineDetails(deadline: string | null) {
  if (!deadline || Number.isNaN(new Date(deadline).getTime())) {
    return { label: "No deadline", color: "#8b949e", bg: "#21262d", border: "#30363d" };
  }
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return { label: `${Math.abs(days)}d overdue`, color: "#f85149", bg: "rgba(248,81,73,0.12)", border: "rgba(248,81,73,0.4)" };
  if (days === 0) return { label: "Due today", color: "#f85149", bg: "rgba(248,81,73,0.12)", border: "rgba(248,81,73,0.4)" };
  if (days < 3) return { label: `${days}d left`, color: "#f85149", bg: "rgba(248,81,73,0.12)", border: "rgba(248,81,73,0.4)" };
  if (days <= 7) return { label: `${days}d left`, color: "#d29922", bg: "rgba(187,128,9,0.15)", border: "rgba(187,128,9,0.4)" };
  return { label: `${days}d left`, color: "#3fb950", bg: "rgba(46,160,67,0.15)", border: "rgba(46,160,67,0.4)" };
}

export default function ProjectCard({ project, onDeleted }: ProjectCardProps) {
  const { token } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const status = statusConfig[project.status] ?? statusConfig.archived;
  const deadline = deadlineDetails(project.deadline);

  const deleteProject = async () => {
    if (!token) return;
    setDeleting(true);
    setError("");
    try {
      await projects.delete(project.id, token);
      onDeleted?.(project.id);
      setConfirming(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete project.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div
        style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: "6px", padding: "16px", transition: "border-color 0.15s ease", height: "100%" }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#8b949e"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#30363d"; }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", marginBottom: "10px" }}>
          <Link href={`/dashboard/projects/${project.id}`} style={{ color: "#58a6ff", fontSize: "14px", fontWeight: 600, lineHeight: 1.3, flex: 1, textDecoration: "none" }}>{project.title}</Link>
          <span style={{ flexShrink: 0, fontSize: "11px", fontWeight: 600, padding: "3px 9px", borderRadius: "6px", background: status.bg, border: `1px solid ${status.border}`, color: status.color }}>{status.label}</span>
        </div>

        {project.goal && <p style={{ fontSize: "13px", color: "#8b949e", lineHeight: 1.5, marginBottom: "16px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{project.goal}</p>}

        <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", marginBottom: "15px", padding: "4px 8px", borderRadius: "6px", background: deadline.bg, border: `1px solid ${deadline.border}`, color: deadline.color, fontSize: "11px", fontWeight: 600 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
          {deadline.label}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: project.goal ? 0 : "10px" }}>
          <span style={{ fontSize: "12px", color: "#8b949e" }}>{new Date(project.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button onClick={() => setConfirming(true)} aria-label={`Delete ${project.title}`} style={{ border: "none", background: "transparent", padding: "3px", color: "#f85149", cursor: "pointer" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14M10 10v6m4-6v6" /></svg>
            </button>
            <Link href={`/dashboard/projects/${project.id}`} style={{ fontSize: "12px", color: "#58a6ff", display: "flex", alignItems: "center", gap: "3px", fontWeight: 500, textDecoration: "none" }}>View <span>→</span></Link>
          </div>
        </div>
      </div>

      {confirming && (
        <div role="dialog" aria-modal="true" aria-labelledby={`delete-${project.id}`} style={{ position: "fixed", inset: 0, zIndex: 60, display: "grid", placeItems: "center", padding: "20px", background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)" }}>
          <div style={{ width: "min(100%, 400px)", padding: "24px", borderRadius: "6px", background: "#161b22", border: "1px solid #30363d", boxShadow: "0 16px 48px rgba(1,4,9,.75)" }}>
            <h2 id={`delete-${project.id}`} style={{ margin: 0, color: "#e6edf3", fontSize: "18px" }}>Delete project?</h2>
            <p style={{ margin: "10px 0 18px", color: "#8b949e", fontSize: "13px", lineHeight: 1.55 }}>This permanently deletes <strong style={{ color: "#e6edf3" }}>{project.title}</strong> and its tasks.</p>
            {error && <p style={{ margin: "0 0 14px", color: "#fca5a5", fontSize: "13px" }}>{error}</p>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "9px" }}>
              <button onClick={() => setConfirming(false)} disabled={deleting} style={{ padding: "8px 13px", borderRadius: "6px", border: "1px solid #30363d", background: "#21262d", color: "#e6edf3", cursor: "pointer" }}>Cancel</button>
              <button onClick={deleteProject} disabled={deleting} style={{ padding: "9px 13px", borderRadius: "8px", border: "none", background: "#dc2626", color: "white", fontWeight: 700, cursor: deleting ? "not-allowed" : "pointer", opacity: deleting ? 0.65 : 1 }}>{deleting ? "Deleting…" : "Delete project"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
