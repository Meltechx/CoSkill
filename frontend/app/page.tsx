"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <main style={{ background: "#080808", minHeight: "100vh", color: "white", overflowX: "hidden" }}>

      {/* ── Animated background orbs ─────────────────────────────── */}
      <div aria-hidden style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
        {/* Purple orb – top left */}
        <div
          className="animate-orb-1"
          style={{
            position: "absolute",
            top: "-120px",
            left: "-100px",
            width: "680px",
            height: "680px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(168,85,247,0.18) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />
        {/* Blue orb – bottom right */}
        <div
          className="animate-orb-2"
          style={{
            position: "absolute",
            bottom: "-150px",
            right: "-120px",
            width: "720px",
            height: "720px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)",
            filter: "blur(48px)",
          }}
        />
        {/* Indigo orb – center */}
        <div
          className="animate-orb-3"
          style={{
            position: "absolute",
            top: "40%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(99,102,241,0.10) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
        {/* Subtle grid overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
          }}
        />
      </div>

      {/* ── Navbar ───────────────────────────────────────────────── */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 48px",
          height: "64px",
          background: "rgba(8,8,8,0.7)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* Logo */}
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #a855f7, #3b82f6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "13px",
              fontWeight: 800,
              color: "white",
            }}
          >
            C
          </div>
          <span style={{ fontWeight: 700, fontSize: "17px", color: "white", letterSpacing: "-0.3px" }}>
            CoSkill
          </span>
        </Link>

        {/* Nav links */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {user ? (
            <Link
              href="/dashboard"
              style={{
                padding: "8px 20px",
                background: "linear-gradient(135deg, #a855f7, #3b82f6)",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: 600,
                color: "white",
                textDecoration: "none",
                transition: "opacity 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              Dashboard →
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                style={{
                  padding: "8px 18px",
                  fontSize: "14px",
                  color: "rgba(255,255,255,0.55)",
                  textDecoration: "none",
                  borderRadius: "8px",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "white")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.55)")}
              >
                Log in
              </Link>
              <Link
                href="/register"
                style={{
                  padding: "8px 20px",
                  background: "linear-gradient(135deg, #a855f7, #3b82f6)",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "white",
                  textDecoration: "none",
                  transition: "opacity 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section
        className="animate-fade-up-1"
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          padding: "160px 24px 120px",
        }}
      >
        {/* Badge */}
        <div
          className="animate-fade-up-1"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "6px 14px",
            borderRadius: "9999px",
            background: "rgba(168,85,247,0.08)",
            border: "1px solid rgba(168,85,247,0.2)",
            fontSize: "13px",
            color: "#c084fc",
            fontWeight: 500,
            marginBottom: "32px",
            letterSpacing: "0.01em",
          }}
        >
          <span
            className="animate-badge-dot"
            style={{
              display: "inline-block",
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              background: "#a855f7",
            }}
          />
          AI-Powered Performance Platform
        </div>

        {/* H1 */}
        <h1
          className="animate-fade-up-2"
          style={{
            fontSize: "clamp(48px, 7vw, 88px)",
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: "-0.04em",
            maxWidth: "860px",
            marginBottom: "0",
          }}
        >
          <span style={{ color: "white" }}>Track performance.</span>
          <br />
          <span className="gradient-text">Discover talent.</span>
        </h1>

        {/* Subtext */}
        <p
          className="animate-fade-up-3"
          style={{
            marginTop: "28px",
            fontSize: "18px",
            lineHeight: 1.65,
            color: "rgba(255,255,255,0.48)",
            maxWidth: "540px",
          }}
        >
          CoSkill uses AI to decompose projects into tasks, score team performance automatically,
          and surface hidden talent — all in one sleek workspace.
        </p>

        {/* CTAs */}
        <div
          className="animate-fade-up-4"
          style={{
            display: "flex",
            gap: "12px",
            marginTop: "48px",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <Link
            href="/register"
            style={{
              padding: "14px 32px",
              background: "linear-gradient(135deg, #a855f7, #3b82f6)",
              borderRadius: "10px",
              fontSize: "15px",
              fontWeight: 600,
              color: "white",
              textDecoration: "none",
              boxShadow: "0 0 40px rgba(168,85,247,0.3)",
              transition: "box-shadow 0.2s, opacity 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "0 0 60px rgba(168,85,247,0.45)";
              e.currentTarget.style.opacity = "0.92";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "0 0 40px rgba(168,85,247,0.3)";
              e.currentTarget.style.opacity = "1";
            }}
          >
            Start for free →
          </Link>
          <Link
            href="#features"
            style={{
              padding: "14px 32px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "10px",
              fontSize: "15px",
              fontWeight: 500,
              color: "rgba(255,255,255,0.7)",
              textDecoration: "none",
              transition: "background 0.2s, border-color 0.2s, color 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.07)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)";
              e.currentTarget.style.color = "white";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.04)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
              e.currentTarget.style.color = "rgba(255,255,255,0.7)";
            }}
          >
            See how it works
          </Link>
        </div>

        {/* Floating hero card preview */}
        <div
          style={{
            marginTop: "72px",
            width: "100%",
            maxWidth: "720px",
            borderRadius: "16px",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            backdropFilter: "blur(12px)",
            padding: "24px",
            boxShadow: "0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(168,85,247,0.06)",
          }}
        >
          {/* Fake terminal / app preview */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "16px" }}>
            {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
              <div key={c} style={{ width: "10px", height: "10px", borderRadius: "50%", background: c }} />
            ))}
            <span style={{ marginLeft: "8px", fontSize: "12px", color: "rgba(255,255,255,0.25)" }}>
              CoSkill — AI decomposition
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {[
              { label: "Set up authentication system", tag: "Backend", pct: 100, done: true },
              { label: "Design database schema", tag: "Architecture", pct: 100, done: true },
              { label: "Build REST API endpoints", tag: "Backend", pct: 68, done: false },
              { label: "Create dashboard UI", tag: "Frontend", pct: 40, done: false },
            ].map((task) => (
              <div
                key={task.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <div
                  style={{
                    width: "16px",
                    height: "16px",
                    borderRadius: "4px",
                    border: task.done ? "none" : "1.5px solid rgba(255,255,255,0.2)",
                    background: task.done ? "linear-gradient(135deg,#a855f7,#3b82f6)" : "transparent",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {task.done && (
                    <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                      <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span
                  style={{
                    flex: 1,
                    fontSize: "13px",
                    color: task.done ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.75)",
                    textDecoration: task.done ? "line-through" : "none",
                  }}
                >
                  {task.label}
                </span>
                <span
                  style={{
                    fontSize: "11px",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    background: "rgba(168,85,247,0.1)",
                    color: "#c084fc",
                    fontWeight: 500,
                  }}
                >
                  {task.tag}
                </span>
                <div style={{ width: "60px", height: "3px", borderRadius: "99px", background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${task.pct}%`,
                      borderRadius: "99px",
                      background: "linear-gradient(90deg,#a855f7,#3b82f6)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────────────────── */}
      <section
        style={{
          position: "relative",
          zIndex: 10,
          borderTop: "1px solid rgba(255,255,255,0.05)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          padding: "40px 48px",
        }}
      >
        <div
          style={{
            maxWidth: "900px",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "32px",
            textAlign: "center",
          }}
        >
          {[
            { value: "10k+", label: "Professionals" },
            { value: "500k+", label: "Tasks Tracked" },
            { value: "98%", label: "Score Accuracy" },
            { value: "3×", label: "Faster Reviews" },
          ].map((stat) => (
            <div key={stat.label}>
              <div
                className="gradient-text"
                style={{ fontSize: "32px", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1 }}
              >
                {stat.value}
              </div>
              <div style={{ marginTop: "6px", fontSize: "13px", color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────── */}
      <section id="features" style={{ position: "relative", zIndex: 10, padding: "100px 48px" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          {/* Section label */}
          <div style={{ textAlign: "center", marginBottom: "64px" }}>
            <span
              style={{
                display: "inline-block",
                fontSize: "12px",
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#a855f7",
                marginBottom: "16px",
              }}
            >
              Features
            </span>
            <h2
              style={{
                fontSize: "clamp(28px, 4vw, 44px)",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                color: "white",
                lineHeight: 1.1,
              }}
            >
              Everything your team needs
            </h2>
            <p style={{ marginTop: "16px", fontSize: "16px", color: "rgba(255,255,255,0.4)", maxWidth: "480px", margin: "16px auto 0" }}>
              One platform to assign work, measure performance, and discover who your top performers are.
            </p>
          </div>

          {/* Card grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
            {[
              {
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                ),
                title: "AI Task Decomposition",
                desc: "Describe a project goal in plain language. AI instantly generates a full task breakdown with time estimates and skill tags.",
                tag: "Powered by GPT",
              },
              {
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                ),
                title: "Performance Scoring",
                desc: "Automated, transparent scoring based on task completion speed, consistency, and difficulty — no manual reviews.",
                tag: "Real-time",
              },
              {
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                  </svg>
                ),
                title: "Talent Discovery",
                desc: "Surface hidden experts and emerging leaders from work history. Build skill profiles automatically — no self-reporting.",
                tag: "Automated",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="glass-card"
                style={{ borderRadius: "16px", padding: "28px" }}
              >
                {/* Icon */}
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "12px",
                    background: "linear-gradient(135deg, rgba(168,85,247,0.2), rgba(59,130,246,0.2))",
                    border: "1px solid rgba(168,85,247,0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#c084fc",
                    marginBottom: "20px",
                  }}
                >
                  {f.icon}
                </div>
                {/* Tag */}
                <div style={{ marginBottom: "10px" }}>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "rgba(168,85,247,0.7)",
                    }}
                  >
                    {f.tag}
                  </span>
                </div>
                <h3 style={{ fontSize: "17px", fontWeight: 700, color: "white", marginBottom: "10px", letterSpacing: "-0.02em" }}>
                  {f.title}
                </h3>
                <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.42)", lineHeight: 1.65 }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────── */}
      <section
        id="how-it-works"
        style={{
          position: "relative",
          zIndex: 10,
          padding: "80px 48px 100px",
          borderTop: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "72px" }}>
            <span
              style={{
                display: "inline-block",
                fontSize: "12px",
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#3b82f6",
                marginBottom: "16px",
              }}
            >
              How it works
            </span>
            <h2
              style={{
                fontSize: "clamp(28px, 4vw, 44px)",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                color: "white",
                lineHeight: 1.1,
              }}
            >
              Up and running in minutes
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "32px", position: "relative" }}>
            {/* Connector lines */}
            <div
              style={{
                position: "absolute",
                top: "28px",
                left: "calc(33.33% + 16px)",
                width: "calc(33.33% - 32px)",
                height: "1px",
                background: "linear-gradient(90deg, rgba(168,85,247,0.3), rgba(99,102,241,0.3))",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: "28px",
                left: "calc(66.66% + 16px)",
                width: "calc(33.33% - 64px)",
                height: "1px",
                background: "linear-gradient(90deg, rgba(99,102,241,0.3), rgba(59,130,246,0.3))",
              }}
            />

            {[
              {
                num: "01",
                title: "Create a project",
                desc: "Add your project title and goal. Takes 30 seconds.",
                color: "#a855f7",
              },
              {
                num: "02",
                title: "AI decomposes it",
                desc: "Our AI generates a full task list with estimates and skill requirements.",
                color: "#6366f1",
              },
              {
                num: "03",
                title: "Track & discover",
                desc: "As tasks are completed, performance scores and skill profiles build automatically.",
                color: "#3b82f6",
              },
            ].map((step) => (
              <div key={step.num} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                {/* Number bubble */}
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "16px",
                    background: `rgba(${step.color === "#a855f7" ? "168,85,247" : step.color === "#6366f1" ? "99,102,241" : "59,130,246"},0.12)`,
                    border: `1px solid ${step.color}33`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "18px",
                    fontWeight: 800,
                    color: step.color,
                    letterSpacing: "-0.02em",
                    marginBottom: "24px",
                  }}
                >
                  {step.num}
                </div>
                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: 700,
                    color: "white",
                    marginBottom: "10px",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {step.title}
                </h3>
                <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.4)", lineHeight: 1.65 }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <section
        style={{
          position: "relative",
          zIndex: 10,
          padding: "100px 48px",
          borderTop: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        {/* Glow behind CTA */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              width: "600px",
              height: "300px",
              borderRadius: "50%",
              background: "radial-gradient(ellipse, rgba(168,85,247,0.12) 0%, transparent 70%)",
              filter: "blur(40px)",
            }}
          />
        </div>

        <div style={{ position: "relative", maxWidth: "640px", margin: "0 auto", textAlign: "center" }}>
          <h2
            style={{
              fontSize: "clamp(32px, 5vw, 56px)",
              fontWeight: 800,
              letterSpacing: "-0.04em",
              lineHeight: 1.05,
              marginBottom: "20px",
            }}
          >
            Ready to{" "}
            <span className="gradient-text">unlock your team's</span>
            <br />
            full potential?
          </h2>
          <p style={{ fontSize: "16px", color: "rgba(255,255,255,0.42)", marginBottom: "40px", lineHeight: 1.6 }}>
            Join thousands of teams using CoSkill to measure performance fairly and surface hidden talent.
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              href="/register"
              style={{
                padding: "14px 36px",
                background: "linear-gradient(135deg, #a855f7, #3b82f6)",
                borderRadius: "10px",
                fontSize: "15px",
                fontWeight: 600,
                color: "white",
                textDecoration: "none",
                boxShadow: "0 0 40px rgba(168,85,247,0.35)",
                transition: "opacity 0.2s, box-shadow 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "0.9";
                e.currentTarget.style.boxShadow = "0 0 60px rgba(168,85,247,0.5)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "1";
                e.currentTarget.style.boxShadow = "0 0 40px rgba(168,85,247,0.35)";
              }}
            >
              Create free account
            </Link>
            <Link
              href="/login"
              style={{
                padding: "14px 28px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "10px",
                fontSize: "15px",
                fontWeight: 500,
                color: "rgba(255,255,255,0.6)",
                textDecoration: "none",
                transition: "background 0.2s, color 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.07)";
                e.currentTarget.style.color = "white";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                e.currentTarget.style.color = "rgba(255,255,255,0.6)";
              }}
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer
        style={{
          position: "relative",
          zIndex: 10,
          padding: "32px 48px",
          borderTop: "1px solid rgba(255,255,255,0.05)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.28)" }}>
          © 2026 CoSkill. Built for the hackathon.
        </span>
        <div style={{ display: "flex", gap: "24px" }}>
          {[
            { label: "GitHub", href: "#" },
            { label: "Twitter", href: "#" },
          ].map((l) => (
            <Link
              key={l.label}
              href={l.href}
              style={{
                fontSize: "13px",
                color: "rgba(255,255,255,0.3)",
                textDecoration: "none",
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </footer>
    </main>
  );
}
