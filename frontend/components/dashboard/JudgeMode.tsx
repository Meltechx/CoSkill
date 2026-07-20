"use client";

import { useEffect, useMemo, useState } from "react";
import { judge, JudgePitch } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

type Slide = {
  title: string;
  eyebrow: string;
  body?: string;
  bullets?: string[];
  stats?: { value: number; label: string }[];
};

const FALLBACK_PITCH: JudgePitch = {
  solution: "CoSkill helps developers plan work, complete tasks, and turn every result into credible proof of skill.",
  impact: "Each completed task strengthens a living record of what you can actually build.",
  demo_flow: [
    "Open the dashboard to see your work at a glance.",
    "Create a project and describe the outcome you want.",
    "Let AI break the goal into focused, actionable tasks.",
    "Submit completed work for review and verification.",
    "Open Performance to share your evolving skill profile.",
  ],
  ai_use: "GPT-5.6 decomposes goals into tasks, scores completed work, and asks verification questions when proof needs a closer look.",
  total_projects: 0,
  total_tasks: 0,
  completed_tasks: 0,
  skills_tracked: 0,
};

function makeSlides(pitch: JudgePitch): Slide[] {
  return [
    {
      eyebrow: "01 — Problem",
      title: "Proof beats promises.",
      body: "Traditional CVs are just claims. CoSkill turns work into proof.",
    },
    {
      eyebrow: "02 — Solution",
      title: "A living record of real work.",
      body: pitch.solution,
    },
    {
      eyebrow: "03 — Technology",
      title: "Built for fast, trusted feedback.",
      bullets: ["FastAPI", "Next.js", "Supabase", "GPT-5.6"],
    },
    {
      eyebrow: "04 — Impact",
      title: "Progress you can point to.",
      body: pitch.impact,
      stats: [
        { value: pitch.total_projects, label: "projects tracked" },
        { value: pitch.total_tasks, label: "tasks tracked" },
        { value: pitch.completed_tasks, label: "tasks completed" },
        { value: pitch.skills_tracked, label: "skills verified" },
      ],
    },
    {
      eyebrow: "05 — Demo flow",
      title: "From goal to evidence in five clicks.",
      bullets: pitch.demo_flow,
    },
    {
      eyebrow: "06 — How AI is used",
      title: "AI that keeps the proof credible.",
      body: pitch.ai_use,
    },
  ];
}

