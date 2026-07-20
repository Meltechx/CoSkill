"use client";

import { useState } from "react";

interface CreateProjectModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (data: { title: string; goal: string; deadline?: string }) => Promise<void>;
}

export default function CreateProjectModal({ open, onClose, onCreate }: CreateProjectModalProps) {
  const [title, setTitle] = useState("");
  const [goal, setGoal] = useState("");
  const [deadline, setDeadline] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await onCreate({ title, goal, deadline: deadline ? new Date(`${deadline}T23:59:59`).toISOString() : undefined });
      setTitle("");
      setGoal("");
      setDeadline("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.75)",
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "460px",
          background: "#161b22",
          border: "1px solid #30363d",
          borderRadius: "6px",
          padding: "24px",
          boxShadow: "0 16px 48px rgba(1,4,9,.75)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
          <div>
            <h2 style={{ fontSize: "17px", fontWeight: 600, color: "#e6edf3" }}>
              New project
            </h2>
            <p style={{ fontSize: "13px", color: "#8b949e", marginTop: "3px" }}>
              AI will break your goal into actionable tasks
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "6px",
              background: "#21262d",
              border: "1px solid #30363d",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#8b949e",
              transition: "background 0.15s, color 0.15s",
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.background = "#30363d";
                e.currentTarget.style.color = "#e6edf3";
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.background = "#21262d";
                e.currentTarget.style.color = "#8b949e";
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              marginBottom: "18px",
              padding: "11px 14px",
              borderRadius: "10px",
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.2)",
              color: "#fca5a5",
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Title */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "13px", fontWeight: 500, color: "#8b949e" }}>
              Project title
            </label>
            <input
              className="auth-input"
              type="text"
              placeholder="My awesome project"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
            />
          </div>

          {/* Goal */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "13px", fontWeight: 500, color: "#8b949e" }}>
              Project goal
            </label>
            <textarea
              className="auth-input"
              placeholder="Describe what you want to achieve — AI will break it into tasks…"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              rows={3}
              style={{ resize: "none", lineHeight: 1.55 }}
            />
            <p style={{ fontSize: "12px", color: "#8b949e", display: "flex", alignItems: "center", gap: "4px" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              More detail = better AI breakdown
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "13px", fontWeight: 500, color: "#8b949e" }}>Deadline <span style={{ color: "#8b949e" }}>(optional)</span></label>
            <input className="auth-input" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: "11px",
                borderRadius: "6px",
                background: "#21262d",
                border: "1px solid #30363d",
                color: "#e6edf3",
                fontSize: "14px",
                fontWeight: 500,
                cursor: "pointer",
                transition: "background 0.15s, color 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#30363d";
                e.currentTarget.style.color = "#e6edf3";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#21262d";
                e.currentTarget.style.color = "#e6edf3";
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: "11px",
                borderRadius: "6px",
                background: loading ? "#1f6f2d" : "#238636",
                border: "1px solid rgba(240,246,252,.1)",
                color: "white",
                fontSize: "14px",
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "7px",
                transition: "background 0.15s ease",
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = "#2ea043"; }}
              onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = "#238636"; }}
            >
              {loading && <span className="auth-spinner" />}
              {loading ? "Creating…" : "Create project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
