"use client";

import Link from "next/link";
import { Project } from "@/lib/api";

interface ProjectCardProps {
  project: Project;
}

const statusConfig = {
  active: { label: "Active", color: "#4ade80", bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.2)" },
  completed: { label: "Completed", color: "#60a5fa", bg: "rgba(96,165,250,0.08)", border: "rgba(96,165,250,0.2)" },
  paused: { label: "Paused", color: "#fbbf24", bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.2)" },
  archived: { label: "Archived", color: "rgba(255,255,255,0.35)", bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.1)" },
};

export default function ProjectCard({ project }: ProjectCardProps) {
  const status = statusConfig[project.status] ?? statusConfig.archived;

  return (
    <Link href={`/dashboard/projects/${project.id}`} style={{ textDecoration: "none", display: "block" }}>
      <div
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "14px",
          padding: "20px",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          cursor: "pointer",
          transition: "border-color 0.2s, box-shadow 0.2s, transform 0.2s",
          height: "100%",
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLDivElement;
          el.style.borderColor = "rgba(168,85,247,0.3)";
          el.style.boxShadow = "0 0 24px rgba(168,85,247,0.07)";
          el.style.transform = "translateY(-2px)";
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLDivElement;
          el.style.borderColor = "rgba(255,255,255,0.07)";
          el.style.boxShadow = "none";
          el.style.transform = "translateY(0)";
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", marginBottom: "10px" }}>
          <h3
            style={{
              fontSize: "14.5px",
              fontWeight: 600,
              color: "white",
              letterSpacing: "-0.02em",
              lineHeight: 1.3,
              flex: 1,
            }}
          >
            {project.title}
          </h3>
          <span
            style={{
              flexShrink: 0,
              fontSize: "11px",
              fontWeight: 600,
              padding: "3px 9px",
              borderRadius: "6px",
              background: status.bg,
              border: `1px solid ${status.border}`,
              color: status.color,
              letterSpacing: "0.02em",
            }}
          >
            {status.label}
          </span>
        </div>

        {/* Goal */}
        {project.goal && (
          <p
            style={{
              fontSize: "13px",
              color: "rgba(255,255,255,0.38)",
              lineHeight: 1.55,
              marginBottom: "16px",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {project.goal}
          </p>
        )}

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.25)" }}>
            {new Date(project.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
          <span
            style={{
              fontSize: "12px",
              color: "#a855f7",
              display: "flex",
              alignItems: "center",
              gap: "3px",
              fontWeight: 500,
            }}
          >
            View
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}