export default function JudgeMode() {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [pitch, setPitch] = useState<JudgePitch | null>(null);
  const [loading, setLoading] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const [usingFallback, setUsingFallback] = useState(false);
  const slides = useMemo(() => (pitch ? makeSlides(pitch) : []), [pitch]);

  const close = () => setOpen(false);
  const previous = () => setSlideIndex((current) => Math.max(0, current - 1));
  const next = () => setSlideIndex((current) => (slides.length ? Math.min(slides.length - 1, current + 1) : 0));

  useEffect(() => {
    if (!open || !token) return;
    let active = true;
    setLoading(true);
    setPitch(null);
    setSlideIndex(0);
    setUsingFallback(false);

    judge.pitch(token)
      .then((generatedPitch) => {
        if (active) setPitch(generatedPitch);
      })
      .catch(() => {
        if (active) {
          setPitch(FALLBACK_PITCH);
          setUsingFallback(true);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [open, token]);

  useEffect(() => {
    if (!open || loading || slides.length === 0) return;
    const timer = window.setTimeout(next, 5000);
    return () => window.clearTimeout(timer);
  }, [open, loading, slideIndex, slides.length]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowLeft") previous();
      if (event.key === "ArrowRight" || event.key === "Enter") next();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, slides.length]);

  const slide = slides[slideIndex];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          width: "auto", padding: "7px 10px", borderRadius: "6px", border: "1px solid #30363d",
          background: "#21262d", color: "#e6edf3",
          cursor: "pointer", fontSize: "13px", fontWeight: 600, display: "flex", alignItems: "center", gap: 7,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" /><path d="m9 8 6 4-6 4V8Z" />
        </svg>
        Judge Mode
      </button>

      {open && (
        <div role="dialog" aria-modal="true" aria-label="Judge Mode presentation" style={{
          position: "fixed", inset: 0, zIndex: 100, overflow: "hidden", color: "white", background: "#07070a",
          display: "flex", flexDirection: "column", isolation: "isolate",
        }}>
          <div aria-hidden style={{ position: "absolute", width: "60vw", height: "60vw", minWidth: 500, minHeight: 500, borderRadius: "50%", background: "rgba(124,58,237,0.2)", filter: "blur(120px)", top: "-35vw", left: "-15vw", zIndex: -1 }} />
          <div aria-hidden style={{ position: "absolute", width: "52vw", height: "52vw", minWidth: 400, minHeight: 400, borderRadius: "50%", background: "rgba(37,99,235,0.14)", filter: "blur(120px)", bottom: "-30vw", right: "-15vw", zIndex: -1 }} />

          <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px clamp(24px, 5vw, 72px)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 28, height: 28, borderRadius: 8, display: "grid", placeItems: "center", background: "linear-gradient(135deg, #a855f7, #2563eb)", fontSize: 13, fontWeight: 800 }}>C</span>
              <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>CoSkill · Judge Mode</span>
            </div>
            <button onClick={close} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.16)", color: "rgba(255,255,255,0.76)", borderRadius: 9, padding: "9px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Close <span style={{ color: "rgba(255,255,255,0.36)" }}>Esc</span></button>
          </header>

          <main style={{ flex: 1, display: "grid", placeItems: "center", padding: "36px clamp(24px, 10vw, 180px)" }}>
            {loading || !slide ? (
              <div style={{ textAlign: "center" }}>
                <div style={{ width: 42, height: 42, margin: "0 auto 18px", borderRadius: "50%", border: "3px solid rgba(168,85,247,0.2)", borderTopColor: "#c084fc", animation: "spin 0.7s linear infinite" }} />
                <p style={{ fontSize: 18, color: "rgba(255,255,255,0.65)" }}>GPT-5.6 is preparing your pitch…</p>
              </div>
            ) : (
              <section key={`${slideIndex}-${slide.title}`} style={{ width: "min(100%, 1000px)", animation: "fade-up 0.45s ease both" }}>
                <p style={{ margin: "0 0 18px", color: "#c084fc", fontSize: 13, fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase" }}>{slide.eyebrow}</p>
                <h1 style={{ margin: 0, fontSize: "clamp(40px, 6.4vw, 88px)", lineHeight: 0.98, letterSpacing: "-0.065em", maxWidth: 900 }}>{slide.title}</h1>
                {slide.body && <p style={{ margin: "28px 0 0", maxWidth: 800, fontSize: "clamp(21px, 2.5vw, 34px)", lineHeight: 1.35, color: "rgba(255,255,255,0.7)", letterSpacing: "-0.025em" }}>{slide.body}</p>}
                {slide.bullets && <ul style={{ display: "grid", gridTemplateColumns: slide.eyebrow.startsWith("03") ? "repeat(2, minmax(0, 1fr))" : "1fr", gap: 14, margin: "34px 0 0", padding: 0, listStyle: "none", maxWidth: 820 }}>{slide.bullets.map((bullet, index) => <li key={bullet} style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "14px 16px", borderRadius: 12, background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.09)", fontSize: "clamp(16px, 1.8vw, 21px)", lineHeight: 1.35, color: "rgba(255,255,255,0.78)" }}><span style={{ color: "#c084fc", fontWeight: 800, fontSize: 13, paddingTop: 4 }}>{String(index + 1).padStart(2, "0")}</span>{bullet}</li>)}</ul>}
                {slide.stats && <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12, marginTop: 34 }}>{slide.stats.map((stat) => <div key={stat.label} style={{ padding: "18px 14px", borderRadius: 13, background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.09)" }}><strong style={{ display: "block", fontSize: "clamp(26px, 4vw, 46px)", letterSpacing: "-0.06em", color: "#e9d5ff" }}>{stat.value}</strong><span style={{ display: "block", marginTop: 5, fontSize: 11, color: "rgba(255,255,255,0.46)", textTransform: "uppercase", letterSpacing: "0.07em" }}>{stat.label}</span></div>)}</div>}
              </section>
            )}
          </main>

          <footer style={{ padding: "22px clamp(24px, 5vw, 72px) 28px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
            <div style={{ display: "flex", gap: 7, alignItems: "center" }}>{Array.from({ length: 6 }, (_, index) => <i key={index} style={{ width: index === slideIndex ? 28 : 7, height: 7, borderRadius: 20, background: index === slideIndex ? "#c084fc" : "rgba(255,255,255,0.2)", transition: "width 0.2s, background 0.2s" }} />)}<span style={{ marginLeft: 8, fontSize: 12, color: "rgba(255,255,255,0.38)" }}>{slideIndex + 1} / 6 · auto-advances every 5s</span></div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              {usingFallback && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Showing demo copy</span>}
              <div style={{ display: "flex", gap: 10 }}>
                {slideIndex > 0 && (
                  <button onClick={previous} disabled={loading} style={{ padding: "12px 20px", border: "1px solid rgba(255,255,255,0.16)", borderRadius: 10, background: "rgba(255,255,255,0.05)", color: "white", fontSize: 14, fontWeight: 800, cursor: loading ? "wait" : "pointer" }}><span aria-hidden>←</span> Previous</button>
                )}
                {slideIndex < slides.length - 1 && (
                  <button onClick={next} disabled={loading} style={{ padding: "12px 20px", border: "none", borderRadius: 10, background: loading ? "rgba(168,85,247,0.35)" : "linear-gradient(135deg, #a855f7, #2563eb)", color: "white", fontSize: 14, fontWeight: 800, cursor: loading ? "wait" : "pointer" }}>Next <span aria-hidden>→</span></button>
                )}
              </div>
            </div>
          </footer>
        </div>
      )}
    </>
  );
}
