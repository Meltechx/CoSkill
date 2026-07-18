"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { auth as authApi } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };
  const signInWithGoogle = async () => { try { window.location.assign((await authApi.googleUrl()).url); } catch (err) { setError(err instanceof Error ? err.message : "Google sign-in is unavailable."); } };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#080808",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background orbs */}
      <div aria-hidden style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <div
          className="animate-orb-1"
          style={{
            position: "absolute",
            top: "-200px",
            left: "-150px",
            width: "600px",
            height: "600px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(168,85,247,0.14) 0%, transparent 70%)",
            filter: "blur(50px)",
          }}
        />
        <div
          className="animate-orb-2"
          style={{
            position: "absolute",
            bottom: "-180px",
            right: "-140px",
            width: "580px",
            height: "580px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)",
            filter: "blur(50px)",
          }}
        />
      </div>

      {/* Card */}
      <div
        className="animate-fade-up-1"
        style={{
          position: "relative",
          zIndex: 10,
          width: "100%",
          maxWidth: "400px",
        }}
      >
        <Link href="/" style={{ display: "inline-flex", marginBottom: "20px", color: "rgba(255,255,255,0.48)", fontSize: "13px", textDecoration: "none" }}>
          ← Back to home
        </Link>
        {/* Logo */}
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            textDecoration: "none",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #a855f7, #3b82f6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "14px",
              fontWeight: 800,
              color: "white",
            }}
          >
            C
          </div>
          <span
            className="gradient-text"
            style={{ fontSize: "20px", fontWeight: 800, letterSpacing: "-0.03em" }}
          >
            CoSkill
          </span>
        </Link>

        {/* Glass card */}
        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "20px",
            padding: "36px 32px",
            boxShadow: "0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(168,85,247,0.05)",
          }}
        >
          {/* Heading */}
          <div style={{ textAlign: "center", marginBottom: "28px" }}>
            <h1
              style={{
                fontSize: "22px",
                fontWeight: 700,
                color: "white",
                letterSpacing: "-0.03em",
                marginBottom: "6px",
              }}
            >
              Welcome back
            </h1>
            <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.38)" }}>
              Sign in to your CoSkill account
            </p>
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                marginBottom: "20px",
                padding: "12px 14px",
                borderRadius: "10px",
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.2)",
                color: "#fca5a5",
                fontSize: "13px",
                lineHeight: 1.5,
                display: "flex",
                alignItems: "flex-start",
                gap: "8px",
              }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ flexShrink: 0, marginTop: "1px" }}
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Email */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label
                htmlFor="email"
                style={{ fontSize: "13px", fontWeight: 500, color: "rgba(255,255,255,0.55)" }}
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                className="auth-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <label
                  htmlFor="password"
                  style={{ fontSize: "13px", fontWeight: 500, color: "rgba(255,255,255,0.55)" }}
                >
                  Password
                </label>
              </div>
              <input
                id="password"
                type="password"
                className="auth-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: "8px",
                width: "100%",
                padding: "13px",
                borderRadius: "10px",
                background: loading
                  ? "rgba(168,85,247,0.5)"
                  : "linear-gradient(135deg, #a855f7, #3b82f6)",
                border: "none",
                color: "white",
                fontSize: "14px",
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                boxShadow: loading ? "none" : "0 0 32px rgba(168,85,247,0.3)",
                transition: "opacity 0.2s, box-shadow 0.2s",
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.opacity = "0.9";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "1";
              }}
            >
              {loading && <span className="auth-spinner" />}
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "20px 0" }}><span style={{ height: 1, flex: 1, background: "rgba(255,255,255,.09)" }} /><span style={{ color: "rgba(255,255,255,.3)", fontSize: 11 }}>OR</span><span style={{ height: 1, flex: 1, background: "rgba(255,255,255,.09)" }} /></div>
          <button type="button" onClick={signInWithGoogle} style={{ width: "100%", padding: "11px", borderRadius: "10px", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.13)", color: "white", fontWeight: 600, cursor: "pointer" }}>G&nbsp;&nbsp; Continue with Google</button>
        </div>

        {/* Footer link */}
        <p
          style={{
            textAlign: "center",
            fontSize: "13px",
            color: "rgba(255,255,255,0.32)",
            marginTop: "24px",
          }}
        >
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            style={{
              color: "#c084fc",
              textDecoration: "none",
              fontWeight: 500,
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#a855f7")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#c084fc")}
          >
            Create one →
          </Link>
        </p>
      </div>
    </main>
  );
}
