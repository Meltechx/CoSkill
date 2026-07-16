"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import {
  performance as perfApi,
  PerformanceSummary,
  SkillScore,
  RecentCompletion,
} from "@/lib/api";

/* ── Constants ────────────────────────────────────────────────────────── */

const RING_R = 54;
const RING_CIRC = 2 * Math.PI * RING_R; // ≈ 339.29

const DIFF_COLORS = {
  easy:   { color: "#4ade80", bg: "rgba(34,197,94,0.1)",   border: "rgba(34,197,94,0.2)" },
  medium: { color: "#fbbf24", bg: "rgba(251,191,36,0.1)",  border: "rgba(251,191,36,0.2)" },
  hard:   { color: "#fb923c", bg: "rgba(251,146,60,0.1)",  border: "rgba(251,146,60,0.2)" },
  expert: { color: "#f87171", bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.2)" },
};

const SKILL_PALETTES = [
  { bar: "linear-gradient(90deg, #a855f7, #7c3aed)", glow: "rgba(168,85,247,0.3)" },
  { bar: "linear-gradient(90deg, #3b82f6, #06b6d4)",  glow: "rgba(59,130,246,0.3)" },
  { bar: "linear-gradient(90deg, #22c55e, #10b981)",  glow: "rgba(34,197,94,0.3)" },
  { bar: "linear-gradient(90deg, #f59e0b, #ef4444)",  glow: "rgba(251,146,60,0.3)" },
  { bar: "linear-gradient(90deg, #ec4899, #8b5cf6)",  glow: "rgba(236,72,153,0.3)" },
];

function skillPalette(skill: string) {
  let h = 0;
  for (let i = 0; i < skill.length; i++) h = (h * 31 + skill.charCodeAt(i)) & 0xffff;
  return SKILL_PALETTES[h % SKILL_PALETTES.length];
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return fmtDate(iso);
}

/* ── Score ring ───────────────────────────────────────────────────────── */

function ScoreRing({ score, animate }: { score: number; animate: boolean }) {
  const offset = RING_CIRC * (1 - (animate ? Math.min(score, 100) : 0) / 100);
  const scoreColor =
    score >= 80 ? "#4ade80" : score >= 60 ? "#fbbf24" : score >= 40 ? "#fb923c" : "#f87171";

  return (
    <svg
      width="140"
      height="140"
      viewBox="0 0 140 140"
      style={{ display: "block", flexShrink: 0 }}
    >
      <defs>
        <linearGradient id="ringGrad" x1="0" y1="0" x2="140" y2="140" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>

      {/* Track */}
      <circle
        cx="70" cy="70" r={RING_R}
        fill="none"
        stroke="rgba(255,255,255,0.07)"
        strokeWidth="10"
        strokeLinecap="round"
      />

      {/* Progress arc */}
      <circle
        cx="70" cy="70" r={RING_R}
        fill="none"
        stroke="url(#ringGrad)"
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={RING_CIRC}
        strokeDashoffset={offset}
        transform="rotate(-90 70 70)"
        style={{ transition: animate ? "stroke-dashoffset 1s cubic-bezier(0.16,1,0.3,1)" : "none" }}
      />

      {/* Center: score */}
      <text
        x="70" y="64"
        textAnchor="middle"
        dominantBaseline="middle"
        fill={scoreColor}
        fontSize="30"
        fontWeight="800"
        fontFamily="Inter, sans-serif"
        letterSpacing="-2"
      >
        {score}
      </text>
      <text
        x="70" y="84"
        textAnchor="middle"
        fill="rgba(255,255,255,0.3)"
        fontSize="11"
        fontFamily="Inter, sans-serif"
        fontWeight="500"
      >
        / 100
      </text>
    </svg>
  );
}

/* ── Skill bar ────────────────────────────────────────────────────────── */

