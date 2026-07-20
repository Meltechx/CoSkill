import { XpActivity } from "@/lib/api";

export default function XPHistory({ activities }: { activities: XpActivity[] }) {
  return <section className="gamification-card"><h2>Recent XP activity</h2>{activities.length ? <div style={{ display: "grid", gap: 9 }}>{activities.map((activity) => <div key={activity.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.055)" }}><div><strong style={{ fontSize: 13 }}>{activity.title}</strong><p style={{ margin: "3px 0 0", color: "rgba(255,255,255,0.38)", fontSize: 11 }}>{new Date(activity.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</p></div><strong style={{ color: "#4ade80", whiteSpace: "nowrap" }}>+{activity.amount} XP</strong></div>)}</div> : <p className="muted-copy">Your achievements will appear here.</p>}</section>;
}
