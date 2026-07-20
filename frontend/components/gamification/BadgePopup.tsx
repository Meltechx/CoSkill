import { Badge } from "@/lib/api";

export default function BadgePopup({ badge }: { badge: Badge | null }) {
  if (!badge) return null;
  return <div className="achievement-popup"><span style={{ fontSize: 29 }}>{badge.icon}</span><div><p>🏆 New Badge</p><strong>{badge.title}</strong><span>{badge.description}</span></div></div>;
}
