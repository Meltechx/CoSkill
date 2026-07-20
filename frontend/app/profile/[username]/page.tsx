"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PublicProfile, SkillScore, users } from "@/lib/api";
import { GitHubRepos } from "@/components/profile/GitHubRepos";

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
  const params = useParams<{ username: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!params.username) return;
    users.publicProfile(params.username)
      .then(setProfile)
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load this profile."));
  }, [params.username]);

  if (error) {
    return (
      <ProfileShell>
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14, margin: "0 auto 18px",
            background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" />
            </svg>
          </div>
          <p style={{ color: "#fca5a5", fontSize: 15, fontWeight: 600 }}>{error}</p>
          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, marginTop: 6 }}>This profile may be private or does not exist.</p>
        </div>
      </ProfileShell>
    );
  }
  if (!profile) {
    return <ProfileShell><p style={{ color: "rgba(255,255,255,0.5)", textAlign: "center", padding: "60px 0" }}>Loading profile...</p></ProfileShell>;
  }

  const initials = profile.full_name.split(" ").map((word) => word[0]).slice(0, 2).join("").toUpperCase() || "?";
  const completionRate = profile.total_tasks ? Math.round((profile.completed_tasks / profile.total_tasks) * 100) : 0;

  return (
    <ProfileShell>
      {/* Header */}
      <section style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 10 }}>
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url} alt=""
            style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", border: "3px solid rgba(168,85,247,0.3)" }}
          />
        ) : (
          <div style={{ width: 72, height: 72, display: "grid", placeItems: "center", borderRadius: "50%", background: "linear-gradient(135deg, #a855f7, #3b82f6)", padding: 2 }}>
            <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", borderRadius: "50%", background: "#15131b", fontSize: 23, fontWeight: 800 }}>{initials}</div>
          </div>
        )}
        <div>
          <p style={{ margin: 0, color: "#c084fc", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>CoSkill profile</p>
          <h1 style={{ margin: "4px 0 0", fontSize: 28, letterSpacing: "-0.04em" }}>{profile.full_name}</h1>
          <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.52)", fontSize: 13 }}>@{profile.username}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
            <span style={{ padding: "3px 8px", borderRadius: 6, background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.25)", color: "#d8b4fe", fontSize: 11, fontWeight: 700 }}>
              Lv. {profile.level}
            </span>
            <span style={{ padding: "3px 8px", borderRadius: 6, background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)", color: "#93c5fd", fontSize: 11, fontWeight: 600 }}>
              {profile.team_role}
            </span>
            <span style={{ padding: "3px 8px", borderRadius: 6, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 600 }}>
              {profile.experience_level}
            </span>
          </div>
        </div>
      </section>

      {/* Bio */}
      {profile.bio && (
        <section style={{
          padding: "16px 20px", borderRadius: 12, marginBottom: 20,
          background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)",
        }}>
          <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,0.65)", lineHeight: 1.6 }}>{profile.bio}</p>
        </section>
      )}

      {/* Skills tags */}
      {profile.skills.length > 0 && (
        <section style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
          {profile.skills.map((skill) => (
            <span key={skill} style={{
              fontSize: 12, fontWeight: 500, padding: "4px 10px", borderRadius: 7,
              background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.15)", color: "#86efac",
            }}>
              {skill}
            </span>
          ))}
        </section>
      )}

      <GitHubRepos githubUrl={profile.github_url} />

      {/* Stats grid */}
      <section className="public-profile-summary" style={{ display: "grid", gridTemplateColumns: "minmax(220px, 0.8fr) minmax(250px, 1fr)", gap: 20, marginBottom: 20 }}>
        <div className="public-profile-card" style={{ display: "grid", placeItems: "center", padding: "26px 20px" }}>
          <ScoreRing score={profile.overall_score} />
          <p style={{ margin: "10px 0 0", color: "rgba(255,255,255,0.48)", fontSize: 13, fontWeight: 600 }}>Performance score</p>
        </div>
        <div className="public-profile-card" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, padding: 20 }}>
          {[
            ["Total tasks", profile.total_tasks],
            ["Completed", profile.completed_tasks],
            ["Projects", profile.total_projects],
            ["Completion", `${completionRate}%`],
            ["Total XP", profile.total_xp.toLocaleString()],
            ["Skills tracked", profile.skill_profiles.length],
          ].map(([label, value]) => (
            <div key={String(label)} style={{ borderRadius: 12, padding: 14, background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.04em" }}>{value}</div>
              <div style={{ marginTop: 4, fontSize: 12, color: "rgba(255,255,255,0.42)" }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Badges */}
      {profile.unlocked_badges.length > 0 && (
        <section className="public-profile-card" style={{ padding: 20, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "baseline", marginBottom: 14 }}>
            <h2 style={{ margin: 0, fontSize: 17 }}>Badges</h2>
            <span style={{ color: "#c084fc", fontSize: 11, fontWeight: 800, letterSpacing: ".08em" }}>{profile.unlocked_badges.length} UNLOCKED</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {profile.unlocked_badges.map((badge) => (
              <span key={badge.id} title={badge.description} style={{
                padding: "7px 11px", borderRadius: 999,
                background: "rgba(251,191,36,.1)", border: "1px solid rgba(251,191,36,.2)",
                color: "#fde68a", fontSize: 12, fontWeight: 600,
              }}>
                {badge.icon} {badge.title}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Achievements */}
      <section className="public-profile-card" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "baseline", marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 17 }}>Achievements</h2>
          <span style={{ color: "#c084fc", fontSize: 11, fontWeight: 800, letterSpacing: ".08em" }}>PUBLIC SIGNALS</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
          {[
            ["Level", profile.level],
            ["Streak", `${profile.current_streak} days`],
            ["Sprint success", `${profile.sprint_success_rate}%`],
            ["Favorite skill", profile.favorite_skill || "Building"],
          ].map(([label, value]) => (
            <div key={String(label)} style={{ padding: 12, borderRadius: 11, background: "rgba(255,255,255,.035)", border: "1px solid rgba(255,255,255,.06)" }}>
              <strong style={{ display: "block", fontSize: 17 }}>{value}</strong>
              <span style={{ color: "rgba(255,255,255,.42)", fontSize: 11 }}>{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Skill profiles */}
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
