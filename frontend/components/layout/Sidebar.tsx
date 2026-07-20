"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import JudgeMode from "@/components/dashboard/JudgeMode";
import XPCard from "@/components/gamification/XPCard";
import UserSearch from "@/components/layout/UserSearch";
import { users, XpStatus } from "@/lib/api";

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    label: "Projects",
    href: "/dashboard/projects",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    ),
  },
  {
    label: "Performance",
    href: "/dashboard/performance",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    label: "Insights",
    href: "/dashboard/insights",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18h6M10 22h4M8 14a6 6 0 1 1 8 0c-.8.7-1.3 1.5-1.5 2.4H9.5C9.3 15.5 8.8 14.7 8 14Z" />
      </svg>
    ),
  },
  {
    label: "Achievements",
    href: "/dashboard/gamification",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M8 21h8" /><path d="M12 17v4" /><path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" /><path d="M7 6H4v2a4 4 0 0 0 4 4" /><path d="M17 6h3v2a4 4 0 0 1-4 4" /></svg>
    ),
  },
  {
    label: "Profile",
    href: "/dashboard/profile",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, token, logout } = useAuth();
  const [xpStatus, setXpStatus] = useState<XpStatus | null>(null);
  const [xpGain, setXpGain] = useState<number | null>(null);
  const previousXp = useRef<number | null>(null);

  useEffect(() => {
    console.log("[XP] token:", token);
    console.log("[XP] user:", user);
    if (!token) return;
    const loadXp = () => users.xp(token).then((response) => {
      console.log("[XP] API response:", response);
      setXpStatus(response);
    }).catch(() => {});
    loadXp();
    const refresh = window.setInterval(loadXp, 30_000);
    const handleXpUpdate = (event: Event) => setXpStatus((event as CustomEvent<XpStatus>).detail);
    window.addEventListener("xp:updated", handleXpUpdate);
    return () => {
      window.clearInterval(refresh);
      window.removeEventListener("xp:updated", handleXpUpdate);
    };
  }, [token]);

  useEffect(() => {
    console.log("[XP] state updated:", xpStatus);
  }, [xpStatus]);

  useEffect(() => {
    if (!xpStatus) return;
    if (previousXp.current !== null && xpStatus.xp > previousXp.current) {
      setXpGain(xpStatus.xp - previousXp.current);
      const timeout = window.setTimeout(() => setXpGain(null), 2200);
      previousXp.current = xpStatus.xp;
      return () => window.clearTimeout(timeout);
    }
    previousXp.current = xpStatus.xp;
  }, [xpStatus]);

  const initial = (user?.full_name?.[0] || user?.email?.[0] || "?").toUpperCase();

  return (
    <aside
      style={{
        width: "240px",
        minHeight: "100vh",
        background: "#0f0f0f",
        borderRight: "1px solid rgba(255,255,255,0.055)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: "20px 16px 18px",
          borderBottom: "1px solid rgba(255,255,255,0.055)",
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}>
          <div
            style={{
              width: "26px",
              height: "26px",
              borderRadius: "7px",
              background: "linear-gradient(135deg, #a855f7, #3b82f6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "12px",
              fontWeight: 800,
              color: "white",
              flexShrink: 0,
            }}
          >
            C
          </div>
          <span
            style={{
              fontSize: "16px",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              background: "linear-gradient(135deg, #a855f7, #3b82f6)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            CoSkill
          </span>
        </Link>
      </div>

      {/* Search */}
      <div style={{ padding: "12px 0 0" }}>
        <UserSearch />
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 10px" }}>
        <p
          style={{
            fontSize: "10px",
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.22)",
            padding: "4px 10px 10px",
          }}
        >
          Workspace
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  fontSize: "13.5px",
                  fontWeight: isActive ? 600 : 500,
                  textDecoration: "none",
                  transition: "background 0.15s, color 0.15s",
                  background: isActive
                    ? "linear-gradient(135deg, rgba(168,85,247,0.15), rgba(59,130,246,0.1))"
                    : "transparent",
                  color: isActive ? "white" : "rgba(255,255,255,0.42)",
                  borderLeft: isActive ? "2px solid #a855f7" : "2px solid transparent",
                  marginLeft: "-2px",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                    e.currentTarget.style.color = "rgba(255,255,255,0.75)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "rgba(255,255,255,0.42)";
                  }
                }}
              >
                <span style={{ color: isActive ? "#c084fc" : "inherit", display: "flex", alignItems: "center", flexShrink: 0 }}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User section */}
      <div style={{ padding: "12px 10px", borderTop: "1px solid rgba(255,255,255,0.055)" }}>
        <div style={{ marginBottom: "8px" }}>
          <JudgeMode />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 10px", marginBottom: "4px" }}>
          {/* Avatar with gradient border */}
          <div
            style={{
              padding: "2px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #a855f7, #3b82f6)",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "50%",
                background: "#0f0f0f",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                fontWeight: 700,
                color: "#c084fc",
              }}
            >
              {initial}
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <p style={{ fontSize: "13px", fontWeight: 600, color: "white", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {user?.full_name || "User"}
              </p>
              {xpStatus && (
                <span style={{ flexShrink: 0, padding: "2px 6px", borderRadius: "999px", background: "rgba(168,85,247,0.16)", border: "1px solid rgba(168,85,247,0.3)", color: "#d8b4fe", fontSize: "10px", fontWeight: 800 }}>
                  Lv. {xpStatus.level}
                </span>
              )}
            </div>
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.32)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {user?.email}
            </p>
          </div>
        </div>

        {xpStatus && <div style={{ position: "relative", padding: "2px 10px 10px" }}><XPCard status={xpStatus} compact />{xpGain && <span className="sidebar-xp-gain">+{xpGain} XP</span>}</div>}

        <Link href="/onboarding" style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 4px", padding: "7px 10px", borderRadius: 8, color: "rgba(255,255,255,.52)", fontSize: 13, textDecoration: "none" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
          Edit profile
        </Link>

        <button
          onClick={() => logout()}
          style={{
            width: "100%",
            padding: "7px 10px",
            borderRadius: "8px",
            fontSize: "13px",
            color: "rgba(255,255,255,0.35)",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            textAlign: "left",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            transition: "background 0.15s, color 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.04)";
            e.currentTarget.style.color = "rgba(255,255,255,0.65)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "rgba(255,255,255,0.35)";
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sign out
        </button>
      </div>
    </aside>
  );
}
