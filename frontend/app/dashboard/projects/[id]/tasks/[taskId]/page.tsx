"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import {
  projects as projectsApi,
  tasks as tasksApi,
  Task,
  Project,
} from "@/lib/api";

/* ── Palettes ───────────────────────────────────────────────────────── */

const TAG_PALETTES = [
  { bg: "rgba(168,85,247,0.12)", color: "#c084fc", border: "rgba(168,85,247,0.2)" },
  { bg: "rgba(59,130,246,0.12)", color: "#60a5fa", border: "rgba(59,130,246,0.2)" },
  { bg: "rgba(6,182,212,0.12)",  color: "#22d3ee", border: "rgba(6,182,212,0.2)" },
  { bg: "rgba(34,197,94,0.12)",  color: "#4ade80", border: "rgba(34,197,94,0.2)" },
  { bg: "rgba(251,146,60,0.12)", color: "#fb923c", border: "rgba(251,146,60,0.2)" },
];

function tagPalette(tag: string) {
  let h = 0;
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) & 0xffff;
  return TAG_PALETTES[h % TAG_PALETTES.length];
}

const DIFFICULTY: Record<string, { label: string; bg: string; color: string; border: string }> = {
  easy:   { label: "Easy",   bg: "rgba(34,197,94,0.1)",  color: "#4ade80", border: "rgba(34,197,94,0.2)" },
  medium: { label: "Medium", bg: "rgba(251,191,36,0.1)", color: "#fbbf24", border: "rgba(251,191,36,0.2)" },
  hard:   { label: "Hard",   bg: "rgba(251,146,60,0.1)", color: "#fb923c", border: "rgba(251,146,60,0.2)" },
  expert: { label: "Expert", bg: "rgba(239,68,68,0.1)",  color: "#f87171", border: "rgba(239,68,68,0.2)" },
};

const STATUS: Record<string, { label: string; bg: string; color: string; border: string }> = {
  todo:         { label: "To do",        bg: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.45)", border: "rgba(255,255,255,0.1)" },
  in_progress:  { label: "In progress",  bg: "rgba(59,130,246,0.1)",  color: "#60a5fa",                border: "rgba(59,130,246,0.2)" },
  completed:    { label: "Completed",    bg: "rgba(34,197,94,0.1)",   color: "#4ade80",                border: "rgba(34,197,94,0.2)" },
  under_review: { label: "Under review", bg: "rgba(251,191,36,0.1)",  color: "#fbbf24",                border: "rgba(251,191,36,0.2)" },
  cancelled:    { label: "Cancelled",    bg: "rgba(239,68,68,0.08)",  color: "#f87171",                border: "rgba(239,68,68,0.2)" },
};

/* ── Spinner ────────────────────────────────────────────────────────── */

function Spinner({ size = 16, color = "white" }: { size?: number; color?: string }) {
  return (
    <div
      style={{
        width: size, height: size,
        border: `2px solid ${color}33`, borderTopColor: color,
        borderRadius: "50%", flexShrink: 0,
        animation: "spin 0.7s linear infinite",
      }}
    />
  );
}

/* ── Timer display ──────────────────────────────────────────────────── */