function SkillBar({ skill, animate }: { skill: SkillScore; animate: boolean }) {
  const pal = skillPalette(skill.skill);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "13.5px", fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>
            {skill.skill}
          </span>
          <span style={{
            fontSize: "11px", fontWeight: 500,
            padding: "2px 7px", borderRadius: "5px",
            background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.35)",
          }}>
            {skill.tasks_count} {skill.tasks_count === 1 ? "task" : "tasks"}
          </span>
        </div>
        <span style={{ fontSize: "13px", fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>
          {skill.score}
          <span style={{ fontSize: "11px", fontWeight: 400, color: "rgba(255,255,255,0.3)" }}>%</span>
        </span>
      </div>

      {/* Bar track */}
      <div style={{ height: "5px", borderRadius: "99px", background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: animate ? `${skill.score}%` : "0%",
            borderRadius: "99px",
            background: pal.bar,
            boxShadow: `0 0 6px ${pal.glow}`,
            transition: animate ? "width 0.9s cubic-bezier(0.16,1,0.3,1)" : "none",
          }}
        />
      </div>
    </div>
  );
}

/* ── Completion row ───────────────────────────────────────────────────── */

function CompletionRow({ item }: { item: RecentCompletion }) {
  const diff = DIFF_COLORS[item.difficulty] ?? DIFF_COLORS.medium;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "14px",
        padding: "14px 16px",
        borderRadius: "12px",
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.06)",
        transition: "border-color 0.15s",
      }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = "rgba(168,85,247,0.2)")}
      onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.06)")}
    >
      {/* Check icon */}
      <div style={{
        width: "28px", height: "28px", borderRadius: "8px", flexShrink: 0,
        background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
          <path d="M1 4.5l2.5 2.5L10 1" stroke="#4ade80" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: "13.5px", fontWeight: 600, color: "white",
          letterSpacing: "-0.01em", marginBottom: "3px",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {item.task_title}
        </p>
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.33)", display: "flex", alignItems: "center", gap: "6px" }}>
          <span>{item.project_title}</span>
          <span style={{ color: "rgba(255,255,255,0.15)" }}>·</span>
          <span>{fmtRelative(item.completed_at)}</span>
        </p>
      </div>

      {/* Right side */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
        <span style={{
          fontSize: "11px", fontWeight: 600, padding: "3px 8px", borderRadius: "6px",
          background: diff.bg, border: `1px solid ${diff.border}`, color: diff.color,
        }}>
          {item.difficulty.charAt(0).toUpperCase() + item.difficulty.slice(1)}
        </span>
        {item.score != null && (
          <span style={{
            fontSize: "12px", fontWeight: 700,
            background: "linear-gradient(135deg, #a855f7, #3b82f6)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
          }}>
            {item.score}pts
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Loading skeleton ─────────────────────────────────────────────────── */

function Skeleton({ w, h, radius = 8 }: { w: string | number; h: number; radius?: number }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: radius,
      background: "rgba(255,255,255,0.05)",
    }} />
  );
}

/* ── Main page ────────────────────────────────────────────────────────── */

export default function ProfilePage() {
  const { user, token } = useAuth();
  const [summary, setSummary] = useState<PerformanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [animate, setAnimate] = useState(false);
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!token) return;
    perfApi
      .summary(token)
      .then((data) => {
        setSummary(data);
        // trigger animations after a short paint delay
        animTimerRef.current = setTimeout(() => setAnimate(true), 80);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load performance data"))
      .finally(() => setLoading(false));
    return () => { if (animTimerRef.current) clearTimeout(animTimerRef.current); };
  }, [token]);

  const handleShare = () => {
    if (!user) return;
    const url = `${window.location.origin}/profile/${user.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    });
  };

  /* ── Derived ── */
  const initials = user?.full_name
    ? user.full_name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() ?? "?";

  const completionRate =
    summary && summary.total_tasks > 0
      ? Math.round((summary.completed_tasks / summary.total_tasks) * 100)
      : 0;

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div style={{ padding: "40px", background: "#080808", minHeight: "100vh" }}>
        <div style={{ maxWidth: "780px", display: "flex", flexDirection: "column", gap: "24px" }}>
          <Skeleton w={160} h={14} />
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <Skeleton w={80} h={80} radius={40} />
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <Skeleton w={180} h={20} />
              <Skeleton w={120} h={14} />
            </div>
          </div>
          <div style={{ display: "flex", gap: "16px" }}>
            <Skeleton w={140} h={140} radius={70} />
            <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              {[1,2,3,4].map(i => <Skeleton key={i} w="100%" h={80} radius={12} />)}
            </div>
          </div>
          {[1,2,3].map(i => <Skeleton key={i} w="100%" h={48} radius={10} />)}
        </div>
      </div>
    );
  }

  /* ── Error ── */
  if (error) {
    return (
      <div style={{ padding: "40px", background: "#080808", minHeight: "100vh", color: "white" }}>
        <Link href="/dashboard" style={{ fontSize: "13px", color: "#a855f7", textDecoration: "none" }}>← Dashboard</Link>
        <div style={{ marginTop: "32px", padding: "14px 16px", borderRadius: "12px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5", fontSize: "14px" }}>
          {error}
        </div>
      </div>
    );
  }

  const score = summary?.overall_score ?? 0;
  const scoreColor = score >= 80 ? "#4ade80" : score >= 60 ? "#fbbf24" : score >= 40 ? "#fb923c" : "#f87171";

  return (
    <div style={{ padding: "40px", background: "#080808", minHeight: "100vh", color: "white" }}>
      <div style={{ maxWidth: "780px" }}>

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
          <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.55)" }}>Profile</span>
        </div>

        {/* ── User header ───────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "20px", marginBottom: "32px" }}>
          {/* Avatar + info */}
          <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
            {/* Avatar with gradient ring */}
            <div style={{ padding: "2.5px", borderRadius: "50%", background: "linear-gradient(135deg, #a855f7, #3b82f6)", flexShrink: 0 }}>
              <div style={{
                width: "72px", height: "72px", borderRadius: "50%",
                background: "#141414",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{
                  fontSize: "22px", fontWeight: 700,
                  background: "linear-gradient(135deg, #a855f7, #3b82f6)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                }}>
                  {initials}
                </span>
              </div>
            </div>

            <div>
              <h1 style={{ fontSize: "20px", fontWeight: 800, color: "white", letterSpacing: "-0.04em", marginBottom: "4px" }}>
                {user?.full_name || "Anonymous"}
              </h1>
              <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.38)", marginBottom: "6px" }}>
                {user?.email}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{
                  width: "6px", height: "6px", borderRadius: "50%",
                  background: "#4ade80",
                  boxShadow: "0 0 6px #4ade80",
                  animation: "badge-pulse 2s ease-in-out infinite",
                }} />
                <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)", fontWeight: 500 }}>
                  Active member
                </span>
              </div>
            </div>
          </div>

          {/* Share button */}
          <button
            onClick={handleShare}
            style={{
              display: "flex", alignItems: "center", gap: "7px",
              padding: "9px 16px",
              background: copied ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${copied ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.09)"}`,
              borderRadius: "9px",
              color: copied ? "#4ade80" : "rgba(255,255,255,0.65)",
              fontSize: "13px", fontWeight: 600, cursor: "pointer",
              transition: "background 0.2s, border-color 0.2s, color 0.2s",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              if (!copied) {
                e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                e.currentTarget.style.color = "white";
              }
            }}
            onMouseLeave={(e) => {
              if (!copied) {
                e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                e.currentTarget.style.color = "rgba(255,255,255,0.65)";
              }
            }}
          >
            {copied ? (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
                Share Profile
              </>
            )}
          </button>
        </div>

        {/* ── Score + stats ─────────────────────────────────────── */}
        <div style={{
          display: "flex", gap: "20px", alignItems: "stretch",
          marginBottom: "28px",
          background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "18px", padding: "24px",
        }}>
          {/* Score ring */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", paddingRight: "24px", borderRight: "1px solid rgba(255,255,255,0.07)" }}>
            <ScoreRing score={score} animate={animate} />
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Performance Score
              </p>
              <p style={{ fontSize: "11px", color: scoreColor, fontWeight: 600, marginTop: "3px" }}>
                {score >= 80 ? "Excellent" : score >= 60 ? "Good" : score >= 40 ? "Developing" : score > 0 ? "Getting started" : "No data yet"}
              </p>
            </div>
          </div>

          {/* Stats grid */}
          <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", alignContent: "center" }}>
            {[
              {
                label: "Total Projects",
                value: summary?.total_projects ?? 0,
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                ),
                gradient: "linear-gradient(135deg, rgba(168,85,247,0.9), rgba(99,102,241,0.9))",
              },
              {
                label: "Total Tasks",
                value: summary?.total_tasks ?? 0,
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                ),
                gradient: "linear-gradient(135deg, rgba(59,130,246,0.9), rgba(6,182,212,0.9))",
              },
              {
                label: "Completed",
                value: summary?.completed_tasks ?? 0,
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ),
                gradient: "linear-gradient(135deg, rgba(34,197,94,0.9), rgba(16,185,129,0.9))",
              },
              {
                label: "Completion Rate",
                value: `${completionRate}%`,
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                  </svg>
                ),
                gradient: "linear-gradient(135deg, rgba(251,146,60,0.9), rgba(234,179,8,0.9))",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: "12px", padding: "14px",
                  transition: "border-color 0.15s",
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = "rgba(168,85,247,0.18)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.06)")}
              >
                <div style={{
                  width: "32px", height: "32px", borderRadius: "8px",
                  background: stat.gradient, color: "white",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: "10px",
                }}>
                  {stat.icon}
                </div>
                <p style={{ fontSize: "20px", fontWeight: 800, color: "white", letterSpacing: "-0.04em", lineHeight: 1 }}>
                  {stat.value}
                </p>
                <p style={{ fontSize: "11.5px", color: "rgba(255,255,255,0.35)", fontWeight: 500, marginTop: "4px" }}>
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Skill breakdown ───────────────────────────────────── */}
        <div style={{
          background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "18px", padding: "24px", marginBottom: "20px",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
            <h2 style={{ fontSize: "15px", fontWeight: 700, color: "white", letterSpacing: "-0.02em" }}>
              Skill Breakdown
            </h2>
            {summary && summary.skill_scores.length > 0 && (
              <span style={{
                fontSize: "11px", fontWeight: 600,
                padding: "3px 8px", borderRadius: "6px",
                background: "rgba(168,85,247,0.1)", color: "#c084fc",
              }}>
                {summary.skill_scores.length} skills
              </span>
            )}
          </div>

          {!summary || summary.skill_scores.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <div style={{
                width: "44px", height: "44px", borderRadius: "12px", margin: "0 auto 14px",
                background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="8" r="4" /><path d="M6 20v-2a4 4 0 018 0v2" />
                </svg>
              </div>
              <p style={{ fontSize: "14px", fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: "4px" }}>No skills yet</p>
              <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.25)" }}>Complete tasks with skill tags to see your breakdown.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {summary.skill_scores
                .slice()
                .sort((a, b) => b.score - a.score)
                .map((skill) => (
                  <SkillBar key={skill.skill} skill={skill} animate={animate} />
                ))}
            </div>
          )}
        </div>

        {/* ── Recent completions ────────────────────────────────── */}
        <div style={{
          background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "18px", padding: "24px",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <h2 style={{ fontSize: "15px", fontWeight: 700, color: "white", letterSpacing: "-0.02em" }}>
              Recent Completions
            </h2>
            {summary && summary.recent_completions.length > 0 && (
              <span style={{
                fontSize: "11px", fontWeight: 600,
                padding: "3px 8px", borderRadius: "6px",
                background: "rgba(34,197,94,0.08)", color: "#4ade80",
                border: "1px solid rgba(34,197,94,0.15)",
              }}>
                {summary.recent_completions.length} tasks
              </span>
            )}
          </div>

          {!summary || summary.recent_completions.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <div style={{
                width: "44px", height: "44px", borderRadius: "12px", margin: "0 auto 14px",
                background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                </svg>
              </div>
              <p style={{ fontSize: "14px", fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: "4px" }}>No completions yet</p>
              <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.25)" }}>
                Mark tasks complete to start building your record.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {summary.recent_completions.map((item) => (
                <CompletionRow key={item.task_id} item={item} />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
