import { hackathons } from "@/lib/hackathons";

const featuredIds = ["openai-build-week", "bolt-worlds-largest-hackathon", "google-ai-hackathon", "ethglobal-brussels"];
const deadlineDates: Record<string, string | undefined> = {
  "openai-build-week": "2026-07-21T17:00:00-07:00",
};

function countdown(id: string) {
  const deadline = deadlineDates[id];
  if (!deadline) return "See event page";
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000);
  if (days <= 0) return "Closes today";
  return `${days} ${days === 1 ? "day" : "days"} left`;
}

export default function UpcomingHackathons() {
  const featured = featuredIds.map((id) => hackathons.find((hackathon) => hackathon.id === id)).filter(Boolean);
  return <aside className="upcoming-hackathons" aria-label="Upcoming Hackathons"><div className="upcoming-hackathons-heading"><h2>Upcoming Hackathons</h2><a href="/dashboard/hackathons">View all</a></div><div className="upcoming-hackathons-list">{featured.map((hackathon) => {
    if (!hackathon) return null;
    const left = countdown(hackathon.id);
    const urgent = left === "Closes today" || (left.includes("day") && Number(left.split(" ")[0]) < 3);
    return <article key={hackathon.id} className="upcoming-hackathon"><div className="upcoming-hackathon-top"><h3>{hackathon.name}</h3><span className="upcoming-platform">{hackathon.platform}</span></div><div className="upcoming-hackathon-meta"><strong>{hackathon.prize}</strong><span className={urgent ? "urgent" : ""}>{left}</span></div><a href={hackathon.link} target="_blank" rel="noreferrer" className="upcoming-join">Join ↗</a></article>;
  })}</div></aside>;
}
