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

  decompose: (id: string, token: string) =>
    api<Task[]>(`/api/projects/${id}/decompose`, { method: "POST", token }),
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

export const insights = {
  get: (token: string) => api<PerformanceInsights>("/api/performance/insights", { token }),
};

export interface PublicProfile {
  full_name: string;
  skill_profiles: SkillScore[];
  overall_score: number;
  total_tasks: number;
  completed_tasks: number;
}

export const users = {
  publicProfile: (id: string) =>
    api<PublicProfile>(`/api/users/${encodeURIComponent(id)}/profile`),
};
