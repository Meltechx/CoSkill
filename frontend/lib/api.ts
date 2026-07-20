const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ApiOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string;
}

export async function api<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = "GET", body, token } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail || "Request failed");
  }

  if (res.status === 204) return null as T;
  return res.json();
}

// Auth
export interface AuthResponse {
  user: { id: string; email: string; full_name: string | null; avatar_url?: string | null };
  session: { access_token: string; refresh_token: string };
}

export const auth = {
  register: (email: string, password: string, full_name: string) =>
    api<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: { email, password, full_name },
    }),

  login: (email: string, password: string) =>
    api<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: { email, password },
    }),

  logout: (token: string) =>
    api<void>("/api/auth/logout", { method: "POST", token }),

  me: (token: string) => api<{ id: string; email: string; full_name: string | null; avatar_url?: string | null }>("/api/auth/me", { token }),

  googleUrl: () => api<{ url: string }>("/api/auth/google"),

  updateProfile: (full_name: string, token: string) => api<{ id: string; email: string; full_name: string | null; avatar_url?: string | null }>("/api/auth/me", { method: "PUT", body: { full_name }, token }),

  uploadAvatar: async (file: File, token: string) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API_BASE}/api/auth/me/avatar`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
    if (!res.ok) { const error = await res.json().catch(() => ({ detail: "Avatar upload failed" })); throw new Error(error.detail); }
    return res.json() as Promise<{ id: string; email: string; full_name: string | null; avatar_url?: string | null }>;
  },
};

// Projects
export interface Project {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  goal: string | null;
  status: "active" | "completed" | "archived" | "paused";
  deadline: string | null;
  created_at: string;
}

export interface SprintTaskAssignment {
  task_id: string;
  title: string;
  assignee: string;
  estimated_hours: number;
  priority: "critical" | "high" | "medium" | "low";
  ai_reason: string;
  depends_on: string[];
  blocks: string[];
}

export interface SprintPhase {
  time_range: string;
  focus: string;
  tasks: SprintTaskAssignment[];
}

export interface SprintPlan {
  phases: SprintPhase[];
  sprint_goal: string;
  risk_level: "low" | "medium" | "high";
  risk_reason: string;
  completion_probability: number;
  recommendations: string[];
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  difficulty: "easy" | "medium" | "hard" | "expert";
  estimated_hours: number | null;
  actual_hours: number | null;
  status: "todo" | "in_progress" | "completed" | "cancelled";
  skill_tags: string[];
  created_at: string;
  completed_at: string | null;
  started_at: string | null;
  time_spent_minutes: number | null;
  is_flagged: boolean;
  flag_reason: string | null;
  verification_question: string | null;
  verification_answer: string | null;
  quality_score: number | null;
  issues: string[];
  suggestions: string[];
}

export interface TeamProfile {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  skills: string[];
  technologies: string[];
  experience_level: string;
  github_url: string | null;
  linkedin_url: string | null;
  work_preferences: string[];
  team_role: string;
  is_available: boolean;
  level: number;
  xp: number;
}

export interface TeamMatch {
  user: TeamProfile;
  compatibility: number;
  explanation: string;
}

export interface TeamProfileUpdate {
  username?: string;
  bio?: string;
  skills?: string[];
  technologies?: string[];
  experience_level?: string;
  github_url?: string;
  linkedin_url?: string;
  work_preferences?: string[];
  team_role?: string;
  is_available?: boolean;
}

export const projects = {
  list: (token: string) =>
    api<Project[]>("/api/projects/", { token }),

  get: (id: string, token: string) =>
    api<Project>(`/api/projects/${id}`, { token }),

  create: (data: { title: string; goal?: string; description?: string; deadline?: string }, token: string) =>
    api<Project>("/api/projects/", { method: "POST", body: data, token }),

  delete: (id: string, token: string) =>
    api<void>(`/api/projects/${id}`, { method: "DELETE", token }),

  tasks: (id: string, token: string) =>
    api<Task[]>(`/api/projects/${id}/tasks`, { token }),

  sprint: (id: string, data: { duration_hours: number; team_size: number }, token: string) =>
    api<SprintPlan>(`/api/projects/${id}/sprint`, { method: "POST", body: data, token }),

  decompose: (id: string, token: string) =>
    api<Task[]>(`/api/projects/${id}/decompose`, { method: "POST", token }),

  matchTeammates: (id: string, token: string) =>
    api<TeamMatch[]>(`/api/projects/${id}/match`, { method: "POST", token }),
};

export const tasks = {
  get: (id: string, token: string) =>
    api<Task>(`/api/tasks/${id}`, { token }),

  start: (id: string, token: string) =>
    api<Task>(`/api/tasks/${id}/start`, { method: "POST", token }),

  complete: async (id: string, files: File[], token: string): Promise<Task> => {
    const form = new FormData();
    files.forEach((f) => form.append("files", f));
    const res = await fetch(`${API_BASE}/api/tasks/${id}/complete`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: "Request failed" }));
      throw new Error(error.detail || "Request failed");
    }
    return res.json();
  },

  verify: (id: string, verification_answer: string, token: string) =>
    api<Task>(`/api/tasks/${id}/verify`, { method: "POST", body: { verification_answer }, token }),

  chat: (id: string, message: string, token: string) =>
    api<{ reply: string }>(`/api/tasks/${id}/chat`, { method: "POST", body: { message }, token }),

  updateStatus: (id: string, status: Task["status"], token: string) =>
    api<Task>(`/api/tasks/${id}/status`, { method: "PATCH", body: { status }, token }),
};

// Performance
export interface SkillScore {
  skill: string;
  score: number;
  tasks_count: number;
}

export interface RecentCompletion {
  task_id: string;
  task_title: string;
  project_title: string;
  completed_at: string;
  score: number | null;
  difficulty: "easy" | "medium" | "hard" | "expert";
  skill_tags: string[];
}

export interface PerformanceSummary {
  overall_score: number;
  total_projects: number;
  total_tasks: number;
  completed_tasks: number;
  avg_task_score: number;
  skill_scores: SkillScore[];
  /** Preferred performance-summary field for aggregated skill profile data. */
  skill_profiles?: SkillScore[];
  recent_completions: RecentCompletion[];
}

export const performance = {
  summary: (token: string) =>
    api<PerformanceSummary>("/api/performance/summary", { token }),
};

export interface PerformanceInsights {
  strengths: string[];
  improvements: string[];
  next_skill: string;
  summary: string;
}

export interface JudgePitch {
  solution: string;
  impact: string;
  demo_flow: string[];
  ai_use: string;
  total_projects: number;
  total_tasks: number;
  completed_tasks: number;
  skills_tracked: number;
}

export const insights = {
  get: (token: string) => api<PerformanceInsights>("/api/performance/insights", { token }),
};

export const judge = {
  pitch: (token: string) => api<JudgePitch>("/api/performance/judge-pitch", { method: "POST", token }),
};

export interface UserSearchResult {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  team_role: string;
  experience_level: string;
  skills: string[];
  bio: string | null;
  is_available: boolean;
}

export interface PublicProfile {
  full_name: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  team_role: string;
  experience_level: string;
  skills: string[];
  github_url: string | null;
  skill_profiles: SkillScore[];
  overall_score: number;
  total_tasks: number;
  completed_tasks: number;
  total_projects: number;
  level: number;
  total_xp: number;
  unlocked_badges: Badge[];
  completion_rate: number;
  sprint_success_rate: number;
  favorite_skill: string | null;
  current_streak: number;
  recent_achievements: Badge[];
}

export interface XpStatus {
  xp: number;
  level: number;
  xp_to_next_level: number;
  badges: string[];
  current_level_xp: number;
  progress_percentage: number;
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlock_date: string | null;
}

export interface XpActivity {
  id: string;
  amount: number;
  event_type: string;
  title: string;
  created_at: string;
}

export interface GamificationProfile {
  xp: number;
  level: number;
  current_level_xp: number;
  xp_needed_for_next_level: number;
  progress_percentage: number;
  badges: Badge[];
  recent_activity: XpActivity[];
  current_streak: number;
  recent_achievements: Badge[];
}

export interface LeaderboardEntry {
  rank: number;
  id: string;
  full_name: string;
  avatar_url: string | null;
  level: number;
  xp: number;
  badges: Badge[];
  completion_rate: number;
}

export const users = {
  search: (q: string) =>
    api<UserSearchResult[]>(`/api/users/search?q=${encodeURIComponent(q)}`),

  checkUsername: (username: string) =>
    api<{ available: boolean }>(`/api/users/check-username?username=${encodeURIComponent(username)}`),

  dashboardAssistant: (message: string, token: string) =>
    api<{ reply: string }>("/api/users/me/assistant", { method: "POST", body: { message }, token }),

  teamProfile: (token: string) =>
    api<TeamProfile>("/api/users/me/team-profile", { token }),

  updateTeamProfile: (data: TeamProfileUpdate, token: string) =>
    api<TeamProfile>("/api/users/me/team-profile", { method: "PUT", body: data, token }),

  updateProfile: (data: Pick<TeamProfileUpdate, "github_url">, token: string) =>
    api<TeamProfile>("/api/users/me/profile", { method: "PUT", body: data, token }),

  xp: (token: string) =>
    api<XpStatus>("/api/users/me/xp", { token }),

  gamification: (token: string) =>
    api<GamificationProfile>("/api/users/me/gamification", { token }),

  leaderboard: (token: string) =>
    api<LeaderboardEntry[]>("/api/users/leaderboard", { token }),

  publicProfile: (username: string) =>
    api<PublicProfile>(`/api/users/${encodeURIComponent(username)}/profile`),
};
