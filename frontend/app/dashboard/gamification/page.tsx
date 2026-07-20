"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { GamificationProfile, LeaderboardEntry, PerformanceInsights, insights, users } from "@/lib/api";
import XPCard from "@/components/gamification/XPCard";
import BadgeCard from "@/components/gamification/BadgeCard";
import XPHistory from "@/components/gamification/XPHistory";
import AchievementTimeline from "@/components/gamification/AchievementTimeline";
import StreakCard from "@/components/gamification/StreakCard";
import Leaderboard from "@/components/gamification/Leaderboard";
import AIInsightsCard from "@/components/gamification/AIInsightsCard";
import BadgePopup from "@/components/gamification/BadgePopup";

const LOAD_TIMEOUT_MS = 12_000;

function withTimeout<T>(request: Promise<T>, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error(message)), LOAD_TIMEOUT_MS);
    request.then(
      (value) => { window.clearTimeout(timeout); resolve(value); },
      (requestError) => { window.clearTimeout(timeout); reject(requestError); },
    );
  });
}

export default function GamificationPage() {
  const { token, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<GamificationProfile | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [aiInsights, setAiInsights] = useState<PerformanceInsights | null>(null);
  const [newBadge, setNewBadge] = useState<GamificationProfile["badges"][number] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadGamification() {
      setLoading(true);
      setError("");
      try {
        if (authLoading) {
          setProfile(null);
          setError("Your session is still being verified. Please refresh if this continues.");
          return;
        }
        if (!token) {
          setProfile(null);
          setError("Your session is unavailable. Please sign in again.");
          return;
        }

        // The profile is required for this page. Do not let optional dashboard
        // panels prevent a valid achievement profile from rendering.
        const nextProfile = await withTimeout(
          users.gamification(token),
          "The achievements service took too long to respond. Please try again.",
        );
        if (cancelled) return;

        setProfile(nextProfile);
        const recent = nextProfile.recent_achievements[0];
        if (recent && Date.now() - new Date(recent.unlock_date || 0).getTime() < 12_000) setNewBadge(recent);

        // These panels are non-critical. Load them in the background so a
        // slow leaderboard or insights request can never trap the page on its
        // primary loading state.
        void Promise.allSettled([
          withTimeout(users.leaderboard(token), "Leaderboard request timed out."),
          withTimeout(insights.get(token), "AI insights request timed out."),
        ]).then(([leaderboardResult, insightsResult]) => {
          if (cancelled) return;
          if (leaderboardResult.status === "fulfilled") {
            setLeaderboard(leaderboardResult.value);
          } else {
            console.warn("[Gamification] Leaderboard could not be loaded:", leaderboardResult.reason);
            setLeaderboard([]);
          }
          if (insightsResult.status === "fulfilled") {
            setAiInsights(insightsResult.value);
          } else {
            console.warn("[Gamification] AI insights could not be loaded:", insightsResult.reason);
            setAiInsights(null);
          }
        });
      } catch (loadError) {
        if (!cancelled) {
          console.error("[Gamification] Profile could not be loaded:", loadError);
          setProfile(null);
          setError(loadError instanceof Error ? loadError.message : "Unable to load your achievements. Please try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadGamification();
    return () => { cancelled = true; };
  }, [authLoading, token]);

  useEffect(() => { if (!newBadge) return; const timeout = window.setTimeout(() => setNewBadge(null), 4500); return () => window.clearTimeout(timeout); }, [newBadge]);

  if (loading) return <div style={{ minHeight: "100vh", padding: 40, color: "rgba(255,255,255,0.55)" }}>Loading your achievement space…</div>;
  if (error) return <div style={{ minHeight: "100vh", padding: 40, color: "#fca5a5" }}>Unable to load achievements: {error}</div>;
  if (!profile) return <div style={{ minHeight: "100vh", padding: 40, color: "#fca5a5" }}>Unable to load achievements. Please refresh and try again.</div>;

  const hasAchievements = profile.recent_activity.length > 0 || profile.badges.some((badge) => badge.unlocked);
  const xpStatus = { xp: profile.xp, level: profile.level, xp_to_next_level: profile.xp_needed_for_next_level, badges: profile.badges.filter((badge) => badge.unlocked).map((badge) => badge.id), current_level_xp: profile.current_level_xp, progress_percentage: profile.progress_percentage };
  if (!hasAchievements) return <main style={{ minHeight: "100vh", padding: "40px", background: "radial-gradient(circle at 80% 0, rgba(59,130,246,0.12), transparent 28%), #080808", color: "white" }}><div style={{ maxWidth: 1120 }}><p style={{ margin: 0, color: "#c084fc", fontSize: 11, fontWeight: 800, letterSpacing: "0.11em", textTransform: "uppercase" }}>Achievement Center</p><h1 style={{ margin: "7px 0 24px", fontSize: 30, letterSpacing: "-0.05em" }}>Build momentum. Make it visible.</h1><section className="gamification-card"><h2>No achievements yet</h2><p className="muted-copy" style={{ margin: 0 }}>Complete tasks to unlock your first achievement.</p></section></div></main>;
  return <main style={{ minHeight: "100vh", padding: "40px", background: "radial-gradient(circle at 80% 0, rgba(59,130,246,0.12), transparent 28%), #080808", color: "white" }}><div style={{ maxWidth: 1120 }}><p style={{ margin: 0, color: "#c084fc", fontSize: 11, fontWeight: 800, letterSpacing: "0.11em", textTransform: "uppercase" }}>Achievement Center</p><h1 style={{ margin: "7px 0 24px", fontSize: 30, letterSpacing: "-0.05em" }}>Build momentum. Make it visible.</h1><div className="gamification-grid"><XPCard status={xpStatus} /><StreakCard streak={profile.current_streak} /><AIInsightsCard insights={aiInsights} /></div><section className="gamification-card" style={{ marginTop: 18 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}><h2>Badges</h2><span style={{ color: "rgba(255,255,255,0.42)", fontSize: 12 }}>{profile.badges.filter((badge) => badge.unlocked).length}/{profile.badges.length} unlocked</span></div><div className="badge-grid">{profile.badges.map((badge) => <BadgeCard key={badge.id} badge={badge} />)}</div></section><div className="gamification-two-column" style={{ marginTop: 18 }}><XPHistory activities={profile.recent_activity} /><AchievementTimeline achievements={profile.recent_achievements} /></div><div style={{ marginTop: 18 }}><Leaderboard entries={leaderboard} /></div></div><BadgePopup badge={newBadge} /></main>;
}
