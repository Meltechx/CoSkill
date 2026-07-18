"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { performance, PerformanceSummary } from "@/lib/api";

function ScoreRing({ score }: { score: number }) {
  const radius = 50;
  const length = 2 * Math.PI * radius;
  return <svg width="132" height="132" viewBox="0 0 132 132"><circle cx="66" cy="66" r={radius} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="10" /><circle cx="66" cy="66" r={radius} fill="none" stroke="url(#score-gradient)" strokeWidth="10" strokeLinecap="round" strokeDasharray={length} strokeDashoffset={length * (1 - Math.min(Math.max(score, 0), 100) / 100)} transform="rotate(-90 66 66)" /><defs><linearGradient id="score-gradient" x1="0" y1="0" x2="132" y2="132"><stop stopColor="#a855f7" /><stop offset="1" stopColor="#3b82f6" /></linearGradient></defs><text x="66" y="70" textAnchor="middle" fill="white" fontSize="28" fontWeight="800">{score}</text><text x="66" y="89" textAnchor="middle" fill="rgba(255,255,255,.42)" fontSize="10">out of 100</text></svg>;
}

export default function PerformancePage() {
  const { token } = useAuth();
  const [summary, setSummary] = useState<PerformanceSummary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => { if (token) performance.summary(token).then(setSummary).catch((err) => setError(err instanceof Error ? err.message : "Failed to load performance.")); }, [token]);

  if (error) return <main style={{ minHeight: "100vh", padding: 40, background: "#080808", color: "#fca5a5" }}>{error}</main>;
  if (!summary) return <main style={{ minHeight: "100vh", padding: 40, background: "#080808", color: "rgba(255,255,255,.5)" }}>Loading performance overview…</main>;

  const completionRate = summary.total_tasks ? Math.round(summary.completed_tasks / summary.total_tasks * 100) : 0;
  const skills = summary.skill_scores.slice().sort((a, b) => b.score - a.score);
  return (
    <main style={{ minHeight: "100vh", padding: 40, background: "#080808", color: "white" }}><div style={{ maxWidth: 900 }}>
      <p style={{ margin: 0, color: "#c084fc", fontSize: 12, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" }}>Insights</p><h1 style={{ margin: "5px 0 30px", fontSize: 26, letterSpacing: "-.04em" }}>Performance overview</h1>
      <section style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 18, marginBottom: 20 }}>
        <div style={{ display: "grid", placeItems: "center", padding: 22, borderRadius: 18, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)" }}><ScoreRing score={summary.overall_score} /><span style={{ marginTop: 5, color: "rgba(255,255,255,.48)", fontSize: 13 }}>Overall performance</span></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, padding: 18, borderRadius: 18, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)" }}>{[["Total tasks", summary.total_tasks], ["Completed", summary.completed_tasks], ["Completion rate", `${completionRate}%`], ["Skills tracked", skills.length]].map(([label, value]) => <div key={String(label)} style={{ padding: 13, borderRadius: 11, background: "rgba(255,255,255,.035)", border: "1px solid rgba(255,255,255,.06)" }}><b style={{ display: "block", fontSize: 22 }}>{value}</b><span style={{ color: "rgba(255,255,255,.42)", fontSize: 12 }}>{label}</span></div>)}</div>
      </section>
      <section style={{ padding: 24, borderRadius: 18, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}><h2 style={{ margin: 0, fontSize: 17 }}>Skill scores</h2><Link href="/dashboard/profile" style={{ color: "#c084fc", fontSize: 13, textDecoration: "none" }}>View profile →</Link></div>{skills.length ? <div style={{ display: "grid", gap: 18 }}>{skills.map((skill) => <div key={skill.skill}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7, fontSize: 14 }}><span style={{ fontWeight: 600 }}>{skill.skill}</span><span style={{ color: "rgba(255,255,255,.55)" }}>{skill.score}% · {skill.tasks_count} tasks</span></div><div style={{ height: 8, borderRadius: 99, overflow: "hidden", background: "rgba(255,255,255,.08)" }}><div style={{ width: `${Math.min(Math.max(skill.score, 0), 100)}%`, height: "100%", borderRadius: 99, background: "linear-gradient(90deg, #a855f7, #3b82f6)" }} /></div></div>)}</div> : <p style={{ margin: 0, color: "rgba(255,255,255,.45)", fontSize: 14 }}>Complete and score tasks to start building your performance chart.</p>}</section>
    </div></main>
  );
}
