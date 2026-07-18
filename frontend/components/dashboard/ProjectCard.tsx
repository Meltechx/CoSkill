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
  active: { label: "Active", color: "#4ade80", bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.2)" },
  completed: { label: "Completed", color: "#60a5fa", bg: "rgba(96,165,250,0.08)", border: "rgba(96,165,250,0.2)" },
  paused: { label: "Paused", color: "#fbbf24", bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.2)" },
  archived: { label: "Archived", color: "rgba(255,255,255,0.35)", bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.1)" },
};

function deadlineDetails(deadline: string | null) {
  if (!deadline || Number.isNaN(new Date(deadline).getTime())) {
    return { label: "No deadline", color: "rgba(255,255,255,0.38)", bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.1)" };
  }
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return { label: `${Math.abs(days)}d overdue`, color: "#f87171", bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.25)" };
  if (days === 0) return { label: "Due today", color: "#f87171", bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.25)" };
  if (days < 3) return { label: `${days}d left`, color: "#f87171", bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.25)" };
  if (days <= 7) return { label: `${days}d left`, color: "#fbbf24", bg: "rgba(251,191,36,0.1)", border: "rgba(251,191,36,0.25)" };
  return { label: `${days}d left`, color: "#4ade80", bg: "rgba(74,222,128,0.09)", border: "rgba(74,222,128,0.22)" };
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
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "20px", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", transition: "border-color 0.2s, box-shadow 0.2s, transform 0.2s", height: "100%" }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(168,85,247,0.3)"; e.currentTarget.style.boxShadow = "0 0 24px rgba(168,85,247,0.07)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "translateY(0)"; }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", marginBottom: "10px" }}>
          <Link href={`/dashboard/projects/${project.id}`} style={{ color: "white", fontSize: "14.5px", fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.3, flex: 1, textDecoration: "none" }}>{project.title}</Link>
          <span style={{ flexShrink: 0, fontSize: "11px", fontWeight: 600, padding: "3px 9px", borderRadius: "6px", background: status.bg, border: `1px solid ${status.border}`, color: status.color }}>{status.label}</span>
        </div>

        {project.goal && <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.38)", lineHeight: 1.55, marginBottom: "16px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{project.goal}</p>}

        <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", marginBottom: "15px", padding: "4px 8px", borderRadius: "6px", background: deadline.bg, border: `1px solid ${deadline.border}`, color: deadline.color, fontSize: "11px", fontWeight: 600 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
          {deadline.label}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: project.goal ? 0 : "10px" }}>
          <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.25)" }}>{new Date(project.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button onClick={() => setConfirming(true)} aria-label={`Delete ${project.title}`} style={{ border: "none", background: "transparent", padding: "3px", color: "rgba(248,113,113,0.65)", cursor: "pointer" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14M10 10v6m4-6v6" /></svg>
            </button>
            <Link href={`/dashboard/projects/${project.id}`} style={{ fontSize: "12px", color: "#a855f7", display: "flex", alignItems: "center", gap: "3px", fontWeight: 500, textDecoration: "none" }}>View <span>→</span></Link>
          </div>
        </div>
      </div>

      {confirming && (
        <div role="dialog" aria-modal="true" aria-labelledby={`delete-${project.id}`} style={{ position: "fixed", inset: 0, zIndex: 60, display: "grid", placeItems: "center", padding: "20px", background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)" }}>
          <div style={{ width: "min(100%, 400px)", padding: "24px", borderRadius: "16px", background: "#151515", border: "1px solid rgba(239,68,68,0.22)", boxShadow: "0 24px 80px rgba(0,0,0,0.55)" }}>
            <h2 id={`delete-${project.id}`} style={{ margin: 0, color: "white", fontSize: "18px" }}>Delete project?</h2>
            <p style={{ margin: "10px 0 18px", color: "rgba(255,255,255,0.5)", fontSize: "13px", lineHeight: 1.55 }}>This permanently deletes <strong style={{ color: "rgba(255,255,255,0.85)" }}>{project.title}</strong> and its tasks.</p>
            {error && <p style={{ margin: "0 0 14px", color: "#fca5a5", fontSize: "13px" }}>{error}</p>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "9px" }}>
              <button onClick={() => setConfirming(false)} disabled={deleting} style={{ padding: "9px 13px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.65)", cursor: "pointer" }}>Cancel</button>
              <button onClick={deleteProject} disabled={deleting} style={{ padding: "9px 13px", borderRadius: "8px", border: "none", background: "#dc2626", color: "white", fontWeight: 700, cursor: deleting ? "not-allowed" : "pointer", opacity: deleting ? 0.65 : 1 }}>{deleting ? "Deleting…" : "Delete project"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