function useElapsed(startedAt: string | null, completedAt: string | null) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!startedAt || completedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt, completedAt]);

  if (!startedAt) return null;
  const start = new Date(startedAt).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : now;
  const totalSec = Math.max(0, Math.floor((end - start) / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return { h, m, s, totalSec, display: `${h > 0 ? `${h}h ` : ""}${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s` };
}

/* ── Main page ──────────────────────────────────────────────────────── */

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const projectId = params.id as string;
  const taskId = params.taskId as string;

  const [task, setTask] = useState<Task | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Action states
  const [starting, setStarting] = useState(false);
  const [completing, setCompleting] = useState(false);

  // Verification
  const [showVerification, setShowVerification] = useState(false);
  const [verificationAnswer, setVerificationAnswer] = useState("");
  const [verifying, setVerifying] = useState(false);

  // Chat
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [chatDraft, setChatDraft] = useState("");
  const [chatting, setChatting] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Files
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Confetti
  const [showConfetti, setShowConfetti] = useState(false);

  const elapsed = useElapsed(task?.started_at ?? null, task?.completed_at ?? null);

  /* ── Fetch data ── */
  useEffect(() => {
    if (!token || !projectId || !taskId) return;
    (async () => {
      try {
        const [t, p] = await Promise.all([
          tasksApi.get(taskId, token),
          projectsApi.get(projectId, token),
        ]);
        setTask(t);
        setProject(p);

        // Auto-open chat with greeting
        setChatMessages([{
          role: "assistant",
          content: `Hey! I'm here to help you with "${t.title}". Feel free to ask me anything — how to approach it, what tools to use, or if you get stuck.`,
        }]);
        setChatOpen(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load task");
      } finally {
        setLoading(false);
      }
    })();
  }, [token, projectId, taskId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatting]);

  /* ── Actions ── */
  const handleStart = useCallback(async () => {
    if (!token || !task || starting) return;
    setStarting(true);
    try {
      const updated = await tasksApi.start(task.id, token);
      setTask(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start task");
    } finally {
      setStarting(false);
    }
  }, [token, task, starting]);

  const handleComplete = useCallback(async () => {
    if (!token || !task || completing) return;

    console.log('[Complete] uploadedFiles:', uploadedFiles, 'length:', uploadedFiles.length, 'first item type:', typeof uploadedFiles[0], uploadedFiles[0] instanceof File);

    if (uploadedFiles.length === 0) {
      setError("Please upload proof of your work");
      return;
    }

    setCompleting(true);
    setError("");
    try {
      const updated = await tasksApi.complete(task.id, uploadedFiles, token);
      setTask(updated);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2500);
      if (updated.is_flagged) {
        setShowVerification(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete task");
    } finally {
      setCompleting(false);
    }
  }, [token, task, completing, uploadedFiles]);

  const handleVerify = useCallback(async () => {
    if (!token || !task || !verificationAnswer.trim() || verifying) return;
    setVerifying(true);
    try {
      const updated = await tasksApi.verify(task.id, verificationAnswer.trim(), token);
      setTask(updated);
      if (!updated.is_flagged) {
        setShowVerification(false);
        setVerificationAnswer("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify");
    } finally {
      setVerifying(false);
    }
  }, [token, task, verificationAnswer, verifying]);

  const sendChat = useCallback(async () => {
    if (!token || !task || !chatDraft.trim() || chatting) return;
    const message = chatDraft.trim();
    setChatDraft("");
    setChatMessages((prev) => [...prev, { role: "user", content: message }]);
    setChatting(true);
    try {
      const response = await tasksApi.chat(task.id, message, token);
      setChatMessages((prev) => [...prev, { role: "assistant", content: response.reply }]);
    } catch (err) {
      setChatMessages((prev) => [...prev, { role: "assistant", content: err instanceof Error ? err.message : "Something went wrong." }]);
    } finally {
      setChatting(false);
    }
  }, [token, task, chatDraft, chatting]);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      setUploadedFiles((prev) => [...prev, ...files]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("[FileUpload] onChange fired", e.target.files);
    const fileList = e.target.files;
    console.log("[FileUpload] fileList:", fileList, "length:", fileList?.length);
    if (fileList && fileList.length > 0) {
      const files = Array.from(fileList);
      console.log("[FileUpload] adding files:", files.map(f => `${f.name} (${f.size}B)`));
      setUploadedFiles((prev) => {
        const next = [...prev, ...files];
        console.log("[FileUpload] new uploadedFiles state:", next.map(f => f.name));
        return next;
      });
    } else {
      console.log("[FileUpload] no files in fileList, skipping");
    }
    // Reset so the same file can be re-selected
    e.target.value = "";
  };

  const removeFile = (idx: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  console.log("[FileUpload] render — uploadedFiles:", uploadedFiles.map(f => f.name));

  /* ── Derived ── */
  const diff = task ? (DIFFICULTY[task.difficulty] ?? DIFFICULTY.medium) : DIFFICULTY.medium;
  const effectiveStatus = task?.is_flagged ? "under_review" : (task?.status ?? "todo");
  const stat = STATUS[effectiveStatus] ?? STATUS.todo;
  const isDone = task?.status === "completed";
  const isStarted = !!task?.started_at;

  /* ── Loading ── */
  if (loading) {
    return (
      <div style={{ padding: "48px", background: "#080808", minHeight: "100vh" }}>
        <div style={{ maxWidth: "960px", margin: "0 auto" }}>
          <div style={{ width: 200, height: 14, borderRadius: 6, background: "rgba(255,255,255,0.06)", marginBottom: 40 }} />
          <div style={{ width: 400, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.07)", marginBottom: 16 }} />
          <div style={{ width: 600, height: 16, borderRadius: 6, background: "rgba(255,255,255,0.04)", marginBottom: 48 }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 28 }}>
            <div style={{ height: 400, borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }} />
            <div style={{ height: 400, borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }} />
          </div>
        </div>
      </div>
    );
  }

  if (!task || !project) {
    return (
      <div style={{ padding: "48px", background: "#080808", minHeight: "100vh", color: "white" }}>
        <p style={{ color: "#f87171", marginBottom: 16 }}>{error || "Task not found"}</p>
        <Link href={`/dashboard/projects/${projectId}`} style={{ color: "#a855f7", fontSize: 14, textDecoration: "none" }}>
          &larr; Back to project
        </Link>
      </div>
    );
  }

  return (
    <div style={{ padding: "48px", background: "#080808", minHeight: "100vh", color: "white" }}>
      {showConfetti && (
        <div aria-hidden style={{ position: "fixed", inset: 0, zIndex: 90, pointerEvents: "none", overflow: "hidden" }}>
          {Array.from({ length: 42 }, (_, i) => (
            <i key={i} className="task-confetti-piece" style={{
              background: ["#a855f7", "#3b82f6", "#4ade80", "#fbbf24", "#ec4899"][i % 5],
              transform: `translateX(${(i - 21) * 5}px)`,
              ["--confetti-x" as string]: `${(i - 21) * 28}px`,
              animationDelay: `${(i % 7) * 35}ms`,
            }} />
          ))}
        </div>
      )}

      <div style={{ maxWidth: "960px", margin: "0 auto" }}>

        {/* ── Breadcrumb ─────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 36, flexWrap: "wrap" }}>
          {[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Projects", href: "/dashboard/projects" },
            { label: project.title, href: `/dashboard/projects/${projectId}` },
          ].map((crumb, i) => (
            <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {i > 0 && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              )}
              <Link
                href={crumb.href}
                style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", textDecoration: "none", transition: "color 0.15s", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.35)")}
              >
                {crumb.label}
              </Link>
            </span>
          ))}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {task.title}
          </span>
        </div>

        {/* ── Task header ────────────────────────────────────── */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, marginBottom: 16 }}>
            <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.15, flex: 1, minWidth: 0 }}>
              {task.title}
            </h1>
            <span style={{
              flexShrink: 0, fontSize: 13, fontWeight: 700, padding: "6px 14px", borderRadius: 9,
              background: stat.bg, border: `1px solid ${stat.border}`, color: stat.color,
            }}>
              {stat.label}
            </span>
          </div>

          {/* Meta pills */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <span style={{
              fontSize: 13, fontWeight: 600, padding: "5px 12px", borderRadius: 8,
              background: diff.bg, border: `1px solid ${diff.border}`, color: diff.color,
            }}>
              {diff.label}
            </span>

            {task.estimated_hours != null && (
              <span style={{
                fontSize: 13, fontWeight: 500, padding: "5px 12px", borderRadius: 8,
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)",
                display: "flex", alignItems: "center", gap: 5,
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
                {task.estimated_hours}h estimated
              </span>
            )}

            {task.skill_tags.map((tag) => {
              const p = tagPalette(tag);
              return (
                <span key={tag} style={{
                  fontSize: 13, fontWeight: 500, padding: "5px 12px", borderRadius: 8,
                  background: p.bg, border: `1px solid ${p.border}`, color: p.color,
                }}>
                  {tag}
                </span>
              );
            })}
          </div>
        </div>

        {/* ── Timer bar ──────────────────────────────────────── */}
        {isStarted && (
          <div style={{
            marginBottom: 28, padding: "16px 22px", borderRadius: 14,
            background: elapsed && !task.completed_at
              ? "rgba(59,130,246,0.06)"
              : "rgba(255,255,255,0.03)",
            border: `1px solid ${elapsed && !task.completed_at ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.06)"}`,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: elapsed && !task.completed_at
                  ? "rgba(59,130,246,0.12)"
                  : "rgba(34,197,94,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {!task.completed_at ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                )}
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 2 }}>
                  {task.completed_at ? "Total time" : "Time elapsed"}
                </p>
                <p style={{
                  fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em",
                  fontVariantNumeric: "tabular-nums",
                  background: elapsed && !task.completed_at
                    ? "linear-gradient(135deg, #60a5fa, #a855f7)"
                    : "linear-gradient(135deg, #4ade80, #22d3ee)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                }}>
                  {elapsed?.display ?? "00m 00s"}
                </p>
              </div>
            </div>

            {!isDone && (
              <button
                onClick={handleComplete}
                disabled={completing}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "11px 22px", borderRadius: 10, border: "none",
                  background: completing ? "rgba(34,197,94,0.3)" : "linear-gradient(135deg, #22c55e, #16a34a)",
                  color: "white", fontSize: 14, fontWeight: 700, cursor: completing ? "not-allowed" : "pointer",
                  boxShadow: completing ? "none" : "0 0 20px rgba(34,197,94,0.3)",
                  transition: "opacity 0.15s",
                }}
                onMouseEnter={(e) => { if (!completing) e.currentTarget.style.opacity = "0.9"; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
              >
                {completing ? <Spinner size={14} color="white" /> : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                {completing ? "Completing…" : "Complete Task"}
              </button>
            )}
          </div>
        )}

        {/* ── Error ──────────────────────────────────────────── */}
        {error && (
          <div style={{
            marginBottom: 20, padding: "12px 14px", borderRadius: 10,
            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
            color: "#fca5a5", fontSize: 13, display: "flex", alignItems: "center", gap: 8,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}

        {/* ── Two-column layout ──────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 28, alignItems: "start" }}>

          {/* ── Left column ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            {/* Description */}
            <div style={{
              padding: "24px 26px", borderRadius: 16,
              background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)",
            }}>
              <h2 style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 14 }}>
                Description
              </h2>
              <p style={{ fontSize: 15, color: "rgba(255,255,255,0.65)", lineHeight: 1.7 }}>
                {task.description || "No description provided for this task."}
              </p>
            </div>

            {/* Start task (if not started) */}
            {!isStarted && !isDone && (
              <button
                onClick={handleStart}
                disabled={starting}
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  padding: "18px 24px", borderRadius: 14, border: "none",
                  background: starting ? "rgba(168,85,247,0.4)" : "linear-gradient(135deg, #a855f7, #7c3aed)",
                  color: "white", fontSize: 16, fontWeight: 700, cursor: starting ? "not-allowed" : "pointer",
                  boxShadow: starting ? "none" : "0 0 32px rgba(168,85,247,0.3)",
                  transition: "opacity 0.15s, box-shadow 0.15s",
                }}
                onMouseEnter={(e) => { if (!starting) { e.currentTarget.style.opacity = "0.9"; e.currentTarget.style.boxShadow = "0 0 44px rgba(168,85,247,0.45)"; } }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.boxShadow = starting ? "none" : "0 0 32px rgba(168,85,247,0.3)"; }}
              >
                {starting ? <Spinner size={16} color="white" /> : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                )}
                {starting ? "Starting…" : "Start Task"}
              </button>
            )}

            {/* File upload */}
            <div style={{
              padding: "24px 26px", borderRadius: 16,
              background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)",
            }}>
              <h2 style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 14 }}>
                Submit your work
              </h2>

              <input
                ref={(el) => {
                  (fileInputRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
                  console.log("[FileUpload] input ref set:", el);
                }}
                type="file"
                multiple
                onChange={handleFileSelect}
                style={{ position: "absolute", width: 0, height: 0, opacity: 0, pointerEvents: "none" }}
              />
              <div
                onDrop={handleFileDrop}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onClick={() => {
                  console.log("[FileUpload] drop zone clicked, ref:", fileInputRef.current);
                  fileInputRef.current?.click();
                }}
                style={{
                  padding: "32px 20px", borderRadius: 12, textAlign: "center", cursor: "pointer",
                  border: "2px dashed rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.015)",
                  transition: "border-color 0.2s, background 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(168,85,247,0.3)";
                  e.currentTarget.style.background = "rgba(168,85,247,0.04)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                  e.currentTarget.style.background = "rgba(255,255,255,0.015)";
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 10 }}>
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", marginBottom: 4 }}>
                  Drop files here or <span style={{ color: "#a855f7", fontWeight: 600 }}>browse</span>
                </p>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>
                  Screenshots, code files, documents
                </p>
              </div>

              {uploadedFiles.length > 0 && (
                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.3)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    {uploadedFiles.length} file{uploadedFiles.length !== 1 ? "s" : ""} selected
                  </p>
                  {uploadedFiles.map((file, idx) => (
                    <div key={`${file.name}-${file.size}-${idx}`} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "10px 14px", borderRadius: 10,
                      background: "rgba(34,197,94,0.04)", border: "1px solid rgba(34,197,94,0.12)",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
                        </svg>
                        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {file.name}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                          {file.size < 1024
                            ? `${file.size} B`
                            : file.size < 1048576
                            ? `${(file.size / 1024).toFixed(1)} KB`
                            : `${(file.size / 1048576).toFixed(1)} MB`}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                          style={{
                            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)",
                            borderRadius: 6, color: "rgba(239,68,68,0.6)", cursor: "pointer",
                            fontSize: 14, lineHeight: 1, padding: "3px 7px",
                            transition: "background 0.15s, color 0.15s",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.15)"; e.currentTarget.style.color = "#f87171"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; e.currentTarget.style.color = "rgba(239,68,68,0.6)"; }}
                        >
                          &times;
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Right column: AI chat ── */}
          <div style={{
            borderRadius: 16, overflow: "hidden",
            background: "rgba(255,255,255,0.025)", border: "1px solid rgba(59,130,246,0.15)",
            display: "flex", flexDirection: "column", height: "min(620px, 70vh)",
            position: "sticky", top: 48,
          }}>
            {/* Chat header */}
            <div style={{
              padding: "16px 20px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 9,
                  background: "linear-gradient(135deg, rgba(59,130,246,0.2), rgba(168,85,247,0.2))",
                  border: "1px solid rgba(59,130,246,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                  </svg>
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "white" }}>AI Assistant</p>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Task guidance &amp; help</p>
                </div>
              </div>
              <button
                onClick={() => setChatOpen(!chatOpen)}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 18 }}
              >
                {chatOpen ? "−" : "+"}
              </button>
            </div>

            {chatOpen && (
              <>
                {/* Messages */}
                <div style={{
                  flex: 1, overflowY: "auto", padding: "16px 16px 8px",
                  display: "flex", flexDirection: "column", gap: 10,
                }}>
                  {chatMessages.map((msg, i) => (
                    <div key={i} style={{
                      alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                      maxWidth: "88%", padding: "10px 14px", borderRadius: 12,
                      background: msg.role === "user"
                        ? "linear-gradient(135deg, #7c3aed, #2563eb)"
                        : "rgba(255,255,255,0.06)",
                      color: msg.role === "user" ? "white" : "rgba(255,255,255,0.82)",
                      fontSize: 13, lineHeight: 1.55, whiteSpace: "pre-wrap",
                    }}>
                      {msg.content}
                    </div>
                  ))}
                  {chatting && (
                    <div style={{
                      alignSelf: "flex-start", padding: "10px 14px", borderRadius: 12,
                      background: "rgba(255,255,255,0.06)", fontSize: 13, color: "#60a5fa",
                      display: "flex", alignItems: "center", gap: 8,
                    }}>
                      <Spinner size={12} color="#60a5fa" />
                      Thinking…
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Input */}
                <form
                  onSubmit={(e) => { e.preventDefault(); sendChat(); }}
                  style={{
                    display: "flex", gap: 8, padding: "12px 16px",
                    borderTop: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <input
                    value={chatDraft}
                    onChange={(e) => setChatDraft(e.target.value)}
                    placeholder="Ask about this task…"
                    style={{
                      flex: 1, padding: "10px 14px", borderRadius: 9,
                      border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)",
                      color: "white", fontSize: 13, outline: "none", fontFamily: "inherit",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(59,130,246,0.3)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                  />
                  <button
                    type="submit"
                    disabled={chatting || !chatDraft.trim()}
                    style={{
                      padding: "0 16px", border: "none", borderRadius: 9,
                      background: "linear-gradient(135deg, #a855f7, #3b82f6)",
                      color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer",
                      opacity: chatting || !chatDraft.trim() ? 0.5 : 1,
                    }}
                  >
                    Send
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Verification modal ───────────────────────────────── */}
      {showVerification && task.is_flagged && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed", inset: 0, zIndex: 50,
            display: "grid", placeItems: "center", padding: 20,
            background: "rgba(0,0,0,0.72)", backdropFilter: "blur(5px)",
          }}
        >
          <div style={{
            width: "min(100%, 520px)", padding: 28, borderRadius: 18,
            background: "#131313", border: "1px solid rgba(251,191,36,0.25)",
            boxShadow: "0 28px 80px rgba(0,0,0,0.5)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 18 }}>
              <div>
                <p style={{ margin: 0, color: "#fbbf24", fontSize: 11, fontWeight: 800, letterSpacing: "0.09em", textTransform: "uppercase" }}>
                  Verification Required
                </p>
                <h2 style={{ margin: "6px 0 0", color: "white", fontSize: 20, fontWeight: 800 }}>
                  Confirm your work
                </h2>
              </div>
              <button
                onClick={() => setShowVerification(false)}
                style={{ border: "none", background: "transparent", color: "rgba(255,255,255,0.5)", fontSize: 24, cursor: "pointer" }}
              >
                &times;
              </button>
            </div>

            <p style={{ margin: "0 0 16px", color: "rgba(255,255,255,0.5)", fontSize: 13, lineHeight: 1.55 }}>
              {task.flag_reason || "This task was completed faster than expected. Please verify your work."}
            </p>

            <div style={{
              padding: 16, marginBottom: 16, borderRadius: 12,
              background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.15)",
              color: "rgba(255,255,255,0.9)", fontSize: 14, lineHeight: 1.55,
            }}>
              {task.verification_question || "Explain how you completed this task."}
            </div>

            <textarea
              value={verificationAnswer}
              onChange={(e) => setVerificationAnswer(e.target.value)}
              placeholder="Describe your approach, decisions, and outcome…"
              rows={5}
              style={{
                width: "100%", resize: "vertical", boxSizing: "border-box",
                padding: "12px 14px", borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)",
                color: "white", fontFamily: "inherit", fontSize: 14, outline: "none", lineHeight: 1.5,
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(251,191,36,0.3)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)")}
            />

            <button
              onClick={handleVerify}
              disabled={verifying || !verificationAnswer.trim()}
              style={{
                width: "100%", marginTop: 16, padding: 13, border: "none", borderRadius: 10,
                background: "linear-gradient(135deg, #a855f7, #3b82f6)",
                color: "white", fontSize: 14, fontWeight: 700,
                cursor: verifying || !verificationAnswer.trim() ? "not-allowed" : "pointer",
                opacity: verifying || !verificationAnswer.trim() ? 0.55 : 1,
              }}
            >
              {verifying ? "Reviewing…" : "Submit Verification"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
