import { Badge } from "@/lib/api";

export default function BadgeCard({ badge }: { badge: Badge }) {
  return <article style={{ padding: 14, borderRadius: 13, opacity: badge.unlocked ? 1 : 0.45, background: badge.unlocked ? "rgba(255,255,255,0.045)" : "rgba(255,255,255,0.02)", border: `1px solid ${badge.unlocked ? "rgba(251,191,36,0.18)" : "rgba(255,255,255,0.06)"}` }}><div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ width: 34, height: 34, display: "grid", placeItems: "center", borderRadius: 10, background: badge.unlocked ? "rgba(251,191,36,0.12)" : "rgba(255,255,255,0.05)", fontSize: 18 }}>{badge.icon}</span><div><strong style={{ display: "block", color: "white", fontSize: 12 }}>{badge.title}</strong><span style={{ color: "rgba(255,255,255,0.42)", fontSize: 10, lineHeight: 1.35 }}>{badge.description}</span></div></div></article>;
}
