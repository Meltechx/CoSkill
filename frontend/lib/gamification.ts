export type LevelProgress = {
  level: number;
  currentLevelXp: number;
  xpNeededForNextLevel: number;
  progressPercentage: number;
};

export const BADGE_CATALOG = [
  { id: "first_project", title: "First Project", description: "Created your first project.", icon: "🏗" },
  { id: "fast_finisher", title: "Fast Finisher", description: "Completed a task in a focused burst.", icon: "⚡" },
  { id: "ship_it", title: "Ship It", description: "Completed 10 tasks.", icon: "🚀" },
  { id: "ai_explorer", title: "AI Explorer", description: "Used an AI-powered feature.", icon: "🤖" },
  { id: "seven_day_streak", title: "7 Day Streak", description: "Stayed active for seven days.", icon: "🔥" },
  { id: "sprint_master", title: "Sprint Master", description: "Completed an entire sprint.", icon: "🎯" },
  { id: "hundred_tasks", title: "100 Tasks Completed", description: "Completed 100 tasks.", icon: "💯" },
  { id: "ai_power_user", title: "AI Power User", description: "Used AI features 10 times.", icon: "🧠" },
  { id: "consistency", title: "Consistency", description: "Completed 30 tasks.", icon: "🛡" },
  { id: "early_bird", title: "Early Bird", description: "Completed work before 9 AM UTC.", icon: "⭐" },
] as const;

export function calculateLevel(xp: number): LevelProgress {
  const totalXp = Math.max(0, Math.floor(xp));
  const thresholds = [[1, 0, 250], [2, 250, 600], [3, 600, 1000], [4, 1000, 1500]] as const;
  for (const [level, start, next] of thresholds) {
    if (totalXp < next) return { level, currentLevelXp: totalXp - start, xpNeededForNextLevel: next - totalXp, progressPercentage: Math.round((totalXp - start) / (next - start) * 100) };
  }
  const level = 5 + Math.floor((totalXp - 1500) / 500);
  const start = 1500 + (level - 5) * 500;
  return { level, currentLevelXp: totalXp - start, xpNeededForNextLevel: start + 500 - totalXp, progressPercentage: Math.round((totalXp - start) / 500 * 100) };
}
