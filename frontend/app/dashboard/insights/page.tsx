"use client";

import { useEffect, useState } from "react";
import { insights, PerformanceInsights } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const styles = {
  strengths: { color: "#4ade80", bg: "rgba(74,222,128,.08)", border: "rgba(74,222,128,.2)", icon: "↑" },
  improvements: { color: "#fbbf24", bg: "rgba(251,191,36,.08)", border: "rgba(251,191,36,.2)", icon: "↗" },
};

function InsightList({ title, items, type }: { title: string; items: string[]; type: "strengths" | "improvements" }) {
  const style = styles[type];
  return <section style={{ padding: 23, borderRadius: 17, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}><span style={{ display: "grid", placeItems: "center", width: 31, height: 31, borderRadius: 9, background: style.bg, border: `1px solid ${style.border}`, color: style.color, fontWeight: 800 }}>{style.icon}</span><h2 style={{ margin: 0, fontSize: 17 }}>{title}</h2></div>
    <div style={{ display: "grid", gap: 9 }}>{items.length ? items.slice(0, 3).map((item, index) => <div key={item} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "11px 12px", borderRadius: 10, background: "rgba(255,255,255,.025)" }}><span style={{ color: style.color, fontSize: 12, fontWeight: 800 }}>{String(index + 1).padStart(2, "0")}</span><span style={{ color: "rgba(255,255,255,.75)", fontSize: 14, lineHeight: 1.45 }}>{item}</span></div>) : <p style={{ color: "rgba(255,255,255,.42)", fontSize: 14 }}>Complete more scored tasks to unlock this insight.</p>}</div>
  </section>;
}

export default function InsightsPage() {
  const { token } = useAuth();
  const [data, setData] = useState<PerformanceInsights | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { if (token) insights.get(token).then(setData).catch((err) => setError(err instanceof Error ? err.message : "Failed to load insights.")); }, [token]);
  if (error) return <main style={{ minHeight: "100vh", padding: 40, background: "#080808", color: "#fca5a5" }}>{error}</main>;
  if (!data) return <main style={{ minHeight: "100vh", padding: 40, background: "#080808", color: "rgba(255,255,255,.5)" }}>Generating your insights…</main>;
  return <main style={{ minHeight: "100vh", padding: 40, background: "#080808", color: "white" }}><div style={{ maxWidth: 940 }}>
    <p style={{ margin: 0, color: "#c084fc", fontWeight: 800, fontSize: 12, letterSpacing: ".12em" }}>AI COACH</p><h1 style={{ margin: "7px 0", fontSize: 27, letterSpacing: "-.04em" }}>Your performance insights</h1><p style={{ margin: "0 0 28px", color: "rgba(255,255,255,.43)", fontSize: 14 }}>{data.summary || "Personalized observations based on your completed work."}</p>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 16 }}><InsightList title="Top strengths" items={data.strengths} type="strengths" /><InsightList title="Improvement areas" items={data.improvements} type="improvements" /></div>
    <section style={{ marginTop: 16, padding: 26, borderRadius: 17, background: "linear-gradient(135deg, rgba(168,85,247,.16), rgba(59,130,246,.09))", border: "1px solid rgba(168,85,247,.25)" }}><p style={{ margin: 0, color: "#d8b4fe", fontWeight: 800, fontSize: 12, letterSpacing: ".1em" }}>NEXT SKILL TO FOCUS ON</p><div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 12 }}><span style={{ width: 42, height: 42, display: "grid", placeItems: "center", borderRadius: 12, background: "linear-gradient(135deg,#a855f7,#3b82f6)", fontSize: 20 }}>✦</span><div><h2 style={{ margin: 0, fontSize: 21 }}>{data.next_skill || "Keep building your core skills"}</h2><p style={{ margin: "4px 0 0", color: "rgba(255,255,255,.55)", fontSize: 14 }}>Turn this recommendation into a project to build evidence through practice.</p></div></div></section>
  </div></main>;
}
