"use client";

import { XpStatus } from "@/lib/api";
import { calculateLevel } from "@/lib/gamification";

export default function XPCard({ status, compact = false }: { status: XpStatus; compact?: boolean }) {
  const level = calculateLevel(status.xp);
  return (
    <section style={{ padding: compact ? "12px" : "20px", borderRadius: compact ? 12 : 18, background: "linear-gradient(135deg, rgba(168,85,247,0.16), rgba(59,130,246,0.1))", border: "1px solid rgba(168,85,247,0.25)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), 0 12px 30px rgba(59,130,246,0.08)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}><span style={{ width: compact ? 28 : 38, height: compact ? 28 : 38, display: "grid", placeItems: "center", borderRadius: 10, background: "linear-gradient(135deg, #a855f7, #3b82f6)", fontSize: compact ? 14 : 18, boxShadow: "0 0 18px rgba(168,85,247,0.42)" }}>✦</span><div><p style={{ margin: 0, color: "#e9d5ff", fontSize: compact ? 11 : 12, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>Level {level.level}</p><strong style={{ display: "block", marginTop: 2, color: "white", fontSize: compact ? 16 : 24, letterSpacing: "-0.04em" }}>{status.xp.toLocaleString()} XP</strong></div></div>
        {!compact && <span style={{ padding: "5px 8px", borderRadius: 999, background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.62)", fontSize: 11, fontWeight: 700 }}>Rank {level.level}</span>}
      </div>
      <div style={{ marginTop: compact ? 10 : 16 }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, color: "rgba(255,255,255,0.58)", fontSize: compact ? 10 : 12 }}><span>{level.xpNeededForNextLevel.toLocaleString()} XP until Level {level.level + 1}</span><strong style={{ color: "#bfdbfe" }}>{level.progressPercentage}%</strong></div><div style={{ height: compact ? 6 : 9, overflow: "hidden", borderRadius: 999, background: "rgba(0,0,0,0.28)" }}><div style={{ width: `${level.progressPercentage}%`, height: "100%", borderRadius: "inherit", background: "linear-gradient(90deg, #a855f7, #3b82f6, #22d3ee)", boxShadow: "0 0 14px rgba(96,165,250,0.72)", transition: "width 800ms cubic-bezier(.2,.8,.2,1)" }} /></div></div>
    </section>
  );
}
