"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PublicProfile, SkillScore, users } from "@/lib/api";

const PALETTES = [
  "linear-gradient(90deg, #a855f7, #6366f1)",
  "linear-gradient(90deg, #3b82f6, #06b6d4)",
  "linear-gradient(90deg, #22c55e, #10b981)",
  "linear-gradient(90deg, #f59e0b, #ef4444)",
];

function paletteFor(skill: string) {
  return PALETTES[Array.from(skill).reduce((total, char) => total + char.charCodeAt(0), 0) % PALETTES.length];
}

function ScoreRing({ score }: { score: number }) {
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(Math.max(score, 0), 100) / 100);

  return (
    <svg width="156" height="156" viewBox="0 0 156 156" aria-label={`Performance score: ${score} out of 100`}>
      <defs>
        <linearGradient id="publicScoreGradient" x1="0" y1="0" x2="156" y2="156">
          <stop stopColor="#a855f7" />
          <stop offset="1" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      <circle cx="78" cy="78" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
      <circle
        cx="78" cy="78" r={radius} fill="none" stroke="url(#publicScoreGradient)" strokeWidth="10" strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={offset} transform="rotate(-90 78 78)"
      />
      <text x="78" y="74" textAnchor="middle" fill="white" fontSize="31" fontWeight="800">{score}</text>
      <text x="78" y="96" textAnchor="middle" fill="rgba(255,255,255,0.42)" fontSize="12">out of 100</text>
    </svg>
  );
}

function SkillBar({ skill }: { skill: SkillScore }) {
  const value = Math.min(Math.max(skill.score, 0), 100);
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: 14 }}>
        <span style={{ fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>{skill.skill}</span>
        <span style={{ color: "rgba(255,255,255,0.55)", whiteSpace: "nowrap" }}>{value}% · {skill.tasks_count} {skill.tasks_count === 1 ? "task" : "tasks"}</span>
      </div>
      <div style={{ height: 8, overflow: "hidden", borderRadius: 999, background: "rgba(255,255,255,0.08)" }}>
        <div style={{ width: `${value}%`, height: "100%", borderRadius: 999, background: paletteFor(skill.skill), boxShadow: "0 0 14px rgba(139,92,246,0.35)" }} />
      </div>
    </div>
  );
}

export default function PublicProfilePage() {
  const params = useParams<{ id: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!params.id) return;
    users.publicProfile(params.id)
      .then(setProfile)
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load this profile."));
  }, [params.id]);

  const initials = profile?.full_name.split(" ").map((word) => word[0]).slice(0, 2).join("").toUpperCase() || "?";
  const completionRate = profile && profile.total_tasks ? Math.round((profile.completed_tasks / profile.total_tasks) * 100) : 0;

  if (error) {
    return <ProfileShell><p style={{ color: "#fca5a5" }}>{error}</p></ProfileShell>;
  }
  if (!profile) {
    return <ProfileShell><p style={{ color: "rgba(255,255,255,0.5)" }}>Loading profile…</p></ProfileShell>;
  }

  return (
    <ProfileShell>
      <section style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 34 }}>
        <div style={{ width: 68, height: 68, display: "grid", placeItems: "center", borderRadius: "50%", background: "linear-gradient(135deg, #a855f7, #3b82f6)", padding: 2 }}>
          <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", borderRadius: "50%", background: "#15131b", fontSize: 21, fontWeight: 800 }}>{initials}</div>
        </div>
        <div>
          <p style={{ margin: 0, color: "#c084fc", fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>CoSkill profile</p>
          <h1 style={{ margin: "5px 0 0", fontSize: 29, letterSpacing: "-0.04em" }}>{profile.full_name}</h1>
        </div>
      </section>

      <section className="public-profile-summary" style={{ display: "grid", gridTemplateColumns: "minmax(220px, 0.8fr) minmax(250px, 1fr)", gap: 20, marginBottom: 20 }}>
        <div className="public-profile-card" style={{ display: "grid", placeItems: "center", padding: "26px 20px" }}>
          <ScoreRing score={profile.overall_score} />
          <p style={{ margin: "10px 0 0", color: "rgba(255,255,255,0.48)", fontSize: 13, fontWeight: 600 }}>Performance score</p>
        </div>
        <div className="public-profile-card" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, padding: 20 }}>
          {[ ["Total tasks", profile.total_tasks], ["Completed", profile.completed_tasks], ["Completion rate", `${completionRate}%`], ["Skills tracked", profile.skill_profiles.length] ].map(([label, value]) => (
            <div key={String(label)} style={{ borderRadius: 12, padding: 14, background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: 23, fontWeight: 800, letterSpacing: "-0.04em" }}>{value}</div>
              <div style={{ marginTop: 4, fontSize: 12, color: "rgba(255,255,255,0.42)" }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="public-profile-card" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "baseline", marginBottom: 14 }}><h2 style={{ margin: 0, fontSize: 17 }}>Recruiter-ready achievements</h2><span style={{ color: "#c084fc", fontSize: 11, fontWeight: 800, letterSpacing: ".08em" }}>PUBLIC SIGNALS</span></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginBottom: 16 }}>{[["Level", profile.level], ["Total XP", profile.total_xp.toLocaleString()], ["Completion", `${profile.completion_rate}%`], ["Sprint success", `${profile.sprint_success_rate}%`], ["Streak", `${profile.current_streak} days`], ["Favorite skill", profile.favorite_skill || "Building"]].map(([label, value]) => <div key={String(label)} style={{ padding: 12, borderRadius: 11, background: "rgba(255,255,255,.035)", border: "1px solid rgba(255,255,255,.06)" }}><strong style={{ display: "block", fontSize: 17 }}>{value}</strong><span style={{ color: "rgba(255,255,255,.42)", fontSize: 11 }}>{label}</span></div>)}</div>
        {profile.unlocked_badges.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{profile.unlocked_badges.map((badge) => <span key={badge.id} title={badge.description} style={{ padding: "6px 9px", borderRadius: 999, background: "rgba(251,191,36,.1)", border: "1px solid rgba(251,191,36,.2)", color: "#fde68a", fontSize: 11 }}>{badge.icon} {badge.title}</span>)}</div>}
      </section>

      <section className="public-profile-card" style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16, marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 17 }}>Skill profile</h2>
          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>Verified through completed work</span>
        </div>
        {profile.skill_profiles.length ? (
          <div style={{ display: "grid", gap: 19 }}>{profile.skill_profiles.map((skill) => <SkillBar key={skill.skill} skill={skill} />)}</div>
        ) : (
          <p style={{ margin: 0, color: "rgba(255,255,255,0.45)", fontSize: 14 }}>No scored skills to share yet.</p>
        )}
      </section>
    </ProfileShell>
  );
}

function ProfileShell({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ minHeight: "100vh", padding: "30px 20px 60px", background: "radial-gradient(circle at top, #1d1234 0, #09090b 45%, #080808 100%)", color: "white" }}>
      <div style={{ maxWidth: 780, margin: "0 auto" }}>
        <Link href="/" style={{ display: "inline-block", marginBottom: 36, color: "rgba(255,255,255,0.52)", fontSize: 13, textDecoration: "none" }}>← CoSkill</Link>
        {children}
      </div>
    </main>
  );
}
